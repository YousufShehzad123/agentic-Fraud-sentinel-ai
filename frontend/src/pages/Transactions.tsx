import { useState } from "react";
import { Link } from "wouter";
import { useListTransactions } from "@workspace/api-client-react";
import ActionBadge from "@/components/ActionBadge";
import RiskBadge from "@/components/RiskBadge";
import { Search, ChevronRight } from "lucide-react";

const STATUS_FILTERS = ["all", "normal", "suspicious", "fraudulent"] as const;
const ACTION_FILTERS = ["all", "MONITOR", "REQUEST_OTP", "SOFT_BLOCK", "HARD_BLOCK", "FREEZE_ACCOUNT"] as const;

export default function Transactions() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const params = statusFilter !== "all" ? { status: statusFilter as "normal" | "suspicious" | "fraudulent", limit: 200 } : { limit: 200 };
  const { data: transactions, isLoading } = useListTransactions(params);

  const filtered = (transactions ?? []).filter((tx) => {
    if (actionFilter !== "all" && (tx as any).action !== actionFilter) return false;
    if (search === "") return true;
    const q = search.toLowerCase();
    return tx.merchant.toLowerCase().includes(q) ||
      tx.transactionId.toLowerCase().includes(q) ||
      tx.userId.toLowerCase().includes(q) ||
      tx.location.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold tracking-wide">Transactions</h1>
        <p className="text-xs text-muted-foreground mt-0.5">All transactions with agent actions and ML risk scores</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="search" placeholder="Search merchant, ID, user..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-secondary border border-border rounded text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-56"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {ACTION_FILTERS.map((a) => (
            <button key={a} onClick={() => setActionFilter(a)}
              className={`px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-colors ${actionFilter === a ? "bg-secondary border border-primary/40 text-primary" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`}>
              {a === "all" ? "All Actions" : a.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {["Transaction", "Merchant", "Amount", "Location", "Risk", "Action", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && [...Array(8)].map((_, i) => (
              <tr key={i}>{[...Array(7)].map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-3 bg-secondary rounded animate-pulse" /></td>
              ))}</tr>
            ))}
            {!isLoading && filtered.map((tx) => (
              <tr key={tx.id} className="hover:bg-secondary/40 transition-colors">
                <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{tx.transactionId}</td>
                <td className="px-4 py-3 font-medium">{tx.merchant}</td>
                <td className="px-4 py-3 font-mono">PKR {tx.amount.toFixed(0)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[120px]">{tx.location}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${tx.riskScore * 100}%`,
                        background: tx.riskScore > 0.7 ? "#ef4444" : tx.riskScore > 0.4 ? "#f59e0b" : "#10b981",
                      }} />
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground w-8">{(tx.riskScore * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3"><ActionBadge action={(tx as any).action ?? "MONITOR"} size="sm" /></td>
                <td className="px-4 py-3">
                  <Link href={`/transactions/${tx.id}`}>
                    <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />
                  </Link>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                No transactions found. Go to Dashboard and click "Run Pipeline".
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
