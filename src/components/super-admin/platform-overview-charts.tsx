"use client";

import { Bar, Line, BarChart, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import type { TooltipProps } from "recharts";

interface SeriesPoint {
  label: string;
  schools?: number;
  revenue?: number;
  users?: number;
}

const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" } as const;

function frCurrency(n: number | undefined): string {
  return (n ?? 0).toLocaleString("fr-FR", { style: "currency", currency: "XAF", maximumFractionDigits: 0 });
}

function MoneyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: entry.stroke || entry.fill }} />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto font-mono font-medium tabular-nums">
            {entry.dataKey === "revenue" ? frCurrency(entry.value as number) : (entry.value as number).toLocaleString("fr-FR")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SchoolsTimeline({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--muted)/0.4" }} />
          <Bar dataKey="schools" name="Écoles créées" fill="#4F46E5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueTimeline({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip content={<MoneyTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Line type="monotone" dataKey="revenue" name="Encaissé" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UsersCumulative({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<MoneyTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Line type="monotone" dataKey="users" name="Utilisateurs cumulés" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}