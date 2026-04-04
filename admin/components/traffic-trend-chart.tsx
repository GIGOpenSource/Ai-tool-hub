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
          <CartesianGrid strokeDasharray="3 3" stroke="#4c1d9530" />
          <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a0b2e",
              border: "1px solid rgba(168,85,247,0.3)",
              borderRadius: 8,
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="pv" name={seriesNames.pv} stroke="#22d3ee" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="uv" name={seriesNames.uv} stroke="#a855f7" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="uid" name={seriesNames.uid} stroke="#f472b6" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
