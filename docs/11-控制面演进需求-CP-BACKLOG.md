# 控制面演进需求（BACKLOG-CP 对照）

本文对应 [03-开放事项总表.md](./03-开放事项总表.md) **§4.2**，说明各 **CP-*** 条目的**现状、已实现能力、剩余缺口**与验收口径。  
**「待立项」**指尚未排入版本迭代、或未接外部系统；**不等于仓库内零代码**。

---

## CP-SITEJSON：大块 `site_json` 分字段

| 维度 | 说明 |
|------|------|
| **目标** | 降低整包 JSON 误改风险，常用键用表单维护。 |
| **已实现** | **`submit`** → **`/admin/site-submit`**；**`dashboard`** → **`/admin/site-dashboard`**（分栏编辑，详见各页）。侧栏 **fallback**、**`migrate` 幂等补菜单** 与 **空库种子 `admin_settings.admin_menu_items`** 已含上述路径与 **`sidebar.siteSubmitForm` / `sidebar.siteDashboardForm`** i18n 键。其余白名单键仍走 **`/admin/site-blocks`**（可视化 + JSON 双模式）。 |
| **缺口** | `guide`、`more`、`profile` 等大块仍依赖站点 JSON 或整段编辑；若需「每键一套表单」按页面分别立项。 |
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
| **建议状态** | **批量导入导出已落地**；平台对接 **待外部立项**。 |

---

## 与商业化后续（CP-MONET-RE）的关系

**续购、强曝光、法务话术**等仍以 [10-需求-商业化与订单.md](./10-需求-商业化与订单.md) 与 **03 §4.1** 为准，不在本文展开。

---

## CP-AI-SEO：AI SEO 与流量分析助手

| 维度 | 说明 |
|------|------|
| **目标** | 管理端**一键分析**：服务端组装**可配置提示词**与 **SEO / 流量数据快照**，调用**可配置大模型 API**，返回**纯文本建议**；保留**分析记录列表**与**详情**（含提示词与模型快照，不含密钥）。 |
| **已实现** | **MVP**：表 **`ai_insight_*`**、**`/api/admin/ai-insights/*`**、**`ai_insight_service`**（OpenAI 兼容 **chat/completions**）、管理端 **`/admin/ai-seo-insights`** 与 **`/runs/[id]`**、侧栏 **`migrate` 幂等补菜单**、环境变量 **`AI_INSIGHT_LLM_API_KEY`** 优先。 |
| **缺口** | 异步任务队列、多供应商适配器、费用估算展示、更细保留策略等（见 **12** §8～9）。 |
| **建议状态** | **MVP 已落地**；进阶项另开工单。需求与验收见 [**12-需求-AI-SEO与流量分析助手.md**](./12-需求-AI-SEO与流量分析助手.md)（**PROD-AI-SEO**）。 |

---

## 维护

更新实现或关闭某 **CP-*** 时：同步修改 [03-开放事项总表.md](./03-开放事项总表.md) **§4.2** 状态列，并必要时改 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md) §6。
