"""工具详情与列表。"""
from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_db
from app.i18n_util import all_messages_for_locale, category_label
from app.promotion_util import tool_has_active_promotion  # 弱曝光：paid 且在约

router = APIRouter(tags=["tools"])

# 列表与详情仅展示已审核通过的工具
_ACTIVE = "t.moderation_status = 'active'"


class ToolListItem(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    rating: float
    pricing: str
    category: str
    category_slug: str
    review_count: int
    popularity: int
    created_at: str


@router.get("/tools", response_model=list[ToolListItem])
def list_tools(locale: str = "en") -> list[ToolListItem]:
    """按热度排序；分类名为 i18n 解析后的展示文案。"""
    with get_db() as conn:
        rows = conn.execute(
            f"""SELECT t.slug, t.name, t.description, t.icon_emoji, t.rating, t.pricing_type,
                      t.review_count, t.popularity, t.created_at, c.slug AS category_slug, c.i18n_key
               FROM tool t
               JOIN category c ON t.category_id = c.id
               WHERE {_ACTIVE}
               ORDER BY t.popularity DESC"""
        ).fetchall()
        out: list[ToolListItem] = []
        for r in rows:
            out.append(
                ToolListItem(
                    id=r["slug"],
                    name=r["name"],
                    description=r["description"],
                    icon=r["icon_emoji"],
                    rating=r["rating"],
                    pricing=r["pricing_type"],
                    category=category_label(conn, locale, r["i18n_key"]),
                    category_slug=r["category_slug"],
                    review_count=r["review_count"],
                    popularity=r["popularity"],
                    created_at=r["created_at"] or "",
                )
            )
        return out


@router.get("/tools/{slug}/detail")
def tool_detail(slug: str, locale: str = "en") -> dict:
    """聚合特性、截图、定价方案、已发布评论、替代工具及全页 i18n messages。"""
    with get_db() as conn:
        t = conn.execute(
            f"""SELECT t.*, c.slug AS category_slug, c.i18n_key
               FROM tool t JOIN category c ON t.category_id = c.id
               WHERE t.slug = ? AND {_ACTIVE}""",
            (slug,),
        ).fetchone()
        if not t:
            raise HTTPException(status_code=404, detail="not_found")
        tid = t["id"]
        features = [
            r[0]
            for r in conn.execute(
                "SELECT body FROM tool_feature WHERE tool_id = ? ORDER BY sort_order",
                (tid,),
            ).fetchall()
        ]
        screenshots = [
            r[0]
            for r in conn.execute(
                "SELECT symbol FROM tool_screenshot WHERE tool_id = ? ORDER BY sort_order",
                (tid,),
            ).fetchall()
        ]
        plans = []
        for r in conn.execute(
            """SELECT name, price_label, features_json FROM tool_pricing_plan
               WHERE tool_id = ? ORDER BY id""",
            (tid,),
        ).fetchall():
            plans.append(
                {
                    "name": r[0],
                    "price": r[1],
                    "features": json.loads(r[2] or "[]"),
                }
            )
        reviews = []
        for r in conn.execute(
            """SELECT user_name, avatar_emoji, rating, comment, review_date, helpful_count
               FROM review
               WHERE tool_id = ? AND ugc_status = 'published'
               ORDER BY sort_order""",
            (tid,),
        ).fetchall():
            reviews.append(
                {
                    "user": r[0],
                    "avatar": r[1],
                    "rating": r[2],
                    "comment": r[3],
                    "date": r[4],
                    "helpful": r[5],
                }
            )
        alts = []
        for r in conn.execute(
            f"""SELECT o.slug, o.name, o.rating, o.pricing_type
               FROM tool_alternative a
               JOIN tool o ON o.id = a.alternative_tool_id
               WHERE a.tool_id = ? AND {_ACTIVE.replace("t.", "o.")}
               ORDER BY a.sort_order""",
            (tid,),
        ).fetchall():
            alts.append(
                {"id": r[0], "name": r[1], "rating": r[2], "pricing": r[3]}
            )
        messages = all_messages_for_locale(conn, locale)
        promo = tool_has_active_promotion(conn, int(tid))  # 与 monetization_order 同源
        return {
            "slug": t["slug"],
            "name": t["name"],
            "logo": t["icon_emoji"],
            "tagline": t["tagline"] or t["description"],
            "rating": t["rating"],
            "totalReviews": t["review_count"],
            "category": category_label(conn, locale, t["i18n_key"]),
            "category_slug": t["category_slug"],
            "pricing": t["pricing_type"],
            "website": t["website_url"],
            "description": t["long_description"] or t["description"],
            "features": features,
            "screenshots": screenshots,
            "alternatives": alts,
            "pricingPlans": plans,
            "reviews": reviews,
            "created_at": t["created_at"],
            "messages": messages,
            "promotion_active": promo,  # 匿名可见；合规标识由前台文案承载
        }
