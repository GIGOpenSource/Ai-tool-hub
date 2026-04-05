# site_json 多版本历史：每次 AI SEO apply / rollback 后追加一行（v2.x）
from __future__ import annotations

import json  # ref 元数据序列化
from typing import Any  # Row

from app.ai_insight_seo_task_service import utc_now_iso  # 与 SEO 任务表时间格式一致
from app.db_util import insert_returning_id  # 取新 revision id


def record_site_json_revision(
    conn: object,  # noqa: ANN401
    *,
    content_key: str,
    payload_canonical_text: str,
    admin_user_id: int | None,
    source: str,
    ref: dict[str, Any],
) -> int:
    """写入一条修订记录；payload 须已为 canonical JSON 文本（与审计一致）。"""
    ref_s = json.dumps(ref, ensure_ascii=False)  # 元数据 JSON
    now_s = utc_now_iso()  # UTC ISO 文本
    rid = insert_returning_id(  # 插入（占位符跨 SQLite/PG）
        conn,
        """INSERT INTO site_json_content_revision
        (content_key, payload_json, admin_user_id, source, ref_json, created_at)
        VALUES (?,?,?,?,?,?)""",
        (
            content_key,  # site_json 键
            payload_canonical_text,  # 该时点整包快照
            admin_user_id,  # 可空（系统任务）
            source,  # ai_insight_apply / ai_insight_rollback
            ref_s,  # task_id、audit_id 等
            now_s,  # 创建时间
        ),
    )
    return int(rid)  # 新 id


def revision_row_to_dict(row: Any) -> dict:  # noqa: ANN401
    """单行转 API。"""
    return {
        "id": int(row["id"]),  # 主键
        "content_key": str(row["content_key"] or ""),  # 键
        "payload_json": str(row["payload_json"] or ""),  # 整包 JSON 文本
        "admin_user_id": int(row["admin_user_id"]) if row["admin_user_id"] is not None else None,  # 操作者
        "source": str(row["source"] or ""),  # 来源枚举
        "ref_json": str(row["ref_json"] or "{}"),  # 元数据
        "created_at": str(row["created_at"] or ""),  # 时间
    }
