"""管理端 AI SEO/流量分析：提示词配置、模型连接、执行记录（PROD-AI-SEO）。"""
from __future__ import annotations

import json  # 快照与摘要序列化
import os  # 读环境变量（密钥是否已配置）
import time  # 记录耗时毫秒
from datetime import datetime, timezone  # 配置 updated_at 跨 SQLite/PG 一致

from fastapi import APIRouter, Depends, HTTPException, Query  # 路由与查询参数
from pydantic import BaseModel, Field  # 请求体验证

from app.ai_insight_service import (  # 业务逻辑
    build_snapshots,
    call_openai_compatible_chat,
    check_ai_insight_rate_limit,
    fill_user_template,
    resolve_llm_api_key,
    validate_user_prompt_template,
)
from app.db import get_db  # 数据库上下文
from app.db_util import insert_returning_id  # 取新插入 id
from app.deps_auth import get_current_admin  # 管理员 JWT

router = APIRouter(prefix="/admin/ai-insights", tags=["admin"])  # 挂载到 /api 后为 /api/admin/ai-insights


class PromptConfigCreate(BaseModel):
    """新建提示词配置。"""

    name: str = Field(..., min_length=1, max_length=200)  # 显示名
    system_prompt: str = Field(..., min_length=1)  # 系统消息
    user_prompt_template: str = Field(..., min_length=1)  # 用户模板含占位符
    is_default: bool = False  # 是否设为默认


class PromptConfigUpdate(BaseModel):
    """更新提示词配置（字段可选表示不改）。"""

    name: str | None = Field(None, min_length=1, max_length=200)  # 名
    system_prompt: str | None = Field(None, min_length=1)  # 系统
    user_prompt_template: str | None = Field(None, min_length=1)  # 模板
    is_default: bool | None = None  # 默认标记


class ProviderCreate(BaseModel):
    """新建一条大模型连接。"""

    name: str = Field(..., min_length=1, max_length=200)  # 展示名（如 OpenAI / 国内 A）
    base_url: str = Field(default="https://api.openai.com/v1", min_length=4)  # Chat Completions 根路径
    model: str = Field(default="gpt-4o-mini", min_length=1)  # 模型 id
    timeout_sec: int = Field(default=120, ge=5, le=600)  # 超时秒
    temperature: float = Field(default=0.3, ge=0.0, le=2.0)  # 温度
    extra_headers_json: str = Field(default="{}")  # 额外 HTTP 头 JSON
    api_key_env_name: str | None = None  # 可选：从该环境变量读密钥
    api_key: str | None = None  # 可选：直接入库（空可不传）
    is_default: bool = False  # 是否设为当前默认启用（分析时不指定 provider_id 时用）


class ProviderUpdate(BaseModel):
    """更新某条大模型连接。"""

    name: str | None = Field(None, min_length=1, max_length=200)  # 名
    base_url: str | None = None  # API 根
    model: str | None = None  # 模型
    timeout_sec: int | None = Field(None, ge=5, le=600)  # 超时
    temperature: float | None = Field(None, ge=0.0, le=2.0)  # 温度
    extra_headers_json: str | None = None  # 额外头 JSON
    api_key_env_name: str | None = None  # 空串表示清空 env 名
    api_key: str | None = None  # 省略不改；""清空库内 key
    is_default: bool | None = None  # 设为默认时清除其他行的 is_default


class RunBody(BaseModel):
    """触发分析。"""

    config_id: int | None = None  # 提示词配置；空则用默认
    provider_id: int | None = None  # 大模型连接；空则用 is_default=1 的连接


def _admin_user_id(admin: dict) -> int:
    """从 JWT payload 取数字用户 id。"""
    try:  # sub 可能为 str
        return int(admin["sub"])  # 主键
    except (KeyError, TypeError, ValueError) as e:  # 非法
        raise HTTPException(status_code=401, detail="invalid_token") from e  # 与 deps 一致


def _row_to_config(row: object) -> dict:  # sqlite3.Row
    """提示词配置行转 API dict。"""
    return {  # 不含敏感字段
        "id": int(row["id"]),  # 主键
        "name": str(row["name"]),  # 名
        "system_prompt": str(row["system_prompt"]),  # 系统全文
        "user_prompt_template": str(row["user_prompt_template"]),  # 模板全文
        "is_default": bool(int(row["is_default"] or 0)),  # SQLite 0/1
        "created_at": str(row["created_at"]),  # 时间文本
        "updated_at": str(row["updated_at"]),  # 更新时间
    }


def _provider_row_to_api(row: object) -> dict:  # 单行 outward（不含 api_key 明文）
    """LLM 连接行转 API；掩码与全局 env 提示。"""
    key_set = bool((row["api_key"] or "").strip())  # 库内是否有密钥
    env_name = (row["api_key_env_name"] or "").strip() if row["api_key_env_name"] else ""  # 自定义 env 名
    env_global = bool((os.environ.get("AI_INSIGHT_LLM_API_KEY") or "").strip())  # 全局 env（对所有连接生效优先）
    env_named = bool(env_name and (os.environ.get(env_name) or "").strip())  # 命名 env 有值
    return {  # DTO
        "id": int(row["id"]),  # 主键
        "name": str(row["name"]),  # 展示名
        "base_url": str(row["base_url"]),  # URL
        "model": str(row["model"]),  # 模型
        "timeout_sec": int(row["timeout_sec"]),  # 超时
        "temperature": float(row["temperature"]),  # 温度
        "extra_headers_json": str(row["extra_headers_json"] or "{}"),  # 扩展头 JSON 文本
        "api_key_env_name": env_name,  # env 名
        "api_key_masked": "********" if (key_set or env_global or env_named) else "",  # 提示已可调用
        "api_key_from_db": key_set,  # 库内是否有 key（仍不返回明文）
        "is_default": bool(int(row["is_default"] or 0)),  # 是否为当前默认启用
        "created_at": str(row["created_at"]),  # 创建时间
        "updated_at": str(row["updated_at"]),  # 更新时间
    }


def _fetch_llm_provider_row(conn: object, provider_id: int | None) -> object | None:  # Row | None
    """按 id 取连接；id 空则用 is_default=1，再无则最小 id。"""
    if provider_id is not None:  # 显式指定
        return conn.execute(  # 按主键
            "SELECT * FROM ai_insight_llm_provider WHERE id = ?",
            (provider_id,),
        ).fetchone()  # 一行或空
    r = conn.execute(  # 默认启用
        "SELECT * FROM ai_insight_llm_provider WHERE is_default = 1 ORDER BY id LIMIT 1",
    ).fetchone()  # 一行或空
    if r:  # 命中
        return r  # 返回
    return conn.execute(  # 兜底第一条
        "SELECT * FROM ai_insight_llm_provider ORDER BY id LIMIT 1",
    ).fetchone()  # 或空


def _model_name_from_provider_snapshot(raw: str) -> str:  # 历史列表展示用
    """从 provider_snapshot_json 解析 model 字段。"""
    try:  # 解析 JSON
        d = json.loads(raw or "{}")  # 对象
    except (json.JSONDecodeError, TypeError):  # 损坏
        return ""  # 空串
    if not isinstance(d, dict):  # 非对象
        return ""  # 空
    return str(d.get("model") or "")  # 模型名


@router.get("/configs")
def list_prompt_configs(_admin: dict = Depends(get_current_admin)) -> dict:
    """列出全部提示词配置。"""
    with get_db() as conn:  # 短连接
        rows = conn.execute(  # 按 id 排序
            "SELECT * FROM ai_insight_prompt_config ORDER BY id ASC",
        ).fetchall()  # 全部
    return {"items": [_row_to_config(r) for r in rows]}  # 数组


@router.post("/configs")
def create_prompt_config(
    body: PromptConfigCreate,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """新增配置；若 is_default 则清除其他默认。"""
    try:  # 校验占位符
        validate_user_prompt_template(body.user_prompt_template)  # 白名单
    except ValueError as e:  # 未知占位符
        raise HTTPException(status_code=400, detail=str(e)) from e  # 400
    with get_db() as conn:  # 写库
        if body.is_default:  # 要当默认
            conn.execute("UPDATE ai_insight_prompt_config SET is_default = 0")  # 先清
        rid = insert_returning_id(  # 插入取 id
            conn,
            """INSERT INTO ai_insight_prompt_config
            (name, system_prompt, user_prompt_template, is_default)
            VALUES (?,?,?,?)""",
            (
                body.name.strip(),  # 名
                body.system_prompt,  # 系统
                body.user_prompt_template,  # 模板
                1 if body.is_default else 0,  # 默认标记
            ),
        )
        conn.commit()  # 提交
    return {"id": rid}  # 新 id


@router.put("/configs/{config_id}")
def update_prompt_config(
    config_id: int,
    body: PromptConfigUpdate,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """按 id 更新；至少一项非空。"""
    if body.user_prompt_template is not None:  # 若改模板
        try:  # 再校验
            validate_user_prompt_template(body.user_prompt_template)  # 占位符
        except ValueError as e:  # 错误
            raise HTTPException(status_code=400, detail=str(e)) from e  # 400
    fields: list[str] = []  # SET 子句片段
    vals: list[object] = []  # 参数
    if body.name is not None:  # 更新名
        fields.append("name = ?")  # 列
        vals.append(body.name.strip())  # 值
    if body.system_prompt is not None:  # 系统
        fields.append("system_prompt = ?")
        vals.append(body.system_prompt)
    if body.user_prompt_template is not None:  # 模板
        fields.append("user_prompt_template = ?")
        vals.append(body.user_prompt_template)
    if body.is_default is not None:  # 默认
        fields.append("is_default = ?")
        vals.append(1 if body.is_default else 0)
    if not fields:  # 无字段
        raise HTTPException(status_code=400, detail="no_fields")  # 拒绝空更新
    now_s = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")  # UTC 文本时间
    fields.append("updated_at = ?")  # 占位更新时刻
    vals.append(now_s)  # 绑定时间
    with get_db() as conn:  # 写
        if body.is_default is True:  # 设为默认时
            conn.execute("UPDATE ai_insight_prompt_config SET is_default = 0")  # 先清其他
        sql = f"UPDATE ai_insight_prompt_config SET {', '.join(fields)} WHERE id = ?"  # 动态 SET
        vals.append(config_id)  # WHERE
        cur = conn.execute(sql, tuple(vals))  # 执行
        if cur.rowcount == 0:  # 无行
            raise HTTPException(status_code=404, detail="not_found")  # 404
        conn.commit()  # 提交
    return {"success": True}  # OK


@router.delete("/configs/{config_id}")
def delete_prompt_config(config_id: int, _admin: dict = Depends(get_current_admin)) -> dict:
    """删除配置；至少保留一条时可删（若删默认则另条需手动设默认）。"""
    with get_db() as conn:  # 写
        cur = conn.execute("DELETE FROM ai_insight_prompt_config WHERE id = ?", (config_id,))  # 删
        if cur.rowcount == 0:  # 无行
            raise HTTPException(status_code=404, detail="not_found")  # 404
        conn.commit()  # 提交
    return {"success": True}  # OK


@router.get("/providers")
def list_llm_providers(_admin: dict = Depends(get_current_admin)) -> dict:
    """列出全部大模型连接（可多套，仅一条 is_default 用于默认分析）。"""
    with get_db() as conn:  # 读
        rows = conn.execute(  # 按 id
            "SELECT * FROM ai_insight_llm_provider ORDER BY id ASC",
        ).fetchall()  # 全部
    return {"items": [_provider_row_to_api(r) for r in rows]}  # 数组


@router.post("/providers")
def create_llm_provider(body: ProviderCreate, _admin: dict = Depends(get_current_admin)) -> dict:
    """新增连接；is_default 时清除其他默认。"""
    try:  # 校验 extra_headers_json
        parsed = json.loads(body.extra_headers_json)  # 解析
        if not isinstance(parsed, dict):  # 须对象
            raise ValueError("object")  # 失败
        ex = json.dumps(parsed, ensure_ascii=False)  # 规范化文本
    except (json.JSONDecodeError, TypeError, ValueError) as e:  # 非法
        raise HTTPException(status_code=400, detail="invalid_extra_headers_json") from e  # 400
    with get_db() as conn:  # 写
        if body.is_default:  # 要当默认
            conn.execute("UPDATE ai_insight_llm_provider SET is_default = 0")  # 先清
        now_s = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")  # 时间戳
        rid = insert_returning_id(  # 插入
            conn,
            """INSERT INTO ai_insight_llm_provider
            (name, base_url, model, api_key, api_key_env_name, timeout_sec, temperature, extra_headers_json, is_default, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                body.name.strip(),  # 名
                body.base_url.strip(),  # URL
                body.model.strip(),  # 模型
                body.api_key.strip() if body.api_key else None,  # 密钥可空
                body.api_key_env_name.strip() if body.api_key_env_name else None,  # env 名可空
                int(body.timeout_sec),  # 超时
                float(body.temperature),  # 温度
                ex,  # 头 JSON
                1 if body.is_default else 0,  # 默认标记
                now_s,  # 创建
                now_s,  # 更新
            ),
        )
        conn.commit()  # 提交
    return {"id": rid}  # 新 id


@router.put("/providers/{provider_id}")
def update_llm_provider(
    provider_id: int,
    body: ProviderUpdate,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """更新一条连接。"""
    with get_db() as conn:  # 读写
        row = conn.execute(  # 当前行
            "SELECT * FROM ai_insight_llm_provider WHERE id = ?",
            (provider_id,),
        ).fetchone()  # 单行
        if not row:  # 无
            raise HTTPException(status_code=404, detail="not_found")  # 404
        name = body.name if body.name is not None else str(row["name"])  # 名
        base_url = body.base_url if body.base_url is not None else str(row["base_url"])  # URL
        model = body.model if body.model is not None else str(row["model"])  # 模型
        timeout_sec = int(body.timeout_sec if body.timeout_sec is not None else row["timeout_sec"])  # 超时
        temperature = float(body.temperature if body.temperature is not None else row["temperature"])  # 温度
        ex = str(row["extra_headers_json"] or "{}")  # 扩展头
        if body.extra_headers_json is not None:  # 若提交
            try:  # 校验
                parsed = json.loads(body.extra_headers_json)  # 解析
                if not isinstance(parsed, dict):  # 须对象
                    raise ValueError("object")  # 失败
                ex = json.dumps(parsed, ensure_ascii=False)  # 规范化
            except (json.JSONDecodeError, TypeError, ValueError) as e:  # 非法
                raise HTTPException(status_code=400, detail="invalid_extra_headers_json") from e  # 400
        env_name = row["api_key_env_name"]  # 沿用
        if body.api_key_env_name is not None:  # 显式改 env 名
            env_name = body.api_key_env_name.strip() or None  # 空→None
        api_key = row["api_key"]  # 沿用库内
        if body.api_key is not None:  # 显式改密钥
            if body.api_key == "":  # 空串清空
                api_key = None  # NULL
            else:  # 写入新值
                api_key = body.api_key  # 明文仅服务端
        is_def = int(row["is_default"] or 0)  # 当前默认标记
        if body.is_default is not None:  # 若改默认
            is_def = 1 if body.is_default else 0  # 新值
        if body.is_default is True:  # 设为默认时
            conn.execute("UPDATE ai_insight_llm_provider SET is_default = 0")  # 清其他
        now_s = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")  # 更新时间
        conn.execute(  # 写回
            """UPDATE ai_insight_llm_provider SET
            name=?, base_url=?, model=?, timeout_sec=?, temperature=?, extra_headers_json=?,
            api_key_env_name=?, api_key=?, is_default=?, updated_at=? WHERE id=?""",
            (
                name.strip(),  # 名
                base_url.strip(),  # URL
                model.strip(),  # 模型
                timeout_sec,  # 超时
                temperature,  # 温度
                ex,  # 头
                env_name,  # env
                api_key,  # key
                is_def,  # 默认
                now_s,  # 时间
                provider_id,  # id
            ),
        )
        conn.commit()  # 提交
    return {"success": True}  # OK


@router.delete("/providers/{provider_id}")
def delete_llm_provider(provider_id: int, _admin: dict = Depends(get_current_admin)) -> dict:
    """删除一条连接；至少保留一条；删默认时自动把最小 id 设为默认。"""
    with get_db() as conn:  # 写
        cnt_row = conn.execute("SELECT COUNT(*) AS c FROM ai_insight_llm_provider").fetchone()  # 总数
        n = int(cnt_row["c"] or 0) if cnt_row else 0  # int
        if n <= 1:  # 不可删最后一条
            raise HTTPException(status_code=400, detail="last_provider")  # 400
        row = conn.execute(  # 待删行
            "SELECT is_default FROM ai_insight_llm_provider WHERE id = ?",
            (provider_id,),
        ).fetchone()  # 单行
        if not row:  # 无
            raise HTTPException(status_code=404, detail="not_found")  # 404
        was_def = int(row["is_default"] or 0)  # 是否默认
        conn.execute("DELETE FROM ai_insight_llm_provider WHERE id = ?", (provider_id,))  # 删除
        if was_def:  # 若删的是默认
            other = conn.execute("SELECT id FROM ai_insight_llm_provider ORDER BY id LIMIT 1").fetchone()  # 剩一条最小 id
            if other:  # 有
                conn.execute(  # 升为默认
                    "UPDATE ai_insight_llm_provider SET is_default = 1 WHERE id = ?",
                    (int(other["id"]),),
                )
        conn.commit()  # 提交
    return {"success": True}  # OK


@router.post("/run")
def run_ai_insight(
    body: RunBody,
    admin: dict = Depends(get_current_admin),
) -> dict:
    """组装快照、调用 LLM、写入 ai_insight_run。"""
    uid = _admin_user_id(admin)  # 操作者
    try:  # 限流
        check_ai_insight_rate_limit(uid)  # 窗口内次数
    except ValueError as e:  # 超限
        if str(e) == "rate_limited_ai_insight":  # 约定
            raise HTTPException(status_code=429, detail="rate_limited_ai_insight") from e  # 429
        raise  # 其他透传
    t0 = time.perf_counter()  # 开始计时
    with get_db() as conn:  # 单连接贯穿读配置与写记录
        prow = _fetch_llm_provider_row(conn, body.provider_id)  # 指定 id 或默认启用的一条
        if body.provider_id is not None and prow is None:  # 显式 id 不存在
            raise HTTPException(status_code=404, detail="provider_not_found")  # 404
        if prow is None:  # 库内无任何连接配置
            raise HTTPException(status_code=500, detail="provider_missing")  # 500
        lp_id = int(prow["id"])  # 写入 run 的外键
        cfg_id = body.config_id  # 请求指定
        if cfg_id is None:  # 未指定
            dr = conn.execute(  # 查默认
                "SELECT id FROM ai_insight_prompt_config WHERE is_default = 1 ORDER BY id LIMIT 1",
            ).fetchone()  # 一行
            if not dr:  # 无默认
                dr2 = conn.execute("SELECT id FROM ai_insight_prompt_config ORDER BY id LIMIT 1").fetchone()  # 最小 id
                cfg_id = int(dr2["id"]) if dr2 else None  # 兜底
            else:  # 有默认
                cfg_id = int(dr["id"])  # 默认 id
        if cfg_id is None:  # 仍无
            raise HTTPException(status_code=400, detail="no_prompt_config")  # 无模板
        crow = conn.execute(  # 读配置行
            "SELECT * FROM ai_insight_prompt_config WHERE id = ?",
            (cfg_id,),
        ).fetchone()  # 单行
        if not crow:  # 不存在
            raise HTTPException(status_code=404, detail="config_not_found")  # 404
        system_prompt = str(crow["system_prompt"])  # 系统消息
        user_tpl = str(crow["user_prompt_template"])  # 用户模板
        cfg_name = str(crow["name"])  # 配置名
        placeholders, summary_obj = build_snapshots(conn)  # SEO/流量等快照
        user_message = fill_user_template(user_tpl, placeholders)  # 注入后的用户消息
        summary_json = json.dumps(summary_obj, ensure_ascii=False)  # 摘要 JSON 字符串
        prompt_snapshot = json.dumps(  # 提示词快照
            {
                "config_id": cfg_id,  # id
                "name": cfg_name,  # 名
                "system_prompt": system_prompt,  # 系统全文
                "user_prompt_template": user_tpl,  # 模板原文
                "user_message_resolved": user_message,  # 解析后全文
            },
            ensure_ascii=False,
        )
        provider_snapshot = json.dumps(  # 不含密钥（含 id/name 便于历史对账）
            {
                "id": lp_id,  # 连接主键
                "name": str(prow["name"]),  # 展示名
                "base_url": str(prow["base_url"]),  # URL
                "model": str(prow["model"]),  # 模型
                "timeout_sec": int(prow["timeout_sec"]),  # 超时
                "temperature": float(prow["temperature"]),  # 温度
            },
            ensure_ascii=False,
        )
        api_key = resolve_llm_api_key(prow)  # 解析密钥
        if not api_key:  # 未配置
            ms = int((time.perf_counter() - t0) * 1000)  # 耗时
            insert_returning_id(  # 失败也落库
                conn,
                """INSERT INTO ai_insight_run
                (admin_user_id, prompt_config_id, llm_provider_id, prompt_snapshot_json, provider_snapshot_json,
                 input_payload_summary, status, output_text, error_message, duration_ms)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    uid,  # 操作者
                    cfg_id,  # 配置
                    lp_id,  # 选用的连接
                    prompt_snapshot,  # 快照
                    provider_snapshot,  # provider 快照
                    summary_json,  # 输入摘要
                    "failed",  # 状态
                    "",  # 无输出
                    "missing_api_key: 请设置环境变量 AI_INSIGHT_LLM_API_KEY、或在后台填写 API Key",  # 可读原因
                    ms,  # 毫秒
                ),
            )
            conn.commit()  # 提交
            raise HTTPException(status_code=400, detail="missing_api_key")  # 400
        try:  # 解析额外头
            extra = json.loads(prow["extra_headers_json"] or "{}")  # JSON
            if not isinstance(extra, dict):  # 须对象
                extra = {}  # 回退空
            extra_s = {str(k): str(v) for k, v in extra.items()}  # 全转 str
        except (json.JSONDecodeError, TypeError):  # 损坏
            extra_s = {}  # 空
        try:  # 调 LLM
            out_text, tin, tout = call_openai_compatible_chat(  # 请求
                base_url=str(prow["base_url"]),  # URL
                model=str(prow["model"]),  # 模型
                api_key=api_key,  # 密钥
                system_prompt=system_prompt,  # 系统
                user_message=user_message,  # 用户全文
                timeout_sec=int(prow["timeout_sec"]),  # 超时
                temperature=float(prow["temperature"]),  # 温度
                extra_headers=extra_s,  # 额外头
            )
        except ValueError as e:  # HTTP/解析错误
            ms = int((time.perf_counter() - t0) * 1000)  # 耗时
            msg = str(e)[:2000]  # 截断错误信息
            insert_returning_id(  # 失败记录
                conn,
                """INSERT INTO ai_insight_run
                (admin_user_id, prompt_config_id, llm_provider_id, prompt_snapshot_json, provider_snapshot_json,
                 input_payload_summary, status, output_text, error_message, duration_ms)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    uid,
                    cfg_id,
                    lp_id,
                    prompt_snapshot,
                    provider_snapshot,
                    summary_json,
                    "failed",
                    "",
                    msg,
                    ms,
                ),
            )
            conn.commit()  # 提交
            raise HTTPException(status_code=502, detail=msg) from e  # 网关错误
        ms = int((time.perf_counter() - t0) * 1000)  # 成功耗时
        rid = insert_returning_id(  # 成功记录
            conn,
            """INSERT INTO ai_insight_run
            (admin_user_id, prompt_config_id, llm_provider_id, prompt_snapshot_json, provider_snapshot_json,
             input_payload_summary, status, output_text, error_message, duration_ms, tokens_in, tokens_out)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                uid,
                cfg_id,
                lp_id,
                prompt_snapshot,
                provider_snapshot,
                summary_json,
                "success",
                out_text,
                "",
                ms,
                tin,
                tout,
            ),
        )
        conn.commit()  # 提交
    return {"run_id": rid, "output_text": out_text, "duration_ms": ms, "tokens_in": tin, "tokens_out": tout}  # 响应


@router.get("/runs")
def list_runs(
    limit: int = Query(30, ge=1, le=100),  # 页大小
    offset: int = Query(0, ge=0),  # 偏移
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """分页列出分析记录（含操作者邮箱）。"""
    with get_db() as conn:  # 读并在连接内组装行，避免 Row 依赖已关连接
        rows = conn.execute(  # 联表用户邮箱；模型名来自当次快照 JSON
            """SELECT r.id, r.admin_user_id, r.prompt_config_id, r.status, r.created_at,
                      r.duration_ms, r.tokens_in, r.tokens_out,
                      substr(r.output_text, 1, 160) AS output_preview,
                      substr(r.error_message, 1, 160) AS error_preview,
                      r.provider_snapshot_json,
                      c.name AS config_name, u.email AS admin_email
               FROM ai_insight_run r
               LEFT JOIN ai_insight_prompt_config c ON c.id = r.prompt_config_id
               LEFT JOIN app_user u ON u.id = r.admin_user_id
               ORDER BY r.id DESC LIMIT ? OFFSET ?""",
            (limit, offset),  # 分页
        ).fetchall()  # 列表
        total_row = conn.execute("SELECT COUNT(*) AS c FROM ai_insight_run").fetchone()  # 总数
        total = int(total_row["c"] or 0) if total_row else 0  # int
        items: list[dict] = []  # 输出
        for r in rows:  # 逐行
            preview = (r["output_preview"] or "").strip() or (r["error_preview"] or "").strip()  # 摘要列
            snap = str(r["provider_snapshot_json"] or "")  # 快照 JSON 文本
            items.append(  # 一行 DTO
                {
                    "id": int(r["id"]),  # 主键
                    "admin_email": str(r["admin_email"] or ""),  # 邮箱
                    "config_name": str(r["config_name"] or ""),  # 配置名
                    "model_name": _model_name_from_provider_snapshot(snap),  # 模型（来自当次快照）
                    "status": str(r["status"]),  # success/failed
                    "summary": preview,  # 预览
                    "created_at": str(r["created_at"]),  # 时间
                    "duration_ms": int(r["duration_ms"] or 0),  # 耗时
                }
            )
    return {"items": items, "total": total, "limit": limit, "offset": offset}  # 分页包


@router.get("/runs/{run_id}")
def get_run(run_id: int, _admin: dict = Depends(get_current_admin)) -> dict:
    """单条记录详情（含完整输出与快照 JSON 字符串）。"""
    with get_db() as conn:  # 同一连接读 run 与邮箱
        row = conn.execute(  # 主键
            "SELECT * FROM ai_insight_run WHERE id = ?",
            (run_id,),
        ).fetchone()  # 单行
        if not row:  # 无记录
            raise HTTPException(status_code=404, detail="not_found")  # 404
        u = conn.execute(  # 操作者邮箱
            "SELECT email FROM app_user WHERE id = ?",
            (row["admin_user_id"],),
        ).fetchone()  # 一行或空
    email = str(u["email"]) if u else ""  # 脱连接后组装
    pid = row["prompt_config_id"]  # 可能 NULL
    try:  # 旧库行可能尚无 llm_provider_id 列
        lp_raw = row["llm_provider_id"]  # 外键可 NULL
    except (KeyError, IndexError):  # 列不存在
        lp_raw = None  # 按无处理
    return {  # 详情 DTO
        "id": int(row["id"]),  # 主键
        "admin_user_id": int(row["admin_user_id"]),  # 操作者 id
        "admin_email": email,  # 邮箱
        "llm_provider_id": int(lp_raw) if lp_raw is not None else None,  # 当次选用的连接 id
        "prompt_config_id": int(pid) if pid is not None else None,  # 配置 id
        "status": str(row["status"]),  # success / failed
        "output_text": str(row["output_text"] or ""),  # 模型全文
        "error_message": str(row["error_message"] or ""),  # 失败原因
        "duration_ms": int(row["duration_ms"] or 0),  # 耗时
        "tokens_in": row["tokens_in"],  # 入 token，可 None
        "tokens_out": row["tokens_out"],  # 出 token
        "created_at": str(row["created_at"]),  # 创建时间
        "input_payload_summary": str(row["input_payload_summary"] or ""),  # 注入摘要 JSON
        "prompt_snapshot_json": str(row["prompt_snapshot_json"] or ""),  # 提示词快照
        "provider_snapshot_json": str(row["provider_snapshot_json"] or ""),  # 模型连接快照
    }


@router.delete("/runs/{run_id}")
def delete_run(run_id: int, _admin: dict = Depends(get_current_admin)) -> dict:
    """删除单条分析记录（运维清理测试数据）。"""
    with get_db() as conn:  # 写
        cur = conn.execute("DELETE FROM ai_insight_run WHERE id = ?", (run_id,))  # 按 id 删
        if cur.rowcount == 0:  # 无行
            raise HTTPException(status_code=404, detail="not_found")  # 404
        conn.commit()  # 提交
    return {"success": True}  # OK

