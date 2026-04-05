# 手册 D：需求 — 商业化、AI SEO、内容爬虫

本文档由原 **10 / 12 / 13** 合并。

---

# 需求文档：商业化曝光与订单体验（PROD-MONET）

| 项 | 内容 |
|----|------|
| **需求 ID** | PROD-MONET |
| **状态** | **v1 已落实**（弱曝光 + 订单详情）；强曝光/续购为可选后续 |
| **优先级** | 待规划（见 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) 一览表） |
| **关联待办** | [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) **§4.1**、**§4.2（CP-MONET-RE）**；控制面矩阵见 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) 订单相关行 |

---

## 1. 背景与目标

站点已具备 **管理端商业化订单**（`monetization_order`、**`/admin/monetization`**）与 **登录用户个人中心订单列表**（**`GET /api/me/orders`**）。  
**v1 前**曾在 PRD 层待定的两点（**曝光边界**、**订单详情/续购**）已在 **§6 决策记录** 与 **§8 实现说明** 中闭合；下文 **§2～§5** 保留为**讨论骨架与验收口径**，便于对照「当初选项」与后续强曝光/续购工单。

本文档用于 **产品决策与研发拆单**；一览表 **PROD-MONET** 已随 v1 关闭，归档结论见 **§6**；与待办总表的交叉引用见 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) **§4.1**。

---

## 2. 需求范围摘要（对应一览表「简述」）

| 维度 | 说明 |
|------|------|
| **商业化曝光边界** | 明确 **匿名 / 列表 / 详情 / 对比 / 首页** 等是否露出推广相关信息，以及露出时的 **文案、标识、数据来源**。 |
| **订单体验深度** | **v1**：已上 **单笔订单详情**（**`GET /api/me/orders/{order_id}`**、**`/orders/:orderId`**）；**续期 / 再次购买** 仍为后续可选。 |

---

## 3. 现状与实现差异

### 3.1 能力对照表（与当前代码对齐，v1）

| 角色 | 当前能力 | v1 未做（后续工单） |
|------|----------|---------------------|
| **已登录用户** | 个人中心 **`GET /api/me/orders`** 列表；行可进 **`/orders/:orderId`**；**`GET /api/me/orders/{order_id}`** 单笔详情（404 `not_found` 防枚举） | **续购 / 再次下单** 入口与流程 |
| **管理端** | **`/admin/monetization`**：订单列表、状态 **PATCH**，与 **`monetization_order`** 一致 | — |
| **匿名访客** | **无** 订单区；**弱曝光**：**工具详情**、**对比落地页** 通过 **`promotion_active`** 展示「付费推广 / Promoted」（规则同 §6） | **强曝光**（首页/分类插卡等）见 §6 备注与 §4.2 |

### 3.2 数据与后台约定

- 订单权威数据：**`monetization_order`**；管理端 **Monetization** 为运营真相源。  
- 若前台展示「推广中」等状态，须与 **`payment_status`、有效期** 等字段 **一致**，避免与后台操作结果冲突。

---

## 4. 待拍板项与建议顺序

建议 **先原则后形态**，便于合规与研发同步：

### 4.1 合规与话术（优先）

- 付费推广是否纳入 **广告 / 赞助** 合规表述。  
- 列表、详情、对比等位置是否需要 **固定文案或图标**（如「推广」「赞助」）。  
- **隐私政策 / 用户协议 / 联系入口** 是否需覆盖 **商业合作、推广投放** 说明。

### 4.2 匿名侧曝光策略（三选一或组合，需书面选定）

| 档位 | 描述 | 典型工程与运营影响 |
|------|------|---------------------|
| **零曝光** | 保持现状：匿名侧不展示推广相关模块；仅登录用户在自己个人中心看到自有订单 | 无新增前台展示逻辑 |
| **弱曝光** | 仅在 **工具详情** 或 **对比页** 等展示「推广中」等标签 | 需可信数据（如 `paid` + 未过期）；只读 API 或详情接口扩展字段 |
| **强曝光** | **首页 / 分类** 插卡、固定广告位等 | 运营规则、排序、频控、防刷；工程量与合规成本显著升高 |

**输出物**：在 PRD 或会议纪要中 **写明选定档位**；可选组合须列出 **页面清单与优先级**。

### 4.3 订单体验深度（二选一或扩展，需书面选定）

| 选项 | 描述 | 可能的后端/前端工作 |
|------|------|---------------------|
| **维持列表** | 个人中心列表满足「是否付款、是否在约」 | 无单笔详情 |
| **订单详情** | 独立详情页或抽屉 | 定义展示字段（发票/合同若线下处理可极简）；可能新增 **`GET /api/me/orders/{id}`** 或列表项内嵌 `detail`；可选 **续期 / 再次购买** 入口与流程 |

### 4.4 与后台一致性（约束，非可选讨论）

- 凡前台展示的推广状态，必须与 **`monetization_order`** 及 **Monetization** 后台配置 **同源、同规则**。  
- 状态或有效期变更后，前台展示 **刷新策略**（实时拉取 / 短缓存）需在实现阶段定义。

---

## 5. 验收与关闭条件

**v1**：以下第 1 点已由 **§6 决策记录** 满足；第 2 点对应开发已上线（见 **§8**）。  

满足以下 **全部** 条件，视为本需求在「待办」层面可关闭：

1. **§4.2** 与 **§4.3** 在 **PRD 或会议纪要** 中已 **二选一或多选组合** 写清（含「不做」的 **显式否定**，例如：「不做匿名曝光」「不做订单详情页」）。  
2. 若存在开发项：对应版本 **已上线** 或通过 **书面决定推迟** 并另立工单（本 ID 仍可按维护约定从总表移除，结论归档本文档 **§6**）。

---

## 6. 决策记录

| 日期 | 决策内容 | 决策人/出处 | 备注 |
|------|----------|-------------|------|
| 2026-04-04 | **匿名侧曝光**：采用 **弱曝光**——仅在 **工具详情**、**对比落地页** 展示推广标识；**不做**首页/列表强插卡（**零曝光**于首页工具流） | 工程迭代（对齐 PRD §4.2） | 数据规则：`payment_status=paid` 且 `valid_from`≤今日≤`valid_until`，与 **`monetization_order`** 一致 |
| 2026-04-04 | **订单体验**：在列表外增加 **单笔详情**——**`GET /api/me/orders/{order_id}`** + 前台 **`/orders/:orderId`**；**不做**续购/再次下单入口（线下或后续工单） | 同上 | 404 统一 `not_found`（防枚举） |
| 2026-04-04 | **合规与话术**：详情/对比使用文案「付费推广 / Promoted」及一行说明；**未**改独立隐私政策模板，由运营在 **`site_json`** 维护 | 同上 | 对比页工具通过 **展示名 = `tool.name`** 关联库内工具，名不一致则无标 |

---

## 7. 相关接口与页面索引（实现参考）

| 类型 | 路径或说明 |
|------|------------|
| 用户订单列表 | `GET /api/me/orders`（须登录） |
| 用户订单单笔 | `GET /api/me/orders/{order_id}`（须登录，本人） |
| 管理端订单 | `GET/PATCH /api/admin/monetization/orders*` |
| 前台个人中心 | `ProfilePage` 内「推广订单」列表；行链至 **`/orders/:orderId`** |
| 工具详情弱曝光字段 | `GET /api/tools/{slug}/detail` → **`promotion_active`** |
| 对比页弱曝光 | `GET /api/comparisons/{slug}` → **`mainTool.promotion_active`**、**`alternatives[].promotion_active`** |
| 数据表 | `monetization_order`（与 `tool`、`app_user` 关联） |

详细 REST 列表见 [06-API接口参考.md](./手册-B-架构程序与API索引.md)。

---

## 8. 实现说明（代码位置）

| 模块 | 路径 |
|------|------|
| 推广判定（日期 + paid） | `backend/app/promotion_util.py`（**`tool_has_active_promotion`**、**`tool_id_by_display_name`**） |
| 详情接口补字段 | `backend/app/routers/tools.py`（**`promotion_active`**） |
| 对比 JSON  enrichment | `backend/app/routers/comparisons.py` |
| 单笔订单 API | `backend/app/routers/user_orders.py`（**`GET /me/orders/{order_id}`** 须注册在列表路由旁） |
| 详情页 Badge | `frontend/src/app/pages/ToolDetailPage.tsx` |
| 对比卡 Badge | `frontend/src/app/pages/ComparisonPage.tsx` |
| 订单详情页与路由 | `frontend/src/app/pages/OrderDetailPage.tsx`、`frontend/src/app/routes.tsx`（**`/orders/:orderId`**） |
| 个人中心入口 | `frontend/src/app/pages/ProfilePage.tsx` |

---

*一览表 **PROD-MONET** 已随 v1 关闭；归档与后续迭代以本文档为准。*


---

# 需求文档：管理端 AI SEO 与流量分析助手（PROD-AI-SEO）

| 项 | 内容 |
|----|------|
| **需求 ID** | **PROD-AI-SEO** |
| **BACKLOG 编号** | **CP-AI-SEO**（见 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) **§4.2**、[11-控制面演进需求-CP-BACKLOG.md](./手册-C-开放事项与演进对照.md)） |
| **状态** | **MVP 已落地**；**§11 配置面写库与审计**已落地（多键 **`site_json`**、**`ai_insight_seo_apply_audit`**、回滚 API；源码类 **PR/CI**）；§8 后续里程碑仍有效 |
| **优先级** | 建议 **P2**（运营增效类；依赖外部大模型 API 与成本预算） |
| **关联能力** | 管理端已有 **Dashboard / Analytics**（只读统计）；**一键分析**产出只读报告正文；**§11** 在管理员 **批准** 后 **应用（apply）** 才写入白名单 **`site_json`**（**`page_seo` / `home_seo` / `seo_robots`**），**无批准不写库**；**源码侧建议**仅 **`code_pr_hint`** 展示，**禁止**通过管理 API 写 Git/源码树，须 **PR/CI** |

---

## 1. 背景与目标

### 1.1 背景

站点已具备 **页面级 SEO 配置**（Page SEO、`home_seo`、站点 JSON 等）与 **管理端流量/大盘只读数据**（`analytics_service` 等）。运营与产品希望在**不离开管理后台**的前提下，基于**当前可得的 SEO 与流量摘要**，获得大模型生成的**可读文字建议**（标题优化方向、落地页缺口、流量异常解读等），以辅助排期与迭代决策。

### 1.2 目标（可验收）

1. **一键分析**：管理员在专用后台页点击「开始分析」等按钮，系统在服务端**组装提示词与结构化数据**，调用**可配置的大模型 HTTP API**，将返回的**纯文本**展示给操作者（并可落入历史记录）。
2. **可配置提示词**：支持在后台维护至少一套**系统/任务说明**与**用户消息模板**（或等价：主提示词 + 占位符说明），便于迭代分析角度而无需发版（具体形态见 **§4.2**）。
3. **可配置大模型**：支持配置 **API 基址、模型名、鉴权方式（如 Bearer API Key）**、超时与可选参数（如 `temperature`）；密钥**不得**明文回显给前端（见 **§5.1**）。
4. **分析记录清单与详情**：每次分析生成一条**记录**（时间、操作者、所用提示词/模型快照、输入摘要、完整输出文本等）；列表可浏览，**点击行或「查看详情」**进入详情页/抽屉阅读全文。

### 1.3 非目标（本期不做或另立需求）

- **不**在**无显式管理员审批**的前提下，由系统自动 **apply** 修改 `site_json`、工具表或 SEO 配置。**§11** 已实现「报告 → 结构化任务 → **批准** → **应用**」；自动写库仅限白名单键，且 **apply** 前须 **`draft` → `approved`**（见 **§11**）。**审计与回滚**已落表 **`ai_insight_seo_apply_audit`**。
- **不**承诺特定供应商（OpenAI、Azure、国产云、私有化网关等由实现阶段按 **§6** 抽象接入）。
- **不**将完整分析能力暴露给匿名访客或普通登录用户（**仅管理员**）。

---

## 2. 角色与典型场景

| 角色 | 场景 |
|------|------|
| **管理员** | 周会前点击「分析」，快速拿到对当前 SEO 配置与近端流量数据的文字解读与行动清单。 |
| **管理员** | 调整提示词模板（例如强调「国际化」「转化」），再次分析，对比历史记录中的输出差异。 |
| **超级管理员 / 运维** | 轮换 API Key、切换模型名或网关地址；排查某次分析失败原因（错误码、超时记录在详情或日志中）。 |

---

## 3. 功能需求

### 3.1 分析触发与结果展示

| 编号 | 需求描述 | 验收要点 |
|------|----------|----------|
| **F-01** | 管理端提供**专用入口**（建议路径 **`/admin/ai-seo-insights`**，最终以侧栏菜单为准）。 | 仅 **`role === admin`** 且已登录可访问；非管理员 403。 |
| **F-02** | 页面提供**主操作按钮**（如「开始分析」）；点击后向后端发起**单次分析任务**。 | 请求在途时按钮禁用或显示 loading；防止重复连点（前端节流 + 后端幂等或排队策略二选一，见 **§7**）。 |
| **F-03** | 分析成功后，在页面**显著区域**展示模型返回的**纯文本**（支持换行、代码块可选后续增强；MVP 可为 `<pre>` 或 markdown 仅当产品明确要求）。 | 返回体为 UTF-8 文本；超长内容可折叠，**详情页展示全文**（与 **F-07** 一致）。 |
| **F-04** | 分析失败时展示**可读错误**（网络超时、供应商 4xx/5xx、本服务端校验失败），不暴露密钥。 | 与现有管理端错误展示风格一致；可选「复制错误 ID」便于运维对照日志。 |

### 3.2 提示词配置

| 编号 | 需求描述 | 验收要点 |
|------|----------|----------|
| **F-05** | 后台可维护**至少一条**「分析配置」关联的提示词：例如 **系统消息** + **用户消息模板**，其中用户模板允许占位符（如 `{{seo_snapshot}}`、`{{seo_indexing_snapshot}}`（sitemap/robots，旧名 `{{crawler_snapshot}}` 仍兼容）、`{{traffic_snapshot}}`），由服务端替换为实际 JSON 或表格化文本。 | 保存前校验占位符与注入数据字段一致；保存后**立即**对后续分析生效。 |
| **F-06** | 支持**多条提示词配置**（如「SEO 专项」「流量专项」「综合」），分析前可在 UI **下拉选择**当前使用的配置；或提供**默认配置**标记。 | 记录中保存所用配置的 **ID 与版本/内容快照**（见 **F-07**），避免事后配置变更导致无法解释历史输出。 |
| **F-07**（与记录重叠） | 每次分析持久化：**所用提示词快照**（或哈希 + 可还原正文）、**模型配置快照**（不含密钥）。 | 详情页可完整查看当时提示词与输出。 |

### 3.3 大模型连接配置

| 编号 | 需求描述 | 验收要点 |
|------|----------|------|
| **F-08** | 可配置项至少包括：**API Base URL**、**Model**、**API Key**（或引用环境变量名，见 **§5.1**）、**请求超时（秒）**。 | Key 仅写入服务端安全存储；管理 UI **回显为掩码**；更新 Key 需确认操作。 |
| **F-09** | 支持可选 **HTTP Header 自定义**（如部分网关要求额外头）或「兼容 OpenAI Chat Completions JSON 体」的适配层，以降低首版集成成本。 | 文档中写明默认适配器契约；若供应商差异大，通过插件式 `provider` 字段扩展。 |
| **F-10** | 服务端调用须**异步友好**：长耗时请求可返回 **202 + 任务 ID** 轮询，或 SSE/WebSocket（可选）；MVP 允许同步阻塞 + 较长超时，但须在 UI 明确「可能需要数十秒」。 | 与 **F-04** 错误处理一致；超时时间可配置。 |

### 3.4 分析记录：清单与详情

| 编号 | 需求描述 | 验收要点 |
|------|----------|----------|
| **F-11** | **记录列表**：分页展示历史分析（时间倒序）；列至少含：**时间**、**操作者**、**配置名称**、**模型名**、**状态**（成功/失败）、**摘要**（输出前 N 字或失败原因摘要）。 | 支持按时间范围筛选（可选 P1）；默认仅本站数据隔离。 |
| **F-12** | **记录详情**：点击列表行进入详情（独立路由或抽屉）。展示：**完整输出文本**、**失败时的错误信息**、**提示词快照**、**注入数据的结构化摘要**（可折叠 JSON）、**请求耗时**、**token 用量**（若供应商返回则记录，否则可空）。 | 详情页仅管理员；URL 带 ID 时未授权不可见。 |
| **F-13** | **删除与保留**（产品可选）：支持单条删除或管理员清空测试数据；或仅软删除。 | 与审计、合规策略一致；默认建议**保留 90 天**可配置（实现阶段定）。 |

### 3.5 输入数据范围（SEO + 流量）

以下数据由**服务端**在分析时拉取并序列化为文本/JSON 注入提示词，**不**由前端手工粘贴核心业务数据（避免篡改与泄露）。

| 数据类 | 建议来源（与现有仓库对齐） | 说明 |
|--------|----------------------------|------|
| **页面 SEO 摘要** | `site_json.page_seo` 关键 path 的 title/description/noindex 等截断列表；`home_seo` 品牌与关键词 | 控制 token：可配置最多 path 条数与单字段最大长度 |
| **爬虫与索引** | `seo_sitemap_static`、`seo_robots` 摘要（非全文时可截断） | 辅助发现 disallow / sitemap 异常 |
| **流量与大盘** | 管理端已有统计 SQL / API 的**聚合结果**（如近 7/30 日 PV、热门路径） | 须脱敏：不含个体用户标识；仅聚合指标 |
| **可选扩展** | 工具数量、分类分布、对比页 slug 列表等 | P2：按产品需要增量加入快照 |

**约束**：注入前做 **token 预算**（字符数或估算 token）；超限时截断并提示模型「数据已截断」。

---

## 4. 非功能需求

### 4.1 安全与密钥

- **API Key** 仅存服务端：环境变量优先，或加密字段（库内）；**禁止**下发给浏览器、**禁止**写入前端 bundle。
- 管理接口全部 **`get_current_admin`** 鉴权；审计日志记录 **who / when / config_id**（可选落库或结构化日志）。
- 输出内容可能包含对公开页面的推断，**仍属内部运营资料**，默认不对外 API 暴露。

### 4.2 可用性与性能

- 供应商不可用时，**F-04** 明确提示；支持**重试**策略（仅对幂等安全错误，如 429 退避）。
- 单管理员并发分析次数可限流（如每用户每 5 分钟 3 次），防止误操作刷爆成本。

### 4.3 合规与成本

- 在 UI 或文档中提示：**调用外部模型可能产生费用**；建议生产环境配置预算告警（运维层，非本仓库必选）。
- 若使用用户生成内容作为上下文（本期默认**不包含 UGC 原文**），须另评审隐私政策。

---

## 5. 接口与数据模型（研发草案）

以下为**拆单参考**，命名与路径以实现阶段 **`06-API接口参考.md`** 为准。

### 5.1 建议 REST 形态（管理员）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/ai-insights/configs` | 提示词配置列表（不含密钥） |
| `PUT` | `/api/admin/ai-insights/configs/{id}` | 创建/更新配置 |
| `GET` | `/api/admin/ai-insights/provider` | 大模型连接配置（密钥掩码） |
| `PUT` | `/api/admin/ai-insights/provider` | 更新连接配置 |
| `POST` | `/api/admin/ai-insights/run` | 触发一次分析（body：`config_id`、可选 `snapshot_options`） |
| `GET` | `/api/admin/ai-insights/runs` | 记录列表（分页） |
| `GET` | `/api/admin/ai-insights/runs/{id}` | 记录详情 |
| `DELETE` | `/api/admin/ai-insights/runs/{id}` | 可选，删除记录 |

### 5.2 表结构草案（SQLite / PG 通用）

- **`ai_insight_prompt_config`**：`id`、`name`、`system_prompt`、`user_prompt_template`、`is_default`、`created_at`、`updated_at`
- **`ai_insight_llm_provider`**：多行；`name`、`base_url`、`model`、`api_key` / `api_key_env_name`、`timeout_sec`、`extra_headers_json`、**`is_default`**（仅一条为默认启用，分析可传 `provider_id` 覆盖）
- **`ai_insight_run`**：`id`、`admin_user_id`、`prompt_config_id`、`prompt_snapshot`、`provider_snapshot`、`input_payload_summary`、`status`、`output_text`、`error_message`、`duration_ms`、`tokens_in`、`tokens_out`、`created_at`

索引：`ai_insight_run(created_at DESC)`、`ai_insight_run(admin_user_id)`。

### 5.3 迁移与种子

- 新增表由 **`migrate`** 或现有建表机制追加；可选种子：**一条默认提示词模板**（中文说明 + 英文模型友好结构均可产品定稿）。

---

## 6. 管理端 UI 草案

| 页面/区域 | 内容 |
|-----------|------|
| **分析主页** | 选择提示词配置、展示最近一次结果、「开始分析」、跳转历史列表 |
| **提示词配置** | 子页或 Tab：列表 + 编辑表单（系统/用户模板、占位符说明） |
| **大模型设置** | 子页或 Tab：Base URL、Model、Key（掩码）、超时 |
| **历史记录** | 表格 + 详情抽屉/子路由 |

**导航**：在 **`admin_settings.admin_menu_items`** 增加一项（`migrate` 幂等补菜单与 i18n 键），与现有 **Dashboard**、**Page SEO** 并列。

---

## 7. 验收清单（产品走查）

- [ ] 非管理员无法访问上述页面与 API。
- [ ] 点击分析后能看到**纯文本建议**；失败时有明确提示且无密钥泄露。
- [ ] 提示词与模型配置保存后，下一次分析**使用新配置**；历史详情中**仍能看到旧快照**。
- [ ] 历史列表与详情**可读、可检索基本字段**（至少按时间浏览）。
- [ ] 注入数据与现有 SEO/流量源**一致**（抽样对比管理端已有报表）。

**发布管线（P-DOC-02）**：每次发版合并前须完成上表勾选项；并在 **`backend/`** 下执行 **`PYTHONPATH=. python scripts/ai_insight_snapshots_acceptance.py`**（与 CI **`backend-py-compile`**  job 中同名步骤一致），确保 **`build_snapshots`** JSON 结构与占位符白名单未回归。

---

## 8. 里程碑建议

| 阶段 | 内容 |
|------|------|
| **MVP** | 单提示词 + 单 provider（OpenAI 兼容 API）+ 同步 `POST /run` + 列表/详情 + 密钥环境变量 |
| **v1.1** | 多提示词配置、快照字段完善、限流与 token 统计展示 |
| **v1.2** | 异步任务队列、多供应商适配器、保留策略与导出 |
| **§11（已落地）** | **已验证与代码一致**：成功分析 run → **`POST /api/admin/ai-insights/runs/{id}/seo-tasks/generate`** 生成 **`ai_insight_seo_task`（`draft`）** → 管理端 **批准** → **`POST .../seo-tasks/{id}/apply`** 仅合并写入白名单 **`site_json`**（**`page_seo` / `home_seo` / `seo_robots`**），并经 **`site_json_payload_validate`**；**`code_pr_hint`** 调用 apply 返回 **`code_pr_hint_no_auto_apply`**——**代码变更只能走 PR/CI**，**禁止**本功能通过 API 改写仓库或服务器源码树 |
| **v2.x（部分已落地）** | **异步 pending**：仍用 **`defer_llm` + BackgroundTasks**；另提供 **`backend/scripts/ai_insight_pending_worker.py`** 轮询 `pending` 与 API 内逻辑一致（多实例运维入口）。**多供应商适配器**：`ai_insight_llm_provider.adapter`（当前仅 **`openai_compatible`**，经 **`llm_adapter_dispatch`** 调用）。**二次确认**：`AI_INSIGHT_STEP_UP_MODE` + 共享口令或登录密码；**批准 / apply / rollback** 走 **`StepUpOptionalBody`**。**配置多版本**：表 **`site_json_content_revision`** + **`GET /api/admin/ai-insights/site-json-revisions`**。仍属路线图的项：**Celery/RQ 级队列**、**Anthropic 等非 OpenAI 兼容适配**、通用 **`site_json` 全键**修订 UI 等（见 **§11**） |

---

## 9. 开放问题与已确认项

1. **供应商与数据出境**：**已确认（产品）**——**允许**将**站点 SEO 摘要**与**聚合流量**（本功能注入提示词的快照范围）发往管理员在「大模型连接」中配置的 **API endpoint**，**包括境外供应商**；运营仍可自行选用国内或私有化网关。若特定部署地、客户合同或监管另有约束，**以当地法务/合规书面结论为准**。快照字段 **`open_product_decisions.data_residency_and_cross_border`** 已与实现对齐（见 **`ai_insight_service.build_snapshots`**）。
2. **输出格式**：是否强制「纯文本」还是允许轻量 Markdown（影响 XSS 与渲染组件选型）——**仍为开放**（快照内 **`model_output_format`** 仍为占位语义）。
3. **成本归属**：按调用次数计费还是包月；是否需在记录中展示估算费用——**仍为开放**（快照内 **`cost_quota_and_retention`** 仍为占位语义）。

---

## 10. 文档维护

- 立项后：将 **CP-AI-SEO** 状态从「待立项」改为「进行中/已落地」，并同步 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) **§4.2**、[11-控制面演进需求-CP-BACKLOG.md](./手册-C-开放事项与演进对照.md)、[08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) 矩阵。
- 接口定稿后：在 [06-API接口参考.md](./手册-B-架构程序与API索引.md) 增补本节路径与鉴权说明。
- **扩展 §11**（新 `kind`、二次密码、多版本历史等）时：同步 [11-控制面演进需求-CP-BACKLOG.md](./手册-C-开放事项与演进对照.md) **CP-AI-SEO** 缺口描述，并更新 **§11「已落地 / 仍为后续」** 分界。

---

## 11. 报告 → 结构化 SEO 任务 → 审批 → 白名单写库（**已落地，已核对实现**）

> **验证结论（与当前后端一致）**：流水线为 **成功 `ai_insight_run`** → **`POST .../runs/{run_id}/seo-tasks/generate`**（二次 LLM 抽取任务，落库 **`draft`**）→ **`POST .../seo-tasks/{task_id}/approve`** → **`POST .../seo-tasks/{task_id}/apply`**（仅 `approved`）。
> **`apply`** 仅当 **`kind`** 为 **`page_seo_patch` / `home_seo_patch` / `seo_robots_patch`** 时写入对应 **`site_json`**，并经 **`site_json_payload_validate`**。**`code_pr_hint`** 禁止 apply（`400` **`code_pr_hint_no_auto_apply`**），须 **PR/CI**。成功 apply 记 **`ai_insight_seo_apply_audit`**，可 **`POST .../seo-apply-audits/{audit_id}/rollback`**。**v2.x 已落地**：**`site_json_content_revision`** 修订表；**`adapter`** 字段 + **`call_llm_chat_for_provider`**；环境 **`AI_INSIGHT_STEP_UP_*`** 二次确认；**`ai_insight_pending_worker`**。**仍为后续**：独立消息队列产品形态、更多 LLM 协议、全站 JSON 块修订产品化等。
> **§9 已确认**：SEO 摘要与聚合流量**可发往境外模型**（**`open_product_decisions.data_residency_and_cross_border`**）；**输出形态、成本配额**见 **§9** 与快照其余键。

### 11.1 目标与边界

1. **目标（已实现）**：在 **`ai_insight_run` 成功**且 **`output_text` 非空**时，可生成结构化 **SEO 任务**（表 **`ai_insight_seo_task`**）；**每条任务须先经管理员「批准」再「应用」**，才写入允许的 **`site_json`**；**非白名单 `kind` 或校验失败**记 **`failed`** / `error_message`，不写库。
2. **审批硬门槛（已实现）**：状态机 **`draft` → `approved` → `applied`**（及 **`rejected` / `failed`**）；**未 `approved` 的 `apply` 返回 `not_approved`**。**环境二次确认（v2.x）**：若设置 **`AI_INSIGHT_STEP_UP_MODE=shared_secret`** 且配置 **`AI_INSIGHT_STEP_UP_SHARED_SECRET`**，或 **`login_password`** 模式，则 **批准 / apply / rollback** 须在请求体携带对应字段（管理端详情页已展示输入框）。**批量勾选批准**等仍为产品可选项。
3. **「配置面 / 代码面」分层（已实现 + 工程纪律）**：
   - **配置面**：仅 **`page_seo` / `home_seo` / `seo_robots`** 三键可由 **apply** 合并写入（与 **`site_json_payload_validate`** 一致）；另支持 **`POST .../runs/{id}/seo-tasks`** 手工插入 **`page_seo_patch` 草案**（与 Page SEO 同源清洗）。
   - **代码面**：**`code_pr_hint`** 仅承载建议载荷；**运行时 API 不修改源码树**——**须走 PR/CI**。若未来增加其他 `kind`，**默认不得**映射到文件系统或 Git；新增可写键须**显式设计**并更新白名单与校验。

### 11.2 用户旅程（与现网 UI 对齐）

1. 管理员在 **`/admin/ai-seo-insights`** 执行分析，成功记录进入 **`/admin/ai-seo-insights/runs/[id]`**。  
2. 在详情页 **「从报告生成任务」**（调用 **generate**）：服务端 LLM 抽取 JSON 数组，写入多条 **`draft`** 任务（含 `page_seo_patch` / `home_seo_patch` / `seo_robots_patch` / `code_pr_hint` 等模型产出类型）。  
3. 对单条任务 **「批准」** 后 **「应用」**：可写 `kind` 合并进 **`site_json`**；**`code_pr_hint`** 无应用按钮或 apply 被拒，**仅复制/人工开 PR**。  
4. 详情页 **审计列表**展示 apply 记录；在条件允许时 **回滚** 到 apply 前快照。  
5. **`reject`** 可将 `draft` 或 `approved` 标为 **`rejected`**（已 `applied` 的撤销以 **rollback** 为准，非删除任务）。

### 11.3 数据模型（与迁移/代码一致）

- 表 **`ai_insight_seo_task`**：`id`、`source_run_id`（**`ai_insight_run`**）、**`kind`**（**`page_seo_patch`** / **`home_seo_patch`** / **`seo_robots_patch`** / **`code_pr_hint`** 等）、`title`、`payload_json`、`status`（**`draft` / `approved` / `applied` / `rejected` / `failed`**）、`approved_by_admin_user_id`、`approved_at`、`applied_at`、`error_message`、`created_at`、`updated_at`（见 **`migrate.py`**）。  
- 表 **`ai_insight_seo_apply_audit`**：`source_run_id`、`task_id`、`content_key`、`before_payload_json`、`after_payload_json`、`applied_by_admin_user_id`、`created_at`、`rolled_back_at`。  
- 表 **`site_json_content_revision`（v2.x）**：每次 **apply** 与 **rollback** 成功后追加一行整包 **`payload_json`**，含 **`source`**（`ai_insight_apply` / `ai_insight_rollback`）与 **`ref_json`**（`audit_id`、`task_id` 等）。  
- 与 **`ai_insight_run` 多对一**（一次报告多条任务）。

### 11.4 验收与安全要点

- **权限**：非管理员不可访问 **admin ai-insights** 路由与 API（与全站 admin 鉴权一致）。  
- **审计**：每次成功 apply 可追溯 **run_id、task_id、操作者、content_key、前后整包 JSON**；与 **§4.1** 密钥与操作留痕要求一致。  
- **源码树**：**禁止**将本功能的 **apply** 扩展为「写仓库/改 `.tsx`」等；**`code_pr_hint`** 为**唯一显式代码向出口**，且**仅人经 PR/CI 合并**。  
- **建议 E2E**：run（success）→ generate → approve → apply → **`GET /api/site/*` 或管理端** 可见配置变化 → rollback 烟测。  
- **`open_product_decisions`**：**出境发往 LLM** 已按 **§9** 产品确认并写入快照；**输出形态、成本配额**等仍待运营/法务闭合；**不等于**撤回已实现的审批写库机制。


---

# 需求：内容侧数据采集爬虫与后台可操作（PROD-CRAWLER）

本文定义**面向前台内容展示**的数据采集范围，以及**在管理后台可配置、可触发、可审计**的爬虫能力。实现时应与现有库表（见 `backend/sql/schema.pg.sql` / `schema.sql`）、公开 API（`GET /api/tools*`、`/api/categories`、`/api/search-suggestions`、`/api/site/*` 等）及 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) 分工对齐。

---

## 1. 目标与原则

| 项 | 说明 |
|----|------|
| **业务目标** | 从合规来源批量补齐或更新「工具目录」及关联内容，降低人工录入成本，并与现有审核流（`tool.moderation_status`）衔接。 |
| **产品原则** | 爬虫**产出可写入本库定义的数据结构**；默认**不自动覆盖已发布内容** unless 管理员显式策略；**全链路可在后台操作与留痕**。 |
| **非目标** | 不替代 UGC 真实用户体系；不采集或伪造 `app_user`；不直接改写商业化订单与流量日志；不以爬虫自动覆盖 `site_json` 运营大段文案（可作为二期「模板导入」）。 |

---

## 2. 内容侧需要的全部数据类型（与库表映射）

以下按**前台实际消费路径**归纳；爬虫应能映射到对应表字段（或生成中间态供审核后落库）。

### 2.1 分类 `category`（首页筛选、工具归属）

| 字段 | 前台用途 | 爬虫侧说明 |
|------|----------|------------|
| `slug` | URL 与逻辑键；与工具关联 | 需唯一、URL 安全 |
| `i18n_key` | 多语言分类名（经 `translation` 解析） | 可自动生成键 + 同步写入 `translation` 或走人工补译 |
| `icon_key` | 分类图标（与前台 `lucideMap` 等对齐） | 需映射表或默认值 |
| `color_class` | 分类色板 | 需映射表或默认值 |
| `sort_order` | 排序 | 可来自源站顺序或后台再调 |

### 2.2 工具主档 `tool`（列表 + 详情骨架）

| 字段 | 前台用途 | 爬虫侧说明 |
|------|----------|------------|
| `slug` | 详情路径键 | 与源站 ID 的映射需在后台可配置 |
| `name` | 名称 | 必填 |
| `description` | 列表短描述 | 必填 |
| `tagline` | 详情副标题 | 可缺省回落到 `description` |
| `long_description` | 详情长文 | 建议 HTML/MD 清洗策略可配置 |
| `icon_emoji` | 列表/详情「图标」展示（当前模型为 emoji/符号） | 若源为 URL，需 **资产拉取与落存储** 策略（或转存为 `symbol`/外链策略，与现有 `tool_screenshot` 区分） |
| `rating` | 展示评分 | 需标注来源与时间；禁止虚构 |
| `pricing_type` | 定价标签 | 需归一化到站点允许枚举（如 `Free` / `Freemium` / `Paid`，与 `site_json.submit.pricing_options` 一致） |
| `category_id` | 分类外键 | 依赖分类映射 |
| `review_count` | 列表/详情评论数展示 | 可与真实 `review` 行数同步，或仅展示源站数字（产品需二选一并写清） |
| `popularity` | 排序权重 | 可由源站热度字段映射或导入后人工调 |
| `website_url` | 外链 | 需规范化、校验 |
| `created_at` | 展示与 sitemap `lastmod` | ISO 或平台约定格式 |
| `moderation_status` | 公开可见性 | **导入默认建议 `pending` 或专用 `imported`**，与现有 **Tools 审核** 一致 |
| `featured` | 精选 | 默认 0，仅后台改 |
| `submitted_by_user_id` / `reject_reason_code` | 审核流 | 爬虫任务可记系统账号或空，拒绝原因仅人工审核填写 |

### 2.3 工具特性 `tool_feature`（详情「功能点」列表）

| 字段 | 说明 |
|------|------|
| `body` | 单行特性文案 |
| `sort_order` | 顺序 |

### 2.4 工具截图 `tool_screenshot`（详情轮播/栅格）

| 字段 | 说明 |
|------|------|
| `symbol` | 当前实现为存储「符号或标识」；若扩展为 URL，需与前台渲染约定一致 |
| `sort_order` | 顺序 |

### 2.5 定价方案 `tool_pricing_plan`（详情定价表）

| 字段 | 说明 |
|------|------|
| `name` | 方案名 |
| `price_label` | 价格展示文案 |
| `features_json` | JSON 数组，子项结构与前台消费一致 |

### 2.6 评论 `review`（详情 UGC 区）

| 字段 | 说明 |
|------|------|
| `user_name` / `avatar_emoji` / `rating` / `comment` / `review_date` / `helpful_count` / `sort_order` | 若从外站导入，**默认 `ugc_status = pending` 或 `hidden`**，避免法律与真实性风险；**禁止**冒充真实注册用户 |
| `reviewer_user_id` | 爬虫导入应为空 |

### 2.7 替代工具关系 `tool_alternative`（详情「相似/替代」）

| 字段 | 说明 |
|------|------|
| `(tool_id, alternative_tool_id)` | 两向或单向策略需在后台可选；依赖 slug 解析为本地 `tool.id` |

### 2.8 首页搜索联想 `search_suggestion`

| 字段 | 说明 |
|------|------|
| `text` / `sort_order` | 可从源站热门搜索或工具名派生；**去重**与**与现有后台 CRUD** 并存策略需定义（合并 / 仅追加任务结果） |

### 2.9 多语言 `translation`（分类名等）

| 字段 | 说明 |
|------|------|
| `locale` / `msg_key` / `msg_value` | 若爬虫只抓单语站点，可仅填一种 locale；多语需多 URL 或字段映射 |

### 2.10 对比页 `comparison_page`（可选二期）

| 字段 | 说明 |
|------|------|
| `slug` / `payload_json` | 结构复杂，建议**独立导入模板**或仅人工在 **Comparisons** 维护；爬虫不作为 P0 |

### 2.11 明确不纳入「内容爬虫」P0 的对象

- `app_user`、`user_favorite`、`page_view_log`、`page_analytics_daily`、`monetization_order`
- `ai_insight_*` 运行配置与历史
- `site_json` 中大块运营文案（`guide` / `more` / `page_seo` 等）：若需同步，单列「运营内容同步」子需求，避免与工具目录爬虫混为一谈

---

## 3. 管理后台必须提供的操作能力

### 3.1 数据源与任务配置

- **数据源档案**：名称、基址、类型（HTML 列表、JSON API、RSS、站点地图等）、**是否遵守 robots.txt**、抓取频率上限、User-Agent、（可选）认证头/Token **加密存储**。
- **字段映射规则**：CSS/XPath/JSONPath、分类 slug 对照表、定价枚举映射、图片/截图处理策略（外链 / 转存对象存储）。
- **过滤与边界**：包含/排除 URL 模式、最大深度、单任务最大条数、超时。

### 3.2 任务执行与调度

- **立即执行**：单次任务；支持 **Dry-run**（仅解析与校验，不写库或写入 staging 表）。
- **定时任务**：Cron 表达式；启用/停用；错过策略（合并为一次 / 跳过）。
- **并发与队列**：任务排队、并发上限，避免压垮源站与本服务。

### 3.3 结果处理与审核衔接

- **预览差异**：逐条展示「将插入 / 将更新」的字段 diff（按 `slug` 主键）。
- **写入策略**（可组合）：新记录插入；已存在跳过；按字段合并；仅更新空字段；**全文覆盖**（需二次确认）。
- **默认落库状态**：新工具 **`moderation_status = pending`（或等价）**，进入现有 **Tools** 审核列表。
- **回滚/撤销**：按任务批次号撤销本次写入（需批次表设计）或提供导出备份 SQL（最低要求）。

### 3.4 可观测与审计

- **运行历史**：开始/结束时间、条数成功失败、耗时、操作者（管理员账号）。
- **日志**：请求 URL、HTTP 状态、解析错误栈摘要、被丢弃记录及原因。
- **权限**：仅 `role` 含管理员且具备「爬虫」子权限（或与现有 admin JWT 策略一致）。

### 3.5 建议 API 形态（实现时细化）

- `GET/POST/PUT/DELETE /api/admin/crawler/sources` — 数据源 CRUD  
- `POST /api/admin/crawler/jobs` — 创建并可选立即执行  
- `GET /api/admin/crawler/jobs` / `GET .../jobs/{id}` — 列表与详情（含日志摘要）  
- `POST .../jobs/{id}/cancel` — 取消排队中任务  
- `GET .../jobs/{id}/preview` — Dry-run 结果分页  
- `POST .../jobs/{id}/commit` — 将预览写入正式库（若采用两阶段）

管理端 UI：**独立菜单项**（如「数据采集」），列表页 + 配置向导 + 任务详情页；与 [08](./08-管理后台与SEO控制面.md) 中 **Tools / Translations / Search suggestions** 能力互补而非重复（爬虫写 pending，人工在原有界面精修）。

---

## 4. 合规、安全与质量

- **法律与协议**：仅抓取允许抓取的来源；保留来源 URL 与抓取时间元数据（建议 `tool` 扩展字段或关联 `crawler_record` 表）。
- **版权与商标**：描述与截图使用范围在后台配置中声明；敏感站点默认关闭。
- **反爬与稳定性**：退避、重试、熔断；失败率超阈值自动停任务并通知。
- **数据质量**：必填字段校验、slug 冲突检测、外链可达性可选探测。

---

## 5. 分期建议

| 阶段 | 范围 |
|------|------|
| **MVP** | 单数据源 + 手动触发 + Dry-run + 写入 `category` / `tool` / `tool_feature` / `tool_pricing_plan`，默认 pending |
| **M1** | `tool_screenshot`、`tool_alternative`、定时任务、批次撤销 |
| **M2** | `review` 谨慎导入（默认不发布）、`search_suggestion` 批量合并策略、`translation` 辅助写入 |
| **M3** | 多数据源模板、对比页/站点 JSON 的独立导入（若仍需要） |

---

## 6. 验收要点（摘要）

1. 管理员可在后台完成：**新增数据源 → 配置映射 → Dry-run → 提交入库**，且新工具出现在 **Tools** 待审核列表。  
2. 前台 **首页与工具详情** 所需字段在映射齐全时均能展示，无 500/空块（截图与 emoji 策略与前台约定一致）。  
3. 任务历史与日志可追溯到操作者与时间；异常任务可取消或停止后续调度。  
4. 默认策略下**不覆盖**已 `active` 工具的核心文案，除非管理员选择覆盖并确认。

---

## 7. 关联文档与代码索引

- 表结构：`backend/sql/schema.pg.sql`  
- 公开消费：`backend/app/routers/tools.py`、`catalog.py`  
- 后台现有：工具审核、联想词、翻译、站点 JSON — 见 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md)


---
