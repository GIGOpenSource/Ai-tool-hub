# 健康检查与发布元数据：运维/回滚时对齐 API 与前台制品版本，不查库、不鉴权。
from __future__ import annotations

from fastapi import APIRouter  # 轻量路由

from app.db_util import is_postgresql  # 区分 PG 与 SQLite（仅布尔，无连接）
from app.release_meta import api_version, optional_build_git_sha, optional_build_id  # 版本与构建信息

router = APIRouter(tags=["health"])  # OpenAPI 分组


@router.get("/health")  # 完整路径为 /api/health（main 中 prefix=/api）
def get_health() -> dict[str, object]:
    # 返回存活状态与数据库后端类型；版本字段与 CI 环境变量对齐发布验收。
    git_sha = optional_build_git_sha()  # 可能为 None
    build_id = optional_build_id()  # 可能为 None
    build: dict[str, str] = {}  # 仅包含有值的键，避免 null 噪音
    if git_sha is not None:  # CI 注入了再输出
        build["git_sha"] = git_sha  # 短哈希便于对账
    if build_id is not None:  # 同上
        build["build_id"] = build_id  # 流水线或镜像标识
    return {
        "status": "ok",  # 进程已响应
        "api_version": api_version(),  # 与 OpenAPI version 一致
        "database_backend": "postgresql" if is_postgresql() else "sqlite",  # 无 DSN 泄露
        "build": build,  # 空 dict 时仍返回，客户端可忽略
    }
