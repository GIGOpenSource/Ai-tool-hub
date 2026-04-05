# 手册 E：评估、数据打通、开发日志与 Bug 记录

本文档由原 **14 / 15 / 19 / 20** 合并。

---

# AI SEO 分析助手与全链路数据打通评估（项目现存问题汇总）

| 项 | 内容 |
|----|------|
| **文档性质** | 对照 PRD、流程图（`product_flow.png`）、竞品流量示意（`traffic_trend.png`）、需求文档 **12**、**08**、**03** 等，对**当前代码与数据流**做静态核对；**未**在本次评估中完成「真实管理员 JWT + 外部大模型」的端到端联调。 |
| **维护** | 关闭条目时在本表标注日期并同步 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) 相关行。 |

---

## 1. 评估方法说明

1. **代码路径**：`backend/app/growth/ai_insight_service.py`（`build_snapshots`）、`backend/app/routers/growth/admin_ai_insights.py`、`backend/app/analytics_service.py`、`backend/app/routers/track.py`、前台 `ToolDetailPage` 外链行为。  
2. **管理端**：`/admin/ai-seo-insights` 与 `/api/admin/ai-insights/*` 存在且与 [12-需求-AI-SEO与流量分析助手.md](./手册-D-需求-商业化-AI-SEO-爬虫.md) 描述一致（MVP 范围）。  
3. **未执行**：带生产库或完整种子的 `POST /api/admin/ai-insights/run` 实机调用、token 用量与供应商账单核对。

---

## 2. AI SEO 助手实际注入的数据（与文档 12 对齐）

| 占位符 / 数据块 | 实际来源（库或聚合） | 与需求 12 §3.5 关系 |
|-----------------|----------------------|---------------------|
| `seo_snapshot` | `site_json.page_seo`（条数默认 50，可由 **`AI_INSIGHT_PAGE_SEO_MAX_PATHS`** 调整）+ `home_seo`；path 顺序为 **近窗热门（与 `page_seo` 交集）+ 字典序补足**（**P-AI-04**） | 一致 |
| `seo_indexing_snapshot`（旧名 **`crawler_snapshot`** 同义） | **`seo_sitemap_static`** 与 **`seo_robots`** 的摘要（条数、前 15 path、键名、raw 长度） | 与「索引/抓取配置」语义一致；**P-AI-01** 已引入新名并保留别名 |
| `traffic_snapshot` | `page_view_log` 聚合：日趋势与 Top 路径窗口由 **`AI_INSIGHT_TRAFFIC_WINDOW_DAYS`**、**`AI_INSIGHT_TRAFFIC_TOP_PATHS`** 控制（默认 7 日 / 20 条）；内含 **`analytics_compare_range`**（`start_date` / `end_date` / `sort_by`），与 **`GET /api/admin/analytics/pages`** 入参一致，便于与看板对账 | 一致（脱敏聚合） |
| `site_stats_snapshot` | `dashboard_summary` + `comparison_page` 行数 + **`snapshot_limits_and_caveats`**（已知边界）+ **`ai_insight_snapshot_env_limits`**（与进程环境一致的审计镜像） | 与文档「可选扩展」部分重叠 |
| **`competitor_benchmark_snapshot`** | **`site_json.ai_insight_competitor_benchmarks`**（运营维护的结构化竞品指标，**P-AI-03**） | 需求 12 未逐字要求；作为对标/第三方估算的结构化载体 |

**明确未注入（设计或非目标）**：UGC 原文、单用户标识、**未维护进 `ai_insight_competitor_benchmarks` 的**第三方流量原始序列、自动抓取竞品图（如 `traffic_trend.png`）像素级解读、`crawler_job` / 内容爬虫（PROD-CRAWLER）执行统计。出站官网点击已通过 **`outbound_click_log`** 进入 **`traffic_snapshot.outbound_official_clicks_*d`**（与窗口天数对齐）。

---

## 3. 与产品流程图（`product_flow.png`）的对照结论

| 流程图节点 | 当前实现侧要点 | 是否进入 AI 快照 |
|------------|----------------|------------------|
| 首页 / 搜索 / 分类 / Alternatives → 详情 | 依赖路由与内容配置；SEO 由 `page_seo` 等控制 | 仅 **page_seo 抽样**，非全站逐页 |
| **记录出站点击并跳转** | 工具详情「访问官网」：**`POST /api/track/outbound`** → **`outbound_click_log`**（仅 **`moderation_status=active`** 的 slug）；再跳转外链 | **是**（**`traffic_snapshot.outbound_official_clicks_*d`**，窗长与 **`AI_INSIGHT_TRAFFIC_WINDOW_DAYS`** 一致，**P-AI-02**） |
| UGC 评论 / 登录 | 有评论与登录能力；需求 12 声明本期**不包含 UGC 原文** | **否**（符合非目标） |
| 开发者认领 → 审核 → 数据看板 | 开发者侧有 `developer_dashboard_payload`（与 `page_view_log` 按工具 slug 关联） | **否**（AI 快照未单独拉「认领工具」维度） |

**结论**：**出站官网点击**已与 **AI SEO 输入**打通（独立表 + 快照子对象）。开发者仪表盘表格 **「点击」列仍为详情路径 UV**（`page_view_log`），**与 **`outbound_click_log`** 不同源**，运营对比时勿混读列名。

---

## 4. 与竞品流量图（`traffic_trend.png`）的关系

- 图中 **TAAFT 月度总访问**等若仅作为 PNG/PDF 离线素材，**不会**自动进库或进快照。  
- **工程已支持**运营在 **`site_json.ai_insight_competitor_benchmarks`** 中维护结构化 **`benchmarks[]`**（`label` / `notes` / **`metrics`**），由 **`{{competitor_benchmark_snapshot}}`** 注入；空配置时快照内带 **`empty_hint`**，提示模型勿编造数值。  
- 若未配置结构化竞品块，模型仍**只能**主要依据本站 `page_view_log` 趋势；**对标结论**依赖运营在 **`metrics` 中写明来源与日期**，或在提示词中手工摘录第三方数据。

---

## 5. 各端数据打通矩阵（简表）

| 数据域 | 前台 | 后端表/API | 管理端 Dashboard/Analytics | AI SEO 快照 |
|--------|------|------------|----------------------------|-------------|
| 页面 PV/UV | 需调用 `POST /api/track` | `page_view_log` | 有 | 有（可配置窗长趋势 + Top 路径，默认 7 日 / Top20） |
| 页面级 TDK / noindex | 渲染侧消费配置 | `site_json` | Page SEO 等 | 有（抽样） |
| Sitemap / Robots 配置 | 对外路由读 `site_json` | `site_json` | 站点块编辑 | 有（**`seo_indexing_snapshot`** / 旧 **`crawler_snapshot`**） |
| **内容爬虫**（Feed 导入） | 管理端配置与调度相关页面 | `crawler_*` | 爬虫页统计 | **无**：快照**不收录**「拉 Feed、导入内容」的任务与统计（如 **`crawler_job`**）。**与上一行不同**：上一行是**本站** sitemap/robots **静态配置**，会进 **`seo_indexing_snapshot`**；本行是**运营侧内容抓取**，两套勿混。 |
| **出站官网点击** | 跳转前 **`POST /api/track/outbound`** | **`outbound_click_log`** | 开发者仪表盘表格 **「点击」列仍为详情 UV**（`page_view_log`），**非**本表外链次数；出站聚合以 **`outbound_click_log`** 为准 | **有**（**`traffic_snapshot.outbound_official_clicks_*d`**，窗与流量块一致） |

**说明**：上表「打通」指**数据是否进入可被 AI 快照读取的路径**。**内容爬虫**与 **SEO 静态索引配置**、**外链出站表**三者命名与模型仍不同，勿混淆；**P-AI-02** 后外链已独立落库并进入 **`traffic_snapshot`**。

---

## 6. 项目现存问题清单（本评估汇总）

### 6.1 AI SEO 与数据产品

| ID | 问题 | 影响 | 建议方向 |
|----|------|------|----------|
| **P-AI-01** | （**已落实**，见 [Bug 与修复日志 §1](./手册-E-评估与变更日志.md#bug-与修复日志)）曾用名 `crawler_snapshot` 易与 **内容爬虫** 混淆 | — | 现推荐 **`{{seo_indexing_snapshot}}`**；**`{{crawler_snapshot}}`** 仍为同内容别名；可选后续增加 **`content_crawler_stats`** |
| **P-AI-02** | （**已落实**，见 [Bug 与修复日志 §1](./手册-E-评估与变更日志.md#bug-与修复日志)）曾缺独立出站埋点 | — | **`POST /api/track/outbound`**、**`outbound_click_log`**、**`traffic_snapshot`** 子键 **`outbound_official_clicks_7d`**（键名保留「7d」为历史兼容，**实际窗长**与 **`traffic_window_days`** / **`AI_INSIGHT_TRAFFIC_WINDOW_DAYS`** 一致） |
| **P-AI-03** | （**工程已落地**）离线图本身不入库 | 无结构化 **`metrics`** 则勿编造对标数值 | **`site_json.ai_insight_competitor_benchmarks`** → **`{{competitor_benchmark_snapshot}}`**；默认提示词模板已含该段；**`traffic_trend.png` 类素材**仍须人工转写进 **`metrics` 或提示词** |
| **P-AI-04** | （**已部分落地**）固定 50/7/20 大站仍可能偏差 | token 与覆盖面权衡 | 环境变量 **`AI_INSIGHT_PAGE_SEO_MAX_PATHS`**、**`AI_INSIGHT_TRAFFIC_WINDOW_DAYS`**、**`AI_INSIGHT_TRAFFIC_TOP_PATHS`**；`page_seo` 抽样策略 **`hybrid_hot_analytics_then_sorted_lexicographic`**（无埋点则回退纯序） |
| **P-AI-05** | （**已部分落地**）独立任务队列/多 worker 迁移仍属后续 | 网关/浏览器超时 | 请求体 **`defer_llm: true`** → **HTTP 202** + **Starlette `BackgroundTasks`**（非独立队列）；管理端 **勾选后台执行并轮询** + 标题区折叠 **「后台执行与运行边界」** 写明多实例仅收 POST 的进程执行、进程崩溃可致 **pending** 长期挂起须人工看历史；快照 **`llm_invocation`** 已更新 |
| **P-AI-06** | （**已处理**：**CI** 已 mock 验收 **Redis 固定窗口**；**未设 URL** 时仍为进程内滑动窗口） | 未配 Redis 时多 worker 各进程计数独立 | 生产多实例须设 **`AI_INSIGHT_RATE_LIMIT_REDIS_URL`** 才能共享配额；**`AI_INSIGHT_RATE_LIMIT_WINDOW_SEC`** / **`AI_INSIGHT_RATE_LIMIT_MAX_CALLS`** 可调；快照 **`ai_insight_snapshot_env_limits`** 镜像生效值；**`scripts/ai_insight_snapshots_acceptance.py`** 内 **`_assert_redis_rate_limit_mock`** |
| **P-AI-07** | **部分已闭合** | **出境 LLM**：产品已确认允许 SEO 摘要与聚合流量发往管理员配置的 endpoint（含境外），快照 **`data_residency_and_cross_border`** 已改为 **`allowed_overseas_llm_for_seo_summaries_and_aggregated_traffic`** | **`model_output_format` / `cost_quota_and_retention`** 仍为占位；管理端折叠与 **§9**、**`ai_insight_snapshots_acceptance`** 已同步；**勿**将界面说明当作对外法务唯一依据 |

### 6.2 已在他处登记的工程与发布项（避免重复造表）

以下以 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) **第 1 节一览**为准，**仍为现存事项**（须**运维/发布流程**闭合，非单靠代码）：

- **SEC-01 / OPS-ENV**：生产密钥、源站、HTTPS、备份等；辅助脚本 **`backend/scripts/verify_release_env.py`** 与总览 [**21**](./手册-C-开放事项与演进对照.md) §1。  
- **TC-EXEC**：发布前人工走查为主；速查 [**21**](./手册-C-开放事项与演进对照.md) §1.3。  
- **ENG-PG**：选用 PostgreSQL 时的环境级验收与备份演练；清单 [**21**](./手册-C-开放事项与演进对照.md) §1.4。

**P-AI-03～07** 的策略边界与后续工程分工见 [**21**](./手册-C-开放事项与演进对照.md) **§2**（与上表 §6.1 互补，不删 §6.1）。

**CP-SITEJSON / CP-MONET-RE / 翻译平台** 等 backlog 的**立项门槛**见 [**21**](./手册-C-开放事项与演进对照.md) **§3** 与 [11](./手册-C-开放事项与演进对照.md)。

控制面演进与商业化后续见 **03** 第 4.2 节与 [11-控制面演进需求-CP-BACKLOG.md](./手册-C-开放事项与演进对照.md)、[10-需求-商业化与订单.md](./手册-D-需求-商业化-AI-SEO-爬虫.md)。

### 6.3 文档与验收

| ID | 问题 | 说明 |
|----|------|------|
| **P-DOC-01** | （**已落实**）**`scripts/ai_insight_snapshots_acceptance.py`** + CI（含 **`top_pages_7d`** 与 Analytics 同源对账、**P-AI-06** Redis mock） | 见 [Bug 与修复日志 §1](./手册-E-评估与变更日志.md#bug-与修复日志) |
| **P-DOC-02** | （**已落实**）需求 **12** §7 增补发布管线说明 | 与 **03** TC-EXEC 一并执行走查 |

---

## 7. 验证与对账（已在仓库闭环）

以下项已由实现字段 + **`scripts/ai_insight_snapshots_acceptance.py`**（**CI** `backend-py-compile` 步骤）覆盖，**视同已处理**；生产仍可按需人工抽检。

| 主题 | 闭环说明 |
|------|----------|
| **Analytics 与 `top_pages_7d`** | **`build_snapshots`** 与 **`page_analytics_rows`** 同源；**`traffic_snapshot.analytics_compare_range`** 给出与管理端 **`GET /api/admin/analytics/pages`** 相同的 **`start_date` / `end_date` / `sort_by`**（默认与 **`traffic_window_days`** 对齐）；摘要 **`traffic_analytics_compare_range`** 同值。CI 写入受控 **`page_view_log`** 并断言 **`top_pages_7d`** 与 **`page_analytics_rows[:top_pages_limit]`** 逐行 **`page_path` / `pv` / `uv`** 一致。键名 **`top_pages_7d`**、**`daily_trend_7d`** 为历史兼容，**窗长**以 **`traffic_window_days`** 为准。 |
| **多 worker 与 P-AI-06** | 验收脚本 **`_assert_redis_rate_limit_mock`** 覆盖 **Redis 固定窗口**逻辑；生产多实例须配置 **`AI_INSIGHT_RATE_LIMIT_REDIS_URL`** 方可跨进程共享计数。未配置时仍为**进程内**滑动窗口（扩容时 QPS 上限按实例数倍放大的风险仍在，靠运维配 Redis 闭合）。 |
| **§11 配置面** | 多键 **`site_json`** 写库、审计回滚、**`code_pr_hint`** 等与需求 **[12](./手册-D-需求-商业化-AI-SEO-爬虫.md) §11** 及 **08 / 11 / 03** 已对齐并合入仓库；后续若扩展二次升权、配置多版本历史等仍见 **12 §11** 路线图。 |

**仍建议（非阻塞）**：本地或预发由管理员执行一次 **`POST /api/admin/ai-insights/run`**，将 **`input_payload_summary`** 按 JSON 核对 **`page_seo_paths_included`**（条数）、**`page_seo_sample_strategy`**、**`snapshot_limits`**、**`outbound_clicks_window_total`** 等。

---

## 8. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-04-04 | 首版：静态代码与文档对照，输出现存问题与打通矩阵。 |
| 2026-04-04 | 同步 P-AI-01/02、P-DOC-01/02 落实说明；P-AI-04～07 补充快照侧提示与仍开放项。 |
| 2026-04-05 | §2/§4、P-AI-03/06、限流审计；**P-AI-05** `defer_llm`；**P-AI-07** 双折叠；**§3/§5** 按 **P-AI-02** 更正出站矩阵（`outbound_click_log`→快照），区分仪表盘 UV 列与爬虫/索引语义。 |
| 2026-04-05 | **§7** 与 **12 §11 / 06 / 08 / 11 / 03** 同步：多键 **apply**、**`ai_insight_seo_apply_audit`** 回滚、**`code_pr_hint`** 仅 PR/CI。 |
| 2026-04-05 | **§6.2** 与 [**21**](./手册-C-开放事项与演进对照.md) 交叉：**SEC/OPS/TC/ENG-PG** 辅助脚本、**P-AI**/**CP** 立项口径。 |
| 2026-04-05 | **§6.1** P-AI-01/02、**P-DOC-01**：「见 [20] §1」改为锚定 **Bug 与修复日志 §1**（避免与篇首「评估方法」§1 混淆）；**P-AI-02** 补充 **`outbound_official_clicks_7d`** 与 **`traffic_window_days`** 关系；**§7** 明确 **`page_seo_paths_included`** 为条数及 **`top_pages_7d`** 键名与窗长对照。 |
| 2026-04-05 | **§2/§7**、**P-AI-06**：**`traffic_snapshot.analytics_compare_range`** 与摘要 **`traffic_analytics_compare_range`**；验收脚本对账 **`top_pages_7d`** + **Redis mock**；§7 与 **P-AI-06** 标为**已处理/已闭环**（生产未配 Redis 风险仍由运维配置闭合）。 |


---

# 产品 · 市场 · 商业 · 程序 — 综合评估与梗概

本文在**不替代**既有 PRD/ORD/竞品长文的前提下，基于当前**已实现代码与仓库文档**，从四条主线给出上线前后可用的**评估与梗概**，供决策与排期参考。

---

## 1. 产品维度

### 1.1 定位

- **对外价值**：AI 工具的**发现、分类浏览、详情与多工具对比**；支持多语言 UI（i18n 表 + 站点 JSON）。
- **用户侧**：访客可浏览与对比；**登录用户**可收藏、维护资料与设置、查看个人动态、**提交新工具（待审核）**、查看**推广订单**列表与详情。
- **运营侧**：Next.js 管理后台覆盖工具审核、用户与评论治理、流量看板、站点内容与 SEO 控制、商业化订单、搜索联想词、对比页、可选 **AI SEO 解读**与 **JSON 内容爬虫**。

### 1.2 功能成熟度（梗概）

| 域 | 成熟度 | 说明 |
|----|--------|------|
| 目录与详情 | **高** | 列表、详情、分类、评论、替代工具等已贯通前后台与 API。 |
| 对比与落地页 | **高** | `comparison_page` + 管理端维护；弱曝光推广标已接库。 |
| UGC 提交 | **中** | 登录提交 → `pending` → 后台审核；无复杂工单流。 |
| 账号与个性化 | **中** | JWT + 本地存储；收藏/活动/设置已落地。 |
| SEO 控制面 | **高** | 页面 SEO、`sitemap.xml` / `robots.txt`、首页 SEO、JSON-LD 专页等已文档化（见 [08](./08-管理后台与SEO控制面.md)）。 |
| 商业化（C 端） | **中** | 订单可读、弱曝光有；**无自助支付与下单闭环**（见 §3）。 |
| 内容与增长工具 | **中** | **爬虫 MVP**：JSON 导入默认 **`tool.pending`**，经人工审核上架，非「AI 直接改站」。**AI SEO（§11）**：分析 run 本身不落配置；**生成任务清单 → 管理员批准 → apply 自动合并写入**白名单 **`site_json`**（**`page_seo` / `home_seo` / `seo_robots`**），属**人工确认后的程序化 SEO 优化**；源码向建议仍须 **PR/CI**。见 [手册-D §11](./手册-D-需求-商业化-AI-SEO-爬虫.md)。 |

### 1.3 体验与产品风险

- **控制台「推广位」文案**偏营销向，实际 CTA 多为**联系运营**，需与对外承诺一致，避免期望落差。
- **演示账号**默认存在，生产必须改密与轮换（SEC-01）。

---

## 2. 市场维度

### 2.1 赛道与竞品参照

- 垂直赛道为 **AI 工具目录 / 发现引擎**，典型竞品包括 **There’s An AI For That（TAAFT）** 等综合目录站。
- 仓库 `docs/` 目录内另有 **《TAAFT 深度竞品分析报告（完整版）》** Markdown 文件，可用于**功能对标与差异化叙事**，本文不展开细节。

### 2.2 差异化机会（与实现现状对齐）

| 方向 | 现状支撑 | 备注 |
|------|----------|------|
| **可控 SEO 与结构化数据** | 页面 SEO、站点 JSON、sitemap/robots、Tool JSON-LD 专页 | 利于长尾与品牌站运营，依赖运营配置质量。 |
| **对比落地页** | 后台可视化 + JSON | 可做「X vs Y」流量入口。 |
| **合规弱曝光商业化** | `promotion_active` + 订单表 | 相对「强插首页」更易合规落地，但变现天花板较低。 |
| **运营效率** | 爬虫导入待审；AI SEO **报告 + 结构化任务**，**批准后 apply 自动写**配置面 SEO（§11） | 降本增效；模型成本与审批纪律需运营约定。 |

### 2.3 市场侧主要风险

- **冷启动**：工具数量与更新频率直接影响 SEO 与回访；爬虫与投稿需质量管控。
- **同质化**：若仅「列表聚合」，需靠内容深度（评测、对比、垂直场景）与运营节奏拉开差距。

---

## 3. 商业维度

### 3.1 已实现变现相关能力

- **数据**：`monetization_order`（金额、支付状态、推广有效期、统计扩展字段等）。
- **管理端**：订单列表、筛选、**人工修正支付状态与止期**（运营为真相源）。
- **用户端**：个人中心订单列表、`/orders/:orderId` 详情；详情/对比页 **弱曝光**「付费推广 / Promoted」（规则见 [10](./手册-D-需求-商业化-AI-SEO-爬虫.md) §6）。
- **决策归档**：匿名侧**不做**首页/列表强插卡；**不做**续购/再次线上下单入口（后续工单 CP-MONET-RE）。

### 3.2 商业缺口（直接影响收入闭环）

| 项 | 状态 | 影响 |
|----|------|------|
| **在线支付**（Stripe/微信/支付宝等） | **未实现** | 无法自助完成「选套餐 → 支付 → 自动生效」 |
| **用户侧创建订单 API** | **未实现** | 订单依赖后台录入或外部合同流 |
| **强曝光广告位** | **未实现** | 首页/分类商业化能力有限 |
| **合同/发票流程** | **未系统化** | 需线下或第三方系统 |

### 3.3 商业建议（梗概）

- **短期**：明确对外套餐为「联系销售 + 运营后台录单」，法务话术与隐私/条款在 `site_json` 维护（见 [10](./手册-D-需求-商业化-AI-SEO-爬虫.md) §4.1）。
- **中期**：若要做规模化变现，需单独立项 **支付网关 + Webhook + 订单状态机 + 强曝光规则**，并与合规评审同步。

---

## 4. 程序维度

### 4.1 技术架构评价

- **三端分离清晰**：Vite/React 前台、Next 管理端、FastAPI 单 API 与单库（SQLite 默认，可选 PostgreSQL），利于分工与部署。
- **安全基线**：生产 `JWT_SECRET` 弱值拒绝启动；生产 CORS 未配置时 **stderr 警告**；演示账号生产不覆盖已有密码哈希（首启仍需改密）。
- **工程化**：`.github/workflows/ci.yml` 提供构建与 `publish_smoke` 子集；**无**全量自动化 E2E（与 [03](./手册-C-开放事项与演进对照.md) TC-EXEC 一致）。

### 4.2 技术债与扩展点

| 类别 | 说明 |
|------|------|
| **性能** | 前台构建存在较大 chunk（如 Dashboard、图标包），可做懒加载与拆包。 |
| **多实例与任务** | 爬虫调度为**进程内 asyncio**；多副本部署时需评估是否改为独立 Worker 或分布式锁。 |
| **AI 与外链** | AI SEO、爬虫均依赖外网与密钥；需配额、失败降级与审计。 |
| **数据层** | PostgreSQL 选用后须单独验收迁移与备份（ENG-PG）。 |

### 4.3 与「数据/AI」评估文档的关系

- 更细的**数据源矩阵与打通缺口**见 [14](./手册-E-评估与变更日志.md)，可与本文 **§3～§4** 对照阅读。

---

## 5. 综合结论（执行摘要）

1. **产品**：MVP 完整的 **工具导航 + 用户体系 + 运营后台 + SEO 控制面** 已具备，可支撑**内容运营驱动**的上线。
2. **市场**：赛道成熟、竞品多；差异化依赖 **SEO/对比内容/运营效率工具**，而非单一列表功能。
3. **商业**：**弱曝光 + 后台订单**适合「轻量商业化起步」；**规模化收入**依赖支付与广告产品化，当前**未闭环**。
4. **程序**：架构合理、安全与发布流程有文档与 CI 辅助；生产仍需严格执行 **OPS-ENV / SEC-01** 与人工验收（[09](./手册-A-部署安全-发布与运维.md)）。

---

## 6. 相关文档

| 文档 | 用途 |
|------|------|
| [02-架构与程序说明.md](./手册-B-架构程序与API索引.md) | 技术架构精要 |
| [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) | P0/P1 与 BACKLOG |
| [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) | 控制面矩阵 |
| [10-需求-商业化与订单.md](./手册-D-需求-商业化-AI-SEO-爬虫.md) | 商业化决策与实现 |
| [11-控制面演进需求-CP-BACKLOG.md](./手册-C-开放事项与演进对照.md) | 演进 backlog |
| [12](./手册-D-需求-商业化-AI-SEO-爬虫.md)、[13](./手册-D-需求-商业化-AI-SEO-爬虫.md) | AI SEO、爬虫需求 |
| [16-部署与发布完整说明书.md](./手册-A-部署安全-发布与运维.md)、[17-程序说明书（完整）.md](./手册-B-架构程序与API索引.md) | 本文配套的部署与程序全文 |

---

*文档版本：与仓库当前实现同步维护；若产品决策变更请同步更新 §3 与 [10](./手册-D-需求-商业化-AI-SEO-爬虫.md)。*


---

# 开发日志

本文档按**仓库当前能力与文档**归纳开发演进，便于新成员与发布对账。**Git 提交**在撰写时仅有 **`ccf2c52`（2026-04-04）** 一条「初始提交」；大量迭代以**工作区变更与 docs 修订**为准，后续若规范使用 `git commit`，可在本节追加「按提交」子表。

---

## 1. 方法与权威引用

| 来源 | 用途 |
|------|------|
| [17-程序说明书（完整）.md](./手册-B-架构程序与API索引.md) | 三端架构、生命周期、数据模型、API 分层 |
| [07-源代码文件索引.md](./手册-B-架构程序与API索引.md) | 文件级职责 |
| [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) | 已落实项与待办边界 |
| [18-REST-API完整接口文档.md](./手册-B-架构程序与API索引.md) | 接口清单（与 OpenAPI 互补） |

---

## 2. 里程碑时间线（摘要）

| 阶段 | 时间参考 | 内容摘要 |
|------|----------|----------|
| 仓库初始化 | 2026-04-04 | 提交 **AI 导航** 单体仓库：`admin`（Next.js）、`backend`（FastAPI）、`frontend`（Vite + React）及配套 `docs/`、`sql/`、种子数据。 |
| 安全与发布工程化 | 文档 §0.1～0.2 | **`env_guard`** 生产 **`JWT_SECRET`** 强校验；**`ensure_dev_accounts`** 生产不覆盖已存在用户口令；**`publish_smoke.sh`** 发布前接口抽样；**`.github/workflows/ci.yml`**：docs lint、**`backend-py-compile`**（含 **`ai_insight_snapshots_acceptance`**、**`crawler_acceptance`**、**`verify_release_env`**）、前后台 build、**api-smoke**（见 [03](./手册-C-开放事项与演进对照.md)）。 |
| 控制面与 SEO | 持续 | 管理端：`dashboard`、`analytics`、工具审核/编辑、用户与评论、`page_seo`、`home_seo`、`site_json` 分块、对比页可视化与 JSON、`tool-json-ld`、翻译与搜索联想词、商业化订单列表等（见 [08](./08-管理后台与SEO控制面.md)、[07](./手册-B-架构程序与API索引.md)）。 |
| 用户与商业化（C 端 API） | 持续 | 收藏、个人资料与设置、活动流、推广订单；详情/对比接口 **`promotion_active`** 等（见 [03](./手册-C-开放事项与演进对照.md) §4.1、[10](./手册-D-需求-商业化-AI-SEO-爬虫.md)）。 |
| AI SEO 助手（MVP） | 2026-04 文档 | 后端 **`backend/app/growth/ai_insight_service.py`**、路由 **`routers/growth/admin_ai_insights.py`**（**`/api/admin/ai-insights/*`**）；管理端 **`/admin/ai-seo-insights`** 及运行详情页；快照含 SEO、流量、`site_json` 爬虫相关摘要等（见 [手册-D](./手册-D-需求-商业化-AI-SEO-爬虫.md)、§11 任务写库）。 |
| AI SEO §11 任务写库 | 2026-04-05 | **`ai_insight_seo_task`** 多 **`kind`**（**`page_seo` / `home_seo` / `seo_robots`** + **`code_pr_hint`**）、**`ai_insight_seo_apply_audit`**、管理端审计表与回滚；文档 **06 / 08 / 11 / 12 / 18** 已同步。 |
| 内容爬虫与调度 | 2026-04 文档 | **`crawler_*`** 表、**`routers/growth/admin_crawler.py`**、**`app.growth.crawler_service`** / **`crawler_scheduler_loop`** 进程内巡检；样例 feed 与 **`backend/scripts/crawler_acceptance.py`**（**CI** 已纳入）见 [手册-D 爬虫章](./手册-D-需求-商业化-AI-SEO-爬虫.md)。 |
| 可观测与版本 | 2026-04 | **`health_release`**（**`GET /api/health`** 与发布对账）、**`release_meta.api_version()`** 与 OpenAPI 版本对齐；**`APP_VERSION`** 可覆盖。 |
| 前端工程与体验 | 2026-04 | **`ErrorBoundary`**、**`FullPageLoadError`**、**`webVitals`**、**`LanguageContext`** 等；**BACKLOG-A**：精简未使用的 UI 组件与依赖（见 [05](./手册-A-部署安全-发布与运维.md)）。 |
| 文档体系 | 2026-04 | 部署（[01](./手册-A-部署安全-发布与运维.md)、[16](./手册-A-部署安全-发布与运维.md)）、API（[06](./手册-B-架构程序与API索引.md)、[18](./手册-B-架构程序与API索引.md)）、需求 10～15 与程序说明 17 等；根目录部分 PDF/MD **迁移至 `docs/`**（以当前树为准）。 |
| 发布自检与对照文 | 2026-04-05 | [**21**](./手册-C-开放事项与演进对照.md) 收拢 **SEC-01/OPS-ENV/TC-EXEC/ENG-PG**、**P-AI**、**CP-*** 门槛；脚本 **`verify_release_env.py`**。 |
| 运维脚本 | 2026-04 | **`backend/scripts/backup_database.py`** 等辅助脚本（见仓库 `backend/scripts/`）。 |

---

## 3. 按子系统的开发要点

### 3.1 后端（`backend/app/`）

- **入口**：`create_app()` 注册 **`/api`** 下全部路由（核心 + **`routers/growth`**）；**`lifespan`** 顺序：环境守卫 → 建库与迁移 → 空库种子 → 演示账号与示例订单 → 并行挂 **爬虫**、**AI SEO 日更**、**推荐分** 三调度协程（后二者默认多由环境变量关闭）；停机时 **cancel** 并 **await** 收尾（见 [手册-B §4.2](./手册-B-架构程序与API索引.md)）。
- **数据库**：默认 SQLite；可选 **`DATABASE_URL`** + **`db_util`** / **`schema.pg.sql`**（**ENG-PG** 须单独验收）。
- **横切**：CORS（**`ALLOWED_ORIGINS`** 或私网正则）、JWT、管理员与用户依赖；公开 SEO 由 **`routers/growth/seo_public.py`** 提供 **`sitemap.xml` / `robots.txt`**。

### 3.2 管理端（`admin/`）

- App Router 页面与 **`admin-api`**、Zustand token；与后端 **`API_PROXY_TARGET`** 代理联调。
- 新增能力方向：**AI SEO**、**爬虫** 等与侧栏入口对应页面（以 [07](./手册-B-架构程序与API索引.md) 为准）。

### 3.3 前台（`frontend/`）

- Vite + React Router；**`VITE_API_BASE`** 等构建期变量；埋点 **`POST /api/track`** 与详情/列表消费公开 API。

---

## 4. 后续维护约定

1. **有 Git 记录后**：在 §2 表尾或新节追加「提交哈希 + 日期 + 一句话」即可，不必重复全文。  
2. **大功能合入**：同步更新 [07](./手册-B-架构程序与API索引.md)、[17](./手册-B-架构程序与API索引.md) 或 [18](./手册-B-架构程序与API索引.md) 中相关段。  
3. **已知缺陷与修复**：见 [20-Bug与修复日志.md](./手册-E-评估与变更日志.md)，并与 [03](./手册-C-开放事项与演进对照.md)、[14](./手册-E-评估与变更日志.md) 交叉维护。

---

## 5. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-04-04 | 首版：基于单提交历史 + 全仓文档与目录归纳。 |
| 2026-04-05 | 对照 **`app/growth`**、**`routers/growth`**、三调度 **lifespan**、**CI** 步骤与 **`.env.example`** 更新 §2 里程碑、§3.1 后端要点与 Bug 表路径。 |


---

# Bug 与修复日志

本文档汇总**已在代码或流程中落实的修复/改进**，以及**文档中登记的已知问题**（含风险与待办）。**Git** 在撰写时无独立「fix」类提交可引用；条目主要来自 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md)、[04-P0安全与联调备忘.md](./手册-A-部署安全-发布与运维.md)、[05-工程优化与运维备忘.md](./手册-A-部署安全-发布与运维.md)、[14-AI-SEO与数据打通评估-项目现存问题.md](./手册-E-评估与变更日志.md)。关闭条目时请在本表标注日期并回写对应需求/开放事项文档。

---

## 1. 已落实的修复与改进（工程行为）

| ID / 主题 | 问题或目标 | 修复或改进摘要 | 参考 |
|-----------|------------|----------------|------|
| **生产 JWT 弱密钥** | 生产使用默认/过短/占位 **`JWT_SECRET`** 导致高风险 | **`ENVIRONMENT=production`** 时 **`enforce_production_secrets()`** 在 lifespan **最先**执行（与 **`production_jwt_secret_ok()`** 同判定），弱/占位则**拒绝启动** | [03](./手册-C-开放事项与演进对照.md) §0.1、`backend/app/env_guard.py` |
| **生产覆盖管理员口令** | 每次启动把已存在管理员密码重置为演示值 | **`ensure_dev_accounts`**：生产对已存在用户**不覆盖** **`password_hash`**（首启插入后仍须立即改密） | [03](./手册-C-开放事项与演进对照.md) §0.1、[04](./手册-A-部署安全-发布与运维.md) |
| **发布回归无自动化抓手** | 人工走查成本高、易漏基础接口 | **`backend/scripts/publish_smoke.sh`** 抽样关键路径；**CI** 起 API 后执行（**不能替代**完整 TC-EXEC） | [03](./手册-C-开放事项与演进对照.md) §0.2、`.github/workflows/ci.yml` |
| **CORS 局域网联调** | 开发机用局域网 IP 访问前后端跨域失败 | **`ALLOWED_ORIGINS` 未设置**时启用 **`allow_origin_regex`** 匹配本机与常见私网段 | [17](./手册-B-架构程序与API索引.md) §4.3、`main.py` **`_cors_allow`** |
| **启动钩子过时** | `on_event` 等旧生命周期不利于异步收尾 | 使用 **`lifespan`**；停机 **cancel** 爬虫调度并 **`await`** 收尾 | [17](./手册-B-架构程序与API索引.md) §4.2 |
| **前端体积与死代码** | 未引用 UI 组件与依赖膨胀 | **BACKLOG-A**：删除零入边组件、精简 **npm** 依赖；**`npm run build`** 验收 | [05](./手册-A-部署安全-发布与运维.md) |
| **`site_json` 迁移覆盖** | 种子升级误覆盖运营已改 JSON | **`migrate`** 对缺键**合并**、**不覆盖**已有键（**`dashboard` / `home_seo`** 等运维约定） | [05](./手册-A-部署安全-发布与运维.md) |
| **P-AI-01** | **`crawler_snapshot`** 与内容爬虫语义混淆 | 新增推荐占位符 **`{{seo_indexing_snapshot}}`**（sitemap/robots）；**`{{crawler_snapshot}}`** 仍为**同内容别名**；默认种子与后台示例模板已改用新名 | `backend/app/growth/ai_insight_service.py`、`backend/app/growth/ai_insight_prompt_defaults.py` |
| **P-AI-02** | 出站官网点击无独立埋点 | **`POST /api/track/outbound`** + 表 **`outbound_click_log`**；详情页点击上报；**`traffic_snapshot`** 内 **`outbound_official_clicks_7d`**（键名历史兼容，同窗 **`traffic_window_days`**）注入 AI 分析 | `track.py`、`analytics_service.py`、`ToolDetailPage.tsx` |
| **P-DOC-01** | **`build_snapshots`** 无自动化验收 | 脚本 **`backend/scripts/ai_insight_snapshots_acceptance.py`**（**`top_pages_7d`** 与 **`page_analytics_rows`** 对账、**P-AI-06** Redis mock）；CI **`backend-py-compile`** 中执行 | `.github/workflows/ci.yml` |
| **P-DOC-02** | 需求 12 §7 与发布脱节 | [12](./手册-D-需求-商业化-AI-SEO-爬虫.md) §7 增补**发布管线**说明（走查 + 验收脚本） | 同上 |
| **SEC-01 / OPS-ENV / ENG-PG 辅助** | 发布前仅靠文档易漏检 | **`backend/scripts/verify_release_env.py`**（生产 **JWT**、**CORS WARN**、**PG SELECT 1**）；**`production_jwt_secret_ok`** 与 **`enforce_production_secrets`** 共用判定；文档 [**21**](./手册-C-开放事项与演进对照.md)；CI **`backend-py-compile`** 调用脚本防回归 | [03](./手册-C-开放事项与演进对照.md) §2.4、[04](./手册-A-部署安全-发布与运维.md) |

---

## 2. 已知问题 / 待修复 / 待决策（登记状态）

以下**非**均已实现修复；关闭时在本表 §3 增加一行并改状态。

### 2.1 安全、部署与工程（与 [03](./手册-C-开放事项与演进对照.md) 一览一致）

**辅助**：[**21**](./手册-C-开放事项与演进对照.md) §1、**`verify_release_env.py`**；**不删除**下表运维责任。

| ID | 类型 | 说明 |
|----|------|------|
| **SEC-01** | 运维必做 | 生产须更换 **`JWT_SECRET`**、演示与管理员口令；代码与脚本仅拦截弱密钥，**不能替代**口令更换 |
| **OPS-ENV** | 部署 | **`ALLOWED_ORIGINS`**、**`VITE_*`** / **`PUBLIC_SITE_URL`**、HTTPS、DB 备份等须按环境验收 |
| **TC-EXEC** | 测试 | 发布前以 [09](./手册-A-部署安全-发布与运维.md) **人工走查**为主 |
| **ENG-PG** | 工程 | 选用 **PostgreSQL** 时 **`DATABASE_URL`**、驱动、迁移与备份须**单独验收** |

### 2.2 AI SEO 与数据产品（见 [14](./手册-E-评估与变更日志.md) §6）

**策略总览**：[**21**](./手册-C-开放事项与演进对照.md) **§2**。

| ID | 简述 |
|----|------|
| **P-AI-03** | 竞品**离线图**不入库；**结构化对标**依赖运营维护 **`site_json.ai_insight_competitor_benchmarks`**（**`{{competitor_benchmark_snapshot}}`**），否则须在提示词手工摘录 |
| **P-AI-04** | 大站仍可能偏差；上限由 **`AI_INSIGHT_PAGE_SEO_MAX_PATHS`** 等环境变量调节，抽样策略为 **热门 + 字典序补足**（见快照 **`page_seo_sample_strategy`**） |
| **P-AI-05** | 独立消息队列/跨 worker 任务迁移仍为后续；同步调用仍有网关风险。**已实现 `defer_llm`**：**HTTP 202** + 进程内 **`BackgroundTasks`** 调 LLM + 管理端轮询；多 worker 时任务仅落在收 POST 的实例 |
| **P-AI-06** | 未设 **`AI_INSIGHT_RATE_LIMIT_REDIS_URL`** 时为**进程内**限流；设 URL 则 **Redis 固定窗口**多实例共享；**`AI_INSIGHT_RATE_LIMIT_WINDOW_SEC`** / **`MAX_CALLS`** 可调；快照 **`ai_insight_snapshot_env_limits`** 镜像生效值；**`ai_insight_snapshots_acceptance`** 已 **mock** 覆盖 Redis 分支（见 §7） |
| **P-AI-07** | **出境发往 LLM** 已产品确认（见 **12 §9**、快照 **`data_residency_and_cross_border`**）；**Markdown 渲染、成本配额**等仍占位，闭合仍待运营/法务 |

### 2.3 控制面与商业化后续

- 见 [03](./手册-C-开放事项与演进对照.md) **§4.2 BACKLOG-CP**、[11](./手册-C-开放事项与演进对照.md)（含 **CP-MONET-RE** 专节）、[10](./手册-D-需求-商业化-AI-SEO-爬虫.md)；**立项门槛**见 [**21**](./手册-C-开放事项与演进对照.md) **§3**。

---

## 3. 修复/状态变更记录（按日期）

| 日期 | ID / 主题 | 动作 |
|------|-----------|------|
| 2026-04-04 | 文档首版 | 建立本日志，归纳 §1 已落实项与 §2 登记项 |
| 2026-04-04 | P-AI-01/02、P-DOC-01/02 | 索引占位符重命名与兼容、出站埋点、快照验收脚本与 CI、需求 12 §7 发布说明；§2.2 收敛为仍开放项 |
| 2026-04-05 | P-AI-03/04/06 文档与限流 env | [14](./手册-E-评估与变更日志.md) §2/§4 与 §2.2 对齐当前实现；限流窗口/次数可环境变量配置并写入快照审计 |
| 2026-04-05 | P-AI-05/07 | `POST /api/admin/ai-insights/run` 支持 **`defer_llm`**（202 + 后台任务）；管理端轮询与详情页 **pending** 自动刷新；开放决策折叠文案 |
| 2026-04-05 | **文档与 §11 对齐** | [12](./手册-D-需求-商业化-AI-SEO-爬虫.md) **§11**、[06](./手册-B-架构程序与API索引.md)、[08](./08-管理后台与SEO控制面.md)、[11](./手册-C-开放事项与演进对照.md)、[03](./手册-C-开放事项与演进对照.md)、[14](./手册-E-评估与变更日志.md)、[18](./手册-B-架构程序与API索引.md) 与已实现的多键 SEO 任务、审计回滚、`code_pr_hint` 行为一致 |
| 2026-04-05 | **21 + verify_release_env** | 新增 [**21**](./手册-C-开放事项与演进对照.md)；**P-AI**/**CP** 立项口径；同步 **03/04/09/11/14**、**`env_guard.production_jwt_secret_ok`**、**CI** |
| 2026-04-05 | **P-AI-07 出境** | 产品确认：**允许** SEO 摘要与聚合流量发往含**境外**的管理员配置 LLM；**`app.growth.ai_insight_service`** 快照值、**`ai_insight_snapshots_acceptance`**、**12 §9**、管理端 **`open_product_decisions`** 折叠文案、**03/21 §2** 表同步 |
| 2026-04-05 | **§7 / P-AI-06 / P-DOC-01** | **`analytics_compare_range`**、摘要 **`traffic_analytics_compare_range`**；验收脚本对账 + **`_assert_redis_rate_limit_mock`**；**§7** 改为已闭环表述 |
| 2026-04-05 | **AI SEO 闭环口径** | 与 **§11** 一致：**分析 → 任务清单 → 人工批准 → apply 自动写 `site_json`**；修正 §1.2、§7.3、§1.2.2/§08 等「不自动改站」易误解表述，区分 **run 不写库** 与 **批准后程序化优化** |
| （待填） | （关闭某条时） | 在表格中标注 **已关闭** 与 PR/提交引用 |

---

## 4. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-04-04 | 首版：与 03/04/05/14 对齐，区分「已落实」与「仍开放」。 |
| 2026-04-05 | **P-AI-07**：出境 LLM 产品确认写入快照与 **12 §9**；§6.1、§2.2、§3 变更日志同步。 |
| 2026-04-05 | §1.2、§2.2、§4.1：对齐 **AI SEO §11**——人工确认后 **apply** 自动优化白名单 SEO；手册 **B §7.3**、**D §1.2.2**、**08** 控制面矩阵同步。 |


---
