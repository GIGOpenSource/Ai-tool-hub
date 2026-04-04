"""管理后台 — 评论管理。"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db import get_db
from app.deps_auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])


class ReviewStatusBody(BaseModel):
    ugc_status: str


@router.get("/reviews")
def admin_reviews(_admin: dict = Depends(get_current_admin)) -> dict:
    with get_db() as conn:
        rows = conn.execute(
            """SELECT r.id, r.tool_id, r.user_name, r.rating, r.comment,
                      r.ugc_status, r.report_count, r.reviewer_user_id,
                      t.name AS tool_name, t.slug AS tool_slug
               FROM review r JOIN tool t ON t.id = r.tool_id
               ORDER BY r.id DESC"""
        ).fetchall()
        data = [
            {
                "id": r["id"],
                "tool_id": r["tool_id"],
                "tool_name": r["tool_name"],
                "tool_slug": r["tool_slug"],
                "reviewer_user_id": r["reviewer_user_id"],
                "reviewer_label": r["user_name"],
                "rating": r["rating"],
                "content_preview": (r["comment"] or "")[:200],
                "content_full": r["comment"],
                "status": r["ugc_status"],
                "report_count": r["report_count"],
            }
            for r in rows
        ]
        return {"data": data}


@router.patch("/reviews/{review_id}/status")
def admin_review_status(
    review_id: int,
    body: ReviewStatusBody,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    if body.ugc_status not in ("published", "reported", "hidden"):
        raise HTTPException(status_code=400, detail="invalid_status")
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE review SET ugc_status = ? WHERE id = ?",
            (body.ugc_status, review_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="not_found")
        conn.commit()
    return {"success": True}


@router.delete("/reviews/{review_id}")
def admin_review_delete(
    review_id: int,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    with get_db() as conn:
        cur = conn.execute("DELETE FROM review WHERE id = ?", (review_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="not_found")
        conn.commit()
    return {"success": True}
