"""对已有库增量加列（CREATE IF NOT EXISTS 无法更新旧表结构）；SQLite 与 PostgreSQL 共用。"""
from __future__ import annotations

import json
import sqlite3

from app.ai_insight_prompt_defaults import (  # AI SEO 预设提示词（含每日报告 Checklist）
    DEFAULT_AI_INSIGHT_CONFIG_NAME,  # 默认配置显示名
    DEFAULT_AI_INSIGHT_SYSTEM_PROMPT,  # 系统消息全文
    DEFAULT_AI_INSIGHT_USER_PROMPT_TEMPLATE,  # 用户模板全文
    LEGACY_AI_INSIGHT_SYSTEM_PROMPT,  # 旧版系统消息（升级匹配用）
    LEGACY_AI_INSIGHT_USER_PROMPT_TEMPLATE,  # 旧版用户模板（升级匹配用）
)
from app.db_util import MigrationConnection, is_pg_adapter, table_column_names  # 连接注解与列自省、PG 分支
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
    {  # site_json.submit 分字段
        "id": "adm-site-submit",
        "key": "sidebar.siteSubmitForm",
        "label": "Submit page blocks",
        "path": "/admin/site-submit",
        "icon": "ClipboardList",
        "permission": "",
        "visible": True,
        "order": 9,
    },
    {  # site_json.dashboard 分字段
        "id": "adm-site-dash",
        "key": "sidebar.siteDashboardForm",
        "label": "Dashboard blocks",
        "path": "/admin/site-dashboard",
        "icon": "LayoutTemplate",
        "permission": "",
        "visible": True,
        "order": 10,
    },
    {  # PROD-AI-SEO：大模型解读 SEO/流量快照
        "id": "adm-ai-seo",
        "key": "sidebar.aiSeoInsights",
        "label": "AI SEO insights",
        "path": "/admin/ai-seo-insights",
        "icon": "Sparkles",
        "permission": "",
        "visible": True,
        "order": 12,
    },
    {  # PROD-CRAWLER：JSON 订阅拉取工具目录，Dry-run 后入库 pending
        "id": "adm-crawler",
        "key": "sidebar.crawlerData",
        "label": "Data import",
        "path": "/admin/crawler",
        "icon": "CloudDownload",
        "permission": "",
        "visible": True,
        "order": 12,
    },
]


def _ensure_admin_menu_extras(conn: MigrationConnection) -> None:  # 合并侧栏项，不删运营已有项
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


def _cols(conn: MigrationConnection, table: str) -> set[str]:  # 与 table_column_names 等价别名
    return table_column_names(conn, table)  # PRAGMA 或 information_schema


def _merge_missing_dashboard(dst: dict, src: dict) -> None:  # 就地补键；不覆盖运营已有字段
    for k, v in src.items():
        if k not in dst:
            dst[k] = v
        elif isinstance(dst[k], dict) and isinstance(v, dict):
            _merge_missing_dashboard(dst[k], v)


def _ensure_dashboard_merge(conn: MigrationConnection) -> None:  # 老库缺 my_tools/ui 键时从种子补全
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


def _table_exists(conn: MigrationConnection, name: str) -> bool:  # 判断表是否在库中
    if is_pg_adapter(conn):  # PostgreSQL
        row = conn.execute(  # public 下按名查
            "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?",
            (name,),
        ).fetchone()  # 一行或空
        return row is not None  # 存在为 True
    row = conn.execute(  # SQLite：sqlite_master
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (name,),
    ).fetchone()  # 一行或空
    return row is not None  # 存在为 True


def _ensure_ai_insight_llm_provider_table(conn: MigrationConnection) -> None:  # 多模型连接表（无则建）
    if _table_exists(conn, "ai_insight_llm_provider"):  # 已有（含新库 schema）
        return  # 跳过
    if is_pg_adapter(conn):  # PostgreSQL DDL
        conn.execute(
            """CREATE TABLE ai_insight_llm_provider (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
                model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
                api_key TEXT,
                api_key_env_name TEXT,
                timeout_sec INTEGER NOT NULL DEFAULT 120,
                temperature DOUBLE PRECISION NOT NULL DEFAULT 0.3,
                extra_headers_json TEXT NOT NULL DEFAULT '{}',
                adapter TEXT NOT NULL DEFAULT 'openai_compatible',
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
                updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
            )"""
        )
        return  # 结束 PG
    conn.execute(  # SQLite DDL
        """CREATE TABLE ai_insight_llm_provider (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
            model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
            api_key TEXT,
            api_key_env_name TEXT,
            timeout_sec INTEGER NOT NULL DEFAULT 120,
            temperature REAL NOT NULL DEFAULT 0.3,
            extra_headers_json TEXT NOT NULL DEFAULT '{}',
            adapter TEXT NOT NULL DEFAULT 'openai_compatible',
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )"""
    )


def _migrate_legacy_ai_insight_provider_settings(conn: MigrationConnection) -> None:  # 单表 → 多行表
    if not _table_exists(conn, "ai_insight_provider_settings"):  # 无旧表
        return  # 无需迁移
    cnt_row = conn.execute("SELECT COUNT(*) AS c FROM ai_insight_llm_provider").fetchone()  # 新表行数
    n_new = int(cnt_row["c"] or 0) if cnt_row else 0  # int
    if n_new == 0:  # 新表空则拷贝
        old = conn.execute("SELECT * FROM ai_insight_provider_settings WHERE id = 1").fetchone()  # 旧单行
        if old:  # 有数据
            conn.execute(
                """INSERT INTO ai_insight_llm_provider
                (name, base_url, model, api_key, api_key_env_name, timeout_sec, temperature, extra_headers_json, is_default, adapter)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    "Default (migrated)",  # 显示名
                    str(old["base_url"]),  # URL
                    str(old["model"]),  # 模型
                    old["api_key"],  # 密钥可空
                    old["api_key_env_name"],  # env 名可空
                    int(old["timeout_sec"] or 120),  # 超时
                    float(old["temperature"] if old["temperature"] is not None else 0.3),  # 温度
                    str(old["extra_headers_json"] or "{}"),  # 扩展头
                    1,  # 默认启用
                    "openai_compatible",  # 迁移行统一 OpenAI 兼容
                ),
            )
    conn.execute("DROP TABLE ai_insight_provider_settings")  # 丢弃旧表名


def _ensure_ai_insight_run_llm_provider_id_column(conn: MigrationConnection) -> None:  # run 表补外键列
    cols = table_column_names(conn, "ai_insight_run")  # 当前列
    if "llm_provider_id" in cols:  # 已有
        return  # 跳过
    if is_pg_adapter(conn):  # PG 带引用
        conn.execute(
            "ALTER TABLE ai_insight_run ADD COLUMN llm_provider_id INTEGER REFERENCES ai_insight_llm_provider(id) ON DELETE SET NULL"
        )
        return  # 结束
    conn.execute("ALTER TABLE ai_insight_run ADD COLUMN llm_provider_id INTEGER")  # SQLite 仅列


def _upgrade_legacy_ai_insight_prompt_seed(conn: MigrationConnection) -> None:  # 仍为旧版种子全文时升级到 Checklist 版
    row = conn.execute(  # 优先改当前默认配置
        "SELECT id, system_prompt, user_prompt_template FROM ai_insight_prompt_config WHERE is_default = 1 ORDER BY id LIMIT 1"
    ).fetchone()  # 单行或无
    if row is None:  # 无默认行
        row = conn.execute(  # 退化为最小 id（单配置老库）
            "SELECT id, system_prompt, user_prompt_template FROM ai_insight_prompt_config ORDER BY id LIMIT 1"
        ).fetchone()  # 单行或无
    if row is None:  # 无配置表数据
        return  # 跳过
    rid = int(row["id"])  # 配置主键
    sys_p = str(row["system_prompt"] or "")  # 当前系统消息
    usr_p = str(row["user_prompt_template"] or "")  # 当前用户模板
    if sys_p != LEGACY_AI_INSIGHT_SYSTEM_PROMPT or usr_p != LEGACY_AI_INSIGHT_USER_PROMPT_TEMPLATE:  # 非旧版全文
        return  # 不覆盖运营已改写的配置
    conn.execute(  # 升级到含三大 Checklist 的每日报告预设
        "UPDATE ai_insight_prompt_config SET name = ?, system_prompt = ?, user_prompt_template = ? WHERE id = ?",
        (
            DEFAULT_AI_INSIGHT_CONFIG_NAME,  # 新显示名
            DEFAULT_AI_INSIGHT_SYSTEM_PROMPT,  # 新系统消息
            DEFAULT_AI_INSIGHT_USER_PROMPT_TEMPLATE,  # 新用户模板
            rid,  # WHERE
        ),
    )  # 结束 UPDATE


def _ensure_ai_insight_seed(conn: MigrationConnection) -> None:  # 空表时写入默认提示词与 provider 占位行
    hit = conn.execute("SELECT 1 FROM ai_insight_prompt_config LIMIT 1").fetchone()  # 是否已有配置
    if not hit:  # 首启插入默认模板（占位符与 ai_insight_service 一致）
        conn.execute(
            """INSERT INTO ai_insight_prompt_config
            (name, system_prompt, user_prompt_template, is_default) VALUES (?,?,?,1)""",
            (
                DEFAULT_AI_INSIGHT_CONFIG_NAME,  # 显示名（每日报告 + Checklist）
                DEFAULT_AI_INSIGHT_SYSTEM_PROMPT,  # 系统消息（含三大 Checklist）
                DEFAULT_AI_INSIGHT_USER_PROMPT_TEMPLATE,  # 用户模板：六占位符由服务端注入（含竞品块）
            ),
        )  # 结束 INSERT
    row = conn.execute("SELECT 1 FROM ai_insight_llm_provider LIMIT 1").fetchone()  # 是否已有连接配置
    if not row:  # 插入默认 OpenAI 兼容行（密钥由 env 或后台填）
        conn.execute(
            """INSERT INTO ai_insight_llm_provider
            (name, base_url, model, timeout_sec, temperature, extra_headers_json, is_default, adapter)
            VALUES (?,?,?,?,?,?,?,?)""",
            (
                "OpenAI 兼容（默认）",  # 名称
                "https://api.openai.com/v1",  # 根
                "gpt-4o-mini",  # 模型
                120,  # 超时
                0.3,  # 温度
                "{}",  # 头
                1,  # 默认启用
                "openai_compatible",  # v2.x 适配器（当前仅实现此项）
            ),
        )


def apply_migrations(conn: MigrationConnection) -> None:
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
    if not conn.execute(  # AI SEO 快照用竞品对标结构化指标（P-AI-03）；管理端「站点 JSON」可编辑
        "SELECT 1 FROM site_json WHERE content_key = 'ai_insight_competitor_benchmarks' LIMIT 1"
    ).fetchone():  # 旧库升级补行
        conn.execute(  # 默认空 benchmarks，由运营录入 TAAFT 等第三方估算
            "INSERT INTO site_json (content_key, payload_json) VALUES (?, ?)",
            (
                "ai_insight_competitor_benchmarks",  # content_key
                json.dumps(  # 初始结构
                    {
                        "benchmarks": [],  # {label, notes?, metrics?}[]
                        "last_updated": "",  # 运营标注日期 ISO 串
                        "notes": "对标数据为运营手工维护；metrics 内请写来源与是否为估算。",  # 全局说明
                    },
                    ensure_ascii=False,
                ),
            ),
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
                            {"id": "adm-site-submit", "key": "sidebar.siteSubmitForm", "label": "Submit page blocks", "path": "/admin/site-submit", "icon": "ClipboardList", "permission": "", "visible": True, "order": 9},
                            {"id": "adm-site-dash", "key": "sidebar.siteDashboardForm", "label": "Dashboard blocks", "path": "/admin/site-dashboard", "icon": "LayoutTemplate", "permission": "", "visible": True, "order": 10},
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

    _ensure_ai_insight_llm_provider_table(conn)  # 多 LLM 连接表（老库可能尚无）
    _ensure_ai_insight_llm_provider_adapter_column(conn)  # v2.x：老表补 adapter
    _migrate_legacy_ai_insight_provider_settings(conn)  # 旧单行表迁移后 DROP
    _ensure_ai_insight_run_llm_provider_id_column(conn)  # ai_insight_run 补 llm_provider_id
    _ensure_ai_insight_seed(conn)  # AI 分析默认提示词与首条 provider（幂等）
    _upgrade_legacy_ai_insight_prompt_seed(conn)  # 旧版单行种子升级到 Checklist 每日报告预设（仅全文匹配）

    _ensure_ai_insight_seo_task_table(conn)  # AI 报告衍生 SEO 任务表（老库补建）
    _ensure_ai_insight_seo_apply_audit_table(conn)  # SEO 应用审计与回滚（老库补建）
    _ensure_site_json_content_revision_table(conn)  # v2.x：site_json 多版本历史
    _ensure_outbound_click_table(conn)  # 出站官网点击表（老库补建，与 schema 一致）
    _ensure_crawler_columns(conn)  # PROD-CRAWLER：调度与统计列（老库 ALTER）
    _ensure_admin_menu_extras(conn)  # 新后台页入口合并进 admin_settings（幂等）
    _ensure_dashboard_merge(conn)  # site_json.dashboard 缺键时与种子对齐（保留已有内容）


def _ensure_ai_insight_seo_task_table(conn: MigrationConnection) -> None:  # 老库无表时补 ai_insight_seo_task
    if table_column_names(conn, "ai_insight_seo_task"):  # 已有表
        return  # 幂等
    if is_pg_adapter(conn):  # PostgreSQL
        conn.execute(
            """CREATE TABLE IF NOT EXISTS ai_insight_seo_task (
                id SERIAL PRIMARY KEY,
                source_run_id INTEGER NOT NULL REFERENCES ai_insight_run(id) ON DELETE CASCADE,
                kind TEXT NOT NULL DEFAULT 'page_seo_patch',
                title TEXT NOT NULL DEFAULT '',
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                approved_by_admin_user_id INTEGER REFERENCES app_user(id),
                approved_at TEXT,
                applied_at TEXT,
                error_message TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
                updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
            )"""
        )
    else:  # SQLite
        conn.execute(
            """CREATE TABLE IF NOT EXISTS ai_insight_seo_task (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_run_id INTEGER NOT NULL REFERENCES ai_insight_run(id) ON DELETE CASCADE,
                kind TEXT NOT NULL DEFAULT 'page_seo_patch',
                title TEXT NOT NULL DEFAULT '',
                payload_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                approved_by_admin_user_id INTEGER REFERENCES app_user(id),
                approved_at TEXT,
                applied_at TEXT,
                error_message TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )"""
        )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_seo_task_run ON ai_insight_seo_task(source_run_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_seo_task_status ON ai_insight_seo_task(status)")


def _ensure_ai_insight_seo_apply_audit_table(conn: MigrationConnection) -> None:  # 老库无表时补 SEO 应用审计
    if table_column_names(conn, "ai_insight_seo_apply_audit"):  # 已有表
        return  # 幂等
    if is_pg_adapter(conn):  # PostgreSQL
        conn.execute(
            """CREATE TABLE IF NOT EXISTS ai_insight_seo_apply_audit (
                id SERIAL PRIMARY KEY,
                source_run_id INTEGER NOT NULL,
                task_id INTEGER REFERENCES ai_insight_seo_task(id) ON DELETE SET NULL,
                content_key TEXT NOT NULL,
                before_payload_json TEXT NOT NULL,
                after_payload_json TEXT NOT NULL,
                applied_by_admin_user_id INTEGER REFERENCES app_user(id),
                created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
                rolled_back_at TEXT
            )"""
        )
    else:  # SQLite
        conn.execute(
            """CREATE TABLE IF NOT EXISTS ai_insight_seo_apply_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_run_id INTEGER NOT NULL,
                task_id INTEGER REFERENCES ai_insight_seo_task(id) ON DELETE SET NULL,
                content_key TEXT NOT NULL,
                before_payload_json TEXT NOT NULL,
                after_payload_json TEXT NOT NULL,
                applied_by_admin_user_id INTEGER REFERENCES app_user(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                rolled_back_at TEXT
            )"""
        )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_seo_audit_run ON ai_insight_seo_apply_audit(source_run_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_seo_audit_task ON ai_insight_seo_apply_audit(task_id)")


def _ensure_ai_insight_llm_provider_adapter_column(conn: MigrationConnection) -> None:  # v2.x：老库补 adapter 列
    if not _table_exists(conn, "ai_insight_llm_provider"):  # 尚无连接表
        return  # 由 _ensure_ai_insight_llm_provider_table 全量建
    cols = table_column_names(conn, "ai_insight_llm_provider")  # 当前列
    if "adapter" in cols:  # 已存在
        return  # 幂等
    conn.execute(  # SQLite / PG 通用 DEFAULT
        "ALTER TABLE ai_insight_llm_provider ADD COLUMN adapter TEXT NOT NULL DEFAULT 'openai_compatible'"
    )


def _ensure_site_json_content_revision_table(conn: MigrationConnection) -> None:  # v2.x：site_json 修订史
    if _table_exists(conn, "site_json_content_revision"):  # 表已存在
        return  # 幂等
    if is_pg_adapter(conn):  # PostgreSQL
        conn.execute(
            """CREATE TABLE IF NOT EXISTS site_json_content_revision (
                id SERIAL PRIMARY KEY,
                content_key TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                admin_user_id INTEGER REFERENCES app_user(id),
                source TEXT NOT NULL,
                ref_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
            )"""
        )
    else:  # SQLite
        conn.execute(
            """CREATE TABLE IF NOT EXISTS site_json_content_revision (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_key TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                admin_user_id INTEGER REFERENCES app_user(id),
                source TEXT NOT NULL,
                ref_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )"""
        )
    conn.execute(  # 按键拉时间线
        "CREATE INDEX IF NOT EXISTS idx_site_json_rev_key_id ON site_json_content_revision(content_key, id DESC)"
    )


def _ensure_outbound_click_table(conn: MigrationConnection) -> None:  # 老库无表时补 outbound_click_log
    if table_column_names(conn, "outbound_click_log"):  # 已有表结构
        return  # 幂等跳过
    if is_pg_adapter(conn):  # PostgreSQL 方言
        conn.execute(  # 与 schema.pg.sql 一致
            """CREATE TABLE IF NOT EXISTS outbound_click_log (
                id SERIAL PRIMARY KEY,
                tool_slug TEXT NOT NULL,
                page_path TEXT NOT NULL,
                session_id TEXT NOT NULL,
                user_id INTEGER REFERENCES app_user(id),
                created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
            )"""
        )
    else:  # SQLite
        conn.execute(  # 与 schema.sql 一致
            """CREATE TABLE IF NOT EXISTS outbound_click_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tool_slug TEXT NOT NULL,
                page_path TEXT NOT NULL,
                session_id TEXT NOT NULL,
                user_id INTEGER REFERENCES app_user(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )"""
        )
    conn.execute(  # 按工具与时间查聚合
        "CREATE INDEX IF NOT EXISTS idx_ocl_slug_time ON outbound_click_log(tool_slug, created_at)"
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ocl_time ON outbound_click_log(created_at)")  # 按时间窗扫


def _ensure_crawler_columns(conn: MigrationConnection) -> None:  # 爬虫表增量列
    csrc = table_column_names(conn, "crawler_source")  # 无表时为空集
    if not csrc:  # 尚未建 crawler_source
        return  # 跳过
    if "auto_crawl_enabled" not in csrc:  # 定时总开关
        conn.execute(
            "ALTER TABLE crawler_source ADD COLUMN auto_crawl_enabled INTEGER NOT NULL DEFAULT 0"
        )
    if "crawl_interval_minutes" not in csrc:  # 两次自动抓取最小间隔（分钟）
        conn.execute(
            "ALTER TABLE crawler_source ADD COLUMN crawl_interval_minutes INTEGER NOT NULL DEFAULT 1440"
        )
    if "daily_max_items" not in csrc:  # 自然日内最多处理条数（预览行计）
        conn.execute(
            "ALTER TABLE crawler_source ADD COLUMN daily_max_items INTEGER NOT NULL DEFAULT 1000"
        )
    if "scheduled_max_items_per_run" not in csrc:  # 单次自动任务 max_items 上限
        conn.execute(
            "ALTER TABLE crawler_source ADD COLUMN scheduled_max_items_per_run INTEGER NOT NULL DEFAULT 100"
        )
    if "auto_dry_run" not in csrc:  # 自动任务是否仅预览
        conn.execute("ALTER TABLE crawler_source ADD COLUMN auto_dry_run INTEGER NOT NULL DEFAULT 1")
    if "auto_write_strategy" not in csrc:  # 自动任务写入策略（auto_dry_run=0 时）
        conn.execute(
            "ALTER TABLE crawler_source ADD COLUMN auto_write_strategy TEXT NOT NULL DEFAULT 'insert_only'"
        )
    if "last_auto_run_at" not in csrc:  # 上次自动跑完时间
        conn.execute("ALTER TABLE crawler_source ADD COLUMN last_auto_run_at TEXT")
    if "daily_quota_date" not in csrc:  # 配额归属日 YYYY-MM-DD（服务器本地日）
        conn.execute("ALTER TABLE crawler_source ADD COLUMN daily_quota_date TEXT")
    if "daily_quota_used" not in csrc:  # 当日已消耗条数
        conn.execute(
            "ALTER TABLE crawler_source ADD COLUMN daily_quota_used INTEGER NOT NULL DEFAULT 0"
        )
    cjob = table_column_names(conn, "crawler_job")  # 任务表
    if not cjob:  # 无表
        return  # 跳过
    if "trigger_type" not in cjob:  # manual / scheduled
        conn.execute(
            "ALTER TABLE crawler_job ADD COLUMN trigger_type TEXT NOT NULL DEFAULT 'manual'"
        )
    if "items_processed" not in cjob:  # 本任务预览行数
        conn.execute(
            "ALTER TABLE crawler_job ADD COLUMN items_processed INTEGER NOT NULL DEFAULT 0"
        )
    if "items_committed_insert" not in cjob:  # 入库 insert 数
        conn.execute(
            "ALTER TABLE crawler_job ADD COLUMN items_committed_insert INTEGER NOT NULL DEFAULT 0"
        )
    if "items_committed_update" not in cjob:  # 入库 update 数
        conn.execute(
            "ALTER TABLE crawler_job ADD COLUMN items_committed_update INTEGER NOT NULL DEFAULT 0"
        )
