import { Link } from "react-router-dom";
import { MapPin, Clock, Briefcase, MessageSquare, CalendarPlus, Bookmark } from "lucide-react";
import { MatchRing, VerifiedBadge, Pill } from "@/components/brand";

export default function TalentCard({ candidate, match, onShortlist, onMessage, onInterview, compact }) {
  const skills = candidate.skills.slice(0, 4).map((s) => s.name);
  return (
    <div className="bg-white border border-bordergray rounded-lg p-5 card-hover flex flex-col" data-testid={`talent-card-${candidate.slug}`}>
      <div className="flex items-start gap-4">
        <img src={candidate.avatar} alt={candidate.name} className="w-14 h-14 rounded-lg object-cover border border-bordergray/60" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link to={`/employer/candidate/${candidate.slug}`} className="font-display text-lg text-charcoal hover:text-terracotta leading-tight" data-testid={`candidate-name-${candidate.slug}`}>
                {candidate.name}
              </Link>
              <p className="text-bodygray text-sm">{candidate.title}</p>
            </div>
            {match && <MatchRing value={match.overall} size={54} stroke={5} />}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {skills.map((s) => <Pill key={s}>{s}</Pill>)}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-sm text-bodygray">
        <span className="inline-flex items-center gap-1.5"><Briefcase size={14} />{candidate.experience_years} yrs</span>
        <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{candidate.location}</span>
        <span className="inline-flex items-center gap-1.5"><Clock size={14} />Available in {candidate.available_in_days}d</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {candidate.interview_ready && <Pill tone="green">Interview Ready</Pill>}
        <VerifiedBadge />
      </div>

      {match?.reasons?.length > 0 && !compact && (
        <div className="mt-4 pt-4 border-t border-bordergray/50">
          <p className="label-eyebrow text-terracotta mb-1">Why Matched</p>
          <p className="text-sm text-charcoal leading-snug">{match.reasons[0]}</p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-bordergray/50">
        <Link to={`/employer/candidate/${candidate.slug}`} className="flex-1 text-center btn-primary rounded-md py-2 label-eyebrow" data-testid={`view-profile-${candidate.slug}`}>
          View Profile
        </Link>
        {onShortlist && <button onClick={() => onShortlist(candidate)} title="Shortlist" className="w-9 h-9 grid place-items-center rounded-md border border-bordergray hover:border-terracotta hover:text-terracotta transition-colors" data-testid={`shortlist-${candidate.slug}`}><Bookmark size={16} /></button>}
        {onMessage && <button onClick={() => onMessage(candidate)} title="Message" className="w-9 h-9 grid place-items-center rounded-md border border-bordergray hover:border-brandgreen hover:text-brandgreen transition-colors" data-testid={`message-${candidate.slug}`}><MessageSquare size={16} /></button>}
        {onInterview && <button onClick={() => onInterview(candidate)} title="Request Interview" className="w-9 h-9 grid place-items-center rounded-md border border-bordergray hover:border-brandgreen hover:text-brandgreen transition-colors" data-testid={`interview-${candidate.slug}`}><CalendarPlus size={16} /></button>}
      </div>
    </div>
  );
}
