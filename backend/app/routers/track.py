"""前台 PV/UV/UID 埋点。"""
from __future__ import annotations

import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel

from app.db import get_db
from app.deps_auth import get_optional_user_id

router = APIRouter(tags=["track"])


def _previous_path_match_candidates(previous_path: str) -> list[str]:
    """与 INSERT 里 page_path 对齐：前台上报的上一页含 query，故不能用去 query 键单查。"""
    prev = previous_path.strip()  # 去掉首尾空白，避免匹配失败
    if not prev:  # 空串不生成候选
        return []
    base = prev.split("?", 1)[0]  # 无 query 的 pathname，兼容旧数据或异常客户端
    if base == prev:  # 上一页本身没有 search
        return [prev]  # 只查完整串即可
    return [prev, base]  # 先完整再降级，避免漏更新 dwell_seconds


class TrackBody(BaseModel):
    page_path: str
    previous_path: Optional[str] = None
    dwell_seconds: Optional[float] = None


@router.post("/track")
def track_page_view(
    body: TrackBody,
    request: Request,
    response: Response,
    user_id: Optional[int] = Depends(get_optional_user_id),
) -> dict[str, Any]:
    """无 Cookie 则下发 track_sid；带上一页与停留时间时更新最近一条同会话 PV 的 dwell_seconds。"""
    sid = request.cookies.get("track_sid")
    if not sid:
        sid = str(uuid.uuid4())
        response.set_cookie(
            key="track_sid",
            value=sid,
            httponly=True,
            samesite="lax",
            max_age=60 * 60 * 24 * 365,
        )

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")

    if body.previous_path and body.dwell_seconds is not None and body.dwell_seconds >= 0:
        with get_db() as conn:
            last = None  # 待匹配到的最近一条同会话 PV
            for key in _previous_path_match_candidates(body.previous_path):  # 按候选键依次查库
                last = conn.execute(
                    """SELECT id FROM page_view_log
                       WHERE session_id = ? AND page_path = ?
                       ORDER BY id DESC LIMIT 1""",
                    (sid, key),
                ).fetchone()  # 取该键下最新一条
                if last:  # 命中则停止尝试其它候选
                    break  # 结束 for
            if last:
                conn.execute(
                    "UPDATE page_view_log SET dwell_seconds = ? WHERE id = ?",
                    (body.dwell_seconds, last["id"]),
                )
                conn.commit()

    path = body.page_path[:2048] if body.page_path else "/"
    uid = user_id
    with get_db() as conn:
        conn.execute(
            """INSERT INTO page_view_log
               (page_path, session_id, user_id, ip_address, user_agent)
               VALUES (?, ?, ?, ?, ?)""",
            (path, sid, uid, ip, ua),
        )
        conn.commit()

    return {"ok": True, "session_id": sid}
