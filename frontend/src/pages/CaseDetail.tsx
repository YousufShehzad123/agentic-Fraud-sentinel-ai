import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetCase, getGetCaseQueryKey, useUpdateCase } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import RiskBadge from "@/components/RiskBadge";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CaseDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [notesInit, setNotesInit] = useState(false);

  const { data, isLoading } = useGetCase(id, {
    query: {
      enabled: !!id,
      queryKey: getGetCaseQueryKey(id),
    },
  });

  // Initialize notes once data loads
  if (data && !notesInit) {
    setNotes(data.analystNotes ?? "");
    setNotesInit(true);
  }

  const update = useUpdateCase();

  const handleStatusUpdate = (status: "open" | "investigating" | "resolved" | "closed") => {
    update.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(id) });
        toast({ title: "Case updated" });
      },
    });
  };

  const handleSaveNotes = () => {
    update.mutate({ id, data: { analystNotes: notes } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(id) });
        toast({ title: "Notes saved" });
      },
    });
  };

  if (isLoading) return <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded animate-pulse" />)}</div>;
  if (!data) return <div className="p-6 text-muted-foreground">Case not found</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/cases">
          <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />Back
          </div>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-muted-foreground">Case #{data.id}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-bold text-base">{data.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{data.description}</div>
              </div>
              <div className="flex gap-2">
                <RiskBadge status={data.priority} size="sm" />
                <RiskBadge status={data.status} size="sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm border-t border-border pt-3">
              <div><div className="text-[10px] text-muted-foreground uppercase">Transactions</div><div className="font-mono font-bold text-primary">{data.transactionCount}</div></div>
              <div><div className="text-[10px] text-muted-foreground uppercase">Total Amount</div><div className="font-mono font-bold text-amber-400">PKR {data.totalAmount.toFixed(0)}</div></div>
              <div><div className="text-[10px] text-muted-foreground uppercase">Created</div><div className="text-xs">{new Date(data.createdAt).toLocaleDateString()}</div></div>
            </div>
          </div>

          <div className="bg-card border border-border rounded overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Linked Transactions</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50 border-b border-border">
                  {["ID", "Merchant", "Amount", "Risk", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data.transactions ?? []).map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">{tx.transactionId}</td>
                    <td className="px-4 py-2.5">{tx.merchant}</td>
                    <td className="px-4 py-2.5 font-mono">PKR {tx.amount.toFixed(0)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{(tx.riskScore * 100).toFixed(0)}%</td>
                    <td className="px-4 py-2.5"><RiskBadge status={tx.status} size="sm" /></td>
                  </tr>
                ))}
                {(data.transactions ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">No linked transactions</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-card border border-border rounded p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Analyst Notes</div>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              placeholder="Add investigation notes..."
              className="w-full bg-secondary border border-border rounded p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <button onClick={handleSaveNotes} disabled={update.isPending}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity">
              <Save className="w-3.5 h-3.5" />Save Notes
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-card border border-border rounded p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Update Status</div>
            <div className="space-y-1.5">
              {(["open", "investigating", "resolved", "closed"] as const).map((s) => (
                <button key={s} onClick={() => handleStatusUpdate(s)}
                  disabled={update.isPending || data.status === s}
                  className={`w-full px-3 py-2 rounded text-xs uppercase tracking-wider font-medium transition-colors disabled:opacity-40 ${
                    data.status === s ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
