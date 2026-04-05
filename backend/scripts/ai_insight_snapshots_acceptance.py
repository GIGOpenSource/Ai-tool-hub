#!/usr/bin/env python3
# 验收 build_snapshots 与占位符白名单（不调 LLM、不连生产库）；对齐 P-DOC-01 / §7 对账 / P-AI-06 Redis 分支 mock
# 用法（在 backend/ 下）：PYTHONPATH=. python scripts/ai_insight_snapshots_acceptance.py
from __future__ import annotations

import json  # 解析快照 JSON
import os  # 环境变量
import sqlite3  # 验收库为 SQLite；供 cast 与 page_analytics_rows 注解对齐
import tempfile  # 临时 SQLite 路径
from pathlib import Path  # 定位临时文件
from typing import cast  # 静态检查收窄 get_db 连接类型（本脚本已禁用 DATABASE_URL）

os.environ.pop("DATABASE_URL", None)  # 强制走本地 SQLite 文件
os.environ.setdefault("JWT_SECRET", "acceptance-test-jwt-secret-32chars!!")  # 满足 env_guard 长度
os.environ.setdefault("CRAWLER_SCHEDULER_ENABLED", "0")  # 避免验收进程挂调度

import app.db as dbm  # 与 TestClient 共用 DB_PATH
import app.paths as pathsm  # 覆写单文件路径

_tmp_db = Path(tempfile.mkdtemp(prefix="ai_nav_ai_snap_acc_")) / "test.db"  # 独立库文件
pathsm.DB_PATH = _tmp_db  # paths 模块全局
dbm.DB_PATH = _tmp_db  # db 模块全局

from fastapi.testclient import TestClient  # 触发 lifespan 建表与种子

from app.growth.ai_insight_prompt_defaults import DEFAULT_AI_INSIGHT_USER_PROMPT_TEMPLATE  # 默认用户模板
from app.growth.ai_insight_service import build_snapshots, fill_user_template, validate_user_prompt_template  # 核心 API
from app.analytics_service import page_analytics_rows  # 与快照 top_pages 同源聚合（管理端 Analytics）
from app.db import get_db  # 写 site_json 与 outbound 样例
from app.main import app  # FastAPI 应用


def _run_assertions() -> None:  # 失败抛 AssertionError
    with TestClient(app):  # lifespan：init_db、种子、迁移 outbound 表
        with get_db() as conn:  # 补全 SEO 站点 JSON 样例（幂等覆盖键）
            conn.execute(  # page_seo 一条
                "INSERT OR REPLACE INTO site_json (content_key, payload_json) VALUES (?, ?)",
                ("page_seo", json.dumps({"/demo": {"title": "Demo", "description": "D"}}, ensure_ascii=False)),
            )
            conn.execute(  # 静态 sitemap 一条
                "INSERT OR REPLACE INTO site_json (content_key, payload_json) VALUES (?, ?)",
                (
                    "seo_sitemap_static",
                    json.dumps({"urls": [{"path": "/demo", "priority": "0.9"}]}, ensure_ascii=False),
                ),
            )
            conn.execute(  # robots 占位
                "INSERT OR REPLACE INTO site_json (content_key, payload_json) VALUES (?, ?)",
                ("seo_robots", json.dumps({"raw_body": "User-agent: *\nDisallow:"}, ensure_ascii=False)),
            )
            row = conn.execute("SELECT slug FROM tool WHERE slug IS NOT NULL LIMIT 1").fetchone()  # 取种子工具 slug
            assert row is not None, "seed tool missing"  # 须有空库种子
            slug = str(row["slug"])  # 字符串 slug
            conn.execute(  # 插入一条出站点击，验证 traffic 段聚合
                """INSERT INTO outbound_click_log (tool_slug, page_path, session_id, user_id)
                   VALUES (?, ?, ?, NULL)""",
                (slug, f"/tool/{slug}", "acc-session-outbound"),  # 与前台 path 形态一致
            )
            conn.commit()  # 持久化
        with get_db() as conn:  # 写入可控 PV，校验与 GET /admin/analytics/pages 一致
            conn.execute("DELETE FROM page_view_log")  # 临时库清空埋点，避免种子干扰对账
            for i in range(10):  # 高 PV 路径
                conn.execute(
                    """INSERT INTO page_view_log (page_path, session_id, user_id, created_at)
                       VALUES (?, ?, NULL, datetime('now'))""",
                    ("/acc-path-hot", f"acc-pv-hot-{i}"),
                )
            for i in range(5):  # 中 PV
                conn.execute(
                    """INSERT INTO page_view_log (page_path, session_id, user_id, created_at)
                       VALUES (?, ?, NULL, datetime('now'))""",
                    ("/acc-path-mid", f"acc-pv-mid-{i}"),
                )
            for i in range(2):  # 低 PV
                conn.execute(
                    """INSERT INTO page_view_log (page_path, session_id, user_id, created_at)
                       VALUES (?, ?, NULL, datetime('now'))""",
                    ("/acc-path-cold", f"acc-pv-cold-{i}"),
                )
            conn.commit()  # 提交埋点
        with get_db() as conn:  # 再读快照
            ph, summ = build_snapshots(conn)  # 占位符 dict 与摘要
        keys = frozenset(ph.keys())  # 实际注入键集合
        assert keys == frozenset(  # 六键齐全（含 deprecated 别名与竞品块）
            {
                "seo_snapshot",
                "seo_indexing_snapshot",
                "crawler_snapshot",
                "traffic_snapshot",
                "site_stats_snapshot",
                "competitor_benchmark_snapshot",
            }
        ), keys
        assert ph["seo_indexing_snapshot"] == ph["crawler_snapshot"], "alias must match"  # P-AI-01 兼容
        seo = json.loads(ph["seo_snapshot"])  # SEO 块
        assert seo.get("page_seo_sample_strategy") in (  # P-AI-04 分层或纯序回退
            "hybrid_hot_analytics_then_sorted_lexicographic",
            "sorted_path_keys_only_no_analytics_window",
        )
        idx = json.loads(ph["seo_indexing_snapshot"])  # 索引块
        assert idx.get("source") == "site_json_seo_sitemap_static_and_seo_robots"  # 非内容爬虫语义
        tr = json.loads(ph["traffic_snapshot"])  # 流量块
        acr = tr.get("analytics_compare_range")  # 与管理端 Analytics 对齐的查询参数
        assert isinstance(acr, dict) and acr.get("sort_by") == "pv"  # 与 top_pages_7d 截取一致
        assert acr.get("start_date") and acr.get("end_date")  # 起止日须存在
        tcr = summ.get("traffic_analytics_compare_range")  # 摘要镜像（免拆 traffic JSON）
        assert tcr == {"start_date": acr["start_date"], "end_date": acr["end_date"]}, (tcr, acr)  # 与快照块一致
        with get_db() as conn:  # 同源函数再算一遍
            rows_full = page_analytics_rows(  # 与 admin_page_analytics 相同入口
                cast(sqlite3.Connection, conn),  # get_db 在 PG 模式下为适配器；本脚本仅 SQLite
                start_date=str(acr["start_date"]),
                end_date=str(acr["end_date"]),
                sort_by=str(acr["sort_by"]),
            )
        lim = int(tr.get("top_pages_limit") or 0)  # Top N
        exp_top = rows_full[:lim]  # 期望的前 N 行
        act_top = tr.get("top_pages_7d") or []  # 快照中的前 N 行
        assert len(act_top) == len(exp_top), (act_top, exp_top)  # 长度须一致
        for got, want in zip(act_top, exp_top):  # 逐行 path/pv/uv（长度已 assert）
            assert got["page_path"] == want["page_path"] and got["pv"] == want["pv"] and got["uv"] == want["uv"]
        ob = tr.get("outbound_official_clicks_7d")  # 出站子对象
        assert isinstance(ob, dict) and int(ob.get("total_clicks", 0)) >= 1  # 至少一次
        st = json.loads(ph["site_stats_snapshot"])  # 规模块
        caveats = st.get("snapshot_limits_and_caveats")  # 边界说明
        assert isinstance(caveats, dict) and "competitor_traffic_benchmarks" in caveats  # P-AI-03 等登记
        opd = caveats.get("open_product_decisions")  # P-AI-07 开放产品决策（须为对象）
        assert isinstance(opd, dict)  # 类型
        assert frozenset(opd.keys()) == frozenset(  # 三键名与快照路径严格对齐
            {
                "data_residency_and_cross_border",
                "model_output_format",
                "cost_quota_and_retention",
            }
        ), sorted(opd.keys())  # 便于 diff
        assert opd["data_residency_and_cross_border"] == "allowed_overseas_llm_for_seo_summaries_and_aggregated_traffic"  # 与 ai_insight_service 一致；产品已确认允许 SEO 摘要+聚合流量发往含境外 LLM
        assert opd["model_output_format"] == "plain_text_now_markdown_render_if_needed_tbd"  # 同上
        assert opd["cost_quota_and_retention"] == "tbd_ops_policy"  # 同上
        envl = st.get("ai_insight_snapshot_env_limits")  # P-AI-04/06 审计镜像
        assert isinstance(envl, dict) and int(envl.get("AI_INSIGHT_RATE_LIMIT_WINDOW_SEC") or 0) >= 10  # 须含限流窗口
        assert int(envl.get("AI_INSIGHT_RATE_LIMIT_MAX_CALLS") or 0) >= 1  # 须含次数上限
        assert envl.get("AI_INSIGHT_RATE_LIMIT_REDIS_URL_set") is False  # 验收未设 Redis URL
        cb = json.loads(ph["competitor_benchmark_snapshot"])  # 竞品块
        assert cb.get("source") == "site_json_ai_insight_competitor_benchmarks"  # 来源
        assert int(summ.get("outbound_clicks_7d_total") or 0) >= 1  # 摘要字段
        validate_user_prompt_template(DEFAULT_AI_INSIGHT_USER_PROMPT_TEMPLATE)  # 默认模板占位符合法
        legacy_tpl = DEFAULT_AI_INSIGHT_USER_PROMPT_TEMPLATE.replace(  # 模拟仍用旧占位符的运营模板
            "{{seo_indexing_snapshot}}",
            "{{crawler_snapshot}}",
        )
        validate_user_prompt_template(legacy_tpl)  # 旧名仍须通过校验
        filled = fill_user_template(legacy_tpl, ph)  # 替换后正文
        assert "{{crawler_snapshot}}" not in filled  # 已替换
        assert "{{seo_indexing_snapshot}}" not in filled  # 旧模板不含新占位符
        assert "seo_sitemap_static_url_count" in filled  # 索引 JSON 片段已进入 user 消息


def _assert_redis_rate_limit_mock() -> None:  # P-AI-06：Redis 固定窗口路径（不调真实实例）
    from unittest.mock import MagicMock, patch  # 运行时打桩

    import app.growth.ai_insight_service as ais_mod  # 限流实现模块

    mock_r = MagicMock()  # 伪造 redis 客户端
    seq = [0]  # 桶内计数闭包

    def _incr(_key: str) -> int:  # 模拟 INCR
        seq[0] += 1  # 每次 +1
        return seq[0]  # 返回新值

    mock_r.incr.side_effect = _incr  # 绑定副作用
    mock_r.expire.return_value = True  # EXPIRE 成功
    env_extra = {  # 仅本用例覆盖
        "AI_INSIGHT_RATE_LIMIT_REDIS_URL": "redis://127.0.0.1:6379/0",  # 任意非空即走 Redis 分支
        "AI_INSIGHT_RATE_LIMIT_WINDOW_SEC": "600",  # 宽窗口防 time 桶跳动
        "AI_INSIGHT_RATE_LIMIT_MAX_CALLS": "2",  # 第三次须拒绝
    }
    with patch.dict(os.environ, env_extra, clear=False):  # 合并环境
        with patch("redis.from_url", return_value=mock_r):  # 拦截连接
            ais_mod.check_ai_insight_rate_limit(424242)  # 第 1 次放行
            ais_mod.check_ai_insight_rate_limit(424242)  # 第 2 次放行
            try:
                ais_mod.check_ai_insight_rate_limit(424242)  # 第 3 次应超限
            except ValueError as ex:  # 与路由捕获的异常一致
                assert "rate_limited" in str(ex).lower()  # 错误码子串
            else:
                raise AssertionError("expected ValueError rate_limited on third call")  # 未抛则失败


def main() -> int:  # CLI 退出码
    try:  # 统一捕获
        _run_assertions()  # 断言链
        _assert_redis_rate_limit_mock()  # P-AI-06 Redis 分支
        print("ai_insight_snapshots_acceptance: OK")  # 人类可读
        return 0  # 成功
    except AssertionError as e:  # 验收失败
        print("ai_insight_snapshots_acceptance: FAIL", e)  #  stderr 友好
        return 1  # 失败


if __name__ == "__main__":  # 直接执行
    raise SystemExit(main())  # 退出进程
