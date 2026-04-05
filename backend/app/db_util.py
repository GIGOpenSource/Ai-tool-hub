# PostgreSQL 与 SQLite 共用的连接形态辅助：SQL 文本转换、PG 适配器、列自省
from __future__ import annotations

import os  # 读 DATABASE_URL
import sqlite3  # 判断原生 SQLite 连接
from typing import Any, Union  # Union 用于 MigrationConnection，避免 3.9 运行时求值 `A|B` 报错

try:  # Python 3.10+ 标准库
    from typing import TypeGuard  # 运行时收窄
except ImportError:  # pragma: no cover — 3.9 回退（须 requirements 中 typing_extensions）
    from typing_extensions import TypeGuard  # 与 CI 3.11 一致时走上一分支

# 与种子、后台路由中完全一致的 SQLite 片段 -> PostgreSQL 等价写法（先长后短，避免误替换）
_SQLITE_TO_PG_LITERALS: tuple[tuple[str, str], ...] = (
    (  # 演示订单日期：与 ensure_accounts 中 SQLite date() 对齐
        "date('now','-7 day')",
        "(CURRENT_DATE - INTERVAL '7 days')::TEXT",
    ),
    (
        "date('now','+23 day')",
        "(CURRENT_DATE + INTERVAL '23 days')::TEXT",
    ),
    (  # 全文翻译表幂等 upsert
        "INSERT OR REPLACE INTO translation (locale, msg_key, msg_value) VALUES (?, ?, ?)",
        "INSERT INTO translation (locale, msg_key, msg_value) VALUES (%s, %s, %s) "
        "ON CONFLICT (locale, msg_key) DO UPDATE SET msg_value = EXCLUDED.msg_value",
    ),
    (  # 与 seed_all 三引号内字符串逐字一致（含换行与缩进）
        "INSERT OR REPLACE INTO tool_alternative\n"
        "                       (tool_id, alternative_tool_id, sort_order) VALUES (?, ?, ?)",
        "INSERT INTO tool_alternative (tool_id, alternative_tool_id, sort_order) VALUES (%s, %s, %s) "
        "ON CONFLICT (tool_id, alternative_tool_id) DO UPDATE SET sort_order = EXCLUDED.sort_order",
    ),
    (
        "INSERT OR REPLACE INTO comparison_page (slug, payload_json) VALUES (?, ?)",
        "INSERT INTO comparison_page (slug, payload_json) VALUES (%s, %s) "
        "ON CONFLICT (slug) DO UPDATE SET payload_json = EXCLUDED.payload_json",
    ),
    (  # site_json 多处共用
        "INSERT OR REPLACE INTO site_json (content_key, payload_json) VALUES (?, ?)",
        "INSERT INTO site_json (content_key, payload_json) VALUES (%s, %s) "
        "ON CONFLICT (content_key) DO UPDATE SET payload_json = EXCLUDED.payload_json",
    ),
    (
        "INSERT OR REPLACE INTO locale_meta (code, label, flag_emoji) VALUES (?, ?, ?)",
        "INSERT INTO locale_meta (code, label, flag_emoji) VALUES (%s, %s, %s) "
        "ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, flag_emoji = EXCLUDED.flag_emoji",
    ),
    (  # 收藏幂等插入
        "INSERT OR IGNORE INTO user_favorite (user_id, tool_slug) VALUES (?, ?)",
        "INSERT INTO user_favorite (user_id, tool_slug) VALUES (%s, %s) "
        "ON CONFLICT (user_id, tool_slug) DO NOTHING",
    ),
    (  # 列名为 text，冲突目标须加双引号
        "INSERT OR IGNORE INTO search_suggestion (text, sort_order) VALUES (?, ?)",
        'INSERT INTO search_suggestion ("text", sort_order) VALUES (%s, %s) ON CONFLICT ("text") DO NOTHING',
    ),
)


def is_postgresql() -> bool:
    """当环境变量 DATABASE_URL 为 postgres 协议时走 PG 后端（否则仍为 SQLite 文件）。"""
    url = (os.environ.get("DATABASE_URL") or "").strip()  # 未设置则空串
    return url.startswith(("postgresql://", "postgres://"))  # psycopg 接受的两种前缀


def translate_sql(sql: str) -> str:
    """将手写 SQLite 片段转为 PostgreSQL（仅 PG 连接上调用；? -> %s）。"""
    s = sql.replace("datetime('now')", "CURRENT_TIMESTAMP")  # 表达式默认值与 INSERT 内时间
    for a, b in _SQLITE_TO_PG_LITERALS:  # 固定整句替换
        s = s.replace(a, b)  # 无匹配则保持原样
    if "INSERT OR REPLACE" in s or "INSERT OR IGNORE" in s:  # 漏网时便于排查
        raise ValueError(f"PostgreSQL 未翻译的 INSERT 方言片段: {s[:120]}...")
    s = s.replace("?", "%s")  # 占位符（须在字面量替换之后）
    return s  # 供 psycopg 执行


def split_pg_schema_statements(text: str) -> list[str]:
    """将 schema.pg.sql 按分号切成可逐条 execute 的 DDL（去掉空行与 -- 注释行）。"""
    lines: list[str] = []  # 累积非注释物理行
    for line in text.splitlines():  # 按行扫描
        st = line.strip()  # 去首尾空白
        if not st or st.startswith("--"):  # 空行或 SQL 行注释
            continue  # 跳过
        lines.append(line)  # 保留原始缩进无关紧要
    blob = "\n".join(lines)  # 再接成单段
    parts = [p.strip() for p in blob.split(";")]  # 分号分句
    return [p for p in parts if p]  # 去掉空语句


class PgConnectionAdapter:
    """包装 psycopg 连接：execute/executemany 走 translate_sql，返回的 Cursor 兼容 fetch/迭代。"""

    def __init__(self, conn: Any) -> None:  # Any：避免 object 无 cursor/commit 的静态误报（运行时由 psycopg 提供）
        self._conn = conn  # 底层 psycopg 同步连接（惰性导入期避免硬依赖类型包）

    def execute(self, sql: str, params: tuple[object, ...] | list[object] | None = None):  # -> psycopg.Cursor
        from psycopg.rows import Row  # 仅 PG 环境加载驱动

        t = translate_sql(sql)  # 方言与占位符
        p = tuple(params) if params is not None else ()  # executemany 之外统一元组
        cur = self._conn.cursor(row_factory=Row)  # 行形态对齐 sqlite3.Row
        cur.execute(t, p)  # 执行
        return cur  # 供链式 fetchone/fetchall/迭代

    def executemany(self, sql: str, seq: list) -> None:  # 批量（种子 translation / locale 等）
        from psycopg.rows import Row  # 与 execute 一致

        t = translate_sql(sql)  # 一次性转写
        cur = self._conn.cursor(row_factory=Row)  # 行工厂
        cur.executemany(t, seq)  # 逐参数绑定

    def commit(self) -> None:  # 与 sqlite 连接一致，供路由显式提交
        self._conn.commit()  # 提交事务

    def rollback(self) -> None:  # 失败时撤销未提交变更（与 sqlite3.Connection 对齐）
        self._conn.rollback()  # 回滚事务


MigrationConnection = Union[sqlite3.Connection, PgConnectionAdapter]  # 迁移/种子侧类型别名；用 Union 兼容 Py3.9 运行时


def is_pg_adapter(conn: object) -> TypeGuard[PgConnectionAdapter]:
    """判断是否为 PgConnectionAdapter（迁移与列自省分支用）。"""
    return isinstance(conn, PgConnectionAdapter)  # True 时 Pyright 将 conn 收窄为适配器


def table_column_names(conn: object, table: str) -> set[str]:
    """返回表当前列名集合（小写）；PG 用 information_schema，SQLite 用 PRAGMA。"""
    if is_pg_adapter(conn):  # PostgreSQL
        rows = conn.execute(  # public 下按表名过滤
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ?",
            (table,),
        ).fetchall()  # 多行
        return {str(r[0]).lower() for r in rows}  # 统一小写比对
    if not isinstance(conn, sqlite3.Connection):  # 防御
        raise TypeError("table_column_names: 仅支持 sqlite3.Connection 或 PgConnectionAdapter")
    return {r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}  # 第二列为列名


def insert_returning_id(conn: object, sql_insert: str, params: tuple[object, ...]) -> int:
    """执行单行 INSERT 并取新主键 id：PG 用 RETURNING，SQLite 用 last_insert_rowid。"""
    if is_pg_adapter(conn):  # PostgreSQL
        s = sql_insert.strip().rstrip(";")  # 去尾随分号便于拼接
        if "RETURNING" not in s.upper():  # 调用方未写 RETURNING 时自动补
            s = f"{s} RETURNING id"  # 约定自增主键列名为 id
        row = conn.execute(s, params).fetchone()  # 取一行
        if row is None:  # 不应发生
            raise RuntimeError("insert_returning_id: PostgreSQL 未返回行")
        return int(row[0])  # 第一列 id
    if not isinstance(conn, sqlite3.Connection):  # 防御
        raise TypeError("insert_returning_id: 仅支持 sqlite3.Connection 或 PgConnectionAdapter")
    conn.execute(sql_insert, params)  # 插入
    rid = conn.execute("SELECT last_insert_rowid()").fetchone()  # SQLite 取最近 rowid
    if rid is None:  # 不应发生
        raise RuntimeError("insert_returning_id: SQLite last_insert_rowid 失败")
    return int(rid[0])  # 转为 int
