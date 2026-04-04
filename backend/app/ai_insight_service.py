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
    }
)
_PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")  # 匹配 {{name}}

_rate_lock = threading.Lock()  # 保护 _rate_map
_rate_map: dict[int, list[float]] = {}  # admin_user_id → 近期请求单调时间戳


def check_ai_insight_rate_limit(admin_user_id: int, *, window_sec: int = 300, max_calls: int = 10) -> None:
    """每管理员滑动窗口内最多 max_calls 次；超限抛 ValueError。"""
    now = time.monotonic()  # 不受系统调时影响
    with _rate_lock:  # 多 worker 单进程内一致；多进程需 Redis 另立
        lst = _rate_map.setdefault(admin_user_id, [])  # 该管理员时间列表
        lst[:] = [t for t in lst if now - t < window_sec]  # 剔窗口外
        if len(lst) >= max_calls:  # 已满
            raise ValueError("rate_limited_ai_insight")  # 由路由转 429
        lst.append(now)  # 记录本次


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


def build_snapshots(conn: Any) -> tuple[dict[str, str], dict[str, Any]]:  # noqa: ANN401
    """返回 (占位符名→字符串, 完整摘要 dict 供落库 input_payload_summary)。"""
    page_seo = _load_site_json(conn, "page_seo")  # path → SEO 字段
    home_seo = _load_site_json(conn, "home_seo")  # 顶栏与首页关键词
    sm = _load_site_json(conn, "seo_sitemap_static")  # 静态 sitemap 配置
    rb = _load_site_json(conn, "seo_robots")  # robots 配置

    paths = sorted(page_seo.keys())[:50] if isinstance(page_seo, dict) else []  # 最多 50 path
    seo_paths: list[dict[str, str]] = []  # 精简条目
    for p in paths:  # 逐 path
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
            "page_seo_sample_strategy": "sorted_path_keys_first_50",  # 与近 7 日 Top N 热门路径不对齐；大站须与 Analytics 交叉核对（P-AI-04）
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

    end_d = date.today()  # 今天
    start_d = end_d - timedelta(days=6)  # 含今日共 7 天
    trend = trend_series(conn, days=7)  # 近 7 日 PV/UV
    rows = page_analytics_rows(  # 路径聚合
        conn,
        start_date=start_d.isoformat(),  # 起
        end_date=end_d.isoformat(),  # 止
        sort_by="pv",  # 按 PV 排序
    )
    top = rows[:20] if rows else []  # 前 20 路径
    outbound_7d = outbound_official_clicks_summary(  # 近 7 日出站官网点击
        conn,
        start_date=start_d.isoformat(),  # 与 traffic 同窗
        end_date=end_d.isoformat(),  # 含今日
        limit=15,  # Top 工具数
    )
    traffic_snapshot = json.dumps(  # 流量块
        {
            "daily_trend_7d": trend,  # 日序列
            "top_pages_7d": [  # 热门 path 摘要
                {
                    "page_path": _clip(str(r.get("page_path", "")), 160),  # 路径
                    "pv": int(r.get("pv") or 0),  # PV
                    "uv": int(r.get("uv") or 0),  # UV
                }
                for r in top
            ],
            "outbound_official_clicks_7d": outbound_7d,  # 工具详情外链转化意向（P-AI-02）
        },
        ensure_ascii=False,
    )

    dash = dashboard_summary(conn)  # 今日/昨日与工具用户数
    tools_row = conn.execute("SELECT COUNT(*) AS c FROM comparison_page").fetchone()  # 对比页数量
    cmp_c = int(tools_row["c"] or 0) if tools_row else 0  # 安全转 int
    site_stats_snapshot = json.dumps(  # 规模块
        {
            "dashboard_summary": dash,  # 大盘 dict
            "comparison_page_count": cmp_c,  # 对比落地页数
            "snapshot_limits_and_caveats": {  # 已知产品与工程边界，避免模型误判「已覆盖」
                "competitor_traffic_benchmarks": "offline_reference_only_not_in_db",  # P-AI-03：竞品图为运营素材未结构化入库
                "llm_invocation": "sync_http_may_hit_gateway_timeout_async_202_planned",  # P-AI-05
                "ai_insight_rate_limit": "in_process_per_worker_not_shared_redis_tbd",  # P-AI-06
                "open_product_decisions": "data_residency_markdown_render_cost_policy_tbd",  # P-AI-07
            },
        },
        ensure_ascii=False,
    )

    idx_clipped = _clip(seo_indexing_snapshot, 8000)  # 索引配置段截断
    placeholders = {  # 注入模板（crawler_snapshot 与 seo_indexing_snapshot 同内容，兼容旧运营模板）
        "seo_snapshot": _clip(seo_snapshot, 12000),  # 控制总长
        "seo_indexing_snapshot": idx_clipped,  # 推荐占位符名（P-AI-01）
        "crawler_snapshot": idx_clipped,  # deprecated 别名，避免旧配置报错
        "traffic_snapshot": _clip(traffic_snapshot, 12000),
        "site_stats_snapshot": _clip(site_stats_snapshot, 8000),
    }
    summary_obj = {  # 落库用结构化摘要（非全文也可）
        "seo_chars": len(placeholders["seo_snapshot"]),  # 各块字符数
        "seo_indexing_chars": len(placeholders["seo_indexing_snapshot"]),  # 与 crawler 段同长
        "crawler_chars": len(placeholders["crawler_snapshot"]),  # 兼容字段
        "traffic_chars": len(placeholders["traffic_snapshot"]),
        "site_stats_chars": len(placeholders["site_stats_snapshot"]),
        "page_seo_paths_included": len(seo_paths),  # 含多少 path
        "outbound_clicks_7d_total": _coerce_optional_json_int(outbound_7d.get("total_clicks")) or 0,  # 出站总次数
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
