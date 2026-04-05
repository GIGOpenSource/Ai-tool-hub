# 多供应商适配入口：按 ai_insight_llm_provider.adapter 分发（v2.x 扩展点）
from __future__ import annotations

from typing import Any  # Row 形态因驱动而异

from app.ai_insight_service import call_openai_compatible_chat  # OpenAI 兼容 chat/completions


def _adapter_name(prow: Any) -> str:  # noqa: ANN401 — sqlite Row
    """读取连接行的 adapter，老库缺列时回退 openai_compatible。"""
    try:  # Row 可能无 adapter 键（极老迁移前）
        raw = prow["adapter"]  # 列值
    except (KeyError, IndexError, TypeError):  # 缺列
        return "openai_compatible"  # 与历史行为一致
    s = str(raw or "").strip()  # 规范化
    return s if s else "openai_compatible"  # 空串当默认


def provider_adapter_field(prow: Any) -> str:  # noqa: ANN401 — 对外供快照与 API 序列化
    """与 _adapter_name 相同，公开名便于路由引用。"""
    return _adapter_name(prow)  # 复用逻辑


def call_llm_chat_for_provider(
    prow: Any,  # noqa: ANN401
    *,
    system_prompt: str,
    user_message: str,
    api_key: str,
    extra_headers: dict[str, str],
    timeout_sec_cap: int | None = None,  # 可选上限（如任务抽取限制 120s）
    temperature_override: float | None = None,  # 可选覆盖连接行温度（抽取任务用 0.1）
) -> tuple[str, int | None, int | None]:
    """按 provider.adapter 调用对应 HTTP 适配器；未知适配器抛 ValueError（路由转 502）。"""
    adapter = _adapter_name(prow)  # 分发键
    tmo = int(prow["timeout_sec"] or 120)  # 连接默认超时
    if timeout_sec_cap is not None:  # 调用方可封顶
        tmo = min(tmo, int(timeout_sec_cap))  # 取较小
    temp = float(prow["temperature"]) if temperature_override is None else float(temperature_override)  # 温度
    if adapter == "openai_compatible":  # 默认：OpenAI 兼容 POST …/chat/completions
        return call_openai_compatible_chat(  # 沿用现有实现
            base_url=str(prow["base_url"]),  # API 根
            model=str(prow["model"]),  # 模型 id
            api_key=api_key,  # Bearer
            system_prompt=system_prompt,  # 系统消息
            user_message=user_message,  # 用户全文
            timeout_sec=tmo,  # 秒
            temperature=temp,  # 采样温度
            extra_headers=extra_headers,  # 额外头
        )
    raise ValueError(f"unsupported_llm_adapter:{adapter}")  # 预留 anthropic 等，未实现则明确失败
