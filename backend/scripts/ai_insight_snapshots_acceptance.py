#!/usr/bin/env python3
# 验收 build_snapshots 与占位符白名单（不调 LLM、不连生产库）；对齐 P-DOC-01
# 用法（在 backend/ 下）：PYTHONPATH=. python scripts/ai_insight_snapshots_acceptance.py
from __future__ import annotations

import json  # 解析快照 JSON
import os  # 环境变量
import tempfile  # 临时 SQLite 路径
from pathlib import Path  # 定位临时文件

os.environ.pop("DATABASE_URL", None)  # 强制走本地 SQLite 文件
os.environ.setdefault("JWT_SECRET", "acceptance-test-jwt-secret-32chars!!")  # 满足 env_guard 长度
os.environ.setdefault("CRAWLER_SCHEDULER_ENABLED", "0")  # 避免验收进程挂调度

import app.db as dbm  # 与 TestClient 共用 DB_PATH
import app.paths as pathsm  # 覆写单文件路径

_tmp_db = Path(tempfile.mkdtemp(prefix="ai_nav_ai_snap_acc_")) / "test.db"  # 独立库文件
pathsm.DB_PATH = _tmp_db  # paths 模块全局
dbm.DB_PATH = _tmp_db  # db 模块全局

from fastapi.testclient import TestClient  # 触发 lifespan 建表与种子

from app.ai_insight_prompt_defaults import DEFAULT_AI_INSIGHT_USER_PROMPT_TEMPLATE  # 默认用户模板
from app.ai_insight_service import build_snapshots, fill_user_template, validate_user_prompt_template  # 核心 API
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
        with get_db() as conn:  # 再读快照
            ph, summ = build_snapshots(conn)  # 占位符 dict 与摘要
        keys = frozenset(ph.keys())  # 实际注入键集合
        assert keys == frozenset(  # 五键齐全（含 deprecated 别名）
            {
                "seo_snapshot",
                "seo_indexing_snapshot",
                "crawler_snapshot",
                "traffic_snapshot",
                "site_stats_snapshot",
            }
        ), keys
        assert ph["seo_indexing_snapshot"] == ph["crawler_snapshot"], "alias must match"  # P-AI-01 兼容
        seo = json.loads(ph["seo_snapshot"])  # SEO 块
        assert seo.get("page_seo_sample_strategy") == "sorted_path_keys_first_50"  # P-AI-04 标注
        idx = json.loads(ph["seo_indexing_snapshot"])  # 索引块
        assert idx.get("source") == "site_json_seo_sitemap_static_and_seo_robots"  # 非内容爬虫语义
        tr = json.loads(ph["traffic_snapshot"])  # 流量块
        ob = tr.get("outbound_official_clicks_7d")  # 出站子对象
        assert isinstance(ob, dict) and int(ob.get("total_clicks", 0)) >= 1  # 至少一次
        st = json.loads(ph["site_stats_snapshot"])  # 规模块
        caveats = st.get("snapshot_limits_and_caveats")  # 边界说明
        assert isinstance(caveats, dict) and "competitor_traffic_benchmarks" in caveats  # P-AI-03 等登记
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


def main() -> int:  # CLI 退出码
    try:  # 统一捕获
        _run_assertions()  # 断言链
        print("ai_insight_snapshots_acceptance: OK")  # 人类可读
        return 0  # 成功
    except AssertionError as e:  # 验收失败
        print("ai_insight_snapshots_acceptance: FAIL", e)  #  stderr 友好
        return 1  # 失败


if __name__ == "__main__":  # 直接执行
    raise SystemExit(main())  # 退出进程
