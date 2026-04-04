"""从 page_view_log 聚合 PV/UV/UID、停留与跳出率。"""
from __future__ import annotations

import sqlite3
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from app.i18n_util import category_label  # 开发者仪表盘分类展示名随 locale
from app.page_catalog import (
    build_tracked_path_list,
    labels_for_path,
    normalize_page_path,
    tool_slug_title_map,
)
from app.page_type_util import infer_page_type


def _day_str(d: date) -> str:
    return d.isoformat()


def day_totals(conn: sqlite3.Connection, day: str) -> dict[str, int]:
    """单日 PV、UV（按 session_id 去重）、UID（当日带 user_id 的去重访客）。"""
    row = conn.execute(
        """SELECT COUNT(*) AS pv,
                  COUNT(DISTINCT session_id) AS uv
           FROM page_view_log WHERE date(created_at) = ?""",
        (day,),
    ).fetchone()
    row2 = conn.execute(
        """SELECT COUNT(DISTINCT user_id) AS uid_login
           FROM page_view_log WHERE date(created_at) = ? AND user_id IS NOT NULL""",
        (day,),
    ).fetchone()
    uid_login = row2["uid_login"] if row2 else 0
    return {
        "pv": int(row["pv"] or 0) if row else 0,
        "uv": int(row["uv"] or 0) if row else 0,
        "uid": int(uid_login),
    }


def trend_series(conn: sqlite3.Connection, *, days: int) -> list[dict]:
    end = date.today()
    start = end - timedelta(days=days - 1)
    out: list[dict] = []
    d = start
    while d <= end:
        ds = _day_str(d)
        t = day_totals(conn, ds)
        out.append({"date": ds, **t})
        d += timedelta(days=1)
    return out


def trend_series_between(conn: sqlite3.Connection, d_start: date, d_end: date) -> list[dict]:
    # 与 trend_series 相同字段；按起止日（含首尾）逐日输出，供后台自选区间
    if d_start > d_end:
        d_start, d_end = d_end, d_start
    out: list[dict] = []
    d = d_start
    while d <= d_end:
        ds = _day_str(d)
        t = day_totals(conn, ds)
        out.append({"date": ds, **t})
        d += timedelta(days=1)
    return out


def _pct_change(today: int, yesterday: int) -> float:
    if yesterday <= 0:
        return 100.0 if today > 0 else 0.0
    return round((today - yesterday) / yesterday * 100.0, 2)


def dashboard_summary(conn: sqlite3.Connection) -> dict:
    today = _day_str(date.today())
    yest = _day_str(date.today() - timedelta(days=1))
    t0, t1 = day_totals(conn, today), day_totals(conn, yest)
    users_row = conn.execute("SELECT COUNT(*) AS c FROM app_user").fetchone()
    tools_row = conn.execute(
        """SELECT COUNT(*) AS c FROM tool WHERE moderation_status = 'active'"""
    ).fetchone()
    pending = conn.execute(
        """SELECT COUNT(*) AS c FROM tool WHERE moderation_status = 'pending'"""
    ).fetchone()
    reported = conn.execute(
        """SELECT COUNT(*) AS c FROM review WHERE ugc_status = 'reported'"""
    ).fetchone()
    return {
        "today": {**t0, "pct": {k: _pct_change(t0[k], t1[k]) for k in ("pv", "uv", "uid")}},
        "yesterday": t1,
        "total_registered_users": int(users_row["c"] or 0),
        "total_active_tools": int(tools_row["c"] or 0),
        "pending_tools": int(pending["c"] or 0),
        "reported_reviews": int(reported["c"] or 0),
    }


@dataclass
class _Pv:
    session_id: str
    page_path: str
    user_id: int | None
    created_at: str


def page_analytics_rows(
    conn: sqlite3.Connection,
    *,
    start_date: str,
    end_date: str,
    sort_by: str,
) -> list[dict]:
    rows = conn.execute(
        """SELECT session_id, page_path, user_id, created_at
           FROM page_view_log
           WHERE date(created_at) >= ? AND date(created_at) <= ?
           ORDER BY session_id, created_at""",
        (start_date, end_date),
    ).fetchall()
    events: list[_Pv] = [
        _Pv(r["session_id"], r["page_path"], r["user_id"], r["created_at"]) for r in rows
    ]

    by_path_pv: dict[str, int] = defaultdict(int)
    by_path_sessions: dict[str, set[str]] = defaultdict(set)
    by_path_uids: dict[str, set[int]] = defaultdict(set)
    dwell_sum: dict[str, float] = defaultdict(float)
    dwell_n: dict[str, int] = defaultdict(int)
    bounce_elig: dict[str, int] = defaultdict(int)
    bounce_hits: dict[str, int] = defaultdict(int)

    by_session: dict[str, list[_Pv]] = defaultdict(list)
    for e in events:
        by_session[e.session_id].append(e)

    for sess, evs in by_session.items():
        if len(evs) == 1:
            p = normalize_page_path(evs[0].page_path)
            bounce_elig[p] += 1
            bounce_hits[p] += 1
        for i, e in enumerate(evs):
            p = normalize_page_path(e.page_path)
            by_path_pv[p] += 1
            by_path_sessions[p].add(sess)
            if e.user_id is not None:
                by_path_uids[p].add(e.user_id)
            if i + 1 < len(evs):
                t0, t1 = e.created_at, evs[i + 1].created_at
                try:
                    from datetime import datetime as _dt

                    t0n = t0.replace("Z", "").replace(" ", "T")
                    t1n = t1.replace("Z", "").replace(" ", "T")
                    d0 = _dt.fromisoformat(t0n)
                    d1 = _dt.fromisoformat(t1n)
                    sec = max(0.0, (d1 - d0).total_seconds())
                    if sec < 60 * 60 * 6:
                        dwell_sum[p] += sec
                        dwell_n[p] += 1
                except (ValueError, TypeError):
                    pass

    tools = tool_slug_title_map(conn)
    ordered, config_labels = build_tracked_path_list(conn)
    seen_canon = set(ordered)
    extra = sorted(set(by_path_pv.keys()) - seen_canon)
    paths = ordered + extra

    if sort_by == "uv":
        paths.sort(key=lambda x: (-len(by_path_sessions.get(x, set())), x))
    elif sort_by == "uid":
        paths.sort(key=lambda x: (-len(by_path_uids.get(x, set())), x))
    else:
        paths.sort(key=lambda x: (-by_path_pv.get(x, 0), x))

    out: list[dict] = []
    for p in paths:
        avg = 0
        if dwell_n.get(p, 0) > 0:
            avg = int(dwell_sum[p] / dwell_n[p])
        br = 0.0
        if bounce_elig.get(p, 0) > 0:
            br = round(bounce_hits[p] / bounce_elig[p], 4)
        name_zh, name_en = labels_for_path(p, tools, config_labels)
        out.append(
            {
                "page_path": p,
                "page_name_zh": name_zh,
                "page_name_en": name_en,
                "page_type": infer_page_type(p),
                "pv": int(by_path_pv.get(p, 0)),
                "uv": len(by_path_sessions.get(p, set())),
                "uid": len(by_path_uids.get(p, set())),
                "avg_time_seconds": avg,
                "bounce_rate": br,
            }
        )
    return out


def tool_traffic_counts(conn: sqlite3.Connection, tool_slug: str) -> dict[str, int]:
    prefix = f"/tool/{tool_slug}"
    row = conn.execute(
        """SELECT COUNT(*) AS pv,
                  COUNT(DISTINCT session_id) AS uv,
                  COUNT(DISTINCT user_id) AS uid
           FROM page_view_log
           WHERE page_path = ? OR page_path LIKE ?""",
        (prefix, prefix + "?%"),
    ).fetchone()
    row2 = conn.execute(
        """SELECT COUNT(DISTINCT user_id) AS uid_login
           FROM page_view_log
           WHERE (page_path = ? OR page_path LIKE ?) AND user_id IS NOT NULL""",
        (prefix, prefix + "?%"),
    ).fetchone()
    return {
        "pv": int(row["pv"] or 0),
        "uv": int(row["uv"] or 0),
        "uid": int(row2["uid_login"] or 0),
    }


def _moderation_label(raw: str) -> str:
    s = (raw or "pending").strip().lower()  # 统一小写比较
    if s == "active":
        return "Active"  # 已上架
    if s == "pending":
        return "Pending Review"  # 待审核
    if s == "rejected":
        return "Rejected"  # 已拒绝
    return (raw or "pending").title()  # 未知状态原样美化


def _fmt_thousands(n: int) -> str:
    return f"{int(n):,}"  # 千分位


def _pct_badge_int(curr: int, prev: int) -> str:
    if prev <= 0:
        return "—" if curr <= 0 else "+100%"  # 无基期不展示虚增
    p = round((curr - prev) / prev * 100.0, 1)  # 环比百分比
    sign = "+" if p > 0 else ""  # 正数补加号
    return f"{sign}{p}%"


def _pct_badge_float(curr: float, prev: float) -> str:
    if prev <= 0:
        return "—" if curr <= 0 else "+100%"  # 与整型环比一致
    p = round((curr - prev) / prev * 100.0, 1)  # CTR 环比
    sign = "+" if p > 0 else ""  # 正数补加号
    return f"{sign}{p}%"


def _tool_path_sql_clause(slugs: list[str]) -> tuple[str, list[object]]:
    parts: list[str] = []  # OR 拼接
    params: list[object] = []  # 绑定值
    for s in slugs:
        p = f"/tool/{s}"  # 与前台路由一致
        parts.append("(page_path = ? OR page_path LIKE ?)")  # 含 query 的 path
        params.extend([p, p + "?%"])  # 占位符成对
    return " OR ".join(parts), params  # 供 WHERE 使用


def range_pv_uv_slugs(
    conn: sqlite3.Connection,
    slugs: list[str],
    d_start: date,
    d_end: date,
) -> tuple[int, int]:
    if not slugs:
        return (0, 0)  # 无工具则无埋点
    clause, path_params = _tool_path_sql_clause(slugs)  # 动态 WHERE
    row = conn.execute(
        f"""SELECT COUNT(*) AS pv,
                   COUNT(DISTINCT session_id) AS uv
            FROM page_view_log
            WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
              AND ({clause})""",
        (d_start.isoformat(), d_end.isoformat(), *path_params),
    ).fetchone()
    return (int(row["pv"] or 0), int(row["uv"] or 0))  # 区间内总 PV/UV


def daily_tool_traffic_series(
    conn: sqlite3.Connection,
    slugs: list[str],
    d_start: date,
    d_end: date,
) -> list[dict[str, object]]:
    if not slugs:
        return []  # 无序列可画
    clause, path_params = _tool_path_sql_clause(slugs)  # 与汇总统一种子
    rows = conn.execute(
        f"""SELECT date(created_at) AS d,
                   COUNT(*) AS pv,
                   COUNT(DISTINCT session_id) AS uv
            FROM page_view_log
            WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
              AND ({clause})
            GROUP BY date(created_at)
            ORDER BY d""",
        (d_start.isoformat(), d_end.isoformat(), *path_params),
    ).fetchall()
    by_day = {str(r["d"]): {"pv": int(r["pv"] or 0), "uv": int(r["uv"] or 0)} for r in rows}  # 按日索引
    out: list[dict[str, object]] = []  # 折线数据
    cur = d_start  # 从起点逐日填满
    while cur <= d_end:
        ds = cur.isoformat()  # 键
        rec = by_day.get(ds, {"pv": 0, "uv": 0})  # 无则零
        label = f"{cur.strftime('%b')} {cur.day}"  # 短英文月日
        out.append({"date": label, "views": rec["pv"], "clicks": rec["uv"]})  # clicks 存 UV（无外链点击埋点）
        cur += timedelta(days=1)  # 下一天
    return out


def ratings_weekly_for_developer(conn: sqlite3.Connection, user_id: int) -> list[dict[str, object]]:
    rows = conn.execute(
        """SELECT r.review_date, r.rating
           FROM review r
           JOIN tool t ON t.id = r.tool_id
           WHERE t.submitted_by_user_id = ?
             AND r.ugc_status = 'published'""",
        (user_id,),
    ).fetchall()
    buckets: dict[tuple[int, int], list[int]] = defaultdict(list)  # (年, ISO周) -> 星级列表
    for r in rows:
        raw_d = str(r["review_date"] or "").strip()  # 日期串
        try:
            d0 = datetime.fromisoformat(raw_d.replace("Z", "").split("T", 1)[0])  # 只取日期段
        except ValueError:
            continue  # 脏数据跳过
        ic = d0.isocalendar()  # ISO 周
        if isinstance(ic, tuple):
            y, w = int(ic[0]), int(ic[1])  # 3.8 元组
        else:
            y, w = int(ic.year), int(ic.week)  # 3.9+ named / IsoCalendarDate
        buckets[(y, w)].append(int(r["rating"] or 0))  # 纳入聚合
    out: list[dict[str, object]] = []  # 最多 12 周
    for (y, w) in sorted(buckets.keys())[-12:]:
        pts = buckets[(y, w)]  # 该周所有星级
        avg = sum(pts) / max(len(pts), 1)  # 均值
        out.append({"date": f"{y}-W{w:02d}", "rating": round(avg, 1), "reviews": len(pts)})  # 前台折线
    return out


def developer_dashboard_payload(conn: sqlite3.Connection, user_id: int, locale: str) -> dict[str, object]:
    rows = conn.execute(
        """SELECT t.id, t.slug, t.name, t.rating, t.review_count, t.moderation_status,
                  t.featured, c.i18n_key
           FROM tool t
           JOIN category c ON c.id = t.category_id
           WHERE t.submitted_by_user_id = ?
           ORDER BY t.id DESC""",
        (user_id,),
    ).fetchall()
    slugs: list[str] = []  # 参与埋点汇总的 slug
    slug_tr: dict[str, dict[str, int]] = {}  # slug -> traffic 缓存
    my_tools: list[dict[str, object]] = []  # 表格行
    rating_weighted = 0.0  # 加权分子
    rating_n = 0  # 加权分母（review_count 之和）
    by_cat: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {"tools": 0, "views": 0, "rating_sum": 0.0, "n": 0},
    )
    total_pv = 0  # 全工具 PV
    total_uv = 0  # 全工具 UV（摘要第二格与表格「clicks」列同源）
    for r in rows:
        slug = str(r["slug"] or "").strip()  # 空 slug 跳过
        if not slug:
            continue
        slugs.append(slug)  # 纳入时间序列
        if slug not in slug_tr:
            slug_tr[slug] = tool_traffic_counts(conn, slug)  # 只算一次
        tr = slug_tr[slug]
        pv, uv = int(tr["pv"]), int(tr["uv"])  # 详情页流量
        total_pv += pv  # 累加
        total_uv += uv  # 累加
        rc = int(r["review_count"] or 0)  # 评论条数作权重
        if rc > 0:
            rating_weighted += float(r["rating"] or 0) * rc  # 星×条
            rating_n += rc  # 条数
        cat_name = category_label(conn, locale, str(r["i18n_key"] or ""))  # 本地化分类名
        bc = by_cat[cat_name]  # 该分类桶
        bc["tools"] = int(bc["tools"]) + 1  # 工具数
        bc["views"] = int(bc["views"]) + pv  # PV 和
        bc["rating_sum"] = float(bc["rating_sum"]) + float(r["rating"] or 0)  # 评分和（简单平均用）
        bc["n"] = int(bc["n"]) + 1  # 工具数（与 tools 一致）
        feat_raw = r["featured"]  # 0/1/NULL
        feat_bool = bool(int(feat_raw)) if feat_raw is not None else False  # 精选标记
        my_tools.append(
            {
                "id": int(r["id"]),  # 表主键
                "slug": slug,  # 详情路由
                "name": str(r["name"] or ""),  # 展示名
                "category": cat_name,  # 已翻译
                "status": _moderation_label(str(r["moderation_status"] or "pending")),  # 状态文案
                "views": pv,  # 真实 PV
                "clicks": uv,  # 实为 UV（与摘要第二格一致）
                "rating": float(r["rating"] or 0),  # 库内评分
                "featured": feat_bool,  # 是否精选
            },
        )
    avg_r = (rating_weighted / rating_n) if rating_n else 0.0  # 加权平均
    ctr_now = round(100.0 * total_uv / max(total_pv, 1), 1) if total_pv else 0.0  # UV/PV 近似互动率
    summary_numbers = {
        "views": _fmt_thousands(total_pv),  # 千分位
        "clicks": _fmt_thousands(total_uv),  # 同上（真实 UV）
        "rating": f"{avg_r:.1f}" if avg_r else "—",  # 无评论则横杠
        "ctr": f"{ctr_now}%",  # 百分比字符串
    }
    end = date.today()  # 今天
    pv7, uv7 = range_pv_uv_slugs(conn, slugs, end - timedelta(days=6), end)  # 近 7 日
    pv_prev, uv_prev = range_pv_uv_slugs(conn, slugs, end - timedelta(days=13), end - timedelta(days=7))  # 再前 7 日
    ctr7 = round(100.0 * uv7 / max(pv7, 1), 1) if pv7 else 0.0  # 近 7 日 CTR 代理
    ctr_prev = round(100.0 * uv_prev / max(pv_prev, 1), 1) if pv_prev else 0.0  # 对比期
    stat_badges = [
        _pct_badge_int(pv7, pv_prev),  # PV 环比
        _pct_badge_int(uv7, uv_prev),  # UV 环比
        "—",  # 评分无统一环比口径
        _pct_badge_float(ctr7, ctr_prev),  # CTR 代理环比
    ]
    d0 = end - timedelta(days=29)  # 30 天含今天共 30 点
    page_views_data = daily_tool_traffic_series(conn, slugs, d0, end)  # 面积图
    ratings_data = ratings_weekly_for_developer(conn, user_id)  # 周均评
    category_performance: list[dict[str, object]] = []  # 柱状图
    for cat, v in sorted(by_cat.items()):
        n = int(v["n"])  # 工具数
        avg_c = float(v["rating_sum"]) / max(n, 1)  # 分类内评分均值
        eng = min(100, int(avg_c * 20))  # 0–5 星线性映射到 0–100
        category_performance.append(
            {
                "category": cat,  # 横轴
                "tools": int(v["tools"]),  # 工具数
                "views": int(v["views"]),  # PV 和
                "engagement": eng,  # 综合强度（非外链）
            },
        )
    return {
        "my_tools": my_tools,  # 覆盖静态 JSON
        "summary_numbers": summary_numbers,
        "page_views_data": page_views_data,
        "ratings_data": ratings_data,
        "category_performance": category_performance,
        "stat_badges": stat_badges,
    }
