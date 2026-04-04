"""多语言 JSON。"""
from __future__ import annotations

from fastapi import APIRouter

from app.db import get_db
from app.i18n_util import all_messages_for_locale

router = APIRouter(tags=["i18n"])


@router.get("/i18n/{locale}")
def get_locale_messages(locale: str) -> dict[str, str]:
    with get_db() as conn:
        return all_messages_for_locale(conn, locale)


@router.get("/locales")
def list_locales() -> list[dict]:
    """语言切换器数据源：code + 展示名 + 旗帜 emoji。"""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT code, label, flag_emoji FROM locale_meta ORDER BY code"""
        ).fetchall()
        return [{"code": r[0], "label": r[1], "flag": r[2]} for r in rows]
