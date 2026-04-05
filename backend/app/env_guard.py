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


def production_jwt_secret_ok() -> tuple[bool, str]:  # 供 verify_release_env 与测试复用；非生产 (True, skipped_not_production)
    if not is_production_environment():  # 非 production
        return True, "skipped_not_production"  # 脚本侧跳过强检
    raw = _jwt_secret_raw()  # 环境变量原文
    effective = raw if raw.strip() else "dev-jwt-secret-change-me"  # 与 security 回落一致
    if _is_weak_jwt_secret(effective):  # 弱/占位/过短
        return False, "weak_or_missing_jwt_secret"  # 与 enforce 失败原因对齐
    return True, "ok"  # 通过


def enforce_production_secrets() -> None:
    """
    生产环境下若 JWT 为默认/占位/过短则退出进程。
    须在 import app.security 之后、签发 token 之前调用（ lifespan 最早处）。
    """
    ok, reason = production_jwt_secret_ok()  # 复用同一判定
    if ok:  # 非生产或通过
        return  # 不拦截
    _ = reason  # 目前仅一种失败，保留便于日后细分日志
    print(  # 启动失败说明写到 stderr，便于 systemd/docker 日志采集
        "ERROR: ENVIRONMENT=production 但 JWT_SECRET 未设置或为弱/占位值；"
            "请设置至少 24 字符的随机串（见 docs/手册-A-部署安全-发布与运维.md 内 P0 安全 / SEC-01）。",
        file=sys.stderr,
    )
    sys.exit(1)  # 拒绝带弱密钥上线


def warn_production_cors_origins() -> None:
    # 生产：ALLOWED_ORIGINS 未设或为 * 时 stderr WARN，不 exit（与 OPS-ENV / 手册-A 验收一致）
    if not is_production_environment():  # 非 production 不提示
        return  # 开发/预发保持安静
    raw = os.environ.get("ALLOWED_ORIGINS", "").strip()  # 逗号分隔 Origin 或 *
    if not raw:  # 未设置：main._cors_allow 退化为本机/私网正则
        print(  # 跨域部署常见遗漏，仅警告
            "WARN: ENVIRONMENT=production 但未设置 ALLOWED_ORIGINS；"
            "若浏览器前端与 API 不同源，请求可能被 CORS 拦截。"
            "同源反代场景可忽略。见 backend/.env.example 与 docs/手册-A-部署安全-发布与运维.md（原验收清单 §4）。",
            file=sys.stderr,
        )
        return  # 已输出一条即可
    if raw == "*":  # 显式允许任意 Origin
        print(  # 与 allow_credentials=false 组合仍须业务确认
            "WARN: ENVIRONMENT=production 且 ALLOWED_ORIGINS=*；"
            "任意站点均可跨域调用（credentials 已关闭），请确认符合安全策略。",
            file=sys.stderr,
        )
