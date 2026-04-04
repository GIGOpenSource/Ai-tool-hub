# REST API 接口清单（FastAPI，统一前缀 `/api`）

**完整版（全路径索引 + 分节详表）**：[**18-REST-API完整接口文档.md**](./18-REST-API完整接口文档.md) — 与 `backend/app/routers` 逐项对齐，发布对账请以 **18** 为准。

## 联调说明

| 客户端 | 如何将 `/api` 转到后端 |
|--------|------------------------|
| 前台 Vite 开发 | `vite.config.ts` 代理到 `DEV_API_PROXY`（默认 `http://127.0.0.1:8000`） |
| 前台生产 | 设置 `VITE_API_BASE=https://你的API域名`（无尾斜杠），与后端 `ALLOWED_ORIGINS` 对齐 |
| 管理后台 Next | `next.config.mjs` rewrites：`API_PROXY_TARGET`（默认 `http://127.0.0.1:8000`） |

## 通用约定

- 除特殊说明外，响应为 JSON。
- 需登录用户的接口：`Authorization: Bearer <JWT>`。
- 管理员接口：JWT 内 `role` 必须为 `admin`。
- 部分接口使用 `credentials: "include"` 以接收埋点 Cookie `track_sid`。

---

## 健康检查 `health_release.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 无鉴权；`status`、`api_version`、`database_backend`、可选 `build.git_sha` / `build.build_id`（见 [16-部署与发布完整说明书.md](./16-部署与发布完整说明书.md)） |

---

## 认证 `app/routers/auth.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| POST | `/api/auth/login` | `{ "email", "password" }` | 成功返回用户信息 + `access_token`、`token_type`；401 `invalid`；403 `banned` |
| POST | `/api/auth/signup` | `{ "email", "password", "name" }` | 成功同上；400 `email_exists` |

---

## 工具与目录 `tools.py` / `catalog.py`

| 方法 | 路径 | 查询/参数 | 说明 |
|------|------|-----------|------|
| GET | `/api/tools` | `locale` 默认 `en` | 已上架工具列表（`moderation_status=active`） |
| GET | `/api/tools/{slug}/detail` | `locale` | 详情含特性、截图、定价方案、评论、替代工具、`messages`；**`promotion_active`**（bool）：存在 `paid` 且在约的 `monetization_order` 时为 `true`（弱曝光合规标） |
| GET | `/api/categories` | `locale` | 分类列表 |
| GET | `/api/search-suggestions` | — | 字符串数组 |
| GET | `/api/submit-options` | `locale` | 提交表单元数据：`categories`、`pricing_options`、`ui` |

---

## 站点块与仪表盘 `site.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/site/{key}` | `site_json.content_key`，如 `home_seo`、`profile`、`favorites` 等；404 `not_found` |
| GET | `/api/site/frontend_nav` | 从 `admin_settings.frontend_menu_items` 解析主导航；空数组时前台用默认 |
| GET | `/api/dashboard-data` | `site_json` 中 `dashboard` 块 |

前台实际调用的 `key` 示例（需在种子数据中存在）：`home_seo`（常用字段 **`keywords`**、**`brand_title`** 顶栏名）、`ui_toasts`、`profile`、`favorites`、`compare_interactive`、`sitemap`、`more`、`guide`、`not_found` 等。

---

## 公开爬虫文件 `seo_public.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/seo/sitemap.xml` | **application/xml**。根 URL 来自环境变量 **`PUBLIC_SITE_URL`**（无则开发默认 `http://127.0.0.1:5173`）。**静态** `<url>` 来自 **`site_json.seo_sitemap_static.urls`**，无效则后端常量；**动态** 为已上架 **`tool`**、**`comparison_page`** 全表 slug；**`<loc>`** 等已 XML 转义；工具 URL 在 **`created_at`** 可取 `YYYY-MM-DD` 时带 **`<lastmod>`**。 |
| GET | `/api/seo/robots.txt` | **text/plain**。默认 `Allow: /` 与 **`Sitemap: {PUBLIC_SITE_URL}/api/seo/sitemap.xml`**。若 **`site_json.seo_robots.raw_body`** 为非空字符串，则**整文件**为该内容；否则可读 **`sitemap_url`** / **`sitemap_urls`** / **`disallow_paths`**（见 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) §2.2）。 |

管理端在 **站点 JSON** 中维护 **`seo_sitemap_static`**、**`seo_robots`**（**`GET/PUT /api/admin/site-json/{key}`** 白名单）。

---

## 国际化 `i18n.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/i18n/{locale}` | 该语言文案键值对 |
| GET | `/api/locales` | `[{ code, label, flag }]` |

---

## 对比页 SEO `comparisons.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/comparisons/{slug}` | `comparison_page` 表；404 `not_found`；响应内 **`mainTool` / `alternatives[]`** 可含 **`promotion_active`**（按工具**展示名**匹配 `tool.name` 后查订单，名不一致则无标） |

---

## 埋点 `track.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| POST | `/api/track` | `{ page_path, previous_path?, dwell_seconds? }` | 可选 Bearer；设置/复用 Cookie `track_sid`；写 `page_view_log` |
| POST | `/api/track/outbound` | `{ tool_slug, page_path }` | 可选 Bearer；复用 `track_sid`；工具详情「访问官网」写 `outbound_click_log`（仅已上架 slug） |

---

## 当前用户（需登录 JWT）`user_profile.py` / `user_settings.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| GET | `/api/me` | — | 与登录响应一致的用户展示字段（`id`、`email`、`name`、`avatar`、`bio`、`role`） |
| PUT | `/api/me/profile` | `{ "display_name", "avatar_emoji", "bio" }` | 更新 `app_user` 展示字段 |
| GET | `/api/me/settings` | — | `settings_json` 偏好 |
| PUT | `/api/me/settings` | `{ "payload": { ... } }` | 覆盖偏好（与前台 Settings 页结构一致） |

### 收藏 `user_favorites.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/me/favorites` | 查询参数 `locale`（默认 `en`）；响应与 **`/api/site/favorites`** 同形：`breadcrumb_label`、`items`、`filter_categories`（仅 **`moderation_status=active`** 工具） |
| GET | `/api/me/favorites/check` | 查询参数 **`slug`**；`{ "favorited": bool }` |
| POST | `/api/me/favorites` | body `{"slug":"工具 slug"}`；`INSERT OR IGNORE` 幂等；工具不存在或非正常上架 → 404 `tool_not_found` |
| DELETE | `/api/me/favorites/{slug}` | 取消收藏 |

### 个人动态 `user_activity.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/me/activity` | 查询参数 **`locale`**（默认 `en`）；`{ "activity": [...], "stats": [...] }`——与 **`site_json.profile`** 同形；**activity** 来自 **`user_favorite` / `tool.submitted_by_user_id` / `review.reviewer_user_id`** |

### 推广订单 `user_orders.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/me/orders` | `{ "items": [...] }`；每项含 `id`、`tool_id`、`tool_name`、`tool_slug`、`amount_cents`、`payment_status`、`valid_from`、`valid_until`、`extra_pv`/`uv`/`uid`、`created_at` |
| GET | `/api/me/orders/{order_id}` | 同上字段的单对象；非本人或无记录 → **404** `not_found` |

---

## 用户提交工具 `submissions.py`

| 方法 | 路径 | 鉴权 | 请求体 | 说明 |
|------|------|------|--------|------|
| POST | `/api/submissions/tool` | 必须登录（Bearer） | `name, website, description, category_slug, pricing?, long_description?, features?` | 401 `login_required`；工具 `moderation_status=pending` |

---

## 管理后台（均需管理员 JWT）

### 大盘 `admin_dashboard.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/dashboard/summary` | 汇总指标 |
| GET | `/api/admin/dashboard/trend` | `days`: 7 \| 30 \| 90；或 **`start_date`+`end_date`**（`YYYY-MM-DD`）自定义区间（上限约 366 天）；`{ data: [...] }` |

### 分析 `admin_analytics.py`

| 方法 | 路径 | 查询参数 | 说明 |
|------|------|----------|------|
| GET | `/api/admin/analytics/pages` | `start_date`、`end_date`（YYYY-MM-DD）、`sort_by`=`pv`\|`uv`\|`uid` | 页面流量行数据 |

### AI SEO / 流量分析 `admin_ai_insights.py`（PROD-AI-SEO）

服务端组装 **page_seo / home_seo / sitemap·robots 摘要** 与 **近 7 日流量聚合**，与可配置提示词一并调用 **OpenAI 兼容** `POST {base}/v1/chat/completions`；可维护**多条**连接（表 **`ai_insight_llm_provider`**），**手动勾选默认启用**；密钥优先 **`AI_INSIGHT_LLM_API_KEY`**（全局），其次该行 **`api_key`** 或 **`api_key_env_name`**。详见 [12-需求-AI-SEO与流量分析助手.md](./12-需求-AI-SEO与流量分析助手.md)。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/ai-insights/configs` | 提示词配置列表 |
| POST | `/api/admin/ai-insights/configs` | body：`name`、`system_prompt`、`user_prompt_template`、`is_default?` |
| PUT | `/api/admin/ai-insights/configs/{id}` | 部分或全部更新同上字段 |
| DELETE | `/api/admin/ai-insights/configs/{id}` | 删除配置 |
| GET | `/api/admin/ai-insights/providers` | 多条模型连接列表（**无 api_key 明文**；`is_default` 表示当前**默认启用**，分析时 `provider_id` 省略则用该条） |
| POST | `/api/admin/ai-insights/providers` | 新建：`name`、`base_url`、`model`、`timeout_sec`、`temperature`、`extra_headers_json`、`api_key_env_name?`、`api_key?`、`is_default?` |
| PUT | `/api/admin/ai-insights/providers/{id}` | 更新同上字段（部分可选）；`is_default: true` 时清除其他连接的默认标记 |
| DELETE | `/api/admin/ai-insights/providers/{id}` | 删除；**400** `last_provider` 至少保留一条；若删的是默认则自动把最小 `id` 设为默认 |
| POST | `/api/admin/ai-insights/run` | body：`config_id?`、`provider_id?`（省略则用 `is_default=1` 的连接）；成功返回 `run_id`、`output_text` 等；**400** `missing_api_key`；**404** `provider_not_found`；**429** `rate_limited_ai_insight`；**502** 供应商错误摘要 |
| GET | `/api/admin/ai-insights/runs` | `limit`、`offset`；分页列表 |
| GET | `/api/admin/ai-insights/runs/{id}` | 详情（全文输出与快照 JSON） |
| DELETE | `/api/admin/ai-insights/runs/{id}` | 删除记录 |

### 工具审核 `admin_tools.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/tools` | `tab`: `all`\|`pending`\|`active`\|`rejected` |
| PATCH | `/api/admin/tools/{tool_id}/status` | body: `status`（`ACTIVE`/`APPROVED`→active，`REJECTED`→rejected）+ `reject_reason` |
| PATCH | `/api/admin/tools/{tool_id}/featured` | `{ "featured": bool }` |
| PATCH | `/api/admin/tools/{tool_id}` | 部分更新：`name`、`description`、`tagline`、`long_description`、`website_url`、`pricing_type`、`icon_emoji`、`category_slug`（**不含 slug**） |
| GET | `/api/admin/tools/{tool_id}/review-detail` | 审核用详情 |

### 用户 `admin_users.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 用户列表与统计 |
| PATCH | `/api/admin/users/{user_id}/role` | `{ "role": "user"\|"developer"\|"admin" }` |
| PATCH | `/api/admin/users/{user_id}/ban` | `{ "banned": bool }` |
| POST | `/api/admin/users/{user_id}/send-email` | **无 body**；配置 **`SMTP_HOST`+`SMTP_FROM`** 时真实发信（`smtplib`）；否则 **`stub: true`**；失败可能 **502 `smtp_failed:...`** |

### 评论 `admin_reviews.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/reviews` | 列表 |
| PATCH | `/api/admin/reviews/{review_id}/status` | `{ "ugc_status": "published"\|"reported"\|"hidden" }` |
| DELETE | `/api/admin/reviews/{review_id}` | 物理删除该条评论 |

### 商业化 `admin_monetization.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/monetization/summary` | 按支付状态汇总、笔数与金额等 |
| GET | `/api/admin/monetization/orders` | 订单列表；支持查询参数按 `payment_status` 过滤 |
| PATCH | `/api/admin/monetization/orders/{order_id}` | body：`payment_status` 与/或 `valid_until`（ISO 日期）；至少一项 |

### 系统设置 `admin_settings.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/settings` | `{ "payload": object }`，存 `site_json.admin_settings` |
| PUT | `/api/admin/settings` | `{ "payload": object }` 整体覆盖 |

### 页面 SEO `admin_page_seo.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/page-seo` | 站内 path 清单、标签、已保存 `entries` |
| PUT | `/api/admin/page-seo` | `{ "entries": { "<path>": { ... } } }`；写入 `site_json.page_seo` |

### 站点 JSON（白名单键）`admin_site_json.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/site-json/{key}` | **404** 若 key 不在白名单；见 [18](./18-REST-API完整接口文档.md) §5.10 |
| PUT | `/api/admin/site-json/{key}` | `{ "payload": object }`；经按 key 的形态校验 |

### 翻译 `admin_translations.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/translations` | Query **`locale`** 可选 |
| PUT | `/api/admin/translations` | 单行 upsert：`locale`、`msg_key`、`msg_value` |
| DELETE | `/api/admin/translations` | Query **`locale`、`msg_key`** |
| GET | `/api/admin/translations/export` | Query **`format`**=`json`\|`ndjson` |
| POST | `/api/admin/translations/import` | 批量 upsert；可选 **`replace_locale`** 先清空该语言 |

### 对比落地页 `admin_comparison_pages.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/comparison-pages` | `{ "slugs": [...] }` |
| GET | `/api/admin/comparison-pages/{slug}` | `{ "slug", "payload" }` |
| PUT | `/api/admin/comparison-pages/{slug}` | `{ "payload": { ... } }` 整包覆盖 |

### 搜索联想词 `admin_search_suggestions.py`

| 方法 | 路径 | 请求体 / 参数 | 说明 |
|------|------|-----------------|------|
| GET | `/api/admin/search-suggestions` | — | `{ "items": [ { "id", "text", "sort_order" } ] }`，与公开 **`GET /api/search-suggestions`** 同源表 |
| POST | `/api/admin/search-suggestions` | `{ "text", "sort_order"? }` | 新增；**409** `duplicate_text` 与 **`text` 唯一**冲突 |
| PUT | `/api/admin/search-suggestions` | `{ "id", "text"?, "sort_order"? }` | 至少改一项；**404** `not_found`；**409** 文案重复 |
| DELETE | `/api/admin/search-suggestions` | 查询参数 **`id`** | **404** 若不存在 |

### 内容爬虫 `admin_crawler.py`（JSON 订阅 / PROD-CRAWLER MVP）

| 方法 | 路径 | 请求体 / 参数 | 说明 |
|------|------|-----------------|------|
| GET | `/api/admin/crawler/stats` | — | 全历史汇总：`total_runs`、`success_runs`、`failed_runs`、`other_runs`、`total_items_processed`、`total_committed_ins`、`total_committed_upd`（来自 `crawler_job` 聚合） |
| GET | `/api/admin/crawler/sources` | — | `{ "data": [ 数据源 ] }`，含定时字段：`auto_crawl_enabled`、`crawl_interval_minutes`、`daily_max_items`、`scheduled_max_items_per_run`、`auto_dry_run`、`auto_write_strategy`、`last_auto_run_at`、`daily_quota_date`、`daily_quota_used` |
| POST | `/api/admin/crawler/sources` | `{ "name", "feed_url", … }` 及可选定时字段 | 新建；`config_json` 见需求文档；默认定时关闭 |
| PUT | `/api/admin/crawler/sources/{id}` | 部分字段（含上述定时键） | 至少一项；**404** `not_found` |
| DELETE | `/api/admin/crawler/sources/{id}` | — | 级联删除关联任务 |
| GET | `/api/admin/crawler/jobs` | 查询 **`limit`**（默认 50） | 最近任务列表 |
| POST | `/api/admin/crawler/jobs` | `{ "source_id", "dry_run"?, "write_strategy"?, "max_items"? }` | **同步**拉取并写预览；`dry_run=true` 时状态 **`preview_ready`**，否则当场 **`commit`** 写入 `tool`（默认 **pending**） |
| GET | `/api/admin/crawler/jobs/{id}` | — | 详情含 `log_text`、`summary` |
| GET | `/api/admin/crawler/jobs/{id}/preview` | **`offset`**、**`limit`** | 预览行分页 |
| POST | `/api/admin/crawler/jobs/{id}/commit` | — | 仅 **`preview_ready`** → 写入业务表；**400** 若状态不对 |

**定时执行**：API 进程 `lifespan` 内 asyncio 任务约每分钟调用 `crawler_scheduler.tick_scheduled_crawls()`；按各数据源 **`crawl_interval_minutes`** 与当日 **`daily_max_items`**（扣减 `daily_quota_used`，按服务器本地日 `daily_quota_date` 重置）创建 **`trigger_type=scheduled`** 的任务。环境变量 **`CRAWLER_SCHEDULER_ENABLED`** 为 `0` / `false` / `off` 时关闭。

**自动化验收**（Dry-run + 统计 + 定时设置 / `tick_scheduled_crawls`）：在 `backend/` 下执行  
`PYTHONPATH=. ./.venv_hb/bin/python scripts/crawler_acceptance.py`（需本机 venv 含依赖；使用临时 SQLite，不污染 `data/app.db`）。

---

## 默认演示账号（`ensure_dev_accounts`）

| 邮箱 | 密码 | 角色 |
|------|------|------|
| <admin@example.com> | admin123 | admin |
| <demo@example.com> | demo | user |

生产环境务必修改密码并更换 `JWT_SECRET`（见 [01-部署指南.md](./01-部署指南.md)）；生产应设 **`ENVIRONMENT=production`** 以启用启动时密钥强校验（`backend/app/env_guard.py`）。

抽样自检可运行 **`backend/scripts/publish_smoke.sh`**（`BASE_URL` 指向 API 根）。

---

**待办汇总**（安全、测试、SEO 缺口等）：见 [03-开放事项总表.md](./03-开放事项总表.md)。
