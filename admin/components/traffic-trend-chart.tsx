"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Point = { date: string; pv: number; uv: number; uid: number };

export function TrafficTrendChart({
  data,
  seriesNames,
}: {
  data: Point[];
  seriesNames: { pv: string; uv: string; uid: string };
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" /> {/* 浅色网格，避免紫色调 */}
          <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#17171e", // 与 admin.surface 对齐
              border: "1px solid #2c2e36", // 与 admin.border 对齐
              borderRadius: 8, // 与卡片圆角接近
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="pv" name={seriesNames.pv} stroke="#9aa6b2" dot={false} strokeWidth={2} />
          {/* PV 曲线：低饱和灰蓝 */}
          <Line type="monotone" dataKey="uv" name={seriesNames.uv} stroke="#7d8695" dot={false} strokeWidth={2} />
          {/* UV 曲线：略深灰 */}
          <Line type="monotone" dataKey="uid" name={seriesNames.uid} stroke="#a8b0bd" dot={false} strokeWidth={2} />
          {/* UID 曲线：浅灰以区分 */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
