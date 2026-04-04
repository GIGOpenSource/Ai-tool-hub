# 登录用户资料：GET 拉齐 JWT 与库内展示字段；PUT 更新昵称/头像 emoji/简介
from __future__ import annotations

import sqlite3  # Row 按列名索引

from fastapi import APIRouter, Depends, HTTPException  # 路由与 401/404
from pydantic import BaseModel, Field  # 入参校验

from app.db import get_db  # 短连接上下文
from app.deps_auth import get_current_user_id  # JWT → 数字 user id

router = APIRouter(tags=["user"])  # OpenAPI 分组


def _user_public_row(r: sqlite3.Row) -> dict:
    return {  # 与 auth 登录响应字段对齐，便于前台复用 normalizeUser
        "id": str(r["id"]),  # 字符串 id
        "email": r["email"],  # 登录邮箱
        "name": r["display_name"],  # 展示昵称
        "avatar": r["avatar_emoji"],  # 头像 emoji 或短文本
        "bio": r["bio"] or "",  # 简介空则 ""
        "role": (r["role"] if r["role"] is not None else "user"),  # migrate 后必有列
    }


class ProfilePutBody(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=200)  # 必填昵称
    avatar_emoji: str = Field(default="👤", max_length=32)  # 默认占位 emoji
    bio: str = Field(default="", max_length=5000)  # 可空简介


@router.get("/me")
def get_me(user_id: int = Depends(get_current_user_id)) -> dict:
    with get_db() as conn:  # 单次请求连接
        r = conn.execute(  # 按 id 取一行
            """SELECT id, email, display_name, avatar_emoji, bio, role
               FROM app_user WHERE id = ?""",
            (user_id,),  # 绑定防注入
        ).fetchone()  # 无则 None
        if not r:  # 用户被删或异常
            raise HTTPException(status_code=404, detail="not_found")
        return _user_public_row(r)  # JSON 响应


@router.put("/me/profile")
def put_me_profile(
    body: ProfilePutBody,
    user_id: int = Depends(get_current_user_id),
) -> dict:
    with get_db() as conn:
        conn.execute(  # 仅允许改展示三字段
            """UPDATE app_user SET display_name = ?, avatar_emoji = ?, bio = ?
               WHERE id = ?""",
            (
                body.display_name.strip(),  # 去空白
                body.avatar_emoji.strip() or "👤",  # 全空则回落默认
                body.bio.strip(),  # 简介 trim
                user_id,  # WHERE
            ),
        )
        conn.commit()  # 持久化
        r = conn.execute(  # 回读最新行
            """SELECT id, email, display_name, avatar_emoji, bio, role
               FROM app_user WHERE id = ?""",
            (user_id,),
        ).fetchone()
        if not r:  # 理论上不应发生
            raise HTTPException(status_code=404, detail="not_found")
        return _user_public_row(r)  # 与 GET /me 同形
