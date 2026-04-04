"""管理后台 — 用户管理。"""
from __future__ import annotations

import os  # 读取 SMTP_* 环境变量
import smtplib  # 可选真实发信
from email.message import EmailMessage  # 构造 MIME 文本邮件

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db import get_db
from app.deps_auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])


class UserRoleBody(BaseModel):
    role: str


class BanBody(BaseModel):
    banned: bool


@router.get("/users")
def admin_users(_admin: dict = Depends(get_current_admin)) -> dict:
    with get_db() as conn:
        rows = conn.execute(
            """SELECT u.id, u.email, u.display_name, u.avatar_emoji, u.role,
                      u.last_login_at, u.banned,
                      (SELECT COUNT(*) FROM tool t WHERE t.submitted_by_user_id = u.id) AS submit_cnt,
                      (SELECT COUNT(*) FROM review r WHERE r.reviewer_user_id = u.id) AS review_cnt
               FROM app_user u
               ORDER BY u.id"""
        ).fetchall()
        data = [
            {
                "id": r["id"],
                "email": r["email"],
                "name": r["display_name"],
                "avatar": r["avatar_emoji"],
                "role": r["role"] or "user",
                "last_login_at": r["last_login_at"],
                "banned": bool(r["banned"]),
                "submitted_tools_count": r["submit_cnt"],
                "reviews_count": r["review_cnt"],
            }
            for r in rows
        ]
        return {"data": data}


@router.patch("/users/{user_id}/role")
def admin_user_role(
    user_id: int,
    body: UserRoleBody,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    if body.role not in ("user", "developer", "admin"):
        raise HTTPException(status_code=400, detail="invalid_role")
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE app_user SET role = ? WHERE id = ?",
            (body.role, user_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="not_found")
        conn.commit()
    return {"success": True}


@router.patch("/users/{user_id}/ban")
def admin_user_ban(
    user_id: int,
    body: BanBody,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE app_user SET banned = ? WHERE id = ?",
            (1 if body.banned else 0, user_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="not_found")
        conn.commit()
    return {"success": True}


@router.post("/users/{user_id}/send-email")
def admin_send_email(
    user_id: int,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    with get_db() as conn:
        r = conn.execute(  # 取邮箱与昵称用于收件人与正文
            "SELECT id, email, display_name FROM app_user WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="not_found")
        email_to = str(r["email"] or "")  # 收件地址
        display_name = str(r["display_name"] or "")  # 称呼

    host = os.environ.get("SMTP_HOST", "").strip()  # 未设则走 stub
    from_addr = os.environ.get("SMTP_FROM", "").strip()  # 与 SPF 对齐的发件人
    if not host or not from_addr:  # 缺任一即不尝试连接 SMTP
        return {
            "success": True,
            "stub": True,
            "message": "ADM-01: 未配置 SMTP_HOST/SMTP_FROM，未真实发信；生产请设环境变量或接云邮件。",
        }

    port_s = os.environ.get("SMTP_PORT", "587").strip() or "587"  # 默认提交端口
    try:
        port = int(port_s)  # 解析整数端口
    except ValueError:
        port = 587  # 解析失败回落 587
    smtp_user = os.environ.get("SMTP_USER", "").strip()  # 部分中继要求 AUTH
    smtp_pass = os.environ.get("SMTP_PASSWORD", "").strip()  # 密码或应用专用口令
    tls_raw = os.environ.get("SMTP_USE_TLS", "1").strip().lower()  # 默认 STARTTLS
    use_tls = tls_raw not in ("0", "false", "no", "off")  # 显式关闭则直连

    msg = EmailMessage()  # 标准库 MIME
    msg["Subject"] = "AI Tools Hub 通知"  # 固定主题（可后续改为模板）
    msg["From"] = from_addr  # 发件人头
    msg["To"] = email_to  # 收件人头
    msg.set_content(  # 纯文本正文
        f"您好 {display_name or '用户'}，\n\n这是一条由管理后台「发送邮件」触发的通知。\n",  # 中文简短说明
    )

    try:
        with smtplib.SMTP(host, port, timeout=30) as smtp:  # 连接超时避免挂死
            if use_tls:  # 多数云 SMTP 需要 STARTTLS
                smtp.starttls()  # 升级到 TLS
            if smtp_user:  # 无用户名则跳过登录（内网中继场景）
                smtp.login(smtp_user, smtp_pass)  # AUTH LOGIN
            smtp.send_message(msg)  # 发送 MIME
    except OSError as e:  # 连接/握手/认证失败
        raise HTTPException(status_code=502, detail=f"smtp_failed:{e!s}") from e  # 网关错便于排障

    return {"success": True, "stub": False, "sent_to": email_to}  # 真实发送标记
