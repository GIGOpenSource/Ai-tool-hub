"""确保演示账号存在且密码已设置（每次启动执行，便于迁移后登录）。"""
from __future__ import annotations

from app.db import get_db
from app.env_guard import is_production_environment  # 与 JWT 强校验同一套生产判定
from app.security import hash_password


def ensure_dev_accounts() -> None:
    """
    开发/演示：保证管理员与普通用户存在。
    非生产：每次启动覆盖密码哈希（便于本地/迁移后仍能登录）。
    生产：已存在用户不覆盖 password_hash（运维改密后重启不回滚）；仅补 INSERT 缺行。
    """
    pairs: list[tuple[str, str, str, str, str]] = [
        ("admin@example.com", "Admin", "👑", "admin", "admin123"),
        ("demo@example.com", "Demo User", "👨", "user", "demo"),
    ]
    prod = is_production_environment()  # 生产与开发分支
    with get_db() as conn:
        for email, name, emoji, role, pwd in pairs:
            h = hash_password(pwd)  # 新插入或开发环境更新时用同一哈希流程
            row = conn.execute(
                "SELECT id FROM app_user WHERE email = ?",
                (email,),
            ).fetchone()
            if row:
                if prod:
                    conn.execute(
                        """UPDATE app_user SET display_name = ?, avatar_emoji = ?, role = ?
                           WHERE email = ?""",
                        (name, emoji, role, email),
                    )  # 生产仅同步展示名与角色，保留 password_hash
                else:
                    conn.execute(
                        """UPDATE app_user SET display_name = ?, avatar_emoji = ?, role = ?,
                           password_hash = ? WHERE email = ?""",
                        (name, emoji, role, h, email),
                    )  # 开发每次重置为已知口令
            else:
                conn.execute(
                    """INSERT INTO app_user
                       (email, display_name, avatar_emoji, bio, role, password_hash)
                       VALUES (?, ?, ?, '', ?, ?)""",
                    (email, name, emoji, role, h),
                )  # 首启缺行则插入（生产首启仍为默认口令，须立即修改）
        conn.commit()


def seed_monetization_sample(conn: object) -> None:
    """仅当订单表为空时插入一条示例数据，供后台商业化页演示。"""
    if conn.execute("SELECT 1 FROM monetization_order LIMIT 1").fetchone():
        return
    u = conn.execute("SELECT id FROM app_user WHERE email = 'demo@example.com'").fetchone()
    t = conn.execute("SELECT id FROM tool WHERE moderation_status = 'active' LIMIT 1").fetchone()
    if not u or not t:
        return
    conn.execute(
        """INSERT INTO monetization_order
           (tool_id, purchaser_user_id, amount_cents, payment_status, valid_from, valid_until,
            extra_pv, extra_uv, extra_uid)
           VALUES (?, ?, 9900, 'paid', date('now','-7 day'), date('now','+23 day'), 12, 10, 4)""",
        (t["id"], u["id"]),
    )
