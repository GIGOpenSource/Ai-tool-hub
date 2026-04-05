# 手册 C：开放事项、控制面演进与 SEC/P-AI 对照

本文档由原 **03 / 11 / 21** 合并。

---

# 开放事项总表（汇总）

本文档列**仍未关闭**或须**每次发布再验收**的事项。已落实能力见 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) §1。

**维护约定**：关闭某条时删除对应**一览表行**及下文**专节**（若有）；说明型变更可同步 [05-工程优化与运维备忘.md](./手册-A-部署安全-发布与运维.md) 底部**维护**提示。

---

## 0. 待处理清单（十文档归集）— 落实说明

本节对应原 **§0.1～0.5** 汇总表：**P0 一览仍见 §1**；以下说明「已如何在仓库内处理」，避免只停留在文档层。

### 0.1 安全、部署与发布（SEC-01、OPS-ENV）— **已落实**

| 动作 | 说明 |
|------|------|
| 生产 **JWT** 强校验 | 设置 **`ENVIRONMENT=production`** 时，若 **`JWT_SECRET`** 未设置、为开发默认值、为 `.env.example` 占位中文、或 **短于 24 字符**，进程**拒绝启动**（`backend/app/env_guard.py`，于 `lifespan` 最先执行）。 |
| 生产**不再回滚管理员口令** | **`ensure_dev_accounts`**：生产环境下**已存在**的 `admin@example.com` / `demo@example.com` **不覆盖 `password_hash`**（仅同步展示名与角色）；首启插入仍带默认口令，**须上线后立即改密**（`backend/app/ensure_accounts.py`）。 |
| 文档与示例 | [01-部署指南.md](./手册-A-部署安全-发布与运维.md) §5、[04-P0安全与联调备忘.md](./手册-A-部署安全-发布与运维.md)、[06-API接口参考.md](./手册-B-架构程序与API索引.md) 文末、**`backend/.env.example`**（含 `ENVIRONMENT` 说明）与 **OPS-ENV** 勾选 [09](./手册-A-部署安全-发布与运维.md) §4 **仍须每次发布人工执行**。 |

### 0.2 走查与验收（TC-EXEC）— **已补充脚本辅助**

| 动作 | 说明 |
|------|------|
| 接口抽样 | 新增 **`backend/scripts/publish_smoke.sh`**：`BASE_URL` 下校验未登录 `POST /api/submissions/tool`（**合法 JSON 体**）→401、`GET /api/tools`、`GET /api/site/frontend_nav`、`GET /api/seo/robots.txt` 等（与 [09-上线发布验收清单.md](./手册-A-部署安全-发布与运维.md) §2.3 对齐）。用法：`BASE_URL=https://api.example.com ./backend/scripts/publish_smoke.sh` |
| CI 门禁 | **`.github/workflows/ci.yml`**：三端构建 + 本机起 API 后跑 **`publish_smoke.sh`**（**不能替代** TC-EXEC，仅防明显回归）。 |
| 人工范围不变 | 前台全路由、管理端各页仍以 **§2.1～§2.2** 走查为主；脚本**不能替代** TC-EXEC。 |

### 0.3 工程与数据（ENG-PG、migrate）— **已对齐依赖与备忘**

| 动作 | 说明 |
|------|------|
| PostgreSQL | **`psycopg`** 已在 **`backend/requirements.txt`**；选用 **`DATABASE_URL`** 时的初始化与备份仍须按 **§3.1** 做**环境级验收**（ENG-PG 不自动关闭）。 |
| migrate / `site_json` | 运维约定见 [05-工程优化与运维备忘.md](./手册-A-部署安全-发布与运维.md)；架构侧变量见 [02-架构与程序说明.md](./手册-B-架构程序与API索引.md) §5～7。 |

### 0.4 控制面缺口与商业化后续 — **已编号归档（§4.2）**

不属 P0 的演进项已收入 **§4.2 BACKLOG-CP** 表，与 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) §6、[10-需求-商业化与订单.md](./手册-D-需求-商业化-AI-SEO-爬虫.md) 交叉引用；**随工单立项**，不在本节重复罗列。

### 0.5 源码注释策略（07）— **已抽样落实**

| 动作 | 说明 |
|------|------|
| 页面顶注释 | 已在 **`frontend/src/app/pages/HomePage.tsx`**、**`ToolDetailPage.tsx`** 文件首增加 **5～15 行**数据流说明（块注释）；其余页面按需参照 [07-源代码文件索引.md](./手册-B-架构程序与API索引.md) 文末约定。 |

---

## 1. 一览（按优先级）

| ID | 类型 | 简述 | 优先级 | 详情 |
|----|------|------|--------|------|
| **SEC-01** | 安全 | 生产须更换 **`JWT_SECRET`**、**演示账号**与**管理员**口令 | P0 | §2.1 |
| **OPS-ENV** | 部署 | **`ALLOWED_ORIGINS`**、**`VITE_API_BASE`**、**`VITE_PUBLIC_SITE_URL`** / **`PUBLIC_SITE_URL`**、HTTPS、DB 备份 | P0 | §2.2、[09-上线发布验收清单.md](./手册-A-部署安全-发布与运维.md) §4、[01-部署指南.md](./手册-A-部署安全-发布与运维.md) |
| **TC-EXEC** | 测试 | **管理端**等以**人工走查**为主；见 [09-上线发布验收清单.md](./手册-A-部署安全-发布与运维.md) | P1 | §2.3 |
| **ENG-PG** | 工程 | **选用 PostgreSQL 时**：**`DATABASE_URL`**、**`psycopg`**、迁移与备份须**单独验收** | 待运维验收 | §3.1、[21](./手册-C-开放事项与演进对照.md) §1.4 |

**工程辅助总览**（不关闭上表 P0，仅降低遗漏）：[**21-SEC-OPS-TC-ENG-P-AI策略与Backlog对照.md**](./手册-C-开放事项与演进对照.md)（**`verify_release_env.py`**、TC-EXEC 速查、**P-AI** 策略、**CP-*** 立项门槛）。

---

## 2. 安全、部署与测试执行

### 2.1 安全（SEC-01）

见 [04-P0安全与联调备忘.md](./手册-A-部署安全-发布与运维.md) **P0 — 安全**；与 [09-上线发布验收清单.md](./手册-A-部署安全-发布与运维.md) §4 勾选一致。发布前可在 API 目录执行 **`python scripts/verify_release_env.py`**（生产环境下校验 **JWT** 粗检，见 **§2.4**）。

### 2.2 部署与环境（OPS-ENV）

核对项以 [09-上线发布验收清单.md](./手册-A-部署安全-发布与运维.md) §4 为准；变量说明见 [02-架构与程序说明.md](./手册-B-架构程序与API索引.md) §5；部署步骤见 [01-部署指南.md](./手册-A-部署安全-发布与运维.md)。**CORS / ALLOWED_ORIGINS** 警告逻辑见 **`env_guard.warn_production_cors_origins`**，脚本 **`verify_release_env`** 会触发同逻辑。

### 2.3 测试执行（TC-EXEC）

发布前以 [**09-上线发布验收清单.md**](./手册-A-部署安全-发布与运维.md) **§2～§3** 人工走查为主；接口抽样可跑 **`backend/scripts/publish_smoke.sh`**（见 **§0.2**）。前台 Playwright 等已移除，不计划在本仓库恢复。路由级速查表见 [**21**](./手册-C-开放事项与演进对照.md) **§1.3**。

### 2.4 工程辅助脚本（2026-04-05）

| 脚本 | 用途 |
|------|------|
| **`backend/scripts/verify_release_env.py`** | **SEC-01**（仅当 **`ENVIRONMENT=production`** 时强检 JWT）、**OPS-ENV**（CORS WARN）、**ENG-PG**（若 **PG** 则 **`SELECT 1`**）；**exit 非 0** 表示须修环境 |
| **`backend/scripts/publish_smoke.sh`** | 对 **`BASE_URL`** 的公开接口子集（与 **TC-EXEC** 自动化子集对齐） |

**CI**：**`.github/workflows/ci.yml`** 在 **`backend-py-compile`** 任务中执行 **`ai_insight_snapshots_acceptance.py`**、**`crawler_acceptance.py`**、**`verify_release_env.py`**（默认非 production，用于防脚本回归）。

---

## 3. 工程 backlog

### 3.1 数据库（ENG-PG）

默认 **SQLite**；生产若用 **`DATABASE_URL`**（PostgreSQL）：安装 **`psycopg`**，以 **`backend/sql/schema.pg.sql`** 等为参考完成库初始化，并按环境做备份与回滚演练。实现见 **`backend/app/db.py`**、**`backend/app/db_util.py`**。

---

## 4. 产品后续与演进项（非一览表 P0）

**控制面「半自动 / 演进」**见 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) **§1、§6**。

### 4.1 商业化与订单（PROD-MONET，v1 已落地）

**需求与决策归档**：[**10-需求-商业化与订单.md**](./手册-D-需求-商业化-AI-SEO-爬虫.md)（**§6 决策记录**、**§8 实现说明**）。

**实现摘要**：弱曝光——**`GET /api/tools/{slug}/detail`** 与 **`GET /api/comparisons/{slug}`** 含 **`promotion_active`**；订单详情——**`GET /api/me/orders/{order_id}`**、**`/orders/:orderId`**。**产品侧仍可选**：首页/分类强曝光、续购、独立隐私政策模板（**`site_json`** 维护即可，见 PROD-MONET **§6**）。

### 4.2 控制面 / 产品演进 backlog（BACKLOG-CP）

与 **§0.4** 对应；**对照说明与验收口径**见 [**11-控制面演进需求-CP-BACKLOG.md**](./手册-C-开放事项与演进对照.md)。**关闭某条时**改下表状态并回写 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) §6 或 [10-需求-商业化与订单.md](./手册-D-需求-商业化-AI-SEO-爬虫.md) 相关节。

| ID | 主题 | 说明 | 状态 |
|----|------|------|------|
| **CP-SITEJSON** | 大块 `site_json` | **`submit` / `dashboard`** 已有分字段页；**`home_seo`** 有专页且已纳入「站点 JSON」下拉；其余键仍用整包编辑 | **部分已落地** |
| **CP-COMPARE** | 对比页编辑 | **`/admin/comparisons`** 可视化 + JSON 双模式 | **已落地** |
| **CP-JSONLD** | 结构化数据 | **`seo_tool_json_ld.global_merge`** + **`/admin/tool-json-ld`** 专页 | **已落地** |
| **CP-I18N** | i18n 工程化 | 表维护 + **导入/导出** 已有；第三方翻译平台对接 | **部分已落地**（平台对接仍待外部立项） |
| **CP-MONET-RE** | 商业化后续 | **续购 / 再次下单**、**首页·分类强曝光**、法务话术与隐私条款覆盖 | 见 [10-需求-商业化与订单.md](./手册-D-需求-商业化-AI-SEO-爬虫.md) §3.1、§4、§6 |
| **CP-AI-SEO** | AI SEO / 流量分析 | 管理端 **`/admin/ai-seo-insights`** + **`/api/admin/ai-insights/*`**（路由源码 **`routers/growth/admin_ai_insights.py`**，业务 **`app/growth/ai_insight_*`**）：提示词、模型连接、一键分析、历史与详情；**§11** 多键任务写 **`site_json`**、审计与回滚 | **MVP + §11 配置面已落地**；异步队列/多供应商等见 [手册-D §8](./手册-D-需求-商业化-AI-SEO-爬虫.md) |

**CP-SITEJSON / CP-MONET-RE / 翻译平台** 等「待立项」条目的**验收与立项输入**见 [**21-SEC-OPS-TC-ENG-P-AI策略与Backlog对照.md**](./手册-C-开放事项与演进对照.md) **§3**（与 [11](./手册-C-开放事项与演进对照.md) 各节 **立项门槛** 一致）。

---

| 项 | 说明 |
|----|------|
| **站点分字段** | **`submit` / `dashboard`** 见 **`/admin/site-submit`**、**`/admin/site-dashboard`**；其余见 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) **§6** |
| **订单与商业化展示** | 见 **§4.1** 与 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) 订单相关行 |

**数据约定**：收藏 **`/api/me/favorites*`** + **`user_favorite`**；活动 **`GET /api/me/activity`**；**`site_json.profile`** 供个人中心静态文案与兜底。

### 4.3 立项收口：TMS、异步队列、合规风控（与 §4.2 对照）

本节把「仍待外部立项」的 **CP-I18N / CP-AI-SEO / 合规** 写成**可验收输入**，避免只在总表里一句带过。

| 主题 | 仓库内已具备 | 立项时需拍板的内容 |
|------|----------------|---------------------|
| **CP-I18N → 外部 TMS** | 管理端 **`translation`** 表维护；**导入/导出** JSON | 选定 TMS（或供应商 API）；**语言对**与 **msg_key 命名**是否与现有键一致；**回灌路径**（继续用手动导入 / 新增带 **HMAC 的回调端点**）；**幂等策略**（按 `locale + msg_key` upsert）；是否只同步白名单前缀（如 `nav.*`、`discover.*`） |
| **CP-AI-SEO → 异步队列** | 进程内限流、**`scripts/ai_insight_pending_worker.py`**、日更调度 **`AI_INSIGHT_DAILY_*`** | Broker（Redis/RabbitMQ 等）与 **任务模型**（是否与 `ai_insight_run` 一行对应）；**多 API 实例**下由谁消费；**失败重试与死信**；环境变量命名（示例：预留 **`AI_INSIGHT_QUEUE_MODE`**，见 **`backend/.env.example`**） |
| **合规与风控** | 生产 **JWT / CORS**、工具 **`moderation_status`**、评论 **`ugc_status`**、管理端审核、**AI SEO** 限流；**`POST /api/track`** / **`POST /api/track/outbound`** **按 IP 限流**（**`TRACK_*_RATE_LIMIT_*`**，可选 **`TRACK_RATE_LIMIT_REDIS_URL`**，超限 **429 `rate_limited_track`**）；**`UGC_BLOCKED_SUBSTRINGS`** 对 **`POST /api/submissions/tool`**（**ASCII 单词形边界匹配**，短语/中文子串，**400 `ugc_blocked_substring`**） | **WAF / Bot 管理**、全站 **Captcha**、**第三方文本/图片审核 API**、隐私与留存策略；前台 **ReviewModal** 当前仍为模拟提交，若上线真实 UGC 评论须接 API 并复用同一套文本策略 |

---

## 5. 相关文档索引（01～11）

| 文档 | 用途 |
|------|------|
| [01-部署指南.md](./手册-A-部署安全-发布与运维.md) | 多环境部署、§5 构建前检查 |
| [02-架构与程序说明.md](./手册-B-架构程序与API索引.md) | 架构、数据流、环境变量 |
| [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) | 本文：待办总表与 **§0 归集** |
| [04-P0安全与联调备忘.md](./手册-A-部署安全-发布与运维.md) | P0 安全摘要、联调注意点 |
| [05-工程优化与运维备忘.md](./手册-A-部署安全-发布与运维.md) | 运维备忘（**BACKLOG-A** 已闭） |
| [06-API接口参考.md](./手册-B-架构程序与API索引.md) | REST 路径、鉴权、演示账号警示 |
| [07-源代码文件索引.md](./手册-B-架构程序与API索引.md) | 源文件职责与注释策略 |
| [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) | 控制面矩阵、§6 缺口与绕行 |
| [09-上线发布验收清单.md](./手册-A-部署安全-发布与运维.md) | 发布走查与 §4 勾选 |
| [10-需求-商业化与订单.md](./手册-D-需求-商业化-AI-SEO-爬虫.md) | PROD-MONET 决策与后续迭代口径 |
| [11-控制面演进需求-CP-BACKLOG.md](./手册-C-开放事项与演进对照.md) | BACKLOG-CP 现状、缺口与 **CP-*** 验收说明 |
| [手册-D（PROD-AI-SEO）](./手册-D-需求-商业化-AI-SEO-爬虫.md) | AI SEO/流量分析：**MVP + §11 已落地**；§5「研发草案」为历史规格标题；差距与 PRD 对照见 [**项目-PRD-ORD-与实现差距及优化清单.md**](./项目-PRD-ORD-与实现差距及优化清单.md) |
| [21-SEC-OPS-TC-ENG-P-AI策略与Backlog对照.md](./手册-C-开放事项与演进对照.md) | SEC/OPS/TC/ENG-PG 辅助、**P-AI** 策略、**CP-*** 立项门槛 |


---

# 控制面演进需求（BACKLOG-CP 对照）

本文对应 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) **§4.2**，说明各 **CP-*** 条目的**现状、已实现能力、剩余缺口**与验收口径。  
**「待立项」**指尚未排入版本迭代、或未接外部系统；**不等于仓库内零代码**。

---

## CP-SITEJSON：大块 `site_json` 分字段

| 维度 | 说明 |
|------|------|
| **目标** | 降低整包 JSON 误改风险，常用键用表单维护。 |
| **已实现** | **`submit`** → **`/admin/site-submit`**；**`dashboard`** → **`/admin/site-dashboard`**（分栏编辑，详见各页）。侧栏 **fallback**、**`migrate` 幂等补菜单** 与 **空库种子 `admin_settings.admin_menu_items`** 已含上述路径与 **`sidebar.siteSubmitForm` / `sidebar.siteDashboardForm`** i18n 键。其余白名单键仍走 **`/admin/site-blocks`**（可视化 + JSON 双模式）。 |
| **缺口** | `guide`、`more`、`profile` 等大块仍依赖站点 JSON 或整段编辑；若需「每键一套表单」按页面分别立项。 |
| **立项门槛** | 产品列出下一批 **`site_json` 键**与字段级稿；验收见 [**21**](./手册-C-开放事项与演进对照.md) **§3**。 |
| **建议状态** | **部分已落地**；关闭「全键分字段」需产品列优先级后再排期。 |

---

## CP-COMPARE：对比页编辑

| 维度 | 说明 |
|------|------|
| **目标** | 对比落地页结构化编辑，减少手写 JSON 错误。 |
| **已实现** | **`/admin/comparisons`**：**可视化编辑器**（主工具/替代/矩阵/SEO 文案等）+ **JSON 模式**；保存 **`PUT /api/admin/comparison-pages/{slug}`**。 |
| **缺口** | 可选：JSON Schema 校验提示、字段级校验规则增强；属体验优化。 |
| **建议状态** | **已落地（MVP+）**；进阶校验单独工单。 |

---

## CP-JSONLD：工具详情结构化数据

| 维度 | 说明 |
|------|------|
| **目标** | 运营可配置与前台 `SoftwareApplication` JSON-LD 合并的字段（如 `publisher`）。 |
| **已实现** | **`site_json` 键 `seo_tool_json_ld`**：`global_merge` 对象浅合并进前台组装结果（见 **`GET /api/site/seo_tool_json_ld`**、`backend/app/site_json_payload_validate.py`）。前台 **`ToolDetailPage`** 拉取并合并。管理端 **`/admin/site-blocks`** 可选该键编辑。 |
| **本次开发** | 新增 **`/admin/tool-json-ld`** 专页，仅维护 `seo_tool_json_ld`，便于运营发现（侧栏 **`sidebar.toolJsonLd`**；`migrate` 幂等补菜单项）。 |
| **缺口** | 按工具 slug 的逐条 JSON-LD 覆盖（若需要）未做，仍为产品决策项。 |
| **建议状态** | **已落地**（含专页后）；逐工具覆盖另立需求。 |

---

## CP-I18N：翻译工程化

| 维度 | 说明 |
|------|------|
| **目标** | 表维护 + 批量能力，便于与外部翻译流程衔接。 |
| **已实现** | **`/admin/translations`**：**CRUD**；**导出 JSON / NDJSON**；**文件导入**（可选按语言 replace）。API：`/api/admin/translations/export`、`/import` 等。 |
| **缺口** | 对接第三方翻译平台（API、回调、TM）属**外部系统**，本仓库不内置。 |
| **立项门槛** | 选定 TMS、凭证与回调、语言对；至少一条闭环回灌 **`translation`**；见 [**21**](./手册-C-开放事项与演进对照.md) **§3**。 |
| **建议状态** | **批量导入导出已落地**；平台对接 **待外部立项**。 |

---

## CP-MONET-RE：商业化后续迭代

| 维度 | 说明 |
|------|------|
| **目标** | **续购 / 再次下单**、**首页·分类强曝光**、法务话术与**独立隐私政策模板**（可用 **`site_json`** 维护）等。 |
| **已实现（v1）** | 弱曝光 **`promotion_active`**、**`GET /api/me/orders/{id}`** 等；见 [10-需求-商业化与订单.md](./手册-D-需求-商业化-AI-SEO-爬虫.md) **§6、§8** 与 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) **§4.1**。 |
| **缺口** | 上述「后续」能力按产品排期；须带 UI/口径稿立项。 |
| **立项门槛** | 续购规则、曝光位稿、法务是否要求独立模板；验收见 [**21**](./手册-C-开放事项与演进对照.md) **§3**。 |
| **建议状态** | **待产品立项**；需求权威在 **10**。 |

---

## CP-AI-SEO：AI SEO 与流量分析助手

| 维度 | 说明 |
|------|------|
| **目标** | 管理端**一键分析**：服务端组装**可配置提示词**与 **SEO / 流量数据快照**，调用**可配置大模型 API**，返回**纯文本建议**；保留**分析记录列表**与**详情**（含提示词与模型快照，不含密钥）。 |
| **已实现** | **MVP**：表 **`ai_insight_*`**、**`/api/admin/ai-insights/*`**、**`app.growth.ai_insight_service`**（OpenAI 兼容 **chat/completions**）、管理端 **`/admin/ai-seo-insights`** 与 **`/runs/[id]`**、侧栏 **`migrate` 幂等补菜单**、环境变量 **`AI_INSIGHT_LLM_API_KEY`** 优先。**§11**：**`page_seo` / `home_seo` / `seo_robots`** 任务 **apply** 写库；**`code_pr_hint`** 仅 PR/CI；表 **`ai_insight_seo_apply_audit`** + **rollback** API。 |
| **缺口** | 异步任务队列、多供应商适配器、费用估算展示、更细保留策略等（见 **12** §8～9）；二次密码、多版本配置历史表、按工具 JSON-LD 逐条覆盖等仍为产品/工单项。 |
| **建议状态** | **MVP + §11 配置面写库与审计回滚已落地**；队列与商业化级审计另开工单。需求与验收见 [**12-需求-AI-SEO与流量分析助手.md**](./手册-D-需求-商业化-AI-SEO-爬虫.md)（**PROD-AI-SEO**）。 |

---

## 维护

更新实现或关闭某 **CP-*** 时：同步修改 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) **§4.2** 状态列，并必要时改 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) §6。**SEC/OPS/TC/ENG-PG、P-AI 策略、CP 立项门槛**总览见 [**21-SEC-OPS-TC-ENG-P-AI策略与Backlog对照.md**](./手册-C-开放事项与演进对照.md)。


---

# SEC / OPS / TC-EXEC / ENG-PG、P-AI 策略与 CP-Backlog 对照

本文把 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) 一览中的 **P0/P1 运维项**、**14** 中 **P-AI-03～07** 的策略边界、以及 **CP-*** backlog 的**立项门槛**收拢到一处，避免多文档重复且口径不一。**关闭条目时**：改 [03](./手册-C-开放事项与演进对照.md)、[14](./手册-E-评估与变更日志.md)、[11](./手册-C-开放事项与演进对照.md) 对应表，并在 [20-Bug与修复日志.md](./手册-E-评估与变更日志.md) §3 记一行。

---

## 1. 发布与安全（SEC-01、OPS-ENV、TC-EXEC、ENG-PG）

### 1.1 工程已提供的自动化

| ID | 代码/脚本 | 作用 | 不能替代 |
|----|-----------|------|----------|
| **SEC-01** | **`backend/app/env_guard.py`**：`ENVIRONMENT=production` 时弱 **`JWT_SECRET`** **拒绝启动** | 拦截占位/过短密钥 | 运维仍须换**演示/管理员口令**（代码不代改口令） |
| **OPS-ENV** | 同上 **`warn_production_cors_origins`**：未设 **`ALLOWED_ORIGINS`** 或 `=*` 时 **WARN** | 提醒跨域配置 | **`VITE_*`**、**`PUBLIC_SITE_URL`**、HTTPS、反代须在部署层勾选（[09](./手册-A-部署安全-发布与运维.md) §4） |
| **ENG-PG** | **`backend/scripts/verify_release_env.py`**：若设 **`DATABASE_URL`（PG）** 则 **`SELECT 1`** 烟测 | 连通性初检 | **`schema.pg.sql` / migrate**、**`pg_dump` 备份与恢复演练**仍须人工（[03](./手册-C-开放事项与演进对照.md) §3.1） |
| **TC-EXEC** | **`backend/scripts/publish_smoke.sh`** + CI **`api-smoke`** | 公开接口子集回归 | **前台全路由 + 管理端各页**须按 [09](./手册-A-部署安全-发布与运维.md) **§2.1～§2.2** 人工走查 |

### 1.2 发布前建议命令（API 宿主机或 CI 镜像内）

在 **`backend/`** 下（与仓库 **CI** 一致可先 **`export PYTHONPATH=.`**）：

```bash
python scripts/verify_release_env.py
```

- 若 **`ENVIRONMENT=production`**：脚本对 **JWT** 执行与 **`lifespan`** 相同的粗检，失败则 **exit 1**。  
- **生产部署前**仍须完成 [09](./手册-A-部署安全-发布与运维.md) **§4** 勾选与口令更换。

### 1.3 TC-EXEC 速查（人工）

| 端 | 范围 | 权威段落 |
|----|------|----------|
| 前台 | `frontend/src/app/routes.tsx` 所列路由无白屏、关键请求 2xx | [09](./手册-A-部署安全-发布与运维.md) **§2.1** |
| 管理端 | `/login`、`/admin/*` 核心页（含 **AI SEO**、**站点 JSON**、**订单**等） | [09](./手册-A-部署安全-发布与运维.md) **§2.2** |
| 接口 | 未登录投稿 401、公开站点块、SEO 路由等 | [09](./手册-A-部署安全-发布与运维.md) **§2.3** + **`publish_smoke.sh`** |

### 1.4 ENG-PG（PostgreSQL）单独验收清单（人工勾选）

1. **`pip install -r requirements.txt`** 含 **`psycopg`**。  
2. **`DATABASE_URL`** 指向正确库；跑一次 **`verify_release_env.py`** 确认 **`SELECT 1`**。  
3. 空库或新环境：按 **`backend/sql/schema.pg.sql`** 与启动时 **`migrate`** 约定初始化（见 **`db.py`**）。  
4. **备份**：实例快照或 **`pg_dump`**；**恢复演练**至少做一次。  
5. 多实例 API 时，确认**连接池/超时**与运维策略一致（本仓库为**每请求连接**简化模型）。

---

## 2. P-AI-03～07：策略边界与后续工程（不重复造需求 12 全文）

| ID | 类型 | 当前工程态 | 策略/后续 |
|----|------|------------|-----------|
| **P-AI-03** | 产品+运营 | 竞品**离线图不入库**；**`ai_insight_competitor_benchmarks`** + **`{{competitor_benchmark_snapshot}}`** 已接 | 第三方数值须写入 **`metrics`** 或提示词，**禁止模型空编** |
| **P-AI-04** | 工程可调 | **`AI_INSIGHT_PAGE_SEO_MAX_PATHS`** 等 env；热门+字典序抽样 | 大站权衡 token；无埋点时回退字典序 |
| **P-AI-05** | 架构后续 | **`defer_llm`** + **BackgroundTasks**（非独立队列） | Celery/RQ 等属**另立项**；多 worker 仅 POST 所在进程执行 |
| **P-AI-06** | 工程可选 | **`AI_INSIGHT_RATE_LIMIT_REDIS_URL`** 则 Redis 窗口；否则进程内 | 多 worker 必配 Redis 若要对齐限流 |
| **P-AI-07** | 产品/法务 | **`data_residency_and_cross_border`** 已产品确认（**允许** SEO 摘要+聚合流量发往含境外 LLM）；另两键仍为占位 | 属地/合同另有约束以法务为准；勿将助手输出作对外合规唯一依据 |

详细数据矩阵仍以 [**14-AI-SEO与数据打通评估-项目现存问题.md**](./手册-E-评估与变更日志.md) 为准。

---

## 3. CP-Backlog 立项门槛（CP-SITEJSON、CP-MONET-RE、翻译平台）

| ID | 立项须带上的输入 | 验收一句话 |
|----|------------------|------------|
| **CP-SITEJSON** | 产品列出下一批 **`site_json` 键**（如 `guide` / `more` / `profile`）及**字段级稿** | 该键有**专用管理页**或**Schema 校验**，误保存率可测 |
| **CP-MONET-RE** | 商业口径：**续购规则**、**首页/分类强曝光** UI 稿、法务是否要求**独立隐私模板** | 行为与 [**10-需求-商业化与订单.md**](./手册-D-需求-商业化-AI-SEO-爬虫.md) §6 决策一致且可回归测试 |
| **CP-I18N（平台）** | 选定 TMS、API 凭证、回调 URL、语言对、是否 TM 主数据 | 至少一条**机器+人工**闭环译项从平台回灌 **`translation` 表** |

**CP-AI-SEO** 剩余大项（异步队列、多供应商计费等）仍以 [**12-需求-AI-SEO与流量分析助手.md**](./手册-D-需求-商业化-AI-SEO-爬虫.md) **§8～9** 为准。

---

## 4. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-04-05 | 首版：`verify_release_env.py`、**`production_jwt_secret_ok`**、本文与 03/04/09/11/14/19/20/CI 同步。 |
| 2026-04-05 | **P-AI-07**：产品确认 **出境 LLM 允许**（SEO 摘要+聚合流量）；**§2** 表与快照 **`data_residency_and_cross_border`**、需求 **12 §9** 同步。 |


---
