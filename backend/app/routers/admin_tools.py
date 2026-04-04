"""管理后台 — 工具审核与管理。"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.analytics_service import tool_traffic_counts
from app.db import get_db
from app.deps_auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_STATUS = frozenset({"pending", "active", "rejected"})
REJECT_REASONS = frozenset(
    {"URL_INVALID", "DESCRIPTION_VIOLATION", "NOT_AI_TOOL", "DUPLICATE", "OTHER"}
)


class ToolStatusBody(BaseModel):
    status: str
    reject_reason: Optional[str] = None


class FeaturedBody(BaseModel):
    featured: bool


class AdminToolPatchBody(BaseModel):
    """管理员部分更新工具信息：仅非空字段写入数据库。"""

    name: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = Field(default=None, max_length=10000)
    tagline: Optional[str] = Field(default=None, max_length=500)
    long_description: Optional[str] = Field(default=None, max_length=50000)
    website_url: Optional[str] = Field(default=None, max_length=2048)
    pricing_type: Optional[str] = Field(default=None, max_length=64)
    icon_emoji: Optional[str] = Field(default=None, max_length=32)
    category_slug: Optional[str] = Field(default=None, max_length=128)


@router.get("/tools")
def admin_list_tools(
    tab: str = "all",
    _admin: dict = Depends(get_current_admin),
) -> dict:
    if tab not in ("all", "pending", "active", "rejected"):
        tab = "all"
    where = ""
    if tab != "all":
        where = " WHERE t.moderation_status = ? "
    sql = f"""SELECT t.id, t.slug, t.name, t.icon_emoji, t.moderation_status, t.featured,
                     t.website_url, t.submitted_by_user_id, c.slug AS category_slug,
                     u.email AS submitter_email
              FROM tool t
              JOIN category c ON t.category_id = c.id
              LEFT JOIN app_user u ON u.id = t.submitted_by_user_id
              {where}
              ORDER BY t.id DESC"""
    with get_db() as conn:
        if tab == "all":
            rows = conn.execute(sql).fetchall()
        else:
            rows = conn.execute(sql, (tab,)).fetchall()
        out = []
        for r in rows:
            tr = tool_traffic_counts(conn, r["slug"])
            out.append(
                {
                    "id": r["id"],
                    "slug": r["slug"],
                    "name": r["name"],
                    "logo": r["icon_emoji"],
                    "website_url": r["website_url"] or "",
                    "category_slug": r["category_slug"],
                    "submitted_by_user_id": r["submitted_by_user_id"],
                    "submitter_email": r["submitter_email"],
                    "status": r["moderation_status"],
                    "featured": bool(r["featured"]),
                    **tr,
                }
            )
        return {"data": out}


@router.patch("/tools/{tool_id}/status")
def admin_tool_status(
    tool_id: int,
    body: ToolStatusBody,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    raw = body.status.strip().upper()
    if raw in ("ACTIVE", "APPROVED"):
        st = "active"
        reason = None
    elif raw == "REJECTED":
        st = "rejected"
        reason = (body.reject_reason or "OTHER").upper()
        if reason not in REJECT_REASONS:
            raise HTTPException(status_code=400, detail="invalid_reason")
    else:
        raise HTTPException(status_code=400, detail="invalid_status")
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE tool SET moderation_status = ?, reject_reason_code = ? WHERE id = ?",
            (st, reason, tool_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="not_found")
        conn.commit()
    return {"success": True, "message": "Status updated"}


@router.patch("/tools/{tool_id}/featured")
def admin_tool_featured(
    tool_id: int,
    body: FeaturedBody,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE tool SET featured = ? WHERE id = ?",
            (1 if body.featured else 0, tool_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="not_found")
        conn.commit()
    return {"success": True}


@router.patch("/tools/{tool_id}")
def admin_tool_patch(
    tool_id: int,
    body: AdminToolPatchBody,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """审核/运营后台：编辑工具基础字段（不含 slug，避免外链失效）。"""
    fields: list[str] = []
    values: list[object] = []
    if body.name is not None:
        n = body.name.strip()
        if not n:
            raise HTTPException(status_code=400, detail="empty_name")
        fields.append("name = ?")  # 工具名称
        values.append(n)
    if body.description is not None:
        fields.append("description = ?")  # 短描述
        values.append(body.description.strip())
    if body.tagline is not None:
        fields.append("tagline = ?")  # 一句话标语
        values.append(body.tagline.strip())
    if body.long_description is not None:
        fields.append("long_description = ?")  # 长文介绍
        values.append(body.long_description.strip())
    if body.website_url is not None:
        fields.append("website_url = ?")  # 官网
        values.append(body.website_url.strip())
    if body.pricing_type is not None:
        fields.append("pricing_type = ?")  # 定价类型文案
        values.append(body.pricing_type.strip())
    if body.icon_emoji is not None:
        fields.append("icon_emoji = ?")  # 列表用 emoji 图标
        values.append(body.icon_emoji.strip())
    with get_db() as conn:
        if body.category_slug is not None:
            cs = body.category_slug.strip()  # 分类 slug
            crow = conn.execute("SELECT id FROM category WHERE slug = ?", (cs,)).fetchone()
            if not crow:
                raise HTTPException(status_code=400, detail="invalid_category")
            fields.append("category_id = ?")  # 外键到 category
            values.append(int(crow["id"]))
        if not fields:
            return {"success": True, "message": "no_changes"}
        values.append(tool_id)  # WHERE id = ?
        cur = conn.execute(
            f"UPDATE tool SET {', '.join(fields)} WHERE id = ?",
            tuple(values),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="not_found")
        conn.commit()
    return {"success": True}


@router.get("/tools/{tool_id}/review-detail")
def admin_tool_review_detail(
    tool_id: int,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    with get_db() as conn:
        t = conn.execute(
            """SELECT t.*, c.slug AS category_slug FROM tool t
               JOIN category c ON t.category_id = c.id WHERE t.id = ?""",
            (tool_id,),
        ).fetchone()
        if not t:
            raise HTTPException(status_code=404, detail="not_found")
        tid = t["id"]
        feats = [
            r[0]
            for r in conn.execute(
                "SELECT body FROM tool_feature WHERE tool_id = ? ORDER BY sort_order",
                (tid,),
            )
        ]
        shots = [
            r[0]
            for r in conn.execute(
                "SELECT symbol FROM tool_screenshot WHERE tool_id = ? ORDER BY sort_order",
                (tid,),
            )
        ]
        return {
            "id": tid,
            "slug": t["slug"],
            "name": t["name"],
            "icon_emoji": t["icon_emoji"],
            "description": t["description"],
            "tagline": t["tagline"],
            "long_description": t["long_description"],
            "website_url": t["website_url"],
            "pricing_type": t["pricing_type"],
            "category_slug": t["category_slug"],
            "moderation_status": t["moderation_status"],
            "reject_reason_code": t["reject_reason_code"],
            "features": feats,
            "screenshots": shots,
        }
