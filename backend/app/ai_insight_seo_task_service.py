# AI 分析报告 → 可审批 SEO 任务（page_seo / home_seo / seo_robots；源码建议仅 PR/CI）
from __future__ import annotations

import json  # 载荷与 LLM 输出解析
import re  # robots 补丁里逗号/换行拆列表
from datetime import datetime, timezone  # 审批/应用时间戳
from typing import Any  # JSON 形态

from app.page_catalog import normalize_page_path  # 与 Page SEO 页一致的路径键
from app.routers.admin_page_seo import (  # 复用清洗与归一（与 PUT /page-seo 同源）
    _clean_string_map,  # 仅允许字段、字符串 strip
    _load_page_seo_payload,  # 读当前 page_seo 全表
    _normalize_entries_payload,  # 全表 path 再归一
)

_PAGE_SEO_KEY = "page_seo"  # site_json 主键（与 admin_page_seo 一致）
_HOME_SEO_KEY = "home_seo"  # 顶栏与首页关键词块
_SEO_ROBOTS_KEY = "seo_robots"  # robots 运营块
_HOME_SEO_PATCH_KEYS = frozenset({"brand_title", "keywords", "brand_icon_emoji"})  # 与后台首页 SEO 表单一致
_SEO_ROBOTS_PATCH_KEYS = frozenset({"raw_body", "sitemap_url", "sitemap_urls", "disallow_paths"})  # 与校验器字段一致
_MAX_CODE_PR_FILES = 20  # 源码建议最多列文件条数

# 从报告抽取结构化任务的系统提示（须只产出 JSON 数组；路由层传入 LLM）
SEO_TASK_EXTRACT_SYSTEM = (
    "你是 SEO 与站点配置建议的结构化提取器。只输出 JSON，不要 Markdown、不要解释文字。\n"
    "输出格式：JSON 数组，最多 15 个元素。每个元素为对象，必须含字符串字段 task_type，取值仅限：\n"
    "page_seo — 单页 meta；须含 path（以 / 开头的站内路径）与 patch（对象）。patch 键只能：title, title_zh, title_en, "
    "description, description_zh, description_en, keywords, keywords_zh, keywords_en, og_title, og_title_zh, og_title_en, "
    "og_description, og_description_zh, og_description_en, og_image, canonical, og_url, noindex, og_type；值均为字符串。\n"
    "home_seo — 全站顶栏/首页关键词；须含 patch（对象）。patch 键只能：brand_title, keywords, brand_icon_emoji；值均为字符串。\n"
    "seo_robots — robots 运营块；须含 patch（对象）。键只能：raw_body, sitemap_url, sitemap_urls, disallow_paths；"
    "raw_body/sitemap_url 为字符串；sitemap_urls/disallow_paths 为字符串数组（路径须以 / 开头）。\n"
    "code_pr_hint — 涉及源码改动的建议，禁止期望在本系统内自动落盘；须含 summary（字符串），可选 files（数组），"
    "files 每项为对象含 path（仓库内路径）与 note（说明）。\n"
    "若无可用项，输出 []。不要编造报告中未出现的具体路径或字段。"
)  # 系统消息全文

_MAX_TASKS_GENERATE = 15  # 单次生成条数上限
_MAX_REPORT_CHARS = 14000  # 喂给抽取模型的报告长度上限


def utc_now_iso() -> str:  # 统一 UTC 文本时间
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")  # Zulu 风格


def strip_json_fenced_block(text: str) -> str:  # 去掉 ```json ... ``` 包裹
    s = text.strip()  # 首尾空白
    if not s.startswith("```"):  # 无围栏
        return s  # 原样
    lines = s.splitlines()  # 分行
    if not lines:  # 空
        return ""  # 空串
    if lines[0].startswith("```"):  # 首行围栏
        lines = lines[1:]  # 去掉首行
    if lines and lines[-1].strip() == "```":  # 尾行围栏
        lines = lines[:-1]  # 去掉尾行
    return "\n".join(lines).strip()  # 合并


def canonical_json_text(obj: dict[str, Any]) -> str:  # 审计比对用稳定序列化（键排序、无多余空白）
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))  # 与回滚比较一致


def load_site_json_object(conn: Any, content_key: str) -> dict[str, Any]:  # noqa: ANN401 — DB 连接
    """读取 site_json 单行对象；无行或损坏时返回空对象。"""
    row = conn.execute(  # 查块
        "SELECT payload_json FROM site_json WHERE content_key = ? LIMIT 1",  # 主键等值
        (content_key,),  # 键
    ).fetchone()  # 单行
    if not row:  # 无记录
        return {}  # 空对象
    raw = row[0] if isinstance(row, (list, tuple)) else row["payload_json"]  # 元组列序 / Row 名访问
    try:  # 解析
        data = json.loads(str(raw or "{}"))  # JSON
    except (json.JSONDecodeError, TypeError):  # 损坏
        return {}  # 空对象
    return data if isinstance(data, dict) else {}  # 须对象


def persist_site_json_object(conn: Any, content_key: str, payload: dict[str, Any]) -> None:  # noqa: ANN401
    """整键覆盖写入 site_json（与站点 JSON 管理 PUT 同语义）。"""
    raw = json.dumps(payload, ensure_ascii=False)  # UTF-8 文本
    conn.execute(  # upsert
        "INSERT OR REPLACE INTO site_json (content_key, payload_json) VALUES (?, ?)",  # 单行
        (content_key, raw),  # 键值
    )  # 执行


def _detect_llm_task_type(it: dict[str, Any]) -> str:  # 从元素推断 task_type 小写蛇形
    tt = it.get("task_type") if "task_type" in it else it.get("type")  # 兼容 type 别名
    if isinstance(tt, str) and tt.strip():  # 显式类型
        return tt.strip().lower().replace("-", "_")  # 规范化
    if isinstance(it.get("path"), str) and isinstance(it.get("patch"), dict):  # 旧版仅 path+patch
        return "page_seo"  # 视为单页任务
    return ""  # 无法识别


def _stringify_patch_values(patch_raw: dict[str, Any]) -> dict[str, str]:  # 将 patch 值统一为 str（page/home 用）
    out: dict[str, str] = {}  # 输出
    for pk, pv in patch_raw.items():  # 逐项
        if isinstance(pv, str):  # 已是字符串
            out[str(pk)] = pv  # 写入
        elif isinstance(pv, (int, float, bool)) or pv is None:  # 标量
            out[str(pk)] = "" if pv is None else str(pv)  # 字符串化
        else:  # 嵌套等跳过
            continue  # 下一键
    return out  # 返回


def _normalize_seo_robots_patch_value(key: str, v: Any) -> Any | None:  # 单键归一；无效返回 None 表示跳过
    if key in ("raw_body", "sitemap_url"):  # 纯字符串键
        if v is None:  # 省略
            return None  # 不合并
        return str(v).strip() if str(v).strip() else None  # 空串当跳过
    if key in ("sitemap_urls", "disallow_paths"):  # 字符串列表
        if v is None:  # 省略
            return None  # 跳过
        if isinstance(v, list):  # 已是数组
            acc: list[str] = []  # 累积
            for x in v:  # 逐项
                if isinstance(x, str) and x.strip():  # 非空串
                    acc.append(x.strip())  # 收集
                elif x is not None and not isinstance(x, (dict, list)):  # 标量
                    s = str(x).strip()  # 转串
                    if s:  # 非空
                        acc.append(s)  # 收集
            return acc if acc else None  # 空列表当跳过
        if isinstance(v, str):  # 模型偶发单串：按换行或逗号拆
            parts = [p.strip() for p in re.split(r"[\n,]+", v) if p.strip()]  # 拆分
            return parts if parts else None  # 无则跳过
        return None  # 其它类型跳过
    return None  # 未知键


def merge_seo_robots_in_memory(current: dict[str, Any], patch_raw: Any) -> dict[str, Any]:  # 内存合并 robots 块
    base = dict(current) if isinstance(current, dict) else {}  # 拷贝基底
    if not isinstance(patch_raw, dict):  # 补丁须对象
        return base  # 不改
    merged = {**base}  # 浅拷贝
    for k, v in patch_raw.items():  # 遍历补丁
        sk = str(k)  # 键名
        if sk not in _SEO_ROBOTS_PATCH_KEYS:  # 非白名单
            continue  # 忽略
        nv = _normalize_seo_robots_patch_value(sk, v)  # 归一
        if nv is not None:  # 有有效值
            merged[sk] = nv  # 覆盖或新增
    return merged  # 合并结果


def merge_home_seo_in_memory(current: dict[str, Any], patch_raw: Any) -> dict[str, Any]:  # 内存合并 home_seo
    base = dict(current) if isinstance(current, dict) else {}  # 基底
    if not isinstance(patch_raw, dict):  # 补丁须对象
        return base  # 不改
    merged = {**base}  # 浅拷贝
    str_map = _stringify_patch_values(patch_raw)  # 统一字符串
    for k, v in str_map.items():  # 仅白名单
        if k in _HOME_SEO_PATCH_KEYS:  # 允许键
            merged[k] = v  # 写入（含空串以清空）
    return merged  # 结果


def parse_task_array_from_llm_text(raw: str) -> list[dict[str, Any]]:  # 解析模型输出为任务草案列表（含 kind/title/payload）
    s = strip_json_fenced_block(raw)  # 去围栏
    try:  # 解析 JSON
        data = json.loads(s)  # 须为数组
    except (json.JSONDecodeError, TypeError) as e:  # 非法
        raise ValueError(f"seo_task_llm_json_invalid:{e}") from e  # 上层转 502
    if not isinstance(data, list):  # 须数组
        raise ValueError("seo_task_llm_not_array")  # 约定错误码
    out: list[dict[str, Any]] = []  # 输出
    for it in data[:_MAX_TASKS_GENERATE]:  # 截断条数
        if not isinstance(it, dict):  # 跳过非对象
            continue  # 下一项
        ttype = _detect_llm_task_type(it)  # 识别类型
        if ttype == "page_seo":  # 单页
            path_raw = it.get("path")  # 路径
            if not isinstance(path_raw, str) or not path_raw.strip():  # 无效
                continue  # 跳过
            patch_raw = it.get("patch")  # 补丁
            if not isinstance(patch_raw, dict):  # 须对象
                continue  # 跳过
            patch_str = _stringify_patch_values(patch_raw)  # 转 str
            cleaned = _clean_string_map(patch_str)  # page_seo 字段白名单
            if not cleaned:  # 无有效字段
                continue  # 跳过
            norm = normalize_page_path(path_raw.strip())  # 归一路径键
            if not norm.startswith("/"):  # 防御
                continue  # 跳过
            out.append(  # 一条
                {
                    "kind": "page_seo_patch",  # DB kind
                    "title": f"page_seo {norm}",  # 展示标题
                    "payload": {"path": norm, "patch": cleaned},  # 存库结构
                }
            )  # 结束 append
        elif ttype == "home_seo":  # 首页块
            patch_raw = it.get("patch")  # 补丁
            if not isinstance(patch_raw, dict):  # 须对象
                continue  # 跳过
            patch_str = _stringify_patch_values(patch_raw)  # 统一 str
            hp = {k: v for k, v in patch_str.items() if k in _HOME_SEO_PATCH_KEYS}  # 白名单
            if not hp:  # 无有效键
                continue  # 跳过
            out.append(  # 一条
                {"kind": "home_seo_patch", "title": "home_seo", "payload": {"patch": hp}}  # 载荷
            )  # append
        elif ttype in ("seo_robots", "robots", "seo_robots_patch"):  # robots（兼容别名）
            patch_raw = it.get("patch")  # 补丁
            if not isinstance(patch_raw, dict):  # 须对象
                continue  # 跳过
            merged_probe = merge_seo_robots_in_memory({}, patch_raw)  # 相对空对象看是否有写入
            if not merged_probe:  # 无有效字段
                continue  # 跳过
            out.append(  # 一条
                {"kind": "seo_robots_patch", "title": "seo_robots", "payload": {"patch": patch_raw}}  # 存原始 patch 供合并时再归一
            )  # append
        elif ttype in ("code_pr_hint", "source_pr_hint", "code_suggestion"):  # 源码建议（仅展示）
            summary_raw = it.get("summary") or it.get("description") or ""  # 摘要
            summary = str(summary_raw).strip()[:8000]  # 截断
            files_raw = it.get("files") or it.get("suggested_files") or []  # 文件列表
            files_out: list[dict[str, str]] = []  # 规范化文件项
            if isinstance(files_raw, list):  # 须数组
                for f in files_raw[:_MAX_CODE_PR_FILES]:  # 上限
                    if not isinstance(f, dict):  # 须对象
                        continue  # 跳过
                    fp = f.get("path") or f.get("file") or f.get("file_path") or ""  # 路径字段兼容
                    if not isinstance(fp, str) or not fp.strip():  # 无效路径
                        continue  # 跳过
                    note = f.get("note") or f.get("description") or ""  # 说明
                    files_out.append({"path": fp.strip(), "note": str(note).strip()[:2000]})  # 单条
            if not summary and not files_out:  # 无实质内容
                continue  # 跳过
            title = f"code_pr_hint · {files_out[0]['path']}" if files_out else "code_pr_hint"  # 标题
            out.append(  # 一条
                {
                    "kind": "code_pr_hint",  # 不可自动 apply
                    "title": title[:200],  # 标题上限
                    "payload": {"summary": summary, "files": files_out},  # 存库
                }
            )  # append
        else:  # 未知类型
            continue  # 忽略
    return out  # 列表


def merge_page_seo_patch_and_persist(conn: Any, path: str, patch: dict[str, str]) -> None:  # noqa: ANN401 — DB 连接
    """将 patch 合并进 site_json.page_seo[path] 并 INSERT OR REPLACE 全表（与 PUT /admin/page-seo 语义一致）。"""
    norm = normalize_page_path(path.strip())  # 键归一
    if not norm.startswith("/"):  # 非法 path
        raise ValueError("invalid_page_path")  # 调用方转 400
    cleaned = _clean_string_map(patch)  # 再清洗
    if not cleaned:  # 无可写字段
        raise ValueError("empty_patch")  # 调用方转 400
    entries = _load_page_seo_payload(conn)  # 当前全表
    existing = entries.get(norm)  # 该 path 原条目
    if not isinstance(existing, dict):  # 非对象当空
        existing = {}  # 新对象
    merged = {**existing, **cleaned}  # 后者覆盖同名字段
    entries[norm] = merged  # 写回内存表
    final = _normalize_entries_payload(entries)  # 全表再归一（与其它 path 一致）
    raw = json.dumps(final, ensure_ascii=False)  # UTF-8 JSON 文本
    conn.execute(  # 与 admin_put_page_seo 相同 upsert
        "INSERT OR REPLACE INTO site_json (content_key, payload_json) VALUES (?, ?)",  # 单行
        (_PAGE_SEO_KEY, raw),  # 键值
    )  # 执行


def build_extract_user_message(report_text: str) -> str:  # 组装抽取请求用户正文
    body = (report_text or "").strip()  # 去空白
    if len(body) > _MAX_REPORT_CHARS:  # 超长截断
        body = body[:_MAX_REPORT_CHARS] + "\n…(truncated)"  # 提示截断
    return "下列为《每日 SEO 分析报告》正文，请按系统指令只输出 JSON 数组：\n\n" + body  # 明确边界
