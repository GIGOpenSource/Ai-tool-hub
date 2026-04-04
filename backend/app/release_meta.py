# 部署可见元数据：版本号与可选构建标识，供 OpenAPI 与 /api/health 共用。
from __future__ import annotations

import os  # 读 APP_VERSION、GIT_SHA、BUILD_ID


def api_version() -> str:
    # API 语义版本：默认 1.0.0；生产可通过 APP_VERSION 注入与静态资源发布对齐。
    v = (os.environ.get("APP_VERSION") or "").strip()  # 未设则回落默认
    return v if v else "1.0.0"  # 空串等同未配置


def optional_build_git_sha() -> str | None:
    # 可选 Git 提交短哈希：CI 注入 GIT_SHA 或 GITHUB_SHA（后者常见于 GitHub Actions）。
    for key in ("GIT_SHA", "GITHUB_SHA"):  # 与常见流水线变量对齐
        raw = (os.environ.get(key) or "").strip()  # 取环境值
        if raw:  # 非空才返回
            return raw[:40] if len(raw) > 40 else raw  # 截断防异常长串进入 JSON
    return None  # 未配置


def optional_build_id() -> str | None:
    # 可选构建号：如镜像 tag、流水线 run id（BUILD_ID）。
    raw = (os.environ.get("BUILD_ID") or "").strip()  # 单一约定键
    return raw if raw else None  # 空则不上报
