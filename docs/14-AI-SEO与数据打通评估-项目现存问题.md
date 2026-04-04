# AI SEO 分析助手与全链路数据打通评估（项目现存问题汇总）

| 项 | 内容 |
|----|------|
| **文档性质** | 对照 PRD、流程图（`product_flow.png`）、竞品流量示意（`traffic_trend.png`）、需求文档 **12**、**08**、**03** 等，对**当前代码与数据流**做静态核对；**未**在本次评估中完成「真实管理员 JWT + 外部大模型」的端到端联调。 |
| **维护** | 关闭条目时在本表标注日期并同步 [03-开放事项总表.md](./03-开放事项总表.md) 相关行。 |

---

## 1. 评估方法说明

1. **代码路径**：`backend/app/ai_insight_service.py`（`build_snapshots`）、`backend/app/routers/admin_ai_insights.py`、`backend/app/analytics_service.py`、`backend/app/routers/track.py`、前台 `ToolDetailPage` 外链行为。  
2. **管理端**：`/admin/ai-seo-insights` 与 `/api/admin/ai-insights/*` 存在且与 [12-需求-AI-SEO与流量分析助手.md](./12-需求-AI-SEO与流量分析助手.md) 描述一致（MVP 范围）。  
3. **未执行**：带生产库或完整种子的 `POST /api/admin/ai-insights/run` 实机调用、token 用量与供应商账单核对。

---

## 2. AI SEO 助手实际注入的数据（与文档 12 对齐）

| 占位符 / 数据块 | 实际来源（库或聚合） | 与需求 12 §3.5 关系 |
|-----------------|----------------------|---------------------|
| `seo_snapshot` | `site_json.page_seo`（最多 50 path 抽样）+ `home_seo` 摘要 | 一致 |
| `seo_indexing_snapshot`（旧名 **`crawler_snapshot`** 同义） | **`seo_sitemap_static`** 与 **`seo_robots`** 的摘要（条数、前 15 path、键名、raw 长度） | 与「索引/抓取配置」语义一致；**P-AI-01** 已引入新名并保留别名 |
| `traffic_snapshot` | `page_view_log` 聚合：`trend_series(7)` + `page_analytics_rows` 近 7 日、按 PV 取前 20 路径 | 一致（脱敏聚合） |
| `site_stats_snapshot` | `dashboard_summary` + `comparison_page` 行数 | 与文档「可选扩展」部分重叠 |

**明确未注入（设计或非目标）**：UGC 原文、单用户标识、竞品第三方流量序列、`crawler_job` / 内容爬虫（PROD-CRAWLER）执行统计、独立「出站点击」事件表。

---

## 3. 与产品流程图（`product_flow.png`）的对照结论

| 流程图节点 | 当前实现侧要点 | 是否进入 AI 快照 |
|------------|----------------|------------------|
| 首页 / 搜索 / 分类 / Alternatives → 详情 | 依赖路由与内容配置；SEO 由 `page_seo` 等控制 | 仅 **page_seo 抽样**，非全站逐页 |
| **记录出站点击并跳转** | 详情页官网为普通 `<a href>`，**未发现**独立写库埋点 API | **否** |
| UGC 评论 / 登录 | 有评论与登录能力；需求 12 声明本期**不包含 UGC 原文** | **否**（符合非目标） |
| 开发者认领 → 审核 → 数据看板 | 开发者侧有 `developer_dashboard_payload`（与 `page_view_log` 按工具 slug 关联） | **否**（AI 快照未单独拉「认领工具」维度） |

**结论**：流程图强调的**出站转化类指标**与 **AI SEO 当前输入**未打通；若产品希望 AI 解读「外链点击效率」，需新增事件采集与快照字段。

---

## 4. 与竞品流量图（`traffic_trend.png`）的关系

- 图中 **TAAFT 月度总访问**为文档/运营参考素材，**未**写入本仓库数据库，也**未**在 `build_snapshots` 中注入。  
- AI 助手**只能**基于本站 `page_view_log` 的 PV/UV 趋势给建议；**无法**自动对比图中曲线，除非运营在提示词中手工粘贴或后续做「外部指标导入」功能。

---

## 5. 各端数据打通矩阵（简表）

| 数据域 | 前台 | 后端表/API | 管理端 Dashboard/Analytics | AI SEO 快照 |
|--------|------|------------|----------------------------|-------------|
| 页面 PV/UV | 需调用 `POST /api/track` | `page_view_log` | 有 | 有（7 日趋势 + Top 路径） |
| 页面级 TDK / noindex | 渲染侧消费配置 | `site_json` | Page SEO 等 | 有（抽样） |
| Sitemap / Robots 配置 | 对外路由读 `site_json` | `site_json` | 站点块编辑 | 有（**`seo_indexing_snapshot`** / 旧 **`crawler_snapshot`**） |
| **内容爬虫**（Feed 导入） | 无 | `crawler_*` | 爬虫页统计 | **无** |
| **出站官网点击** | 直接跳转 | **无专用表** | 开发者仪表盘「点击」列与 **详情路径 UV** 等同源注释，**非**独立外链计数 | **无** |

**说明**：上表「打通」指**数据是否进入同一事实源并可被 AI 读取**；爬虫与 SEO 静态配置、外链点击在三者间**未统一命名或统一模型**。

---

## 6. 项目现存问题清单（本评估汇总）

### 6.1 AI SEO 与数据产品

| ID | 问题 | 影响 | 建议方向 |
|----|------|------|----------|
| **P-AI-01** | （**已落实**，见 [20](./20-Bug与修复日志.md) §1）曾用名 `crawler_snapshot` 易与 **内容爬虫** 混淆 | — | 现推荐 **`{{seo_indexing_snapshot}}`**；**`{{crawler_snapshot}}`** 仍为同内容别名；可选后续增加 **`content_crawler_stats`** |
| **P-AI-02** | （**已落实**，见 [20](./20-Bug与修复日志.md) §1）曾缺独立出站埋点 | — | **`POST /api/track/outbound`**、**`outbound_click_log`**、**`traffic_snapshot.outbound_official_clicks_7d`** |
| **P-AI-03** | 竞品流量（如 `traffic_trend.png`）**纯离线**，未结构化进库 | AI 无法做「对标 TAAFT」量化结论 | 手工在提示词引用或立项「竞品指标」配置表 |
| **P-AI-04** | `page_seo` 仅 **50 path**、热门路径仅 **7 日 / 20 条**，大站可能偏差 | 分析遗漏长尾或长周期 | 快照已标注 **`sorted_path_keys_first_50`**；仍建议按 token 预算可配置或分层抽样 |
| **P-AI-05** | 需求 **F-10** 异步 **202** 仍为后续里程碑；当前为**同步**长请求 | 网关/浏览器超时风险 | 快照 **`snapshot_limits_and_caveats`** 已提示；仍须 UI 超时说明与合理 **`timeout_sec`** |
| **P-AI-06** | 限流 `check_ai_insight_rate_limit` 为**进程内**；多 worker 不共享 | 集群下可能被放大调用 | 快照已登记；生产多实例须 **Redis** 等分布式限流 |
| **P-AI-07** | 需求 **§9** 开放问题（出境、输出 Markdown、成本）仍属**产品决策** | 合规与渲染策略未闭合 | 快照已登记 **`open_product_decisions`**；仍须立项评审 |

### 6.2 已在他处登记的工程与发布项（避免重复造表）

以下以 [03-开放事项总表.md](./03-开放事项总表.md) **第 1 节一览**为准，**仍为现存事项**：

- **SEC-01 / OPS-ENV**：生产密钥、源站、HTTPS、备份等。  
- **TC-EXEC**：发布前人工走查为主。  
- **ENG-PG**：选用 PostgreSQL 时的环境级验收与备份演练。

控制面演进与商业化后续见 **03** 第 4.2 节与 [11-控制面演进需求-CP-BACKLOG.md](./11-控制面演进需求-CP-BACKLOG.md)、[10-需求-商业化与订单.md](./10-需求-商业化与订单.md)。

### 6.3 文档与验收

| ID | 问题 | 说明 |
|----|------|------|
| **P-DOC-01** | （**已落实**）**`scripts/ai_insight_snapshots_acceptance.py`** + CI | 见 [20](./20-Bug与修复日志.md) §1 |
| **P-DOC-02** | （**已落实**）需求 **12** §7 增补发布管线说明 | 与 **03** TC-EXEC 一并执行走查 |

---

## 7. 建议的后续验证步骤（可选）

1. 本地或预发：管理员登录后执行一次 `POST /api/admin/ai-insights/run`，核对返回文本与 `ai_insight_run.input_payload_summary` 中 `page_seo_paths_included` 等字段。  
2. 抽样对比：管理端 Analytics 某路径 PV 与快照中 `top_pages_7d` 是否一致（同日、同库）。  
3. 若启用多 worker：压测验证 AI 限流是否符合预期，并记录 **P-AI-06** 风险。

---

## 8. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-04-04 | 首版：静态代码与文档对照，输出现存问题与打通矩阵。 |
| 2026-04-04 | 同步 P-AI-01/02、P-DOC-01/02 落实说明；P-AI-04～07 补充快照侧提示与仍开放项。 |
