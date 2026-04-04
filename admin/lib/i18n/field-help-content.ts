/** 管理后台「页面内字段说明」：与界面语言同步；供 t("fieldHelp.*") 使用 */

export type FieldHelpTree = {
  login: { email: string; password: string };
  dashboard: {
    todayPv: string;
    todayUv: string;
    todayUid: string;
    registeredUsers: string;
    activeTools: string;
    pendingTools: string;
    reportedReviews: string;
    trafficTrend: string;
    trendRange: string;
    rangeQuick: string;
    exportCsv: string;
  };
  analytics: {
    dateRange: string;
    quickDays: string;
    groupByPath: string;
    groupByType: string;
    groupByIntro: string;
    sortBy: string;
    exportCsv: string;
    colType: string;
    colPageNameZh: string;
    colPath: string;
    colPv: string;
    colUv: string;
    colUid: string;
    colAvgTime: string;
    colBounce: string;
  };
  toolsList: {
    tabHint: string;
    colId: string;
    colTool: string;
    colCategory: string;
    colWebsite: string;
    colEmail: string;
    colStatus: string;
    colMetrics: string;
    colActions: string;
  };
  toolsEdit: {
    name: string;
    tagline: string;
    description: string;
    longDesc: string;
    website: string;
    pricing: string;
    icon: string;
    category: string;
  };
  users: {
    colUid: string;
    colUser: string;
    colRole: string;
    colLastLogin: string;
    colSubmissions: string;
    colActions: string;
  };
  reviews: {
    colId: string;
    colTool: string;
    colReviewer: string;
    colStars: string;
    colPreview: string;
    colStatus: string;
    colReports: string;
    colActions: string;
  };
  monet: {
    summaryTotal: string;
    summaryRevenue: string;
    summaryActive: string;
    summaryPending: string;
    colOrder: string;
    colTool: string;
    colToolId: string;
    colBuyer: string;
    colBuyerId: string;
    colAmount: string;
    colPayment: string;
    colValidity: string;
    colPromo: string;
    colCreated: string;
    colWindow: string;
    colActions: string;
  };
  pageSeo: {
    filter: string;
    addPathRow: string;
    save: string;
    k: {
      title: string;
      description: string;
      keywords: string;
      og_title: string;
      og_description: string;
      title_zh: string;
      title_en: string;
      description_zh: string;
      description_en: string;
      keywords_zh: string;
      keywords_en: string;
      og_title_zh: string;
      og_title_en: string;
      og_description_zh: string;
      og_description_en: string;
      og_image: string;
      canonical: string;
      og_url: string;
      noindex: string;
      og_type: string;
    };
  };
  settings: {
    scopeAdmin: string;
    scopeFrontend: string;
    scopeIntro: string;
    menuTitle: string;
    colOrder: string;
    colKey: string;
    colLabel: string;
    colPath: string;
    colIcon: string;
    colPermission: string;
    colVisible: string;
    colActions: string;
    save: string;
  };
};

export const fieldHelpZh: FieldHelpTree = {
  login: {
    email: "管理员登录邮箱，须对应数据库中 role 为 admin 的账号。",
    password: "账户密码；请通过 HTTPS 或本地访问提交，勿在公共环境明文传输。",
  },
  dashboard: {
    todayPv: "今日 0 点至当前，全站页面浏览次数总和（每次打开页面计数，同用户重复访问会累加）。",
    todayUv: "今日按 session 去重后的访客数（近似独立访客，依赖前端 session_id 生命周期）。",
    todayUid: "今日埋点中带已登录 user_id 的去重人数（仅统计当日有浏览行为的登录用户）。",
    registeredUsers: "app_user 表中累计注册用户数（含未活跃用户）。",
    activeTools: "tool 表中 moderation_status=active、对外展示的上线工具数量。",
    pendingTools: "尚待审核的工具条目数；点击可跳转审核列表待处理标签。",
    reportedReviews: "用户举报的 review 条数（ugc_status=reported 等）；需跟进处理。",
    trafficTrend: "按日聚合全站 PV/UV/登录 UID，便于观察流量波动。",
    trendRange: "折线图统计区间：日历选起止日或下方快捷天数；最长约一年。",
    rangeQuick: "将区间对齐为「含今日」的最近 N 天，便于与常见报表口径一致。",
    exportCsv: "导出当前卡片展示的核心指标为 CSV，便于留档或在外部表格分析。",
  },
  analytics: {
    dateRange: "页面流量汇总所统计的日历区间（含起止日）；可选快捷天数。",
    quickDays: "一键将区间设为「含今日」的最近 N 天。",
    groupByPath: "按页面路径（及目录登记的中文名）分列，便于定位单页。",
    groupByType: "按页面类型聚合（如 home、detail），便于看结构流量。",
    groupByIntro: "「按路径」一行一页；「按类型」把同类页面流量加总。可配合排序按钮切换口径。",
    sortBy: "表格排序依据：PV 总浏览、UV 去重访客或 UID 登录访客。",
    exportCsv: "导出当前筛选与分组下的表格为 CSV。",
    colType: "页面类型标签，来自路径规则或目录登记。",
    colPageNameZh: "在目录/配置中登记的中文展示名，非路径本身。",
    colPath: "用户访问的规范化路径（不含域名）。",
    colPv: "区间内该维度下的页面浏览次数之和。",
    colUv: "区间内按 session 去重后的访客量（同列说明口径与大盘 UV 一致）。",
    colUid: "区间内带登录用户 ID 的去重访客数。",
    colAvgTime: "由停留时间埋点估算的次均停留秒数（按 PV 加权）。",
    colBounce: "跳出率：进入后未继续浏览其他页面的会话占比估计值。",
  },
  toolsList: {
    tabHint: "筛选审核状态：待审核、已上线、已拒绝或查看全部。",
    colId: "工具在数据库中的主键 ID。",
    colTool: "工具名称及缩略展示；可进入编辑页改文案与分类。",
    colCategory: "所属分类 slug，对应前台目录结构。",
    colWebsite: "提交或维护的官网外链，用于跳转与审核核对。",
    colEmail: "提交人联系邮箱（若提交时提供）。",
    colStatus: "审核状态：pending / active / rejected 等。",
    colMetrics: "该工具相关路径上的 PV、UV、UID 汇总（列表接口附带）。",
    colActions: "审核通过/拒绝、精选标记等运营操作入口。",
  },
  toolsEdit: {
    name: "前台列表与详情标题展示名，建议与品牌正式名称一致。",
    tagline: "一句话卖点，用于卡片与摘要区。",
    description: "短介绍，列表与 SEO 描述可引用；请控制长度便于扫描。",
    longDesc: "详情页正文，可 Markdown/HTML 依前台渲染规则。",
    website: "带协议的可访问官网 URL，用于外链与审核。",
    pricing: "定价模式文案（如 Free / Paid），与筛选展示一致。",
    icon: "单字符 Emoji 或简短图标占位，用于无 Logo 时展示。",
    category: "决定工具出现的目录；选项来自公开分类接口。",
  },
  users: {
    colUid: "用户主键 ID。",
    colUser: "邮箱与昵称等展示信息（脱敏策略依后台实现）。",
    colRole: "角色标识（含 admin 与普通用户）；影响前台/后台权限。",
    colLastLogin: "最近一次成功登录时间（服务端记录）。",
    colSubmissions: "该用户提交的工具数量等业务计数。",
    colActions: "封禁、改角色、发送测试邮件等管理能力。",
  },
  reviews: {
    colId: "评论记录主键。",
    colTool: "被评价的托管工具名称。",
    colReviewer: "评论者展示名或脱敏标签。",
    colStars: "星级评分（通常为 1～5）。",
    colPreview: "正文截取，点击查看完整内容。",
    colStatus: "UGC 状态：展示中、隐藏、已删除等。",
    colReports: "被用户举报次数，需重点关注。",
    colActions: "隐藏、恢复展示或删除评论。",
  },
  monet: {
    summaryTotal: "库中 monetization_order 行数，含所有支付状态。",
    summaryRevenue: "payment_status=paid 的 amount_cents 合计换算为美元。",
    summaryActive: "今日日期落在 valid_from～valid_until 且已支付的订单数。",
    summaryPending: "尚为 pending 的订单笔数，需收款或关单。",
    colOrder: "商业订单内部编号。",
    colTool: "购买推广位的工具名称。",
    colToolId: "关联 tool.id，可跳转后台编辑页。",
    colBuyer: "下单用户邮箱或账户标识。",
    colBuyerId: "关联 app_user.id。",
    colAmount: "订单金额（USD 展示）。",
    colPayment: "支付状态：pending/paid/refunded/cancelled，可由运营人工修正。",
    colValidity: "推广展示生效的起止日期区间；止期可在操作中展期。",
    colPromo: "推广曝光的 PV/UV/UID 累计或快照字段（与埋点汇总对齐视实现而定）。",
    colCreated: "订单写入库时间 created_at。",
    colWindow: "已支付且今日在 valid 区间内为「生效中」，否则「已过期」。",
    colActions: "改支付状态、延长 valid_until；变更后用户侧 /api/me/orders 同步可见。",
  },
  pageSeo: {
    filter: "按路径片段筛选左侧列表，便于在页面较多时定位。",
    addPathRow: "输入站内 path（会自动补全前导 /、去尾斜杠），可新增尚未出现在列表中的路由并为其写 SEO。",
    save: "将右侧草稿一次性写入 page_seo 表；会影响前台 useResolvedPageSeo 与爬虫可见元数据。",
    k: {
      title: "通用标题兜底（无前中后细分时使用）；覆盖浏览器标题与分享默认标题。",
      description: "通用 meta description 兜底。",
      keywords: "通用 meta keywords 兜底（逗号分隔）。",
      og_title: "Open Graph 标题兜底，用于社交分享卡片。",
      og_description: "Open Graph 描述兜底。",
      title_zh: "中文环境下的 <title> 与展示标题（若前台按语言读取）。",
      title_en: "英文环境下的页面标题。",
      description_zh: "中文 meta 描述，利于中文搜索结果摘要。",
      description_en: "英文 meta 描述。",
      keywords_zh: "中文关键词串。",
      keywords_en: "英文关键词串。",
      og_title_zh: "中文场景分享标题。",
      og_title_en: "英文场景分享标题。",
      og_description_zh: "中文分享描述。",
      og_description_en: "英文分享描述。",
      og_image: "分享缩略图绝对 URL（建议 https）。",
      canonical: "规范链接，合并重复 URL signals；需完整或站内绝对路径依前端实现。",
      og_url: "Open Graph url 字段，一般与 canonical 或页面公网地址一致。",
      noindex: "勾选后倾向于告知爬虫不索引此页（存为 1/true 等，与前台解析一致）。",
      og_type: "Open Graph 类型：website 或 article，影响部分平台的卡片样式。",
    },
  },
  settings: {
    scopeAdmin: "左侧导航等仅管理端可见菜单项，存在 settings payload 的 admin 段。",
    scopeFrontend: "用户可见站点的导航/入口配置（与前台路由一致）。",
    scopeIntro:
      "在「管理端 / 前台」之间切换编辑不同导航表；保存前请确认当前 tab 对应目标站点，避免改错环境。",
    menuTitle: "整表为可排序菜单项；保存后写入全站设置并由前台读取。",
    colOrder: "显示顺序，数字越小越靠前。",
    colKey: "稳定键，用于前端逻辑或权限判断，勿随意改名。",
    colLabel: "菜单展示文案。",
    colPath: "点击后跳转的路由 path，须与前台 Router 配置一致。",
    colIcon: "图标名或 emoji，依赖前台解析方式。",
    colPermission: "访问所需权限或角色码；空表示不额外校验。",
    colVisible: "是否在对应端展示该项。",
    colActions: "行内编辑或删除菜单项。",
    save: "将当前表格写回 /api/admin/settings；请谨慎在高峰期大批量修改。",
  },
};

export const fieldHelpEn: FieldHelpTree = {
  login: {
    email: "Admin email; must match an app_user row with admin role.",
    password: "Account password; use HTTPS or localhost—never send plaintext on untrusted networks.",
  },
  dashboard: {
    todayPv: "Total page views today (midnight–now); repeats from the same visitor count.",
    todayUv: "Unique visitors today by session_id (approx.).",
    todayUid: "Unique signed-in users today (distinct user_id in events).",
    registeredUsers: "All registered users in app_user.",
    activeTools: "Live tools (moderation_status=active).",
    pendingTools: "Tools awaiting review; click to open the queue.",
    reportedReviews: "Reviews flagged by users—needs moderation.",
    trafficTrend: "Daily PV / UV / signed-in UID for the selected range.",
    trendRange: "Chart range: pick dates or quick N-day window (max ~1 year).",
    rangeQuick: "Snap range to last N calendar days including today.",
    exportCsv: "Download the summary metrics on this page as CSV.",
  },
  analytics: {
    dateRange: "Inclusive start/end dates for page-traffic aggregation.",
    quickDays: "Set range to the last N days including today.",
    groupByPath: "One row per normalized path (with catalog display name).",
    groupByType: "Roll up by page type (home, detail, …).",
    groupByIntro: "Path = one row per URL. Type = summed traffic per page family. Use sort toggles for the ranking metric.",
    sortBy: "Sort rows by PV, UV, or signed-in UID volume.",
    exportCsv: "Export the current table (filters & grouping) to CSV.",
    colType: "Inferred or catalog page type.",
    colPageNameZh: "Registered Chinese label for the path (not the URL itself).",
    colPath: "Normalized site path (no origin).",
    colPv: "Sum of page views in the range.",
    colUv: "Session-unique visitors in the range (same definition as dashboard UV).",
    colUid: "Unique signed-in users touching that row’s paths.",
    colAvgTime: "Average dwell time in seconds (PV-weighted estimate).",
    colBounce: "Estimated share of sessions that leave without a second page view.",
  },
  toolsList: {
    tabHint: "Filter by moderation pipeline stage.",
    colId: "Database primary key of the tool.",
    colTool: "Display name; open edit to change copy & category.",
    colCategory: "Category slug used on the public site.",
    colWebsite: "Official URL submitted for review and outbound link.",
    colEmail: "Submitter email when provided.",
    colStatus: "Moderation status (pending / active / rejected).",
    colMetrics: "PV / UV / UID aggregates for this tool’s tracked paths.",
    colActions: "Approve/reject, feature flag, etc.",
  },
  toolsEdit: {
    name: "Public title on listings and detail.",
    tagline: "One-line hook on cards.",
    description: "Short blurb for lists and SEO snippets.",
    longDesc: "Detail body—respect front-end rendering rules.",
    website: "Canonical URL including scheme.",
    pricing: "Pricing label (Free / Paid, …) shown in filters.",
    icon: "Emoji or short icon token if no logo asset.",
    category: "Directory placement; options from the public category API.",
  },
  users: {
    colUid: "User id.",
    colUser: "Email / display name as configured.",
    colRole: "Role string—admin vs user capabilities.",
    colLastLogin: "Last successful sign-in timestamp.",
    colSubmissions: "Count of submissions from this user.",
    colActions: "Ban/unban, change role, send mail hooks.",
  },
  reviews: {
    colId: "Review row id.",
    colTool: "Tool being reviewed.",
    colReviewer: "Reviewer display label.",
    colStars: "Star rating (usually 1–5).",
    colPreview: "Truncated body—open for full text.",
    colStatus: "UGC workflow status.",
    colReports: "Number of user reports.",
    colActions: "Hide, restore, or delete.",
  },
  monet: {
    summaryTotal: "Rows in monetization_order (every status).",
    summaryRevenue: "Sum of paid orders in USD.",
    summaryActive: "Paid orders whose validity window includes today.",
    summaryPending: "Orders still marked pending.",
    colOrder: "Internal order id.",
    colTool: "Promoted tool name.",
    colToolId: "tool.id — link to admin edit screen.",
    colBuyer: "Buyer email / account ref.",
    colBuyerId: "app_user.id.",
    colAmount: "Amount in USD.",
    colPayment: "pending / paid / refunded / cancelled (editable by admins).",
    colValidity: "Promotion window; end date can be extended in Actions.",
    colPromo: "PV/UV/UID figures stored on the order row.",
    colCreated: "created_at when the row was inserted.",
    colWindow: "Paid + today inside valid_from/valid_until means Active; otherwise Expired.",
    colActions: "Update status or extend valid_until; reflected on user order APIs.",
  },
  pageSeo: {
    filter: "Filter the path list by substring when you have many routes.",
    addPathRow: "Type a site path (leading slash added, trailing slash trimmed) to seed SEO for a new route key.",
    save: "Persist the draft to page_seo; affects public meta resolution and crawlers.",
    k: {
      title: "Fallback <title> when no locale-specific title is set.",
      description: "Fallback meta description.",
      keywords: "Fallback meta keywords (comma-separated).",
      og_title: "Fallback Open Graph title for social previews.",
      og_description: "Fallback OG description.",
      title_zh: "Chinese page title if the FE reads locale-specific keys.",
      title_en: "English page title.",
      description_zh: "Chinese meta description snippet.",
      description_en: "English meta description.",
      keywords_zh: "Chinese keyword list.",
      keywords_en: "English keyword list.",
      og_title_zh: "Chinese OG title.",
      og_title_en: "English OG title.",
      og_description_zh: "Chinese OG description.",
      og_description_en: "English OG description.",
      og_image: "HTTPS image URL for sharing cards.",
      canonical: "Canonical URL to consolidate duplicates (format per FE contract).",
      og_url: "OG url, usually matches canonical/public URL.",
      noindex: "When checked, flags noindex for crawlers (stored as 1/true per FE parser).",
      og_type: "OG type: website vs article.",
    },
  },
  settings: {
    scopeAdmin: "Admin chrome menu items stored in settings payload.",
    scopeFrontend: "Public navigation entries read by the marketing site.",
    scopeIntro: "Toggle admin vs public nav tables; save to the intended surface only.",
    menuTitle: "Editable menu rows persisted via /api/admin/settings.",
    colOrder: "Sort order; lower shows first.",
    colKey: "Stable key for code paths—rename carefully.",
    colLabel: "Visible menu label.",
    colPath: "Router path opened when the menu item is clicked.",
    colIcon: "Icon token / emoji (front-end dependent).",
    colPermission: "Required permission if any; blank = none.",
    colVisible: "Whether the item appears in that surface.",
    colActions: "Row edit / delete.",
    save: "Persist this table—avoid huge bulk edits during peak if possible.",
  },
};
