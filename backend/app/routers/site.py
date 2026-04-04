"""站点块内容（指南、站点地图等）。"""
from __future__ import annotations

import json
from typing import Optional  # 可选登录用户 id

from fastapi import APIRouter, Depends, HTTPException  # Depends 注入 JWT

from app.analytics_service import developer_dashboard_payload  # 登录态合并真实埋点
from app.db import get_db
from app.deps_auth import get_optional_user_id  # Bearer 可选解析

router = APIRouter(tags=["site"])

_ADMIN_SETTINGS_KEY = "admin_settings"  # 与 admin_settings 路由写入的键一致


@router.get("/site/frontend_nav")  # 须先于 /site/{key} 注册，否则 key 会吞掉字面路径 frontend_nav
def get_frontend_nav() -> list[dict]:
    """从 site_json.admin_settings 读取 frontend_menu_items；仅返回可见且 path 以 / 开头的项，供主导航渲染。"""
    with get_db() as conn:  # 短连接读库
        row = conn.execute(  # 取整块后台设置
            "SELECT payload_json FROM site_json WHERE content_key = ?",
            (_ADMIN_SETTINGS_KEY,),
        ).fetchone()  # 单行或 None
        if not row:  # 无 admin_settings 时给空列表（前台用默认导航）
            return []  # 与文档「空数组时前台用默认」一致
        try:  # 解析 JSON
            data = json.loads(row[0] or "{}")  # 容错空串
        except (json.JSONDecodeError, TypeError):  # 坏数据不抛 500
            return []  # 降级为空导航
        raw = data.get("frontend_menu_items")  # 菜单数组
        if not isinstance(raw, list):  # 类型不对则无视
            return []  # 同上
        out: list[dict] = []  # 输出列表
        for it in raw:  # 逐项过滤
            if not isinstance(it, dict):  # 跳过非对象
                continue  # 下一项
            if not it.get("visible", True):  # 运营隐藏项
                continue  # 不展示
            path = str(it.get("path") or "").strip()  # 前台路径
            if not path.startswith("/"):  # 只接受站内路径
                continue  # 跳过外链或非法
            out.append(  # 规范化字段
                {
                    "key": str(it.get("key") or ""),  # 稳定键
                    "label": str(it.get("label") or ""),  # 展示文案
                    "path": path,  # 已校验以 / 开头
                    "order": int(it.get("order") or 0),  # 排序权重
                }
            )  # 结束 append
        out.sort(key=lambda x: x["order"])  # 按 order 升序
        return out  # 返回主导航项


@router.get("/site/{key}")  # 通配块：须在具体 /site/… 字面路径之后，避免误捕
def get_site_block(key: str) -> dict | list:
    """通用 JSON 块：home_seo、profile、favorites 等，由运营在库中维护。"""
    with get_db() as conn:  # 短连接
        row = conn.execute(  # 按 content_key 取 payload
            "SELECT payload_json FROM site_json WHERE content_key = ?",
            (key,),
        ).fetchone()  # 单行或 None
        if not row:  # 无此块
            raise HTTPException(status_code=404, detail="not_found")  # 与前台 404 页文案接口一致
        return json.loads(row[0])  # 解析为 JSON 对象或数组


@router.get("/dashboard-data")
def dashboard_data(
    locale: str = "en",
    user_id: Optional[int] = Depends(get_optional_user_id),
) -> dict:
    with get_db() as conn:
        row = conn.execute(
            "SELECT payload_json FROM site_json WHERE content_key = ?",
            ("dashboard",),
        ).fetchone()
        base: dict = json.loads(row[0]) if row else {}  # 运营静态壳（图表兜底、ui 文案）
        if user_id is not None:
            overlay = developer_dashboard_payload(conn, user_id, locale)  # 我的工具 + page_view_log
            for k, v in overlay.items():
                base[k] = v  # 浅覆盖：my_tools、summary、序列图
        return base
