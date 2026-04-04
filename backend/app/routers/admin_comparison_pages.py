# 管理后台 — comparison_page 结构化维护（slug + JSON 载荷）
from __future__ import annotations

import json  # payload 序列化
from typing import Any  # payload 任意 JSON 对象

from fastapi import APIRouter, Depends, HTTPException  # 路由与 404
from pydantic import BaseModel, ConfigDict, Field  # 入参模型

from app.comparison_payload_validate import validate_comparison_payload  # PUT 前结构校验
from app.db import get_db  # 数据库连接
from app.deps_auth import get_current_admin  # 管理员鉴权

router = APIRouter(prefix="/admin", tags=["admin"])  # /api/admin/*


class ComparisonPutBody(BaseModel):
    model_config = ConfigDict(extra="forbid")  # 禁止未知字段

    payload: dict[str, Any] = Field(default_factory=dict)  # 对比页内容对象（与公开 API 一致）


@router.get("/comparison-pages")  # 列出已有 slug 供下拉选
def admin_list_comparison_slugs(
    _admin: dict = Depends(get_current_admin),
) -> dict[str, list[str]]:
    with get_db() as conn:  # 只读
        rows = conn.execute("SELECT slug FROM comparison_page ORDER BY slug ASC").fetchall()  # 全 slug
    return {"slugs": [r["slug"] for r in rows]}  # 字符串数组


@router.get("/comparison-pages/{slug}")  # 拉取单页 JSON（解析后返回对象）
def admin_get_comparison_page(
    slug: str,
    _admin: dict = Depends(get_current_admin),
) -> dict[str, Any]:
    with get_db() as conn:  # 只读
        row = conn.execute(  # 主键 slug
            "SELECT payload_json FROM comparison_page WHERE slug = ?",
            (slug,),
        ).fetchone()  # 无则 None
    if row is None:  # 未找到
        raise HTTPException(status_code=404, detail="not_found")  # 404
    try:  # 脏 JSON 回落空对象
        payload = json.loads(row["payload_json"] or "{}")  # 列名访问
    except (json.JSONDecodeError, TypeError):  # 解析失败
        payload = {}  # 安全默认
    return {"slug": slug, "payload": payload}  # 给编辑器初始值


@router.put("/comparison-pages/{slug}")  # 整包覆盖写入
def admin_put_comparison_page(
    slug: str,
    body: ComparisonPutBody,
    _admin: dict = Depends(get_current_admin),
) -> dict[str, bool]:
    if not slug.strip():  # slug 无效
        raise HTTPException(status_code=400, detail="invalid_slug")  # 400
    validate_comparison_payload(body.payload)  # 拒绝 mainTool/alternatives 等类型错误
    with get_db() as conn:  # 写
        conn.execute(  # upsert 与种子/CLI 一致
            "INSERT OR REPLACE INTO comparison_page (slug, payload_json) VALUES (?, ?)",
            (slug.strip(), json.dumps(body.payload, ensure_ascii=False)),  # UTF-8 JSON 文本
        )
        conn.commit()  # 持久化
    return {"success": True}  # 成功
