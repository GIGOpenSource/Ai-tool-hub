# 进程内定时重算工具 recommend_score（与 CRAWLER_SCHEDULER 并列；RECOMMEND_SCORE_INTERVAL_SEC<=0 则关闭）
from __future__ import annotations

import asyncio  # sleep 与 cancel
import logging  # 异常栈
import os  # 间隔秒

from app.db import get_db  # 短连接写库
from app.growth.recommend_service import recommend_sort_enabled, recompute_recommend_scores  # 开关与批量更新

log = logging.getLogger(__name__)  # 模块日志


async def recommend_score_scheduler_loop() -> None:  # uvicorn lifespan 里 create_task
    raw = os.environ.get("RECOMMEND_SCORE_INTERVAL_SEC", "3600").strip()  # 默认每小时
    try:  # 解析整数
        interval = int(raw)  # 秒
    except ValueError:  # 非法
        interval = 3600  # 回退默认
    if interval <= 0:  # 显式关闭
        return  # 不进入循环
    await asyncio.sleep(20)  # 错开启动与 migrate/种子，避免首包竞态
    while True:  # 周期执行
        try:  # 单轮隔离
            with get_db() as conn:  # 连接
                if recommend_sort_enabled(conn):  # 未启用不写库
                    n = recompute_recommend_scores(conn)  # 更新 active 工具分
                    conn.commit()  # 提交
                    log.info("recommend_score recomputed for %s tools", n)  # 运维可见
        except Exception:  # 任意失败不杀进程
            log.exception("recommend_score scheduler tick failed")  # 全栈
        await asyncio.sleep(interval)  # 下一轮
