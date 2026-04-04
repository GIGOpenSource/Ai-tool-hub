# 后台定时触发 JSON 爬虫：按数据源的间隔与每日条数上限执行（进程内 asyncio 每分钟巡检）
from __future__ import annotations

import asyncio  # 异步睡眠与取消
import logging  # 调度异常日志
import os  # CRAWLER_SCHEDULER_ENABLED
from datetime import date, datetime, timedelta  # 间隔与按日配额

from app.crawler_service import run_import_job  # 同步抓取与入库
from app.db import get_db, insert_returning_id  # 连接与插入任务 id

log = logging.getLogger(__name__)  # 模块日志器

_WRITE_OK = frozenset({"insert_only", "update_empty", "overwrite"})  # 与 crawler_service 一致


def _parse_last_run(raw: object) -> datetime | None:  # 解析 last_auto_run_at 文本
    if raw is None:  # 空
        return None  # 从未跑过
    s = str(raw).strip()  # 转字符串
    if not s:  # 空串
        return None  # 当作无
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):  # 常见格式
        try:  # 逐格式试解析
            return datetime.strptime(s[:26], fmt)  # 截断微秒防过长
        except ValueError:  # 不匹配
            continue  # 下一格式
    try:  # ISO 兜底
        return datetime.fromisoformat(s.replace("Z", "+00:00")[:32])  # 带 Z 的 UTC
    except ValueError:  # 仍失败
        return None  # 放弃


def tick_scheduled_crawls() -> None:  # 同步入口：可被单元测试或脚本直接调用
    env = os.environ.get("CRAWLER_SCHEDULER_ENABLED", "1").strip().lower()  # 默认开启
    if env in ("0", "false", "no", "off"):  # 显式关闭
        return  # 不跑
    with get_db() as conn:  # 取任一管理员账号挂任务（满足外键）
        adm = conn.execute(
            "SELECT id FROM app_user WHERE role = 'admin' ORDER BY id LIMIT 1"
        ).fetchone()  # 第一管理员
    if not adm:  # 无管理员
        return  # 无法写 crawler_job
    admin_id = int(adm["id"])  # 数字 id
    with get_db() as conn:  # 枚举待调度源
        rows = conn.execute(
            """SELECT id FROM crawler_source WHERE enabled = 1 AND auto_crawl_enabled = 1 ORDER BY id"""
        ).fetchall()  # 全部启用且开定时
        sids = [int(r["id"]) for r in rows]  # id 列表
    for sid in sids:  # 各源独立事务
        try:  # 单源失败不阻断其它源
            _run_one_scheduled_source(sid, admin_id)  # 执行一次
        except Exception:  # 任意异常
            log.exception("crawler scheduled source_id=%s", sid)  # 栈追踪


def _run_one_scheduled_source(source_id: int, admin_id: int) -> None:  # 单数据源：建任务并跑
    today = date.today().isoformat()  # 服务器本地日历日
    now = datetime.now()  # 当前本地时刻
    with get_db() as conn:  # 单连接事务
        row = conn.execute(
            """SELECT id, crawl_interval_minutes, daily_max_items, scheduled_max_items_per_run,
               auto_dry_run, auto_write_strategy, last_auto_run_at, daily_quota_date, daily_quota_used
               FROM crawler_source WHERE id = ? AND enabled = 1 AND auto_crawl_enabled = 1""",
            (source_id,),
        ).fetchone()  # 再确认仍满足条件
        if row is None:  # 已关或删除
            return  # 退出
        interval_min = max(int(row["crawl_interval_minutes"] or 1440), 5)  # 至少 5 分钟防刷
        last_dt = _parse_last_run(row["last_auto_run_at"])  # 上次结束时间
        if last_dt is not None and (now - last_dt) < timedelta(minutes=interval_min):  # 未到间隔
            return  # 跳过
        daily_max = max(int(row["daily_max_items"] or 1000), 1)  # 每日上限至少 1
        qdate = str(row["daily_quota_date"] or "")  # 配额所属日
        used = int(row["daily_quota_used"] or 0)  # 已用条数
        if qdate != today:  # 跨日重置
            used = 0  # 从零计
        remaining = daily_max - used  # 当日剩余额度
        if remaining <= 0:  # 用尽
            return  # 等明天
        per_run = int(row["scheduled_max_items_per_run"] or 100)  # 单次上限
        per_run = min(max(per_run, 1), 500)  # 夹在 1~500
        max_items = min(per_run, remaining, 500)  # 本任务实际 max_items
        dry = bool(int(row["auto_dry_run"] or 1))  # 默认仅预览
        ws = str(row["auto_write_strategy"] or "insert_only").strip()  # 策略串
        if ws not in _WRITE_OK:  # 非法
            ws = "insert_only"  # 回落
        jid = insert_returning_id(
            conn,
            """INSERT INTO crawler_job (source_id, admin_user_id, dry_run, write_strategy, max_items, status, trigger_type)
               VALUES (?, ?, ?, ?, ?, 'queued', 'scheduled')""",
            (
                source_id,
                admin_id,
                1 if dry else 0,
                ws,
                max_items,
            ),
        )
        out = run_import_job(conn, int(jid))  # 同步执行
        proc_row = conn.execute(
            "SELECT items_processed FROM crawler_job WHERE id = ?", (jid,)
        ).fetchone()  # 读预览条数
        proc = int(proc_row["items_processed"] or 0) if proc_row else 0  # 默认 0
        ok = bool(out.get("ok"))  # 是否跑通（含 preview_ready / committed）
        if ok:  # 成功才累加每日条数
            new_used = proc if qdate != today else used + proc  # 换日只计本趟
            conn.execute(
                """UPDATE crawler_source SET last_auto_run_at = datetime('now'), daily_quota_date = ?,
                   daily_quota_used = ?, updated_at = datetime('now') WHERE id = ?""",
                (today, new_used, source_id),
            )
        else:  # 失败仍推进 last_auto，避免连续打爆源站
            conn.execute(
                "UPDATE crawler_source SET last_auto_run_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
                (source_id,),
            )
        conn.commit()  # 提交
    if ok:  # 结构化日志
        log.info("crawler scheduled ok job_id=%s source_id=%s items_processed=%s", jid, source_id, proc)
    else:  # 失败摘要
        log.warning(
            "crawler scheduled fail job_id=%s source_id=%s err=%s",
            jid,
            source_id,
            out.get("error"),
        )


async def crawler_scheduler_loop() -> None:  # 每分钟 tick（协程，供 lifespan 挂载）
    await asyncio.sleep(20)  # 等服务与 DB 就绪
    while True:  # 常驻
        await asyncio.sleep(60)  # 周期间隔 60 秒
        try:  # 隔离异常
            tick_scheduled_crawls()  # 同步块在线程池外直接跑（短任务）
        except Exception:  # 不应打断循环
            log.exception("crawler_scheduler_loop tick")  # 记录
