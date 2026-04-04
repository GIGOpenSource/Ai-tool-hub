# 前台用户设置：读取/保存当前登录用户的 settings_json
from __future__ import annotations

import json
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, field_validator

from app.db import get_db
from app.deps_auth import get_current_user_id

router = APIRouter(tags=["user"])


class UserSettingsPayloadSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")  # 与前台 SettingsPage 键一致；忽略未知键

    emailNotifications: bool = True  # 邮件通知
    pushNotifications: bool = False  # 推送通知
    weeklyDigest: bool = True  # 周报
    newToolAlerts: bool = True  # 新工具提醒
    darkMode: bool = True  # 暗色（本站默认可不生效，仅占位）
    compactView: bool = False  # 紧凑布局
    autoplayVideos: bool = False  # 视频自动播放
    showTrending: bool = True  # 展示趋势
    profileSearchable: bool = True  # 主页可被搜索
    shareUsageData: bool = False  # 分享用量统计
    loginAlerts: bool = True  # 登录提醒
    twoFactorRequired: bool = False  # 双因素（占位）
    displayLanguage: Literal["en", "zh"] = "en"  # 仅允许前台已接入语言码

    @field_validator("displayLanguage", mode="before")
    @classmethod
    def coerce_display_language(cls, v: object) -> str:
        if v == "zh" or v == "en":
            return str(v)  # 合法码原样
        return "en"  # 历史脏值或未接入语言一律回落 English，避免 422


class UserSettingsBody(BaseModel):
    payload: UserSettingsPayloadSchema  # PUT 体：嵌套校验，非法字段 422


@router.get("/me/settings")
def get_my_settings(user_id: int = Depends(get_current_user_id)) -> dict:
    with get_db() as conn:
        row = conn.execute(
            "SELECT settings_json FROM app_user WHERE id = ?",
            (user_id,),
        ).fetchone()
        raw = row["settings_json"] if row else "{}"  # 无行当空对象
        try:
            payload = json.loads(raw or "{}")
        except (json.JSONDecodeError, TypeError):
            payload = {}
        return {"payload": payload}


@router.put("/me/settings")
def put_my_settings(
    body: UserSettingsBody,
    user_id: int = Depends(get_current_user_id),
) -> dict:
    payload_dump = body.payload.model_dump()  # 已校验的扁平 dict
    with get_db() as conn:
        conn.execute(
            "UPDATE app_user SET settings_json = ? WHERE id = ?",
            (json.dumps(payload_dump, ensure_ascii=False), user_id),
        )
        conn.commit()
    return {"success": True}
