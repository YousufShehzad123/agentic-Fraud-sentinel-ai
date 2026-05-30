interface RiskGaugeProps {
  score: number;
  size?: number;
  label?: string;
}

export default function RiskGauge({ score, size = 80, label }: RiskGaugeProps) {
  const pct = Math.min(1, Math.max(0, score));
  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference * (1 - pct);
  const color = pct > 0.7 ? "#ef4444" : pct > 0.4 ? "#f59e0b" : "#10b981";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="30" fill="none" stroke="hsl(217 32% 17%)" strokeWidth="8" />
        <circle
          cx="40" cy="40" r="30" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
        />
        <text x="40" y="44" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color} fontFamily="monospace">
          {(pct * 100).toFixed(0)}%
        </text>
      </svg>
      {label && <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>}
    </div>
  );
}
