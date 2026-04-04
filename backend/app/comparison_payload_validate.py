# 对比落地页 JSON 写入前结构校验（与前台 ComparisonPayload / 管理端空模板对齐）
from __future__ import annotations

from typing import Any  # 任意 JSON 形态

from fastapi import HTTPException  # 400 拒绝非法结构


def _must_dict(v: Any, field: str) -> None:  # 断言为 dict，否则抛业务 400
    if v is None or not isinstance(v, dict):  # None 或非对象
        raise HTTPException(status_code=400, detail=f"comparison_schema:{field}_object")  # 与前端可展示


def _must_list(v: Any, field: str) -> None:  # 断言为 list
    if v is None or not isinstance(v, list):  # None 或非数组
        raise HTTPException(status_code=400, detail=f"comparison_schema:{field}_array")  # 键名提示


def validate_comparison_payload(payload: dict[str, Any]) -> None:  # PUT 前调用
    _must_dict(payload, "root")  # 顶层须对象（路由层已保证 dict，双保险）
    _must_dict(payload.get("mainTool"), "mainTool")  # 主工具块必填
    _must_list(payload.get("alternatives"), "alternatives")  # 替代列表必填（可为空数组）
    alts = payload["alternatives"]  # 已校验为 list
    for i, it in enumerate(alts):  # 逐项须为对象
        if not isinstance(it, dict):  # 非法元素
            raise HTTPException(status_code=400, detail=f"comparison_schema:alternatives[{i}]")  # 带下标
    feats = payload.get("features")  # 特性矩阵
    if feats is not None and not isinstance(feats, list):  # 若出现须为数组
        raise HTTPException(status_code=400, detail="comparison_schema:features_array")  # 类型错误
    for i, row in enumerate(feats if isinstance(feats, list) else []):  # 行须对象
        if not isinstance(row, dict):  # 非法行
            raise HTTPException(status_code=400, detail=f"comparison_schema:features[{i}]")  # 定位行
    pros = payload.get("pros")  # 长处表
    if pros is not None and not isinstance(pros, dict):  # 须对象映射
        raise HTTPException(status_code=400, detail="comparison_schema:pros_object")  # 类型
    cons = payload.get("cons")  # 短处表
    if cons is not None and not isinstance(cons, dict):  # 须对象
        raise HTTPException(status_code=400, detail="comparison_schema:cons_object")  # 类型
    cards = payload.get("seo_cards")  # 选型卡片
    if cards is not None and not isinstance(cards, list):  # 须数组
        raise HTTPException(status_code=400, detail="comparison_schema:seo_cards_array")  # 类型
    for i, c in enumerate(cards if isinstance(cards, list) else []):  # 卡片须对象
        if not isinstance(c, dict):  # 非法卡片
            raise HTTPException(status_code=400, detail=f"comparison_schema:seo_cards[{i}]")  # 下标
