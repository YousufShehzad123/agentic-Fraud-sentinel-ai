interface ActionBadgeProps {
  action: string;
  size?: "sm" | "md";
}

const ACTION_META: Record<string, { label: string; cls: string; icon: string }> = {
  MONITOR:        { label: "MONITOR",        icon: "○", cls: "bg-slate-500/10 text-slate-400 border border-slate-500/20" },
  REQUEST_OTP:    { label: "REQUEST OTP",    icon: "⚡", cls: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  SOFT_BLOCK:     { label: "SOFT BLOCK",     icon: "◈", cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  HARD_BLOCK:     { label: "HARD BLOCK",     icon: "✕", cls: "bg-orange-500/15 text-orange-400 border border-orange-500/30" },
  FREEZE_ACCOUNT: { label: "FREEZE ACCOUNT", icon: "❄", cls: "bg-red-500/15 text-red-400 border border-red-500/30" },
};

export default function ActionBadge({ action, size = "md" }: ActionBadgeProps) {
  const meta = ACTION_META[action] ?? ACTION_META.MONITOR;
  const base = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center gap-1 rounded font-mono font-semibold tracking-wider uppercase ${base} ${meta.cls}`}>
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}
