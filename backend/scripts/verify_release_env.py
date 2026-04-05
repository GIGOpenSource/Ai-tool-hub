#!/usr/bin/env python3
# 发布前环境自检：SEC-01 / OPS-ENV / ENG-PG 辅助；不能替代 TC-EXEC 人工走查（见 docs/手册-A、docs/手册-C）
from __future__ import annotations

import os  # 环境变量
import sys  # 退出码与路径

# 将 backend 根目录加入 PYTHONPATH（脚本可直接 python scripts/verify_release_env.py）
_BACKEND_ROOT = __file__.rsplit(f"{os.sep}scripts{os.sep}", 1)[0]  # …/backend
if _BACKEND_ROOT not in sys.path:  # 未加入时补上
    sys.path.insert(0, _BACKEND_ROOT)  # 先于 app 导入


def _check_jwt() -> bool:  # SEC-01：与 lifespan 中 enforce 逻辑一致
    from app.env_guard import production_jwt_secret_ok  # 延迟导入

    ok, reason = production_jwt_secret_ok()  # 元组
    if reason == "skipped_not_production":  # 非生产
        print("JWT: SKIP（未设置 ENVIRONMENT=production，不执行 SEC-01 强检）")  # 提示
        return True  # CI 默认通过
    if ok:  # 生产且密钥可接受
        print("JWT: OK（生产 JWT_SECRET 通过粗检）")  # stdout
        return True  # 成功
    print("JWT: FAIL — ENVIRONMENT=production 但 JWT_SECRET 弱/占位/过短（SEC-01）", file=sys.stderr)  # 失败说明
    return False  # 阻止发布


def _check_cors_hint() -> None:  # OPS-ENV：仅打印 WARN，与 env_guard 一致
    from app.env_guard import warn_production_cors_origins  # 延迟导入

    warn_production_cors_origins()  # stderr WARN 或未输出


def _check_database() -> bool:  # ENG-PG：连通性烟测
    from app.db_util import is_postgresql  # 是否 PG
    from app.paths import DB_PATH  # SQLite 路径

    if is_postgresql():  # 选用 PostgreSQL
        dsn = (os.environ.get("DATABASE_URL") or "").strip()  # DSN
        if not dsn:  # 不应发生：is_postgresql 已真
            print("DB: FAIL — DATABASE_URL 为空", file=sys.stderr)  # 防御
            return False  # 失败
        try:  # 连接
            import psycopg  # 惰性导入

            with psycopg.connect(dsn, connect_timeout=10) as conn:  # 超时避免挂死
                conn.execute("SELECT 1")  # 烟测
        except Exception as e:  # 连接/权限/网络
            print(f"DB: FAIL — PostgreSQL 连通性: {e}", file=sys.stderr)  # 摘要
            return False  # ENG-PG 须修 DSN 或网络
        print("DB: OK — PostgreSQL SELECT 1 成功（仍需人工备份/迁移验收，见 docs/手册-C 内 §1.4 / ENG-PG）")  # 说明局限
        return True  # 通过
    print(f"DB: SQLite 模式 — 文件 {DB_PATH} exists={DB_PATH.exists()}（生产须文件权限与备份，见 docs/手册-A 内验收 §4）")  # 提示
    return True  # 无连接失败概念


def main() -> int:  # 入口
    os.chdir(_BACKEND_ROOT)  # 相对路径与 migrate 一致
    if not _check_jwt():  # SEC-01
        return 1  # 失败码
    _check_cors_hint()  # OPS-ENV 提示
    if not _check_database():  # ENG-PG
        return 1  # 失败码
    print("verify_release_env: 脚本项完成。口令更换、HTTPS、VITE_*、走查仍须人工（TC-EXEC / 手册-A 验收 §2～§4）。")  # 收尾
    return 0  # 成功


if __name__ == "__main__":  # CLI
    raise SystemExit(main())  # 退出码
