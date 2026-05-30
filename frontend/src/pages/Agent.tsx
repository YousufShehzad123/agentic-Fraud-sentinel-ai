import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAgentStatus, getGetAgentStatusQueryKey, useRetrainModels } from "@workspace/api-client-react";
import RiskBadge from "@/components/RiskBadge";
import ActionBadge from "@/components/ActionBadge";
import { RefreshCw, Brain, CheckCircle, Clock, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AgentPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: status, isLoading } = useGetAgentStatus();
  const retrain = useRetrainModels();

  const [execLog, setExecLog] = useState<any[]>([]);
  const [execLoading, setExecLoading] = useState(false);

  const fetchLog = async () => {
    setExecLoading(true);
    try {
      const res = await fetch("/api/agent/execution-log");
      if (res.ok) setExecLog(await res.json());
    } catch { }
    setExecLoading(false);
  };

  useEffect(() => { fetchLog(); }, []);

  const handleRetrain = () => {
    retrain.mutate({}, {
      onSuccess: (result: any) => {
        queryClient.invalidateQueries({ queryKey: getGetAgentStatusQueryKey() });
        fetchLog();
        toast({
          title: result.success ? "Models retrained" : "Not enough data",
          description: result.success
            ? `${result.samplesUsed} samples · ${result.durationMs}ms · ${result.modelsRetrained.length} models updated`
            : "Need at least 10 transactions",
        });
      },
    });
  };

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-wide">ML Agent</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Autonomous fraud pipeline — 4 agents + decision engine · Easypaisa / JazzCash
          </p>
        </div>
        <button
          onClick={handleRetrain}
          disabled={retrain.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {retrain.isPending
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5" />}
          Retrain Models
        </button>
      </div>

      {/* ── Webhook info banner ── */}
      <div className="bg-secondary/50 border border-border rounded p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          Real-time scoring endpoint ready
        </div>
        <p className="text-muted-foreground leading-relaxed">
          When you receive Easypaisa / JazzCash API access, register{" "}
          <code className="font-mono bg-secondary px-1.5 py-0.5 rounded text-primary">
            POST /api/score
          </code>{" "}
          as their payment webhook. Every transaction will be scored in &lt; 5 ms and you'll
          get back an{" "}
          <code className="font-mono bg-secondary px-1.5 py-0.5 rounded">action</code>{" "}
          field to enforce in their flow.
        </p>
        <div className="font-mono text-[10px] bg-secondary rounded p-2.5 text-muted-foreground leading-relaxed">
          <span className="text-emerald-400">POST</span> /api/score<br />
          {"{"} transactionId, amount, merchant, userId, location, deviceId {"}"}<br />
          <span className="text-primary">→</span>{" "}
          {"{"} action: <span className="text-yellow-400">"REQUEST_OTP"</span>, riskScore: 0.34, scores: {"{ ... }"} {"}"}
        </div>
      </div>

      {/* ── Pipeline status ── */}
      {!isLoading && status && (
        <div className="bg-card border border-border rounded p-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </span>
            <span className="font-medium text-sm">
              {status.isRunning ? "Pipeline Active" : "Stopped"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">
              v{status.modelVersion}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Training Samples", `${status.trainingSamples.toLocaleString()}`, "text-primary"],
              ["Models Ready",     `${status.models.filter((m: any) => m.status === "ready").length}/${status.models.length}`, "text-emerald-400"],
              ["Last Trained",     status.lastTrainedAt ? new Date(status.lastTrainedAt).toLocaleTimeString() : "Not yet", "text-foreground"],
            ].map(([l, v, c]) => (
              <div key={l} className="bg-secondary rounded p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{l}</div>
                <div className={`font-mono font-bold mt-1 text-sm ${c}`}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Graduated action system ── */}
      <div className="bg-card border border-border rounded p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Graduated Action System
        </div>
        <div className="space-y-2">
          {[
            ["MONITOR",        "< 25%",                    "Logged only — transaction allowed through the pipeline."],
            ["REQUEST_OTP",    "25–40%",                   "OTP challenge dispatched to wallet holder for step-up verification."],
            ["SOFT_BLOCK",     "40–55% or velocity burst", "60-second hold placed. Also triggers on velocity burst."],
            ["HARD_BLOCK",     "55–70%",                   "Transaction rejected. Alert filed with fraud operations team."],
            ["FREEZE_ACCOUNT", "≥ 70%",                    "Account frozen. Case auto-filed with investigation unit."],
          ].map(([action, threshold, desc]) => (
            <div key={action} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <ActionBadge action={action} size="sm" />
              </div>
              <div>
                <span className="text-xs font-mono text-muted-foreground">{threshold} — </span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Agent modules ── */}
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Agent Modules
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {isLoading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-card border border-border rounded animate-pulse" />
              ))
            : (status?.models ?? []).map((model: any) => (
                <div key={model.name} className="bg-card border border-border rounded p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <Brain className="w-4 h-4 text-primary" />
                        {model.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        {model.type}
                      </div>
                    </div>
                    <RiskBadge status={model.status} size="sm" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{model.description}</p>
                  {model.status === "ready" ? (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className="font-mono text-emerald-400">
                          {(model.accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${model.accuracy * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400">
                        <CheckCircle className="w-3 h-3" />Ready for inference
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />Click "Retrain Models" to train on existing data
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>

      {/* ── Execution log ── */}
      <div className="bg-card border border-border rounded">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pipeline Execution Log
            </span>
          </div>
          <button
            onClick={fetchLog}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {execLoading && (
            <div className="p-4 text-center text-muted-foreground text-xs">Loading...</div>
          )}
          {!execLoading && execLog.map((entry) => (
            <div
              key={entry.id ?? entry.transactionId}
              className="flex items-start justify-between px-4 py-2.5 hover:bg-secondary/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <ActionBadge action={entry.action ?? "MONITOR"} size="sm" />
                  <span className="text-xs font-medium truncate">{entry.merchant}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    PKR {(entry.amount ?? 0).toFixed(0)}
                  </span>
                </div>
                {entry.agentReasoning && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {entry.agentReasoning}
                  </p>
                )}
              </div>
              <div className="text-right ml-3 flex-shrink-0">
                <div className="font-mono text-xs text-muted-foreground">
                  {(entry.riskScore * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {!execLoading && execLog.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No pipeline executions yet.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
