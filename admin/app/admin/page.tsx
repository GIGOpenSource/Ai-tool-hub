import { redirect } from "next/navigation"; // App Router 服务端重定向

// 默认导出：/admin 根路径占位（此前无 page 导致 404）
export default function AdminIndex() {
  redirect("/admin/dashboard"); // 与 app/page 根 "/" 一致，默认进入数据大盘
}
