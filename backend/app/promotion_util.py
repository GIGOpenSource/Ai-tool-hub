"""付费推广展示：与 monetization_order 一致，供详情/对比等只读判断（弱曝光）。"""
from __future__ import annotations

from datetime import date  # 与 admin_monetization 汇总用同日比较逻辑


def tool_has_active_promotion(conn: object, tool_id: int | None) -> bool:
    """若 tool_id 有效且存在 payment_status=paid 且今天在 valid_from～valid_until 内，则视为推广中。"""
    if tool_id is None:  # 无 id 无法关联订单
        return False  # 不展示推广标
    rows = conn.execute(  # 只查该工具的已支付单（窗口外单仍可能多条）
        """SELECT valid_from, valid_until FROM monetization_order
           WHERE tool_id = ? AND payment_status = 'paid'""",
        (tool_id,),
    ).fetchall()  # 可能为空或多条
    today = date.today()  # 与 admin 汇总 active_promotions 同日基准
    for r in rows:  # 任一在约即算推广中（多单重叠时合并展示）
        try:  # 日期串兼容 YYYY-MM-DD 及带时间戳前缀
            vf_s = str(r["valid_from"] or "")[:10]  # 取日期段
            vu_s = str(r["valid_until"] or "")[:10]  # 止日段
            vf = date.fromisoformat(vf_s)  # 解析起日
            vu = date.fromisoformat(vu_s)  # 解析止日
        except ValueError:  # 坏数据跳过
            continue  # 下一行
        if vf <= today <= vu:  # 闭区间在约
            return True  # 命中
    return False  # 无在约 paid 单


def tool_id_by_display_name(conn: object, name: str) -> int | None:
    """按展示名在 active 工具中解析 id；同名多行取最小 id（稳定）。"""
    n = (name or "").strip()  # 去空白
    if not n:  # 空名无法查
        return None  # 无 id
    row = conn.execute(  # 与列表/详情展示名一致
        """SELECT id FROM tool
           WHERE name = ? AND moderation_status = 'active'
           ORDER BY id ASC LIMIT 1""",
        (n,),
    ).fetchone()  # 单行或 None
    if not row:  # 未命中
        return None  # 无法关联推广
    return int(row["id"])  # 主键给 promotion 查询用
