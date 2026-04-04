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
    siteJson: {
      title: "站点内容块（JSON）",
      subtitle:
        "白名单键对应 site_json 表；此处整包覆盖保存。page_seo 与 admin_settings（菜单）请在专用页编辑。seo_sitemap_static.urls 配 sitemap 静态 path；seo_robots 配 robots.txt（Sitemap 行、Disallow、或 raw_body 全文）。",
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
    siteJson: {
      title: "Site content blocks (JSON)",
      subtitle:
        "Whitelisted keys map to site_json rows; whole payload is replaced on save. Use dedicated pages for page_seo and admin_settings (menus). seo_sitemap_static.urls = static sitemap paths; seo_robots = robots.txt (Sitemap lines, Disallow, or raw_body).",
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
