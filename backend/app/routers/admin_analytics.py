"""管理后台 — 页面流量分析。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.analytics_service import page_analytics_rows
from app.db import get_db
from app.deps_auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/analytics/pages")
def admin_page_analytics(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    sort_by: str = Query("pv"),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    sb = sort_by if sort_by in ("pv", "uv", "uid") else "pv"
    with get_db() as conn:
        rows = page_analytics_rows(conn, start_date=start_date, end_date=end_date, sort_by=sb)
        return {"data": rows}
