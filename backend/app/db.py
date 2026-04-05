"""数据库连接：默认 SQLite 单文件；设置 DATABASE_URL=postgresql://… 时切换 PostgreSQL。"""
from __future__ import annotations

import os  # 读 DATABASE_URL（与 is_postgresql 一致）
import re  # 校验动态表名，防 SQL 标识符注入
import sqlite3  # 本地默认后端
from contextlib import contextmanager  # get_db 上下文管理器
from typing import Iterator  # get_db 产出类型

from app.db_util import (  # PG 适配与工具函数
    PgConnectionAdapter,  # 包装 psycopg 连接
    insert_returning_id,  # 种子/投稿取新 id（再导出给路由）
    is_postgresql,  # 是否走 PG
    split_pg_schema_statements,  # 切 schema.pg.sql
    table_column_names,  # PRAGMA / information_schema 列名
)
from app.migrate import apply_migrations  # 启动与 PG 初始化后增量迁移
from app.paths import DB_PATH, SQL_DIR  # SQLite 路径与 sql/ 目录

_SAFE_SQL_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")  # 未加引号的合法表名（种子仅传 tool 等）


def _schema_sqlite_text() -> str:
    """读取 sql/schema.sql，供 SQLite init 整本 executescript。"""
    return (SQL_DIR / "schema.sql").read_text(encoding="utf-8")  # UTF-8 固定编码


def _init_db_sqlite() -> None:
    """SQLite：建父目录、建表、apply_migrations、短连接后即关。"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)  # 确保 data/ 存在
    conn = sqlite3.connect(DB_PATH)  # 单文件连接
    try:
        conn.executescript(_schema_sqlite_text())  # DDL 一次执行
        conn.row_factory = sqlite3.Row  # 下游统一按列名取下标
        apply_migrations(conn)  # 补列与站点 JSON 默认行
        conn.commit()  # 持久化
    finally:
        conn.close()  # 释放句柄


def _init_db_postgresql() -> None:
    """PostgreSQL：执行 schema.pg.sql 全 DDL，再在同一事务内跑 apply_migrations。"""
    import psycopg  # 仅选 PG 时依赖（SQLite 环境可不装）

    raw = (SQL_DIR / "schema.pg.sql").read_text(encoding="utf-8")  # 读 PG 专用结构文件
    dsn = (os.environ.get("DATABASE_URL") or "").strip()  # 与 get_db 相同来源
    conn = psycopg.connect(dsn, autocommit=False)  # 显式事务
    try:
        for stmt in split_pg_schema_statements(raw):  # 分句执行
            conn.execute(stmt)  # psycopg3 Connection.execute
        adap = PgConnectionAdapter(conn)  # 迁移层仍用 ? 占位风格
        apply_migrations(adap)  # 与 SQLite 共用逻辑（列已齐则 ADD 跳过）
        conn.commit()  # 提交 DDL+migrate
    except Exception:  # 失败回滚，避免半结构库
        conn.rollback()  # 撤消本事务
        raise  # 向上抛便于日志
    finally:
        conn.close()  # 关闭 init 专用连接


def init_db() -> None:
    """进程启动时调用：按环境选择 SQLite 或 PostgreSQL 初始化路径。"""
    if is_postgresql():  # 优先读 DATABASE_URL
        _init_db_postgresql()  # 远端/容器 PG
        return  # 不碰本地 DB_PATH
    _init_db_sqlite()  # 默认本地文件


@contextmanager
def get_db() -> Iterator[sqlite3.Connection | PgConnectionAdapter]:
    """请求内 yield 连接，退出 with 后关闭；PG 与 SQLite 统一用 execute(..., (参数,))。"""
    if is_postgresql():  # PostgreSQL
        import psycopg  # 与 init 一致惰性导入

        dsn = (os.environ.get("DATABASE_URL") or "").strip()  # DSN 必填
        raw = psycopg.connect(dsn, autocommit=False)  # 每请求一连接（与原先 SQLite 一致）
        try:
            yield PgConnectionAdapter(raw)  # 翻译 SQL 与 Row 形态
        finally:
            raw.close()  # 释放
        return  # 结束 PG 分支
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)  # SQLite 父目录
    conn = sqlite3.connect(DB_PATH)  # 打开/创建文件
    conn.row_factory = sqlite3.Row  # 列名访问
    try:
        yield conn  # 调用方主体
    finally:
        conn.close()  # 关闭


def table_nonempty(conn: sqlite3.Connection | PgConnectionAdapter, name: str) -> bool:
    """表内是否至少一行（种子逻辑用于跳过重复导入）；name 须为可信标识符。"""
    if not _SAFE_SQL_IDENT.fullmatch(name):  # 非字母数字下划线起头的表名拒绝拼接
        raise ValueError("unsafe_table_name")  # 仅应由 migrate/seed 传入字面量表名
    row = conn.execute(f"SELECT 1 FROM {name} LIMIT 1").fetchone()  # 任意一行即可
    return row is not None  # 有数据为 True
