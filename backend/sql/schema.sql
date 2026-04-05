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

-- 工具详情页「访问官网」出站点击（与内容爬虫 crawler_job 无关；供 AI 流量快照看转化意向）
CREATE TABLE IF NOT EXISTS outbound_click_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_slug TEXT NOT NULL,
  page_path TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id INTEGER REFERENCES app_user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ocl_slug_time ON outbound_click_log(tool_slug, created_at);
CREATE INDEX IF NOT EXISTS idx_ocl_time ON outbound_click_log(created_at);

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

-- 管理端 AI SEO/流量分析（PROD-AI-SEO / CP-AI-SEO）
CREATE TABLE IF NOT EXISTS ai_insight_prompt_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_insight_llm_provider (
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
);

CREATE TABLE IF NOT EXISTS ai_insight_run (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL REFERENCES app_user(id),
  prompt_config_id INTEGER REFERENCES ai_insight_prompt_config(id) ON DELETE SET NULL,
  llm_provider_id INTEGER REFERENCES ai_insight_llm_provider(id) ON DELETE SET NULL,
  prompt_snapshot_json TEXT NOT NULL,
  provider_snapshot_json TEXT NOT NULL,
  input_payload_summary TEXT NOT NULL,
  status TEXT NOT NULL,
  output_text TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  tokens_in INTEGER,
  tokens_out INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_insight_run_created ON ai_insight_run(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insight_run_admin ON ai_insight_run(admin_user_id);

CREATE TABLE IF NOT EXISTS ai_insight_seo_task (
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
);

CREATE INDEX IF NOT EXISTS idx_ai_seo_task_run ON ai_insight_seo_task(source_run_id);
CREATE INDEX IF NOT EXISTS idx_ai_seo_task_status ON ai_insight_seo_task(status);

CREATE TABLE IF NOT EXISTS ai_insight_seo_apply_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_run_id INTEGER NOT NULL,
  task_id INTEGER REFERENCES ai_insight_seo_task(id) ON DELETE SET NULL,
  content_key TEXT NOT NULL,
  before_payload_json TEXT NOT NULL,
  after_payload_json TEXT NOT NULL,
  applied_by_admin_user_id INTEGER REFERENCES app_user(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  rolled_back_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_seo_audit_run ON ai_insight_seo_apply_audit(source_run_id);
CREATE INDEX IF NOT EXISTS idx_ai_seo_audit_task ON ai_insight_seo_apply_audit(task_id);

CREATE TABLE IF NOT EXISTS ai_insight_scheduler_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_daily_run_date TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS site_json_content_revision (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  admin_user_id INTEGER REFERENCES app_user(id),
  source TEXT NOT NULL,
  ref_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_site_json_rev_key_id ON site_json_content_revision(content_key, id DESC);

CREATE TABLE IF NOT EXISTS crawler_source (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'json_feed',
  config_json TEXT NOT NULL DEFAULT '{}',
  respect_robots INTEGER NOT NULL DEFAULT 1,
  user_agent TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  auto_crawl_enabled INTEGER NOT NULL DEFAULT 0,
  crawl_interval_minutes INTEGER NOT NULL DEFAULT 1440,
  daily_max_items INTEGER NOT NULL DEFAULT 1000,
  scheduled_max_items_per_run INTEGER NOT NULL DEFAULT 100,
  auto_dry_run INTEGER NOT NULL DEFAULT 1,
  auto_write_strategy TEXT NOT NULL DEFAULT 'insert_only',
  last_auto_run_at TEXT,
  daily_quota_date TEXT,
  daily_quota_used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crawler_job (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES crawler_source(id) ON DELETE CASCADE,
  admin_user_id INTEGER NOT NULL REFERENCES app_user(id),
  dry_run INTEGER NOT NULL DEFAULT 1,
  write_strategy TEXT NOT NULL DEFAULT 'insert_only',
  max_items INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'queued',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_committed_insert INTEGER NOT NULL DEFAULT 0,
  items_committed_update INTEGER NOT NULL DEFAULT 0,
  log_text TEXT NOT NULL DEFAULT '',
  summary_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT NOT NULL DEFAULT '',
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crawler_job_preview (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES crawler_job(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  UNIQUE(job_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_crawler_job_source ON crawler_job(source_id);
CREATE INDEX IF NOT EXISTS idx_crawler_job_created ON crawler_job(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawler_preview_job ON crawler_job_preview(job_id);
