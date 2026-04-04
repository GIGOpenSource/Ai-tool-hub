# REST API 完整接口文档

本文档与 **`backend/app/main.py`** 挂载方式一致，列出当前仓库内**全部** HTTP 接口的**方法、路径、鉴权、请求与响应要点**。细节实现以源码为准；联调环境说明见下文 §1。

**OpenAPI**：服务运行时访问 **`/docs`**（Swagger UI）、**`/openapi.json`**（机器可读模式）；路径相对 API 根（与 `/api` 并列，属 FastAPI 默认行为）。

| 文档关系 | 说明 |
|----------|------|
| [06-API接口参考.md](./06-API接口参考.md) | 精简清单 + 长说明，日常查阅 |
| **本文（18）** | **完整枚举** + 全路径索引表，发布/对账用 |

---

## 1. 基础约定

### 1.1 Base URL 与前缀

- 所有业务接口统一前缀：**`/api`**。  
- 示例：`https://api.example.com/api/tools`。

### 1.2 客户端如何访问 `/api`

| 客户端 | 配置 |
|--------|------|
| 前台开发 | Vite `vite.config.ts` 将 `/api` 代理到 `DEV_API_PROXY`（默认 `http://127.0.0.1:8000`） |
| 前台生产 | 构建变量 **`VITE_API_BASE`** = 公网 API 根（无尾斜杠）；请求发往 `{VITE_API_BASE}/api/...` |
| 管理端 | **`next.config.mjs`**：`/api/*` rewrite 到 **`API_PROXY_TARGET`** |

### 1.3 鉴权

| 类型 | 要求 |
|------|------|
| **无鉴权** | 不携带 `Authorization` |
| **可选用户** | 可带 `Authorization: Bearer <JWT>`；无 token 时按匿名处理（如 `/api/dashboard-data`） |
| **须登录** | 必须有效 JWT；否则 **401** |
| **管理员** | JWT 内 **`role` = `admin`**；否则 **403** |

### 1.4 通用响应

- 除 **`GET /api/seo/sitemap.xml`**（`application/xml`）、**`GET /api/seo/robots.txt`**（`text/plain`）、**`GET /api/admin/translations/export`**（`format=ndjson` 时为 `application/x-ndjson`）外，成功响应多为 **`application/json`**。
- 错误体多为 FastAPI 默认 JSON：`{"detail": ...}` 或业务约定的 `detail` 字符串/对象（以各路由 `HTTPException` 为准）。
- 校验失败常见 **422**，带 `loc` / `msg` 字段（Pydantic）。

### 1.5 Cookie 与埋点

- **`POST /api/track`** 可设置/复用 Cookie **`track_sid`**；若前端 `credentials: "include"`，须保证 CORS **`ALLOWED_ORIGINS`** 与浏览器 Origin 一致且允许凭据。

---

## 2. 全端点索引（按路径排序）

下表为**快速检索**；详细说明见 §3～§5。

| 方法 | 路径 | 鉴权 |
|------|------|------|
| GET | `/api/admin/ai-insights/configs` | 管理员 |
| POST | `/api/admin/ai-insights/configs` | 管理员 |
| PUT | `/api/admin/ai-insights/configs/{config_id}` | 管理员 |
| DELETE | `/api/admin/ai-insights/configs/{config_id}` | 管理员 |
| GET | `/api/admin/ai-insights/providers` | 管理员 |
| POST | `/api/admin/ai-insights/providers` | 管理员 |
| PUT | `/api/admin/ai-insights/providers/{provider_id}` | 管理员 |
| DELETE | `/api/admin/ai-insights/providers/{provider_id}` | 管理员 |
| POST | `/api/admin/ai-insights/run` | 管理员 |
| GET | `/api/admin/ai-insights/runs` | 管理员 |
| GET | `/api/admin/ai-insights/runs/{run_id}` | 管理员 |
| DELETE | `/api/admin/ai-insights/runs/{run_id}` | 管理员 |
| GET | `/api/admin/analytics/pages` | 管理员 |
| GET | `/api/admin/comparison-pages` | 管理员 |
| GET | `/api/admin/comparison-pages/{slug}` | 管理员 |
| PUT | `/api/admin/comparison-pages/{slug}` | 管理员 |
| GET | `/api/admin/crawler/stats` | 管理员 |
| GET | `/api/admin/crawler/sources` | 管理员 |
| POST | `/api/admin/crawler/sources` | 管理员 |
| PUT | `/api/admin/crawler/sources/{source_id}` | 管理员 |
| DELETE | `/api/admin/crawler/sources/{source_id}` | 管理员 |
| GET | `/api/admin/crawler/jobs` | 管理员 |
| POST | `/api/admin/crawler/jobs` | 管理员 |
| GET | `/api/admin/crawler/jobs/{job_id}` | 管理员 |
| GET | `/api/admin/crawler/jobs/{job_id}/preview` | 管理员 |
| POST | `/api/admin/crawler/jobs/{job_id}/commit` | 管理员 |
| GET | `/api/admin/dashboard/summary` | 管理员 |
| GET | `/api/admin/dashboard/trend` | 管理员 |
| GET | `/api/admin/monetization/orders` | 管理员 |
| PATCH | `/api/admin/monetization/orders/{order_id}` | 管理员 |
| GET | `/api/admin/monetization/summary` | 管理员 |
| GET | `/api/admin/page-seo` | 管理员 |
| PUT | `/api/admin/page-seo` | 管理员 |
| GET | `/api/admin/reviews` | 管理员 |
| PATCH | `/api/admin/reviews/{review_id}/status` | 管理员 |
| DELETE | `/api/admin/reviews/{review_id}` | 管理员 |
| GET | `/api/admin/search-suggestions` | 管理员 |
| POST | `/api/admin/search-suggestions` | 管理员 |
| PUT | `/api/admin/search-suggestions` | 管理员 |
| DELETE | `/api/admin/search-suggestions` | 管理员 |
| GET | `/api/admin/settings` | 管理员 |
| PUT | `/api/admin/settings` | 管理员 |
| GET | `/api/admin/site-json/{key}` | 管理员 |
| PUT | `/api/admin/site-json/{key}` | 管理员 |
| GET | `/api/admin/tools` | 管理员 |
| PATCH | `/api/admin/tools/{tool_id}` | 管理员 |
| PATCH | `/api/admin/tools/{tool_id}/featured` | 管理员 |
| PATCH | `/api/admin/tools/{tool_id}/status` | 管理员 |
| GET | `/api/admin/tools/{tool_id}/review-detail` | 管理员 |
| GET | `/api/admin/translations` | 管理员 |
| PUT | `/api/admin/translations` | 管理员 |
| DELETE | `/api/admin/translations` | 管理员 |
| GET | `/api/admin/translations/export` | 管理员 |
| POST | `/api/admin/translations/import` | 管理员 |
| GET | `/api/admin/users` | 管理员 |
| PATCH | `/api/admin/users/{user_id}/ban` | 管理员 |
| PATCH | `/api/admin/users/{user_id}/role` | 管理员 |
| POST | `/api/admin/users/{user_id}/send-email` | 管理员 |
| POST | `/api/auth/login` | 无 |
| POST | `/api/auth/signup` | 无 |
| GET | `/api/categories` | 无 |
| GET | `/api/comparisons/{slug}` | 无 |
| GET | `/api/dashboard-data` | 可选用户 |
| GET | `/api/health` | 无 |
| GET | `/api/i18n/{locale}` | 无 |
| GET | `/api/locales` | 无 |
| GET | `/api/me` | 登录 |
| PUT | `/api/me/profile` | 登录 |
| GET | `/api/me/activity` | 登录 |
| GET | `/api/me/favorites` | 登录 |
| GET | `/api/me/favorites/check` | 登录 |
| POST | `/api/me/favorites` | 登录 |
| DELETE | `/api/me/favorites/{slug}` | 登录 |
| GET | `/api/me/orders` | 登录 |
| GET | `/api/me/orders/{order_id}` | 登录 |
| GET | `/api/me/settings` | 登录 |
| PUT | `/api/me/settings` | 登录 |
| GET | `/api/search-suggestions` | 无 |
| GET | `/api/seo/robots.txt` | 无 |
| GET | `/api/seo/sitemap.xml` | 无 |
| GET | `/api/site/frontend_nav` | 无 |
| GET | `/api/site/{key}` | 无 |
| GET | `/api/submit-options` | 无 |
| POST | `/api/submissions/tool` | 登录 |
| POST | `/api/track` | 可选 |
| POST | `/api/track/outbound` | 可选 |
| GET | `/api/tools` | 无 |
| GET | `/api/tools/{slug}/detail` | 无 |

**端点总数（上表）**：**88** 条（含同路径多方法分别计数；与 `backend/app/routers` 当前注册一致）。

---

## 3. 健康与公开接口

### 3.1 `GET /api/health`

- **鉴权**：无。  
- **响应示例字段**：`status`（`ok`）、`api_version`（与 OpenAPI 版本一致，可由 **`APP_VERSION`** 覆盖）、`database_backend`（`sqlite` | `postgresql`）、`build`（可选 `git_sha`、`build_id`，来自 **`GIT_SHA`/`GITHUB_SHA`、`BUILD_ID`**）。  
- **用途**：负载均衡探活、发布版本对账。

### 3.2 认证 `auth.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| POST | `/api/auth/login` | `{ "email", "password" }` | 200：用户字段 + `access_token`、`token_type`；401 `invalid`；403 `banned` |
| POST | `/api/auth/signup` | `{ "email", "password", "name" }` | 200 同登录；400 `email_exists` |

### 3.3 工具与目录 `tools.py` / `catalog.py`

| 方法 | 路径 | 查询参数 | 说明 |
|------|------|----------|------|
| GET | `/api/tools` | `locale`（默认 `en`） | 已上架工具列表 |
| GET | `/api/tools/{slug}/detail` | `locale` | 详情；含 **`promotion_active`**（弱曝光） |
| GET | `/api/categories` | `locale` | 分类列表 |
| GET | `/api/search-suggestions` | — | 字符串数组（公开联想词） |
| GET | `/api/submit-options` | `locale` | 提交表单元数据：`categories`、`pricing_options`、`ui` |

### 3.4 站点块 `site.py`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/site/frontend_nav` | 无 | 从 `admin_settings.frontend_menu_items` 解析主导航项 |
| GET | `/api/site/{key}` | 无 | `site_json.content_key`；缺失 **404** `not_found` |
| GET | `/api/dashboard-data` | **可选 JWT** | `locale`（默认 `en`）；无登录返回 `dashboard` 静态壳；有登录则合并「我的工具」与埋点摘要 |

### 3.5 SEO 公开 `seo_public.py`

| 方法 | 路径 | 响应类型 | 说明 |
|------|------|----------|------|
| GET | `/api/seo/sitemap.xml` | XML | 根 URL：**`PUBLIC_SITE_URL`**；静态 path 来自 `seo_sitemap_static` 或常量；动态含已上架 `tool` 与 `comparison_page` |
| GET | `/api/seo/robots.txt` | text | 默认 Allow 与 Sitemap；可被 `site_json.seo_robots` 覆盖 |

### 3.6 国际化 `i18n.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/i18n/{locale}` | 该语言文案键值对 |
| GET | `/api/locales` | `[{ code, label, flag }, ...]` |

### 3.7 对比页 `comparisons.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/comparisons/{slug}` | 对比 JSON；404 `not_found`；含 **`promotion_active`**（按展示名匹配工具） |

### 3.8 埋点 `track.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| POST | `/api/track` | `{ "page_path", "previous_path?", "dwell_seconds?" }` | 写 `page_view_log`；Cookie `track_sid` |
| POST | `/api/track/outbound` | `{ "tool_slug", "page_path" }` | 工具详情「访问官网」意向；写 `outbound_click_log`；仅 **`moderation_status=active`** 的 slug 落库；复用 **`track_sid`** |

---

## 4. 用户接口（须登录，Bearer JWT）

### 4.1 资料与设置 `user_profile.py` / `user_settings.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| GET | `/api/me` | — | 当前用户展示字段 |
| PUT | `/api/me/profile` | `{ "display_name", "avatar_emoji", "bio" }` | 更新展示信息 |
| GET | `/api/me/settings` | — | 读取 `settings_json` |
| PUT | `/api/me/settings` | `{ "payload": { ... } }` | 整体覆盖偏好 |

### 4.2 收藏 `user_favorites.py`

| 方法 | 路径 | 参数/体 | 说明 |
|------|------|---------|------|
| GET | `/api/me/favorites/check` | Query **`slug`** | `{ "favorited": bool }` |
| GET | `/api/me/favorites` | Query `locale`（默认 `en`） | 与站点收藏块同形；仅上架工具 |
| POST | `/api/me/favorites` | `{ "slug" }` | 幂等；404 `tool_not_found` |
| DELETE | `/api/me/favorites/{slug}` | — | 取消收藏 |

### 4.3 个人动态 `user_activity.py`

| 方法 | 路径 | 查询参数 | 说明 |
|------|------|----------|------|
| GET | `/api/me/activity` | `locale`（默认 `en`） | `activity`、`stats`；与 `site_json.profile` 展示形态对齐 |

### 4.4 推广订单 `user_orders.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/me/orders` | `{ "items": [...] }` |
| GET | `/api/me/orders/{order_id}` | 单笔；非本人或不存在 **404** `not_found`（防枚举） |

### 4.5 提交工具 `submissions.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| POST | `/api/submissions/tool` | `name`, `website`, `description`, `category_slug`, `long_description?`, `pricing?`, `features?`（多行文本） | **须登录**；401 `login_required`；400 `invalid_name` / `invalid_category`；成功 `{ "success", "slug" }`；工具为 **`pending`** |

---

## 5. 管理端接口（须管理员 JWT）

以下路径均在 **`/api/admin`** 下（爬虫子模块为 **`/api/admin/crawler`**，AI 为 **`/api/admin/ai-insights`**）。

### 5.1 大盘 `admin_dashboard.py`

| 方法 | 路径 | 查询参数 | 说明 |
|------|------|----------|------|
| GET | `/api/admin/dashboard/summary` | — | 汇总指标 |
| GET | `/api/admin/dashboard/trend` | **`days`**：`7` \| `30` \| `90`；或 **`start_date` + `end_date`**（`YYYY-MM-DD`） | `{ "data": [...] }`；非法日期退回 `days`；区间最长约 366 天 |

### 5.2 分析 `admin_analytics.py`

| 方法 | 路径 | 查询参数 | 说明 |
|------|------|----------|------|
| GET | `/api/admin/analytics/pages` | `start_date`、`end_date`、`sort_by`=`pv`\|`uv`\|`uid` | 分页/页面流量行数据 |

### 5.3 AI SEO `admin_ai_insights.py`（前缀 `/api/admin/ai-insights`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/configs` | 提示词配置列表 |
| POST | `/configs` | body：`name`、`system_prompt`、`user_prompt_template`、`is_default?` |
| PUT | `/configs/{config_id}` | 部分更新 |
| DELETE | `/configs/{config_id}` | 删除 |
| GET | `/providers` | 连接列表（**不回显 api_key**） |
| POST | `/providers` | 新建连接：`name`、`base_url`、`model`、`timeout_sec`、`temperature`、`extra_headers_json`、`api_key?`、`api_key_env_name?`、`is_default?` |
| PUT | `/providers/{provider_id}` | 更新；`is_default: true` 时清其他默认 |
| DELETE | `/providers/{provider_id}` | 至少保留一条；删默认则自动指定最小 id 为默认 |
| POST | `/run` | body：`config_id?`、`provider_id?`；**400** `missing_api_key`；**404** `provider_not_found`；**429** `rate_limited_ai_insight`；**502** 供应商错误 |
| GET | `/runs` | `limit`、`offset` |
| GET | `/runs/{run_id}` | 详情含快照 JSON |
| DELETE | `/runs/{run_id}` | 删除记录 |

全局密钥：**`AI_INSIGHT_LLM_API_KEY`** 优先于库内配置。详见 [12-需求-AI-SEO与流量分析助手.md](./12-需求-AI-SEO与流量分析助手.md)。

### 5.4 工具审核 `admin_tools.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| GET | `/api/admin/tools` | Query **`tab`**：`all`\|`pending`\|`active`\|`rejected` | `{ "data": [...] }` 含流量摘要字段 |
| PATCH | `/api/admin/tools/{tool_id}/status` | `status`（`ACTIVE`/`APPROVED`→active，`REJECTED`→rejected）、`reject_reason?` | 400 `invalid_status` / `invalid_reason`；404 `not_found` |
| PATCH | `/api/admin/tools/{tool_id}/featured` | `{ "featured": bool }` | 404 `not_found` |
| PATCH | `/api/admin/tools/{tool_id}` | 可选字段：`name`、`description`、`tagline`、`long_description`、`website_url`、`pricing_type`、`icon_emoji`、`category_slug` | **不改 slug**；至少一项；400 `empty_name` / `invalid_category`；无变更可返回 `no_changes` |
| GET | `/api/admin/tools/{tool_id}/review-detail` | — | 审核用完整详情 |

### 5.5 用户 `admin_users.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| GET | `/api/admin/users` | — | 列表与统计 |
| PATCH | `/api/admin/users/{user_id}/role` | `{ "role": "user"\|"developer"\|"admin" }` | |
| PATCH | `/api/admin/users/{user_id}/ban` | `{ "banned": bool }` | |
| POST | `/api/admin/users/{user_id}/send-email` | **无请求体** | 未配 **`SMTP_HOST`+`SMTP_FROM`** 时返回 **`stub: true`** 与说明文案；成功真实发送时 **`stub: false`**、**`sent_to`**；**502** `smtp_failed:...` |

### 5.6 评论 `admin_reviews.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| GET | `/api/admin/reviews` | — | 列表 |
| PATCH | `/api/admin/reviews/{review_id}/status` | `{ "ugc_status": "published"\|"reported"\|"hidden" }` | 400 `invalid_status` |
| DELETE | `/api/admin/reviews/{review_id}` | — | 物理删除 |

### 5.7 商业化 `admin_monetization.py`

| 方法 | 路径 | 查询/体 | 说明 |
|------|------|---------|------|
| GET | `/api/admin/monetization/summary` | — | `total_orders`、`by_status`、`revenue_paid_usd`、`active_promotions` |
| GET | `/api/admin/monetization/orders` | Query **`status`**：过滤支付状态；`all` 或空为全表；非法值忽略 | `{ "data": [...] }` |
| PATCH | `/api/admin/monetization/orders/{order_id}` | `payment_status?`、`valid_until?`（`YYYY-MM-DD`）；**至少一项** | 400 `no updatable fields` / `invalid payment_status` / `invalid valid_until`；404 `order not found`；200 `{ "ok": true }` |

支付状态枚举：`pending`、`paid`、`refunded`、`cancelled`。

### 5.8 系统设置 `admin_settings.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| GET | `/api/admin/settings` | — | `{ "payload": object }` → `site_json.admin_settings` |
| PUT | `/api/admin/settings` | `{ "payload": object }` | 整体覆盖 |

### 5.9 页面 SEO `admin_page_seo.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| GET | `/api/admin/page-seo` | — | `paths`、`path_labels`、`entries`（path → 允许字段集，见源码 `_ALLOWED_ENTRY_KEYS`） |
| PUT | `/api/admin/page-seo` | `{ "entries": { "<path>": { ... } } }` | 归一 path、剔除空字段；200 `{ "success", "count" }` |

### 5.10 站点 JSON 白名单 `admin_site_json.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/site-json/{key}` | **404** `unknown_key` 若 key 不在白名单；无行时 `{ "payload": {}, "exists": false }` |
| PUT | `/api/admin/site-json/{key}` | body：`{ "payload": { ... } }`；经 **`validate_site_json_for_key`** 校验 |

**允许的 `key`**：`home_seo`、`ui_toasts`、`guide`、`more`、`sitemap`、`profile`、`favorites`、`compare_interactive`、`submit`、`not_found`、`dashboard`、`seo_sitemap_static`、`seo_robots`、`seo_tool_json_ld`。  
（**不含** `page_seo`、`admin_settings`，二者有专用接口。）

### 5.11 翻译 `admin_translations.py`

| 方法 | 路径 | 参数/体 | 说明 |
|------|------|---------|------|
| GET | `/api/admin/translations` | Query **`locale`** 可选 | 无 locale：最多 8000 行；有 locale：该语言全量 |
| PUT | `/api/admin/translations` | `{ "locale", "msg_key", "msg_value" }` | upsert |
| DELETE | `/api/admin/translations` | Query **`locale` + `msg_key`** | |
| GET | `/api/admin/translations/export` | Query **`locale`** 可选；**`format`**=`json`\|`ndjson` | `ndjson` 返回 **纯文本**流 |
| POST | `/api/admin/translations/import` | `{ "items": [ { locale, msg_key, msg_value }, ... ] }`；Query **`replace_locale`** 可选 | 批量 upsert；单次 ≤20000 行；**400** `import_too_many` |

### 5.12 搜索联想词 `admin_search_suggestions.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/search-suggestions` | `{ "items": [...] }` |
| POST | `/api/admin/search-suggestions` | `{ "text", "sort_order"? }`；**409** `duplicate_text` |
| PUT | `/api/admin/search-suggestions` | `{ "id", "text"?, "sort_order"? }`；**404** / **409** |
| DELETE | `/api/admin/search-suggestions` | Query **`id`** |

### 5.13 对比页 `admin_comparison_pages.py`

| 方法 | 路径 | 请求体 | 说明 |
|------|------|--------|------|
| GET | `/api/admin/comparison-pages` | — | `{ "slugs": [ ... ] }` |
| GET | `/api/admin/comparison-pages/{slug}` | — | `{ "slug", "payload" }`；404 `not_found` |
| PUT | `/api/admin/comparison-pages/{slug}` | `{ "payload": { ... } }` | **`validate_comparison_payload`**；400 结构错误 |

### 5.14 内容爬虫 `admin_crawler.py`（前缀 `/api/admin/crawler`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/stats` | 历史任务汇总统计 |
| GET | `/sources` | 数据源列表（含定时与配额字段） |
| POST | `/sources` | body：见 **`CrawlerSourceCreate`**（`name`、`feed_url`、`config_json`、定时相关等） |
| PUT | `/sources/{source_id}` | body：**`CrawlerSourcePatch`**，至少一项 |
| DELETE | `/sources/{source_id}` | 级联删任务 |
| GET | `/jobs` | Query **`limit`**（默认 50） |
| POST | `/jobs` | `{ "source_id", "dry_run"?, "write_strategy"?, "max_items"? }`；同步执行 |
| GET | `/jobs/{job_id}` | 含 `log_text`、`summary` |
| GET | `/jobs/{job_id}/preview` | Query **`offset`/`limit`** |
| POST | `/jobs/{job_id}/commit` | 仅 **`preview_ready`** → 入库；**400** 状态不符 |

**写入策略枚举**：`insert_only`、`update_empty`、`overwrite`。  
**定时任务**：进程内每分钟巡检；**`CRAWLER_SCHEDULER_ENABLED`**=`0`/`false`/`off` 关闭。详见 [13-需求-内容爬虫与后台操作.md](./13-需求-内容爬虫与后台操作.md)。

---

## 6. 演示账号与安全（生产禁用默认口令）

| 邮箱 | 默认密码 | 角色 |
|------|----------|------|
| <admin@example.com> | admin123 | admin |
| <demo@example.com> | demo | user |

生产：**`ENVIRONMENT=production`** + 强 **`JWT_SECRET`**；修改默认密码。见 [04-P0安全与联调备忘.md](./04-P0安全与联调备忘.md)、[16-部署与发布完整说明书.md](./16-部署与发布完整说明书.md)。

---

## 7. 自检脚本

```bash
BASE_URL=https://你的API根 ./backend/scripts/publish_smoke.sh
```

见 [09-上线发布验收清单.md](./09-上线发布验收清单.md) §2.3。

---

## 8. 修订记录（维护说明）

- 新增或删除路由时：**同步更新本文 §2 索引表与对应分节**，并检查 [06](./06-API接口参考.md) 是否需要摘要更新。
- 路由注册顺序敏感点：`GET /api/site/frontend_nav` 须先于 **`GET /api/site/{key}`**（见 `site.py`）。

---

*生成基准：仓库 `backend/app/routers/*.py` 与 `main.py`；若与运行实例不一致，以部署版本为准。*
