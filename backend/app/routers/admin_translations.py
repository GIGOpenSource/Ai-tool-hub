# 管理后台 — translation 表词条 CRUD + 批量导入导出（替代纯 SQL / 外部平台前置）
from __future__ import annotations

import json  # 导出序列化
from typing import Any  # 开放 JSON 响应形态

from fastapi import APIRouter, Depends, HTTPException, Query  # 路由、403、查询参数
from fastapi.responses import PlainTextResponse  # NDJSON 导出 Content-Type
from pydantic import BaseModel, ConfigDict, Field  # 入参模型

from app.db import get_db  # 短连接
from app.deps_auth import get_current_admin  # 管理员 JWT

router = APIRouter(prefix="/admin", tags=["admin"])  # 挂载 /api/admin/*


class TranslationPutBody(BaseModel):
    model_config = ConfigDict(extra="forbid")  # 禁止未知字段

    locale: str = Field(..., min_length=2, max_length=32)  # 与 translation.locale 对齐
    msg_key: str = Field(..., min_length=1, max_length=500)  # 文案键
    msg_value: str = Field(default="")  # 译文值，可空串


class TranslationImportBody(BaseModel):
    model_config = ConfigDict(extra="forbid")  # 禁止未知字段

    items: list[TranslationPutBody] = Field(default_factory=list)  # 批量 upsert 行


@router.get("/translations")  # 列表；可选按 locale 过滤
def admin_list_translations(
    locale: str | None = Query(None, max_length=32),  # 不传则全表（上限截断防误扫）
    _admin: dict = Depends(get_current_admin),  # 须管理员
) -> dict[str, Any]:
    with get_db() as conn:  # 单次请求一连接
        if locale is not None and locale.strip() != "":  # 显式筛选语言
            rows = conn.execute(  # 按 locale 排序键名
                "SELECT locale, msg_key, msg_value FROM translation WHERE locale = ? ORDER BY msg_key",
                (locale.strip(),),
            ).fetchall()  # 可能为空列表
        else:  # 全表浏览（运营库体量可控）
            rows = conn.execute(  # 先语言后键，便于肉眼扫
                "SELECT locale, msg_key, msg_value FROM translation ORDER BY locale, msg_key LIMIT 8000",
            ).fetchall()  # 硬上限避免极端拖库
    items = [  # 统一 dict 给前端表格
        {"locale": r["locale"], "msg_key": r["msg_key"], "msg_value": r["msg_value"]} for r in rows
    ]
    return {"items": items}  # 与管理端表格绑定


@router.put("/translations")  # 幂等 upsert 单行
def admin_put_translation(
    body: TranslationPutBody,
    _admin: dict = Depends(get_current_admin),
) -> dict[str, bool]:
    loc = body.locale.strip()  # 去空白
    key = body.msg_key.strip()  # 键去首尾空白
    if not loc or not key:  # 不允许空键
        raise HTTPException(status_code=400, detail="invalid_locale_or_key")  # 400
    with get_db() as conn:  # 写连接
        conn.execute(  # SQLite OR REPLACE / PG 经适配器转 ON CONFLICT
            "INSERT OR REPLACE INTO translation (locale, msg_key, msg_value) VALUES (?, ?, ?)",
            (loc, key, body.msg_value),
        )
        conn.commit()  # 显式提交
    return {"success": True}  # 与站点其它 PUT 一致


@router.delete("/translations")  # 按 locale+msg_key 删除
def admin_delete_translation(
    locale: str = Query(..., max_length=32),  # 要删的 locale
    msg_key: str = Query(..., max_length=500),  # 要删的键
    _admin: dict = Depends(get_current_admin),
) -> dict[str, bool]:
    loc = locale.strip()  # 规范化
    key = msg_key.strip()  # 规范化
    if not loc or not key:  # 防空
        raise HTTPException(status_code=400, detail="invalid_locale_or_key")  # 400
    with get_db() as conn:  # 写
        conn.execute(  # 物理删一行
            "DELETE FROM translation WHERE locale = ? AND msg_key = ?",
            (loc, key),
        )
        conn.commit()  # 提交
    return {"success": True}  # 完成


@router.get("/translations/export")  # 全量或按 locale 导出（给网盘 / 翻译平台往返）
def admin_export_translations(
    locale: str | None = Query(None, max_length=32),  # 可选只导一种语言
    format: str = Query("json", max_length=16),  # json | ndjson
    _admin: dict = Depends(get_current_admin),  # 须管理员
) -> Any:  # JSON 对象或纯文本 NDJSON
    fmt = format.strip().lower()  # 规范化
    if fmt not in ("json", "ndjson"):  # 仅支持两种
        raise HTTPException(status_code=400, detail="export_bad_format")  # 400
    with get_db() as conn:  # 读连接
        if locale is not None and locale.strip() != "":  # 按语言筛选
            rows = conn.execute(
                "SELECT locale, msg_key, msg_value FROM translation WHERE locale = ? ORDER BY msg_key",
                (locale.strip(),),
            ).fetchall()  # 子集
        else:  # 全表（管理端可控环境）
            rows = conn.execute(
                "SELECT locale, msg_key, msg_value FROM translation ORDER BY locale, msg_key LIMIT 100000",
            ).fetchall()  # 硬上限防误操作拖垮内存
    items = [{"locale": r["locale"], "msg_key": r["msg_key"], "msg_value": r["msg_value"]} for r in rows]  # 统一 dict
    if fmt == "ndjson":  # 行分隔 JSON，便于流式工具
        lines = [json.dumps(it, ensure_ascii=False) for it in items]  # 每行一条
        body = "\n".join(lines) + ("\n" if lines else "")  # 尾换行可选
        return PlainTextResponse(content=body, media_type="application/x-ndjson; charset=utf-8")  # 下载型 MIME
    return {"format": "json", "count": len(items), "items": items}  # 结构化包


@router.post("/translations/import")  # 批量 upsert；可选先清空某 locale
def admin_import_translations(
    body: TranslationImportBody,
    replace_locale: str | None = Query(None, max_length=32),  # 若传则先删该语言全部键再写入
    _admin: dict = Depends(get_current_admin),
) -> dict[str, Any]:
    if len(body.items) > 20000:  # 单次体量上限
        raise HTTPException(status_code=400, detail="import_too_many")  # 400
    upserted = 0  # 计数
    with get_db() as conn:  # 写连接
        if replace_locale is not None and replace_locale.strip() != "":  # 显式替换模式
            conn.execute("DELETE FROM translation WHERE locale = ?", (replace_locale.strip(),))  # 清空该 locale
        for it in body.items:  # 逐行 upsert
            loc = it.locale.strip()  # 规范化
            key = it.msg_key.strip()  # 键
            if not loc or not key:  # 跳过非法行
                continue  # 不中断整批
            conn.execute(
                "INSERT OR REPLACE INTO translation (locale, msg_key, msg_value) VALUES (?, ?, ?)",
                (loc, key, it.msg_value),
            )  # 与单行 PUT 一致
            upserted += 1  # 统计
        conn.commit()  # 一次提交
    return {"success": True, "upserted": upserted}  # 返回处理条数
