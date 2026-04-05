# site_json 白名单键在管理端 PUT 前的轻量 Schema 校验（防整包粘贴坏类型）
from __future__ import annotations

from typing import Any  # JSON 值类型

from fastapi import HTTPException  # 400 业务错


def _list_of_str(v: Any, field: str) -> None:  # 须为字符串数组
    if not isinstance(v, list):  # 非数组
        raise HTTPException(status_code=400, detail=f"site_json_schema:{field}_array")  # 键提示
    for i, x in enumerate(v):  # 逐项须 str
        if not isinstance(x, str):  # 混入数字等
            raise HTTPException(status_code=400, detail=f"site_json_schema:{field}[{i}]")  # 定位


def validate_submit_site_json(payload: dict[str, Any]) -> None:  # submit 块
    cs = payload.get("category_slugs")  # 分类顺序
    if cs is not None:  # 有则校验
        _list_of_str(cs, "category_slugs")  # 须 slug 串列表
    po = payload.get("pricing_options")  # 定价选项文案
    if po is not None:  # 可选存在
        _list_of_str(po, "pricing_options")  # 须字符串列表
    ui = payload.get("ui")  # 页面文案包
    if ui is not None and (not isinstance(ui, dict) or isinstance(ui, list)):  # 须对象
        raise HTTPException(status_code=400, detail="site_json_schema:ui_object")  # ui 类型


def validate_dashboard_site_json(payload: dict[str, Any]) -> None:  # dashboard 块
    sb = payload.get("stat_badges")  # 顶部四格
    if sb is not None:  # 有则校验
        if not isinstance(sb, list):  # 须数组
            raise HTTPException(status_code=400, detail="site_json_schema:stat_badges_array")  # 类型
        for i, x in enumerate(sb):  # 徽章须为字符串（前台 normalize 会兜底，入库仍规范）
            if not isinstance(x, str):  # 非法元素
                raise HTTPException(status_code=400, detail=f"site_json_schema:stat_badges[{i}]")  # 下标
    sn = payload.get("summary_numbers")  # 摘要数字
    if sn is not None and (not isinstance(sn, dict) or isinstance(sn, list)):  # 须对象
        raise HTTPException(status_code=400, detail="site_json_schema:summary_numbers_object")  # 类型
    ui = payload.get("ui")  # 仪表盘文案
    if ui is not None and (not isinstance(ui, dict) or isinstance(ui, list)):  # 须对象
        raise HTTPException(status_code=400, detail="site_json_schema:dashboard_ui_object")  # 键区分 submit
    mt = payload.get("my_tools")  # 演示/壳数据数组
    if mt is not None and not isinstance(mt, list):  # 须数组
        raise HTTPException(status_code=400, detail="site_json_schema:my_tools_array")  # 类型
    for name in ("page_views_data", "ratings_data", "category_performance"):  # 图表序列
        block = payload.get(name)  # 取块
        if block is not None and not isinstance(block, list):  # 须数组
            raise HTTPException(status_code=400, detail=f"site_json_schema:{name}_array")  # 点名


def validate_seo_tool_json_ld(payload: dict[str, Any]) -> None:  # 工具详情 JSON-LD 全局合并块
    gm = payload.get("global_merge")  # 浅合并进 SoftwareApplication 的对象
    if gm is not None and (not isinstance(gm, dict) or isinstance(gm, list)):  # 须纯对象
        raise HTTPException(status_code=400, detail="site_json_schema:seo_tool_json_ld.global_merge_object")  # 路径式 detail


def validate_home_seo_site_json(payload: dict[str, Any]) -> None:  # 顶栏与首页关键词（与 admin 首页 SEO 页字段一致）
    for name in ("brand_title", "keywords", "brand_icon_emoji"):  # 已知字符串键
        v = payload.get(name)  # 取值
        if v is not None and not isinstance(v, str):  # 须字符串或省略
            raise HTTPException(status_code=400, detail=f"site_json_schema:home_seo.{name}_string")  # 类型错


def validate_seo_robots_site_json(payload: dict[str, Any]) -> None:  # robots.txt 运营配置
    rb = payload.get("raw_body")  # 全文覆盖
    if rb is not None and not isinstance(rb, str):  # 须字符串或省略
        raise HTTPException(status_code=400, detail="site_json_schema:seo_robots.raw_body_string")  # 类型
    su = payload.get("sitemap_url")  # 单条绝对 URL
    if su is not None and not isinstance(su, str):  # 须字符串或省略
        raise HTTPException(status_code=400, detail="site_json_schema:seo_robots.sitemap_url_string")  # 类型
    sus = payload.get("sitemap_urls")  # 多条
    if sus is not None:  # 有则校验
        if not isinstance(sus, list):  # 须数组
            raise HTTPException(status_code=400, detail="site_json_schema:seo_robots.sitemap_urls_array")  # 类型
        for i, x in enumerate(sus):  # 逐项
            if not isinstance(x, str):  # 须 URL 串
                raise HTTPException(status_code=400, detail=f"site_json_schema:seo_robots.sitemap_urls[{i}]")  # 下标
    dp = payload.get("disallow_paths")  # Disallow 前缀列表
    if dp is not None:  # 有则校验
        if not isinstance(dp, list):  # 须数组
            raise HTTPException(status_code=400, detail="site_json_schema:seo_robots.disallow_paths_array")  # 类型
        for i, p in enumerate(dp):  # 逐项
            if not isinstance(p, str) or not str(p).strip().startswith("/"):  # 须以 / 开头
                raise HTTPException(status_code=400, detail=f"site_json_schema:seo_robots.disallow_paths[{i}]")  # 下标


def validate_recommend_algo_v1_site_json(payload: dict[str, Any]) -> None:  # 列表推荐 1.0 权重与开关
    if "enabled" in payload and not isinstance(payload["enabled"], bool):  # 须布尔
        raise HTTPException(status_code=400, detail="site_json_schema:recommend_algo_v1.enabled_bool")  # 类型错
    wd = payload.get("window_days")  # 统计窗天数
    if wd is not None and (not isinstance(wd, int) or isinstance(wd, bool) or wd < 1 or wd > 730):  # 合理范围
        raise HTTPException(status_code=400, detail="site_json_schema:recommend_algo_v1.window_days_int")  # 非法
    for name in (  # 嵌套须为对象
        "layer_weights",
        "traffic_inner",
        "conversion_inner",
        "commercial_inner",
        "decay",
        "complexity_coef",
    ):
        blk = payload.get(name)  # 取块
        if blk is not None and (not isinstance(blk, dict) or isinstance(blk, list)):  # 非对象
            raise HTTPException(status_code=400, detail=f"site_json_schema:recommend_algo_v1.{name}_object")  # 点名


def validate_ai_insight_competitor_benchmarks(payload: dict[str, Any]) -> None:  # AI SEO 竞品块（P-AI-03）
    b = payload.get("benchmarks")  # 须为数组或省略
    if b is not None:  # 有则校验
        if not isinstance(b, list):  # 非数组
            raise HTTPException(status_code=400, detail="site_json_schema:ai_insight_competitor_benchmarks.benchmarks_array")
        for i, x in enumerate(b):  # 逐项须对象
            if not isinstance(x, dict):  # 非法元素
                raise HTTPException(
                    status_code=400,
                    detail=f"site_json_schema:ai_insight_competitor_benchmarks.benchmarks[{i}]",
                )
    lu = payload.get("last_updated")  # 可选字符串
    if lu is not None and not isinstance(lu, str):  # 须 str
        raise HTTPException(status_code=400, detail="site_json_schema:ai_insight_competitor_benchmarks.last_updated_string")
    notes = payload.get("notes")  # 可选字符串
    if notes is not None and not isinstance(notes, str):  # 须 str
        raise HTTPException(status_code=400, detail="site_json_schema:ai_insight_competitor_benchmarks.notes_string")


def validate_site_json_for_key(key: str, payload: dict[str, Any]) -> None:  # 按键分发
    if key == "submit":  # 提交页元数据
        validate_submit_site_json(payload)  # 分类/pricing/ui
    elif key == "dashboard":  # 仪表盘壳
        validate_dashboard_site_json(payload)  # 徽章/摘要/序列
    elif key == "seo_tool_json_ld":  # 结构化数据运营覆盖
        validate_seo_tool_json_ld(payload)  # global_merge
    elif key == "seo_robots":  # robots.txt 与 Sitemap 声明
        validate_seo_robots_site_json(payload)  # raw_body / sitemap_url(s) / disallow_paths
    elif key == "home_seo":  # 顶栏品牌与首页关键词
        validate_home_seo_site_json(payload)  # brand_title / keywords / brand_icon_emoji
    elif key == "ai_insight_competitor_benchmarks":  # 竞品对标 JSON
        validate_ai_insight_competitor_benchmarks(payload)  # benchmarks / last_updated / notes
    elif key == "recommend_algo_v1":  # 工具列表推荐算法 1.0
        validate_recommend_algo_v1_site_json(payload)  # 开关、window_days、嵌套权重对象
