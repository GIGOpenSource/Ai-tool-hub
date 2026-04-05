# 公开埋点 POST 限流：按客户端 IP 滑动窗口（可选 Redis 固定窗口，多 worker 共享）
from __future__ import annotations

import os  # 环境变量
import threading  # 保护内存计数表
import time  # 单调时钟
from typing import Literal  # 埋点种类字面量

_track_lock = threading.Lock()  # 与 AI SEO 限流同模式
_track_map: dict[str, list[float]] = {}  # "pv:1.2.3.4" → 近期请求单调时间戳


def _env_int(name: str, default: int, *, lo: int, hi: int) -> int:  # 读整数并钳制
    raw = (os.environ.get(name) or "").strip()  # 未设为空
    if not raw:  # 缺省
        return default  # 默认值
    try:  # 解析
        v = int(raw, 10)  # 十进制
    except ValueError:  # 非法
        return default  # 回退
    return max(lo, min(hi, v))  # 钳制到区间


def _track_limit_params(kind: Literal["pv", "outbound"]) -> tuple[int, int]:  # (窗口秒, 窗口内最大次数)
    if kind == "pv":  # POST /api/track
        w = _env_int("TRACK_PV_RATE_LIMIT_WINDOW_SEC", 60, lo=5, hi=3600)  # 默认 60s
        m = _env_int("TRACK_PV_RATE_LIMIT_MAX", 300, lo=5, hi=50000)  # 默认每 IP 每窗口 300 次
        return w, m  # 参数对
    w = _env_int("TRACK_OUTBOUND_RATE_LIMIT_WINDOW_SEC", 60, lo=5, hi=3600)  # 出站默认 60s
    m = _env_int("TRACK_OUTBOUND_RATE_LIMIT_MAX", 120, lo=5, hi=20000)  # 默认每 IP 每窗口 120 次
    return w, m  # 出站参数


def _rate_limit_memory(key: str, *, window_sec: int, max_calls: int) -> None:  # 进程内滑动窗口
    now = time.monotonic()  # 单调时钟
    with _track_lock:  # 串行化
        lst = _track_map.setdefault(key, [])  # 该键时间列表
        lst[:] = [t for t in lst if now - t < window_sec]  # 剔除过期
        if len(lst) >= max_calls:  # 超限
            raise ValueError("rate_limited_track")  # 路由转 429
        lst.append(now)  # 记录本次


def _rate_limit_redis_fixed_window(url: str, key: str, *, window_sec: int, max_calls: int) -> None:  # Redis 固定窗口
    import redis  # 可选依赖

    r = redis.from_url(url, decode_responses=True)  # 客户端
    bucket = int(time.time()) // max(window_sec, 1)  # 桶号
    rk = f"track_rl:{key}:{bucket}"  # 键
    n = int(r.incr(rk))  # 自增
    if n == 1:  # 首击设 TTL
        r.expire(rk, window_sec + 5)  # 略长于窗口
    if n > max_calls:  # 超限
        raise ValueError("rate_limited_track")  # 同码


def check_track_rate_limit(*, client_ip: str, kind: Literal["pv", "outbound"]) -> None:  # 未超限则返回
    ip = (client_ip or "unknown").strip()[:128] or "unknown"  # 规范化 IP 段
    window_sec, max_calls = _track_limit_params(kind)  # 读环境
    mem_key = f"{kind}:{ip}"  # 内存表键
    url = (os.environ.get("TRACK_RATE_LIMIT_REDIS_URL") or "").strip()  # 与 AI_INSIGHT 可共用同一 Redis
    if url:  # 多实例推荐
        _rate_limit_redis_fixed_window(url, mem_key, window_sec=window_sec, max_calls=max_calls)  # Redis
        return  # 完成
    _rate_limit_memory(mem_key, window_sec=window_sec, max_calls=max_calls)  # 单机内存
