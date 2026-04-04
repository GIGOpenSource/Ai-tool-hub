import React, { useEffect, useState } from "react"; // JSX 运行时与状态
import { Link, useParams } from "react-router"; // 返回个人中心与工具详情
import { Button } from "../components/ui/button"; // 主按钮
import { Badge } from "../components/ui/badge"; // 支付状态
import { useLanguage } from "../contexts/LanguageContext"; // 文案语言
import { Navigation } from "../components/Navigation"; // 顶栏
import { Breadcrumbs } from "../components/Breadcrumbs"; // 面包屑
import { apiGet, getAccessToken } from "../../lib/api"; // 带 JWT 的 GET
import { SEO } from "../components/SEO"; // TDK

/** 与 GET /api/me/orders/{id} 返回一致 */
type OrderDetail = {
  id: number; // 订单 id
  tool_id: number; // 工具 id
  tool_name: string; // 展示名
  tool_slug: string; // 详情路由 slug
  amount_cents: number; // 金额分
  payment_status: string; // pending|paid 等
  valid_from: string; // 约起始
  valid_until: string; // 约截止
  extra_pv: number; // 推广 PV
  extra_uv: number; // UV
  extra_uid: number; // 登录 uid 去重
  created_at: string; // 下单时间
};

/**
 * 登录用户查看单笔推广订单；须 JWT，非本人或无单 404。
 */
export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>(); // 路由 :orderId
  const { language } = useLanguage(); // en/zh…
  const zhUi = language.toLowerCase().startsWith("zh"); // 简中 UI
  const [order, setOrder] = useState<OrderDetail | null>(null); // 成功载荷
  const [phase, setPhase] = useState<"load" | "ok" | "404" | "auth">("load"); // 界面分支

  useEffect(() => {
    const raw = (orderId ?? "").trim(); // 路径段
    const oid = parseInt(raw, 10); // 转数字
    if (!Number.isFinite(oid) || oid < 1) {
      setPhase("404"); // 非法 id
      return; // 不发请求
    }
    if (!getAccessToken()) {
      setPhase("auth"); // 无 JWT 不调 /api/me/orders/*
      return; // 保护接口
    }
    let on = true; // 卸载守卫
    setPhase("load"); // 进入加载
    apiGet<OrderDetail>(`/api/me/orders/${oid}`)
      .then((d) => {
        if (on) {
          setOrder(d); // 写入
          setPhase("ok"); // 成功
        }
      })
      .catch(() => {
        if (on) {
          setOrder(null); // 清空
          setPhase("404"); // 404/403 统一作不存在
        }
      });
    return () => {
      on = false; // 取消
    };
  }, [orderId]); // 仅 id 变则重拉（登出后用户多从个人中心离开）

  const title =
    phase === "ok" && order
      ? zhUi
        ? `订单 #${order.id}`
        : `Order #${order.id}`
      : zhUi
        ? "推广订单"
        : "Promotion order";

  if (phase === "auth") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
        <SEO title={title} description="" htmlLang={language} /> {/* 需登录 */}
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center text-gray-300">
          <p className="mb-6">{zhUi ? "请先登录后查看订单。" : "Please sign in to view this order."}</p>
          <Link to="/profile">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500">{zhUi ? "去个人中心" : "Profile"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "load") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118] flex items-center justify-center text-gray-400">
        <SEO title={title} description="" htmlLang={language} /> {/* 加载 */}
        {zhUi ? "加载中…" : "Loading…"}
      </div>
    );
  }

  if (phase === "404" || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
        <SEO noindex title={title} description="" htmlLang={language} /> {/* 不存在 */}
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center text-gray-300">
          <p className="mb-6">{zhUi ? "订单不存在或无权查看。" : "Order not found or access denied."}</p>
          <Link to="/profile">
            <Button variant="outline" className="border-purple-500/40">
              {zhUi ? "返回个人中心" : "Back to profile"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const crumbs = [
    { label: zhUi ? "首页" : "Home", href: "/" },
    { label: zhUi ? "个人中心" : "Profile", href: "/profile" },
    { label: `#${order.id}` },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#1a0b2e] to-[#0a0118]">
      <SEO title={`${title} — ${order.tool_name}`} description={order.tool_name} htmlLang={language} /> {/* 工具名进描述 */}
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Breadcrumbs items={crumbs} />
        <div className="mt-6 bg-[#1a0b2e]/50 border border-purple-500/20 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-bold text-white">{order.tool_name}</h1>
            <Badge className="uppercase bg-purple-500/20 text-purple-200 border-purple-500/30">{order.payment_status}</Badge>
          </div>
          <p className="text-sm text-gray-400">
            {zhUi ? "关联工具" : "Tool"}:{" "}
            <Link to={`/tool/${encodeURIComponent(order.tool_slug)}`} className="text-cyan-400 hover:underline">
              {order.tool_slug}
            </Link>
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
            <div>
              <dt className="text-gray-500">{zhUi ? "金额（演示）" : "Amount (demo)"}</dt>
              <dd>{(order.amount_cents / 100).toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{zhUi ? "下单时间" : "Created"}</dt>
              <dd>{(order.created_at || "").slice(0, 19)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{zhUi ? "有效期" : "Valid period"}</dt>
              <dd>
                {(order.valid_from || "").slice(0, 10)} — {(order.valid_until || "").slice(0, 10)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">PV / UV / UID</dt>
              <dd>
                {order.extra_pv} / {order.extra_uv} / {order.extra_uid}
              </dd>
            </div>
          </dl>
          <div className="pt-4 border-t border-purple-500/10">
            <Link to="/profile">
              <Button variant="outline" className="border-purple-500/40 text-gray-200">
                {zhUi ? "返回个人中心" : "Back to profile"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
