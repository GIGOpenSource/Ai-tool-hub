"""管理后台 — 按 pathname 配置全站 SEO（存 site_json.page_seo）。"""
from __future__ import annotations

import json  # 序列化写入 SQLite

from fastapi import APIRouter, Depends  # 路由与管理员依赖注入
from pydantic import BaseModel, Field  # 请求体验证

from app.db import get_db  # 数据库上下文
from app.deps_auth import get_current_admin  # JWT 管理员校验
from app.page_catalog import (  # 路径归一与页面标签
    build_tracked_path_list,
    labels_for_path,
    normalize_page_path,
    tool_slug_title_map,
)

router = APIRouter(prefix="/admin", tags=["admin"])  # 挂到 /api/admin/*
_PAGE_SEO_KEY = "page_seo"  # site_json 主键
_ALLOWED_ENTRY_KEYS = frozenset(  # 允许写入的字段名（防垃圾键）
    {
        "title",
        "title_zh",
        "title_en",
        "description",
        "description_zh",
        "description_en",
        "keywords",
        "keywords_zh",
        "keywords_en",
        "og_title",
        "og_title_zh",
        "og_title_en",
        "og_description",
        "og_description_zh",
        "og_description_en",
        "og_image",
        "canonical",
        "og_url",
        "noindex",  # 填 1/true/yes 表示该 URL 写 robots noindex
        "og_type",  # website | article 等，传给 <meta og:type>
    }
)


def _load_page_seo_payload(conn) -> dict:  # noqa: ANN001 — sqlite3.Connection 与 Row
    """读取 page_seo JSON 对象；行缺失时返回空 dict。"""
    row = conn.execute(  # 按主键查询一行
        "SELECT payload_json FROM site_json WHERE content_key = ?",
        (_PAGE_SEO_KEY,),
    ).fetchone()
    if not row or not row[0]:  # 无行或空 payload
        return {}
    try:  # 解析 JSON
        data = json.loads(row[0])
    except (json.JSONDecodeError, TypeError):  # 损坏时当空
        return {}
    return data if isinstance(data, dict) else {}  # 仅接受对象


def _clean_string_map(raw: dict) -> dict:
    """只保留允许键与非空字符串，strip 后写库。"""
    out: dict = {}
    for k, v in raw.items():  # 遍历运营提交的键值
        if k not in _ALLOWED_ENTRY_KEYS:  # 丢弃未知键
            continue
        if not isinstance(v, str):  # 仅字符串
            continue
        s = v.strip()  # 去首尾空白
        if s:  # 空串不写库（等同删除该字段）
            out[str(k)] = s
    return out


def _normalize_entries_payload(raw: dict) -> dict:
    """归一 pathname 键并过滤条目；忽略非 dict 值。"""
    result: dict = {}
    if not isinstance(raw, dict):  # 顶层必须是对象
        return result
    for path_key, entry in raw.items():  # path → SEO 字段对象
        if not isinstance(path_key, str):  # 键须为路径字符串
            continue
        norm = normalize_page_path(path_key)  # 与埋点、前台一致
        if not isinstance(entry, dict):  # 值须为对象
            continue
        cleaned = _clean_string_map(entry)  # 清洗字段
        if cleaned:  # 全空则不要该 path
            result[norm] = cleaned
    return result


class PageSeoPutBody(BaseModel):
    """整表替换写入（仅包含有内容的 path）。"""

    entries: dict = Field(default_factory=dict)  # path → 字段


@router.get("/page-seo")
def admin_get_page_seo(_admin: dict = Depends(get_current_admin)) -> dict:
    """返回站内路径清单、展示标签、以及当前 SEO 覆盖。"""
    with get_db() as conn:  # 短连接
        paths_ordered, config_labels = build_tracked_path_list(conn)  # 配置+静态+工具/对比
        tools = tool_slug_title_map(conn)  # slug→名称
        entries = _load_page_seo_payload(conn)  # 已保存覆盖
        seen = set(paths_ordered)  # 去重集合
        paths = list(paths_ordered)  # 先保持埋点同序
        for p in sorted(entries.keys()):  # 追加仅有 SEO 配置的自定义 path
            if p not in seen:
                seen.add(p)
                paths.append(p)
        path_labels: dict = {}
        for p in paths:  # 每 path 中英文展示名（表格用）
            zh, en = labels_for_path(p, tools, config_labels)
            path_labels[p] = {"zh": zh, "en": en}
    return {"paths": paths, "path_labels": path_labels, "entries": entries}


@router.put("/page-seo")
def admin_put_page_seo(
    body: PageSeoPutBody,
    _admin: dict = Depends(get_current_admin),
) -> dict:
    """保存 SEO 映射（归一 path、剔除空字段）。"""
    normalized = _normalize_entries_payload(body.entries)  # 清洗后的全表
    raw = json.dumps(normalized, ensure_ascii=False)  # 存 UTF-8 JSON 文本
    with get_db() as conn:
        conn.execute(  # upsert 单块配置
            "INSERT OR REPLACE INTO site_json (content_key, payload_json) VALUES (?, ?)",
            (_PAGE_SEO_KEY, raw),
        )
        conn.commit()  # 落盘
    return {"success": True, "count": len(normalized)}  # 返回保存条数
