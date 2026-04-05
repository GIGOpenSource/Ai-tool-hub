# 需求文档：I 工具列表推荐排序算法 1.0（千人一面）

| 项 | 内容 |
|----|------|
| **需求 ID** | **RECOMMEND-ALGO-V1**（工程内键名 **`recommend_algo_v1`**） |
| **状态** | **v1 已落实**（后端重算 + `GET /api/tools` 排序 + 站点 JSON + 管理端复杂度 + 前台「热门」对齐） |
| **个性化** | **不做**用户级画像；全站同一套分数，故称「千人一面」 |
| **关联实现** | `backend/app/growth/recommend_service.py`、`backend/app/growth/recommend_scheduler.py`、`backend/app/routers/tools.py`；详见本文 **§9** |

---

## 1. 背景与目标

- **问题**：工具列表「热门」若仅依赖静态 **`popularity`**，难以反映近期流量、出站转化与互动质量，也无法通过运营参数微调榜单。
- **目标**：在**不引入个性化推荐**的前提下，用可解释的**多层加权 + 全站 Z 分数归一 + 时间衰减 + 可配置权重**，定期写入 **`tool.recommend_score`**，并在开启开关时让 **`GET /api/tools`** 与前台「热门」排序与之对齐。
- **原则**：指标须与现有埋点与业务表一致（详情 PV、出站点击、收藏、已发布评论），避免虚构字段。

---

## 2. 范围

### 2.1 范围内

- 仅统计 **`moderation_status = 'active'`** 的工具；每次重算更新其 **`recommend_score`**。
- **流量层**：窗口内工具详情路径的 PV；窗口内出站点击次数；二者先做全站 Z，再按层内权重合成；再乘以**复杂度系数**（仅作用于流量层核心项，见 §4.4）。
- **转化层**：展示评分（0～5 归一到 0～1）、**收藏率**（全量收藏数 / max(窗口 PV, 1)）、**评论率**（已发布评论数 / max(窗口 PV, 1)）；各指标全站 Z 后按层内权重合成；再乘时间衰减。
- **商业层**：窗口内出站次数 Z、**出站转化率 proxy**（出站 / max(窗口 PV, 1)）的 Z；按层内权重合成；若转化率显著高于全站均值则施加**奖励乘子**；再乘时间衰减。
- **时间衰减**：对三层分别使用可配置的指数衰减 **`exp(-lambda * days_since_created)`**，**`days_since_created`** 取自工具 **`created_at`** 的日历日差（解析失败或为空则视为 0 天，即不衰减）。
- **开关与配置**：**`site_json.content_key = 'recommend_algo_v1'`** 的 JSON；**仅当库内存在该行且 `enabled: true`** 时，列表 API 才按 **`recommend_score`** 排序并重算写分。
- **工具级运营参数**：**`tool.complexity_tier`**，取值 **`simple` | `medium` | `high`**，映射默认可配置系数（见 §5），在管理端工具编辑页维护。

### 2.2 范围外（本需求明确不做）

- 按用户、会话或协同过滤的个性化排序。
- 实时流式更新（采用**定时批处理** + 可选手动脚本；间隔见 §7）。
- 将付费推广位（**`monetization_order`**）与推荐分硬编码合并排序（二者可独立演进；若产品上需统一策略，应另立需求）。

---

## 3. 数据来源与统计口径

| 指标 | 数据来源 | 口径说明 |
|------|----------|----------|
| 详情 PV（窗口内） | **`page_view_log`** | 路径为 **`/tool/{slug}`** 或以其为前缀（含尾斜杠、query），**`date(created_at)`** 落在 **`[start_date, end_date]`**（含端点）；**`window_days`** 个日历日，与 **`app.growth.recommend_service._window_dates`** 一致 |
| 出站点击（窗口内） | **`outbound_click_log`** | **`tool_slug`** 匹配，日期在同上窗口 |
| 收藏数（全量） | **`user_favorite`** | 按 **`tool_slug`** 计数；表无时间列，故为**全量** |
| 评论数（已发布） | **`review`** | **`tool_id`** 匹配且 **`ugc_status = 'published'`** |
| 展示评分 | **`tool.rating`** | 转为 0～1：**`min(1, max(0, rating/5))`** 后再参与 Z |
| 上架时间 | **`tool.created_at`** | 用于三层 λ 衰减 |

**`window_days`** 合法范围：**1～730**（实现中会钳制）；收藏与评论率的分母使用 **max(窗口内 PV, 1)**，避免除零。

---

## 4. 模型结构（与实现对齐）

下列符号与 **`app.growth.recommend_service.recompute_recommend_scores`** 一致。

### 4.1 全站 Z 分数

- 对每一列参与排序的**原始或派生数值向量**（如窗口 PV、窗口出站、评分归一、收藏率、评论率、转化率 proxy），在**全体 active 工具**上计算：
  - 若仅 1 个工具：Z 视为 **0**。
  - 若总体标准差极小：全 **0**。
  - 否则：**Z_i = (x_i - mean) / pstdev**（总体标准差）。

### 4.2 三层核心分（衰减前）

- **流量层核心**（含复杂度乘子 **`qcoef`**）：
  - **`traffic_core = (Z_views * w_views + Z_outbound * w_outbound_clicks) * qcoef`**
- **转化层核心**：
  - **`conv_core = Z_rating_norm * w_rn + Z_fav_rate * w_fr + Z_comment_rate * w_cr`**
- **商业层核心**：
  - **`comm_core = Z_outbound * w_raw_out + Z_cvr * w_cvr`**
  - 若全站 **`mean_cvr`**（各工具 `outbound/max(views,1)` 的均值）**> 1e-12** 且当前工具 **`cvr > bonus_th * mean_cvr`**，则 **`comm_core *= bonus_m`**。

### 4.3 衰减与总分

- **`traffic_score_layer = traffic_core * exp(-lt * days)`**
- **`conversion_score_layer = conv_core * exp(-lc * days)`**
- **`commercial_score_layer = comm_core * exp(-lm * days)`**
- **`recommend_score = wt * traffic_score_layer + wc * conversion_score_layer + wm * commercial_score_layer`**

其中 **`wt, wc, wm`** 为 **`layer_weights`**；**`lt, lc, lm`** 为 **`decay`** 中的 λ。

### 4.4 复杂度系数（默认）

| `complexity_tier` | 默认系数（`complexity_coef`） |
|-------------------|-------------------------------|
| `simple` | 0.8 |
| `medium` | 1.0 |
| `high` | 1.2 |

未知或非枚举值回退为 **`medium`**。

---

## 5. 站点 JSON 配置：`recommend_algo_v1`

- **存储位置**：表 **`site_json`**，**`content_key = 'recommend_algo_v1'`**，**`payload_json`** 为对象。
- **合并规则**：与代码内 **`default_recommend_config()`** 做**浅合并顶层键**；**`layer_weights`、`traffic_inner`、`conversion_inner`、`commercial_inner`、`decay`、`complexity_coef`** 为**嵌套合并**（运营可只覆盖子集）。
- **启用列表排序**：**必须**存在该行且 **`enabled: true`**。若**无行**或 **`enabled` 不为 true**，则 **`GET /api/tools`** 不按推荐分排序（实现上 `recommend_sort_enabled` 为 false），定时任务也不会写分。

### 5.1 默认配置（与代码一致）

下列 JSON 可作为文档基线；实际部署以迁移种子或后台保存为准。

```json
{
  "enabled": true,
  "window_days": 30,
  "layer_weights": {
    "traffic": 0.3,
    "conversion": 0.3,
    "commercial": 0.4
  },
  "traffic_inner": {
    "views": 0.75,
    "outbound_clicks": 0.25
  },
  "conversion_inner": {
    "rating_norm": 0.3,
    "favorite_rate": 0.35,
    "comment_rate": 0.35
  },
  "commercial_inner": {
    "raw_outbound": 0.5,
    "conversion_rate": 0.5
  },
  "decay": {
    "traffic_lambda": 0.1,
    "conversion_lambda": 0.05,
    "commercial_lambda": 0.05
  },
  "conversion_rate_bonus_multiplier": 1.1,
  "conversion_rate_bonus_vs_mean": 2.0,
  "complexity_coef": {
    "simple": 0.8,
    "medium": 1.0,
    "high": 1.2
  }
}
```

### 5.2 校验规则（管理端保存时）

- **`enabled`**：若出现须为布尔。
- **`window_days`**：若出现须为整数且 **1～730**（**bool 子类**被拒绝）。
- **`layer_weights` 等六个嵌套对象**：若出现须为 JSON 对象（非数组）。

更细数值范围（如权重和是否为 1）当前**未强制**，由运营自律；若需硬约束可另提工单。

---

## 6. API 与排序行为

| 接口 | 行为 |
|------|------|
| **`GET /api/tools`** | 当 **`recommend_sort_enabled`** 为 true：**`ORDER BY recommend_score DESC, popularity DESC, created_at DESC`**；响应体含 **`recommend_score`**（浮点）。关闭算法时仍返回字段，值可能为 0 或历史值，但排序不依赖该字段。 |
| **`PATCH /api/admin/tools/{id}`** | 可更新 **`complexity_tier`**（**`simple` \| `medium` \| `high`**）；非法值 **400**。 |
| 管理端工具列表 / 审核详情 | 展示 **`recommend_score`、`complexity_tier`**（只读分数字段以列表为准）。 |

全量 REST 索引见 [**手册-B-架构程序与API索引.md**](./手册-B-架构程序与API索引.md)。

---

## 7. 重算调度与手动运维

| 方式 | 说明 |
|------|------|
| 进程内定时任务 | 环境变量 **`RECOMMEND_SCORE_INTERVAL_SEC`**，默认 **3600**；**≤0** 关闭循环。启动后约 **20s** 首次执行，随后按间隔 sleep。 |
| 手动脚本 | 在 **`backend`** 目录：**`PYTHONPATH=. python scripts/recompute_recommend_scores.py`**；若未启用 **`recommend_algo_v1.enabled`**，脚本会跳过并打印说明。 |
| 数据库提交 | 定时任务在单轮内 **`recompute_recommend_scores` 后 `commit`**；请保证与线上迁移一致（**`tool.recommend_score`、`tool.complexity_tier`**）。 |

---

## 8. 前台与后台产品行为

- **前台**：首页、分类浏览、搜索结果中，用户选择「热门」等按热度排序时，优先比较 **`recommend_score`**，再 **`popularity`**（与 API 开启算法时的顺序一致）；接口未返回数字时前端按 **0** 处理。
- **管理端**：**站点 JSON** 模块中可选择块 **`recommend_algo_v1`** 编辑权重与开关；**工具编辑页**可选择**复杂度**并保存至 **`complexity_tier`**。

控制面总表见 [**08-管理后台与SEO控制面.md**](./08-管理后台与SEO控制面.md)。

---

## 9. 实现索引（源代码）

| 模块 | 路径 |
|------|------|
| 配置加载、Z 分、批处理写分 | `backend/app/growth/recommend_service.py` |
| 定时循环 | `backend/app/growth/recommend_scheduler.py` |
| 入口挂载 | `backend/app/main.py`（`recommend_score_scheduler_loop`） |
| 列表排序与响应模型 | `backend/app/routers/tools.py` |
| 管理端工具 PATCH、列表字段 | `backend/app/routers/admin_tools.py` |
| `site_json` 白名单与校验 | `backend/app/routers/admin_site_json.py`、`site_json_payload_validate.py` |
| 迁移与默认种子 | `backend/app/migrate.py` |
| PG 绿场表结构 | `backend/sql/schema.pg.sql`（**`tool.recommend_score`、`complexity_tier`**） |
| 手动脚本 | `backend/scripts/recompute_recommend_scores.py` |
| 前台类型与排序 | `frontend/src/app/pages/home/types.ts`、`HomePage.tsx`、`CategoryBrowsePage.tsx`、`SearchResultsPage.tsx`、`useHomeData.ts` |
| 管理端站点块、工具编辑 | `admin/app/admin/site-blocks/page.tsx`、`admin/app/admin/tools/[id]/edit/page.tsx` |

---

## 10. 验收清单（v1）

1. **`site_json`** 存在 **`recommend_algo_v1`** 且 **`enabled: true`** 时，**`GET /api/tools`** 的排序主键为 **`recommend_score`**，且与前台「热门」一致。  
2. 将 **`enabled`** 设为 **false** 后，列表恢复为不依赖推荐分的排序逻辑（仍以 **`popularity` 等**为序）。  
3. 修改 **`window_days` 或各层权重** 后，重新跑脚本或等待定时任务，榜单应随数据与配置变化可观察地变动（在固定埋点数据下可复现）。  
4. 修改某工具的 **`complexity_tier`** 后，重算后该工具相对排序应符合系数预期（同数据下对比）。  
5. **无 active 工具**或**关闭开关**时，脚本与调度不报错；开启时日志可见更新工具数。

---

## 11. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-04-05 | 初版：与当前仓库实现一致，作为 **RECOMMEND-ALGO-V1** 的需求与验收单一事实来源 |
