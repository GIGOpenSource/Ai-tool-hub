"""初次写入示例数据（幂等）：仅在关键表为空时从 data/seed/*.json 导入。
含 i18n、分类与工具、站点块、对比页等；与 migrate 独立。
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from app.db import get_db, insert_returning_id, table_nonempty
from app.paths import SEED_DIR


def _load_json(name: str) -> dict | list:
    return json.loads((SEED_DIR / name).read_text(encoding="utf-8"))


def _seed_i18n(conn: sqlite3.Connection) -> None:
    raw: dict[str, dict[str, str]] = _load_json("i18n.json")
    en = raw["en"]
    for locale, patch in raw.items():
        merged = {**en, **patch}
        conn.executemany(
            "INSERT OR REPLACE INTO translation (locale, msg_key, msg_value) VALUES (?, ?, ?)",
            [(locale, k, v) for k, v in merged.items()],
        )


def _seed_categories_tools(conn: sqlite3.Connection | object) -> None:
    bundle = _load_json("tools_bundle.json")
    cat_ids: dict[str, int] = {}
    for c in bundle["categories"]:
        cat_ids[c["slug"]] = insert_returning_id(
            conn,
            """INSERT INTO category (slug, i18n_key, icon_key, color_class, sort_order)
               VALUES (?, ?, ?, ?, ?)""",
            (c["slug"], c["i18n_key"], c["icon_key"], c["color_class"], c["sort_order"]),
        )
    for t in bundle["tools"]:
        tid = insert_returning_id(
            conn,
            """INSERT INTO tool (slug, name, description, tagline, long_description, icon_emoji,
               rating, pricing_type, category_id, review_count, popularity, website_url, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                t["slug"],
                t["name"],
                t["description"],
                t["tagline"],
                t["long_description"],
                t["icon_emoji"],
                t["rating"],
                t["pricing_type"],
                cat_ids[t["category_slug"]],
                t["review_count"],
                t["popularity"],
                t["website_url"],
                t["created_at"],
            ),
        )
        for i, feat in enumerate(t.get("features") or []):
            conn.execute(
                "INSERT INTO tool_feature (tool_id, body, sort_order) VALUES (?, ?, ?)",
                (tid, feat, i),
            )
        for i, sym in enumerate(t.get("screenshots") or []):
            conn.execute(
                "INSERT INTO tool_screenshot (tool_id, symbol, sort_order) VALUES (?, ?, ?)",
                (tid, sym, i),
            )
        for i, plan in enumerate(t.get("pricing_plans") or []):
            conn.execute(
                """INSERT INTO tool_pricing_plan (tool_id, name, price_label, features_json)
                   VALUES (?, ?, ?, ?)""",
                (tid, plan["name"], plan["price_label"], json.dumps(plan.get("features") or [])),
            )
        for i, rev in enumerate(t.get("reviews") or []):
            conn.execute(
                """INSERT INTO review (tool_id, user_name, avatar_emoji, rating, comment,
                   review_date, helpful_count, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    tid,
                    rev["user_name"],
                    rev.get("avatar_emoji") or "👤",
                    rev["rating"],
                    rev["comment"],
                    rev["review_date"],
                    rev.get("helpful_count") or 0,
                    i,
                ),
            )
    slug_to_id: dict[str, int] = {
        r["slug"]: r["id"] for r in conn.execute("SELECT slug, id FROM tool").fetchall()
    }
    for t in bundle["tools"]:
        tid = slug_to_id[t["slug"]]
        for i, alt in enumerate(t.get("alternative_slugs") or []):
            aid = slug_to_id.get(alt)
            if aid:
                conn.execute(
                    """INSERT OR REPLACE INTO tool_alternative
                       (tool_id, alternative_tool_id, sort_order) VALUES (?, ?, ?)""",
                    (tid, aid, i),
                )


def _seed_search(conn: sqlite3.Connection) -> None:
    items = [
        "AI image generator",
        "ChatGPT alternatives",
        "Video editing AI",
        "AI coding assistant",
        "Free AI tools",
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO search_suggestion (text, sort_order) VALUES (?, ?)",
        [(t, i) for i, t in enumerate(items)],
    )


def _seed_comparison(conn: sqlite3.Connection) -> None:
    comp = _load_json("comparison_chatgpt.json")
    slug = comp.pop("slug")
    conn.execute(
        "INSERT OR REPLACE INTO comparison_page (slug, payload_json) VALUES (?, ?)",
        (slug, json.dumps(comp, ensure_ascii=False)),
    )


def _seed_site(conn: sqlite3.Connection) -> None:
    site = _load_json("site_content.json")
    for key, val in site.items():
        conn.execute(
            "INSERT OR REPLACE INTO site_json (content_key, payload_json) VALUES (?, ?)",
            (key, json.dumps(val, ensure_ascii=False)),
        )


def _seed_locales_users(conn: sqlite3.Connection) -> None:
    locales = [
        ("en", "English", "🇺🇸"),
        ("zh", "中文", "🇨🇳"),
        ("ko", "한국어", "🇰🇷"),
        ("ja", "日本語", "🇯🇵"),
        ("pt", "Português", "🇧🇷"),
        ("es", "Español", "🇪🇸"),
        ("fr", "Français", "🇫🇷"),
    ]
    conn.executemany(
        "INSERT OR REPLACE INTO locale_meta (code, label, flag_emoji) VALUES (?, ?, ?)",
        locales,
    )


def run_seed_if_empty() -> None:
    with get_db() as conn:
        if table_nonempty(conn, "tool"):
            return
        _seed_i18n(conn)
        _seed_categories_tools(conn)
        _seed_search(conn)
        _seed_comparison(conn)
        _seed_site(conn)
        _seed_locales_users(conn)
        conn.execute(
            """UPDATE review SET ugc_status = 'reported', report_count = 1
               WHERE id = (SELECT MIN(id) FROM review)"""
        )
        conn.commit()
