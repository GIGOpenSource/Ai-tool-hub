# 从分析到落地的全链路执行清单 - 新一代 AI 工具导航与评测平台

**作者**: Manus AI
**版本**: 1.0
**日期**: 2026年3月30日

## 前言

本执行清单旨在将 TAAFT 竞品分析报告 [1] 和《深度运营需求文档 (ORD)》 [2] 中的洞察与策略，转化为可直接执行的任务，涵盖数据采集、产品开发、UI/UX 设计及 SEO 优化等多个环节。通过本清单，团队成员可以清晰地了解各项任务的输入、输出及协作关系，确保运营策略的有效落地。**本清单特别强调 OpenClaw 抓取规则的自动化生成与应用，以实现平台的快速冷启动。**

## 一、 OpenClaw 数据采集与规则生成策略

**目标**：高效、准确地采集竞品 TAAFT 的关键数据，并自动化生成 OpenClaw 抓取规则，为产品功能设计、内容策略及 SEO 优化提供数据支撑。

**参考文档**：请查阅 `docs/data/openclaw_rules.json` 以获取详细的抓取配置。

| 采集目标 | 关键数据字段 | 竞品 URL 模式 | 优先级 | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| **AI 工具核心数据** | 工具名称、描述、官网链接、Logo、定价模式、所属分类 | `/ai/{tool-name}` | P0 | 全站占比 56.5%，是最核心的数据源。需注意处理官网链接的重定向。 |
| **分类导航体系** | 分类名称、分类描述、分类下工具列表 | `/task/{category}` | P0 | 用于构建本平台的初始分类树（约 1.1 万个分类）。 |
| **关键词映射数据** | 搜索关键词、对应的工具列表 | `/s/{keyword}` | P1 | 用于分析 TAAFT 的关键词覆盖策略，并作为长尾 SEO 优化的基础语料。 |
| **AI 公司数据** | 公司名称、旗下工具列表 | `/company/{name}` | P2 | 用于丰富数据维度，构建公司与工具的关联。 |
| **GPTs 与 API 数据** | GPT/API 名称、描述、原始链接 | `/gpt/{gpt-name}`, `/apis/s/{keyword}` | P2 | 作为平台功能的拓展数据储备。 |

**OpenClaw 规则执行**：

1. 将 `docs/data/openclaw_rules.json` 导入 OpenClaw 系统。
2. 开启 Cloudflare 绕过模式（Headless 浏览器 + 代理池）。
3. 设定抓取频率（建议单 IP < 20 次/分钟），优先抓取 P0 级数据。

## 二、 Cursor 开发任务书

**目标**：根据 ORD 中的功能支撑需求，利用 Cursor 快速生成高质量的代码，实现核心产品功能和 SEO 逻辑。

| 模块 | 核心功能 | ORD 关联章节 | Cursor 提示词示例 |
| :--- | :--- | :--- | :--- |
| **基础框架** | Next.js 项目初始化与路由配置 | 3.1 第一阶段 | `Initialize a Next.js 14 project with App Router. Set up dynamic routing for tool detail pages (/tool/[slug]) and category pages (/category/[slug]). Configure Tailwind CSS for styling.` |
| **SEO 优化** | 自动化 TDK 与 Schema 标记 | 2.1 流量获取策略 | `Create a reusable SEO component in Next.js that dynamically generates Title, Meta Description, and Open Graph tags based on props. Also, generate JSON-LD structured data for "SoftwareApplication" and "AggregateRating" for the tool detail page.` |
| **数据展示** | 工具详情页渲染 | 2.2 用户分层 | `Build a React component for the tool detail page. It should display the tool's logo, name, description, a "Visit Website" button (with outbound click tracking), pricing badge, and a list of categories. Implement lazy loading for the logo image.` |
| **社区互动** | 评分与评论系统 | 2.3 内容治理 | `Create a review component where authenticated users can submit a 1-5 star rating and a text review. Include a backend API route (using Prisma and PostgreSQL) to handle the submission and calculate the new average rating for the tool.` |
| **后台管理** | 开发者认领审核流程 | 3.2 第二阶段 | `Build an admin dashboard view to list all pending "developer claim" requests. Include approve and reject buttons that update the tool's ownership status in the database and send an email notification to the developer.` |

## 三、 Figma UI/UX 设计提示词

**目标**：基于竞品 TAAFT 移动端跳出率偏高（51.99%）的劣势，设计一套移动优先、强内容导向的 UI/UX 方案，提升用户体验和留存。

| 设计目标 | 核心页面/模块 | FigmaMake 提示词示例 |
| :--- | :--- | :--- |
| **降低跳出率，提升探索欲** | 首页 (Homepage) | `Design a mobile-first homepage for an AI tool directory. The hero section should feature a large, intuitive search bar. Below it, use a masonry grid layout for "Trending Tools" cards. Each card must have a clear visual hierarchy: Tool Logo -> Name -> 1-sentence description -> Pricing tag. Use a clean, tech-focused dark mode color palette.` |
| **强化评测与信任感** | 工具详情页 (Tool Detail) | `Design the tool detail page with a focus on trust and user reviews. The top section should clearly display the tool's average rating stars next to its name. Include a dedicated section for "In-Depth Review" and a separate "User Comments" feed. Add a sticky bottom bar on mobile for the "Visit Website" CTA.` |
| **抢占非品牌搜索流量** | 替代品对比页 (Alternatives) | `Design an SEO-optimized "Alternatives" comparison page. The layout should feature a side-by-side comparison table of a target tool vs. 3 alternatives. Highlight key differences in features, pricing, and user ratings. Make the table scrollable horizontally on mobile devices.` |

## 四、 SEO 关键词库与内容策略

**目标**：针对 TAAFT 在非品牌关键词上的极大劣势，构建全面的长尾关键词库，并制定主动式截流内容策略，抢占自然搜索流量。

| 策略方向 | 核心任务 | 关联 ORD 章节 | 优先级 | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| **长尾关键词覆盖** | 建立 `[行业/场景] + AI tools` 静态分类页 | 2.1 流量获取 | 高 | 针对 TAAFT 未能排入 Top 100 的词（如 "AI tools for marketing", "AI tools for HR"）进行重点优化。 |
| **品牌词主动截流** | 批量生成 `[知名品牌] + Alternatives` 深度评测文章 | 2.1 流量获取 | 极高 | 针对 TAAFT 被动生成且无排名的品牌替代词（如 "ChatGPT alternative", "Midjourney alternative"），由人工或 AI 撰写高质量对比文章。 |
| **结构化数据优化** | 全站部署 Schema Markup | 3.1 第一阶段 | 高 | 确保所有工具页和评测文章页都具备完整的结构化数据，争取 Google 搜索结果的富文本展示（如星级评分、价格），提高点击率。 |
| **内容权威性建设** | 发布行业趋势报告与开发者访谈 | 2.3 内容治理 | 中 | 提升网站的 Domain Authority，获取高质量的外部反向链接（Backlinks）。 |

## 五、 参考资料 (References)

* [1] TAAFT 竞品分析报告 v2.0 - `/home/ubuntu/competitor_analysis/TAAFT_Competitor_Analysis_Report_v2.md`
* [2] 运营需求文档 (ORD) - `/home/ubuntu/competitor_analysis/TAAFT_ORD_Document.md`
* [3] OpenClaw 抓取规则配置 - `/home/ubuntu/competitor_analysis/openclaw_rules.json`
