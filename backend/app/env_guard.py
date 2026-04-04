"""生产环境启动前校验：弱密钥拒绝启动，与 SEC-01 / OPS-ENV 文档一致。"""
from __future__ import annotations

import os  # 读取 ENVIRONMENT、JWT_SECRET
import sys  # stderr 输出与进程退出码


def is_production_environment() -> bool:
    """是否视为生产：ENVIRONMENT=production（大小写不敏感）；供 ensure_accounts 等复用。"""
    v = os.environ.get("ENVIRONMENT", "").strip().lower()  # 与常见 PaaS 约定对齐
    return v == "production"  # 仅显式 production 才启用强校验


def _jwt_secret_raw() -> str:
    """读取 JWT_SECRET 原始字符串（未 strip 前可用于检测全空白）。"""
    return os.environ.get("JWT_SECRET", "")  # 空则下游用 security 模块默认值


def _is_weak_jwt_secret(secret: str) -> bool:
    """判定是否为文档/仓库默认或明显占位，生产不可接受。"""
    s = secret.strip()  # 去掉首尾空白再比
    if not s:
        return True  # 未设置将回落到代码内 dev 默认值，等同弱密钥
    weak = {
        "dev-jwt-secret-change-me",  # security.py 开发默认
        "请改为足够长的随机串",  # .env.example 中文占位
        "请用长随机串",  # 01-部署指南 示例文案，勿用于生产
        "你的密钥",  # 01-部署指南 systemd 示例占位
        "change-me",  # 常见占位
        "secret",  # 常见弱口令
    }
    if s in weak:
        return True  # 与示例或常见弱口令一致
    if len(s) < 24:
        return True  # 过短熵不足
    return False  # 通过粗检


def enforce_production_secrets() -> None:
    """
    生产环境下若 JWT 为默认/占位/过短则退出进程。
    须在 import app.security 之后、签发 token 之前调用（ lifespan 最早处）。
    """
    if not is_production_environment():
        return  # 开发/预发未设 ENVIRONMENT 时不拦截
    raw = _jwt_secret_raw()  # 先看环境变量是否显式设置
    effective = raw if raw.strip() else "dev-jwt-secret-change-me"  # 与 security 默认对齐
    if _is_weak_jwt_secret(effective):
        print(  # 启动失败说明写到 stderr，便于 systemd/docker 日志采集
            "ERROR: ENVIRONMENT=production 但 JWT_SECRET 未设置或为弱/占位值；"
            "请设置至少 24 字符的随机串（见 docs/04-P0安全与联调备忘.md SEC-01）。",
            file=sys.stderr,
        )
        sys.exit(1)  # 拒绝带弱密钥上线
