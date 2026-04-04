"""管理后台 — 数据大盘。"""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query

from app.analytics_service import dashboard_summary, trend_series, trend_series_between
from app.db import get_db
from app.deps_auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])

_TREND_MAX_SPAN_DAYS = 366


@router.get("/dashboard/summary")
def admin_dashboard_summary(_admin: dict = Depends(get_current_admin)) -> dict:
    with get_db() as conn:
        return dashboard_summary(conn)


@router.get("/dashboard/trend")
def admin_trend(
    days: int | None = Query(None, description="7|30|90，与 start_date+end_date 二选一"),
    start_date: str | None = Query(None, description="YYYY-MM-DD"),
    end_date: str | None = Query(None, description="YYYY-MM-DD"),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    with get_db() as conn:  # 管理端趋势：优先自定义区间，否则按 days 滑窗至今日
        if start_date and end_date:  # 双参齐全走区间聚合
            try:
                ds0 = date.fromisoformat(start_date[:10])  # 起日
                de0 = date.fromisoformat(end_date[:10])  # 止日
            except ValueError:  # 解析失败退回快捷天数
                d_fallback = days if days in (7, 30, 90) else 30  # 默认 30
                return {"data": trend_series(conn, days=d_fallback)}  # 兼容旧调用
            if de0 < ds0:  # 反选则交换
                ds0, de0 = de0, ds0  # 保证 start<=end
            if (de0 - ds0).days + 1 > _TREND_MAX_SPAN_DAYS:  # 单次查询上限
                de0 = ds0 + timedelta(days=_TREND_MAX_SPAN_DAYS - 1)  # 截断区间
            return {"data": trend_series_between(conn, ds0, de0)}  # 逐日序列
        d_ok = days if days in (7, 30, 90) else 30  # 无区间时用 7/30/90
        return {"data": trend_series(conn, days=d_ok)}  # 至今日为止
