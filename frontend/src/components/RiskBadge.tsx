interface RiskBadgeProps {
  status: string;
  riskScore?: number;
  size?: "sm" | "md";
}

export default function RiskBadge({ status, riskScore, size = "md" }: RiskBadgeProps) {
  const colors: Record<string, string> = {
    fraudulent: "bg-red-500/15 text-red-400 border border-red-500/30",
    suspicious: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    normal: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    critical: "bg-red-500/15 text-red-400 border border-red-500/30",
    high: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    medium: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    low: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    open: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    investigating: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    resolved: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    closed: "bg-muted text-muted-foreground border border-border",
    ready: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    training: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    not_trained: "bg-muted text-muted-foreground border border-border",
  };

  const base = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  const cls = colors[status] ?? "bg-muted text-muted-foreground border border-border";

  return (
    <span className={`inline-flex items-center rounded font-mono font-medium uppercase tracking-wider ${base} ${cls}`}>
      {status.replace(/_/g, " ")}
      {riskScore !== undefined && <span className="ml-1 opacity-70">{(riskScore * 100).toFixed(0)}%</span>}
    </span>
  );
}
