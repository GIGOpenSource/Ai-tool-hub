#!/usr/bin/env python3
# 发布前/定时逻辑备份：SQLite 用 sqlite3.backup 热备单文件；PostgreSQL 调用 pg_dump（需本机可执行文件与 DATABASE_URL）。
from __future__ import annotations

import argparse  # CLI
import os  # DATABASE_URL、子进程环境
import subprocess  # 调用 pg_dump
import sys  # 退出码与 stderr
from datetime import datetime, timezone  # UTC 时间戳文件名
from pathlib import Path  # 路径拼接

# 以脚本所在目录定位 backend 根，便于 `python scripts/backup_database.py` 在 backend 下执行
_BACKEND_ROOT = Path(__file__).resolve().parent.parent  # backend/
if str(_BACKEND_ROOT) not in sys.path:  # 保证可导入 app.*
    sys.path.insert(0, str(_BACKEND_ROOT))  # 将 backend 置于 PYTHONPATH

from app.db_util import is_postgresql  # 是否走 PG
from app.paths import DB_PATH  # 默认 SQLite 文件路径


def _utc_stamp() -> str:
    # 文件名用 UTC，避免多时区运维混淆。
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")  # ISO 风格无冒号


def backup_sqlite(dest_dir: Path) -> Path:
    # 使用 SQLite Online Backup API，尽量不长时间锁库；目标目录须已存在或可创建。
    import sqlite3  # 仅在 SQLite 分支惰性导入

    if not DB_PATH.is_file():  # 源库不存在则无法备份
        print(f"ERROR: SQLite 库文件不存在: {DB_PATH}", file=sys.stderr)  # 提示路径
        sys.exit(2)  # 参数/环境错误类退出码
    dest_dir.mkdir(parents=True, exist_ok=True)  # 确保备份目录存在
    out = dest_dir / f"app_{_utc_stamp()}.db"  # 带时间戳的新文件
    src_conn = sqlite3.connect(str(DB_PATH))  # 打开源库
    try:
        dst_conn = sqlite3.connect(str(out))  # 创建目标空库
        try:
            src_conn.backup(dst_conn)  # 内核级拷贝页，较文件复制更安全
        finally:
            dst_conn.close()  # 先关目标
    finally:
        src_conn.close()  # 再关源
    return out  # 供打印成功信息


def backup_postgresql(dest_dir: Path) -> Path:
    # 依赖 PATH 中的 pg_dump；输出自定义格式（-Fc）便于 pg_restore。
    dsn = (os.environ.get("DATABASE_URL") or "").strip()  # 与运行时一致
    if not dsn:  # 不应发生：is_postgresql 已真
        print("ERROR: DATABASE_URL 为空", file=sys.stderr)  # 防御
        sys.exit(2)  # 配置错误
    dest_dir.mkdir(parents=True, exist_ok=True)  # 目录就绪
    out = dest_dir / f"pg_{_utc_stamp()}.dump"  # 自定义格式扩展名习惯
    cmd = ["pg_dump", "--dbname", dsn, "-Fc", "-f", str(out)]  # URI 作连接串
    r = subprocess.run(cmd, capture_output=True, text=True)  # 收集日志
    if r.returncode != 0:  # pg_dump 失败
        err = (r.stderr or r.stdout or "").strip()  # 合并可读输出
        print(f"ERROR: pg_dump 失败 (exit {r.returncode}): {err}", file=sys.stderr)  # 运维可见
        sys.exit(3)  # 外部命令失败
    return out  # 成功路径


def main() -> None:
    # 解析 --out-dir，默认 backend/data/backups/。
    p = argparse.ArgumentParser(description="备份 SQLite 或 PostgreSQL（见 DATABASE_URL）")  # 简短说明
    p.add_argument(
        "--out-dir",
        type=Path,
        default=_BACKEND_ROOT / "data" / "backups",
        help="备份输出目录（默认 backend/data/backups）",
    )  # 默认与 .gitignore 中忽略规则一致
    args = p.parse_args()  # 解析完成
    dest_dir = args.out_dir.resolve()  # 绝对路径便于日志
    if is_postgresql():  # 走 PG
        path = backup_postgresql(dest_dir)  # 调 pg_dump
    else:  # 默认 SQLite
        path = backup_sqlite(dest_dir)  # 热备单文件
    print(f"OK: {path}")  # 单行成功输出，便于 cron 采集


if __name__ == "__main__":  # 仅直接执行时跑 CLI
    main()  # 入口
