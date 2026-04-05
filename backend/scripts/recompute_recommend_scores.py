#!/usr/bin/env python3
# 手动重算全站 active 工具的 recommend_score（与定时任务同源逻辑）。用法：cd backend && PYTHONPATH=. python scripts/recompute_recommend_scores.py
from __future__ import annotations

import sys  # 退出码

from app.db import get_db, init_db  # 建库迁移后计算
from app.growth.recommend_service import recommend_sort_enabled, recompute_recommend_scores  # 开关与批处理


def main() -> int:
    init_db()  # 确保列与 site_json 默认行存在
    with get_db() as conn:
        if not recommend_sort_enabled(conn):  # 运营关算法时不写库
            print(  # 提示
                "recompute_recommend_scores: skipped (set recommend_algo_v1.enabled=true in site_json)",
            )
            return 0  # 仍算成功退出
        n = recompute_recommend_scores(conn)  # 写 recommend_score
        conn.commit()  # 提交
    print(f"recompute_recommend_scores: updated {n} tools")  # stdout
    return 0  # 成功


if __name__ == "__main__":
    sys.exit(main())  # CLI 入口
