"""JWT 签发与校验、密码 bcrypt 哈希。生产务必设置环境变量 JWT_SECRET。"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import jwt
from passlib.hash import bcrypt

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-jwt-secret-change-me")
JWT_ALGO = "HS256"
JWT_DAYS = 7


def hash_password(plain: str) -> str:
    """注册或重置密码时写入 app_user.password_hash。"""
    return bcrypt.hash(plain)


def verify_password(plain: str, password_hash: str | None) -> bool:
    """登录校验；hash 为空视为不可登录。"""
    if not password_hash:
        return False
    return bcrypt.verify(plain, password_hash)


def create_access_token(*, user_id: str, email: str, role: str) -> str:
    """
    生成 JWT：sub 为用户 id 字符串，与 get_optional_user_id 中 int(sub) 对应。
    role 用于管理员路由鉴权。
    """
    exp = datetime.now(timezone.utc) + timedelta(days=JWT_DAYS)
    payload = {"sub": user_id, "email": email, "role": role, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    """校验签名与过期时间；异常由调用方捕获。"""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
