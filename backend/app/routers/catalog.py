"""分类、搜索建议、提交表单元数据。"""
from __future__ import annotations

import json

from fastapi import APIRouter
from pydantic import BaseModel

from app.db import get_db
from app.i18n_util import category_label

router = APIRouter(tags=["catalog"])


class CategoryOut(BaseModel):
    slug: str
    name: str
    icon_key: str
    color_class: str
    sort_order: int


@router.get("/categories", response_model=list[CategoryOut])
def categories(locale: str = "en") -> list[CategoryOut]:
    with get_db() as conn:
        rows = conn.execute(
            """SELECT slug, i18n_key, icon_key, color_class, sort_order
               FROM category ORDER BY sort_order"""
        ).fetchall()
        return [
            CategoryOut(
                slug=r[0],
                name=category_label(conn, locale, r[1]),
                icon_key=r[2],
                color_class=r[3],
                sort_order=r[4],
            )
            for r in rows
        ]


@router.get("/search-suggestions")
def search_suggestions() -> list[str]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT text FROM search_suggestion ORDER BY sort_order, id"
        ).fetchall()
        return [r[0] for r in rows]


@router.get("/submit-options")
def submit_options(locale: str = "en") -> dict:
    """读 site_json.submit，并把 category_slugs 转成带展示名的列表给前端表单。"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT payload_json FROM site_json WHERE content_key = ?",
            ("submit",),
        ).fetchone()
        if not row:
            return {"category_slugs": [], "pricing_options": []}
        data = json.loads(row[0])
        cats = conn.execute(
            """SELECT slug, i18n_key FROM category ORDER BY sort_order"""
        ).fetchall()
        slug_to_label = {s: category_label(conn, locale, ik) for s, ik in cats}
        ordered = data.get("category_slugs") or []
        categories_resolved = [
            {"slug": s, "name": slug_to_label.get(s, s)} for s in ordered
        ]
        return {
            "categories": categories_resolved,
            "pricing_options": data.get("pricing_options") or [],
            "ui": data.get("ui") or {},
        }
