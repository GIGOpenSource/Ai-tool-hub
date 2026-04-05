import { type FieldHelpTree, fieldHelpEn, fieldHelpZh } from "./field-help-content";

export type AdminLocale = "zh" | "en";

type MsgTree = {
  common: {
    dash: string;
  };
  sidebar: {
    brandAdmin: string;
    brandTitle: string;
    dashboard: string;
    analytics: string;
    tools: string;
    users: string;
    reviews: string;
    monetization: string;
    settings: string;
    pageSeo: string;
    /** 站点内容块 JSON 编辑（site_json 白名单） */
    siteBlocks: string;
    /** 首页 SEO 分字段（brand_title / keywords） */
    homeSeoForm: string;
    /** 全站 translation 表 */
    translations: string;
    /** 对比页 comparison_page */
    comparisons: string;
    /** 首页搜索联想词 search_suggestion */
    searchSuggestions: string;
    /** 工具详情 JSON-LD：site_json.seo_tool_json_ld */
    toolJsonLd: string;
    /** 提交页 site_json.submit 分字段 */
    siteSubmitForm: string;
    /** 仪表盘 site_json.dashboard 分字段 */
    siteDashboardForm: string;
    /** PROD-AI-SEO：大模型 SEO/流量分析 */
    aiSeoInsights: string;
    /** PROD-CRAWLER：JSON 订阅导入工具目录 */
    crawlerData: string;
  };
  header: {
    console: string;
    logout: string;
    language: string;
  };
  shell: {
    verifying: string;
  };
  login: {
    title: string;
    hint: string;
    email: string;
    password: string;
    submit: string;
    submitting: string;
    errAdminRequired: string;
    errFailed: string;
    errLoginFailed: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    /** 流量趋势图的时间区间选择器 */
    trendDateRange: string;
    loading: string;
    exportCsv: string;
    metricTodayPv: string;
    metricTodayUv: string;
    metricTodayUid: string;
    metricRegisteredUsers: string;
    metricActiveTools: string;
    subTotalRegistered: string;
    subActiveTools: string;
    pendingTools: string;
    reportedReviews: string;
    trafficTrend: string;
    /** e.g. 7 天 / 7d */
    rangeDays: string;
    noTrend: string;
  };
  metric: {
    vsYesterday: string;
  };
  chart: {
    pv: string;
    uv: string;
    uid: string;
  };
  analytics: {
    title: string;
    subtitle: string;
    exportCsv: string;
    groupByPath: string;
    groupByType: string;
    /** 区间日历弹层标题 / 按钮辅助说明 */
    dateRange: string;
    startDate: string;
    endDate: string;
    quickDays: string;
    sortBy: string;
    colPageNameZh: string;
    colPath: string;
    colType: string;
    colPv: string;
    colUv: string;
    colUid: string;
    colAvgTime: string;
    colBounce: string;
    loading: string;
  };
  tools: {
    title: string;
    tabAll: string;
    tabPending: string;
    tabActive: string;
    tabRejected: string;
    colId: string;
    colTool: string;
    colCategory: string;
    colEmail: string;
    colStatus: string;
    colMetrics: string;
    colActions: string;
    colWebsite: string;
    edit: string;
    editTitle: string;
    editBack: string;
    editSave: string;
    editSaving: string;
    editSuccess: string;
    editErr: string;
    fieldName: string;
    fieldTagline: string;
    fieldDescription: string;
    fieldLongDesc: string;
    fieldWebsite: string;
    fieldPricing: string;
    fieldIcon: string;
    fieldCategory: string;
    approve: string;
    reject: string;
    featured: string;
    unfeature: string;
    loading: string;
    emptyList: string;
  };
  reject: {
    title: string;
    cancel: string;
    confirm: string;
    urlInvalid: string;
    descViolation: string;
    notAiTool: string;
    duplicate: string;
    other: string;
  };
  users: {
    title: string;
    colUid: string;
    colUser: string;
    colRole: string;
    colLastLogin: string;
    colSubmissions: string;
    colActions: string;
    ban: string;
    unban: string;
    emailMock: string;
    loading: string;
    emptyList: string;
  };
  reviews: {
    title: string;
    colId: string;
    colTool: string;
    colReviewer: string;
    colStars: string;
    colPreview: string;
    colStatus: string;
    colReports: string;
    colActions: string;
    fullText: string;
    hide: string;
    restore: string;
    delete: string;
    loading: string;
    emptyList: string;
  };
  monet: {
    title: string;
    subtitle: string;
    summaryTotal: string;
    summaryRevenue: string;
    summaryActive: string;
    summaryPending: string;
    filterAll: string;
    filterPending: string;
    filterPaid: string;
    filterRefunded: string;
    filterCancelled: string;
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
    colActions: string;
    badgeActive: string;
    badgeExpired: string;
    colWindow: string;
    linkEditTool: string;
    exportCsv: string;
    extendPlaceholder: string;
    extendSubmit: string;
    patchOk: string;
    patchErr: string;
    loading: string;
    emptyList: string;
  };
  settings: {
    title: string;
    subtitle: string;
    menuTitle: string;
    scopeAdmin: string;
    scopeFrontend: string;
    addMenu: string;
    editMenu: string;
    deleteMenu: string;
    emptyMenus: string;
    colOrder: string;
    colKey: string;
    colLabel: string;
    colPath: string;
    colIcon: string;
    colPermission: string;
    colVisible: string;
    colActions: string;
    visibleYes: string;
    visibleNo: string;
    cancel: string;
    confirm: string;
    save: string;
    saving: string;
    errSave: string;
    success: string;
  };
  pageSeo: {
    title: string;
    subtitle: string;
    search: string;
    colPath: string;
    colLabel: string;
    hintSelect: string;
    addPath: string;
    addPathPlaceholder: string;
    fieldsHint: string;
    titleAny: string;
    descAny: string;
    kwAny: string;
    ogTitleAny: string;
    ogDescAny: string;
    titleZh: string;
    titleEn: string;
    descZh: string;
    descEn: string;
    kwZh: string;
    kwEn: string;
    ogTitleZh: string;
    ogTitleEn: string;
    ogDescZh: string;
    ogDescEn: string;
    ogImage: string;
    canonical: string;
    ogUrl: string;
    noindex: string;
    ogType: string;
    ogTypeDef: string;
    ogTypeWebsite: string;
    ogTypeArticle: string;
    save: string;
    saving: string;
    errSave: string;
    success: string;
    loading: string;
  };
  aiSeoInsights: {
    title: string;
    subtitle: string;
    costHint: string;
    slowHint: string;
    tabRun: string;
    tabProvider: string;
    tabConfigs: string;
    tabHistory: string;
    selectConfig: string;
    run: string;
    running: string;
    output: string;
    noOutput: string;
    baseUrl: string;
    model: string;
    timeout: string;
    temperature: string;
    extraHeaders: string;
    apiKeyPlaceholder: string;
    apiKeyEnvName: string;
    saveProvider: string;
    saving: string;
    savedProvider: string;
    errProvider: string;
    configName: string;
    systemPrompt: string;
    userTemplate: string;
    placeholdersHint: string;
    defaultConfig: string;
    addConfig: string;
    saveConfig: string;
    deleteConfig: string;
    colTime: string;
    colAdmin: string;
    colConfig: string;
    colModel: string;
    colStatus: string;
    colSummary: string;
    statusOk: string;
    statusPending: string;
    statusFail: string;
    viewDetail: string;
    runDetailTitle: string;
    back: string;
    deleteRun: string;
    inputPayload: string;
    promptSnapshot: string;
    providerSnapshot: string;
    errMessage: string;
    duration: string;
    tokens: string;
    loading: string;
    errRun: string;
    errAbortTimeout: string;
    errPollTimeout: string;
    confirmDeleteRun: string;
    confirmDeleteConfig: string;
    /** 分析页：选用哪条大模型连接 */
    selectLlmProvider: string;
    /** 连接显示名（如 OpenAI / 通义） */
    llmProviderName: string;
    /** 大模型 Tab 说明 */
    providerTabIntro: string;
    addLlmProvider: string;
    saveLlmProvider: string;
    deleteLlmProvider: string;
    confirmDeleteLlmProvider: string;
    savedLlmProvider: string;
    errLastProvider: string;
    /** 勾选后作为「默认启用」的大模型连接（分析未指定时用） */
    defaultLlmProvider: string;
    /** 后台执行（HTTP 202）说明 */
    deferLlmHint: string;
    /** 产品开放决策折叠标题（P-AI-07） */
    openDecisionsTitle: string;
    /** 路径与占位 tbd 总述 */
    openDecisionsIntro: string;
    /** 键 data_residency_and_cross_border 说明 */
    openDecisionsKeyDataResidency: string;
    /** 键 model_output_format 说明 */
    openDecisionsKeyModelOutput: string;
    /** 键 cost_quota_and_retention 说明 */
    openDecisionsKeyCostQuota: string;
    /** 勿作法务/对外承诺唯一或充分依据（独立警示段） */
    openDecisionsDisclaimer: string;
    /** 后台执行工程边界折叠标题（BackgroundTasks / 多实例 / pending） */
    deferEngineCaveatsTitle: string;
    /** 后台执行工程边界正文 */
    deferEngineCaveatsBody: string;
    seoTasksSectionTitle: string;
    seoTasksIntro: string;
    seoTasksGenerate: string;
    seoTasksGenerating: string;
    seoTasksReplaceDrafts: string;
    seoTasksColTitle: string;
    seoTasksColKind: string;
    seoTasksColStatus: string;
    seoTasksColPayload: string;
    seoTasksApprove: string;
    seoTasksReject: string;
    seoTasksApply: string;
    seoTasksCodePrNoApply: string;
    seoTasksCopyPayload: string;
    seoTasksAuditSectionTitle: string;
    seoTasksAuditColKey: string;
    seoTasksAuditColCreated: string;
    seoTasksAuditColStatus: string;
    seoTasksAuditRollback: string;
    seoTasksAuditRolledBack: string;
    seoTasksDeleteDraft: string;
    seoTasksStatusDraft: string;
    seoTasksStatusApproved: string;
    seoTasksStatusApplied: string;
    seoTasksStatusFailed: string;
    seoTasksStatusRejected: string;
    seoTasksOnlySuccessRun: string;
    seoTasksEmpty: string;
    /** 大模型连接：协议适配器（v2.x） */
    llmAdapter: string;
    /** 当前唯一可选：OpenAI 兼容 chat/completions */
    llmAdapterOpenAICompatible: string;
    /** 主列表：存在 pending 分析时的运维提示 */
    pendingRunsHint: string;
    /** 详情页：二次确认区块标题 */
    stepUpBlockTitle: string;
    /** 共享口令输入说明 */
    stepUpPasswordShared: string;
    /** 登录密码复核说明 */
    stepUpPasswordLogin: string;
    /** 站点 JSON 修订史标题 */
    seoRevisionsTitle: string;
    /** 修订史：选择 content_key */
    seoRevisionsKeyLabel: string;
    /** 修订史：ref 列 */
    seoRevisionsRefCol: string;
    /** 修订史：无记录 */
    seoRevisionsEmpty: string;
  };
  siteJson: {
    title: string;
    subtitle: string;
    selectKey: string;
    hint: string;
    save: string;
    saving: string;
    success: string;
    errSave: string;
    errJson: string;
    errObject: string;
    tabVisual: string;
    tabJson: string;
    visualIntro: string;
    seoPath: string;
    seoPriority: string;
    seoChangefreq: string;
    seoAddRow: string;
    seoRemove: string;
    nestedHint: string;
    errNested: string;
    /** 当前选中块与公开 API 的对照标题 */
    referenceTitle: string;
    /** 各 content_key 一行说明，路径 siteJson.blockHelp.<key> */
    blockHelp: {
      ui_toasts: string;
      guide: string;
      more: string;
      sitemap: string;
      profile: string;
      favorites: string;
      compare_interactive: string;
      submit: string;
      not_found: string;
      dashboard: string;
      seo_sitemap_static: string;
      seo_robots: string;
      ai_insight_competitor_benchmarks: string;
    };
  };
  comparisonAdmin: {
    title: string;
    subtitle: string;
    slugLabel: string;
    slugPlaceholder: string;
    tabVisual: string;
    tabJson: string;
    visualIntro: string;
    save: string;
    saving: string;
    errSave: string;
    errTopObject: string;
    sectionMain: string;
    sectionAlts: string;
    addAlt: string;
    remove: string;
    sectionSeo: string;
    sectionCards: string;
    addCard: string;
    sectionMatrix: string;
    matrixHint: string;
    footerNote: string;
    errJson: string;
    fieldName: string;
    fieldLogo: string;
    fieldDeveloper: string;
    fieldRating: string;
    fieldPricing: string;
    fieldDescription: string;
    fieldTitle: string;
    fieldBody: string;
    seoTitleSuffix: string;
    seoIntro: string;
    seoChooserTitle: string;
    seoChooserIntro: string;
    notFoundHint: string;
    /** 可折叠的 API/前台字段说明标题 */
    referenceTitle: string;
    /** 总述：路由与数据源 */
    refIntro: string;
    refMain: string;
    refAlts: string;
    refSeo: string;
    refCards: string;
    refMatrix: string;
    refFooter: string;
  };
  /** 各页表单、表头下方的字段说明（见 field-help-content.ts） */
  fieldHelp: FieldHelpTree;
};

export const messages: Record<AdminLocale, MsgTree> = {
  zh: {
    common: { dash: "—" },
    sidebar: {
      brandAdmin: "管理端",
      brandTitle: "AI 工具导航",
      dashboard: "数据大盘",
      analytics: "页面流量",
      tools: "工具审核",
      users: "用户",
      reviews: "评论",
      monetization: "商业化管理",
      settings: "系统设置",
      pageSeo: "页面 SEO",
      siteBlocks: "站点 JSON",
      homeSeoForm: "首页 SEO",
      translations: "多语言词条",
      comparisons: "对比页",
      searchSuggestions: "搜索联想",
      toolJsonLd: "工具 JSON-LD",
      siteSubmitForm: "提交页内容",
      siteDashboardForm: "仪表盘内容",
      aiSeoInsights: "AI SEO 分析",
      crawlerData: "数据采集",
    },
    header: {
      console: "管理控制台",
      logout: "退出",
      language: "语言",
    },
    shell: {
      verifying: "验证会话中…",
    },
    login: {
      title: "后台登录",
      hint: "仅管理员可访问。默认：admin@example.com / admin123",
      email: "邮箱",
      password: "密码",
      submit: "进入管理后台",
      submitting: "登录中…",
      errAdminRequired: "需要管理员账号",
      errFailed: "登录失败，请检查邮箱与密码",
      errLoginFailed: "登录失败",
    },
    dashboard: {
      title: "数据大盘",
      subtitle: "全站核心指标（数据来自埋点库）",
      trendDateRange: "趋势时间区间",
      loading: "加载中…",
      exportCsv: "导出 CSV",
      metricTodayPv: "今日 PV",
      metricTodayUv: "今日 UV",
      metricTodayUid: "今日 登录 UID",
      metricRegisteredUsers: "注册用户",
      metricActiveTools: "上线工具",
      subTotalRegistered: "总注册人数",
      subActiveTools: "moderation=active",
      pendingTools: "待审核工具",
      reportedReviews: "被举报评论",
      trafficTrend: "流量趋势",
      rangeDays: "{n} 天",
      noTrend: "暂无趋势数据",
    },
    metric: {
      vsYesterday: "环比昨日",
    },
    chart: {
      pv: "PV",
      uv: "UV",
      uid: "UID",
    },
    analytics: {
      title: "页面流量",
      subtitle: "区间 {start} — {end}（近两周）",
      exportCsv: "导出 CSV",
      groupByPath: "按页面路径",
      groupByType: "按页面类型",
      dateRange: "统计时间区间",
      startDate: "开始日期",
      endDate: "结束日期",
      quickDays: "近 {n} 天",
      sortBy: "按 {key} 排序",
      colPageNameZh: "页面名称（中文）",
      colPath: "路径",
      colType: "类型",
      colPv: "PV",
      colUv: "UV",
      colUid: "UID",
      colAvgTime: "均停留(s)",
      colBounce: "跳出率",
      loading: "加载中…",
    },
    tools: {
      title: "工具审核",
      tabAll: "全部",
      tabPending: "待审核",
      tabActive: "已上线",
      tabRejected: "已拒绝",
      colId: "ID",
      colTool: "工具",
      colCategory: "分类",
      colEmail: "提交邮箱",
      colStatus: "状态",
      colMetrics: "PV/UV/UID",
      colActions: "操作",
      colWebsite: "官网",
      edit: "编辑",
      editTitle: "编辑工具",
      editBack: "返回审核列表",
      editSave: "保存",
      editSaving: "保存中…",
      editSuccess: "已保存",
      editErr: "保存失败",
      fieldName: "名称",
      fieldTagline: "一句话标语",
      fieldDescription: "短描述",
      fieldLongDesc: "长描述",
      fieldWebsite: "官方网站 URL",
      fieldPricing: "定价类型",
      fieldIcon: "图标 Emoji",
      fieldCategory: "分类",
      approve: "通过",
      reject: "拒绝",
      featured: "精选",
      unfeature: "取消精选",
      loading: "加载中…",
      emptyList: "当前标签下暂无工具。",
    },
    reject: {
      title: "拒绝原因",
      cancel: "取消",
      confirm: "确认拒绝",
      urlInvalid: "网址无效",
      descViolation: "描述违规",
      notAiTool: "非 AI 工具",
      duplicate: "重复提交",
      other: "其它",
    },
    users: {
      title: "用户",
      colUid: "UID",
      colUser: "用户",
      colRole: "角色",
      colLastLogin: "上次登录",
      colSubmissions: "提交/评论",
      colActions: "操作",
      ban: "封禁",
      unban: "解封",
      emailMock: "邮件(模拟)",
      loading: "加载中…",
      emptyList: "暂无用户数据。",
    },
    reviews: {
      title: "评论",
      colId: "ID",
      colTool: "工具",
      colReviewer: "评论者",
      colStars: "星",
      colPreview: "摘要",
      colStatus: "状态",
      colReports: "举报",
      colActions: "操作",
      fullText: "全文",
      hide: "隐藏",
      restore: "恢复展示",
      delete: "删除",
      loading: "加载中…",
      emptyList: "暂无评论数据。",
    },
    monet: {
      title: "商业化管理",
      subtitle: "付费推广订单：汇总、筛选、改支付状态与推广止期（对接 monetization_order）。",
      summaryTotal: "订单总数",
      summaryRevenue: "已支付实收（USD）",
      summaryActive: "推广生效中",
      summaryPending: "待支付笔数",
      filterAll: "全部",
      filterPending: "待支付",
      filterPaid: "已支付",
      filterRefunded: "已退款",
      filterCancelled: "已取消",
      colOrder: "订单",
      colTool: "工具",
      colToolId: "工具 ID",
      colBuyer: "购买者",
      colBuyerId: "用户 ID",
      colAmount: "金额",
      colPayment: "支付",
      colValidity: "有效期",
      colPromo: "推广 PV/UV/UID",
      colCreated: "创建时间",
      colActions: "操作",
      badgeActive: "生效中",
      badgeExpired: "已过期",
      colWindow: "推广窗口",
      linkEditTool: "编辑工具",
      exportCsv: "导出 CSV",
      extendPlaceholder: "新止日 YYYY-MM-DD",
      extendSubmit: "更新止期",
      patchOk: "已更新",
      patchErr: "更新失败",
      loading: "加载中…",
      emptyList: "暂无订单数据。",
    },
    settings: {
      title: "系统设置",
      subtitle:
        "JSON 存 site_json.admin_settings。「前端用户菜单」由前台 GET /api/site/frontend_nav 读取（key 建议填 nav.* 以走 i18n）。",
      menuTitle: "侧边菜单配置",
      scopeAdmin: "后台用户菜单",
      scopeFrontend: "前端用户菜单",
      addMenu: "新增菜单",
      editMenu: "编辑",
      deleteMenu: "删除",
      emptyMenus: "暂无菜单项，请先新增",
      colOrder: "排序",
      colKey: "键名",
      colLabel: "显示名",
      colPath: "路径",
      colIcon: "图标",
      colPermission: "权限",
      colVisible: "可见",
      colActions: "操作",
      visibleYes: "是",
      visibleNo: "否",
      cancel: "取消",
      confirm: "确认",
      save: "保存",
      saving: "保存中…",
      errSave: "JSON 无效或保存失败",
      success: "已保存",
    },
    pageSeo: {
      title: "全站 URL SEO",
      subtitle:
        "按 pathname 配置 Title / Description / Keywords / OG / canonical / noindex / og:type（存 site_json.page_seo）；中英文用 _zh / _en 后缀字段；前台通过 GET /api/site/page_seo 合并。",
      search: "筛选路径",
      colPath: "路径",
      colLabel: "页面名（中/英）",
      hintSelect: "从左侧选择路径后在右侧编辑；未填字段前台用页面默认文案。",
      addPath: "添加路径",
      addPathPlaceholder: "例如 /about 或 /tool/custom-slug",
      fieldsHint: "可选字段（留空则不覆盖前台默认）",
      titleAny: "标题（不分语言，作 fallback）",
      descAny: "描述（不分语言）",
      kwAny: "关键词（不分语言）",
      ogTitleAny: "OG 标题（不分语言）",
      ogDescAny: "OG 描述（不分语言）",
      titleZh: "标题（中文）",
      titleEn: "标题（英文）",
      descZh: "描述（中文）",
      descEn: "描述（英文）",
      kwZh: "关键词（中文）",
      kwEn: "关键词（英文）",
      ogTitleZh: "OG 标题（中文）",
      ogTitleEn: "OG 标题（英文）",
      ogDescZh: "OG 描述（中文）",
      ogDescEn: "OG 描述（英文）",
      ogImage: "OG 图片 URL",
      canonical: "canonical URL",
      ogUrl: "og:url",
      noindex: "禁止收录（noindex）",
      ogType: "og:type",
      ogTypeDef: "默认（跟随页面）",
      ogTypeWebsite: "website",
      ogTypeArticle: "article",
      save: "保存全部",
      saving: "保存中…",
      errSave: "保存失败",
      success: "已保存",
      loading: "加载中…",
    },
    aiSeoInsights: {
      title: "AI SEO 与流量分析",
      subtitle:
        "服务端拉取 page_seo、home_seo、sitemap/robots、可选竞品对标 JSON、以及可配置窗口的流量聚合，与提示词一并同步 POST 至大模型；返回纯文本建议并记入历史。",
      costHint: "调用第三方大模型可能产生费用；生产环境请妥善保管 API Key。",
      slowHint:
        "默认：单次分析为同步 HTTP，耗时可接近所选「大模型连接」的超时（秒），网关或浏览器也可能提前断开。可勾选「后台执行」：先 HTTP 202 再由服务端调模型、本页轮询——工程实现与风险见标题区折叠「后台执行与运行边界」。请勿重复点击；常超时请增大 timeout 或缩短提示词。",
      tabRun: "开始分析",
      tabProvider: "大模型连接",
      tabConfigs: "提示词配置",
      tabHistory: "历史记录",
      selectConfig: "选用配置",
      run: "开始分析",
      running: "分析中…",
      output: "本次输出",
      noOutput: "尚无输出，点击开始分析。",
      baseUrl: "API Base URL",
      model: "模型名",
      timeout: "超时（秒）",
      temperature: "temperature",
      extraHeaders: "额外 HTTP 头（JSON 对象）",
      apiKeyPlaceholder: "新 API Key（留空表示不修改库内密钥）",
      apiKeyEnvName: "优先从环境变量读密钥（变量名，可空）",
      saveProvider: "保存连接设置",
      saving: "保存中…",
      savedProvider: "已保存连接设置",
      errProvider: "保存失败",
      configName: "配置名称",
      systemPrompt: "系统消息（system）",
      userTemplate:
        "用户消息模板（{{seo_snapshot}} {{seo_indexing_snapshot}} {{crawler_snapshot}} {{traffic_snapshot}} {{site_stats_snapshot}} {{competitor_benchmark_snapshot}}）",
      placeholdersHint: "仅允许上述六个占位符（crawler 与 seo_indexing 注入同一段）；未知 {{}} 将无法保存。",
      defaultConfig: "设为默认",
      addConfig: "新增配置",
      saveConfig: "保存本配置",
      deleteConfig: "删除",
      colTime: "时间",
      colAdmin: "操作者",
      colConfig: "配置",
      colModel: "模型",
      colStatus: "状态",
      colSummary: "摘要",
      statusOk: "成功",
      statusPending: "进行中",
      statusFail: "失败",
      viewDetail: "详情",
      runDetailTitle: "分析记录详情",
      back: "返回列表",
      deleteRun: "删除此记录",
      inputPayload: "注入数据摘要（JSON）",
      promptSnapshot: "提示词快照（JSON）",
      providerSnapshot: "模型连接快照（JSON）",
      errMessage: "错误信息",
      duration: "耗时",
      tokens: "Token（入/出）",
      loading: "加载中…",
      errRun: "分析失败",
      errAbortTimeout: "请求在等待大模型响应时超时或被浏览器中止；请增大「大模型连接」中的超时（秒）或检查网关 limit。",
      errPollTimeout: "后台分析轮询超时：模型可能仍在服务端运行，请到「历史记录」查看该条是否稍后变为成功/失败。",
      confirmDeleteRun: "确定删除该条记录？",
      confirmDeleteConfig: "确定删除该提示词配置？",
      selectLlmProvider: "大模型连接（* 为当前默认启用）",
      llmProviderName: "连接名称",
      providerTabIntro: "可配置多套 API 地址与模型；勾选「默认启用」的分析将使用该连接（未指定时）。分析页可临时改选其他连接。",
      addLlmProvider: "新增连接",
      saveLlmProvider: "保存本条连接",
      deleteLlmProvider: "删除本条",
      confirmDeleteLlmProvider: "确定删除该大模型连接？至少保留一条。",
      savedLlmProvider: "已保存",
      errLastProvider: "至少保留一条大模型连接",
      defaultLlmProvider: "默认启用此连接（分析页未改选时优先使用）",
      deferLlmHint:
        "后台执行（HTTP 202）：先快速应答再由服务端调大模型，本页自动轮询。非独立任务队列，边界与风险见标题区「后台执行与运行边界」折叠。",
      openDecisionsTitle: "快照 open_product_decisions（三键对齐 · 出境策略已确认）",
      openDecisionsIntro:
        "与注入大模型的快照一致：在用户消息的 site_stats_snapshot JSON 内，路径为 snapshot_limits_and_caveats.open_product_decisions。三键名与后端字段完全一致。**data_residency_and_cross_border** 已为产品确认值（允许 SEO 摘要与聚合流量发往含境外在内的管理员配置 endpoint）；其余两键值仍为占位语义，正式运营口径仍以内部评审为准。",
      openDecisionsKeyDataResidency:
        "数据驻留与跨境：**已确认**允许将本功能范围内的站点 SEO 摘要与聚合流量发往管理员配置的 LLM endpoint（含境外）；快照值为 allowed_overseas_llm_for_seo_summaries_and_aggregated_traffic。属地/合同另有约束时以法务为准。",
      openDecisionsKeyModelOutput:
        "模型输出形态及 Markdown 是否在管理端或对处渲染等；快照内当前示例值 plain_text_now_markdown_render_if_needed_tbd。",
      openDecisionsKeyCostQuota:
        "调用成本、配额与数据留存周期等运营策略；快照内当前示例值 tbd_ops_policy。",
      openDecisionsDisclaimer:
        "【重要 — 请勿误读】\n「唯一依据」指：不得仅凭本助手或单次分析运行结果，就当作法务意见、合规结论、监管申报材料，或对外合同、路演、客服答复的终局口径。\n「充分依据」指：不得认为只跑一次分析就已覆盖全部合规与商业风险；不能替代法务/合规/产品的书面确认与证据链。\n**出境发往 LLM** 已按产品确认写入快照；**输出形态、成本配额**等若仍占位，须另行走内部评审。本折叠说明不构成对外法务唯一依据。",
      deferEngineCaveatsTitle: "后台执行与运行边界（defer_llm / BackgroundTasks）",
      deferEngineCaveatsBody:
        "勾选「后台执行」时，服务端在返回 HTTP 202 之后使用 Starlette/FastAPI 的 BackgroundTasks 在同进程内继续调用大模型——这是进程内待办，不是独立消息队列（如 Celery/RQ）或专用 worker 形态。\n\n多 worker / 多实例时，该次大模型调用只会在「处理该 POST 请求」的那台 API 实例上执行，其他实例不会自动接管同一 run。\n\n若进程在已 202 应答之后、尚未写入最终结果前崩溃或被强杀，库中可能出现长期 status=pending 的记录，需运维或管理员在「历史记录」人工核对，必要时删除后重跑或另行排查。\n\n同步 POST 路径不会出现上述 pending 卡住，但仍可能受反向代理/浏览器超时限制。",
      seoTasksSectionTitle: "SEO 执行任务（须审批后写入）",
      seoTasksIntro:
        "从本报告用大模型抽取可写库任务（page_seo / home_seo / seo_robots）及「源码建议」草案。勾选「替换草案」会先删本记录下所有草案再生成。批准后「应用」仅写入站点 JSON（当前 API 所连库）；涉及仓库源码的项须走 PR/CI，本系统不会改磁盘。应用会记入下方审计表，可按快照回滚。",
      seoTasksGenerate: "从报告生成草案",
      seoTasksGenerating: "生成中…",
      seoTasksReplaceDrafts: "替换已有草案",
      seoTasksColTitle: "标题",
      seoTasksColKind: "类型",
      seoTasksColStatus: "状态",
      seoTasksColPayload: "载荷（JSON）",
      seoTasksApprove: "批准",
      seoTasksReject: "拒绝",
      seoTasksApply: "应用到站点配置",
      seoTasksCodePrNoApply: "源码类：请通过 PR/CI 修改仓库，此处不可自动应用。可复制载荷。",
      seoTasksCopyPayload: "复制载荷",
      seoTasksAuditSectionTitle: "站点配置应用审计（可回滚）",
      seoTasksAuditColKey: "content_key",
      seoTasksAuditColCreated: "应用时间",
      seoTasksAuditColStatus: "状态",
      seoTasksAuditRollback: "回滚到此条之前",
      seoTasksAuditRolledBack: "已回滚",
      seoTasksDeleteDraft: "删除草案",
      seoTasksStatusDraft: "草案",
      seoTasksStatusApproved: "已批准",
      seoTasksStatusApplied: "已应用",
      seoTasksStatusFailed: "失败",
      seoTasksStatusRejected: "已拒绝",
      seoTasksOnlySuccessRun: "仅「成功」状态的报告可生成草案。",
      seoTasksEmpty: "尚无任务，可点击上方按钮从报告生成。",
      llmAdapter: "协议适配器",
      llmAdapterOpenAICompatible: "OpenAI 兼容（chat/completions）",
      pendingRunsHint:
        "当前有分析任务处于 pending（后台执行或等待独立 worker）。可查看历史记录；多实例部署时可运行 backend/scripts/ai_insight_pending_worker.py。",
      stepUpBlockTitle: "敏感操作二次确认（环境已启用）",
      stepUpPasswordShared: "运维共享口令（AI_INSIGHT_STEP_UP_SHARED_SECRET）",
      stepUpPasswordLogin: "当前管理员登录密码",
      seoRevisionsTitle: "站点 JSON 修订史（本页 apply / 回滚）",
      seoRevisionsKeyLabel: "查看键",
      seoRevisionsRefCol: "元数据 ref_json",
      seoRevisionsEmpty: "该键尚无修订记录。",
    },
    siteJson: {
      title: "站点内容块（JSON）",
      subtitle:
        "白名单键对应 site_json 表；此处整包覆盖保存。page_seo 与 admin_settings（菜单）请在专用页编辑。seo_sitemap_static.urls 配 sitemap 静态 path；seo_robots 配 robots.txt；ai_insight_competitor_benchmarks 供 AI SEO 快照竞品指标（对标 TAAFT 等）。",
      selectKey: "选择块",
      hint: "须为合法 JSON 对象。错误内容可能导致前台接口 500 或页面空白，请先备份。",
      save: "保存",
      saving: "保存中…",
      success: "已保存",
      errSave: "保存失败（检查网络或 JSON）",
      errJson: "JSON 格式错误，无法解析",
      errObject: "顶层必须是 JSON 对象（非数组）",
      tabVisual: "可视化",
      tabJson: "JSON 源码",
      visualIntro: "首层字符串/数字/布尔用表单；数组与对象在折叠区编辑 JSON。seo_sitemap_static 使用路径表；seo_robots 为键值 JSON。",
      seoPath: "路径 path",
      seoPriority: "优先级",
      seoChangefreq: "changefreq",
      seoAddRow: "添加 URL 行",
      seoRemove: "删除",
      nestedHint: "嵌套 JSON，失焦后解析合并",
      errNested: "JSON 无法解析，请修正后再失焦",
      referenceTitle: "当前块与前台 API 对照",
      blockHelp: {
        ui_toasts:
          "GET /api/site/ui_toasts — 首页等使用的全站 Toast/提示条配置（文案、显示条件等）。勿随意删除顶层必需键以免前台请求失败。",
        guide: "GET /api/site/guide — 「使用指南」页（GuidePage）的章节与说明内容。",
        more: "GET /api/site/more — 「更多」页的区块与外链说明。",
        sitemap:
          "GET /api/site/sitemap — 站点地图页展示的链接分组（面向用户）。与 seo_sitemap_static（搜索引擎 XML 用的路径表）职责不同。",
        profile:
          "GET /api/site/profile — 个人中心静态文案与展示块。登录用户的动态活动流等走后端用户相关接口，不全部来自本块。",
        favorites:
          "GET /api/site/favorites — 收藏页访客/演示用说明与静态结构。已登录用户的真实收藏列表由用户收藏 API 提供。",
        compare_interactive:
          "GET /api/site/compare_interactive — 交互式对比页（CompareToolsPage）的矩阵与说明。页面 TDK 仍可由 page_seo 按路径覆盖。",
        submit:
          "经 GET /api/submit-options 读出 — 提交新工具页的可选分类顺序、pricing_options、ui（含 guidelines 等），与 POST /api/submissions/tool 配套。",
        not_found:
          "GET /api/site/not_found — 全站 404 提示文案。对比落地页 slug 不存在时也会读取其中 compare_title、cta_home 等。",
        dashboard:
          "GET /api/dashboard-data — 数据大盘页用 JSON（注意路径为 /api/dashboard-data，不是 /api/site/…）。",
        seo_sitemap_static:
          "后端生成 sitemap.xml 时读取 payload.urls（path / priority / changefreq）。配错会影响收录，迁移种子见 migrate。",
        seo_robots:
          "GET /api/seo/robots.txt 读取。可选：sitemap_url（单条绝对 URL）、sitemap_urls（多条）、disallow_paths（每项以 / 开头）、raw_body（非空则整文件覆盖）。未配时 Sitemap 指向 {PUBLIC_SITE_URL}/api/seo/sitemap.xml。",
        ai_insight_competitor_benchmarks:
          "仅用于 POST /api/admin/ai-insights/run 组装的 {{competitor_benchmark_snapshot}}。benchmarks[] 每项含 label、可选 notes、可选 metrics（对象，请写数据来源与日期）。无公开 GET。",
      },
    },
    comparisonAdmin: {
      title: "对比落地页",
      subtitle: "按 slug 维护 comparison_page；公开接口 GET /api/comparisons/{slug}。矩阵与 pros/cons 支持分块 JSON。",
      slugLabel: "slug",
      slugPlaceholder: "选择或输入",
      tabVisual: "可视化",
      tabJson: "JSON 源码",
      visualIntro: "主工具、替代列表与 SEO 用表单；features / pros / cons 为结构化 JSON（失焦校验）。保存前请确认 slug 已存在或为新建。",
      save: "保存",
      saving: "保存中…",
      errSave: "保存失败",
      errTopObject: "顶层须为 JSON 对象",
      sectionMain: "主工具 mainTool",
      sectionAlts: "替代工具 alternatives",
      addAlt: "添加一条替代",
      remove: "删除",
      sectionSeo: "SEO 文案",
      sectionCards: "选型卡片 seo_cards",
      addCard: "添加卡片",
      sectionMatrix: "特性矩阵 features · 长短处 pros / cons",
      matrixHint: "与前台 useComparisonData 类型一致；列名需与矩阵行内键（如 chatgpt、claude）对齐。",
      footerNote: "页脚 footer_note",
      errJson: "JSON 无效",
      fieldName: "名称",
      fieldLogo: "Logo/Emoji",
      fieldDeveloper: "开发者",
      fieldRating: "评分",
      fieldPricing: "定价描述",
      fieldDescription: "简介",
      fieldTitle: "标题",
      fieldBody: "正文",
      seoTitleSuffix: "seo_title_suffix",
      seoIntro: "seo_intro",
      seoChooserTitle: "seo_chooser_title",
      seoChooserIntro: "seo_chooser_intro",
      notFoundHint: "库中尚无此 slug，已加载空模板；保存后将写入 comparison_page。",
      referenceTitle: "字段与前台 / API 对照说明",
      refIntro:
        "前台路由 /compare/{slug} 使用 GET /api/comparisons/{slug} 返回本页 JSON（表 comparison_page），结构对齐前台 useComparisonData。全站 page_seo 可按相同 path 再覆盖 TDK。",
      refMain:
        "mainTool：主对比对象（名称、logo、开发者、评分、定价文案、简介），用于标题区与特性表主列展示。",
      refAlts:
        "alternatives：替代工具数组，每项字段与 mainTool 同形；表格列名须与下方 features/pros/cons 里各工具键一致。",
      refSeo:
        "seo_title_suffix、seo_intro（可用 {main} 占位，前台会替换为主工具名）、seo_chooser_title、seo_chooser_intro：标题与导语、选型区说明；与 useResolvedPageSeo 合并后台 TDK。",
      refCards: "seo_cards：选型卡片（标题、正文等），渲染页内「如何选型」类区块。",
      refMatrix:
        "features：矩阵行（每行对各工具列的值）；pros / cons：按工具键（如 chatgpt）到长/短处列表的对象。键名必须与主工具 + 替代在表头使用的 slug 一致。",
      refFooter: "footer_note：页脚补充或免责声明类短文案。",
    },
    fieldHelp: fieldHelpZh,
  },
  en: {
    common: { dash: "—" },
    sidebar: {
      brandAdmin: "Admin",
      brandTitle: "AI Tools Hub",
      dashboard: "Dashboard",
      analytics: "Page analytics",
      tools: "Tools",
      users: "Users",
      reviews: "Reviews",
      monetization: "Monetization",
      settings: "Settings",
      pageSeo: "Page SEO",
      siteBlocks: "Site JSON",
      homeSeoForm: "Home SEO",
      translations: "Translations",
      comparisons: "Comparison pages",
      searchSuggestions: "Search suggestions",
      toolJsonLd: "Tool JSON-LD",
      siteSubmitForm: "Submit page blocks",
      siteDashboardForm: "Dashboard blocks",
      aiSeoInsights: "AI SEO insights",
      crawlerData: "Data import",
    },
    header: {
      console: "Management console",
      logout: "Log out",
      language: "Language",
    },
    shell: {
      verifying: "Verifying session…",
    },
    login: {
      title: "Admin sign-in",
      hint: "Admin accounts only. Default: admin@example.com / admin123",
      email: "Email",
      password: "Password",
      submit: "Enter admin",
      submitting: "Signing in…",
      errAdminRequired: "An admin account is required",
      errFailed: "Sign-in failed. Check email and password.",
      errLoginFailed: "Sign-in failed",
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Site-wide metrics (from analytics)",
      trendDateRange: "Trend date range",
      loading: "Loading…",
      exportCsv: "Export CSV",
      metricTodayPv: "Today PV",
      metricTodayUv: "Today UV",
      metricTodayUid: "Today signed-in UID",
      metricRegisteredUsers: "Registered users",
      metricActiveTools: "Live tools",
      subTotalRegistered: "All registered",
      subActiveTools: "moderation=active",
      pendingTools: "Pending tools",
      reportedReviews: "Reported reviews",
      trafficTrend: "Traffic trend",
      rangeDays: "{n}d",
      noTrend: "No trend data",
    },
    metric: {
      vsYesterday: "vs yesterday",
    },
    chart: {
      pv: "PV",
      uv: "UV",
      uid: "UID",
    },
    analytics: {
      title: "Page traffic",
      subtitle: "Range {start} — {end} (last 2 weeks)",
      exportCsv: "Export CSV",
      groupByPath: "By page path",
      groupByType: "By page type",
      dateRange: "Reporting date range",
      startDate: "Start date",
      endDate: "End date",
      quickDays: "Last {n}d",
      sortBy: "Sort by {key}",
      colPageNameZh: "Page name (Chinese)",
      colPath: "Path",
      colType: "Type",
      colPv: "PV",
      colUv: "UV",
      colUid: "UID",
      colAvgTime: "Avg time (s)",
      colBounce: "Bounce rate",
      loading: "Loading…",
    },
    tools: {
      title: "Tool moderation",
      tabAll: "All",
      tabPending: "Pending",
      tabActive: "Active",
      tabRejected: "Rejected",
      colId: "ID",
      colTool: "Tool",
      colCategory: "Category",
      colEmail: "Submitter email",
      colStatus: "Status",
      colMetrics: "PV/UV/UID",
      colActions: "Actions",
      colWebsite: "Website",
      edit: "Edit",
      editTitle: "Edit tool",
      editBack: "Back to moderation",
      editSave: "Save",
      editSaving: "Saving…",
      editSuccess: "Saved",
      editErr: "Save failed",
      fieldName: "Name",
      fieldTagline: "Tagline",
      fieldDescription: "Short description",
      fieldLongDesc: "Long description",
      fieldWebsite: "Official website URL",
      fieldPricing: "Pricing type",
      fieldIcon: "Icon emoji",
      fieldCategory: "Category",
      approve: "Approve",
      reject: "Reject",
      featured: "Featured",
      unfeature: "Unfeature",
      loading: "Loading…",
      emptyList: "No tools in this tab.",
    },
    reject: {
      title: "Rejection reason",
      cancel: "Cancel",
      confirm: "Confirm reject",
      urlInvalid: "Invalid URL",
      descViolation: "Policy violation in description",
      notAiTool: "Not an AI tool",
      duplicate: "Duplicate submission",
      other: "Other",
    },
    users: {
      title: "Users",
      colUid: "UID",
      colUser: "User",
      colRole: "Role",
      colLastLogin: "Last login",
      colSubmissions: "Submissions / reviews",
      colActions: "Actions",
      ban: "Ban",
      unban: "Unban",
      emailMock: "Email (mock)",
      loading: "Loading…",
      emptyList: "No users yet.",
    },
    reviews: {
      title: "Reviews",
      colId: "ID",
      colTool: "Tool",
      colReviewer: "Reviewer",
      colStars: "Stars",
      colPreview: "Preview",
      colStatus: "Status",
      colReports: "Reports",
      colActions: "Actions",
      fullText: "Full text",
      hide: "Hide",
      restore: "Restore",
      delete: "Delete",
      loading: "Loading…",
      emptyList: "No reviews yet.",
    },
    monet: {
      title: "Monetization",
      subtitle: "Promo orders: summary, filters, payment status & end-date (monetization_order).",
      summaryTotal: "Total orders",
      summaryRevenue: "Paid revenue (USD)",
      summaryActive: "Active promos",
      summaryPending: "Pending payment",
      filterAll: "All",
      filterPending: "Pending",
      filterPaid: "Paid",
      filterRefunded: "Refunded",
      filterCancelled: "Cancelled",
      colOrder: "Order",
      colTool: "Tool",
      colToolId: "Tool ID",
      colBuyer: "Purchaser",
      colBuyerId: "User ID",
      colAmount: "Amount",
      colPayment: "Payment",
      colValidity: "Validity",
      colPromo: "Promo PV/UV/UID",
      colCreated: "Created",
      colActions: "Actions",
      badgeActive: "Active",
      badgeExpired: "Expired",
      colWindow: "Promo window",
      linkEditTool: "Edit tool",
      exportCsv: "Export CSV",
      extendPlaceholder: "New end date YYYY-MM-DD",
      extendSubmit: "Update end date",
      patchOk: "Saved",
      patchErr: "Update failed",
      loading: "Loading…",
      emptyList: "No orders yet.",
    },
    settings: {
      title: "System settings",
      subtitle:
        "JSON in site_json.admin_settings. Frontend menu is read by GET /api/site/frontend_nav (use nav.* keys for i18n).",
      menuTitle: "Sidebar menu config",
      scopeAdmin: "Admin user menu",
      scopeFrontend: "Frontend user menu",
      addMenu: "Add menu",
      editMenu: "Edit",
      deleteMenu: "Delete",
      emptyMenus: "No menu items yet",
      colOrder: "Order",
      colKey: "Key",
      colLabel: "Label",
      colPath: "Path",
      colIcon: "Icon",
      colPermission: "Permission",
      colVisible: "Visible",
      colActions: "Actions",
      visibleYes: "Yes",
      visibleNo: "No",
      cancel: "Cancel",
      confirm: "Confirm",
      save: "Save",
      saving: "Saving…",
      errSave: "Invalid JSON or save failed",
      success: "Saved",
    },
    pageSeo: {
      title: "URL SEO",
      subtitle:
        "Configure meta per pathname (site_json.page_seo): TDK, OG, canonical, noindex, og:type. Bilingual via _zh / _en. Public map: GET /api/site/page_seo.",
      search: "Filter paths",
      colPath: "Path",
      colLabel: "Label (ZH / EN)",
      hintSelect: "Pick a path on the left, edit on the right. Empty fields fall back to page defaults.",
      addPath: "Add path",
      addPathPlaceholder: "e.g. /about or /tool/custom-slug",
      fieldsHint: "Optional (blank = do not override frontend default)",
      titleAny: "Title (locale-agnostic fallback)",
      descAny: "Description (locale-agnostic)",
      kwAny: "Keywords (locale-agnostic)",
      ogTitleAny: "OG title (locale-agnostic)",
      ogDescAny: "OG description (locale-agnostic)",
      titleZh: "Title (Chinese)",
      titleEn: "Title (English)",
      descZh: "Description (Chinese)",
      descEn: "Description (English)",
      kwZh: "Keywords (Chinese)",
      kwEn: "Keywords (English)",
      ogTitleZh: "OG title (Chinese)",
      ogTitleEn: "OG title (English)",
      ogDescZh: "OG description (Chinese)",
      ogDescEn: "OG description (English)",
      ogImage: "OG image URL",
      canonical: "Canonical URL",
      ogUrl: "og:url",
      noindex: "No index (noindex)",
      ogType: "og:type",
      ogTypeDef: "Default (follow page)",
      ogTypeWebsite: "website",
      ogTypeArticle: "article",
      save: "Save all",
      saving: "Saving…",
      errSave: "Save failed",
      success: "Saved",
      loading: "Loading…",
    },
    aiSeoInsights: {
      title: "AI SEO & traffic insights",
      subtitle:
        "The server builds snapshots from page_seo, home_seo, sitemap/robots, optional competitor benchmarks, and configurable-window traffic aggregates; sends them with your prompt to the LLM in one synchronous HTTP request; stores plain-text advice and history.",
      costHint: "External LLM calls may incur cost; protect API keys in production.",
      slowHint:
        "Default: each run is one synchronous HTTP call up to the selected LLM timeout (seconds); gateways/browsers may cut off earlier. Enable “Run in background” for HTTP 202 + server-side LLM + polling—see the “Background execution & runtime limits” fold in the header for engineering caveats. Avoid double clicks; raise timeout or shorten prompts if you often time out.",
      tabRun: "Run analysis",
      tabProvider: "LLM connection",
      tabConfigs: "Prompt configs",
      tabHistory: "History",
      selectConfig: "Config",
      run: "Run analysis",
      running: "Running…",
      output: "Output",
      noOutput: "No output yet. Click run.",
      baseUrl: "API base URL",
      model: "Model",
      timeout: "Timeout (seconds)",
      temperature: "temperature",
      extraHeaders: "Extra HTTP headers (JSON object)",
      apiKeyPlaceholder: "New API key (leave empty to keep stored key)",
      apiKeyEnvName: "Optional env var name for API key",
      saveProvider: "Save connection",
      saving: "Saving…",
      savedProvider: "Connection saved",
      errProvider: "Save failed",
      configName: "Config name",
      systemPrompt: "System message",
      userTemplate:
        "User template ({{seo_snapshot}} {{seo_indexing_snapshot}} {{crawler_snapshot}} {{traffic_snapshot}} {{site_stats_snapshot}} {{competitor_benchmark_snapshot}})",
      placeholdersHint: "Only the six placeholders above (crawler and seo_indexing inject the same JSON).",
      defaultConfig: "Set as default",
      addConfig: "Add config",
      saveConfig: "Save this config",
      deleteConfig: "Delete",
      colTime: "Time",
      colAdmin: "Admin",
      colConfig: "Config",
      colModel: "Model",
      colStatus: "Status",
      colSummary: "Summary",
      statusOk: "OK",
      statusPending: "Pending",
      statusFail: "Failed",
      viewDetail: "Detail",
      runDetailTitle: "Run detail",
      back: "Back to list",
      deleteRun: "Delete this run",
      inputPayload: "Input summary (JSON)",
      promptSnapshot: "Prompt snapshot (JSON)",
      providerSnapshot: "Provider snapshot (JSON)",
      errMessage: "Error",
      duration: "Duration",
      tokens: "Tokens (in/out)",
      loading: "Loading…",
      errRun: "Analysis failed",
      errAbortTimeout:
        "The browser stopped waiting for the LLM response (timeout). Raise the LLM connection timeout (seconds) or check your reverse-proxy limits.",
      errPollTimeout:
        "Polling timed out: the LLM may still be running server-side—check History later for success/failure.",
      confirmDeleteRun: "Delete this run record?",
      confirmDeleteConfig: "Delete this prompt config?",
      selectLlmProvider: "LLM connection (* = default for analysis)",
      llmProviderName: "Connection name",
      providerTabIntro:
        "Add multiple API bases/models; mark one as default for runs when no provider is picked. The Run tab can override per request.",
      addLlmProvider: "Add connection",
      saveLlmProvider: "Save this connection",
      deleteLlmProvider: "Delete",
      confirmDeleteLlmProvider: "Delete this LLM connection? At least one must remain.",
      savedLlmProvider: "Saved",
      errLastProvider: "At least one LLM connection is required",
      defaultLlmProvider: "Use as default connection (when Run tab does not pick another)",
      deferLlmHint:
        "Run in background (HTTP 202): quick response, then the server calls the LLM and this page polls. Not a standalone job queue—see the header fold “Background execution & runtime limits”.",
      openDecisionsTitle: "Snapshot open_product_decisions (three keys · cross-border LLM confirmed)",
      openDecisionsIntro:
        "Same as the LLM snapshot: inside the site_stats_snapshot JSON in the user message, the path is snapshot_limits_and_caveats.open_product_decisions. Key names match the backend exactly. data_residency_and_cross_border is now a product-confirmed value (SEO summaries + aggregated traffic may be sent to admin-configured LLM endpoints, including overseas); the other two keys remain placeholder-style until ops/legal closes wording.",
      openDecisionsKeyDataResidency:
        "Cross-border: product confirmed—this feature’s SEO summaries and aggregated traffic may be sent to the configured LLM API (including overseas providers). Snapshot value allowed_overseas_llm_for_seo_summaries_and_aggregated_traffic. Follow local legal/contract constraints where applicable.",
      openDecisionsKeyModelOutput:
        "Model output shape and whether Markdown is rendered in admin or externally; current example plain_text_now_markdown_render_if_needed_tbd.",
      openDecisionsKeyCostQuota:
        "Cost, quota, and retention/ops policy; current example tbd_ops_policy.",
      openDecisionsDisclaimer:
        "Important — please read carefully.\n“Sole basis” means you must not treat this assistant or a single run’s output as final legal advice, a compliance determination, a regulatory filing, or the definitive wording for contracts, investor decks, or customer support.\n“Sufficient basis” means one automated analysis does not exhaust compliance or commercial risk; it cannot replace written sign-off and evidence from legal/compliance/product.\nCross-border LLM use for SEO summaries + aggregated traffic is product-confirmed in the snapshot; for output format and cost/retention keys that remain placeholder-style, follow your internal review. This fold is not sole legal advice.",
      deferEngineCaveatsTitle: "Background execution & runtime limits (defer_llm / BackgroundTasks)",
      deferEngineCaveatsBody:
        "With “Run in background”, after HTTP 202 the API continues the LLM call using Starlette/FastAPI BackgroundTasks in the same process—an in-process backlog, not a separate message queue (e.g. Celery/RQ) or dedicated worker tier.\n\nWith multiple workers/instances, that LLM call runs only on the API instance that handled the POST; other instances do not take over the same run.\n\nIf the process crashes or is killed after 202 but before the final DB update, rows may stay status=pending; ops/admins should check History manually and delete/re-run or investigate.\n\nThe synchronous POST path avoids that pending stuck class of failure but can still hit reverse-proxy/browser timeouts.",
      seoTasksSectionTitle: "SEO apply tasks (approval required)",
      seoTasksIntro:
        "The model extracts applyable drafts for site JSON (page_seo / home_seo / seo_robots) plus code-repo hints. “Replace drafts” deletes existing drafts on this run first. After approve, Apply writes only to site JSON in the DB this API uses; repository changes must go through PR/CI—this feature never writes the repo. Each apply is audited below and can be rolled back if unchanged since apply.",
      seoTasksGenerate: "Generate drafts from report",
      seoTasksGenerating: "Generating…",
      seoTasksReplaceDrafts: "Replace existing drafts",
      seoTasksColTitle: "Title",
      seoTasksColKind: "Kind",
      seoTasksColStatus: "Status",
      seoTasksColPayload: "Payload (JSON)",
      seoTasksApprove: "Approve",
      seoTasksReject: "Reject",
      seoTasksApply: "Apply to site config",
      seoTasksCodePrNoApply: "Code change: use PR/CI; cannot auto-apply here. You can copy the payload.",
      seoTasksCopyPayload: "Copy payload",
      seoTasksAuditSectionTitle: "Site config apply audit (rollback)",
      seoTasksAuditColKey: "content_key",
      seoTasksAuditColCreated: "Applied at",
      seoTasksAuditColStatus: "Status",
      seoTasksAuditRollback: "Rollback to before this apply",
      seoTasksAuditRolledBack: "Rolled back",
      seoTasksDeleteDraft: "Delete draft",
      seoTasksStatusDraft: "Draft",
      seoTasksStatusApproved: "Approved",
      seoTasksStatusApplied: "Applied",
      seoTasksStatusFailed: "Failed",
      seoTasksStatusRejected: "Rejected",
      seoTasksOnlySuccessRun: "Only successful runs can generate drafts.",
      seoTasksEmpty: "No tasks yet. Use the button above to generate from the report.",
      llmAdapter: "Protocol adapter",
      llmAdapterOpenAICompatible: "OpenAI-compatible (chat/completions)",
      pendingRunsHint:
        "Some analysis runs are pending (in-process BackgroundTasks or waiting for a worker). Check History; for multi-instance APIs run backend/scripts/ai_insight_pending_worker.py.",
      stepUpBlockTitle: "Step-up confirmation (enabled by environment)",
      stepUpPasswordShared: "Shared operations password (AI_INSIGHT_STEP_UP_SHARED_SECRET)",
      stepUpPasswordLogin: "Your current admin login password",
      seoRevisionsTitle: "Site JSON revision history (apply / rollback on this page)",
      seoRevisionsKeyLabel: "Content key",
      seoRevisionsRefCol: "ref_json",
      seoRevisionsEmpty: "No revisions for this key yet.",
    },
    siteJson: {
      title: "Site content blocks (JSON)",
      subtitle:
        "Whitelisted keys map to site_json rows; whole payload is replaced on save. Use dedicated pages for page_seo and admin_settings (menus). seo_sitemap_static / seo_robots as above; ai_insight_competitor_benchmarks = optional competitor metrics for AI SEO snapshots.",
      selectKey: "Block",
      hint: "Must be a valid JSON object. Bad data may break public APIs—back up first.",
      save: "Save",
      saving: "Saving…",
      success: "Saved",
      errSave: "Save failed (network or schema)",
      errJson: "Invalid JSON",
      errObject: "Top level must be a JSON object (not an array)",
      tabVisual: "Visual",
      tabJson: "JSON source",
      visualIntro:
        "Edit top-level strings/numbers/booleans in forms; arrays/objects in collapsible JSON. seo_sitemap_static uses the URL table; seo_robots is key/value JSON.",
      seoPath: "path",
      seoPriority: "priority",
      seoChangefreq: "changefreq",
      seoAddRow: "Add URL row",
      seoRemove: "Remove",
      nestedHint: "Nested JSON (parsed on blur)",
      errNested: "Invalid JSON—fix before blur",
      referenceTitle: "Public API mapping (this block)",
      blockHelp: {
        ui_toasts:
          "GET /api/site/ui_toasts — toast/banner copy and flags for home and other shells; keep required top keys stable.",
        guide: "GET /api/site/guide — Guide page sections and copy (GuidePage).",
        more: "GET /api/site/more — “More” page blocks and links.",
        sitemap:
          "GET /api/site/sitemap — human sitemap page. Not the same as seo_sitemap_static (XML path table for crawlers).",
        profile:
          "GET /api/site/profile — static profile page shell; live activity feeds use user-facing APIs, not only this block.",
        favorites:
          "GET /api/site/favorites — guest/demo copy for favorites page; logged-in lists come from user favorites API.",
        compare_interactive:
          "GET /api/site/compare_interactive — CompareToolsPage matrix/config; TDK may still be overridden via page_seo.",
        submit:
          "Merged in GET /api/submit-options — category order, pricing options, ui strings for SubmitToolPage + POST /api/submissions/tool.",
        not_found:
          "GET /api/site/not_found — global 404 copy; comparison slugs also read compare_title / cta_home when missing.",
        dashboard: "GET /api/dashboard-data — dashboard widgets (note: not under /api/site/).",
        seo_sitemap_static:
          "Feeds sitemap XML generation from payload.urls (path, priority, changefreq); bad rows hurt SEO.",
        seo_robots:
          "Read by GET /api/seo/robots.txt. Optional: sitemap_url (one absolute URL), sitemap_urls (list), disallow_paths (each starts with /), raw_body (non-empty replaces entire file). Default Sitemap line uses {PUBLIC_SITE_URL}/api/seo/sitemap.xml.",
        ai_insight_competitor_benchmarks:
          "Used only when building {{competitor_benchmark_snapshot}} for POST /api/admin/ai-insights/run. benchmarks[] entries: label, optional notes, optional metrics object (cite source and date). No public GET.",
      },
    },
    comparisonAdmin: {
      title: "Comparison landing pages",
      subtitle:
        "Edit comparison_page by slug; public GET /api/comparisons/{slug}. Matrix & pros/cons use structured JSON blocks.",
      slugLabel: "slug",
      slugPlaceholder: "Pick or type",
      tabVisual: "Visual",
      tabJson: "JSON source",
      visualIntro:
        "Main tool, alternatives, and SEO use forms; features / pros / cons are JSON (validated on blur). Ensure slug exists or will be created on save.",
      save: "Save",
      saving: "Saving…",
      errSave: "Save failed",
      errTopObject: "Top level must be a JSON object",
      sectionMain: "Main tool",
      sectionAlts: "Alternatives",
      addAlt: "Add alternative",
      remove: "Remove",
      sectionSeo: "SEO copy",
      sectionCards: "Chooser cards (seo_cards)",
      addCard: "Add card",
      sectionMatrix: "Feature matrix · pros / cons",
      matrixHint: "Must match ComparisonPayload; row keys should align with tool columns (e.g. chatgpt, claude).",
      footerNote: "Footer note",
      errJson: "Invalid JSON",
      fieldName: "Name",
      fieldLogo: "Logo / emoji",
      fieldDeveloper: "Developer",
      fieldRating: "Rating",
      fieldPricing: "Pricing label",
      fieldDescription: "Description",
      fieldTitle: "Title",
      fieldBody: "Body",
      seoTitleSuffix: "seo_title_suffix",
      seoIntro: "seo_intro",
      seoChooserTitle: "seo_chooser_title",
      seoChooserIntro: "seo_chooser_intro",
      notFoundHint: "No row for this slug yet—empty template loaded; saving will upsert comparison_page.",
      referenceTitle: "Field reference (frontend & API)",
      refIntro:
        "Route /compare/{slug} loads GET /api/comparisons/{slug} (comparison_page), same shape as useComparisonData. page_seo can still override meta for that path.",
      refMain:
        "mainTool — primary tool (name, logo, developer, rating, pricing blurb, description) for hero and matrix anchor column.",
      refAlts:
        "alternatives — array of same shape; column keys must match tool keys used in features / pros / cons.",
      refSeo:
        "seo_title_suffix, seo_intro ({main} placeholder), seo_chooser_title, seo_chooser_intro — titles and intros; merged with useResolvedPageSeo.",
      refCards: "seo_cards — chooser cards (title, body) rendered in the “how to choose” area.",
      refMatrix:
        "features — matrix rows; pros / cons — objects keyed by tool slug. Keys must align with mainTool + alternatives slug columns.",
      refFooter: "footer_note — short footer or disclaimer line.",
    },
    fieldHelp: fieldHelpEn,
  },
};

function getLeaf(tree: MsgTree, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = tree;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object" || !(p in (cur as object))) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Resolve "dashboard.title" → string; fallback zh → key */
export function resolveMessage(locale: AdminLocale, path: string): string {
  const fromLocale = getLeaf(messages[locale], path);
  if (fromLocale !== undefined) return fromLocale;
  const fromZh = getLeaf(messages.zh, path);
  if (fromZh !== undefined) return fromZh;
  return path;
}
