"""前台可跟踪页面清单与中英文名称。

清单来源（合并去重、有序）：
1. site_json 全表遍历：对象上的 path / href（站内路径）——运营增改配置即可出现新行；
2. STATIC_PAGE_LABELS：路由兜底，防止配置漏写核心页；
3. comparison_page：每条 slug → /compare/{slug}；
4. tool 表：每条 slug → /tool/{slug}；

埋点里出现但不在上述清单中的路径仍会并入（见 analytics_service）。
"""

from __future__ import annotations

import json
import sqlite3
from typing import Callable

# 与 frontend/src/app/routes.tsx 静态路径一致（pathname，无 query）
STATIC_PAGE_LABELS: list[tuple[str, str, str]] = [
    ("/", "首页", "Home"),
    ("/compare", "对比选工具", "Compare — pick tools"),
    ("/dashboard", "开发者数据看板", "Developer dashboard"),
    ("/profile", "个人主页", "Profile"),
    ("/edit-profile", "编辑资料", "Edit profile"),
    ("/favorites", "我的收藏", "Favorites"),
    ("/settings", "账户设置", "Account settings"),
    ("/submit", "提交工具", "Submit a tool"),
    ("/sitemap", "网站地图", "Sitemap"),
    ("/guide", "使用指南", "Guide"),
    ("/more", "更多", "More"),
]

STATIC_LABELS_BY_PATH: dict[str, tuple[str, str]] = {p: (zh, en) for p, zh, en in STATIC_PAGE_LABELS}

_EXCLUDE_SITE_KEYS = frozenset(
    {"admin_settings", "page_seo", "ai_insight_competitor_benchmarks"}
)  # 无站内 path 扫描价值的 JSON 块


def normalize_page_path(path: str) -> str:
    """与埋点统计口径一致：去掉 query，归一化尾斜杠。"""
    p = (path or "/").split("?", 1)[0].strip()
    if not p:
        return "/"
    p = p.rstrip("/")
    return p if p else "/"


def is_trackable_internal_path(raw: str) -> bool:
    """只收录站内 pathname，排除外链与锚点。"""
    s = raw.strip()
    if not s.startswith("/"):
        return False
    if s.startswith("//"):
        return False
    if "://" in s:
        return False
    if s.startswith("/#"):
        return False
    return True


def tool_slug_title_map(conn: sqlite3.Connection) -> dict[str, str]:
    rows = conn.execute("SELECT slug, name FROM tool WHERE slug IS NOT NULL AND slug != ''").fetchall()
    return {str(r["slug"]): str(r["name"] or r["slug"]) for r in rows}


def _label_pair_from_obj(obj: dict) -> tuple[str | None, str | None]:
    """从站点 JSON 节点解析展示名（支持 name_zh/name_en 或单字段 name/title）。"""
    zh = obj.get("name_zh")
    en = obj.get("name_en")
    if isinstance(zh, str) and zh.strip():
        zh = zh.strip()
    else:
        zh = None
    if isinstance(en, str) and en.strip():
        en = en.strip()
    else:
        en = None
    single = obj.get("name") or obj.get("title") or obj.get("page_title")
    if isinstance(single, str) and single.strip():
        single = single.strip()
        if not zh:
            zh = single
        if not en:
            en = single
    return zh, en


def walk_site_json_paths(obj: object, push_raw: Callable[..., None]) -> None:
    """递归 site_json：同一对象上的 path、href 与标题组合成一行配置。"""
    if isinstance(obj, dict):
        zh, en = _label_pair_from_obj(obj)
        for key in ("path", "href"):
            v = obj.get(key)
            if isinstance(v, str):
                push_raw(v, zh, en)
        for v in obj.values():
            walk_site_json_paths(v, push_raw)
    elif isinstance(obj, list):
        for it in obj:
            walk_site_json_paths(it, push_raw)


def build_tracked_path_list(conn: sqlite3.Connection) -> tuple[list[str], dict[str, tuple[str, str]]]:
    """返回（有序路径列表, 配置驱动的页面名称映射）。配置里没有名称的路径不写入映射，由 labels_for_path 推断。"""
    config_labels: dict[str, tuple[str, str]] = {}
    ordered: list[str] = []
    seen: set[str] = set()

    def push_raw(raw: str, zh: str | None = None, en: str | None = None) -> None:
        if not is_trackable_internal_path(raw):
            return
        p = normalize_page_path(raw)
        if p not in seen:
            seen.add(p)
            ordered.append(p)
        if zh or en:
            z = (zh or en or "").strip()
            e = (en or zh or "").strip()
            if z and p not in config_labels:
                config_labels[p] = (z, e)

    _ex = tuple(_EXCLUDE_SITE_KEYS)
    _ph = ",".join("?" * len(_ex))
    rows = conn.execute(
        f"SELECT content_key, payload_json FROM site_json WHERE content_key NOT IN ({_ph})",
        _ex,
    ).fetchall()
    for row in rows:
        raw = row["payload_json"]
        if not raw:
            continue
        try:
            payload = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            continue
        walk_site_json_paths(payload, push_raw)

    for path, zh, en in STATIC_PAGE_LABELS:
        push_raw(path)
        if path not in config_labels:
            config_labels[path] = (zh, en)

    for row in conn.execute("SELECT slug FROM comparison_page WHERE slug IS NOT NULL AND slug != '' ORDER BY slug"):
        slug = str(row["slug"])
        p = f"/compare/{slug}"
        push_raw(p)
        if p not in config_labels:
            config_labels[p] = (f"对比落地页：{slug}", f"Compare page — {slug}")

    for row in conn.execute("SELECT slug FROM tool WHERE slug IS NOT NULL AND slug != '' ORDER BY id"):
        push_raw(f"/tool/{row['slug']}")

    return ordered, config_labels


def labels_for_path(
    path: str,
    tools: dict[str, str],
    config_labels: dict[str, tuple[str, str]] | None = None,
) -> tuple[str, str]:
    """返回 (中文名, 英文名)；优先站点配置，再静态表，再按路径推断。"""
    if config_labels:
        hit = config_labels.get(path)
        if hit:
            return hit
    if path in STATIC_LABELS_BY_PATH:
        return STATIC_LABELS_BY_PATH[path]
    if path.startswith("/tool/"):
        slug = path[len("/tool/") :].split("/")[0]
        if not slug:
            return ("工具详情", "Tool detail")
        title = tools.get(slug)
        if title:
            return (f"工具详情：{title}", f"Tool — {title}")
        return (f"工具详情（{slug}）", f"Tool detail ({slug})")
    if path.startswith("/compare/"):
        rest = path[len("/compare/") :].split("/")[0]
        if rest:
            return (f"工具对比（{rest}）", f"Compare — {rest}")
        return ("对比页", "Compare")
    if path.startswith("/category/"):
        rest = path[len("/category/") :].split("/")[0]
        if rest:
            return (f"分类页：{rest}", f"Category — {rest}")
    return (f"其它页面：{path}", f"Other — {path}")


# 兼容旧 import
def canonical_paths(conn: sqlite3.Connection) -> list[str]:
    paths, _ = build_tracked_path_list(conn)
    return paths
