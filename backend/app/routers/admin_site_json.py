# 管理后台 — 白名单内的 site_json 内容块整包读写（不经专用表单的运营 JSON）
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from app.db import get_db  # 读写 site_json
from app.deps_auth import get_current_admin  # 管理员 JWT
from app.site_json_payload_validate import validate_site_json_for_key  # 按 key 校验 payload 形态

router = APIRouter(prefix="/admin", tags=["admin"])

# 允许编辑的 content_key（不含 page_seo / admin_settings，二者有专用界面或结构复杂）
_ALLOWED_KEYS = frozenset(
    {
        "home_seo",
        "ui_toasts",
        "guide",
        "more",
        "sitemap",
        "profile",
        "favorites",
        "compare_interactive",
        "submit",
        "not_found",
        "dashboard",
        "seo_sitemap_static",
        "seo_robots",  # robots.txt：Sitemap 行 / Disallow / raw_body（GET /api/seo/robots.txt 读取）
        "seo_tool_json_ld",  # 工具详情 JSON-LD 全局浅合并（GET /api/site/seo_tool_json_ld）
        "ai_insight_competitor_benchmarks",  # AI SEO 快照竞品指标（POST /api/admin/ai-insights/run 注入 competitor_benchmark_snapshot）
    }
)


class SiteJsonPutBody(BaseModel):
    model_config = ConfigDict(extra="forbid")  # 仅允许 payload 字段

    payload: dict[str, Any]  # 写入该 key 的整棵 JSON 对象


@router.get("/site-json/{key}")
def admin_get_site_json(key: str, _admin: dict = Depends(get_current_admin)) -> dict:
    if key not in _ALLOWED_KEYS:  # 防任意键枚举与外部路径
        raise HTTPException(status_code=404, detail="unknown_key")
    with get_db() as conn:
        row = conn.execute(
            "SELECT payload_json FROM site_json WHERE content_key = ?",
            (key,),
        ).fetchone()
        if not row:
            return {"payload": {}, "exists": False}  # 空块可编辑后首次写入
        try:
            data = json.loads(row[0] or "{}")
        except (json.JSONDecodeError, TypeError):
            data = {}
        return {"payload": data if isinstance(data, dict) else {}, "exists": True}


@router.put("/site-json/{key}")
def admin_put_site_json(
    key: str,
    body: SiteJsonPutBody,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    if key not in _ALLOWED_KEYS:
        raise HTTPException(status_code=404, detail="unknown_key")
    validate_site_json_for_key(key, body.payload)  # submit/dashboard/seo_tool_json_ld 等类型守卫
    raw = json.dumps(body.payload, ensure_ascii=False)  # UTF-8 存库
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO site_json (content_key, payload_json) VALUES (?, ?)",
            (key, raw),
        )
        conn.commit()
    return {"success": True}
