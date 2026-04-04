# 登录用户活动流与统计：聚合收藏、提交工具、评价（供个人页替代静态 site_json）
from __future__ import annotations

from typing import Any  # JSON 形状

from fastapi import APIRouter, Depends  # 路由与 JWT

from app.db import get_db, table_column_names  # 连接与列信息（SQLite/PG 统一）
from app.deps_auth import get_current_user_id

router = APIRouter(tags=["user"])  # OpenAPI 分组


def _labels(locale: str) -> dict[str, str]:  # 统计卡片文案（少量中英，不依赖 translation 表）
    zh = locale.lower().startswith("zh")  # zh / zh-CN
    return {
        "stat_fav": "收藏数" if zh else "Favorites",  # 与 profile 种子 stats 第一列概念对齐
        "stat_sub": "提交工具" if zh else "Tools Submitted",
        "stat_rev": "发表评价" if zh else "Reviews Written",
        "stat_help": "获「有用」计" if zh else "Helpful Votes",
        "act_fav": "已收藏" if zh else "Added to favorites",
        "act_sub": "已提交审核" if zh else "Submitted for review",
        "act_sub_ap": "已上架" if zh else "Published",
        "act_rev": "发表评价" if zh else "Left a review",
        "pend": "待审核" if zh else "Pending",
    }


@router.get("/me/activity")  # 个人中心动态与数字统计
def get_me_activity(
    locale: str = "en",  # 与全站 locale 参数一致
    user_id: int = Depends(get_current_user_id),  # 须登录
) -> dict[str, Any]:
    lb = _labels(locale)  # 本地化短句
    events: list[dict[str, str]] = []  # 统一 activity 项形状（与 site_json.profile.activity 一致）

    with get_db() as conn:  # 单次连接多查询
        for r in conn.execute(  # 最近收藏（按时间倒序）
            """SELECT uf.created_at, t.name, t.slug
               FROM user_favorite uf
               JOIN tool t ON t.slug = uf.tool_slug
               WHERE uf.user_id = ?
               ORDER BY uf.created_at DESC LIMIT 15""",
            (user_id,),
        ).fetchall():
            events.append(  # 一条收藏动态
                {
                    "type": "favorite",
                    "tool": r["name"] or r["slug"],
                    "action": lb["act_fav"],
                    "date": (r["created_at"] or "")[:10],
                    "icon": "❤️",
                }
            )

        for r in conn.execute(  # 用户提交的工具（含待审与已上架）
            """SELECT t.name, t.slug, t.moderation_status, t.created_at
               FROM tool t
               WHERE t.submitted_by_user_id = ?
               ORDER BY t.id DESC LIMIT 15""",
            (user_id,),
        ).fetchall():
            st = (r["moderation_status"] or "").lower()  # active / pending / rejected
            if st == "active":
                action = f'{lb["act_sub_ap"]}: {r["name"]}'  # 已发布
            elif st == "pending":
                action = f'{lb["act_sub"]} ({lb["pend"]})'  # 队列中
            else:
                action = f'{lb["act_sub"]} ({st})'  # rejected 等原样
            events.append(
                {
                    "type": "submit",
                    "tool": r["name"] or r["slug"],
                    "action": action,
                    "date": (r["created_at"] or "")[:10],
                    "icon": "📤",
                }
            )

        has_rev_col = "reviewer_user_id" in table_column_names(conn, "review")  # 极旧库可能无列
        if has_rev_col:
            for r in conn.execute(  # 用户在前台或审核链路写入的评价
                """SELECT rv.review_date, rv.rating, t.name, t.slug
                   FROM review rv
                   JOIN tool t ON t.id = rv.tool_id
                   WHERE rv.reviewer_user_id = ?
                   ORDER BY rv.id DESC LIMIT 15""",
                (user_id,),
            ).fetchall():
                events.append(
                    {
                        "type": "review",
                        "tool": r["name"] or r["slug"],
                        "action": f'{lb["act_rev"]} ({r["rating"]}★)',
                        "date": (r["review_date"] or "")[:10],
                        "icon": "⭐",
                    }
                )

        fav_n = conn.execute(  # 收藏总数
            "SELECT COUNT(*) FROM user_favorite WHERE user_id = ?",
            (user_id,),
        ).fetchone()[0]
        sub_n = conn.execute(  # 提交过的工具数（任意审核状态）
            "SELECT COUNT(*) FROM tool WHERE submitted_by_user_id = ?",
            (user_id,),
        ).fetchone()[0]
        rev_n = 0  # 评价条数默认为 0
        help_sum = 0  # 有用票合计
        if has_rev_col:
            row = conn.execute(  # 条数与 helpful 聚合
                """SELECT COUNT(*), COALESCE(SUM(helpful_count), 0)
                   FROM review WHERE reviewer_user_id = ?""",
                (user_id,),
            ).fetchone()
            rev_n, help_sum = int(row[0]), int(row[1])

    events.sort(key=lambda x: x["date"], reverse=True)  # 按日期字符串倒序（ISO 可行）
    events = events[:20]  # 与前端展示长度上限

    stats = [  # 四宫格与 ProfilePage 颜色类一致
        {"label": lb["stat_rev"], "value": rev_n, "color": "text-cyan-400"},
        {"label": lb["stat_fav"], "value": int(fav_n), "color": "text-pink-400"},
        {"label": lb["stat_sub"], "value": int(sub_n), "color": "text-purple-400"},
        {"label": lb["stat_help"], "value": help_sum, "color": "text-green-400"},
    ]

    return {"activity": events, "stats": stats}  # 仅含两项；其余 UI 仍取自 /api/site/profile
