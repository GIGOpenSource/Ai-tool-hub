"""翻译表 translation 查询：单 key、整包合并、分类展示名（分类表里存 i18n_key）。"""
from __future__ import annotations

import sqlite3


def translate(conn: sqlite3.Connection, locale: str, key: str) -> str:
    """先查当前语言，再回落到 en，再无则返回 key 本身。"""
    row = conn.execute(
        "SELECT msg_value FROM translation WHERE locale = ? AND msg_key = ?",
        (locale, key),
    ).fetchone()
    if row:
        return row[0]
    row = conn.execute(
        "SELECT msg_value FROM translation WHERE locale = 'en' AND msg_key = ?",
        (key,),
    ).fetchone()
    return row[0] if row else key


def all_messages_for_locale(conn: sqlite3.Connection, locale: str) -> dict[str, str]:
    """整表合并：以 en 为底，当前 locale 覆盖；供工具详情页一次下发前端 messages。"""
    en = dict(conn.execute("SELECT msg_key, msg_value FROM translation WHERE locale = 'en'").fetchall())
    loc = dict(
        conn.execute(
            "SELECT msg_key, msg_value FROM translation WHERE locale = ?",
            (locale,),
        ).fetchall(),
    )
    return {**en, **loc}


def category_label(conn: sqlite3.Connection, locale: str, i18n_key: str) -> str:
    """category 行中的 i18n_key 对应 translation 里的一条名称文案。"""
    return translate(conn, locale, i18n_key)
