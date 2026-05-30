import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useSimulateTransactions,
  useGetFraudTrends, getGetFraudTrendsQueryKey,
  getListAlertsQueryKey, getListTransactionsQueryKey,
  getGetRiskDistributionQueryKey, getGetModelPerformanceQueryKey, getListCasesQueryKey,
} from "@workspace/api-client-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import ActionBadge from "@/components/ActionBadge";
import { AlertTriangle, Activity, DollarSign, ShieldAlert, Zap, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StatCard({ label, value, sub, color = "text-foreground", icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon: React.ElementType
}) {
  return (
    <div className="bg-card border border-border rounded p-4 flex items-start gap-3">
      <div className="p-2 rounded bg-secondary">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function fmt(n: number) { return n >= 1000 ? `PKR ${(n / 1000).toFixed(1)}k` : `PKR ${n.toFixed(0)}`; }

const ACTION_ORDER = ["MONITOR", "REQUEST_OTP", "SOFT_BLOCK", "HARD_BLOCK", "FREEZE_ACCOUNT"];
const ACTION_COLORS: Record<string, string> = {
  MONITOR: "#64748b", REQUEST_OTP: "#3b82f6",
  SOFT_BLOCK: "#f59e0b", HARD_BLOCK: "#f97316", FREEZE_ACCOUNT: "#ef4444",
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: trends } = useGetFraudTrends({ days: 7 }, { query: { queryKey: getGetFraudTrendsQueryKey({ days: 7 }) } });
  const simulate = useSimulateTransactions();
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetFraudTrendsQueryKey() });
    };
    autoRefreshRef.current = setInterval(invalidate, 8000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, [queryClient]);

  const handleSimulate = () => {
    simulate.mutate({ data: { count: 25, fraudRatio: 0.18 } }, {
      onSuccess: (txs) => {
        [getGetDashboardSummaryQueryKey(), getGetFraudTrendsQueryKey(), getListAlertsQueryKey(),
          getListTransactionsQueryKey(), getGetRiskDistributionQueryKey(),
          getGetModelPerformanceQueryKey(), getListCasesQueryKey()
        ].forEach(k => queryClient.invalidateQueries({ queryKey: k }));
        const frozen = txs.filter((t: any) => t.action === "FREEZE_ACCOUNT").length;
        const blocked = txs.filter((t: any) => t.action === "HARD_BLOCK").length;
        toast({
          title: `${txs.length} transactions processed`,
          description: `${frozen} frozen · ${blocked} hard blocked · ${txs.length - frozen - blocked} other actions`,
        });
      },
    });
  };

  const actionData = ACTION_ORDER
    .map((a) => ({ action: a, count: (summary?.actionCounts as any)?.[a] ?? 0 }))
    .filter((d) => d.count > 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-wide">Live Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Agentic fraud pipeline · real-time decisions · Easypaisa / JazzCash</p>
        </div>
        <button
          onClick={handleSimulate}
          disabled={simulate.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {simulate.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          Run Pipeline
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-card border border-border rounded p-4 h-20 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Transactions" value={summary?.totalTransactions ?? 0} icon={Activity} color="text-primary" />
          <StatCard label="Fraud Actions" value={(summary?.actionCounts as any)?.FREEZE_ACCOUNT + (summary?.actionCounts as any)?.HARD_BLOCK || 0}
            sub={`${((summary?.fraudRate ?? 0) * 100).toFixed(1)}% rate`} icon={ShieldAlert} color="text-red-400" />
          <StatCard label="Active Alerts" value={summary?.activeAlerts ?? 0} icon={AlertTriangle} color="text-amber-400" />
          <StatCard label="At Risk" value={fmt(summary?.fraudAmountAtRisk ?? 0)}
            sub={`of ${fmt(summary?.totalAmountProcessed ?? 0)} total`} icon={DollarSign} color="text-orange-400" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Fraud Trend — 7 Days</div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={trends ?? []}>
              <defs>
                {[["fraud","#ef4444"],["susp","#f59e0b"],["total","#00cccc"]].map(([id,c]) => (
                  <linearGradient key={id} id={`${id}G`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "hsl(222 47% 8%)", border: "1px solid hsl(217 32% 17%)", borderRadius: 4, fontSize: 11 }} />
              <Area type="monotone" dataKey="total" stroke="#00cccc" strokeWidth={1.5} fill="url(#totalG)" name="Total" dot={false} />
              <Area type="monotone" dataKey="suspicious" stroke="#f59e0b" strokeWidth={1.5} fill="url(#suspG)" name="Suspicious" dot={false} />
              <Area type="monotone" dataKey="fraudulent" stroke="#ef4444" strokeWidth={1.5} fill="url(#fraudG)" name="Fraudulent" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          <div className="bg-card border border-border rounded p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Agent Actions</div>
            {actionData.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">Run the pipeline to see actions</div>
            ) : (
              <div className="space-y-1.5">
                {ACTION_ORDER.filter((a) => (summary?.actionCounts as any)?.[a] > 0).map((a) => {
                  const cnt = (summary?.actionCounts as any)?.[a] ?? 0;
                  const total = summary?.totalTransactions ?? 1;
                  const pct = (cnt / total) * 100;
                  return (
                    <div key={a} className="flex items-center gap-2">
                      <div className="w-24 text-[10px] font-mono truncate" style={{ color: ACTION_COLORS[a] }}>{a.replace("_", " ")}</div>
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ACTION_COLORS[a] }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="bg-card border border-border rounded p-4 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overview</div>
            {[
              ["Avg Risk", `${((summary?.avgRiskScore ?? 0) * 100).toFixed(1)}%`, "text-amber-400"],
              ["Open Cases", `${summary?.openCases ?? 0}`, "text-primary"],
              ["Cleared", `${((1 - (summary?.fraudRate ?? 0)) * 100).toFixed(1)}%`, "text-emerald-400"],
            ].map(([label, val, cls]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-mono ${cls}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Live Pipeline Feed</span>
          </div>
        </div>
        <div className="divide-y divide-border">
          {(summary?.recentTransactions ?? []).slice(0, 10).map((tx: any) => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/40 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{tx.merchant}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{tx.transactionId} · {tx.location}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="font-mono text-sm">PKR {tx.amount.toFixed(0)}</span>
                <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${tx.riskScore * 100}%`,
                    background: tx.riskScore > 0.7 ? "#ef4444" : tx.riskScore > 0.4 ? "#f59e0b" : "#10b981",
                  }} />
                </div>
                <ActionBadge action={tx.action ?? "MONITOR"} size="sm" />
              </div>
            </div>
          ))}
          {(summary?.recentTransactions ?? []).length === 0 && (
            <div className="px-4 py-10 text-center text-muted-foreground text-sm">
              No transactions yet — click "Run Pipeline" to generate test data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
