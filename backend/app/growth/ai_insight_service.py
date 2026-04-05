"""组装 SEO/流量快照、解析 LLM 密钥、OpenAI 兼容 Chat Completions 调用与简易限流。"""
from __future__ import annotations

import json  # 序列化快照与解析响应
import os  # 读环境变量密钥
import re  # 校验用户模板中未知占位符
import threading  # 限流字典锁
import time  # 单调时钟窗口
from datetime import date, timedelta  # 流量区间
from typing import Any  # JSON 形态

import httpx  # 同步 HTTP 调大模型

from app.analytics_service import (  # 聚合统计
    dashboard_summary,  # 今日昨日大盘
    outbound_official_clicks_summary,  # 出站官网点击
    page_analytics_rows,  # 路径行
    trend_series,  # 日趋势
)

# 用户模板允许的占位符（seo_indexing_snapshot 为 sitemap/robots；crawler_snapshot 仅为旧名兼容）
_ALLOWED_PLACEHOLDERS = frozenset(
    {
        "seo_snapshot",
        "seo_indexing_snapshot",
        "crawler_snapshot",
        "traffic_snapshot",
        "site_stats_snapshot",
        "competitor_benchmark_snapshot",  # site_json.ai_insight_competitor_benchmarks 结构化竞品指标（P-AI-03）
    }
)
_PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")  # 匹配 {{name}}

_rate_lock = threading.Lock()  # 保护 _rate_map
_rate_map: dict[int, list[float]] = {}  # admin_user_id → 近期请求单调时间戳


def _env_int(name: str, default: int, *, lo: int, hi: int) -> int:  # 读整数环境变量并钳制到 [lo,hi]
    raw = (os.environ.get(name) or "").strip()  # 未设置为空串
    if not raw:  # 缺省
        return default  # 用默认值
    try:  # 解析
        v = int(raw, 10)  # 十进制
    except ValueError:  # 非法
        return default  # 回退默认
    return max(lo, min(hi, v))  # 钳制


def _rate_limit_memory(admin_user_id: int, *, window_sec: int, max_calls: int) -> None:  # 进程内滑动窗口
    now = time.monotonic()  # 不受系统调时影响
    with _rate_lock:  # 与单进程多线程一致
        lst = _rate_map.setdefault(admin_user_id, [])  # 该管理员时间列表
        lst[:] = [t for t in lst if now - t < window_sec]  # 剔窗口外
        if len(lst) >= max_calls:  # 已满
            raise ValueError("rate_limited_ai_insight")  # 由路由转 429
        lst.append(now)  # 记录本次


def _rate_limit_redis_fixed_window(url: str, admin_user_id: int, *, window_sec: int, max_calls: int) -> None:  # 固定窗口 INCR（P-AI-06）
    import redis  # 可选依赖；未安装时由 check 外层决定是否调用

    r = redis.from_url(url, decode_responses=True)  # 客户端
    bucket = int(time.time()) // max(window_sec, 1)  # 当前窗口桶号
    key = f"ai_insight_rl:{admin_user_id}:{bucket}"  # 每用户每桶一键
    n = int(r.incr(key))  # 原子自增
    if n == 1:  # 首击设 TTL，避免脏键常驻
        r.expire(key, window_sec + 5)  # 略长于窗口
    if n > max_calls:  # 本窗口超限
        raise ValueError("rate_limited_ai_insight")  # 与内存路径同码


def _ai_insight_rate_limit_params() -> tuple[int, int]:  # P-AI-06 运维可调窗口与次数（与快照审计字段一致）
    w = _env_int("AI_INSIGHT_RATE_LIMIT_WINDOW_SEC", 300, lo=10, hi=3600)  # 秒；Redis 固定窗口与内存滑动窗口共用
    m = _env_int("AI_INSIGHT_RATE_LIMIT_MAX_CALLS", 10, lo=1, hi=1000)  # 每窗口每管理员上限
    return w, m  # 元组


def check_ai_insight_rate_limit(admin_user_id: int) -> None:
    """每管理员限流：若设 AI_INSIGHT_RATE_LIMIT_REDIS_URL 则用 Redis 固定窗口（多 worker 共享），否则进程内滑动窗口。"""
    window_sec, max_calls = _ai_insight_rate_limit_params()  # 读环境变量（默认 300s / 10 次）
    url = (os.environ.get("AI_INSIGHT_RATE_LIMIT_REDIS_URL") or "").strip()  # P-AI-06 分布式限流
    if url:  # 生产多实例推荐（须安装 redis 包）
        _rate_limit_redis_fixed_window(url, admin_user_id, window_sec=window_sec, max_calls=max_calls)  # Redis 路径
        return  # 完成
    _rate_limit_memory(admin_user_id, window_sec=window_sec, max_calls=max_calls)  # 单机/开发


def fetch_llm_provider_row(conn: Any, provider_id: int | None) -> Any:  # noqa: ANN401 — DB Row 形态因驱动而异
    """按 id 取 LLM 连接行；id 为 None 时优先 is_default=1，否则取最小 id（与路由 POST /run 一致）。"""
    if provider_id is not None:  # 显式指定主键
        return conn.execute(  # 单行查询
            "SELECT * FROM ai_insight_llm_provider WHERE id = ?",  # 占位符与 PG 适配层一致
            (provider_id,),  # 绑定 id
        ).fetchone()  # 一行或 None
    r = conn.execute(  # 默认启用行
        "SELECT * FROM ai_insight_llm_provider WHERE is_default = 1 ORDER BY id LIMIT 1",  # 唯一默认
    ).fetchone()  # 一行或 None
    if r:  # 命中默认
        return r  # 直接返回
    return conn.execute(  # 无默认时兜底首条
        "SELECT * FROM ai_insight_llm_provider ORDER BY id LIMIT 1",  # 最小 id
    ).fetchone()  # 或 None


def validate_user_prompt_template(text: str) -> None:
    """未知 {{token}} 时抛 ValueError，避免运营拼错占位符。"""
    for m in _PLACEHOLDER_RE.finditer(text):  # 扫描所有双花括号
        name = m.group(1)  # 占位符名
        if name not in _ALLOWED_PLACEHOLDERS:  # 非白名单
            raise ValueError(f"unknown_placeholder:{name}")  # 路由转 400


def _clip(s: str, max_len: int) -> str:  # 单段截断并提示
    if len(s) <= max_len:  # 未超长
        return s  # 原样
    return s[: max_len - 20] + "\n…(truncated)"  # 尾部省略


def _coerce_optional_json_int(value: object) -> int | None:  # 将 JSON/API 标量安全转为 int，失败返回 None
    if value is None:  # 字段缺失
        return None  # 无可用数值
    if isinstance(value, bool):  # bool 为 int 子类；用量字段不应出现，避免 True→1
        return None  # 不按计数处理
    if isinstance(value, int):  # 已是整数
        return value  # 直接采用
    if isinstance(value, float):  # JSON number 可能为 float
        return int(value)  # 向零截断为 int
    if isinstance(value, str):  # 少数实现返回数字字符串
        s = value.strip()  # 去首尾空白
        if not s:  # 空串
            return None  # 无效
        try:  # 解析十进制
            return int(s)  # 成功则返回
        except ValueError:  # 非数字
            return None  # 放弃
    return None  # 其他类型不支持


def _load_site_json(conn: Any, key: str) -> dict:  # noqa: ANN401 — Row 连接
    """读取 site_json 单行对象；失败返回 {}。"""
    row = conn.execute(  # 按主键查
        "SELECT payload_json FROM site_json WHERE content_key = ?",
        (key,),
    ).fetchone()  # 单行
    if not row or not row[0]:  # 无数据
        return {}  # 空对象
    try:  # 解析 JSON
        data = json.loads(row[0])  # payload 文本
    except (json.JSONDecodeError, TypeError):  # 损坏
        return {}  # 当空
    return data if isinstance(data, dict) else {}  # 仅 dict


def _page_seo_paths_stratified(page_seo: dict[str, Any], analytics_rows: list[dict], *, max_paths: int) -> tuple[list[str], str]:  # P-AI-04 分层抽样
    """先收录近窗热门且存在于 page_seo 的 path，再按字典序补足至 max_paths。"""
    if not isinstance(page_seo, dict) or max_paths <= 0:  # 无配置或上限无效
        return [], "empty_page_seo_or_zero_limit"  # 空策略说明
    ordered: list[str] = []  # 输出 path 顺序
    seen: set[str] = set()  # 去重
    for r in analytics_rows:  # 已按 PV 排序
        if len(ordered) >= max_paths:  # 已满
            break  # 停止
        p = str(r.get("page_path") or "").strip()  # 埋点路径
        if not p or p not in page_seo or p in seen:  # 无 SEO 配置或重复
            continue  # 跳过
        ordered.append(p)  # 热门优先
        seen.add(p)  # 标记
    for p in sorted(page_seo.keys()):  # 字典序补长尾
        if len(ordered) >= max_paths:  # 已满
            break  # 停止
        if p in seen:  # 已在热门段
            continue  # 跳过
        ordered.append(p)  # 补足
        seen.add(p)  # 标记
    strategy = "hybrid_hot_analytics_then_sorted_lexicographic"  # 有分析行时的策略名
    if not analytics_rows:  # 无埋点聚合
        ordered = sorted(page_seo.keys())[:max_paths]  # 纯字典序截断
        strategy = "sorted_path_keys_only_no_analytics_window"  # 回退说明
    return ordered, strategy  # path 列表与策略标签


def _build_competitor_benchmark_json(raw: dict[str, Any]) -> str:  # P-AI-03 结构化竞品块
    benchmarks = raw.get("benchmarks")  # 竞品条目数组
    rows: list[dict[str, Any]] = []  # 规范化后的列表
    if isinstance(benchmarks, list):  # 类型合法
        for i, it in enumerate(benchmarks):  # 逐项
            if not isinstance(it, dict):  # 跳过非对象
                continue  # 下一个
            label = _clip(str(it.get("label") or it.get("name") or f"item_{i}"), 120)  # 竞品名
            notes = _clip(str(it.get("notes") or ""), 500)  # 自由备注
            metrics = it.get("metrics")  # 可量化字典
            met_out: dict[str, Any] = {}  # 输出 metrics
            if isinstance(metrics, dict):  # 仅接受对象
                for mk, mv in list(metrics.items())[:24]:  # 控制键数量
                    k2 = _clip(str(mk), 64)  # 键截断
                    if isinstance(mv, (str, int, float, bool)) or mv is None:  # JSON 原生标量
                        met_out[k2] = mv  # 原样
                    else:  # 其他类型转字符串，避免 dumps 失败
                        met_out[k2] = str(mv)  # 兜底
            rows.append({"label": label, "notes": notes, "metrics": met_out})  # 一条竞品
    empty = len(rows) == 0  # 是否无数据
    payload = {  # 写入快照 JSON
        "source": "site_json_ai_insight_competitor_benchmarks",  # 数据来源
        "benchmarks": rows,  # 结构化列表
        "last_updated": _clip(str(raw.get("last_updated") or ""), 32),  # 运营标注日期
        "notes": _clip(str(raw.get("notes") or ""), 800),  # 全局说明
        "empty_hint": (  # 空时提示模型勿编造对标数值
            "未配置竞品指标：请在管理端「站点 JSON」键 ai_insight_competitor_benchmarks 填写 benchmarks[]；"
            "或于提示词中手工粘贴第三方估算并注明来源。"
            if empty
            else ""
        ),
    }
    return json.dumps(payload, ensure_ascii=False)  # 文本


def build_snapshots(conn: Any) -> tuple[dict[str, str], dict[str, Any]]:  # noqa: ANN401
    """返回 (占位符名→字符串, 完整摘要 dict 供落库 input_payload_summary)。"""
    page_seo_max = _env_int("AI_INSIGHT_PAGE_SEO_MAX_PATHS", 50, lo=1, hi=500)  # P-AI-04 可配置条数
    traffic_days = _env_int("AI_INSIGHT_TRAFFIC_WINDOW_DAYS", 7, lo=1, hi=90)  # 流量聚合天数
    traffic_top_n = _env_int("AI_INSIGHT_TRAFFIC_TOP_PATHS", 20, lo=1, hi=200)  # 热门 path 条数

    page_seo = _load_site_json(conn, "page_seo")  # path → SEO 字段
    home_seo = _load_site_json(conn, "home_seo")  # 顶栏与首页关键词
    sm = _load_site_json(conn, "seo_sitemap_static")  # 静态 sitemap 配置
    rb = _load_site_json(conn, "seo_robots")  # robots 配置
    comp_raw = _load_site_json(conn, "ai_insight_competitor_benchmarks")  # 竞品指标（P-AI-03）

    end_d = date.today()  # 今天
    start_d = end_d - timedelta(days=traffic_days - 1)  # 含首尾共 traffic_days 天
    trend = trend_series(conn, days=traffic_days)  # 日 PV/UV
    rows = page_analytics_rows(  # 路径聚合
        conn,
        start_date=start_d.isoformat(),  # 起
        end_date=end_d.isoformat(),  # 止
        sort_by="pv",  # 按 PV 排序
    )
    top = rows[:traffic_top_n] if rows else []  # Top N 路径

    paths, path_strategy = _page_seo_paths_stratified(page_seo, rows, max_paths=page_seo_max)  # 分层 path 列表
    seo_paths: list[dict[str, str]] = []  # 精简条目
    for p in paths:  # 按抽样顺序输出
        ent = page_seo.get(p) if isinstance(page_seo, dict) else None  # 条目
        if not isinstance(ent, dict):  # 跳过非对象
            continue  # 下一个
        seo_paths.append(
            {
                "path": p,  # 归一路径
                "title": _clip(str(ent.get("title") or ent.get("title_zh") or ""), 200),  # 标题截断
                "description": _clip(str(ent.get("description") or ent.get("description_zh") or ""), 280),  # 描述
                "noindex": str(ent.get("noindex", "")),  # 是否 noindex
            }
        )
    seo_snapshot = json.dumps(  # SEO 块 JSON 文本
        {
            "home_seo": {  # 首页块摘要
                "brand_title": _clip(str(home_seo.get("brand_title", "")), 120),  # 品牌名
                "keywords": _clip(str(home_seo.get("keywords", "")), 200),  # 关键词串
            },
            "page_seo_sample": seo_paths,  # 页面 TDK 样本
            "page_seo_sample_strategy": path_strategy,  # 抽样策略标签（P-AI-04）
            "page_seo_sample_limits": {"max_paths": page_seo_max},  # 当前上限
        },
        ensure_ascii=False,  # 保留中文
    )

    urls = sm.get("urls") if isinstance(sm, dict) else None  # urls 数组
    url_list = urls if isinstance(urls, list) else []  # 列表或空
    seo_indexing_snapshot = json.dumps(  # sitemap/robots 站点 JSON 摘要（非 crawler_job 内容爬虫）
        {
            "source": "site_json_seo_sitemap_static_and_seo_robots",  # 数据来源说明
            "seo_sitemap_static_url_count": len(url_list),  # 静态条数
            "seo_sitemap_static_paths": [  # 前 15 条 path
                _clip(str(u.get("path", "") if isinstance(u, dict) else ""), 120)
                for u in url_list[:15]
            ],
            "seo_robots_keys": sorted(rb.keys()) if isinstance(rb, dict) else [],  # 已配置键名
            "seo_robots_raw_body_len": len(str(rb.get("raw_body", ""))) if isinstance(rb, dict) else 0,  # 全文覆盖长度
        },
        ensure_ascii=False,
    )

    outbound_w = outbound_official_clicks_summary(  # 同窗出站官网点击
        conn,
        start_date=start_d.isoformat(),  # 与 traffic 对齐
        end_date=end_d.isoformat(),  # 含今日
        limit=15,  # Top 工具数
    )
    traffic_snapshot = json.dumps(  # 流量块
        {
            "traffic_window_days": traffic_days,  # 实际聚合天数（键名仍兼容旧模板中的「7d」语义）
            "top_pages_limit": traffic_top_n,  # Top path 条数
            "daily_trend_7d": trend,  # 日序列（历史字段名保留；长度等于 traffic_window_days）
            "analytics_compare_range": {  # 与 GET /api/admin/analytics/pages 同源的区间与排序（运营对账 P-DOC-01）
                "start_date": start_d.isoformat(),  # 与下方 page_analytics_rows 起日一致（含当日）
                "end_date": end_d.isoformat(),  # 与下方 page_analytics_rows 止日一致（通常为今日）
                "sort_by": "pv",  # 与 top_pages_7d 的截取顺序一致
            },
            "top_pages_7d": [  # 热门 path 摘要（条数见 top_pages_limit）
                {
                    "page_path": _clip(str(r.get("page_path", "")), 160),  # 路径
                    "pv": int(r.get("pv") or 0),  # PV
                    "uv": int(r.get("uv") or 0),  # UV
                }
                for r in top
            ],
            "outbound_official_clicks_7d": outbound_w,  # 工具详情外链（窗口与上列一致）
        },
        ensure_ascii=False,
    )

    dash = dashboard_summary(conn)  # 今日/昨日与工具用户数
    tools_row = conn.execute("SELECT COUNT(*) AS c FROM comparison_page").fetchone()  # 对比页数量
    cmp_c = int(tools_row["c"] or 0) if tools_row else 0  # 安全转 int
    redis_rl = bool((os.environ.get("AI_INSIGHT_RATE_LIMIT_REDIS_URL") or "").strip())  # 是否启用分布式限流
    rl_window_sec, rl_max_calls = _ai_insight_rate_limit_params()  # 与 POST /run 实际限流一致（供审计）
    _bc = comp_raw.get("benchmarks")  # 竞品数组
    bench_count = len(_bc) if isinstance(_bc, list) else 0  # 竞品条数
    site_stats_snapshot = json.dumps(  # 规模块
        {
            "dashboard_summary": dash,  # 大盘 dict
            "comparison_page_count": cmp_c,  # 对比落地页数
            "snapshot_limits_and_caveats": {  # 已知产品与工程边界，避免模型误判「已覆盖」
                "competitor_traffic_benchmarks": (  # P-AI-03
                    "structured_rows_in_site_json_ai_insight_competitor_benchmarks"
                    if bench_count > 0
                    else "empty_populate_via_site_json_ai_insight_competitor_benchmarks"
                ),
                "llm_invocation": "default_sync_http_body_defer_llm_true_returns_202_poll_get_runs_id_set_reasonable_timeout_sec",  # P-AI-05
                "ai_insight_rate_limit": (  # P-AI-06
                    "redis_fixed_window_shared_across_workers_when_AI_INSIGHT_RATE_LIMIT_REDIS_URL_set"
                    if redis_rl
                    else "in_process_sliding_window_not_shared_across_workers"
                ),
                "open_product_decisions": {  # P-AI-07：出境策略已产品确认；其余键仍待运营/法务口径
                    "data_residency_and_cross_border": "allowed_overseas_llm_for_seo_summaries_and_aggregated_traffic",  # 允许 SEO 摘要+聚合流量发往管理员配置的 endpoint（含境外）；属地/合同另有约束时以法务为准
                    "model_output_format": "plain_text_now_markdown_render_if_needed_tbd",  # Markdown 渲染策略
                    "cost_quota_and_retention": "tbd_ops_policy",  # 成本与配额
                },
            },
            "ai_insight_snapshot_env_limits": {  # 与进程环境一致，便于审计
                "AI_INSIGHT_PAGE_SEO_MAX_PATHS": page_seo_max,
                "AI_INSIGHT_TRAFFIC_WINDOW_DAYS": traffic_days,
                "AI_INSIGHT_TRAFFIC_TOP_PATHS": traffic_top_n,
                "AI_INSIGHT_RATE_LIMIT_WINDOW_SEC": rl_window_sec,  # P-AI-06 与 check 一致
                "AI_INSIGHT_RATE_LIMIT_MAX_CALLS": rl_max_calls,  # P-AI-06
                "AI_INSIGHT_RATE_LIMIT_REDIS_URL_set": redis_rl,  # 是否走 Redis 共享限流
            },
        },
        ensure_ascii=False,
    )

    competitor_benchmark_snapshot = _build_competitor_benchmark_json(comp_raw)  # 竞品 JSON 文本
    idx_clipped = _clip(seo_indexing_snapshot, 8000)  # 索引配置段截断
    placeholders = {  # 注入模板（crawler_snapshot 与 seo_indexing_snapshot 同内容，兼容旧运营模板）
        "seo_snapshot": _clip(seo_snapshot, 12000),  # 控制总长
        "seo_indexing_snapshot": idx_clipped,  # 推荐占位符名（P-AI-01）
        "crawler_snapshot": idx_clipped,  # deprecated 别名，避免旧配置报错
        "traffic_snapshot": _clip(traffic_snapshot, 12000),
        "site_stats_snapshot": _clip(site_stats_snapshot, 8000),
        "competitor_benchmark_snapshot": _clip(competitor_benchmark_snapshot, 6000),  # P-AI-03
    }
    summary_obj = {  # 落库用结构化摘要（非全文也可）
        "seo_chars": len(placeholders["seo_snapshot"]),  # 各块字符数
        "seo_indexing_chars": len(placeholders["seo_indexing_snapshot"]),  # 与 crawler 段同长
        "crawler_chars": len(placeholders["crawler_snapshot"]),  # 兼容字段
        "traffic_chars": len(placeholders["traffic_snapshot"]),
        "site_stats_chars": len(placeholders["site_stats_snapshot"]),
        "competitor_benchmark_chars": len(placeholders["competitor_benchmark_snapshot"]),  # 竞品块长度
        "page_seo_paths_included": len(seo_paths),  # 含多少 path
        "page_seo_sample_strategy": path_strategy,  # 策略标签
        "snapshot_limits": {  # P-AI-04 生效值
            "page_seo_max_paths": page_seo_max,
            "traffic_window_days": traffic_days,
            "traffic_top_paths": traffic_top_n,
        },
        "traffic_analytics_compare_range": {  # 与 traffic_snapshot.analytics_compare_range 同内容（摘要里免拆 JSON）
            "start_date": start_d.isoformat(),  # 管理端 Analytics 起始日
            "end_date": end_d.isoformat(),  # 管理端 Analytics 结束日
        },
        "competitor_benchmark_rows": bench_count,  # 竞品条数
        "outbound_clicks_window_total": _coerce_optional_json_int(outbound_w.get("total_clicks")) or 0,  # 出站总次数
        "outbound_clicks_7d_total": _coerce_optional_json_int(outbound_w.get("total_clicks")) or 0,  # 兼容旧摘要字段名
    }
    return placeholders, summary_obj  # 元组返回


def fill_user_template(template: str, placeholders: dict[str, str]) -> str:
    """将 {{key}} 替换为对应字符串。"""
    out = template  # 累加替换
    for k, v in placeholders.items():  # 每个占位符
        out = out.replace("{{" + k + "}}", v)  # 精确键名（与 allowed 一致）
    return out  # 最终 user 消息


def resolve_llm_api_key(row: Any) -> str | None:  # noqa: ANN401 — sqlite Row
    """优先级：AI_INSIGHT_LLM_API_KEY → api_key_env_name → 库内 api_key。"""
    g = (os.environ.get("AI_INSIGHT_LLM_API_KEY") or "").strip()  # 全局环境变量
    if g:  # 非空优先
        return g  # 直接返回
    env_name = (row["api_key_env_name"] or "").strip() if row else ""  # 自定义环境变量名
    if env_name:  # 配置了名
        v = (os.environ.get(env_name) or "").strip()  # 读值
        if v:  # 有值
            return v  # 使用
    raw = (row["api_key"] or "").strip() if row else ""  # 库内密文区
    return raw or None  # 无则 None


def chat_completions_url(base_url: str) -> str:
    """base_url 含 /v1 则拼接 /chat/completions，否则补 /v1/chat/completions。"""
    b = base_url.rstrip("/")  # 去尾斜杠
    if b.endswith("/v1"):  # 已是 v1 根
        return b + "/chat/completions"  # OpenAI 风格
    return b + "/v1/chat/completions"  # 补全路径


def call_openai_compatible_chat(
    *,
    base_url: str,
    model: str,
    api_key: str,
    system_prompt: str,
    user_message: str,
    timeout_sec: int,
    temperature: float,
    extra_headers: dict[str, str],
) -> tuple[str, int | None, int | None]:
    """POST chat/completions；返回 (assistant 文本, prompt_tokens, completion_tokens)。"""
    url = chat_completions_url(base_url)  # 完整 URL
    headers = {"Authorization": "Bearer " + api_key, "Content-Type": "application/json"}  # 默认头
    headers.update(extra_headers)  # 运营自定义头
    body = {  # 请求 JSON
        "model": model,  # 模型名
        "temperature": temperature,  # 采样
        "messages": [  # 对话消息
            {"role": "system", "content": system_prompt},  # 系统
            {"role": "user", "content": user_message},  # 用户
        ],
    }
    timeout = httpx.Timeout(timeout_sec, connect=min(30, timeout_sec))  # 连接上限 30s
    with httpx.Client(timeout=timeout) as client:  # 同步客户端
        r = client.post(url, headers=headers, json=body)  # 发起请求
    if r.status_code >= 400:  # HTTP 错误
        snippet = _clip(r.text, 500)  # 响应体片段
        raise ValueError(f"llm_http_{r.status_code}:{snippet}")  # 带状态码
    data = r.json()  # 解析 JSON
    choices = data.get("choices")  # 候选列表
    if not isinstance(choices, list) or not choices:  # 异常结构
        raise ValueError("llm_no_choices")  # 无输出
    msg = choices[0].get("message") if isinstance(choices[0], dict) else None  # 第一条消息
    content = (msg or {}).get("content") if isinstance(msg, dict) else None  # 文本
    if not isinstance(content, str):  # 非字符串
        raise ValueError("llm_empty_content")  # 空内容
    usage = data.get("usage") if isinstance(data.get("usage"), dict) else {}  # 用量对象
    return (  # 文本与 token 计数
        content.strip(),  # assistant 正文
        _coerce_optional_json_int(usage.get("prompt_tokens")),  # prompt_tokens
        _coerce_optional_json_int(usage.get("completion_tokens")),  # completion_tokens
    )
