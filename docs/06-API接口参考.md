# REST API 接口清单（FastAPI，统一前缀 `/api`）

**联调说明**

| 客户端 | 如何将 `/api` 转到后端 |
|--------|------------------------|
| 前台 Vite 开发 | `vite.config.ts` 代理到 `DEV_API_PROXY`（默认 `http://127.0.0.1:8000`） |
| 前台生产 | 设置 `VITE_API_BASE=https://你的API域名`（无尾斜杠），与后端 `ALLOWED_ORIGINS` 对齐 |
| 管理后台 Next | `next.config.mjs` rewrites：`API_PROXY_TARGET`（默认 `http://127.0.0.1:8000`） |

**通用约定**

- 除特殊说明外，响应为 JSON。
- 需登录用户的接口：`Authorization: Bearer <JWT>`。
- 管理员接口：JWT 内 `role` 必须为 `admin`。
- 部分接口使用 `credentials: "include"` 以接收埋点 Cookie `track_sid`。

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
| GET | `/api/admin/dashboard/trend` | `days`: 7 \| 30 \| 90，默认 30；`{ data: [...] }` |

### 分析 `admin_analytics.py`

| 方法 | 路径 | 查询参数 | 说明 |
|------|------|----------|------|
| GET | `/api/admin/analytics/pages` | `start_date`、`end_date`（YYYY-MM-DD）、`sort_by`=`pv`\|`uv`\|`uid` | 页面流量行数据 |

### 工具审核 `admin_tools.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/tools` | `tab`: `all`\|`pending`\|`active`\|`rejected` |
| PATCH | `/api/admin/tools/{tool_id}/status` | body: `status`（`ACTIVE`/`APPROVED`→active，`REJECTED`→rejected）+ `reject_reason` |
| PATCH | `/api/admin/tools/{tool_id}/featured` | `{ "featured": bool }` |
| GET | `/api/admin/tools/{tool_id}/review-detail` | 审核用详情 |

### 用户 `admin_users.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 用户列表与统计 |
| PATCH | `/api/admin/users/{user_id}/role` | `{ "role": "user"\|"developer"\|"admin" }` |
| PATCH | `/api/admin/users/{user_id}/ban` | `{ "banned": bool }` |
| POST | `/api/admin/users/{user_id}/send-email` | 配置 **`SMTP_HOST`+`SMTP_FROM`** 时真实发信（`smtplib`）；否则 **`stub: true`**；失败可能 **502 `smtp_failed:...`** |

### 评论 `admin_reviews.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/reviews` | 列表 |
| PATCH | `/api/admin/reviews/{review_id}/status` | `{ "ugc_status": "published"\|"reported"\|"hidden" }` |

### 商业化 `admin_monetization.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/monetization/orders` | 订单列表 |

### 系统设置 `admin_settings.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/settings` | `{ "payload": object }`，存 `site_json.admin_settings` |
| PUT | `/api/admin/settings` | `{ "payload": object }` 整体覆盖 |

### 搜索联想词 `admin_search_suggestions.py`

| 方法 | 路径 | 请求体 / 参数 | 说明 |
|------|------|-----------------|------|
| GET | `/api/admin/search-suggestions` | — | `{ "items": [ { "id", "text", "sort_order" } ] }`，与公开 **`GET /api/search-suggestions`** 同源表 |
| POST | `/api/admin/search-suggestions` | `{ "text", "sort_order"? }` | 新增；**409** `duplicate_text` 与 **`text` 唯一**冲突 |
| PUT | `/api/admin/search-suggestions` | `{ "id", "text"?, "sort_order"? }` | 至少改一项；**404** `not_found`；**409** 文案重复 |
| DELETE | `/api/admin/search-suggestions` | 查询参数 **`id`** | **404** 若不存在 |

---

## 默认演示账号（`ensure_dev_accounts`）

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@example.com | admin123 | admin |
| demo@example.com | demo | user |

生产环境务必修改密码并更换 `JWT_SECRET`（见 [01-部署指南.md](./01-部署指南.md)）；生产应设 **`ENVIRONMENT=production`** 以启用启动时密钥强校验（`backend/app/env_guard.py`）。

抽样自检可运行 **`backend/scripts/publish_smoke.sh`**（`BASE_URL` 指向 API 根）。

---

**待办汇总**（安全、测试、SEO 缺口等）：见 [03-开放事项总表.md](./03-开放事项总表.md)。
