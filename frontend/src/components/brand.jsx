import { CheckCircle2, ShieldCheck, Loader2, SearchX } from "lucide-react";

export function MatchRing({ value = 0, size = 64, stroke = 6, label = true }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const color = value >= 90 ? "#C7493A" : value >= 80 ? "#488A6D" : value >= 70 ? "#488A6D" : "#747474";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="match-ring">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EAE8E3" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.3,1)" }} />
      </svg>
      {label && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display leading-none" style={{ fontSize: size * 0.28, color: "#1A1A1A" }}>{value}<span style={{ fontSize: size * 0.16 }}>%</span></span>
        </div>
      )}
    </div>
  );
}

export function DimBar({ label, value }) {
  const color = value >= 90 ? "#C7493A" : value >= 78 ? "#488A6D" : "#747474";
  return (
    <div className="flex items-center gap-3">
      <span className="label-eyebrow text-bodygray w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[#EAE8E3] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color, transition: "width 1s cubic-bezier(.2,.7,.3,1)" }} />
      </div>
      <span className="font-display text-sm w-9 text-right">{value}</span>
    </div>
  );
}

export function VerifiedBadge({ text = "ElevateMe Verified" }) {
  return (
    <span className="inline-flex items-center gap-1 bg-mint/25 text-brandgreen border border-mint label-eyebrow px-2 py-1 rounded" data-testid="verified-badge">
      <ShieldCheck size={13} /> {text}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-cream text-charcoal border-bordergray/60",
    green: "bg-brandgreen/10 text-brandgreen border-brandgreen/30",
    terracotta: "bg-terracotta/10 text-terracotta border-terracotta/30",
    warning: "bg-warning/25 text-charcoal border-warning",
  };
  return <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${tones[tone]}`}>{children}</span>;
}

export function RiskDot({ risk }) {
  const map = { GREEN: "#488A6D", AMBER: "#FFD475", RED: "#FE7E79" };
  return <span className="inline-flex items-center gap-1.5 font-bold text-xs">
    <span className="w-2.5 h-2.5 rounded-full" style={{ background: map[risk] }} /> {risk}
  </span>;
}

export function Loading({ label = "Working..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-bodygray" data-testid="loading-state">
      <Loader2 className="animate-spin text-terracotta" size={28} />
      <p className="font-display text-charcoal">{label}</p>
    </div>
  );
}

export function EmptyState({ title, hint, actions }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6" data-testid="empty-state">
      <div className="w-12 h-12 rounded-full bg-cream border border-bordergray flex items-center justify-center mb-4">
        <SearchX size={22} className="text-bodygray" />
      </div>
      <h3 className="font-display text-xl text-charcoal">{title}</h3>
      {hint && <p className="text-bodygray mt-1 max-w-sm">{hint}</p>}
      {actions && <div className="mt-4">{actions}</div>}
    </div>
  );
}

export function CheckLine({ children }) {
  return (
    <li className="flex items-start gap-2 text-charcoal">
      <CheckCircle2 size={17} className="text-brandgreen shrink-0 mt-0.5" /> <span>{children}</span>
    </li>
  );
}
