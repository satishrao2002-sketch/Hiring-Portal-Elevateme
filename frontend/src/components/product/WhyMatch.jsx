import { AlertTriangle, Sparkles } from "lucide-react";
import { MatchRing, DimBar, CheckLine } from "@/components/brand";

const DIM_LABELS = {
  skills: "Skills", experience: "Experience", role: "Role Alignment",
  location: "Location", availability: "Availability", readiness: "Readiness",
};

export default function WhyMatch({ match, narrative }) {
  if (!match) return null;
  return (
    <div className="bg-white border border-bordergray rounded-lg p-6" data-testid="why-this-match">
      <div className="flex items-center gap-4 mb-5">
        <MatchRing value={match.overall} size={78} stroke={7} />
        <div>
          <p className="label-eyebrow text-terracotta">Match Intelligence</p>
          <h3 className="font-display text-2xl text-charcoal">{match.overall}% Match</h3>
        </div>
      </div>

      <div className="space-y-2.5">
        {Object.entries(match.dimensions).map(([k, v]) => (
          <DimBar key={k} label={DIM_LABELS[k] || k} value={v} />
        ))}
      </div>

      <div className="mt-6">
        <p className="label-eyebrow text-charcoal mb-2 flex items-center gap-1.5"><Sparkles size={14} className="text-terracotta" /> Why This Match?</p>
        {narrative && <p className="text-charcoal mb-3 leading-relaxed">{narrative}</p>}
        <ul className="space-y-1.5 text-sm">
          {match.reasons.map((r, i) => <CheckLine key={i}>{r}</CheckLine>)}
        </ul>
      </div>

      {match.concerns?.length > 0 && (
        <div className="mt-5 bg-warning/15 border border-warning rounded-md p-4">
          <p className="label-eyebrow text-charcoal mb-1.5 flex items-center gap-1.5"><AlertTriangle size={14} /> Potential Concern</p>
          <ul className="text-sm text-charcoal space-y-1">
            {match.concerns.map((c, i) => <li key={i}>• {c}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
