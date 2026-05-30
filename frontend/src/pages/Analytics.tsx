import {
  useGetFraudTrends, getGetFraudTrendsQueryKey,
  useGetRiskDistribution, useGetModelPerformance,
} from "@workspace/api-client-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie,
} from "recharts";

function MetricCard({ label, value, color = "text-primary" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}

const ACTION_ORDER = ["MONITOR", "REQUEST_OTP", "SOFT_BLOCK", "HARD_BLOCK", "FREEZE_ACCOUNT"];
const ACTION_COLORS: Record<string, string> = {
  MONITOR: "#64748b", REQUEST_OTP: "#3b82f6",
  SOFT_BLOCK: "#f59e0b", HARD_BLOCK: "#f97316", FREEZE_ACCOUNT: "#ef4444",
};

export default function Analytics() {
  const { data: trends } = useGetFraudTrends({ days: 14 }, { query: { queryKey: getGetFraudTrendsQueryKey({ days: 14 }) } });
  const { data: distribution } = useGetRiskDistribution();
  const { data: performance } = useGetModelPerformance();

  const barColor = (pct: number) => pct > 70 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#10b981";

  const actionPieData = performance?.actionDistribution
    ? ACTION_ORDER
        .map((a) => ({ name: a.replace("_", " "), value: (performance.actionDistribution as any)[a] ?? 0, fill: ACTION_COLORS[a] }))
        .filter((d) => d.value > 0)
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-wide">Analytics</h1>
        <p className="text-xs text-muted-foreground mt-0.5">ML model performance and fraud intelligence</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Precision" value={performance ? `${(performance.precision * 100).toFixed(1)}%` : "—"} color="text-primary" />
        <MetricCard label="Recall" value={performance ? `${(performance.recall * 100).toFixed(1)}%` : "—"} color="text-emerald-400" />
        <MetricCard label="F1 Score" value={performance ? `${(performance.f1Score * 100).toFixed(1)}%` : "—"} color="text-amber-400" />
        <MetricCard label="Analyzed" value={performance ? `${performance.totalAnalyzed.toLocaleString()}` : "—"} color="text-foreground" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {performance?.modelWeights && (
          <div className="bg-card border border-border rounded p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">Ensemble Weights</div>
            <div className="space-y-3">
              {Object.entries(performance.modelWeights).map(([model, weight]) => {
                const label = model.replace(/([A-Z])/g, " $1").replace("isolation Forest", "Isolation Forest").trim();
                return (
                  <div key={model}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground capitalize">{label}</span>
                      <span className="font-mono text-primary">{((weight as number) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(weight as number) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="bg-card border border-border rounded p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Action Distribution</div>
          {actionPieData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Run the pipeline to see action distribution
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={actionPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                    {actionPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(222 47% 8%)", border: "1px solid hsl(217 32% 17%)", borderRadius: 4, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {actionPieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                    <span className="text-muted-foreground font-mono">{d.name}</span>
                    <span className="font-mono font-bold" style={{ color: d.fill }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Fraud Trend — 14 Days</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trends ?? []}>
            <defs>
              {[["fraud","#ef4444"],["susp","#f59e0b"],["total","#00cccc"]].map(([id,c]) => (
                <linearGradient key={id} id={`${id}AG`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 17%)" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "hsl(222 47% 8%)", border: "1px solid hsl(217 32% 17%)", borderRadius: 4, fontSize: 11 }} />
            <Area type="monotone" dataKey="total" stroke="#00cccc" strokeWidth={1.5} fill="url(#totalAG)" name="Total" dot={false} />
            <Area type="monotone" dataKey="suspicious" stroke="#f59e0b" strokeWidth={1.5} fill="url(#suspAG)" name="Suspicious" dot={false} />
            <Area type="monotone" dataKey="fraudulent" stroke="#ef4444" strokeWidth={1.5} fill="url(#fraudAG)" name="Fraudulent" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Risk Score Distribution</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={distribution ?? []} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 17%)" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "hsl(222 47% 8%)", border: "1px solid hsl(217 32% 17%)", borderRadius: 4, fontSize: 11 }}
              formatter={(val, _, props) => [val, props.payload?.label ?? "Count"]}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {(distribution ?? []).map((entry: any, i: number) => {
                const mid = parseInt(entry.bucket.split("-")[0] ?? "0");
                return <Cell key={i} fill={barColor(mid)} fillOpacity={0.85} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
