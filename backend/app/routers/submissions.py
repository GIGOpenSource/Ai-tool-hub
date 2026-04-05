"""用户提交工具（待审核）。"""
from __future__ import annotations

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db import get_db, insert_returning_id
from app.deps_auth import get_optional_user_id
from app.ugc_text_guard import first_ugc_violation_among  # 可选敏感子串拦截（UGC_BLOCKED_SUBSTRINGS）

router = APIRouter(tags=["submissions"])


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.strip().lower())
    s = s.strip("-")[:80] or "tool"
    return s


class SubmitToolBody(BaseModel):
    name: str
    website: str
    description: str
    long_description: str = ""
    category_slug: str
    pricing: str = "Freemium"
    features: str = ""


@router.post("/submissions/tool")
def submit_tool(
    body: SubmitToolBody,
    user_id: Optional[int] = Depends(get_optional_user_id),
) -> dict:
    """写入 tool 为 pending；slug 由名称 slugify，冲突时自动追加序号。"""
    if not user_id:
        raise HTTPException(status_code=401, detail="login_required")
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="invalid_name")
    desc = body.description.strip()  # 短描述
    long_desc = body.long_description.strip()  # 长描述
    feats = body.features  # 特性多行原文
    viol = first_ugc_violation_among(name, desc, long_desc, feats)  # 环境变量黑名单（可空）
    if viol is not None:
        raise HTTPException(status_code=400, detail="ugc_blocked_substring")  # 命中则拒收
    base = _slugify(name)
    with get_db() as conn:
        cat = conn.execute(
            "SELECT id FROM category WHERE slug = ?", (body.category_slug,)
        ).fetchone()
        if not cat:
            raise HTTPException(status_code=400, detail="invalid_category")
        slug = base
        n = 0
        while conn.execute("SELECT 1 FROM tool WHERE slug = ?", (slug,)).fetchone():
            n += 1
            slug = f"{base}-{n}"
        tid = insert_returning_id(
            conn,
            """INSERT INTO tool (slug, name, description, tagline, long_description, icon_emoji,
               rating, pricing_type, category_id, review_count, popularity, website_url, created_at,
               moderation_status, submitted_by_user_id)
               VALUES (?, ?, ?, '', ?, '', 0, ?, ?, 0, 0, ?, datetime('now'),
               'pending', ?)""",
            (
                slug,
                name,
                desc,
                long_desc,
                body.pricing.strip() or "Freemium",
                cat["id"],
                body.website.strip(),
                user_id,
            ),
        )
        feat_lines = [x.strip() for x in body.features.split("\n") if x.strip()]
        for i, line in enumerate(feat_lines[:50]):
            conn.execute(
                "INSERT INTO tool_feature (tool_id, body, sort_order) VALUES (?, ?, ?)",
                (tid, line, i),
            )
        conn.commit()
    return {"success": True, "slug": slug}
