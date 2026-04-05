"""FastAPI 入口：注册路由、CORS；启动逻辑用 lifespan（替代 on_event）。"""
from __future__ import annotations

import asyncio  # 爬虫调度协程取消
import os
from contextlib import asynccontextmanager, suppress  # lifespan 与 CancelledError

from fastapi import FastAPI  # Web 框架入口
from fastapi.middleware.cors import CORSMiddleware  # 跨域中间件（Starlette 再导出，FastAPI 官方用法）

from app.db import get_db, init_db
from app.env_guard import enforce_production_secrets, warn_production_cors_origins  # 生产 JWT 拦截与 CORS 提示
from app.release_meta import api_version  # 与 /api/health、OpenAPI 共用的版本号
from app.ensure_accounts import ensure_dev_accounts, seed_monetization_sample
from app.routers import auth, catalog, comparisons, health_release, i18n as i18n_router, site, tools
from app.routers import user_activity, user_favorites, user_orders, user_profile, user_settings  # me* 收藏/订单
from app.routers import (
    admin_analytics,
    admin_comparison_pages,
    admin_dashboard,
    admin_monetization,
    admin_reviews,
    admin_settings,
    admin_site_json,
    admin_tools,
    admin_translations,
    admin_search_suggestions,
    admin_users,
    submissions,
    track,
)
from app.routers.growth import admin_ai_insights, admin_crawler, admin_page_seo, seo_public  # 增长与可见性路由分区
from app.growth.ai_insight_scheduler import ai_insight_daily_scheduler_loop  # 进程内每日 AI SEO 分析（可选环境变量开启）
from app.growth.crawler_scheduler import crawler_scheduler_loop  # 进程内定时爬虫巡检
from app.growth.recommend_scheduler import recommend_score_scheduler_loop  # 列表推荐分定时重算
from app.seed_all import run_seed_if_empty


def _cors_allow() -> tuple[list[str], bool, str | None]:
    """解析 ALLOWED_ORIGINS；未设置时用正则匹配本机与常见私网段 Origin，与「用局域网 IP 打开前后台」一致。"""
    raw = os.environ.get("ALLOWED_ORIGINS", "").strip()  # 逗号分隔的完整 Origin，或 *
    if not raw:
        lan_regex = (  # 与前台 Vite host、管理端 0.0.0.0 开发时任意端口对齐
            r"^https?://("
            r"localhost|127\.0\.0\.1|\[::1\]"
            r"|192\.168\.\d{1,3}\.\d{1,3}"
            r"|10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
            r"|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
            r")(?::\d+)?$"
        )
        return ([], True, lan_regex)  # 列表为空，仅依赖 allow_origin_regex
    if raw == "*":
        return (["*"], False, None)  # 全开放时不带 credentials
    origins = [o.strip() for o in raw.split(",") if o.strip()]  # 显式白名单
    if not origins:
        return (["*"], False, None)
    return (origins, True, None)


@asynccontextmanager
async def _app_lifespan(_app: FastAPI):
    """进程生命周期：建库、空库种子、演示账号、示例订单（与旧 startup 一致）。"""
    enforce_production_secrets()  # ENVIRONMENT=production 时拒绝弱 JWT_SECRET
    warn_production_cors_origins()  # 生产未配 ALLOWED_ORIGINS 或 * 时 stderr 警告
    init_db()  # 建表 + apply_migrations
    run_seed_if_empty()  # 仅空库写入种子
    ensure_dev_accounts()  # 开发演示账号
    with get_db() as conn:  # 示例商业订单
        seed_monetization_sample(conn)
        conn.commit()
    sched_task = asyncio.create_task(crawler_scheduler_loop())  # 后台每分钟检查定时爬虫
    ai_sched_task = asyncio.create_task(ai_insight_daily_scheduler_loop())  # 后台每分钟检查 AI SEO 日更（默认关）
    rec_task = asyncio.create_task(recommend_score_scheduler_loop())  # 推荐分重算（默认每小时，可关）
    yield  # 应用运行
    sched_task.cancel()  # 请求停机时取消协程
    ai_sched_task.cancel()  # 取消 AI 日更协程
    rec_task.cancel()  # 取消推荐调度
    with suppress(asyncio.CancelledError):  # cancel 视为正常结束
        await sched_task  # 等待协程收尾
    with suppress(asyncio.CancelledError):  # 同上
        await ai_sched_task  # 等待 AI 调度收尾
    with suppress(asyncio.CancelledError):  # 同上
        await rec_task  # 等待推荐调度收尾


def create_app() -> FastAPI:
    app = FastAPI(title="AI Tools Hub API", version=api_version(), lifespan=_app_lifespan)  # version 可被 APP_VERSION 覆盖
    allow_origins, allow_credentials, allow_origin_regex = _cors_allow()  # 解包 CORS 三要素
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=allow_credentials,
        allow_origin_regex=allow_origin_regex,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # 以下路由全部挂在 /api 下，与前台 Vite 代理、管理端 Next rewrites 一致
    app.include_router(health_release.router, prefix="/api")  # GET /api/health：发布与回滚对账
    app.include_router(tools.router, prefix="/api")
    app.include_router(catalog.router, prefix="/api")
    app.include_router(i18n_router.router, prefix="/api")
    app.include_router(comparisons.router, prefix="/api")
    app.include_router(site.router, prefix="/api")
    app.include_router(seo_public.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(user_settings.router, prefix="/api")
    app.include_router(user_profile.router, prefix="/api")
    app.include_router(user_favorites.router, prefix="/api")
    app.include_router(user_activity.router, prefix="/api")
    app.include_router(user_orders.router, prefix="/api")
    app.include_router(track.router, prefix="/api")
    app.include_router(submissions.router, prefix="/api")
    app.include_router(admin_dashboard.router, prefix="/api")
    app.include_router(admin_ai_insights.router, prefix="/api")
    app.include_router(admin_analytics.router, prefix="/api")
    app.include_router(admin_tools.router, prefix="/api")
    app.include_router(admin_users.router, prefix="/api")
    app.include_router(admin_reviews.router, prefix="/api")
    app.include_router(admin_monetization.router, prefix="/api")
    app.include_router(admin_settings.router, prefix="/api")
    app.include_router(admin_page_seo.router, prefix="/api")
    app.include_router(admin_site_json.router, prefix="/api")
    app.include_router(admin_translations.router, prefix="/api")
    app.include_router(admin_search_suggestions.router, prefix="/api")
    app.include_router(admin_comparison_pages.router, prefix="/api")
    app.include_router(admin_crawler.router, prefix="/api")

    return app  # 组装完成返回应用实例


app = create_app()
