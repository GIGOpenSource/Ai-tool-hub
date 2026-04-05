#!/usr/bin/env python3
# 爬虫三项能力验收：① JSON 导入（Dry-run）② 统计 API ③ 数据源定时设置 + tick_scheduled_crawls
# 用法（在 backend/ 下）：PYTHONPATH=. ./.venv_hb/bin/python scripts/crawler_acceptance.py
from __future__ import annotations

import os  # 环境变量
import tempfile  # 临时库文件
import threading  # 后台 HTTP
from http.server import BaseHTTPRequestHandler, HTTPServer  # 最小静态 JSON 服务
from pathlib import Path  # 路径

# 须在 import app 前设定，避免误连生产 PG / 弱密钥
os.environ.pop("DATABASE_URL", None)  # 强制 SQLite 临时文件
os.environ.setdefault("JWT_SECRET", "acceptance-test-jwt-secret-32chars!!")  # 满足 env_guard 长度
os.environ["CRAWLER_SCHEDULER_ENABLED"] = "0"  # 验收脚本内不依赖后台 asyncio 调度

import app.db as dbm  # 可改 DB_PATH 的模块
import app.paths as pathsm  # 与 db 共用路径

_tmp_db = Path(tempfile.mkdtemp(prefix="ai_nav_crawl_acc_")) / "test.db"  # 独立 SQLite 文件
pathsm.DB_PATH = _tmp_db  # paths 模块
dbm.DB_PATH = _tmp_db  # db 模块内全局 DB_PATH

from fastapi.testclient import TestClient  # 同步调用 ASGI

from app.growth.crawler_scheduler import tick_scheduled_crawls  # 手动触发定时逻辑
from app.main import app  # 挂载 lifespan 的应用


def _feed_bytes() -> bytes:  # 与 seed 样例一致的 JSON 字节
    p = Path(__file__).resolve().parent.parent / "data" / "seed" / "crawler_sample_feed.json"  # 仓库内样例
    return p.read_bytes()  # UTF-8


def _start_json_server(data: bytes) -> tuple[HTTPServer, str]:  # 返回 server 与 base URL
    class H(BaseHTTPRequestHandler):  # 仅 GET
        def do_GET(self) -> None:  # 任意路径返回同一 JSON
            self.send_response(200)  # OK
            self.send_header("Content-Type", "application/json; charset=utf-8")  # 类型
            self.end_headers()  # 头结束
            self.wfile.write(data)  # 正文

        def log_message(self, *args: object) -> None:  # 静默
            pass  # 不刷屏

    srv = HTTPServer(("127.0.0.1", 0), H)  # 随机端口
    t = threading.Thread(target=srv.serve_forever, daemon=True)  # 守护线程
    t.start()  # 启动
    _host, port = srv.server_address  # 元组
    return srv, f"http://127.0.0.1:{port}/feed.json"  # 可访问 URL


def _run_checks(client: TestClient, feed_url: str) -> None:  # 执行业务断言（失败抛 AssertionError）
    r_login = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert r_login.status_code == 200, f"login {r_login.status_code} {r_login.text}"  # 必须成功
    token = r_login.json()["access_token"]  # Bearer
    h = {"Authorization": f"Bearer {token}"}  # 管理端头

    r0 = client.get("/api/admin/crawler/stats", headers=h)
    assert r0.status_code == 200, f"stats0 {r0.status_code}"  # 200
    s0 = r0.json()  # 体
    for k in (
        "total_runs",
        "success_runs",
        "failed_runs",
        "other_runs",
        "total_items_processed",
        "total_committed_ins",
        "total_committed_upd",
    ):
        assert k in s0, f"stats missing {k}"  # 字段齐全
    runs_before = int(s0["total_runs"])  # 跑前次数

    r_post = client.post(
        "/api/admin/crawler/sources",
        headers=h,
        json={
            "name": "acc-test-feed",
            "feed_url": feed_url,
            "source_type": "json_feed",
            "config_json": {"items_path": "items", "default_category_slug": "productivity", "timeout_sec": 15},
            "respect_robots": False,
            "user_agent": "AcceptanceTest/1",
            "enabled": True,
            "auto_crawl_enabled": False,
            "crawl_interval_minutes": 60,
            "daily_max_items": 500,
            "scheduled_max_items_per_run": 50,
            "auto_dry_run": True,
            "auto_write_strategy": "insert_only",
        },
    )
    assert r_post.status_code == 200, f"post source {r_post.status_code} {r_post.text}"  # 创建
    sid = int(r_post.json()["id"])  # 数据源 id

    r_job = client.post(
        "/api/admin/crawler/jobs",
        headers=h,
        json={
            "source_id": sid,
            "dry_run": True,
            "write_strategy": "insert_only",
            "max_items": 50,
        },
    )
    assert r_job.status_code == 200, f"job {r_job.status_code} {r_job.text}"  # 执行完成
    jbody = r_job.json()  # 响应
    assert jbody.get("ok") is True, jbody  # 抓取成功
    assert jbody.get("committed") is False, jbody  # 未直接入库
    jid = int(jbody["job_id"])  # 任务 id

    r_prev = client.get(f"/api/admin/crawler/jobs/{jid}/preview?limit=20", headers=h)
    assert r_prev.status_code == 200, r_prev.text  # 预览接口
    prev = r_prev.json()  # 体
    assert int(prev.get("total", 0)) >= 1, prev  # 至少一行预览

    r1 = client.get("/api/admin/crawler/stats", headers=h)
    assert r1.status_code == 200  # OK
    s1 = r1.json()  # 体
    assert int(s1["total_runs"]) >= runs_before + 1  # 多了一次任务
    assert int(s1["success_runs"]) >= 1  # 至少一次成功
    assert int(s1["total_items_processed"]) >= int(prev["total"])  # 累计条数不少于本任务预览

    r_one = client.get(f"/api/admin/crawler/jobs/{jid}", headers=h)
    assert r_one.status_code == 200  # 详情
    one = r_one.json()  # 体
    assert one.get("status") == "preview_ready"  # Dry-run 结束态
    assert int(one.get("items_processed", 0)) >= 1  # 条数字段写入

    r_put = client.put(
        f"/api/admin/crawler/sources/{sid}",
        headers=h,
        json={
            "auto_crawl_enabled": True,
            "crawl_interval_minutes": 5,
            "daily_max_items": 200,
            "scheduled_max_items_per_run": 20,
            "auto_dry_run": True,
            "auto_write_strategy": "insert_only",
        },
    )
    assert r_put.status_code == 200, r_put.text  # 保存设置

    r_list = client.get("/api/admin/crawler/sources", headers=h)
    assert r_list.status_code == 200  # 列表
    rows = r_list.json().get("data", [])  # 数组
    hit = next((x for x in rows if int(x["id"]) == sid), None)  # 找到刚建的源
    assert hit is not None  # 存在
    assert hit["auto_crawl_enabled"] is True  # 开关已开
    assert int(hit["crawl_interval_minutes"]) == 5  # 间隔
    assert int(hit["daily_max_items"]) == 200  # 每日上限

    os.environ["CRAWLER_SCHEDULER_ENABLED"] = "1"  # tick_scheduled_crawls 入口默认否则直接 return
    tick_scheduled_crawls()  # 同步跑一轮调度
    r_jobs = client.get("/api/admin/crawler/jobs?limit=10", headers=h)
    assert r_jobs.status_code == 200  # 列表
    jrows = r_jobs.json().get("data", [])  # 最近任务
    assert any(str(x.get("trigger_type")) == "scheduled" for x in jrows), jrows  # 含定时触发

    r_del = client.delete(f"/api/admin/crawler/sources/{sid}", headers=h)
    assert r_del.status_code == 200  # 级联删任务


def main() -> int:  # 0 通过 1 失败
    body = _feed_bytes()  # 样例正文
    srv, feed_url = _start_json_server(body)  # 起服务
    try:  # 确保关 socket
        with TestClient(app) as client:  # 上下文内执行 lifespan（init_db / 演示账号）
            _run_checks(client, feed_url)  # 断言链
        print("crawler_acceptance: OK (import dry-run + stats + schedule/tick)")  # 人类可读
        return 0  # 通过
    except AssertionError as e:  # 验收失败
        print("crawler_acceptance: FAIL", e)  # 原因
        return 1  # 不通过
    finally:  # 收尾
        srv.shutdown()  # 停 HTTP


if __name__ == "__main__":  # CLI
    raise SystemExit(main())  # 退出码
