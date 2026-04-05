# 将 pending 态 ai_insight_run 跑完 LLM：供 BackgroundTasks 与独立 worker 进程复用（v2.x 队列化基础）
from __future__ import annotations

import json  # 快照解析
import time  # 计时

from app.growth.ai_insight_service import resolve_llm_api_key  # 解析密钥
from app.db import get_db  # 连接上下文
from app.llm_adapter_dispatch import call_llm_chat_for_provider  # 多适配器入口


def finalize_pending_ai_insight_run(run_id: int) -> None:
    """与 routers.growth.admin_ai_insights 原 _finalize_ai_insight_run_pending 逻辑一致；独立模块供脚本 import。"""
    t0 = time.perf_counter()  # 起点
    try:  # 统一兜底
        with get_db() as conn:  # 独立连接
            row = conn.execute(  # 读 run
                "SELECT * FROM ai_insight_run WHERE id = ?",  # 主键
                (run_id,),  # 绑定
            ).fetchone()  # 单行
            if not row:  # 无
                return  # 结束
            if str(row["status"]) != "pending":  # 已处理
                return  # 幂等
            try:  # 解析提示词快照
                ps = json.loads(str(row["prompt_snapshot_json"] or "{}"))  # JSON
            except (json.JSONDecodeError, TypeError):  # 损坏
                ms = int((time.perf_counter() - t0) * 1000)  # 毫秒
                conn.execute(  # 失败
                    """UPDATE ai_insight_run SET status=?, output_text=?, error_message=?, duration_ms=?,
                       tokens_in=?, tokens_out=? WHERE id=? AND status='pending'""",
                    ("failed", "", "invalid_prompt_snapshot_json", ms, None, None, run_id),
                )
                conn.commit()  # 提交
                return  # 结束
            if not isinstance(ps, dict):  # 形状
                ms = int((time.perf_counter() - t0) * 1000)  # 毫秒
                conn.execute(  # 失败
                    """UPDATE ai_insight_run SET status=?, output_text=?, error_message=?, duration_ms=?,
                       tokens_in=?, tokens_out=? WHERE id=? AND status='pending'""",
                    ("failed", "", "invalid_prompt_snapshot_shape", ms, None, None, run_id),
                )
                conn.commit()  # 提交
                return  # 结束
            system_prompt = str(ps.get("system_prompt") or "")  # 系统消息
            user_message = str(ps.get("user_message_resolved") or "")  # 用户正文
            lp_raw = row["llm_provider_id"]  # 外键
            if lp_raw is None:  # 缺
                ms = int((time.perf_counter() - t0) * 1000)  # 毫秒
                conn.execute(  # 失败
                    """UPDATE ai_insight_run SET status=?, output_text=?, error_message=?, duration_ms=?,
                       tokens_in=?, tokens_out=? WHERE id=? AND status='pending'""",
                    ("failed", "", "missing_llm_provider_id", ms, None, None, run_id),
                )
                conn.commit()  # 提交
                return  # 结束
            prow = conn.execute(  # 连接行
                "SELECT * FROM ai_insight_llm_provider WHERE id = ?",  # 主键
                (int(lp_raw),),  # 绑定
            ).fetchone()  # 单行
            if not prow:  # 删了
                ms = int((time.perf_counter() - t0) * 1000)  # 毫秒
                conn.execute(  # 失败
                    """UPDATE ai_insight_run SET status=?, output_text=?, error_message=?, duration_ms=?,
                       tokens_in=?, tokens_out=? WHERE id=? AND status='pending'""",
                    ("failed", "", "llm_provider_not_found", ms, None, None, run_id),
                )
                conn.commit()  # 提交
                return  # 结束
            api_key = resolve_llm_api_key(prow)  # 密钥
            if not api_key:  # 未配
                ms = int((time.perf_counter() - t0) * 1000)  # 毫秒
                conn.execute(  # 失败
                    """UPDATE ai_insight_run SET status=?, output_text=?, error_message=?, duration_ms=?,
                       tokens_in=?, tokens_out=? WHERE id=? AND status='pending'""",
                    (
                        "failed",
                        "",
                        "missing_api_key: 请设置环境变量 AI_INSIGHT_LLM_API_KEY、或在后台填写 API Key",
                        ms,
                        None,
                        None,
                        run_id,
                    ),
                )
                conn.commit()  # 提交
                return  # 结束
            try:  # 扩展头
                extra = json.loads(prow["extra_headers_json"] or "{}")  # JSON
                if not isinstance(extra, dict):  # 须对象
                    extra = {}  # 空
                extra_s = {str(k): str(v) for k, v in extra.items()}  # str 化
            except (json.JSONDecodeError, TypeError):  # 损坏
                extra_s = {}  # 忽略
            try:  # 调模型
                out_text, tin, tout = call_llm_chat_for_provider(  # 适配器分发
                    prow,  # 行
                    system_prompt=system_prompt,  # 系统
                    user_message=user_message,  # 用户
                    api_key=api_key,  # 密钥
                    extra_headers=extra_s,  # 头
                )
            except ValueError as e:  # HTTP/解析/不支持适配器
                ms = int((time.perf_counter() - t0) * 1000)  # 毫秒
                msg = str(e)[:2000]  # 截断
                conn.execute(  # 失败
                    """UPDATE ai_insight_run SET status=?, output_text=?, error_message=?, duration_ms=?,
                       tokens_in=?, tokens_out=? WHERE id=? AND status='pending'""",
                    ("failed", "", msg, ms, None, None, run_id),
                )
                conn.commit()  # 提交
                return  # 结束
            ms = int((time.perf_counter() - t0) * 1000)  # 成功耗时
            conn.execute(  # 成功
                """UPDATE ai_insight_run SET status=?, output_text=?, error_message=?, duration_ms=?,
                   tokens_in=?, tokens_out=? WHERE id=? AND status='pending'""",
                ("success", out_text, "", ms, tin, tout, run_id),
            )
            conn.commit()  # 提交
    except Exception as e:  # 未预期
        try:  # 尽力落库
            with get_db() as conn2:  # 新连接
                ms = int((time.perf_counter() - t0) * 1000)  # 毫秒
                em = str(e)[:2000]  # 截断
                conn2.execute(  # 标失败
                    """UPDATE ai_insight_run SET status=?, output_text=?, error_message=?, duration_ms=?,
                       tokens_in=?, tokens_out=? WHERE id=? AND status='pending'""",
                    ("failed", "", f"unexpected:{em}", ms, None, None, run_id),
                )
                conn2.commit()  # 提交
        except Exception:  # 二次失败
            pass  # 放弃
