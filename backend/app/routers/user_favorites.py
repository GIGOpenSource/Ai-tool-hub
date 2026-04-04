# 登录用户收藏：读写到 user_favorite；列表形态与 GET /api/site/favorites 对齐
from __future__ import annotations

import json  # 解析 site_json 中 favorites 块的标题等元数据
import sqlite3  # Row 类型与连接注解
from typing import Any  # 动态 JSON 形态返回

from fastapi import APIRouter, Depends, HTTPException, Query  # 路由、401、slug 查询
from pydantic import BaseModel, Field  # POST 入参

from app.db import get_db  # 请求级连接
from app.deps_auth import get_current_user_id  # JWT → user id
from app.i18n_util import category_label  # 分类展示名随 locale

router = APIRouter(tags=["user"])  # OpenAPI 分组与 user_profile 一致


def _favorites_site_meta(conn: sqlite3.Connection) -> tuple[str, list[str]]:  # 从站点块取标题与演示用分类
    row = conn.execute(  # 读运营配置的 favorites JSON
        "SELECT payload_json FROM site_json WHERE content_key = 'favorites' LIMIT 1",
    ).fetchone()  # 无则 None
    breadcrumb_label = "My Favorites"  # 无配置时的英文默认标题（前台 i18n 仍可覆盖展示）
    seed_filter_categories = ["all"]  # 与种子 filter_categories 对齐的回落
    if row:  # 有站点块再解析
        try:
            payload = json.loads(row[0] or "{}")  # UTF-8 JSON
        except (json.JSONDecodeError, TypeError):  # 脏数据跳过
            payload = {}  # 当作空对象
        if isinstance(payload, dict):  # 站点块须为对象
            bl = payload.get("breadcrumb_label")  # 面包屑/页标题
            if bl:
                breadcrumb_label = str(bl)  # 强制转 str
            fc = payload.get("filter_categories")  # 演示 Tab 列表
            if isinstance(fc, list) and fc:  # 非空数组才采用
                seed_filter_categories = [str(x) for x in fc if x is not None]  # 逐项转 str
    return breadcrumb_label, seed_filter_categories  # 供列表页元数据


class FavoritePostBody(BaseModel):
    slug: str = Field(..., min_length=1, max_length=200)  # 与 tool.slug 对齐


@router.get("/me/favorites/check")  # 详情页心形是否点亮
def get_me_favorite_check(
    slug: str = Query(..., min_length=1),  # 工具 slug
    user_id: int = Depends(get_current_user_id),  # 须登录
) -> dict[str, bool]:
    with get_db() as conn:  # 短连接
        r = conn.execute(  # 存在即已收藏
            "SELECT 1 FROM user_favorite WHERE user_id = ? AND tool_slug = ? LIMIT 1",
            (user_id, slug),  # 绑定
        ).fetchone()  # 有行则已收藏
    return {"favorited": bool(r)}  # 布尔给前端


@router.get("/me/favorites")  # 收藏列表（仅上架工具参与 JOIN）
def get_me_favorites(
    locale: str = "en",  # 与列表/详情 locale 一致
    user_id: int = Depends(get_current_user_id),  # JWT
) -> dict[str, Any]:
    with get_db() as conn:  # 单次请求
        breadcrumb_label, _seed_cats = _favorites_site_meta(conn)  # 标题与种子分类（空列表时不用 seed）
        rows = conn.execute(  # 按收藏时间倒序；仅 active 工具
            """SELECT uf.tool_slug, uf.created_at, t.name, t.description, t.icon_emoji, t.rating,
                      t.pricing_type, c.i18n_key
               FROM user_favorite uf
               JOIN tool t ON t.slug = uf.tool_slug AND t.moderation_status = 'active'
               JOIN category c ON t.category_id = c.id
               WHERE uf.user_id = ?
               ORDER BY uf.created_at DESC""",
            (user_id,),  # 绑定当前用户
        ).fetchall()  # 可能为空
        items: list[dict[str, Any]] = []  # 与 site favorites items 同形
        cat_set: set[str] = set()  # 去重分类名
        for r in rows:  # 组每一行
            cat = category_label(conn, locale, r["i18n_key"])  # translation 解析分类名
            cat_set.add(cat)  # 纳入筛选 Tab
            items.append(  # FavItem 形态
                {
                    "id": r["tool_slug"],  # 路由 /tool/:id 用 slug
                    "name": r["name"],  # 工具名
                    "description": r["description"] or "",  # 简介
                    "icon": r["icon_emoji"] or "",  # emoji 图标
                    "rating": float(r["rating"] or 0),  # 评分
                    "pricing": r["pricing_type"] or "",  # 定价类型文案
                    "category": cat,  # 本地化分类名
                    "saved_date": (r["created_at"] or "")[:10],  # 年月日简化展示
                }
            )
        filter_categories = ["all"] + sorted(cat_set)  # 「全部」+ 字典序分类
        return {  # 与 FavoritesPage FavPayload 一致
            "breadcrumb_label": breadcrumb_label,  # 来自站点或默认
            "items": items,  # 可能空数组
            "filter_categories": filter_categories,  # 无收藏时仅 ["all"]
        }


@router.post("/me/favorites")  # 添加收藏（幂等）
def post_me_favorite(
    body: FavoritePostBody,
    user_id: int = Depends(get_current_user_id),
) -> dict[str, object]:
    slug = body.slug.strip()  # 去空白
    if not slug:  # 全空拒绝
        raise HTTPException(status_code=400, detail="empty_slug")  # 与 ORM 无关的轻校验
    with get_db() as conn:  # 写库
        t = conn.execute(  # 必须存在且已上架
            "SELECT slug FROM tool WHERE slug = ? AND moderation_status = 'active'",
            (slug,),  # 绑定
        ).fetchone()  # 未找到则 None
        if not t:  # 无效或下架
            raise HTTPException(status_code=404, detail="tool_not_found")  # 前端可 toast
        conn.execute(  # UNIQUE 冲突则忽略（幂等）
            "INSERT OR IGNORE INTO user_favorite (user_id, tool_slug) VALUES (?, ?)",
            (user_id, slug),  # 两行值
        )
        conn.commit()  # 持久化
    return {"success": True, "slug": slug}  # 与提交类接口一致


@router.delete("/me/favorites/{slug}")  # 取消收藏
def delete_me_favorite(
    slug: str,
    user_id: int = Depends(get_current_user_id),
) -> dict[str, bool]:
    with get_db() as conn:  # 写库
        conn.execute(  # 按用户隔离删除
            "DELETE FROM user_favorite WHERE user_id = ? AND tool_slug = ?",
            (user_id, slug),  # 绑定
        )
        conn.commit()  # 落盘
    return {"success": True}  # 无行亦可 success（对接方幂等）
