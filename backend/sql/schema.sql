-- AI 导航平台 — SQLite 结构（Python 使用 sqlite3 执行）
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  i18n_key TEXT NOT NULL UNIQUE,
  icon_key TEXT NOT NULL,
  color_class TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tool (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  long_description TEXT NOT NULL DEFAULT '',
  icon_emoji TEXT NOT NULL DEFAULT '',
  rating REAL NOT NULL DEFAULT 0,
  pricing_type TEXT NOT NULL DEFAULT 'Freemium',
  category_id INTEGER NOT NULL REFERENCES category(id),
  review_count INTEGER NOT NULL DEFAULT 0,
  popularity INTEGER NOT NULL DEFAULT 0,
  website_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tool_feature (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id INTEGER NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tool_screenshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id INTEGER NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tool_pricing_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id INTEGER NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_label TEXT NOT NULL,
  features_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id INTEGER NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '👤',
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  review_date TEXT NOT NULL,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tool_alternative (
  tool_id INTEGER NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
  alternative_tool_id INTEGER NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tool_id, alternative_tool_id)
);

CREATE TABLE IF NOT EXISTS search_suggestion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS translation (
  locale TEXT NOT NULL,
  msg_key TEXT NOT NULL,
  msg_value TEXT NOT NULL,
  PRIMARY KEY (locale, msg_key)
);

CREATE TABLE IF NOT EXISTS comparison_page (
  slug TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_json (
  content_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locale_meta (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  flag_emoji TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS app_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '👤',
  bio TEXT NOT NULL DEFAULT ''
);

-- 登录用户收藏的工具（slug 对齐 tool.slug；与 site_json 演示列表分离）
CREATE TABLE IF NOT EXISTS user_favorite (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  tool_slug TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, tool_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_user ON user_favorite(user_id);

CREATE INDEX IF NOT EXISTS idx_user_favorite_slug ON user_favorite(tool_slug);

CREATE INDEX IF NOT EXISTS idx_tool_category ON tool(category_id);
CREATE INDEX IF NOT EXISTS idx_tool_slug ON tool(slug);
CREATE INDEX IF NOT EXISTS idx_translation_locale ON translation(locale);

-- 埋点与后台统计
CREATE TABLE IF NOT EXISTS page_view_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_path TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id INTEGER REFERENCES app_user(id),
  ip_address TEXT,
  user_agent TEXT,
  dwell_seconds REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pvl_path_time ON page_view_log(page_path, created_at);
CREATE INDEX IF NOT EXISTS idx_pvl_sess_time ON page_view_log(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pvl_user_time ON page_view_log(user_id, created_at);

CREATE TABLE IF NOT EXISTS page_analytics_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  page_path TEXT NOT NULL,
  pv_count INTEGER NOT NULL DEFAULT 0,
  uv_count INTEGER NOT NULL DEFAULT 0,
  uid_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(date, page_path)
);

CREATE TABLE IF NOT EXISTS monetization_order (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id INTEGER NOT NULL REFERENCES tool(id),
  purchaser_user_id INTEGER NOT NULL REFERENCES app_user(id),
  amount_cents INTEGER NOT NULL DEFAULT 9900,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  extra_pv INTEGER NOT NULL DEFAULT 0,
  extra_uv INTEGER NOT NULL DEFAULT 0,
  extra_uid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
