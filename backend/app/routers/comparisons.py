"""SEO 对比页数据。"""
from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from app.db import get_db
from app.promotion_util import tool_has_active_promotion, tool_id_by_display_name  # 对比块补推广标

router = APIRouter(tags=["comparisons"])


@router.get("/comparisons/{slug}")
def get_comparison(slug: str) -> dict:
    """SEO 对比落地页整页 JSON（comparison_page 表）。"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT payload_json FROM comparison_page WHERE slug = ?", (slug,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="not_found")
        data = json.loads(row[0])  # 整页 JSON
        main = data.get("mainTool")  # 主工具块
        if isinstance(main, dict):  # 结构正常才写标
            mid = tool_id_by_display_name(conn, str(main.get("name") or ""))  # 按名解析 slug 库 id
            main["promotion_active"] = tool_has_active_promotion(conn, mid)  # 与详情同源规则
        for alt in data.get("alternatives") or []:  # 各替代列
            if not isinstance(alt, dict):  # 跳过非对象
                continue  # 下一项
            aid = tool_id_by_display_name(conn, str(alt.get("name") or ""))  # 名→id
            alt["promotion_active"] = tool_has_active_promotion(conn, aid)  # 布尔
        return data  # 带 promotion_active 供前台 Badge
