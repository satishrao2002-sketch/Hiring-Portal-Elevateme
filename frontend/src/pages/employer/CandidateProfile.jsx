import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin, Clock, Briefcase, GraduationCap, ShieldCheck, Github, ExternalLink,
  FileCode2, Bookmark, MessageSquare, CalendarPlus, Award,
} from "lucide-react";
import api from "@/lib/api";
import { Loading, MatchRing, Pill, VerifiedBadge, DimBar } from "@/components/brand";
import WhyMatch from "@/components/product/WhyMatch";
import { toast } from "sonner";

const EV_ICON = { GitHub: Github, Dashboard: FileCode2, Portfolio: ExternalLink, Assessment: Award, "Case Study": FileCode2 };

export default function CandidateProfile() {
  const { slug } = useParams();
  const [c, setC] = useState(null);
  const [roles, setRoles] = useState([]);
  const [why, setWhy] = useState(null);
  const [loadingWhy, setLoadingWhy] = useState(false);

  useEffect(() => {
    (async () => {
      const [cand, rs] = await Promise.all([api.get(`/candidates/${slug}`), api.get("/roles")]);
      setC(cand.data); setRoles(rs.data);
      if (rs.data[0]) runWhy(rs.data[0].id, cand.data.slug);
    })();
    // eslint-disable-next-line
  }, [slug]);

  const runWhy = async (roleId, cslug) => {
    setLoadingWhy(true);
    try { const { data } = await api.post("/match/why", { role_id: roleId, candidate_slug: cslug }); setWhy(data); }
    catch { /* ignore */ }
    finally { setLoadingWhy(false); }
  };

  const action = async (kind) => {
    try {
      if (kind === "shortlist") { await api.post("/shortlist", { candidate_slug: slug }); toast.success("Shortlisted"); }
      if (kind === "message") { await api.post("/messages", { to_candidate_slug: slug, body: "Hi — I'd love to connect." }); toast.success("Message sent"); }
      if (kind === "interview") { await api.post("/interviews", { candidate_slug: slug, role_title: c.title }); toast.success("Interview requested"); }
    } catch { toast.error("Please sign in as recruiter/employer"); }
  };

  if (!c) return <Loading label="Preparing talent intelligence profile..." />;
  const a = c.assessment;

  return (
    <div className="px-5 md:px-8 py-8 max-w-6xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-charcoal text-cream rounded-2xl p-7">
        <p className="label-eyebrow text-terracotta">Talent Intelligence Profile</p>
        <div className="flex flex-col md:flex-row md:items-center gap-5 mt-3">
          <img src={c.avatar} alt={c.name} className="w-20 h-20 rounded-xl object-cover" />
          <div className="flex-1">
            <h1 className="font-display text-4xl">{c.name}</h1>
            <p className="text-cream/70">{c.title} · elevateme.com/talent/{c.slug}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {c.interview_ready && <Pill tone="green">Interview Ready</Pill>}
              <VerifiedBadge />
            </div>
          </div>
          <div className="flex gap-6 text-center">
            <div><MatchRing value={why?.match?.overall || c.talent_score} size={64} stroke={6} /><p className="label-eyebrow text-cream/60 mt-1">Role Match</p></div>
            <div><p className="font-display text-4xl">{c.talent_score}</p><p className="label-eyebrow text-cream/60">Talent Score</p></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          <button onClick={() => action("shortlist")} className="bg-white text-charcoal rounded-lg px-4 py-2 label-eyebrow inline-flex items-center gap-2 hover:bg-cream transition-colors" data-testid="profile-shortlist"><Bookmark size={14} /> Shortlist</button>
          <button onClick={() => action("message")} className="btn-secondary rounded-lg px-4 py-2 label-eyebrow inline-flex items-center gap-2" data-testid="profile-message"><MessageSquare size={14} /> Message</button>
          <button onClick={() => action("interview")} className="btn-primary rounded-lg px-4 py-2 label-eyebrow inline-flex items-center gap-2" data-testid="profile-interview"><CalendarPlus size={14} /> Request Interview</button>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mt-6">
        <div className="space-y-6">
          {/* At a glance */}
          <div className="bg-white border border-bordergray rounded-xl p-6">
            <p className="label-eyebrow text-bodygray mb-4">At a Glance</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[[MapPin, "Location", c.location], [Clock, "Availability", `In ${c.available_in_days} days`],
                [Briefcase, "Experience", `${c.experience_years} yrs`], [GraduationCap, "Education", c.education],
                [ShieldCheck, "Work Auth", c.work_authorization], [Award, "Work Model", c.work_model]].map(([Icon, l, v]) => (
                <div key={l} className="flex items-start gap-2"><Icon size={16} className="text-terracotta mt-0.5 shrink-0" /><div><p className="label-eyebrow text-bodygray">{l}</p><p className="text-charcoal">{v}</p></div></div>
              ))}
            </div>
          </div>

          {/* Verified skills */}
          <div className="bg-white border border-bordergray rounded-xl p-6">
            <p className="label-eyebrow text-bodygray mb-4">Verified Skills</p>
            <div className="space-y-3">
              {c.skills.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <span className="font-bold text-charcoal">{s.name}</span>
                  <span className="flex items-center gap-3"><span className="text-sm text-bodygray">{s.level}</span>{s.verified && <Pill tone="green"><ShieldCheck size={11} className="mr-1" /> Verified</Pill>}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="bg-white border border-bordergray rounded-xl p-6">
            <p className="label-eyebrow text-bodygray mb-4">Professional Experience</p>
            {c.professional_experience.length === 0 ? <p className="text-bodygray text-sm">No full-time employment yet — see Applied Experience.</p> : c.professional_experience.map((e, i) => (
              <div key={i} className="mb-3 last:mb-0"><p className="font-bold text-charcoal">{e.role} · {e.company}</p><p className="text-xs text-bodygray">{e.duration}</p><p className="text-sm text-bodygray mt-1">{e.summary}</p></div>
            ))}
            <p className="label-eyebrow text-bodygray mt-6 mb-3">Applied Experience</p>
            {c.applied_experience.map((e, i) => (
              <div key={i} className="mb-3 last:mb-0"><p className="font-bold text-charcoal">{e.title} <Pill>{e.type}</Pill></p><p className="text-sm text-bodygray mt-1">{e.summary}</p></div>
            ))}
          </div>

          {/* Show me the work */}
          <div className="bg-white border border-bordergray rounded-xl p-6">
            <p className="label-eyebrow text-terracotta mb-1">Show Me The Work</p>
            <p className="text-bodygray text-sm mb-4">Evidence prioritized above keyword claims.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {c.evidence.map((ev, i) => {
                const Icon = EV_ICON[ev.type] || FileCode2;
                return (
                  <a key={i} href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-3 border border-bordergray rounded-lg p-3 hover:border-terracotta transition-colors" data-testid={`evidence-${i}`}>
                    <div className="w-9 h-9 rounded-lg bg-cream grid place-items-center"><Icon size={16} className="text-charcoal" /></div>
                    <div className="min-w-0"><p className="label-eyebrow text-bodygray">{ev.type}</p><p className="text-sm text-charcoal truncate">{ev.label}</p></div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: assessment + why match */}
        <div className="space-y-6">
          <div className="bg-white border border-bordergray rounded-xl p-6">
            <p className="label-eyebrow text-bodygray mb-4">Assessment</p>
            <div className="space-y-2.5">
              <DimBar label="Technical" value={a.technical} />
              <DimBar label="Problem Solving" value={a.problem_solving} />
              <DimBar label="Communication" value={a.communication} />
              <DimBar label="Interview Ready" value={a.interview_readiness} />
            </div>
          </div>

          {roles.length > 0 && (
            <div>
              <div className="mb-3">
                <p className="label-eyebrow text-bodygray mb-2">Match against role</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <button key={r.id} onClick={() => runWhy(r.id, c.slug)} className="text-xs font-bold px-3 py-1.5 rounded-full border border-bordergray hover:border-terracotta transition-colors" data-testid={`match-role-${r.id}`}>{r.title}</button>
                  ))}
                </div>
              </div>
              {loadingWhy ? <Loading label="Preparing match explanation..." /> : why && <WhyMatch match={why.match} narrative={why.narrative} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
