# 进程内每日一次 AI SEO 分析：落库 pending 后在后台线程调 LLM（与 manual defer_llm 同路径）
from __future__ import annotations

import asyncio  # 调度协程与 to_thread
import json  # 快照 JSON
import logging  # 调度日志
import os  # AI_INSIGHT_DAILY_* 开关与时刻
import time  # perf_counter 与路由一致
from datetime import date, datetime  # 本地日历日与时刻

from app.growth.ai_insight_run_worker import finalize_pending_ai_insight_run  # pending 终结（与 worker 共用）
from app.growth.ai_insight_service import (  # 快照与连接解析
    build_snapshots,  # SEO/流量逐页摘要
    fetch_llm_provider_row,  # 默认或指定 LLM 连接行
    fill_user_template,  # 占位符替换
    resolve_llm_api_key,  # 密钥解析
)
from app.db import get_db  # 连接上下文
from app.db_util import insert_returning_id  # 插入取 id
from app.llm_adapter_dispatch import provider_adapter_field  # provider 快照 adapter 字段

log = logging.getLogger(__name__)  # 模块日志器


def _env_enabled() -> bool:  # 是否开启日内巡检
    raw = os.environ.get("AI_INSIGHT_DAILY_SCHEDULER_ENABLED", "0").strip().lower()  # 默认关，避免误耗 token
    return raw not in ("", "0", "false", "no", "off")  # 显式 1/true/on 等视为开


def _env_run_hour_local() -> int:  # 本地几点后允许触发（含该整点）
    s = (os.environ.get("AI_INSIGHT_DAILY_RUN_HOUR_LOCAL") or "3").strip()  # 默认凌晨 3 点窗口起
    try:  # 解析
        h = int(s, 10)  # 十进制
    except ValueError:  # 非法
        return 3  # 回退默认
    return max(0, min(23, h))  # 钳到合法小时


def _env_optional_int(name: str) -> int | None:  # 可选正整数环境变量
    v = (os.environ.get(name) or "").strip()  # 读取
    if not v:  # 未设
        return None  # 表示用默认链
    try:  # 解析
        n = int(v, 10)  # 十进制
    except ValueError:  # 非数字
        return None  # 忽略坏值
    return n if n > 0 else None  # 非正视为未设


def _mark_scheduler_date(conn: object, today: str) -> None:  # 写入「本自然日已尝试」防重复
    conn.execute(  # 幂等更新
        "UPDATE ai_insight_scheduler_state SET last_daily_run_date = ? WHERE id = 1",  # 单行状态表
        (today,),  # 当日 ISO 日期
    )  # 执行


def tick_scheduled_ai_insight_daily() -> int | None:  # 同步入口：插入 pending 或 failed 后返回待终结 run_id
    """本地日历日最多一次：在配置时刻后插入一条 ai_insight_run（pending 或 failed），不经 HTTP 限流。"""
    if not _env_enabled():  # 未开开关
        return None  # 跳过
    today = date.today().isoformat()  # YYYY-MM-DD
    now = datetime.now()  # 本地 now
    if now.hour < _env_run_hour_local():  # 未到当日触发窗口
        return None  # 下一分钟再判
    t0 = time.perf_counter()  # 与路由耗时字段一致
    with get_db() as conn:  # 单事务
        row = conn.execute(  # 读状态
            "SELECT last_daily_run_date FROM ai_insight_scheduler_state WHERE id = 1",  # 固定 id=1
        ).fetchone()  # 单行
        if row is None:  # 迁移未跑或表异常
            log.warning("ai_insight daily: scheduler state row missing (run migrations)")  # 可观测
            return None  # 不写库
        last = str(row["last_daily_run_date"] or "").strip()  # 上次已跑日
        if last == today:  # 本日已触发过
            return None  # 结束
        adm = conn.execute(  # 挂 run 须合法 admin 外键
            "SELECT id FROM app_user WHERE role = 'admin' ORDER BY id LIMIT 1",  # 取最小 id 管理员
        ).fetchone()  # 一行或空
        if not adm:  # 无管理员账号
            log.warning("ai_insight daily: no admin user, skip and mark date")  # 说明原因
            _mark_scheduler_date(conn, today)  # 避免每分钟刷日志
            conn.commit()  # 提交
            return None  # 无 run
        uid = int(adm["id"])  # 操作者 id（展示为系统日更来源）
        cfg_env = _env_optional_int("AI_INSIGHT_DAILY_CONFIG_ID")  # 可选固定提示词配置
        cfg_id = cfg_env  # 先采用环境覆盖
        if cfg_id is None:  # 走默认链
            dr = conn.execute(  # 默认配置
                "SELECT id FROM ai_insight_prompt_config WHERE is_default = 1 ORDER BY id LIMIT 1",  # 标记默认
            ).fetchone()  # 一行
            if not dr:  # 无默认
                dr2 = conn.execute(  # 最小 id 兜底
                    "SELECT id FROM ai_insight_prompt_config ORDER BY id LIMIT 1",  # 任意一条
                ).fetchone()  # 一行
                cfg_id = int(dr2["id"]) if dr2 else None  # 可能仍无
            else:  # 有默认
                cfg_id = int(dr["id"])  # 采用默认 id
        if cfg_id is None:  # 库内无提示词
            log.warning("ai_insight daily: no ai_insight_prompt_config, mark date")  # 运维可见
            _mark_scheduler_date(conn, today)  # 防重
            conn.commit()  # 提交
            return None  # 结束
        crow = conn.execute(  # 读配置全文
            "SELECT * FROM ai_insight_prompt_config WHERE id = ?",  # 主键
            (cfg_id,),  # 绑定
        ).fetchone()  # 单行
        if not crow:  # 环境变量指到不存在的 id
            log.warning("ai_insight daily: config_id=%s not found, mark date", cfg_id)  # 记录坏配置
            _mark_scheduler_date(conn, today)  # 防重
            conn.commit()  # 提交
            return None  # 结束
        prov_env = _env_optional_int("AI_INSIGHT_DAILY_PROVIDER_ID")  # 可选固定 LLM 连接
        prow = fetch_llm_provider_row(conn, prov_env)  # 解析连接行
        if prow is None:  # 无任何 provider
            log.warning("ai_insight daily: no llm provider, mark date")  # 说明
            _mark_scheduler_date(conn, today)  # 防重
            conn.commit()  # 提交
            return None  # 结束
        lp_id = int(prow["id"])  # 外键
        system_prompt = str(crow["system_prompt"])  # 系统消息
        user_tpl = str(crow["user_prompt_template"])  # 用户模板
        cfg_name = str(crow["name"])  # 配置名
        placeholders, summary_obj = build_snapshots(conn)  # 逐页 SEO + 流量等快照
        user_message = fill_user_template(user_tpl, placeholders)  # 注入后的用户消息
        summary_json = json.dumps(summary_obj, ensure_ascii=False)  # 输入摘要 JSON
        prompt_snapshot = json.dumps(  # 提示词快照（与路由一致）
            {
                "config_id": cfg_id,  # 配置 id
                "name": cfg_name,  # 名
                "system_prompt": system_prompt,  # 系统全文
                "user_prompt_template": user_tpl,  # 模板原文
                "user_message_resolved": user_message,  # 解析后用户消息
            },
            ensure_ascii=False,  # 保留中文
        )
        provider_snapshot = json.dumps(  # 不含密钥
            {
                "id": lp_id,  # 连接 id
                "name": str(prow["name"]),  # 展示名
                "base_url": str(prow["base_url"]),  # API 根
                "model": str(prow["model"]),  # 模型
                "timeout_sec": int(prow["timeout_sec"]),  # 超时
                "temperature": float(prow["temperature"]),  # 温度
                "adapter": provider_adapter_field(prow),  # 适配器名
            },
            ensure_ascii=False,  # 中文友好
        )
        api_key = resolve_llm_api_key(prow)  # 解析密钥
        if not api_key:  # 无法调用模型
            ms = int((time.perf_counter() - t0) * 1000)  # 毫秒
            insert_returning_id(  # 落 failed 便于后台审计
                conn,
                """INSERT INTO ai_insight_run
                (admin_user_id, prompt_config_id, llm_provider_id, prompt_snapshot_json, provider_snapshot_json,
                 input_payload_summary, status, output_text, error_message, duration_ms)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    uid,  # 操作者
                    cfg_id,  # 配置
                    lp_id,  # 连接
                    prompt_snapshot,  # 快照
                    provider_snapshot,  # provider 快照
                    summary_json,  # 摘要
                    "failed",  # 状态
                    "",  # 无输出
                    "missing_api_key: 请设置环境变量 AI_INSIGHT_LLM_API_KEY、或在后台填写 API Key",  # 与路由同文案
                    ms,  # 耗时
                ),
            )
            _mark_scheduler_date(conn, today)  # 本日不再重试
            conn.commit()  # 提交
            return None  # 无 pending 需终结
        rid = insert_returning_id(  # pending 行
            conn,
            """INSERT INTO ai_insight_run
            (admin_user_id, prompt_config_id, llm_provider_id, prompt_snapshot_json, provider_snapshot_json,
             input_payload_summary, status, output_text, error_message, duration_ms, tokens_in, tokens_out)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                uid,  # 操作者
                cfg_id,  # 配置
                lp_id,  # 连接
                prompt_snapshot,  # 快照
                provider_snapshot,  # provider
                summary_json,  # 摘要
                "pending",  # 待 LLM
                "",  # 尚无输出
                "",  # 尚无错误
                0,  # 耗时后更新
                None,  # token 待定
                None,  # token 待定
            ),
        )
        _mark_scheduler_date(conn, today)  # 先钉死本日已调度，避免 finalize 卡住时重复插入
        conn.commit()  # 提交后再线程里调模型
    log.info("ai_insight daily scheduled pending run_id=%s", rid)  # 结构化信息
    return int(rid)  # 供 asyncio.to_thread 终结


async def ai_insight_daily_scheduler_loop() -> None:  # 与 crawler 同风格：每分钟 tick，命中日更则线程里跑 LLM
    await asyncio.sleep(25)  # 略错开爬虫 loop 的 20s，减轻同一拍 DB 压力
    while True:  # 常驻直至 cancel
        await asyncio.sleep(60)  # 60s 周期
        try:  # 隔离异常
            rid = tick_scheduled_ai_insight_daily()  # 同步：可能插入 pending
            if rid is not None:  # 有待终结行
                await asyncio.to_thread(finalize_pending_ai_insight_run, rid)  # 阻塞 LLM 放线程池
        except Exception:  # 不应打断循环
            log.exception("ai_insight_daily_scheduler_loop tick")  # 栈追踪
