"""登录注册（用户数据来自数据库，签发 JWT）。"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_db
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(tags=["auth"])


class LoginBody(BaseModel):
    email: str
    password: Optional[str] = None


class SignupBody(BaseModel):
    email: str
    password: Optional[str] = None
    name: str


def _row_public(r: sqlite3.Row) -> dict:
    return {
        "id": str(r["id"]),
        "email": r["email"],
        "name": r["display_name"],
        "avatar": r["avatar_emoji"],
        "bio": r["bio"] or "",
        "role": (r["role"] if r["role"] is not None else "user"),
    }


@router.post("/auth/login")
def login(body: LoginBody) -> dict:
    """邮箱不区分大小写；封禁用户 403；密码错误与不存在统一 401 防枚举。"""
    pwd = body.password or ""
    with get_db() as conn:
        r = conn.execute(
            """SELECT id, email, display_name, avatar_emoji, bio, password_hash, role, banned
               FROM app_user WHERE email = ?""",
            (body.email.strip().lower(),),
        ).fetchone()
        if not r:
            raise HTTPException(status_code=401, detail="invalid")
        if r["banned"]:
            raise HTTPException(status_code=403, detail="banned")
        if not verify_password(pwd, r["password_hash"]):
            raise HTTPException(status_code=401, detail="invalid")
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "UPDATE app_user SET last_login_at = ? WHERE id = ?",
            (now, r["id"]),
        )
        conn.commit()
        token = create_access_token(
            user_id=str(r["id"]),
            email=r["email"],
            role=r["role"] or "user",
        )
        return {
            **_row_public(r),
            "access_token": token,
            "token_type": "bearer",
        }


@router.post("/auth/signup")
def signup(body: SignupBody) -> dict:
    """新用户默认角色 user；空密码时用占位串（需前端/production 强制密码策略时可改）。"""
    with get_db() as conn:
        ph = hash_password(body.password or "changeme")
        try:
            conn.execute(
                """INSERT INTO app_user (email, display_name, avatar_emoji, bio, password_hash, role)
                   VALUES (?, ?, '👤', '', ?, 'user')""",
                (body.email.strip().lower(), body.name.strip(), ph),
            )
            conn.commit()
        except sqlite3.IntegrityError as e:
            raise HTTPException(status_code=400, detail="email_exists") from e
        r = conn.execute(
            """SELECT id, email, display_name, avatar_emoji, bio, role
               FROM app_user WHERE email = ?""",
            (body.email.strip().lower(),),
        ).fetchone()
        if not r:
            raise HTTPException(status_code=500, detail="failed")
        token = create_access_token(
            user_id=str(r["id"]),
            email=r["email"],
            role=r["role"] or "user",
        )
        return {
            **_row_public(r),
            "access_token": token,
            "token_type": "bearer",
        }
