# 内容爬虫：拉取 JSON 订阅、校验、生成预览行并可选写入 tool 相关表（默认 pending）
from __future__ import annotations

import json  # 解析 config 与 API 响应
import re  # slug 清洗
import time  # 记录耗时
from typing import Any  # 动态 JSON 结构
from urllib.parse import urljoin, urlparse  # robots 与绝对 URL
from urllib.robotparser import RobotFileParser  # robots.txt 合规

import httpx  # 同步 HTTP 客户端

from app.db import insert_returning_id  # 插入 tool 后取 id

# 允许的写入策略（与 admin 请求体验证一致）
_VALID_STRATEGIES = frozenset({"insert_only", "update_empty", "overwrite"})


def _append_log(conn: object, job_id: int, line: str) -> None:  # 追加单行日志到任务
    row = conn.execute("SELECT log_text FROM crawler_job WHERE id = ?", (job_id,)).fetchone()  # 读旧文本
    prev = (row["log_text"] or "") if row else ""  # 空则 ""
    tail = (prev + "\n" + line).strip()  # 拼接并去首尾空行
    if len(tail) > 120_000:  # 防止无限增长
        tail = tail[-120_000:]  # 截断保留尾部
    conn.execute("UPDATE crawler_job SET log_text = ? WHERE id = ?", (tail, job_id))  # 写回


def _now_sql_fragment() -> str:  # 与 submissions 一致的时间占位（PG 由 db_util 翻译）
    return "datetime('now')"  # SQLite 片段；适配器会替换为 CURRENT_TIMESTAMP


def slugify_token(name: str) -> str:  # 由名称生成 URL 安全 slug
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").strip().lower())  # 非小写数字转连字符
    s = s.strip("-")[:80] or "tool"  # 限长与兜底
    return s  # 返回 slug


def _get_path(obj: Any, dotted: str) -> Any:  # 按点路径取子对象（如 data.items）
    if not dotted or dotted.strip() in (".", ""):  # 空路径表示根
        return obj  # 直接返回
    cur: Any = obj  # 游标
    for part in dotted.split("."):  # 逐级下钻
        if not isinstance(cur, dict):  # 非 dict 无法继续
            return None  # 失败
        cur = cur.get(part)  # 下一层
    return cur  # 最终节点


def _normalize_pricing(raw: str) -> str:  # 将任意文案归一到 Free/Freemium/Paid
    s = (raw or "").strip()  # 去空白
    if not s:  # 缺省
        return "Freemium"  # 与库默认一致
    low = s.lower()  # 小写比较
    if "free" in low and "premium" not in low and "mium" not in low:  # 纯 free
        return "Free"  # 免费档
    if "paid" in low or "subscription" in low or "月付" in s or "年费" in s:  # 明显付费
        return "Paid"  # 付费档
    return "Freemium"  # 其余归为 Freemium


def _coerce_item(obj: Any) -> dict[str, Any] | None:  # 将列表元素规范为 dict
    if isinstance(obj, dict):  # 已是对象
        return obj  # 直接返回
    return None  # 跳过非对象


def parse_config(blob: str) -> dict[str, Any]:  # 解析数据源 config_json
    try:  # 容错
        v = json.loads(blob or "{}")  # 反序列化
    except (json.JSONDecodeError, TypeError):  # 损坏
        return {}  # 空配置
    return v if isinstance(v, dict) else {}  # 非 dict 当空


def robots_allows(feed_url: str, user_agent: str) -> bool:  # 是否允许抓取 feed_url
    parsed = urlparse(feed_url)  # 解析 URL
    if parsed.scheme not in ("http", "https") or not parsed.netloc:  # 非法
        return False  # 不允许
    base = f"{parsed.scheme}://{parsed.netloc}"  # 站点根
    robots_url = urljoin(base + "/", "robots.txt")  # robots 地址
    rp = RobotFileParser()  # 解析器
    try:  # 网络可能失败
        rp.set_url(robots_url)  # 设置 robots URL
        rp.read()  # 同步拉取（urllib）
    except Exception:  # 无 robots 或网络错误
        return True  # 宽松：读失败时不阻断（运营自担）
    ua = (user_agent or "").strip() or "*"  # 空 UA 用 *
    return rp.can_fetch(ua, feed_url)  # 是否可抓目标 URL


def build_request_headers(cfg: dict[str, Any]) -> dict[str, str]:  # 组装 HTTP 头
    import os  # 读环境变量中的密钥

    h: dict[str, str] = {}  # 结果
    extra = cfg.get("extra_headers")  # 静态附加头
    if isinstance(extra, dict):  # 必须是 dict
        for k, v in extra.items():  # 逐项
            if isinstance(k, str) and isinstance(v, str):  # 仅字符串键值
                h[k] = v  # 写入
    env_name = cfg.get("auth_header_env")  # 环境变量名（Bearer 等）
    if isinstance(env_name, str) and env_name.strip():  # 有配置
        secret = os.environ.get(env_name.strip(), "").strip()  # 取密钥
        if secret:  # 非空才加 Authorization
            h["Authorization"] = secret  # 整段放入（可含 Bearer）
    return h  # 返回头字典


def fetch_json_array(feed_url: str, headers: dict[str, str], timeout: float, ua: str) -> Any:  # GET 并 json()
    hdrs = {"User-Agent": ua or "AI-Tools-Hub-Crawler/1.0", **headers}  # 默认 UA
    with httpx.Client(timeout=timeout, follow_redirects=True, trust_env=False) as client:  # trust_env=False：避免系统代理把 127.0.0.1 误转 502
        r = client.get(feed_url, headers=hdrs)  # GET
        r.raise_for_status()  # 4xx/5xx 抛错
        return r.json()  # 解析 JSON


def extract_items(root: Any, items_path: str) -> list[Any]:  # 从根 JSON 取出列表
    node = _get_path(root, items_path.strip()) if items_path else root  # 路径或根
    if node is None:  # 路径不存在
        return []  # 空列表
    if isinstance(node, list):  # 已是数组
        return node  # 直接返回
    return []  # 非数组当空


def normalize_tool_payload(raw: dict[str, Any], cfg: dict[str, Any]) -> tuple[dict[str, Any] | None, str]:  # 单条校验
    default_cat = str(cfg.get("default_category_slug") or "").strip()  # 默认分类 slug
    cmap = cfg.get("category_slug_map")  # 源分类名 -> slug
    if not isinstance(cmap, dict):  # 类型不对
        cmap = {}  # 当空
    name = str(raw.get("name") or "").strip()  # 名称
    if not name:  # 必填
        return None, "missing_name"  # 错误码
    slug_in = str(raw.get("slug") or "").strip()  # 可选显式 slug
    slug = slugify_token(slug_in) if slug_in else slugify_token(name)  # 生成 slug
    desc = str(raw.get("description") or raw.get("short_description") or "").strip()  # 短描述
    if not desc:  # 必填
        return None, "missing_description"  # 错误
    tagline = str(raw.get("tagline") or "").strip()  # 副标题
    long_desc = str(raw.get("long_description") or raw.get("longDescription") or "").strip()  # 长文
    icon = str(raw.get("icon_emoji") or raw.get("icon") or "").strip()[:32]  # emoji/符号
    rating = raw.get("rating")  # 评分
    try:  # 转 float
        rating_f = float(rating) if rating is not None else 0.0  # 默认 0
    except (TypeError, ValueError):  # 非法
        rating_f = 0.0  # 归零
    pricing_raw = str(raw.get("pricing_type") or raw.get("pricing") or "Freemium")  # 定价原文
    pricing = _normalize_pricing(pricing_raw)  # 归一
    website = str(raw.get("website_url") or raw.get("website") or "").strip()[:2048]  # 官网
    created_at = str(raw.get("created_at") or raw.get("createdAt") or "").strip()[:64]  # 创建时间串
    pop = raw.get("popularity")  # 热度
    try:  # 转 int
        popularity = int(pop) if pop is not None else 0  # 默认 0
    except (TypeError, ValueError):  # 非法
        popularity = 0  # 归零
    rc = raw.get("review_count")  # 评论数
    try:  # 转 int
        review_count = int(rc) if rc is not None else 0  # 默认 0
    except (TypeError, ValueError):  # 非法
        review_count = 0  # 归零
    cat_raw = str(raw.get("category_slug") or raw.get("category") or "").strip()  # 分类线索
    if cat_raw in cmap and isinstance(cmap[cat_raw], str):  # 映射表命中
        cat_slug = cmap[cat_raw].strip()  # 用映射
    elif cat_raw:  # 有原值
        cat_slug = cat_raw.lower().replace(" ", "-")[:128]  # 简单规范化
    else:  # 无分类
        cat_slug = default_cat  # 回落默认
    if not cat_slug:  # 仍为空
        return None, "missing_category"  # 必须配置默认分类
    feats: list[str] = []  # 特性列表
    fx = raw.get("features")  # 可能是 list 或换行串
    if isinstance(fx, list):  # 数组
        feats = [str(x).strip() for x in fx if str(x).strip()][:50]  # 限 50 条
    elif isinstance(fx, str):  # 文本
        feats = [x.strip() for x in fx.split("\n") if x.strip()][:50]  # 按行
    plans: list[dict[str, Any]] = []  # 定价方案
    pp = raw.get("pricing_plans") or raw.get("pricingPlans")  # 两种命名
    if isinstance(pp, list):  # 数组
        for p in pp[:20]:  # 限条数
            if not isinstance(p, dict):  # 跳过
                continue  # 下一项
            pn = str(p.get("name") or "Plan").strip()[:200]  # 方案名
            pl = str(p.get("price_label") or p.get("price") or "").strip()[:200]  # 价格文案
            pf = p.get("features")  # 子特性
            flist: list[str] = []  # 子列表
            if isinstance(pf, list):  # 数组
                flist = [str(x).strip() for x in pf if str(x).strip()][:50]  # 限长
            plans.append({"name": pn, "price_label": pl, "features": flist})  # 追加
    shots: list[str] = []  # 截图/符号
    ss = raw.get("screenshots") or raw.get("screenshot_urls")  # 命名兼容
    if isinstance(ss, list):  # 数组
        shots = [str(x).strip()[:2048] for x in ss if str(x).strip()][:30]  # 限 30
    payload: dict[str, Any] = {  # 规范化结果
        "slug": slug,  # slug
        "name": name,  # 名称
        "description": desc,  # 短描述
        "tagline": tagline or desc,  # 副标题回落
        "long_description": long_desc or desc,  # 长文回落
        "icon_emoji": icon,  # 图标
        "rating": rating_f,  # 评分
        "pricing_type": pricing,  # 定价
        "category_slug": cat_slug,  # 分类 slug
        "website_url": website,  # 官网
        "created_at": created_at,  # 创建时间
        "popularity": popularity,  # 热度
        "review_count": review_count,  # 评论数
        "features": feats,  # 特性
        "pricing_plans": plans,  # 方案
        "screenshots": shots,  # 截图
    }
    return payload, ""  # 成功


def plan_row(  # 单条决定 insert/update/skip
    conn: object,
    payload: dict[str, Any],
    strategy: str,
) -> tuple[str, str]:  # (action, note)
    slug = payload["slug"]  # 主键 slug
    row = conn.execute(  # 查现有
        "SELECT id, moderation_status, description, long_description, tagline, website_url, pricing_type FROM tool WHERE slug = ?",
        (slug,),
    ).fetchone()
    if row is None:  # 新工具
        return "insert", ""  # 插入
    if strategy == "insert_only":  # 仅新增
        return "skip", "exists_insert_only"  # 跳过
    st = str(row["moderation_status"] or "")  # 当前审核状态
    if strategy == "update_empty":  # 只补空
        if st == "active":  # 已上线默认不碰整行（安全）
            return "skip", "active_skip_update_empty"  # 跳过
        return "update", ""  # pending/rejected 可补空
    if strategy == "overwrite":  # 覆盖
        if st == "active":  # 已上线仍允许覆盖（管理员显式选择）
            return "update", "overwrite_active"  # 标记
        return "update", ""  # 其他状态直接更新
    return "skip", "unknown_strategy"  # 不应到达


def _replace_child_rows(conn: object, tool_id: int, payload: dict[str, Any]) -> None:  # 子表全量替换
    conn.execute("DELETE FROM tool_feature WHERE tool_id = ?", (tool_id,))  # 清特性
    conn.execute("DELETE FROM tool_pricing_plan WHERE tool_id = ?", (tool_id,))  # 清定价
    conn.execute("DELETE FROM tool_screenshot WHERE tool_id = ?", (tool_id,))  # 清截图
    for i, body in enumerate(payload.get("features") or []):  # 重写特性
        conn.execute(
            "INSERT INTO tool_feature (tool_id, body, sort_order) VALUES (?, ?, ?)",
            (tool_id, str(body), i),
        )
    for i, pl in enumerate(payload.get("pricing_plans") or []):  # 重写定价
        if not isinstance(pl, dict):  # 跳过
            continue  # 下一
        feats = pl.get("features") if isinstance(pl.get("features"), list) else []  # 子特性
        conn.execute(
            "INSERT INTO tool_pricing_plan (tool_id, name, price_label, features_json) VALUES (?, ?, ?, ?)",
            (
                tool_id,
                str(pl.get("name") or "Plan")[:200],
                str(pl.get("price_label") or "")[:200],
                json.dumps([str(x) for x in feats if str(x)], ensure_ascii=False),
            ),
        )
    for i, sym in enumerate(payload.get("screenshots") or []):  # 截图符号/URL
        conn.execute(
            "INSERT INTO tool_screenshot (tool_id, symbol, sort_order) VALUES (?, ?, ?)",
            (tool_id, str(sym)[:2048], i),
        )


def apply_insert(conn: object, payload: dict[str, Any], category_id: int) -> None:  # 新建 tool 及子表
    time_lit = _now_sql_fragment()  # 时间 SQL 片段
    tid = insert_returning_id(
        conn,
        f"""INSERT INTO tool (slug, name, description, tagline, long_description, icon_emoji,
           rating, pricing_type, category_id, review_count, popularity, website_url, created_at,
           moderation_status, submitted_by_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(NULLIF(?, ''), {time_lit}),
           'pending', NULL)""",
        (
            payload["slug"],
            payload["name"],
            payload["description"],
            payload["tagline"],
            payload["long_description"],
            payload["icon_emoji"],
            float(payload["rating"]),
            payload["pricing_type"],
            category_id,
            int(payload["review_count"]),
            int(payload["popularity"]),
            payload["website_url"],
            payload["created_at"],
        ),
    )
    _replace_child_rows(conn, int(tid), payload)  # 子表


def apply_update(conn: object, tool_id: int, payload: dict[str, Any], category_id: int, only_empty: bool) -> None:  # 更新主行与子表
    row = conn.execute("SELECT description, long_description, tagline, website_url, pricing_type FROM tool WHERE id = ?", (tool_id,)).fetchone()  # 当前值
    if row is None:  # 不存在
        return  #  noop
    if only_empty:  # 仅填空
        desc = row["description"] or ""  # 旧短描述
        longd = row["long_description"] or ""  # 旧长文
        tag = row["tagline"] or ""  # 旧副标题
        web = row["website_url"] or ""  # 旧网址
        pr = row["pricing_type"] or ""  # 旧定价
        new_desc = payload["description"] if not str(desc).strip() else desc  # 空则填
        new_long = payload["long_description"] if not str(longd).strip() else longd  # 空则填
        new_tag = payload["tagline"] if not str(tag).strip() else tag  # 空则填
        new_web = payload["website_url"] if not str(web).strip() else web  # 空则填
        new_pr = payload["pricing_type"] if not str(pr).strip() else pr  # 空则填
        conn.execute(
            """UPDATE tool SET description = ?, long_description = ?, tagline = ?, website_url = ?,
               pricing_type = ?, category_id = ?, rating = ?, popularity = ?, review_count = ?,
               icon_emoji = COALESCE(NULLIF(icon_emoji, ''), ?)
               WHERE id = ?""",
            (
                new_desc,
                new_long,
                new_tag,
                new_web,
                new_pr,
                category_id,
                float(payload["rating"]),
                int(payload["popularity"]),
                int(payload["review_count"]),
                payload["icon_emoji"],
                tool_id,
            ),
        )
        return  # update_empty 不改子表（避免误删）
    conn.execute(
        """UPDATE tool SET name = ?, description = ?, tagline = ?, long_description = ?, icon_emoji = ?,
           rating = ?, pricing_type = ?, category_id = ?, review_count = ?, popularity = ?,
           website_url = ?, created_at = CASE WHEN ? != '' THEN ? ELSE created_at END
           WHERE id = ?""",
        (
            payload["name"],
            payload["description"],
            payload["tagline"],
            payload["long_description"],
            payload["icon_emoji"],
            float(payload["rating"]),
            payload["pricing_type"],
            category_id,
            int(payload["review_count"]),
            int(payload["popularity"]),
            payload["website_url"],
            payload["created_at"],
            payload["created_at"],
            tool_id,
        ),
    )
    _replace_child_rows(conn, tool_id, payload)  # 全量子表


def run_import_job(conn: object, job_id: int) -> dict[str, Any]:  # 执行抓取并写预览（可选直接提交）
    row = conn.execute(  # 读任务
        """SELECT j.id, j.dry_run, j.write_strategy, j.max_items, j.source_id,
           s.feed_url, s.config_json, s.respect_robots, s.user_agent, s.enabled
           FROM crawler_job j JOIN crawler_source s ON s.id = j.source_id WHERE j.id = ?""",
        (job_id,),
    ).fetchone()
    if row is None:  # 不存在
        return {"ok": False, "error": "job_not_found"}  # 错误
    if not int(row["enabled"] or 0):  # 数据源停用
        conn.execute(
            "UPDATE crawler_job SET status = 'failed', error_message = ?, finished_at = datetime('now'), items_processed = 0 WHERE id = ?",
            ("source_disabled", job_id),
        )
        return {"ok": False, "error": "source_disabled"}  # 失败
    cfg = parse_config(row["config_json"])  # 配置
    items_path = str(cfg.get("items_path") or "").strip()  # 列表路径
    timeout = float(cfg.get("timeout_sec") or 45)  # 超时秒
    timeout = min(max(timeout, 5.0), 120.0)  # 夹在 5~120
    max_items = int(row["max_items"] or 100)  # 最大条数
    max_items = min(max(max_items, 1), 500)  # 1~500
    strategy = str(row["write_strategy"] or "insert_only")  # 策略
    if strategy not in _VALID_STRATEGIES:  # 非法
        strategy = "insert_only"  # 回落
    ua = (row["user_agent"] or "").strip() or "AI-Tools-Hub-Crawler/1.0"  # UA
    feed_url = str(row["feed_url"] or "").strip()  # URL
    if not feed_url:  # 必填
        conn.execute(
            "UPDATE crawler_job SET status = 'failed', error_message = ?, finished_at = datetime('now'), items_processed = 0 WHERE id = ?",
            ("empty_feed_url", job_id),
        )
        return {"ok": False, "error": "empty_feed_url"}  # 失败
    conn.execute(
        "UPDATE crawler_job SET status = 'running', started_at = datetime('now'), error_message = '' WHERE id = ?",
        (job_id,),
    )
    t0 = time.perf_counter()  # 计时起点
    _append_log(conn, job_id, f"fetch_start {feed_url}")  # 日志
    try:  # 抓取
        if int(row["respect_robots"] or 1) and not robots_allows(feed_url, ua):  # robots 拒绝
            raise RuntimeError("robots_disallow")  # 中止
        headers = build_request_headers(cfg)  # 请求头
        root = fetch_json_array(feed_url, headers, timeout, ua)  # JSON 根
        raw_list = extract_items(root, items_path)  # 列表
        _append_log(conn, job_id, f"items_extracted {len(raw_list)}")  # 条数
    except Exception as e:  # 任意失败
        msg = str(e)[:2000]  # 截断
        conn.execute(
            "UPDATE crawler_job SET status = 'failed', error_message = ?, finished_at = datetime('now'), items_processed = 0 WHERE id = ?",
            (msg, job_id),
        )
        _append_log(conn, job_id, f"fetch_fail {msg}")  # 日志
        return {"ok": False, "error": msg}  # 返回
    conn.execute("DELETE FROM crawler_job_preview WHERE job_id = ?", (job_id,))  # 清空旧预览
    ordinal = 0  # 序号
    counts = {"insert": 0, "update": 0, "skip": 0, "error": 0}  # 统计
    seen_slugs: set[str] = set()  # 本批次内去重 slug，避免同批重复 insert 撞唯一约束
    for raw in raw_list[:max_items]:  # 截断
        obj = _coerce_item(raw)  # 转 dict
        if obj is None:  # 非法元素
            counts["error"] += 1  # 记错
            continue  # 下一
        payload, err = normalize_tool_payload(obj, cfg)  # 规范化
        if payload is None:  # 校验失败
            counts["error"] += 1  # 记错
            conn.execute(
                "INSERT INTO crawler_job_preview (job_id, ordinal, action, payload_json, note) VALUES (?, ?, 'skip', ?, ?)",
                (job_id, ordinal, json.dumps(obj, ensure_ascii=False)[:8000], err),
            )
            ordinal += 1  # 递增
            continue  # 下一
        cat = conn.execute("SELECT id FROM category WHERE slug = ?", (payload["category_slug"],)).fetchone()  # 分类
        if cat is None:  # 不存在
            counts["error"] += 1  # 记错
            conn.execute(
                "INSERT INTO crawler_job_preview (job_id, ordinal, action, payload_json, note) VALUES (?, ?, 'skip', ?, ?)",
                (job_id, ordinal, json.dumps(payload, ensure_ascii=False), "invalid_category"),
            )
            ordinal += 1  # 递增
            continue  # 下一
        sid = str(payload["slug"])  # 当前 slug
        if sid in seen_slugs:  # 本批已出现过
            counts["error"] += 1  # 记错
            conn.execute(
                "INSERT INTO crawler_job_preview (job_id, ordinal, action, payload_json, note) VALUES (?, ?, 'skip', ?, ?)",
                (job_id, ordinal, json.dumps(payload, ensure_ascii=False), "duplicate_slug_in_batch"),
            )
            ordinal += 1  # 递增
            continue  # 下一
        seen_slugs.add(sid)  # 记入已见
        action, note = plan_row(conn, payload, strategy)  # 决策
        counts[action] = counts.get(action, 0) + 1  # 计数（skip 已含）
        conn.execute(
            "INSERT INTO crawler_job_preview (job_id, ordinal, action, payload_json, note) VALUES (?, ?, ?, ?, ?)",
            (job_id, ordinal, action, json.dumps(payload, ensure_ascii=False), note),
        )
        ordinal += 1  # 递增
    dry = int(row["dry_run"] or 1)  # 是否仅预览
    summary = {  # 摘要对象
        "counts": counts,  # 各动作数量
        "duration_ms": int((time.perf_counter() - t0) * 1000),  # 耗时
        "preview_rows": ordinal,  # 预览行数
    }
    conn.execute(
        "UPDATE crawler_job SET summary_json = ?, log_text = log_text || ?, items_processed = ? WHERE id = ?",
        (json.dumps(summary, ensure_ascii=False), "\nfetch_done", ordinal, job_id),
    )
    if dry:  # 仅预览
        conn.execute(
            "UPDATE crawler_job SET status = 'preview_ready', finished_at = datetime('now') WHERE id = ?",
            (job_id,),
        )
        return {"ok": True, "summary": summary, "committed": False}  # 未入库
    c = commit_job(conn, job_id, allow_running=True)  # 非 Dry-run：当前状态仍为 running
    c["summary"] = summary  # 合并摘要
    return c  # 返回提交结果


def commit_job(conn: object, job_id: int, *, allow_running: bool = False) -> dict[str, Any]:  # 预览落库
    row = conn.execute("SELECT status, write_strategy FROM crawler_job WHERE id = ?", (job_id,)).fetchone()  # 任务行
    if row is None:  # 无任务
        return {"ok": False, "error": "job_not_found"}  # 错误
    st = str(row["status"] or "")  # 状态
    if allow_running:  # 仅 run_import_job 直连提交时允许 running
        if st not in ("preview_ready", "running"):  # 二者之一
            return {"ok": False, "error": "invalid_status_for_commit"}  # 不可提交
    elif st != "preview_ready":  # 管理端「确认入库」仅认预览完成态
        return {"ok": False, "error": "invalid_status_for_commit"}  # 不可提交
    strategy = str(row["write_strategy"] or "insert_only")  # 策略
    only_empty = strategy == "update_empty"  # 是否仅补空
    rows = conn.execute(
        "SELECT action, payload_json, note FROM crawler_job_preview WHERE job_id = ? ORDER BY ordinal",
        (job_id,),
    ).fetchall()  # 全预览
    n_ins = n_upd = n_sk = 0  # 计数
    for r in rows:  # 逐行
        action = str(r["action"] or "")  # 动作
        try:  # 解析 payload
            payload = json.loads(r["payload_json"] or "{}")  # dict
        except (json.JSONDecodeError, TypeError):  # 损坏
            n_sk += 1  # 跳过
            continue  # 下一
        if not isinstance(payload, dict):  # 类型
            n_sk += 1  # 跳过
            continue  # 下一
        cat = conn.execute("SELECT id FROM category WHERE slug = ?", (payload.get("category_slug"),)).fetchone()  # 分类
        if cat is None:  # 缺失
            n_sk += 1  # 跳过
            continue  # 下一
        cid = int(cat["id"])  # 分类 id
        if action == "insert":  # 新建
            apply_insert(conn, payload, cid)  # 写入
            n_ins += 1  # 统计
        elif action == "update":  # 更新
            ex = conn.execute("SELECT id FROM tool WHERE slug = ?", (payload.get("slug"),)).fetchone()  # 找 id
            if ex is None:  # 不存在则改插入
                apply_insert(conn, payload, cid)  # 插入
                n_ins += 1  # 统计
            else:  # 存在
                apply_update(conn, int(ex["id"]), payload, cid, only_empty)  # 更新
                n_upd += 1  # 统计
        else:  # skip 等
            n_sk += 1  # 统计
    prev_row = conn.execute("SELECT summary_json FROM crawler_job WHERE id = ?", (job_id,)).fetchone()  # 保留抓取阶段摘要
    prev_summary: dict[str, Any] = {}  # 合并目标
    if prev_row:  # 有行
        try:  # 解析旧摘要
            p = json.loads(prev_row["summary_json"] or "{}")  # dict
            if isinstance(p, dict):  # 类型安全
                prev_summary = p  # 采用
        except (json.JSONDecodeError, TypeError):  # 损坏
            prev_summary = {}  # 空
    prev_summary["committed"] = {"insert": n_ins, "update": n_upd, "skip": n_sk}  # 写入统计
    conn.execute(
        """UPDATE crawler_job SET status = 'committed', finished_at = datetime('now'), summary_json = ?,
           items_committed_insert = ?, items_committed_update = ? WHERE id = ?""",
        (json.dumps(prev_summary, ensure_ascii=False), n_ins, n_upd, job_id),
    )
    _append_log(conn, job_id, f"committed insert={n_ins} update={n_upd} skip={n_sk}")  # 日志
    return {"ok": True, "committed": True, "insert": n_ins, "update": n_upd, "skip": n_sk}  # 成功
