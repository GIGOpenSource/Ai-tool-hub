"""认证依赖：解析 Bearer Token，区分「必须管理员」与「可选登录用户」。"""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.security import decode_token

# auto_error=False：无头时可走可选用户分支，不直接 401
_bearer = HTTPBearer(auto_error=False)


def get_current_admin(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """JWT payload 必须存在且 role=admin，供 /api/admin/* 使用。"""
    if not creds:
        raise HTTPException(status_code=401, detail="unauthorized")
    try:
        payload = decode_token(creds.credentials)
    except Exception as e:
        raise HTTPException(status_code=401, detail="invalid_token") from e
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="admin_only")
    return payload


def get_optional_user_id(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[int]:
    """有合法 JWT 时返回用户数字 id；匿名返回 None（埋点、可选提交）。"""
    if not creds:
        return None
    try:
        payload = decode_token(creds.credentials)
    except Exception:
        return None
    sub = payload.get("sub")
    if sub is None:
        return None
    try:
        return int(sub)
    except (TypeError, ValueError):
        return None


def get_current_user_id(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> int:
    """必须登录的用户 id；供 /api/me/* 使用。"""
    uid = get_optional_user_id(creds)
    if uid is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    return uid
