"""管理后台 — 系统设置（存 site_json）。"""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.db import get_db
from app.deps_auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])
_SETTINGS_KEY = "admin_settings"


class SettingsBody(BaseModel):
    payload: dict


@router.get("/settings")
def admin_get_settings(_admin: dict = Depends(get_current_admin)) -> dict:
    with get_db() as conn:
        r = conn.execute(
            "SELECT payload_json FROM site_json WHERE content_key = ?",
            (_SETTINGS_KEY,),
        ).fetchone()
        if not r:
            return {"payload": {}}
        return {"payload": json.loads(r[0] or "{}")}


@router.put("/settings")
def admin_put_settings(
    body: SettingsBody,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    raw = json.dumps(body.payload, ensure_ascii=False)
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO site_json (content_key, payload_json) VALUES (?, ?)",
            (_SETTINGS_KEY, raw),
        )
        conn.commit()
    return {"success": True}
