"""管理后台 — 付费推广订单：列表筛选、汇总、人工改支付状态/展期。"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.db import get_db
from app.deps_auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])

_PAYMENT_STATUSES = frozenset({"pending", "paid", "refunded", "cancelled"})  # 与库内 payment_status 白名单一致


class MonetOrderPatchBody(BaseModel):
    payment_status: str | None = Field(None, description="pending|paid|refunded|cancelled")
    valid_until: str | None = Field(None, description="展期止日 YYYY-MM-DD")


@router.get("/monetization/summary")
def admin_monetization_summary(_admin: dict = Depends(get_current_admin)) -> dict:
    with get_db() as conn:  # 短连接读汇总
        total_row = conn.execute("SELECT COUNT(*) AS c FROM monetization_order").fetchone()  # 全表单数
        total_orders = int(total_row["c"] or 0) if total_row else 0  # 订单总数
        st_rows = conn.execute(  # 按支付状态分组计数
            "SELECT payment_status, COUNT(*) AS c FROM monetization_order GROUP BY payment_status"
        ).fetchall()
        by_status = {str(r["payment_status"]): int(r["c"] or 0) for r in st_rows}  # 状态→数量
        rev_row = conn.execute(  # 已支付金额（分）求和
            """SELECT COALESCE(SUM(amount_cents), 0) AS s FROM monetization_order
               WHERE payment_status = 'paid'"""
        ).fetchone()
        revenue_cents = int(rev_row["s"] or 0) if rev_row else 0  # 实收分
        today = date.today().isoformat()  # 今日日期串
        act_row = conn.execute(  # 当前仍在推广窗口内且已支付的订单数
            """SELECT COUNT(*) AS c FROM monetization_order
               WHERE payment_status = 'paid'
                 AND date(?) >= date(valid_from) AND date(?) <= date(valid_until)""",
            (today, today),
        ).fetchone()
        active = int(act_row["c"] or 0) if act_row else 0  # 生效中推广单数
        return {
            "total_orders": total_orders,  # 全量
            "by_status": by_status,  # 分状态
            "revenue_paid_usd": round(revenue_cents / 100.0, 2),  # 已支付美元
            "active_promotions": active,  # 今日在有效期内的 paid 单
        }


@router.get("/monetization/orders")
def admin_orders(
    status: str | None = Query(None, description="按支付状态过滤；空或 all 为全部"),
    _admin: dict = Depends(get_current_admin),
) -> dict:
    where_extra = ""  # 动态 WHERE 片段
    params: list[object] = []  # 查询参数
    if status and status != "all":  # 指定了非 all 的筛选
        if status not in _PAYMENT_STATUSES:  # 非法状态退回全表
            status = None  # 忽略错误参数
        else:
            where_extra = " AND o.payment_status = ?"  # 等值过滤
            params.append(status)  # 绑定状态值
    sql = f"""SELECT o.id, o.tool_id, o.purchaser_user_id, o.amount_cents,
                     o.payment_status, o.valid_from, o.valid_until,
                     o.extra_pv, o.extra_uv, o.extra_uid, o.created_at,
                     t.name AS tool_name, t.slug AS tool_slug,
                     u.email AS purchaser_email
              FROM monetization_order o
              JOIN tool t ON t.id = o.tool_id
              JOIN app_user u ON u.id = o.purchaser_user_id
              WHERE 1=1 {where_extra}
              ORDER BY o.id DESC"""  # 新单在前
    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()  # 列表行
        data = [
            {
                "order_id": r["id"],  # 订单主键
                "tool_id": r["tool_id"],  # 工具 id
                "tool_name": r["tool_name"],  # 工具名
                "tool_slug": r["tool_slug"],  # 详情 slug
                "purchaser_user_id": r["purchaser_user_id"],  # 买家用户 id
                "purchaser_email": r["purchaser_email"],  # 买家邮箱
                "amount_usd": round(r["amount_cents"] / 100.0, 2),  # 标价美元
                "payment_status": r["payment_status"],  # 支付状态
                "valid_from": r["valid_from"],  # 推广起
                "valid_until": r["valid_until"],  # 推广止
                "promo_pv": r["extra_pv"],  # 累计推广 PV
                "promo_uv": r["extra_uv"],  # UV
                "promo_uid": r["extra_uid"],  # 登录 uid 去重
                "created_at": r["created_at"],  # 下单时间
            }
            for r in rows
        ]
        return {"data": data}


@router.patch("/monetization/orders/{order_id}")
def admin_patch_order(
    order_id: int,
    body: MonetOrderPatchBody,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    if body.payment_status is None and body.valid_until is None:  # 至少改一项
        raise HTTPException(status_code=400, detail="no updatable fields")  # 拒绝空 PATCH
    if body.payment_status is not None and body.payment_status not in _PAYMENT_STATUSES:  # 状态白名单
        raise HTTPException(status_code=400, detail="invalid payment_status")  # 非法枚举
    if body.valid_until is not None and len(body.valid_until.strip()) < 8:  # 粗检日期串
        raise HTTPException(status_code=400, detail="invalid valid_until")  # 太短不像 YYYY-MM-DD
    sets: list[str] = []  # SET 子句片段
    vals: list[object] = []  # 占位值顺序
    if body.payment_status is not None:  # 改状态
        sets.append("payment_status = ?")  # 列赋值
        vals.append(body.payment_status)  # 新状态
    if body.valid_until is not None:  # 展期
        sets.append("valid_until = ?")  # 止日更新
        vals.append(body.valid_until.strip())  # 去空白
    vals.append(order_id)  # WHERE id=?
    with get_db() as conn:
        cur = conn.execute("SELECT id FROM monetization_order WHERE id = ?", (order_id,)).fetchone()  # 存在性
        if not cur:  # 无此单
            raise HTTPException(status_code=404, detail="order not found")  # 404
        conn.execute(  # 动态 UPDATE
            f"UPDATE monetization_order SET {', '.join(sets)} WHERE id = ?",  # noqa: S608 — 片段来自固定列表
            vals,
        )
        conn.commit()  # 落库
    return {"ok": True}  # 成功
