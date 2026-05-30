import { useState } from "react";
import { Link } from "wouter";
import { useListCases, getListCasesQueryKey } from "@workspace/api-client-react";
import RiskBadge from "@/components/RiskBadge";
import { ChevronRight, Briefcase } from "lucide-react";

const STATUS_FILTERS = ["all", "open", "investigating", "resolved", "closed"] as const;

export default function Cases() {
  const [statusFilter, setStatusFilter] = useState("all");
  const params = statusFilter !== "all" ? { status: statusFilter as "open" | "investigating" | "resolved" | "closed" } : {};
  const { data: cases, isLoading } = useListCases(params, { query: { queryKey: getListCasesQueryKey(params) } });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold tracking-wide">Investigation Cases</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Fraud investigation case management</p>
      </div>

      <div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded text-xs font-medium uppercase tracking-wider transition-colors ${
              statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {isLoading && [...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-card border border-border rounded animate-pulse" />
        ))}
        {!isLoading && (cases ?? []).map((c) => (
          <Link key={c.id} href={`/cases/${c.id}`}>
            <div className="bg-card border border-border rounded p-4 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{c.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.description}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <RiskBadge status={c.status} size="sm" />
                <RiskBadge status={c.priority} size="sm" />
                <span className="text-[10px] text-muted-foreground">{c.transactionCount} tx</span>
                <span className="text-[10px] font-mono text-amber-400">PKR {c.totalAmount.toFixed(0)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1.5">{new Date(c.createdAt).toLocaleDateString()}</div>
            </div>
          </Link>
        ))}
        {!isLoading && (cases ?? []).length === 0 && (
          <div className="col-span-2 bg-card border border-border rounded p-10 text-center">
            <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-muted-foreground text-sm">No cases found</div>
            <div className="text-xs text-muted-foreground mt-1">Cases are auto-filed when FREEZE_ACCOUNT is triggered</div>
          </div>
        )}
      </div>
    </div>
  );
}
