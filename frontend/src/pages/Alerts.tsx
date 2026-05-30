import { useState } from "react";
import { useListAlerts, getListAlertsQueryKey, useResolveAlert } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import RiskBadge from "@/components/RiskBadge";
import { CheckCircle, AlertTriangle, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SEV_ORDER = ["critical", "high", "medium", "low"];

export default function Alerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showResolved, setShowResolved] = useState(false);
  const alertsParams = showResolved ? { resolved: true } : { resolved: false };
  const { data: alerts, isLoading } = useListAlerts(
    alertsParams,
    { query: { queryKey: getListAlertsQueryKey(alertsParams) } }
  );
  const resolve = useResolveAlert();

  const sorted = [...(alerts ?? [])].sort((a, b) =>
    SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)
  );

  const handleResolve = (id: number) => {
    resolve.mutate({ id, data: { resolvedNote: "Resolved by analyst" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        toast({ title: "Alert resolved" });
      },
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-wide">Alerts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">ML-triggered fraud alerts</p>
        </div>
        <button
          onClick={() => setShowResolved(!showResolved)}
          className={`px-3 py-1.5 rounded text-xs font-medium uppercase tracking-wider transition-colors ${
            showResolved ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {showResolved ? "Showing Resolved" : "Show Unresolved"}
        </button>
      </div>

      <div className="space-y-2">
        {isLoading && [...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-card border border-border rounded animate-pulse" />
        ))}
        {!isLoading && sorted.map((alert) => (
          <div key={alert.id} className="bg-card border border-border rounded p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1.5 rounded ${alert.severity === "critical" || alert.severity === "high" ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                {alert.resolved
                  ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                  : <AlertTriangle className={`w-4 h-4 ${alert.severity === "critical" ? "text-red-400" : alert.severity === "high" ? "text-orange-400" : "text-amber-400"}`} />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <RiskBadge status={alert.severity} size="sm" />
                  <span className="text-xs font-mono text-muted-foreground">{alert.type}</span>
                  <span className="text-[10px] text-muted-foreground">TX #{alert.transactionId}</span>
                </div>
                <div className="text-sm mt-1">{alert.description}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(alert.createdAt).toLocaleString()}</div>
                {alert.resolvedNote && (
                  <div className="text-[10px] text-emerald-400 mt-0.5">Resolved: {alert.resolvedNote}</div>
                )}
              </div>
            </div>
            {!alert.resolved && (
              <button
                onClick={() => handleResolve(alert.id)}
                disabled={resolve.isPending}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Resolve
              </button>
            )}
          </div>
        ))}
        {!isLoading && sorted.length === 0 && (
          <div className="bg-card border border-border rounded p-10 text-center">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-muted-foreground text-sm">No {showResolved ? "resolved" : "active"} alerts</div>
          </div>
        )}
      </div>
    </div>
  );
}
