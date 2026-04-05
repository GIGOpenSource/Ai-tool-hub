#!/usr/bin/env python3
# 轮询处理 ai_insight_run.status=pending：独立进程替代仅 API 进程内 BackgroundTasks（v2.x 队列化运维入口）
from __future__ import annotations

import argparse  # --once / --sleep
import os  # chdir
import sys  # path
import time  # sleep

_BACKEND_ROOT = __file__.rsplit(f"{os.sep}scripts{os.sep}", 1)[0]  # …/backend
if _BACKEND_ROOT not in sys.path:  # 未加入
    sys.path.insert(0, _BACKEND_ROOT)  # 便于 import app


def _pick_one_pending_id() -> int | None:  # 取最早一条 pending
    from app.db import get_db  # 延迟导入

    with get_db() as conn:  # 短连接
        row = conn.execute(  # FIFO
            "SELECT id FROM ai_insight_run WHERE status = 'pending' ORDER BY id ASC LIMIT 1",
        ).fetchone()  # 单行
        if not row:  # 无队列
            return None  # 空闲
        return int(row["id"])  # run 主键


def main() -> int:  # CLI 退出码
    from app.ai_insight_run_worker import finalize_pending_ai_insight_run  # 与 API 共用终结逻辑

    os.chdir(_BACKEND_ROOT)  # 相对路径与 migrate 一致
    ap = argparse.ArgumentParser(description="AI insight pending run worker")  # 参数解析
    ap.add_argument("--once", action="store_true", help="只处理一批后退出（适合 cron）")  # 单次
    ap.add_argument("--sleep", type=float, default=3.0, help="循环模式下每轮间隔秒")  # 默认 3s
    ns = ap.parse_args()  # 解析
    while True:  # 主循环
        rid = _pick_one_pending_id()  # 取下一条
        if rid is None:  # 空队列
            if ns.once:  # 单次模式
                print("ai_insight_pending_worker: idle, exit")  # 人类可读
                return 0  # 成功
            time.sleep(max(0.5, ns.sleep))  # 等待再扫
            continue  # 下一轮
        print(f"ai_insight_pending_worker: finalize run_id={rid}")  # 日志
        finalize_pending_ai_insight_run(rid)  # 同步跑完 LLM
        if ns.once:  # 只处理一条即退
            return 0  # 成功


if __name__ == "__main__":  # 入口
    raise SystemExit(main())  # 退出码
