# 后台管理面板 ↔ 前台展示 / SEO 控制面排查

本文说明**管理后台各模块能否有效控制前台内容与 SEO**，并标出**缺口与绕行办法**（SQL、种子重跑、补 UI）。与 [02-架构与程序说明.md](./02-架构与程序说明.md)、[06-API接口参考.md](./06-API接口参考.md) 配合使用。

---

## 1. 总览结论

| 能力 | 后台是否有界面 | 是否实质控制前台 |
|------|----------------|------------------|
| **页面级 SEO（TDK、canonical、og、noindex）** | 有（**Page SEO**） | **是**，经 `site_json.page_seo` → 前台 `useResolvedPageSeo` |
| **工具目录与详情** | 有（**Tools** 列表/审核/编辑） | **是**，读写 `tool` 等表 |
| **用户评论 UGC** | 有（**Reviews**） | **是**，影响详情页已发布评论 |
| **用户与角色** | 有（**Users**） | **间接**，主控账号权限与封禁，不直接改前台文案 |
| **统计与大盘** | 有（**Dashboard / Analytics**） | **否**，只读分析，不改前台内容 |
| **商业化订单** | 有（**Monetization**） | **已登录**：个人中心列表 **`GET /api/me/orders`** + 详情页 **`/orders/:id`**（**`GET /api/me/orders/{id}`**）；**匿名**无订单区；工具详情/对比可显 **`promotion_active`**（弱曝光） |
| **系统设置（菜单等）** | 有（**Settings**） | **是（前台主导航）**：`frontend_menu_items` 经 **GET /api/site/frontend_nav** 供 `Navigation.tsx`；失败或空数组则回退硬编码 |
| **`site_json` 大块内容**（guide / more / sitemap 文案块等） | **有（站点 JSON）+ 若干专用页** | **是**：**站点 JSON** `GET/PUT /api/admin/site-json/{key}`（白名单）；**`page_seo`、`admin_settings` 除外**；**`home_seo`** 以 **「首页 SEO」分字段表单**为主（`/admin/home-seo`），整包 JSON 仅作进阶 |
| **全站 i18n 文案** | **有（Translations）** | **是**：**`/admin/translations`** + **`/api/admin/translations`**（GET/PUT/DELETE）维护表 **`translation`**；仍可用种子/SQL |
| **对比落地页 JSON** | **有（Comparisons）** | **是**：**`/admin/comparisons`** + **`/api/admin/comparison-pages`** 维护 **`comparison_page`**；工具/详情仍走 **Tools** |
| **公开 sitemap.xml / robots** | **有（站点 JSON）** | **是**：**`seo_sitemap_static`** 控 XML 静态 path；**`seo_robots`** 控 **robots.txt**（`Sitemap` 行、`Disallow`、`raw_body` 全文覆盖）；工具/对比 URL 仍来自 DB；**loc** 做 XML 转义，工具行可带 **`lastmod`**（`tool.created_at` 日期前缀）；根 URL 仍靠 **`PUBLIC_SITE_URL`**（与前台 **`VITE_PUBLIC_SITE_URL`** 生产应对齐） |
| **顶栏站点品牌** | **有（首页 SEO）** | **是**：`site_json.home_seo` 中 **`brand_title`** / **`brand_icon_emoji`**（可选）/ **`keywords`** → 前台 `Navigation` 与 SEO；缺失时标题回落 `AI Tools Hub`；`migrate` 会为旧库补键 |

---

## 2. SEO 两条线：页面元数据 vs 爬虫索引文件

### 2.1 页面元数据（title / description / …）

- **后台**：`GET/PUT /api/admin/page-seo`（管理端 **Page SEO** 页）。
- **存储**：`site_json.content_key = 'page_seo'`（path → 字段对象）。
- **前台**：`GET /api/site/page_seo` → `PageSeoProvider`；各页 `useResolvedPageSeo(路径, 兜底)` 与运营配置合并。
- **字段对齐**：后台允许键与前台 `useResolvedPageSeo` / `SEO` 组件消费一致（含 `title` / `description` / `keywords` 及 `_zh` / `_en`、`og_*`、`canonical`、`og_url`、`noindex`、`og_type` 等）。
- path 须与前台 `normalize_page_path` 一致（无尾斜杠、无 query）。

### 2.2 `sitemap.xml` / `robots.txt`

- **实现**：`GET /api/seo/sitemap.xml`、`GET /api/seo/robots.txt`（`seo_public` 路由；统一前缀 **`/api`**）。
- **可控部分**：**工具详情**、**对比页** URL 来自数据库（`tool.slug`、`comparison_page.slug`）——经 **Tools**、**Comparisons**（或 SQL）维护；**slug** 在 URL 中经编码后再写入 **`<loc>`**，并对 **`<loc>` / `priority` / `changefreq` / `lastmod`** 做 **XML 转义**；工具行在 `created_at` 可解析为 `YYYY-MM-DD` 时输出 **`<lastmod>`**。
- **静态路径**：优先 **`site_json.seo_sitemap_static`**（`urls: [{ path, priority, changefreq }]`），无效或空则回退 **后端常量**（含首页、`/support/*` 等公开路由）。
- **robots.txt**：默认 `User-agent: *`、`Allow: /`、`Sitemap: {PUBLIC_SITE_URL}/api/seo/sitemap.xml`。可通过 **`site_json.seo_robots`** 配置 **`sitemap_url`**（单条绝对 URL）、**`sitemap_urls`**（多条，优先于单条）、**`disallow_paths`**（每项以 `/` 开头）、或 **`raw_body`**（非空则整文件覆盖，用于反向代理到根路径 `robots.txt` / `sitemap.xml` 时的自定义声明）。

---

## 3. 前台依赖的 `GET /api/site/{key}` 内容块

以下由 **通用** `GET /api/site/{key}` 提供，数据在 `site_json`。除 **`page_seo`、`admin_settings`、`home_seo`（以专用表单为主）** 外，可在管理端 **站点 JSON**（`/admin/site-blocks`）选键编辑；亦可继续用种子、`migrate` 补行、或 SQL。

| content_key（示例） | 前台用途 | 后台面板 |
|---------------------|----------|----------|
| `home_seo` | 首页关键词、`brand_title`、顶栏 emoji 等 | **首推「首页 SEO」**（`/admin/home-seo`）分字段；**站点 JSON** 不再列出该键（进阶可走白名单 API） |
| `ui_toasts` | 首页 Toast / 排序提示文案 | **站点 JSON** |
| `guide` | 指南页结构与文案 | **站点 JSON** |
| `more` | 「更多」快捷入口与资源链接 | **站点 JSON** |
| `sitemap` | 站内地图卡片列表 | **站点 JSON** |
| `profile` | 个人中心 **站点静态块**、引导等文案（**动态活动流**见 **`GET /api/me/activity`**） | **站点 JSON** |
| `favorites` | 收藏页 **访客演示**列表（登录用户收藏见 **`/api/me/favorites*`** + 表 **`user_favorite`**） | **站点 JSON**（演示数据） |
| `compare_interactive` | 对比工具页数据与 SEO 兜底 | **站点 JSON** |
| `submit` | 提交页分类/定价选项与 UI 文案 | **站点 JSON** |
| `not_found` | 404/对比不存在等提示文案 | **站点 JSON** |
| `dashboard` | 前台仪表盘 JSON（图表、my_tools 等） | **站点 JSON** |
| `seo_sitemap_static` | sitemap.xml 静态路径列表 | **站点 JSON** |
| `seo_robots` | robots.txt：`Sitemap` / `Disallow` / `raw_body` | **站点 JSON**（**不经** `GET /api/site/{key}` 暴露给前台 SPA，仅后端生成 robots 时读取） |

除 **`home_seo`** 以 **「首页 SEO」** 分字段为主外，上表多数键仍为 **整包 JSON** 编辑，与 **Page SEO**、**Tools**、**Translations**、**Comparisons** 分工不同。

---

## 4. `admin_settings`（后台「系统设置」）与前台

- **存储**：`site_json.content_key = 'admin_settings'`（含 `admin_menu_items` / `frontend_menu_items` 等）。
- **管理端**：`admin/settings` 维护菜单项。
- **前台**：挂载时请求 **GET /api/site/frontend_nav**（由 `admin_settings.frontend_menu_items` 筛 `visible`、按 `order`）；**无数据或请求失败**时用 `Navigation.tsx` **默认主导航**。
- **注意**：请在 **Settings** 维护上述 JSON，勿在「站点 JSON」重复改写同一 `admin_settings` 行（白名单已排除该 key）。
- **管理端侧栏**：`admin_menu_items`（及兼容 `menu_items`）由 **`AdminSidebar`** 读 **`GET /api/admin/settings`**；无有效项时用内置 fallback；`key` 以 `sidebar.` 开头时用管理端 i18n 显示标签。

---

## 5. i18n 与 JSON-LD

- **前台**：`GET /api/i18n/{locale}`、`LanguageSwitcher` 用 `GET /api/locales`。
- **后台**：**有**——管理端 **`/admin/translations`**，API **`GET/PUT/DELETE /api/admin/translations`** 维护表 **`translation`**（可按 `locale` 筛选列表）。
- **工具详情**：后端可在详情 JSON 中带 `messages`，前台仍以全局 i18n 为主。
- **JsonLd**：详情页结构化数据由前台据工具字段组装，**无运营后台表单**（若需可改字段见 §6）。

---

## 6. 仍为缺口或依赖绕行（摘要）

以下项在**总览表 §1**中或标注「部分」或矩阵中注明「仅 DB」；商业化 **v1 已落地**见 [**10-需求-商业化与订单.md**](./10-需求-商业化与订单.md)；汇总见 [**03-开放事项总表.md**](./03-开放事项总表.md) **§4.1**；演进 backlog 编号见同文档 **§4.2 BACKLOG-CP**。

| 项 | 现状 | 绕行 |
|----|------|------|
| **搜索联想词** | 表 **`search_suggestion`**；管理端 **`/admin/search-suggestions`** + **`/api/admin/search-suggestions*`**（列表/增/改/删） | 仍可用种子或 SQL 批量灌库 |
| **大块 `site_json`** | `submit`、`dashboard` 等多为**整包 JSON** | **站点 JSON**；分字段表单可后续加 |
| **对比页 JSON** | **Comparisons** 为整包编辑器 | 可加 Schema / 分块表单 |
| **JSON-LD** | **`seo_tool_json_ld.global_merge`** 可配；专页 **`/admin/tool-json-ld`**（亦在站点 JSON） | 按工具 slug 逐条覆盖若需另立 |
| **i18n 工程化** | **Translations** 已可维护表 | 翻译平台、批量导入导出等另立 |
| **订单展示范围** | 已登录：列表 + **`/orders/:orderId`** 详情；**匿名无订单区** | 强曝光首页插卡等见 [**10-需求-商业化与订单.md**](./10-需求-商业化与订单.md) 后续迭代 |

---

## 7. 与本仓库其它文档的关系

- **收藏 / 个人动态**：**`/api/me/favorites*`**、**`GET /api/me/activity`**；**`site_json.profile`** 仍供个人中心静态块与兜底文案。**数据约定**见 [**03-开放事项总表.md**](./03-开放事项总表.md) §4。
- **推广订单**：**`GET /api/me/orders`**、**`GET /api/me/orders/{id}`** 与 **`monetization_order`** 对齐；**匿名**无订单模块；详情/对比 JSON 可含 **`promotion_active`**（与订单窗口一致）。
- 接口路径与鉴权见 [06-API接口参考.md](./06-API接口参考.md)；跨文档待办见 [**03-开放事项总表.md**](./03-开放事项总表.md)。

---

## 8. 前后台数据同步矩阵（摘要）

以下仅列「访客前台」与「管理端自身」两条线；**后台改了是否立刻体现在界面**以是否命中对应 API 为准。

### 8.1 访客前台（`frontend/`）

| 前台能力 | 主要 API / 数据 | 后台能否配置 | 备注 |
|----------|-------------------|--------------|------|
| 首页列表、分类、联想词 | `/api/tools`、`/api/categories`、`/api/search-suggestions`、`/api/site/home_seo`、`/api/site/ui_toasts` | Tools + **首页 SEO**（`home_seo`）+ **站点 JSON**（`ui_toasts` 等）；联想词表经 **`/admin/search-suggestions`** 维护 | 分类名来自 i18n + `category` 表 |
| 全局文案 | `/api/i18n/{locale}`、`/api/locales` | **Translations** 管理 **`translation` 表** + 种子/SQL | |
| TDK 合并 | `/api/site/page_seo` | **Page SEO** | |
| 主导航 | `/api/site/frontend_nav` | **Settings** → `frontend_menu_items` | 空/失败则前台默认导航 |
| 各运营块 | `/api/site/{key}` | **站点 JSON**（白名单）；**`home_seo` 优先走「首页 SEO」** | |
| 提交表单 | `/api/submit-options` | **站点 JSON** `submit` + 分类表 | |
| 工具详情 / 对比页 | `/api/tools/...`、`/api/comparisons/...` | **Tools**；**对比 JSON** 见 **Comparisons**（`/admin/comparisons`） | |
| 爬虫 sitemap / robots | **`GET /api/seo/sitemap.xml`**、**`GET /api/seo/robots.txt`** | **站点 JSON**：**`seo_sitemap_static`**（静态 path）、**`seo_robots`**（Sitemap 行 / Disallow / `raw_body`）；动态 URL 仍随 **Tools / Comparisons** | 根域 **`PUBLIC_SITE_URL`**；生产可与网关根路径 `sitemap.xml` 反代对齐 |
| 登录用户推广订单 | **`GET /api/me/orders`**、**`GET /api/me/orders/{id}`** | **Monetization**；前台个人中心 + **`/orders/:orderId`** | 匿名无此块 |
| 用户资料展示（顶栏等） | `/api/auth/*`、**`GET /api/me`**、**`PUT /api/me/profile`** | 用户自助编辑资料；非运营后台表单 | 编辑资料页已接库表 `display_name`/`avatar_emoji`/`bio` |
| 用户偏好 | `/api/me/settings` | 用户自助 **Settings** | |

### 8.2 管理端自身（`admin/`）

| 配置项 | 存储 | 是否被管理 UI 消费 |
|--------|------|---------------------|
| `admin_menu_items` / `menu_items` | `site_json.admin_settings` | **是**，侧栏动态渲染（含 fallback） |
| `frontend_menu_items` | 同上 | **访客前台** `frontend_nav` 使用（管理端 Settings 编辑） |

### 8.3 环境依赖（简要）

- **顶栏品牌**：**`home_seo.brand_title`** / 可选 **`brand_icon_emoji`**（**首页 SEO** 或 `site_json`）；空则前台默认 Lucide `Sparkles`。
- **公网根 URL**：前台 **`VITE_PUBLIC_SITE_URL`**（`frontend/src/lib/siteUrl.ts`）；sitemap / robots 用 **`PUBLIC_SITE_URL`**（`seo_public.py`）。上线应指向**同一生产域**。
