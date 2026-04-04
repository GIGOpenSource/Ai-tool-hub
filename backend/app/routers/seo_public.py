"""公开 SEO 路由：sitemap.xml 与 robots.txt（站点根 URL 由环境变量 PUBLIC_SITE_URL 指定）。"""
from __future__ import annotations

import json  # 解析 site_json 中的 SEO 配置
import os  # 读 PUBLIC_SITE_URL
from typing import Any  # robots 配置 JSON 形态
from urllib.parse import quote  # path 段编码，防 slug 含保留字符时破坏 URL
from xml.sax.saxutils import escape as xml_escape  # loc 等节点文本须转义 & < >

from fastapi import APIRouter  # 路由注册
from fastapi.responses import Response  # 返回 text/xml 与 text/plain

from app.db import get_db  # 读 site_json 与动态 URL 数据源

router = APIRouter(tags=["seo"])  # 与 main 挂载前缀组合成完整路径

# 无 site_json.seo_sitemap_static 或 urls 无效时使用的静态路径（path, priority, changefreq）
_DEFAULT_SITEMAP_STATIC: tuple[tuple[str, str, str], ...] = (
    ("/", "1.0", "weekly"),
    ("/compare", "0.85", "weekly"),
    ("/submit", "0.7", "weekly"),
    ("/sitemap", "0.5", "weekly"),
    ("/guide", "0.6", "weekly"),
    ("/more", "0.5", "weekly"),
    ("/support/faq", "0.4", "monthly"),
    ("/support/contact", "0.4", "monthly"),
    ("/support/privacy", "0.3", "yearly"),
    ("/support/terms", "0.3", "yearly"),
)


def _public_site_origin() -> str:
    """前台站点根（无尾斜杠）；未配置时与本地 Vite 默认一致。"""
    return os.environ.get("PUBLIC_SITE_URL", "http://127.0.0.1:5173").rstrip("/")  # 环境优先


def _static_sitemap_entries(conn: object) -> list[tuple[str, str, str]]:
    """读 site_json.seo_sitemap_static.urls；无效或空列表则回退 _DEFAULT_SITEMAP_STATIC。"""
    row = conn.execute(  # 取整包 JSON
        "SELECT payload_json FROM site_json WHERE content_key = ?",
        ("seo_sitemap_static",),
    ).fetchone()  # 可能无行
    if not row or not row[0]:  # 缺行或空串
        return list(_DEFAULT_SITEMAP_STATIC)  # 常量回退
    try:  # 解析
        data = json.loads(row[0])  # 对象期望含 urls
    except (json.JSONDecodeError, TypeError):  # 损坏
        return list(_DEFAULT_SITEMAP_STATIC)  # 回退
    urls = data.get("urls")  # 列表
    if not isinstance(urls, list):  # 类型不对
        return list(_DEFAULT_SITEMAP_STATIC)  # 回退
    out: list[tuple[str, str, str]] = []  # 累积合法行
    for u in urls:  # 逐项
        if not isinstance(u, dict):  # 非对象跳过
            continue  # 下一项
        p = str(u.get("path") or "").strip()  # path 必填
        if not p.startswith("/"):  # 须站内绝对路径
            continue  # 丢弃
        prio = str(u.get("priority") or "0.5").strip()  # 默认中权
        ch = str(u.get("changefreq") or "weekly").strip()  # 默认周更
        out.append((p, prio, ch))  # 入列
    return out if out else list(_DEFAULT_SITEMAP_STATIC)  # 全丢则回退


def _lastmod_date(created_at: str | None) -> str | None:
    """从 tool.created_at 等取 YYYY-MM-DD；无法识别则省略 lastmod 节点。"""
    if not created_at:  # 空
        return None  # 不写 lastmod
    s = str(created_at).strip()  # 规范化
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":  # 前缀像 ISO 日期
        head = s[:10]  # 取前 10 位
        if head.replace("-", "").isdigit():  # 数字校验
            return head  # W3C DATE 格式
    return None  # 不写


def _loc_xml(base: str, path: str) -> str:
    """静态 path 拼绝对 URL 并做 XML 文本转义。"""
    full = f"{base}{path}"  # 无编码 path 已以 / 开头
    return xml_escape(full)  # & < > 等


def _tool_url_xml(base: str, slug: str) -> str:
    """工具详情 URL：slug 做 path 段编码后再拼 loc 并转义。"""
    enc = quote(str(slug), safe="")  # 保留字转义
    full = f"{base}/tool/{enc}"  # 与前台路由一致
    return xml_escape(full)  # XML 安全


def _compare_url_xml(base: str, slug: str) -> str:
    """对比落地页 URL。"""
    enc = quote(str(slug), safe="")  # 段编码
    full = f"{base}/compare/{enc}"  # 与前台 /compare/:toolName 一致
    return xml_escape(full)  # XML 安全


def _url_entry(loc_inner: str, changefreq: str, priority: str, lastmod: str | None) -> str:
    """单条 url 元素；loc_inner 已为转义后的文本内容。"""
    cf = xml_escape(changefreq)  # 运营可配，须转义
    pr = xml_escape(priority)  # 同上
    parts = [f"  <url><loc>{loc_inner}</loc>"]  # 开头
    if lastmod:  # 可选
        parts.append(f"<lastmod>{xml_escape(lastmod)}</lastmod>")  # 日期也转义
    parts.append(f"<changefreq>{cf}</changefreq><priority>{pr}</priority></url>")  # 收尾
    return "".join(parts)  # 单行紧凑


def _load_seo_robots_config(conn: object) -> dict[str, Any] | None:
    """读 site_json.seo_robots；无行或非法则 None（走默认 robots 模板）。"""
    row = conn.execute(  # 取配置包
        "SELECT payload_json FROM site_json WHERE content_key = ?",
        ("seo_robots",),
    ).fetchone()  # 可空
    if not row or not row[0]:  # 未配置
        return None  # 默认模板
    try:  # 解析
        data = json.loads(row[0])  # 期望对象
    except (json.JSONDecodeError, TypeError):  # 坏 JSON
        return None  # 默认模板
    if not isinstance(data, dict):  # 须对象
        return None  # 默认模板
    return data  # 供 robots 组装


def _robots_txt_from_config(conn: object, base: str) -> str:
    """按 seo_robots 与默认规则生成 robots.txt 正文（UTF-8 文本）。"""
    default_sitemap = f"{base}/api/seo/sitemap.xml"  # 默认声明本 API 上的 XML
    cfg = _load_seo_robots_config(conn)  # 可空
    if cfg:  # 有配置对象
        raw = cfg.get("raw_body")  # 全文覆盖
        if isinstance(raw, str) and raw.strip() != "":  # 非空串
            body = raw.strip()  # 去首尾空白
            if not body.endswith("\n"):  # 文件惯例末行换行
                body += "\n"  # 补换行
            return body  # 运营完全自控
    lines: list[str] = ["User-agent: *", "Allow: /"]  # 默认放行全站
    if cfg:  # 追加 Disallow
        dis = cfg.get("disallow_paths")  # 路径列表
        if isinstance(dis, list):  # 须数组
            for p in dis:  # 逐项
                if not isinstance(p, str):  # 跳过非串
                    continue  # 下一项
                pt = p.strip()  # 规范化
                if pt.startswith("/"):  # 仅接受站内路径形
                    lines.append(f"Disallow: {pt}")  # 写入禁止规则
    sm_list: list[str] = []  # Sitemap 绝对 URL 列表
    if cfg:  # 从配置取多地址
        multi = cfg.get("sitemap_urls")  # 多 sitemap
        if isinstance(multi, list) and len(multi) > 0:  # 非空数组优先
            for u in multi:  # 逐项
                if isinstance(u, str) and u.strip().startswith(("http://", "https://")):  # 须绝对 URL
                    sm_list.append(u.strip())  # 收录
        one = cfg.get("sitemap_url")  # 单条覆盖
        if not sm_list and isinstance(one, str) and one.strip().startswith(("http://", "https://")):  # 有合法单条
            sm_list.append(one.strip())  # 单条模式
    if not sm_list:  # 未配置则用默认
        sm_list = [default_sitemap]  # 一条
    for su in sm_list:  # 每条一行 Sitemap:
        lines.append(f"Sitemap: {su}")  # 规范键名
    return "\n".join(lines) + "\n"  # 末行换行


@router.get("/seo/sitemap.xml")
def seo_sitemap_xml() -> Response:
    """聚合静态 path、已上架工具详情、对比落地页；loc 均 XML 转义，工具行可带 lastmod。"""
    base = _public_site_origin()  # 根 URL
    parts: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    with get_db() as conn:  # 单次连接读完
        for path, prio, chfreq in _static_sitemap_entries(conn):  # 静态段
            loc = _loc_xml(base, path)  # 转义后 loc 内容
            parts.append(_url_entry(loc, chfreq, prio, None))  # 一般无 lastmod
        for row in conn.execute(  # 动态工具
            "SELECT slug, created_at FROM tool WHERE moderation_status = 'active' ORDER BY slug ASC"
        ):  # 全量上架
            slug = row["slug"]  # 展示用 slug
            lm = _lastmod_date(row["created_at"] if row["created_at"] else None)  # 可选日期
            loc = _tool_url_xml(base, slug)  # 编码 + 转义
            parts.append(_url_entry(loc, "weekly", "0.9", lm))  # 详情页默认权
        for row in conn.execute("SELECT slug FROM comparison_page ORDER BY slug ASC"):  # 对比页
            slug = row["slug"]  # slug
            loc = _compare_url_xml(base, slug)  # 编码 + 转义
            parts.append(_url_entry(loc, "weekly", "0.85", None))  # 无 lastmod
    parts.append("</urlset>")  # 闭合
    xml = "\n".join(parts) + "\n"  # 末换行
    return Response(content=xml, media_type="application/xml")  # 标准 XML 类型


@router.get("/seo/robots.txt")
def seo_robots_txt() -> Response:
    """默认放行全站并声明 Sitemap；可通过 site_json.seo_robots 覆盖正文或 Sitemap 地址。"""
    base = _public_site_origin()  # 与 sitemap 同源根
    with get_db() as conn:  # 读 seo_robots
        text = _robots_txt_from_config(conn, base)  # 组装正文
    return Response(content=text, media_type="text/plain; charset=utf-8")  # 纯文本
