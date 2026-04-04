# 登录用户查看自己的商业化订单（与 monetization_order 对齐，供前台/profile 展示）
from __future__ import annotations

from typing import Any  # 返回列表元素为 dict

from fastapi import APIRouter, Depends, HTTPException  # 404 非本人或无此单

from app.db import get_db  # 请求级连接
from app.deps_auth import get_current_user_id  # JWT → user id

router = APIRouter(tags=["user"])  # OpenAPI user 分组


@router.get("/me/orders/{order_id}")  # 单笔详情：须本人且 id 存在
def get_me_order(
    order_id: int,  # 路径订单主键
    user_id: int = Depends(get_current_user_id),  # Bearer 解析
) -> dict[str, Any]:
    with get_db() as conn:  # 短连接
        r = conn.execute(  # 与列表 SQL 同形，加 id 与 purchaser 过滤
            """SELECT o.id, o.tool_id, o.amount_cents, o.payment_status, o.valid_from, o.valid_until,
                      o.extra_pv, o.extra_uv, o.extra_uid, o.created_at, t.name AS tool_name, t.slug AS tool_slug
               FROM monetization_order o
               JOIN tool t ON t.id = o.tool_id
               WHERE o.id = ? AND o.purchaser_user_id = ?""",
            (order_id, user_id),
        ).fetchone()  # 单行或 None
        if not r:  # 越权或不存在
            raise HTTPException(status_code=404, detail="not_found")  # 不区分原因
        return {  # 与列表项字段一致，便于前台复用类型
            "id": r["id"],
            "tool_id": r["tool_id"],
            "tool_name": r["tool_name"],
            "tool_slug": r["tool_slug"],
            "amount_cents": r["amount_cents"],
            "payment_status": r["payment_status"],
            "valid_from": r["valid_from"],
            "valid_until": r["valid_until"],
            "extra_pv": r["extra_pv"],
            "extra_uv": r["extra_uv"],
            "extra_uid": r["extra_uid"],
            "created_at": r["created_at"],
        }  # 单笔对象


@router.get("/me/orders")  # 订单流水：关联工具名便于展示
def get_me_orders(
    user_id: int = Depends(get_current_user_id),  # 须登录
) -> dict[str, Any]:
    with get_db() as conn:  # 只读短连接
        rows = conn.execute(  # 按新单在前排序
            """SELECT o.id, o.tool_id, o.amount_cents, o.payment_status, o.valid_from, o.valid_until,
                      o.extra_pv, o.extra_uv, o.extra_uid, o.created_at, t.name AS tool_name, t.slug AS tool_slug
               FROM monetization_order o
               JOIN tool t ON t.id = o.tool_id
               WHERE o.purchaser_user_id = ?
               ORDER BY o.id DESC
               LIMIT 200""",
            (user_id,),
        ).fetchall()  # 可能为空
    items: list[dict[str, Any]] = []  # 扁平给前端卡片
    for r in rows:  # 逐行组装
        items.append(  # 金额以分存储，前台可自行格式化为元
            {
                "id": r["id"],
                "tool_id": r["tool_id"],
                "tool_name": r["tool_name"],
                "tool_slug": r["tool_slug"],
                "amount_cents": r["amount_cents"],
                "payment_status": r["payment_status"],
                "valid_from": r["valid_from"],
                "valid_until": r["valid_until"],
                "extra_pv": r["extra_pv"],
                "extra_uv": r["extra_uv"],
                "extra_uid": r["extra_uid"],
                "created_at": r["created_at"],
            }
        )
    return {"items": items}  # 无订单时 items 为空数组
