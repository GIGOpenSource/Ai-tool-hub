# UGC 文本风控：UGC_BLOCKED_SUBSTRINGS 逗号分隔；ASCII 单段词默认按「非字母数字边界」匹配，短语/中文仍子串
from __future__ import annotations

import os  # 环境变量
import re  # 词边界
from functools import lru_cache


@lru_cache(maxsize=1)
def _blocked_needles_lower() -> tuple[str, ...]:
    raw = (os.environ.get("UGC_BLOCKED_SUBSTRINGS") or "").strip()  # 未设则关闭
    if not raw:
        return ()  # 无黑名单
    parts = [p.strip().lower() for p in raw.split(",")]  # 逗号分词
    return tuple(p for p in parts if p)  # 去空


_TOKEN_NEEDLE = re.compile(r"^[a-z0-9][a-z0-9_-]*$", re.ASCII)  # 仅 ASCII 字母数字下划线连字符 → 边界匹配


def _needle_matches_text(needle_lower: str, hay_lower: str) -> bool:
    if _TOKEN_NEEDLE.fullmatch(needle_lower):  # 单词形配置（如 spam、bad-word）
        boundary = r"(?<![a-z0-9])" + re.escape(needle_lower) + r"(?![a-z0-9])"  # 两侧非英数字，减误伤
        return re.search(boundary, hay_lower, flags=re.ASCII) is not None  # hay 已小写
    return needle_lower in hay_lower  # 多空格短语、中文、符号混排：仍用子串


def ugc_text_contains_blocked(text: str) -> str | None:
    hay = text.lower()  # 统一小写 haystack（needle 已小写）
    for needle in _blocked_needles_lower():  # 顺序遍历
        if _needle_matches_text(needle, hay):  # 边界或子串
            return needle  # 首个命中
    return None  # 通过


def first_ugc_violation_among(*texts: str) -> str | None:
    for chunk in texts:  # 多段依次查
        hit = ugc_text_contains_blocked(chunk)  # 单段
        if hit is not None:
            return hit  # 任意一段命中即返回
    return None  # 全部通过
