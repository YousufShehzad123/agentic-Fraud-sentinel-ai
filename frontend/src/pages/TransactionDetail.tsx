import { useParams, Link } from "wouter";
import { useGetTransaction, useUpdateTransaction, getGetTransactionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import RiskGauge from "@/components/RiskGauge";
import { ArrowLeft, CheckCircle, XCircle, Bot, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

function ModelCard({ name, score, anomalyFlag, confidence, details }: {
  name: string; score: number; anomalyFlag: boolean; confidence: number; details: string
}) {
  const color = anomalyFlag ? "border-red-500/30 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5";
  return (
    <div className={`border rounded p-3 ${color}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium">{name}</span>
        <div className="flex items-center gap-1.5">
          {anomalyFlag ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
          <span className={`font-mono text-sm font-bold ${anomalyFlag ? "text-red-400" : "text-emerald-400"}`}>
            {(score * 100).toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full" style={{ width: `${score * 100}%`, background: anomalyFlag ? "#ef4444" : "#10b981" }} />
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{details}</p>
      <div className="text-[10px] text-muted-foreground/60 mt-1">Confidence {(confidence * 100).toFixed(0)}%</div>
    </div>
  );
}

function VoteRow({ vote }: { vote: { agent: string; score: number; weight: number; flag: boolean; reasoning: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded p-3 cursor-pointer transition-colors ${vote.flag ? "border-red-500/25 bg-red-500/5" : "border-border bg-secondary/30"}`}
      onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className={`w-3.5 h-3.5 ${vote.flag ? "text-red-400" : "text-emerald-400"}`} />
          <span className="text-xs font-medium">{vote.agent}</span>
          <span className="text-[10px] text-muted-foreground">({(vote.weight * 100).toFixed(0)}% weight)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs font-bold ${vote.flag ? "text-red-400" : "text-emerald-400"}`}>
            {(vote.score * 100).toFixed(1)}%
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${vote.flag ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
            {vote.flag ? "FLAG" : "PASS"}
          </span>
          {open ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </div>
      </div>
      {open && <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-2">{vote.reasoning}</p>}
    </div>
  );
}

export default function TransactionDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetTransaction(id, { query: { enabled: !!id, queryKey: getGetTransactionQueryKey(id) } });
  const update = useUpdateTransaction();

  const handleUpdate = (status: "normal" | "suspicious" | "fraudulent") => {
    update.mutate({ id, data: { status, reviewNote: `Manually marked as ${status}` } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTransactionQueryKey(id) });
        toast({ title: "Transaction updated", description: `Marked as ${status}` });
      },
    });
  };

  if (isLoading) return <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded animate-pulse" />)}</div>;
  if (!data) return <div className="p-6 text-muted-foreground">Transaction not found</div>;

  const action = (data as any).action ?? "MONITOR";
  const reasoning = (data as any).agentReasoning;
  const mlAnalysis = (data as any).mlAnalysis;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/transactions">
          <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer text-sm">
            <ArrowLeft className="w-4 h-4" />Back
          </div>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-mono text-primary">{data.transactionId}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-base font-bold">{data.merchant}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{data.category} · {data.location}</div>
              </div>
              <div className="flex items-center gap-2">
                <RiskBadge status={data.status} size="sm" />
                <ActionBadge action={action} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["Amount", `PKR ${data.amount.toFixed(2)}`],
                ["Card", `****${data.cardLast4}`],
                ["User", data.userId],
                ["Device", data.deviceId],
                ["IP", data.ipAddress],
                ["Time", new Date(data.createdAt).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border pb-1">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">{k}</span>
                  <span className="font-mono text-xs">{v as string}</span>
                </div>
              ))}
            </div>
          </div>

          {(reasoning || mlAnalysis?.decision) && (
            <div className="bg-card border border-border rounded p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Agent Decision Trail</span>
                <ActionBadge action={mlAnalysis?.action ?? action} size="sm" />
              </div>
              <div className={`rounded p-3 mb-3 text-xs leading-relaxed border ${
                action === "FREEZE_ACCOUNT" ? "bg-red-500/5 border-red-500/20 text-red-300" :
                action === "HARD_BLOCK" ? "bg-orange-500/5 border-orange-500/20 text-orange-300" :
                action === "SOFT_BLOCK" ? "bg-amber-500/5 border-amber-500/20 text-amber-300" :
                action === "REQUEST_OTP" ? "bg-blue-500/5 border-blue-500/20 text-blue-300" :
                "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
              }`}>
                {mlAnalysis?.decision?.reasoning ?? reasoning ?? "Agent analysis complete."}
              </div>
              {mlAnalysis?.decision?.votes && (
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Agent Votes</div>
                  {mlAnalysis.decision.votes.map((vote: any, i: number) => (
                    <VoteRow key={i} vote={vote} />
                  ))}
                </div>
              )}
            </div>
          )}

          {mlAnalysis && (
            <div className="bg-card border border-border rounded p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">ML Model Breakdown</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ModelCard name="Isolation Forest" {...mlAnalysis.isolationForest} />
                <ModelCard name="Autoencoder (Neural Net)" {...mlAnalysis.autoencoder} />
                <ModelCard name="Velocity Analyzer" {...mlAnalysis.velocityAnalysis} />
                <ModelCard name="Gaussian Profile (Welford)" {...mlAnalysis.gaussianProfile} />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded p-4 flex flex-col items-center gap-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Overall Risk</div>
            <RiskGauge score={data.riskScore} size={96} />
            <ActionBadge action={action} />
          </div>
          <div className="bg-card border border-border rounded p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Analyst Override</div>
            <div className="space-y-1.5">
              {(["normal", "suspicious", "fraudulent"] as const).map((s) => (
                <button key={s} onClick={() => handleUpdate(s)}
                  disabled={update.isPending || data.status === s}
                  className={`w-full px-3 py-2 rounded text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-40 ${data.status === s ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  Mark as {s}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded p-3 space-y-1.5 text-xs">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Model Scores</div>
            {[
              ["Isolation Forest", data.isolationScore],
              ["Autoencoder", data.autoencoderError],
              ["Velocity", data.velocityScore],
              ["Gaussian", data.mahalanobisDistance],
            ].map(([n, s]) => (
              <div key={n as string} className="flex justify-between">
                <span className="text-muted-foreground">{n as string}</span>
                <span className="font-mono">{((s as number) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
