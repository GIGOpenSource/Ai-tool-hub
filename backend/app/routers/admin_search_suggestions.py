# 管理后台 — 首页搜索联想词 search_suggestion 表 CRUD（对齐 GET /api/search-suggestions）
from __future__ import annotations

import sqlite3  # SQLite 唯一约束异常
from typing import Any  # 开放 JSON 形态

from fastapi import APIRouter, Depends, HTTPException, Query  # 路由、403、查询
from pydantic import BaseModel, Field, model_validator  # 入参校验

from app.db import get_db  # 短连接
from app.db_util import is_pg_adapter  # 区分 PG 与 SQLite 的列名/占位
from app.deps_auth import get_current_admin  # 管理员 JWT

router = APIRouter(prefix="/admin", tags=["admin"])  # 挂载 /api/admin/*


class SearchSuggestionOut(BaseModel):
    model_config = {"extra": "forbid"}  # 禁止未知字段

    id: int  # 主键
    text: str  # 联想词正文（与表列 text 对应）
    sort_order: int  # 排序权重


class SearchSuggestionPostBody(BaseModel):
    model_config = {"extra": "forbid"}  # 禁止未知字段

    text: str = Field(..., min_length=1, max_length=500)  # 非空、上限防滥用
    sort_order: int = Field(default=0, ge=-10_000, le=10_000)  # 合理整数区间


class SearchSuggestionPutBody(BaseModel):
    model_config = {"extra": "forbid"}  # 禁止未知字段

    id: int = Field(..., ge=1)  # 目标行
    text: str | None = Field(default=None, min_length=1, max_length=500)  # 可选改文案
    sort_order: int | None = Field(default=None, ge=-10_000, le=10_000)  # 可选改排序

    @model_validator(mode="after")  # 至少改一项
    def _need_patch(self) -> SearchSuggestionPutBody:  # 自引用返回
        if self.text is None and self.sort_order is None:  # 全空则无意义
            raise ValueError("need_text_or_sort_order")  # 交给 FastAPI 422
        return self  # 通过


def _is_unique_violation(exc: BaseException) -> bool:  # 判断是否唯一键冲突
    if isinstance(exc, sqlite3.IntegrityError):  # SQLite
        return "UNIQUE" in str(exc).upper()  # 排除非 UNIQUE 的 IntegrityError
    if type(exc).__name__ == "UniqueViolation":  # psycopg 无需强依赖 import 路径
        return True  # PG 唯一冲突
    mod = getattr(exc, "__module__", "")  # 模块名兜底
    if mod.startswith("psycopg") and "UniqueViolation" in type(exc).__name__:  # 子类名
        return True  # 视为重复 text
    return False  # 其它错误向上抛


def _rows_list(conn: object) -> list[SearchSuggestionOut]:  # 统一列表查询
    if is_pg_adapter(conn):  # PostgreSQL：列名 text 须双引号
        rows = conn.execute(  # 按运营排序再 id
            'SELECT id, "text" AS suggestion_text, sort_order FROM search_suggestion ORDER BY sort_order, id',
        ).fetchall()  # 可能为空
    else:  # SQLite：text 为普通列名
        rows = conn.execute(  # 同上排序
            "SELECT id, text AS suggestion_text, sort_order FROM search_suggestion ORDER BY sort_order, id",
        ).fetchall()  # 可能为空
    return [  # 映射为响应模型
        SearchSuggestionOut(id=int(r["id"]), text=str(r["suggestion_text"]), sort_order=int(r["sort_order"]))
        for r in rows
    ]  # 列表


def _insert_row(conn: object, text: str, sort_order: int) -> int:  # 插入并返回新 id
    if is_pg_adapter(conn):  # PostgreSQL
        row = conn.execute(  # RETURNING 取 id
            'INSERT INTO search_suggestion ("text", sort_order) VALUES (%s, %s) RETURNING id',
            (text, sort_order),
        ).fetchone()  # 单行
        if row is None:  # 不应发生
            raise RuntimeError("insert search_suggestion: no returning id")  # 硬错误
        return int(row[0])  # 新主键
    conn.execute(  # SQLite 常规插入
        "INSERT INTO search_suggestion (text, sort_order) VALUES (?, ?)",
        (text, sort_order),
    )  # 执行
    rid = conn.execute("SELECT last_insert_rowid()").fetchone()  # 取自增 id
    if rid is None:  # 不应发生
        raise RuntimeError("insert search_suggestion: last_insert_rowid failed")  # 硬错误
    return int(rid[0])  # 新主键


def _update_row(conn: object, row_id: int, text: str | None, sort_order: int | None) -> bool:  # 无此行返回 False
    hit = conn.execute("SELECT 1 FROM search_suggestion WHERE id = ?", (row_id,)).fetchone()  # 存在性
    if hit is None:  # id 不存在
        return False  # 上层 404
    if text is not None and sort_order is not None:  # 双字段更新
        if is_pg_adapter(conn):  # PG：列 text 加引号
            conn.execute(  # 按 id 写回
                'UPDATE search_suggestion SET "text" = %s, sort_order = %s WHERE id = %s',
                (text, sort_order, row_id),
            )  # 无占位 ? 故不经 ?→%s
        else:  # SQLite
            conn.execute(  # 按 id 写回
                "UPDATE search_suggestion SET text = ?, sort_order = ? WHERE id = ?",
                (text, sort_order, row_id),
            )  # 执行
        return True  # 已确认存在
    if text is not None:  # 仅改文案
        if is_pg_adapter(conn):  # PG
            conn.execute('UPDATE search_suggestion SET "text" = %s WHERE id = %s', (text, row_id))  # 单字段
        else:  # SQLite
            conn.execute("UPDATE search_suggestion SET text = ? WHERE id = ?", (text, row_id))  # 单字段
        return True  # 已确认存在
    if sort_order is not None:  # 仅改排序
        conn.execute(  # 两方言共用 ? 占位
            "UPDATE search_suggestion SET sort_order = ? WHERE id = ?",
            (sort_order, row_id),
        )  # 适配器负责 PG 的 %s
        return True  # 已确认存在
    return False  # 不应到达（校验已拦）


@router.get("/search-suggestions")  # 列表
def admin_list_search_suggestions(
    _admin: dict = Depends(get_current_admin),  # 须管理员
) -> dict[str, Any]:
    with get_db() as conn:  # 单次连接
        items = _rows_list(conn)  # 查全表
    return {"items": [m.model_dump() for m in items]}  # JSON 数组


@router.post("/search-suggestions")  # 新增一行
def admin_post_search_suggestion(
    body: SearchSuggestionPostBody,
    _admin: dict = Depends(get_current_admin),
) -> dict[str, Any]:
    t = body.text.strip()  # 去首尾空白
    if not t:  # 不允许纯空白
        raise HTTPException(status_code=400, detail="empty_text")  # 400
    try:  # 捕获唯一冲突
        with get_db() as conn:  # 写连接
            new_id = _insert_row(conn, t, int(body.sort_order))  # 插入
            conn.commit()  # 提交
    except Exception as e:  # 唯一键或其它
        if _is_unique_violation(e):  # 重复 text
            raise HTTPException(status_code=409, detail="duplicate_text") from e  # 409
        raise  # 其它原样抛出
    return {"id": new_id, "success": True}  # 供前端可选展示


@router.put("/search-suggestions")  # 按 id 部分更新
def admin_put_search_suggestion(
    body: SearchSuggestionPutBody,
    _admin: dict = Depends(get_current_admin),
) -> dict[str, bool]:
    patch_text: str | None = None  # 规范化后的文案
    if body.text is not None:  # 请求携带 text
        patch_text = body.text.strip()  # 去空白
        if not patch_text:  # 不允许改成语义空串
            raise HTTPException(status_code=400, detail="empty_text")  # 400
    try:  # 唯一冲突
        with get_db() as conn:  # 写
            ok = _update_row(conn, body.id, patch_text, body.sort_order)  # 执行
            if not ok:  # id 不存在
                raise HTTPException(status_code=404, detail="not_found")  # 404
            conn.commit()  # 提交
    except HTTPException:  # 显式 HTTP 错误直接向上
        raise  # 不重包
    except Exception as e:  # DB 层
        if _is_unique_violation(e):  # 改 text 撞唯一
            raise HTTPException(status_code=409, detail="duplicate_text") from e  # 409
        raise  # 其它
    return {"success": True}  # 完成


@router.delete("/search-suggestions")  # 按 id 删除
def admin_delete_search_suggestion(
    suggestion_id: int = Query(..., alias="id", ge=1),  # 查询参数 id
    _admin: dict = Depends(get_current_admin),
) -> dict[str, bool]:
    with get_db() as conn:  # 写
        hit = conn.execute("SELECT 1 FROM search_suggestion WHERE id = ?", (suggestion_id,)).fetchone()  # 存在性
        if hit is None:  # 无此行
            raise HTTPException(status_code=404, detail="not_found")  # 404
        conn.execute("DELETE FROM search_suggestion WHERE id = ?", (suggestion_id,))  # 物理删除
        conn.commit()  # 提交
    return {"success": True}  # 完成
