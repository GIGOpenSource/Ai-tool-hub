"""对已有库增量加列（CREATE IF NOT EXISTS 无法更新旧表结构）；SQLite 与 PostgreSQL 共用。"""
from __future__ import annotations

import json
import sqlite3

from app.db_util import is_pg_adapter, table_column_names  # 列自省与 PG 分支
from app.paths import SEED_DIR  # 种子 JSON 路径（dashboard 合并模板）

# 老库 admin_settings 无新菜单项时追加（按 path 去重；order 排在默认项之后）
_ADMIN_MENU_EXTRAS: list[dict[str, object]] = [
    {  # 工具详情 JSON-LD：seo_tool_json_ld.global_merge 专页
        "id": "adm-tool-jsonld",
        "key": "sidebar.toolJsonLd",
        "label": "Tool JSON-LD",
        "path": "/admin/tool-json-ld",
        "icon": "Braces",
        "permission": "",
        "visible": True,
        "order": 13,
    },
    {  # 首页 SEO 分字段表单，减轻大块 JSON 误改
        "id": "adm-home-seo",
        "key": "sidebar.homeSeoForm",
        "label": "Home SEO",
        "path": "/admin/home-seo",
        "icon": "Search",
        "permission": "",
        "visible": True,
        "order": 15,
    },
    {  # translation 表后台
        "id": "adm-i18n",
        "key": "sidebar.translations",
        "label": "Translations",
        "path": "/admin/translations",
        "icon": "Languages",
        "permission": "",
        "visible": True,
        "order": 16,
    },
    {  # comparison_page 维护
        "id": "adm-comp",
        "key": "sidebar.comparisons",
        "label": "Comparisons",
        "path": "/admin/comparisons",
        "icon": "GitCompare",
        "permission": "",
        "visible": True,
        "order": 17,
    },
    {  # 首页搜索联想词 search_suggestion 表
        "id": "adm-search-sugg",
        "key": "sidebar.searchSuggestions",
        "label": "Search suggestions",
        "path": "/admin/search-suggestions",
        "icon": "ListOrdered",
        "permission": "",
        "visible": True,
        "order": 8,
    },
]


def _ensure_admin_menu_extras(conn: sqlite3.Connection | object) -> None:  # 合并侧栏项，不删运营已有项
    row = conn.execute(  # 读整块 admin_settings
        "SELECT payload_json FROM site_json WHERE content_key = 'admin_settings' LIMIT 1",
    ).fetchone()  # 无行则跳过
    if not row:
        return
    try:  # 解析 JSON
        obj = json.loads(row["payload_json"] or "{}")  # 列名取值
    except (json.JSONDecodeError, TypeError):  # 损坏则不动
        return
    items = obj.get("admin_menu_items")  # 侧栏数组
    if not isinstance(items, list):  # 非数组无法合并
        return
    paths = {str(it.get("path", "")) for it in items if isinstance(it, dict)}  # 已有 path 集合
    changed = False  # 是否追加过
    for extra in _ADMIN_MENU_EXTRAS:  # 缺项则补
        if extra["path"] not in paths:  # path 唯一
            items.append(dict(extra))  # 拷贝写入
            paths.add(str(extra["path"]))  # 记入已存在
            changed = True  # 标记需回写
    if not changed:  # 无须写库
        return
    items.sort(key=lambda x: int(x.get("order", 0)) if isinstance(x, dict) else 0)  # 按 order 排序
    conn.execute(  # 覆盖写回 site_json
        "UPDATE site_json SET payload_json = ? WHERE content_key = 'admin_settings'",
        (json.dumps(obj, ensure_ascii=False),),
    )


def _cols(conn: sqlite3.Connection | object, table: str) -> set[str]:  # 与 table_column_names 等价别名
    return table_column_names(conn, table)  # PRAGMA 或 information_schema


def _merge_missing_dashboard(dst: dict, src: dict) -> None:  # 就地补键；不覆盖运营已有字段
    for k, v in src.items():
        if k not in dst:
            dst[k] = v
        elif isinstance(dst[k], dict) and isinstance(v, dict):
            _merge_missing_dashboard(dst[k], v)


def _ensure_dashboard_merge(conn: sqlite3.Connection | object) -> None:  # 老库缺 my_tools/ui 键时从种子补全
    path = SEED_DIR / "site_content.json"
    if not path.is_file():
        return
    try:
        blob = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, TypeError):
        return
    tmpl = blob.get("dashboard")
    if not isinstance(tmpl, dict):
        return
    row = conn.execute(
        "SELECT payload_json FROM site_json WHERE content_key = 'dashboard' LIMIT 1",
    ).fetchone()
    if not row:
        conn.execute(
            "INSERT INTO site_json (content_key, payload_json) VALUES ('dashboard', ?)",
            (json.dumps(tmpl, ensure_ascii=False),),
        )
        return
    try:
        cur = json.loads(row["payload_json"] or "{}")
    except (json.JSONDecodeError, TypeError):
        cur = {}
    if not isinstance(cur, dict):
        cur = {}
    _merge_missing_dashboard(cur, tmpl)
    conn.execute(
        "UPDATE site_json SET payload_json = ? WHERE content_key = 'dashboard'",
        (json.dumps(cur, ensure_ascii=False),),
    )


def apply_migrations(conn: sqlite3.Connection | object) -> None:
    c = _cols(conn, "app_user")
    if "role" not in c:
        conn.execute("ALTER TABLE app_user ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
    if "password_hash" not in c:
        conn.execute("ALTER TABLE app_user ADD COLUMN password_hash TEXT")
    if "banned" not in c:
        conn.execute("ALTER TABLE app_user ADD COLUMN banned INTEGER NOT NULL DEFAULT 0")
    if "last_login_at" not in c:
        conn.execute("ALTER TABLE app_user ADD COLUMN last_login_at TEXT")
    if "settings_json" not in c:
        conn.execute("ALTER TABLE app_user ADD COLUMN settings_json TEXT NOT NULL DEFAULT '{}'")

    c = _cols(conn, "tool")
    if "moderation_status" not in c:
        conn.execute(
            "ALTER TABLE tool ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'active'"
        )
    if "submitted_by_user_id" not in c:
        conn.execute("ALTER TABLE tool ADD COLUMN submitted_by_user_id INTEGER REFERENCES app_user(id)")
    if "reject_reason_code" not in c:
        conn.execute("ALTER TABLE tool ADD COLUMN reject_reason_code TEXT")
    if "featured" not in c:
        conn.execute("ALTER TABLE tool ADD COLUMN featured INTEGER NOT NULL DEFAULT 0")

    c = _cols(conn, "review")
    if "reviewer_user_id" not in c:
        conn.execute("ALTER TABLE review ADD COLUMN reviewer_user_id INTEGER REFERENCES app_user(id)")
    if "ugc_status" not in c:
        conn.execute(
            "ALTER TABLE review ADD COLUMN ugc_status TEXT NOT NULL DEFAULT 'published'"
        )
    if "report_count" not in c:
        conn.execute(
            "ALTER TABLE review ADD COLUMN report_count INTEGER NOT NULL DEFAULT 0"
        )

    # 全站 URL 级 SEO（运营在后台维护）；无则插入空对象，保证 GET /api/site/page_seo 可用
    hit = conn.execute(
        "SELECT 1 FROM site_json WHERE content_key = 'page_seo' LIMIT 1"
    ).fetchone()
    if hit is None:
        conn.execute(
            "INSERT INTO site_json (content_key, payload_json) VALUES ('page_seo', ?)",
            (json.dumps({}, ensure_ascii=False),),
        )

    # home_seo：已有行但无 brand_title 时补默认顶栏名（站点 JSON 可后续改）
    home_row = conn.execute(
        "SELECT payload_json FROM site_json WHERE content_key = 'home_seo' LIMIT 1"
    ).fetchone()
    if home_row:
        try:
            home_obj = json.loads(home_row["payload_json"] or "{}")
        except (json.JSONDecodeError, TypeError):
            home_obj = {}
        if isinstance(home_obj, dict) and "brand_title" not in home_obj:
            home_obj["brand_title"] = "AI Tools Hub"
            conn.execute(
                "UPDATE site_json SET payload_json = ? WHERE content_key = 'home_seo'",
                (json.dumps(home_obj, ensure_ascii=False),),
            )

    if not conn.execute(  # 极旧库无 home_seo 行时插入最小块，避免 GET /api/site/home_seo 404
        "SELECT 1 FROM site_json WHERE content_key = 'home_seo' LIMIT 1"
    ).fetchone():
        conn.execute(
            "INSERT INTO site_json (content_key, payload_json) VALUES ('home_seo', ?)",
            (
                json.dumps(
                    {"brand_title": "AI Tools Hub", "keywords": ""},
                    ensure_ascii=False,
                ),
            ),
        )

    # sitemap 静态 URL、admin_settings（含前台主导航）：旧库无行时补默认，与种子对齐
    if not conn.execute(  # 若无 seo_sitemap_static 行则插入默认静态路径列表
        "SELECT 1 FROM site_json WHERE content_key = 'seo_sitemap_static' LIMIT 1"
    ).fetchone():  # .fetchone() 为空表示需补种
        conn.execute(  # 写入与 seo_public 回退常量等价的 urls
            "INSERT INTO site_json (content_key, payload_json) VALUES (?, ?)",
            (
                "seo_sitemap_static",  # content_key
                json.dumps(  # 序列化为 UTF-8 JSON 字符串入库
                    {
                        "urls": [  # 静态段：path / priority / changefreq
                            {"path": "/", "priority": "1.0", "changefreq": "weekly"},
                            {"path": "/compare", "priority": "0.85", "changefreq": "weekly"},
                            {"path": "/submit", "priority": "0.7", "changefreq": "weekly"},
                            {"path": "/sitemap", "priority": "0.5", "changefreq": "weekly"},
                            {"path": "/guide", "priority": "0.6", "changefreq": "weekly"},
                            {"path": "/more", "priority": "0.5", "changefreq": "weekly"},
                            {"path": "/support/faq", "priority": "0.4", "changefreq": "monthly"},
                            {"path": "/support/contact", "priority": "0.4", "changefreq": "monthly"},
                            {"path": "/support/privacy", "priority": "0.3", "changefreq": "yearly"},
                            {"path": "/support/terms", "priority": "0.3", "changefreq": "yearly"},
                        ]
                    },
                    ensure_ascii=False,  # 保留中文等非 ASCII
                ),
            ),
        )
    if not conn.execute(  # 若无 seo_robots 行则插入空对象（robots 走默认模板，可在站点 JSON 再编辑）
        "SELECT 1 FROM site_json WHERE content_key = 'seo_robots' LIMIT 1"
    ).fetchone():  # 老库首次迁移补行
        conn.execute(  # 占位，便于运营发现键
            "INSERT INTO site_json (content_key, payload_json) VALUES (?, ?)",
            ("seo_robots", json.dumps({}, ensure_ascii=False)),  # 空对象等价于全默认
        )
    if not conn.execute(  # 若无 admin_settings 行则插入默认前台/后台菜单占位
        "SELECT 1 FROM site_json WHERE content_key = 'admin_settings' LIMIT 1"
    ).fetchone():  # 老库升级后首次运行会走此处
        conn.execute(  # 与 seed site_content.json 中 admin_settings 结构一致
            "INSERT INTO site_json (content_key, payload_json) VALUES (?, ?)",
            (
                "admin_settings",  # content_key
                json.dumps(  # 整包 admin_settings 对象
                    {
                        "frontend_menu_items": [  # GET /api/site/frontend_nav 的数据源
                            {
                                "id": "nav-home",
                                "key": "nav.home",
                                "label": "Home",
                                "path": "/",
                                "icon": "Home",
                                "permission": "",
                                "visible": True,
                                "order": 0,
                            },
                            {
                                "id": "nav-compare",
                                "key": "nav.compare",
                                "label": "Compare",
                                "path": "/compare",
                                "icon": "GitCompare",
                                "permission": "",
                                "visible": True,
                                "order": 1,
                            },
                            {
                                "id": "nav-dash",
                                "key": "nav.dashboard",
                                "label": "Dashboard",
                                "path": "/dashboard",
                                "icon": "LayoutDashboard",
                                "permission": "",
                                "visible": True,
                                "order": 2,
                            },
                            {
                                "id": "nav-submit",
                                "key": "nav.submit",
                                "label": "Submit",
                                "path": "/submit",
                                "icon": "Upload",
                                "permission": "",
                                "visible": True,
                                "order": 3,
                            },
                            {
                                "id": "nav-more",
                                "key": "nav.more",
                                "label": "More",
                                "path": "/more",
                                "icon": "MoreHorizontal",
                                "permission": "",
                                "visible": True,
                                "order": 4,
                            },
                        ],
                        "admin_menu_items": [  # 与侧栏 FALLBACK 一致；Settings 可改顺序/显隐
                            {"id": "adm-dash", "key": "sidebar.dashboard", "label": "Dashboard", "path": "/admin/dashboard", "icon": "BarChart3", "permission": "", "visible": True, "order": 0},
                            {"id": "adm-analytics", "key": "sidebar.analytics", "label": "Analytics", "path": "/admin/analytics", "icon": "LineChart", "permission": "", "visible": True, "order": 1},
                            {"id": "adm-tools", "key": "sidebar.tools", "label": "Tools", "path": "/admin/tools", "icon": "Wrench", "permission": "", "visible": True, "order": 2},
                            {"id": "adm-users", "key": "sidebar.users", "label": "Users", "path": "/admin/users", "icon": "Users", "permission": "", "visible": True, "order": 3},
                            {"id": "adm-reviews", "key": "sidebar.reviews", "label": "Reviews", "path": "/admin/reviews", "icon": "MessageSquare", "permission": "", "visible": True, "order": 4},
                            {"id": "adm-mon", "key": "sidebar.monetization", "label": "Monetization", "path": "/admin/monetization", "icon": "DollarSign", "permission": "", "visible": True, "order": 5},
                            {"id": "adm-seo", "key": "sidebar.pageSeo", "label": "Page SEO", "path": "/admin/page-seo", "icon": "Search", "permission": "", "visible": True, "order": 6},
                            {"id": "adm-tool-jsonld", "key": "sidebar.toolJsonLd", "label": "Tool JSON-LD", "path": "/admin/tool-json-ld", "icon": "Braces", "permission": "", "visible": True, "order": 13},
                            {"id": "adm-blocks", "key": "sidebar.siteBlocks", "label": "Site JSON", "path": "/admin/site-blocks", "icon": "Code2", "permission": "", "visible": True, "order": 7},
                            {"id": "adm-search-sugg", "key": "sidebar.searchSuggestions", "label": "Search suggestions", "path": "/admin/search-suggestions", "icon": "ListOrdered", "permission": "", "visible": True, "order": 8},
                            {"id": "adm-home-seo", "key": "sidebar.homeSeoForm", "label": "Home SEO", "path": "/admin/home-seo", "icon": "Search", "permission": "", "visible": True, "order": 15},
                            {"id": "adm-i18n", "key": "sidebar.translations", "label": "Translations", "path": "/admin/translations", "icon": "Languages", "permission": "", "visible": True, "order": 16},
                            {"id": "adm-comp", "key": "sidebar.comparisons", "label": "Comparisons", "path": "/admin/comparisons", "icon": "GitCompare", "permission": "", "visible": True, "order": 17},
                            {"id": "adm-settings", "key": "sidebar.settings", "label": "Settings", "path": "/admin/settings", "icon": "Settings", "permission": "", "visible": True, "order": 18},
                        ],
                    },
                    ensure_ascii=False,
                ),
            ),
        )

    # user_favorite：老库仅有 schema 种子无此表时补建；方言分 SQLite / PG
    if is_pg_adapter(conn):  # PostgreSQL：SERIAL 与 CURRENT_TIMESTAMP::TEXT
        conn.execute(  # 与 schema.pg.sql 一致，IF NOT EXISTS 幂等
            """CREATE TABLE IF NOT EXISTS user_favorite (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
                tool_slug TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
                UNIQUE(user_id, tool_slug)
            )"""
        )
    else:  # SQLite：AUTOINCREMENT 与 datetime('now')
        conn.execute(  # 整表 IF NOT EXISTS，避免重复执行报错
            """CREATE TABLE IF NOT EXISTS user_favorite (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
                tool_slug TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(user_id, tool_slug)
            )"""
        )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_user_favorite_user ON user_favorite(user_id)")  # 按用户查列表
    conn.execute("CREATE INDEX IF NOT EXISTS idx_user_favorite_slug ON user_favorite(tool_slug)")  # 按 slug 辅助统计/清理

    _ensure_admin_menu_extras(conn)  # 新后台页入口合并进 admin_settings（幂等）
    _ensure_dashboard_merge(conn)  # site_json.dashboard 缺键时与种子对齐（保留已有内容）
