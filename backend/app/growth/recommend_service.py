# 工具列表推荐分 1.0（千人一面）：基于窗口内 PV/出站/收藏/评论 + Z 归一 + 分层权重与指数衰减
from __future__ import annotations

import json  # 读 site_json 配置
import math  # exp 衰减
import statistics  # 全站 Z 值
from datetime import date, timedelta  # 统计窗口与工具「发布天数」
from typing import Any  # JSON 与 Row 形态

def default_recommend_config() -> dict[str, Any]:  # 与 PRD 1.0 默认权重对齐，可整包被 site_json 覆盖键
    return {  # 缺省对象
        "enabled": True,  # 关闭则列表仍按 popularity
        "window_days": 30,  # 流量/出站/率的分母分子统计窗（收藏为全量计数）
        "layer_weights": {"traffic": 0.3, "conversion": 0.3, "commercial": 0.4},  # 三层外权重
        "traffic_inner": {"views": 0.75, "outbound_clicks": 0.25},  # 层内：Z(详情 PV) 与 Z(出站)
        "conversion_inner": {"rating_norm": 0.3, "favorite_rate": 0.35, "comment_rate": 0.35},  # 率后再 Z
        "commercial_inner": {"raw_outbound": 0.5, "conversion_rate": 0.5},  # Z(出站) 与 Z(出站/浏览)
        "decay": {"traffic_lambda": 0.1, "conversion_lambda": 0.05, "commercial_lambda": 0.05},  # 指数 λ
        "conversion_rate_bonus_multiplier": 1.1,  # 转化率 > 均值倍数时的商业层乘子
        "conversion_rate_bonus_vs_mean": 2.0,  # 与均值比阈值
        "complexity_coef": {"simple": 0.8, "medium": 1.0, "high": 1.2},  # 横向质量修正
    }


def load_recommend_config(conn: Any) -> dict[str, Any]:  # noqa: ANN401 — Connection 形态因驱动而异
    base = default_recommend_config()  # 默认值
    row = conn.execute(  # 读运营配置
        "SELECT payload_json FROM site_json WHERE content_key = 'recommend_algo_v1' LIMIT 1",
    ).fetchone()  # 可无行
    if not row:  # 未配置
        return base  # 用默认
    try:  # 解析 JSON
        raw = json.loads(row["payload_json"] or "{}")  # 对象
    except (json.JSONDecodeError, TypeError):  # 坏数据
        return base  # 回默认
    if not isinstance(raw, dict):  # 非对象
        return base  # 回默认
    out = {**base, **raw}  # 浅合并顶层键
    out["layer_weights"] = {**base["layer_weights"], **(raw.get("layer_weights") or {})}  # 嵌套合并
    out["traffic_inner"] = {**base["traffic_inner"], **(raw.get("traffic_inner") or {})}
    out["conversion_inner"] = {**base["conversion_inner"], **(raw.get("conversion_inner") or {})}
    out["commercial_inner"] = {**base["commercial_inner"], **(raw.get("commercial_inner") or {})}
    out["decay"] = {**base["decay"], **(raw.get("decay") or {})}
    out["complexity_coef"] = {**base["complexity_coef"], **(raw.get("complexity_coef") or {})}
    return out  # 合并后配置


def _config_enabled(conn: Any) -> bool:  # noqa: ANN401
    row = conn.execute(
        "SELECT payload_json FROM site_json WHERE content_key = 'recommend_algo_v1' LIMIT 1",
    ).fetchone()  # 无行则未启用算法排序
    if not row:  # 未插默认
        return False  # 保持旧行为 popularity
    try:  # 解析
        raw = json.loads(row["payload_json"] or "{}")  # 对象
    except (json.JSONDecodeError, TypeError):  # 坏
        return False  # 关
    if not isinstance(raw, dict):  # 类型错
        return False  # 关
    return bool(raw.get("enabled", False))  # 行内默认 false 若缺键


def recommend_sort_enabled(conn: Any) -> bool:  # noqa: ANN401 — 对外：仅当库内有 recommend_algo_v1 且 enabled
    return _config_enabled(conn)  # 单一来源


def _window_dates(window_days: int) -> tuple[str, str]:  # (start_date, end_date) ISO 日期
    w = max(1, min(int(window_days), 730))  # 钳制 1～730 天
    end = date.today()  # 含今日
    start = end - timedelta(days=w - 1)  # 含满 window_days 个日历日
    return start.isoformat(), end.isoformat()  # 与 page_analytics 一致


def _count_detail_pv_window(conn: Any, slug: str, start_d: str, end_d: str) -> int:  # noqa: ANN401
    prefix = f"/tool/{slug}"  # 与 tool_traffic_counts 前缀一致
    row = conn.execute(  # 窗口内详情 PV
        """SELECT COUNT(*) AS c FROM page_view_log
           WHERE (page_path = ? OR page_path LIKE ? OR page_path LIKE ?)
           AND date(created_at) >= ? AND date(created_at) <= ?""",
        (prefix, prefix + "/%", prefix + "?%", start_d, end_d),  # 尾斜杠与 query
    ).fetchone()  # 聚合
    return int(row["c"] or 0) if row else 0  # 安全 int


def _count_outbound_window(conn: Any, slug: str, start_d: str, end_d: str) -> int:  # noqa: ANN401
    row = conn.execute(
        """SELECT COUNT(*) AS c FROM outbound_click_log
           WHERE tool_slug = ? AND date(created_at) >= ? AND date(created_at) <= ?""",
        (slug, start_d, end_d),
    ).fetchone()  # 窗口内出站
    return int(row["c"] or 0) if row else 0  # int


def _count_favorites_all_time(conn: Any, slug: str) -> int:  # noqa: ANN401 — 表无时间列
    row = conn.execute(
        "SELECT COUNT(*) AS c FROM user_favorite WHERE tool_slug = ?",
        (slug,),
    ).fetchone()  # 全量收藏
    return int(row["c"] or 0) if row else 0  # int


def _count_published_reviews(conn: Any, tool_id: int) -> int:  # noqa: ANN401
    row = conn.execute(
        """SELECT COUNT(*) AS c FROM review
           WHERE tool_id = ? AND ugc_status = 'published'""",
        (tool_id,),
    ).fetchone()  # 已发布评论数
    return int(row["c"] or 0) if row else 0  # int


def _days_since_created(created_at: object) -> int:  # 工具上架/创建距今天数（用于衰减）
    if created_at is None:  # 空
        return 0  # 不衰减
    s = str(created_at).strip()  # 转串
    if not s:  # 空串
        return 0  # 不衰减
    try:  # 取日期前缀 YYYY-MM-DD
        d0 = date.fromisoformat(s[:10])  # 前十位
        return max(0, (date.today() - d0).days)  # 非负天数
    except ValueError:  # 解析失败
        return 0  # 不衰减


def _z_all(values: list[float]) -> list[float]:  # 总体标准差 Z（与 PRD「Z 归一」一致）
    n = len(values)  # 长度
    if n == 0:  # 空
        return []  # 无
    if n == 1:  # 单点
        return [0.0]  # 无方差
    m = statistics.mean(values)  # 均值
    st = statistics.pstdev(values)  # 总体标准差
    if st < 1e-9:  # 全相同
        return [0.0] * n  # 全零 Z
    return [(v - m) / st for v in values]  # 逐工具 Z


def _complexity_multiplier(tier: object, coef_map: dict[str, float]) -> float:  # 横向质量系数
    k = str(tier or "medium").strip().lower()  # 规范化
    if k not in coef_map:  # 未知档位
        k = "medium"  # 回退
    return float(coef_map.get(k, 1.0))  # 系数


def recompute_recommend_scores(conn: Any) -> int:  # noqa: ANN401 — 返回更新行数
    cfg = load_recommend_config(conn)  # 合并后配置（计算始终用完整默认+覆盖）
    if not _config_enabled(conn):  # 未启用或未插行
        return 0  # 不写分（调用方可选择仍刷新为 0）
    window_days = int(cfg.get("window_days") or 30)  # 窗长
    start_d, end_d = _window_dates(window_days)  # ISO 起止
    lw = cfg["layer_weights"]  # 三层权重
    wt = float(lw.get("traffic", 0.3))  # 流量层外权
    wc = float(lw.get("conversion", 0.3))  # 转化层外权
    wm = float(lw.get("commercial", 0.4))  # 商业层外权
    ti = cfg["traffic_inner"]  # 层内
    twv = float(ti.get("views", 0.75))  # Z(PV) 权
    two = float(ti.get("outbound_clicks", 0.25))  # Z(出站) 权
    ci = cfg["conversion_inner"]  # 转化层内
    crn = float(ci.get("rating_norm", 0.3))  # 展示评分归一后 Z 的权
    cfn = float(ci.get("favorite_rate", 0.35))  # 收藏率 Z
    ccn = float(ci.get("comment_rate", 0.35))  # 评论率 Z
    mi = cfg["commercial_inner"]  # 商业层内
    m1 = float(mi.get("raw_outbound", 0.5))  # Z(出站次数)
    m2 = float(mi.get("conversion_rate", 0.5))  # Z(转化率)
    dec = cfg["decay"]  # λ
    lt = float(dec.get("traffic_lambda", 0.1))  # 流量衰减快
    lc = float(dec.get("conversion_lambda", 0.05))  # 转化衰减慢
    lm = float(dec.get("commercial_lambda", 0.05))  # 商业衰减慢
    bonus_m = float(cfg.get("conversion_rate_bonus_multiplier", 1.1))  # 高转化乘子
    bonus_th = float(cfg.get("conversion_rate_bonus_vs_mean", 2.0))  # 与均值比
    ccoef = cfg["complexity_coef"]  # 复杂度系数表

    rows = conn.execute(  # 仅已上架工具参与排序分
        """SELECT id, slug, rating, created_at, complexity_tier
           FROM tool WHERE moderation_status = 'active' ORDER BY id""",
    ).fetchall()  # 全量 active
    if not rows:  # 无工具
        return 0  # 无更新

    slugs = [str(r["slug"]) for r in rows]  # slug 列表
    tids = [int(r["id"]) for r in rows]  # id 列表
    views = [_count_detail_pv_window(conn, sl, start_d, end_d) for sl in slugs]  # 窗内详情 PV
    outbound = [_count_outbound_window(conn, sl, start_d, end_d) for sl in slugs]  # 窗内出站
    favs = [_count_favorites_all_time(conn, sl) for sl in slugs]  # 收藏全量
    nrev = [_count_published_reviews(conn, tid) for tid in tids]  # 评论条数

    ratings = [float(r["rating"] or 0) for r in rows]  # 展示评分 0～5
    rating_norm = [min(1.0, max(0.0, x / 5.0)) for x in ratings]  # 压到 0～1 再参与率逻辑
    fav_rates = [favs[i] / max(views[i], 1) for i in range(len(rows))]  # 收藏率（全量收藏/窗内 PV）
    com_rates = [nrev[i] / max(views[i], 1) for i in range(len(rows))]  # 评论率
    cvr_list = [outbound[i] / max(views[i], 1) for i in range(len(rows))]  # 出站转化率 proxy

    z_views = _z_all([float(v) for v in views])  # Z(PV)
    z_out = _z_all([float(o) for o in outbound])  # Z(出站)
    z_rn = _z_all([float(x) for x in rating_norm])  # Z(评分归一)
    z_fr = _z_all([float(x) for x in fav_rates])  # Z(收藏率)
    z_cr = _z_all([float(x) for x in com_rates])  # Z(评论率)
    z_ob2 = _z_all([float(o) for o in outbound])  # 与 z_out 同向量（商业层 raw）
    z_cvr = _z_all([float(x) for x in cvr_list])  # Z(转化率)

    mean_cvr = statistics.mean(cvr_list) if cvr_list else 0.0  # 全站均值（含零浏览工具）

    updated = 0  # 计数
    for i, r in enumerate(rows):  # 逐工具算分
        slug = slugs[i]  # slug
        days = _days_since_created(r["created_at"])  # 发布天数
        qcoef = _complexity_multiplier(r["complexity_tier"], ccoef)  # 复杂度乘子
        traffic_core = (z_views[i] * twv + z_out[i] * two) * qcoef  # 流量层（含质量修正）
        traffic_decay = math.exp(-lt * days)  # 流量时效
        conv_core = z_rn[i] * crn + z_fr[i] * cfn + z_cr[i] * ccn  # 转化层
        conv_decay = math.exp(-lc * days)  # 转化时效
        comm_core = z_ob2[i] * m1 + z_cvr[i] * m2  # 商业层
        if mean_cvr > 1e-12 and cvr_list[i] > bonus_th * mean_cvr:  # 显著高于均值
            comm_core *= bonus_m  # 激励小而美
        comm_decay = math.exp(-lm * days)  # 商业时效
        score = (  # 加权求和（与 PRD 分块一致）
            wt * traffic_core * traffic_decay
            + wc * conv_core * conv_decay
            + wm * comm_core * comm_decay
        )
        conn.execute(  # 写回 recommend_score
            "UPDATE tool SET recommend_score = ? WHERE id = ? AND slug = ?",
            (float(score), int(r["id"]), slug),  # 绑定
        )
        updated += 1  # 行数
    return updated  # 返回更新工具数
