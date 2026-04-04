# 管理端 — 内容爬虫数据源与任务（JSON 订阅 / Dry-run / 入库 pending）
from __future__ import annotations

import json  # 序列化 config 与摘要
from typing import Any, Optional  # 可选字段与动态 JSON

from fastapi import APIRouter, Depends, HTTPException  # 路由与鉴权
from pydantic import BaseModel, ConfigDict, Field  # 请求体验证

from app.crawler_service import commit_job, parse_config, run_import_job  # 核心业务
from app.db import get_db, insert_returning_id  # 数据库与取插入 id
from app.deps_auth import get_current_admin  # 管理员 JWT

router = APIRouter(prefix="/admin/crawler", tags=["admin"])  # 统一前缀

_WRITE_STRATEGIES = frozenset({"insert_only", "update_empty", "overwrite"})  # 与 service 对齐


def _admin_id(admin: dict) -> int:  # JWT sub -> 整数用户 id
    try:  # 容错
        return int(admin["sub"])  # 主键
    except (KeyError, TypeError, ValueError) as e:  # 缺失或非法
        raise HTTPException(status_code=401, detail="invalid_admin") from e  # 401


class CrawlerSourceCreate(BaseModel):  # 新建数据源
    model_config = ConfigDict(extra="forbid")  # 禁止未知字段

    name: str = Field(min_length=1, max_length=200)  # 显示名
    feed_url: str = Field(min_length=1, max_length=2048)  # JSON 订阅地址
    source_type: str = Field(default="json_feed", max_length=64)  # 类型占位
    config_json: dict[str, Any] = Field(default_factory=dict)  # items_path、default_category_slug 等
    respect_robots: bool = True  # 是否检查 robots.txt
    user_agent: str = Field(default="", max_length=512)  # 自定义 UA
    enabled: bool = True  # 是否启用
    auto_crawl_enabled: bool = False  # 是否参与进程内定时抓取
    crawl_interval_minutes: int = Field(default=1440, ge=5, le=10080)  # 两次自动抓取最小间隔（分钟）
    daily_max_items: int = Field(default=1000, ge=1, le=500000)  # 每自然日最多处理预览条数
    scheduled_max_items_per_run: int = Field(default=100, ge=1, le=500)  # 单次自动任务 max_items 上限
    auto_dry_run: bool = True  # 自动任务默认仅预览
    auto_write_strategy: str = Field(default="insert_only", max_length=32)  # 自动任务关闭 Dry-run 时的策略


class CrawlerSourcePatch(BaseModel):  # 部分更新数据源
    model_config = ConfigDict(extra="forbid")  # 禁止未知字段

    name: Optional[str] = Field(default=None, max_length=200)  # 可选名称
    feed_url: Optional[str] = Field(default=None, max_length=2048)  # 可选 URL
    source_type: Optional[str] = Field(default=None, max_length=64)  # 可选类型
    config_json: Optional[dict[str, Any]] = None  # 可选整包配置
    respect_robots: Optional[bool] = None  # 可选 robots 开关
    user_agent: Optional[str] = Field(default=None, max_length=512)  # 可选 UA
    enabled: Optional[bool] = None  # 可选启用
    auto_crawl_enabled: Optional[bool] = None  # 可选定时总开关
    crawl_interval_minutes: Optional[int] = Field(default=None, ge=5, le=10080)  # 可选间隔
    daily_max_items: Optional[int] = Field(default=None, ge=1, le=500000)  # 可选每日上限
    scheduled_max_items_per_run: Optional[int] = Field(default=None, ge=1, le=500)  # 可选单次条数
    auto_dry_run: Optional[bool] = None  # 可选自动 Dry-run
    auto_write_strategy: Optional[str] = Field(default=None, max_length=32)  # 可选自动策略


class CrawlerJobCreate(BaseModel):  # 创建并立即执行抓取任务
    model_config = ConfigDict(extra="forbid")  # 禁止未知字段

    source_id: int = Field(ge=1)  # 数据源 id
    dry_run: bool = True  # 默认仅预览
    write_strategy: str = Field(default="insert_only", max_length=32)  # 写入策略
    max_items: int = Field(default=100, ge=1, le=500)  # 单次最大条数


def _source_row_to_dict(r: object) -> dict[str, object]:  # Row -> API 对象（含调度字段）
    return {
        "id": r["id"],
        "name": r["name"],
        "feed_url": r["feed_url"],
        "source_type": r["source_type"],
        "config_json": parse_config(r["config_json"]),
        "respect_robots": bool(r["respect_robots"]),
        "user_agent": r["user_agent"] or "",
        "enabled": bool(r["enabled"]),
        "auto_crawl_enabled": bool(r["auto_crawl_enabled"]),
        "crawl_interval_minutes": int(r["crawl_interval_minutes"] or 1440),
        "daily_max_items": int(r["daily_max_items"] or 1000),
        "scheduled_max_items_per_run": int(r["scheduled_max_items_per_run"] or 100),
        "auto_dry_run": bool(r["auto_dry_run"]),
        "auto_write_strategy": str(r["auto_write_strategy"] or "insert_only"),
        "last_auto_run_at": r["last_auto_run_at"] or "",
        "daily_quota_date": r["daily_quota_date"] or "",
        "daily_quota_used": int(r["daily_quota_used"] or 0),
        "created_at": r["created_at"] or "",
        "updated_at": r["updated_at"] or "",
    }


@router.get("/stats")  # 全站爬虫任务汇总统计
def crawler_stats(_admin: dict = Depends(get_current_admin)) -> dict:  # 需管理员
    with get_db() as conn:  # 聚合
        row = conn.execute(
            """SELECT COUNT(*) AS total_runs,
               SUM(CASE WHEN status IN ('committed', 'preview_ready') THEN 1 ELSE 0 END) AS success_runs,
               SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
               COALESCE(SUM(items_processed), 0) AS total_items_processed,
               COALESCE(SUM(items_committed_insert), 0) AS total_committed_ins,
               COALESCE(SUM(items_committed_update), 0) AS total_committed_upd
               FROM crawler_job"""
        ).fetchone()  # 单行聚合
    if row is None:  # 不应发生
        return {  # 全零
            "total_runs": 0,
            "success_runs": 0,
            "failed_runs": 0,
            "other_runs": 0,
            "total_items_processed": 0,
            "total_committed_ins": 0,
            "total_committed_upd": 0,
        }
    total = int(row["total_runs"] or 0)  # 总次数
    succ = int(row["success_runs"] or 0)  # 成功（预览完成或已入库）
    fail = int(row["failed_runs"] or 0)  # 失败
    other = max(0, total - succ - fail)  # 运行中/排队等
    return {
        "total_runs": total,
        "success_runs": succ,
        "failed_runs": fail,
        "other_runs": other,
        "total_items_processed": int(row["total_items_processed"] or 0),
        "total_committed_ins": int(row["total_committed_ins"] or 0),
        "total_committed_upd": int(row["total_committed_upd"] or 0),
    }


@router.get("/sources")  # 列出数据源
def crawler_list_sources(_admin: dict = Depends(get_current_admin)) -> dict:  # 需管理员
    with get_db() as conn:  # 短连接
        rows = conn.execute(
            """SELECT id, name, feed_url, source_type, config_json, respect_robots, user_agent, enabled,
               auto_crawl_enabled, crawl_interval_minutes, daily_max_items, scheduled_max_items_per_run,
               auto_dry_run, auto_write_strategy, last_auto_run_at, daily_quota_date, daily_quota_used,
               created_at, updated_at FROM crawler_source ORDER BY id DESC"""
        ).fetchall()  # 全表
        data = [_source_row_to_dict(r) for r in rows]  # 映射
        return {"data": data}  # 包装返回


@router.post("/sources")  # 新建数据源
def crawler_post_source(
    body: CrawlerSourceCreate,
    admin: dict = Depends(get_current_admin),
) -> dict:  # 返回新 id
    _admin_id(admin)  # 校验 token（写操作留痕可扩展）
    cfg = json.dumps(body.config_json, ensure_ascii=False)  # 存库字符串
    if len(cfg) > 64_000:  # 防止过大
        raise HTTPException(status_code=400, detail="config_too_large")  # 拒绝
    aws = body.auto_write_strategy.strip()  # 自动策略
    if aws not in _WRITE_STRATEGIES:  # 非法
        raise HTTPException(status_code=400, detail="invalid_auto_write_strategy")  # 拒绝
    with get_db() as conn:  # 写库
        rid = insert_returning_id(
            conn,
            """INSERT INTO crawler_source (name, feed_url, source_type, config_json, respect_robots, user_agent, enabled,
               auto_crawl_enabled, crawl_interval_minutes, daily_max_items, scheduled_max_items_per_run, auto_dry_run, auto_write_strategy)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                body.name.strip(),
                body.feed_url.strip(),
                body.source_type.strip() or "json_feed",
                cfg,
                1 if body.respect_robots else 0,
                body.user_agent.strip(),
                1 if body.enabled else 0,
                1 if body.auto_crawl_enabled else 0,
                int(body.crawl_interval_minutes),
                int(body.daily_max_items),
                int(body.scheduled_max_items_per_run),
                1 if body.auto_dry_run else 0,
                aws,
            ),
        )
        conn.commit()  # 提交
    return {"id": rid, "success": True}  # 成功


@router.put("/sources/{source_id}")  # 更新数据源
def crawler_put_source(
    source_id: int,
    body: CrawlerSourcePatch,
    admin: dict = Depends(get_current_admin),
) -> dict:  # 成功标记
    _admin_id(admin)  # 校验
    fields: list[str] = []  # SET 子句片段
    vals: list[object] = []  # 绑定值
    if body.name is not None:  # 有名称
        fields.append("name = ?")  # 列
        vals.append(body.name.strip())  # 值
    if body.feed_url is not None:  # 有 URL
        fields.append("feed_url = ?")  # 列
        vals.append(body.feed_url.strip())  # 值
    if body.source_type is not None:  # 有类型
        fields.append("source_type = ?")  # 列
        vals.append(body.source_type.strip())  # 值
    if body.config_json is not None:  # 有配置
        cfg = json.dumps(body.config_json, ensure_ascii=False)  # 序列化
        if len(cfg) > 64_000:  # 过大
            raise HTTPException(status_code=400, detail="config_too_large")  # 拒绝
        fields.append("config_json = ?")  # 列
        vals.append(cfg)  # 值
    if body.respect_robots is not None:  # 有 robots 开关
        fields.append("respect_robots = ?")  # 列
        vals.append(1 if body.respect_robots else 0)  # 值
    if body.user_agent is not None:  # 有 UA
        fields.append("user_agent = ?")  # 列
        vals.append(body.user_agent.strip())  # 值
    if body.enabled is not None:  # 有启用
        fields.append("enabled = ?")  # 列
        vals.append(1 if body.enabled else 0)  # 值
    if body.auto_crawl_enabled is not None:  # 定时开关
        fields.append("auto_crawl_enabled = ?")  # 列
        vals.append(1 if body.auto_crawl_enabled else 0)  # 值
    if body.crawl_interval_minutes is not None:  # 间隔
        fields.append("crawl_interval_minutes = ?")  # 列
        vals.append(int(body.crawl_interval_minutes))  # 值
    if body.daily_max_items is not None:  # 每日上限
        fields.append("daily_max_items = ?")  # 列
        vals.append(int(body.daily_max_items))  # 值
    if body.scheduled_max_items_per_run is not None:  # 单次条数
        fields.append("scheduled_max_items_per_run = ?")  # 列
        vals.append(int(body.scheduled_max_items_per_run))  # 值
    if body.auto_dry_run is not None:  # 自动 Dry-run
        fields.append("auto_dry_run = ?")  # 列
        vals.append(1 if body.auto_dry_run else 0)  # 值
    if body.auto_write_strategy is not None:  # 自动策略
        w = body.auto_write_strategy.strip()  # 去空白
        if w not in _WRITE_STRATEGIES:  # 非法
            raise HTTPException(status_code=400, detail="invalid_auto_write_strategy")  # 400
        fields.append("auto_write_strategy = ?")  # 列
        vals.append(w)  # 值
    if not fields:  # 无可更新
        raise HTTPException(status_code=400, detail="empty_patch")  # 400
    fields.append("updated_at = datetime('now')")  # .touch 时间
    vals.append(source_id)  # WHERE 主键
    sql = f"UPDATE crawler_source SET {', '.join(fields)} WHERE id = ?"  # 动态 SQL
    with get_db() as conn:  # 写库
        cur = conn.execute(sql, tuple(vals))  # 执行
        if cur.rowcount == 0:  # 未命中
            raise HTTPException(status_code=404, detail="not_found")  # 404
        conn.commit()  # 提交
    return {"success": True}  # 成功


@router.delete("/sources/{source_id}")  # 删除数据源（级联删任务）
def crawler_delete_source(
    source_id: int,
    admin: dict = Depends(get_current_admin),
) -> dict:  # 成功标记
    _admin_id(admin)  # 校验
    with get_db() as conn:  # 写库
        cur = conn.execute("DELETE FROM crawler_source WHERE id = ?", (source_id,))  # 删除
        if cur.rowcount == 0:  # 无行
            raise HTTPException(status_code=404, detail="not_found")  # 404
        conn.commit()  # 提交
    return {"success": True}  # 成功


@router.get("/jobs")  # 任务列表
def crawler_list_jobs(
    limit: int = 50,
    _admin: dict = Depends(get_current_admin),
) -> dict:  # 分页列表
    lim = min(max(limit, 1), 200)  # 限制范围
    with get_db() as conn:  # 读库
        rows = conn.execute(
            f"""SELECT j.id, j.source_id, j.admin_user_id, j.dry_run, j.write_strategy, j.max_items, j.status,
               j.trigger_type, j.items_processed, j.items_committed_insert, j.items_committed_update,
               j.summary_json, j.error_message, j.started_at, j.finished_at, j.created_at, s.name AS source_name
               FROM crawler_job j LEFT JOIN crawler_source s ON s.id = j.source_id
               ORDER BY j.id DESC LIMIT {lim}"""
        ).fetchall()  # 最近任务；lim 已净化为整数
        data = []  # 数组
        for r in rows:  # 逐行
            try:  # 摘要解析
                summ = json.loads(r["summary_json"] or "{}")  # dict
            except (json.JSONDecodeError, TypeError):  # 损坏
                summ = {}  # 空
            data.append(
                {
                    "id": r["id"],
                    "source_id": r["source_id"],
                    "source_name": r["source_name"] or "",
                    "admin_user_id": r["admin_user_id"],
                    "dry_run": bool(r["dry_run"]),
                    "write_strategy": r["write_strategy"],
                    "max_items": r["max_items"],
                    "status": r["status"],
                    "trigger_type": r["trigger_type"] or "manual",
                    "items_processed": int(r["items_processed"] or 0),
                    "items_committed_insert": int(r["items_committed_insert"] or 0),
                    "items_committed_update": int(r["items_committed_update"] or 0),
                    "summary": summ,
                    "error_message": r["error_message"] or "",
                    "started_at": r["started_at"] or "",
                    "finished_at": r["finished_at"] or "",
                    "created_at": r["created_at"] or "",
                }
            )
        return {"data": data}  # 返回


@router.get("/jobs/{job_id}")  # 单任务详情
def crawler_get_job(
    job_id: int,
    _admin: dict = Depends(get_current_admin),
) -> dict:  # 详情 + 日志
    with get_db() as conn:  # 读库
        r = conn.execute(
            """SELECT j.id, j.source_id, j.admin_user_id, j.dry_run, j.write_strategy, j.max_items, j.status,
               j.trigger_type, j.items_processed, j.items_committed_insert, j.items_committed_update,
               j.log_text, j.summary_json, j.error_message, j.started_at, j.finished_at, j.created_at,
               s.name AS source_name, s.feed_url
               FROM crawler_job j LEFT JOIN crawler_source s ON s.id = j.source_id WHERE j.id = ?""",
            (job_id,),
        ).fetchone()  # 单行
        if r is None:  # 无
            raise HTTPException(status_code=404, detail="not_found")  # 404
        try:  # 摘要
            summ = json.loads(r["summary_json"] or "{}")  # dict
        except (json.JSONDecodeError, TypeError):  # 损坏
            summ = {}  # 空
        return {
            "id": r["id"],
            "source_id": r["source_id"],
            "source_name": r["source_name"] or "",
            "feed_url": r["feed_url"] or "",
            "admin_user_id": r["admin_user_id"],
            "dry_run": bool(r["dry_run"]),
            "write_strategy": r["write_strategy"],
            "max_items": r["max_items"],
            "status": r["status"],
            "trigger_type": r["trigger_type"] or "manual",
            "items_processed": int(r["items_processed"] or 0),
            "items_committed_insert": int(r["items_committed_insert"] or 0),
            "items_committed_update": int(r["items_committed_update"] or 0),
            "log_text": r["log_text"] or "",
            "summary": summ,
            "error_message": r["error_message"] or "",
            "started_at": r["started_at"] or "",
            "finished_at": r["finished_at"] or "",
            "created_at": r["created_at"] or "",
        }


@router.get("/jobs/{job_id}/preview")  # 分页读预览行
def crawler_job_preview(
    job_id: int,
    offset: int = 0,
    limit: int = 50,
    _admin: dict = Depends(get_current_admin),
) -> dict:  # items + total
    off = max(offset, 0)  # 非负
    lim = min(max(limit, 1), 200)  # 上限
    with get_db() as conn:  # 读库
        total = conn.execute(
            "SELECT COUNT(1) AS c FROM crawler_job_preview WHERE job_id = ?", (job_id,)
        ).fetchone()  # 计数
        n = int(total["c"]) if total else 0  # 总数
        rows = conn.execute(
            f"""SELECT ordinal, action, payload_json, note FROM crawler_job_preview
               WHERE job_id = ? ORDER BY ordinal LIMIT {lim} OFFSET {off}""",
            (job_id,),
        ).fetchall()  # 分页；lim/off 已净化
        items = []  # 结果
        for r in rows:  # 逐行
            try:  # 解析 payload
                payload = json.loads(r["payload_json"] or "{}")  # 任意 JSON
            except (json.JSONDecodeError, TypeError):  # 损坏
                payload = {}  # 空对象
            items.append(
                {
                    "ordinal": r["ordinal"],
                    "action": r["action"],
                    "payload": payload,
                    "note": r["note"] or "",
                }
            )
        return {"total": n, "offset": off, "limit": lim, "items": items}  # 标准分页结构


@router.post("/jobs")  # 创建任务并同步执行抓取
def crawler_post_job(
    body: CrawlerJobCreate,
    admin: dict = Depends(get_current_admin),
) -> dict:  # 执行结果
    uid = _admin_id(admin)  # 管理员 id
    ws = body.write_strategy.strip()  # 去空白
    if ws not in _WRITE_STRATEGIES:  # 非法策略
        raise HTTPException(status_code=400, detail="invalid_write_strategy")  # 400
    with get_db() as conn:  # 单事务内跑完
        hit = conn.execute("SELECT 1 FROM crawler_source WHERE id = ?", (body.source_id,)).fetchone()  # 存在性
        if not hit:  # 无数据源
            raise HTTPException(status_code=404, detail="source_not_found")  # 404
        jid = insert_returning_id(
            conn,
            """INSERT INTO crawler_job (source_id, admin_user_id, dry_run, write_strategy, max_items, status, trigger_type)
               VALUES (?, ?, ?, ?, ?, 'queued', 'manual')""",
            (
                body.source_id,
                uid,
                1 if body.dry_run else 0,
                ws,
                body.max_items,
            ),
        )
        out = run_import_job(conn, int(jid))  # 同步抓取与可选提交
        conn.commit()  # 提交整事务
    return {"job_id": jid, **out}  # 合并返回


@router.post("/jobs/{job_id}/commit")  # 将 Dry-run 预览写入业务表
def crawler_job_commit(
    job_id: int,
    admin: dict = Depends(get_current_admin),
) -> dict:  # 提交统计
    _admin_id(admin)  # 校验
    with get_db() as conn:  # 写库
        out = commit_job(conn, job_id, allow_running=False)  # 仅 preview_ready
        if not out.get("ok"):  # 失败
            conn.rollback()  # 回滚（若有）
            raise HTTPException(status_code=400, detail=str(out.get("error", "commit_failed")))  # 400
        conn.commit()  # 提交
    return out  # 成功体

