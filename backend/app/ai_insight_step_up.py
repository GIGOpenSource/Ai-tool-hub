# AI SEO 敏感操作二次确认：环境开关 + 共享口令或当前登录密码（v2.x）
from __future__ import annotations

import os  # 读 AI_INSIGHT_STEP_UP_*
import secrets  # 常量时间比对共享口令

from fastapi import HTTPException  # 403 统一形态
from pydantic import BaseModel, Field  # 可选请求体

from app.security import verify_password  # 登录密码 bcrypt 校验


class StepUpOptionalBody(BaseModel):
    """批准 / 应用 / 回滚时可选携带的二次确认字段。"""

    step_up_password: str | None = Field(None, description="与 AI_INSIGHT_STEP_UP_SHARED_SECRET 一致")  # 共享口令
    current_password: str | None = Field(None, description="当前管理员登录密码明文")  # 登录密码复核


def step_up_effective_mode() -> str:
    """返回 none | shared_secret | login_password（由 AI_INSIGHT_STEP_UP_MODE 决定）。"""
    raw = (os.environ.get("AI_INSIGHT_STEP_UP_MODE") or "").strip().lower()  # 环境原值
    if raw in ("shared_secret", "shared"):  # 共享密钥模式
        return "shared_secret"  # 须配 AI_INSIGHT_STEP_UP_SHARED_SECRET
    if raw in ("login_password", "login"):  # 登录密码模式
        return "login_password"  # 验 app_user.password_hash
    return "none"  # 默认关闭


def step_up_config_public() -> dict:
    """供 GET 返回给前端：是否需填字段（不泄露密钥）。"""
    mode = step_up_effective_mode()  # 当前模式
    need_shared = mode == "shared_secret" and bool((os.environ.get("AI_INSIGHT_STEP_UP_SHARED_SECRET") or "").strip())  # 共享口令已配置
    need_login = mode == "login_password"  # 登录密码模式
    if mode == "shared_secret" and not need_shared:  # 配了模式未配密钥 → 视为未启用，避免误锁死
        return {"mode": "none", "need_step_up_password": False, "need_current_password": False}  # 降级
    return {
        "mode": mode,  # none / shared_secret / login_password
        "need_step_up_password": need_shared,  # 前端展示共享口令框
        "need_current_password": need_login,  # 前端展示当前密码框
    }


def enforce_step_up(conn: object, admin_user_id: int, body: StepUpOptionalBody | None) -> None:  # noqa: ANN401
    """若启用二次确认则校验 body；失败抛 HTTP 403。"""
    mode = step_up_effective_mode()  # 模式
    b = body or StepUpOptionalBody()  # 空体当无字段
    if mode == "none":  # 未启用
        return  # 直接通过
    if mode == "shared_secret":  # 共享口令
        secret = (os.environ.get("AI_INSIGHT_STEP_UP_SHARED_SECRET") or "").strip()  # 运维配置
        if not secret:  # 未配置则等同关闭
            return  # 不拦截
        got = (b.step_up_password or "").strip()  # 请求携带
        if not secrets.compare_digest(got, secret):  # 防时序
            raise HTTPException(status_code=403, detail="step_up_invalid_or_missing")  # 拒绝
        return  # 通过
    if mode == "login_password":  # 登录密码
        row = conn.execute(  # 取哈希
            "SELECT password_hash FROM app_user WHERE id = ?",  # 主键
            (admin_user_id,),  # 绑定
        ).fetchone()  # 单行
        ph = str(row["password_hash"] or "") if row else ""  # 哈希串
        plain = b.current_password or ""  # 明文
        if not verify_password(plain, ph):  # bcrypt 验
            raise HTTPException(status_code=403, detail="step_up_login_password_invalid")  # 拒绝
        return  # 通过
    return  # 兜底
