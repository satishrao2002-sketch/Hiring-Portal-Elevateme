import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Check, X, HelpCircle, Swords, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { Loading, EmptyState, Pill } from "@/components/brand";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const DECISIONS = [["Strong Hire", "green"], ["Hire", "green"], ["Maybe", "warning"], ["No", "terracotta"]];
const STATUS_TONE = { Requested: "warning", Scheduled: "green", "Feedback Received": "terracotta" };

export default function Interviews() {
  const [items, setItems] = useState(null);
  const [fb, setFb] = useState(null);
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

  const load = () => api.get("/interviews").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setPlan(null); setFb(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const schedule = async (id) => {
    const dt = new Date(Date.now() + 3 * 864e5).toISOString();
    await api.patch(`/interviews/${id}/schedule?scheduled_at=${encodeURIComponent(dt)}`);
    toast.success("Interview scheduled"); load();
  };
  const submitFb = async (id, decision) => {
    await api.patch(`/interviews/${id}/feedback`, { decision, reason: "Technical", notes: "Strong evidence-based interview." });
    toast.success(`Feedback saved: ${decision}`); setFb(null); load();
  };
  const battlePlan = async (it) => {
    setPlan({ candidate: it.candidate, role: it.role_title, data: null });
    setPlanLoading(true);
    try { const { data } = await api.post(`/interviews/${it.id}/battle-plan`); setPlan((p) => ({ ...p, data: data.battle_plan })); }
    catch { toast.error("Could not generate battle plan"); setPlan(null); }
    finally { setPlanLoading(false); }
  };

  if (!items) return <Loading label="Loading interviews..." />;

  return (
    <div className="px-5 md:px-8 py-8 max-w-5xl">
      <p className="label-eyebrow text-terracotta">Interviews</p>
      <h1 className="font-display text-4xl text-charcoal mb-6">Interview Lifecycle</h1>

      {items.length === 0 ? (
        <EmptyState title="No interviews yet" hint="Request an interview with a candidate to begin."
          actions={<Link to="/employer/find-talent" className="btn-primary rounded-full px-6 py-2.5 label-eyebrow inline-block">Find Talent</Link>} />
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="bg-white border border-bordergray rounded-xl p-5" data-testid={`interview-${it.candidate?.slug}`}>
              <div className="flex items-center gap-4">
                <img src={it.candidate?.avatar} alt="" className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-display text-lg text-charcoal">{it.candidate?.name}</p>
                  <p className="text-sm text-bodygray">{it.role_title || it.candidate?.title} · {it.interview_type}</p>
                </div>
                <Pill tone={STATUS_TONE[it.status] || "neutral"}>{it.status}</Pill>
              </div>

              {it.feedback && (
                <div className="mt-3 bg-cream border border-bordergray rounded-lg p-3 text-sm">
                  <span className="label-eyebrow text-bodygray">Decision</span> <span className="font-bold text-charcoal">{it.feedback.decision}</span>
                  {it.feedback.reason && <> · <span className="text-bodygray">{it.feedback.reason}</span></>}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-bordergray/50">
                {it.status === "Requested" && (
                  <button onClick={() => schedule(it.id)} className="btn-secondary rounded-md px-4 py-2 label-eyebrow inline-flex items-center gap-2" data-testid={`schedule-${it.id}`}><CalendarCheck size={14} /> Schedule</button>
                )}
                <button onClick={() => battlePlan(it)} className="btn-primary rounded-md px-4 py-2 label-eyebrow inline-flex items-center gap-2" data-testid={`battle-plan-${it.id}`}><Swords size={14} /> Battle Plan</button>
                {it.status !== "Feedback Received" && (
                  <button onClick={() => setFb(fb === it.id ? null : it.id)} className="rounded-md px-4 py-2 label-eyebrow border border-bordergray text-charcoal hover:border-terracotta transition-colors" data-testid={`feedback-btn-${it.id}`}>Give Feedback</button>
                )}
                <Link to={`/employer/candidate/${it.candidate?.slug}`} className="rounded-md px-4 py-2 label-eyebrow text-terracotta">View Profile</Link>
              </div>

              {fb === it.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {DECISIONS.map(([d, tone]) => (
                    <button key={d} onClick={() => submitFb(it.id, d)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 label-eyebrow border border-bordergray hover:border-charcoal transition-colors" data-testid={`decision-${d.replace(/\s/g, "-").toLowerCase()}`}>
                      {tone === "green" ? <Check size={13} className="text-brandgreen" /> : tone === "terracotta" ? <X size={13} className="text-terracotta" /> : <HelpCircle size={13} className="text-bodygray" />} {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {plan && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 grid place-items-center p-4" onClick={() => setPlan(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-auto" data-testid="battle-plan-modal">
            <div className="sticky top-0 bg-charcoal text-cream px-6 py-4 flex items-center justify-between">
              <div><p className="label-eyebrow text-terracotta flex items-center gap-2"><Swords size={14} /> Interview Battle Plan</p><h2 className="font-display text-xl">{plan.candidate?.name} · {plan.role}</h2></div>
              <button onClick={() => setPlan(null)}><X /></button>
            </div>
            {planLoading || !plan.data ? (
              <div className="py-16"><Loading label="Preparing your battle plan..." /></div>
            ) : (
              <div className="p-6 space-y-5">
                <Block title="Company Overview"><p className="text-charcoal">{plan.data.company_overview}</p></Block>
                <Block title="Role Overview"><p className="text-charcoal">{plan.data.role_overview}</p></Block>
                <Block title="Likely Topics"><div className="flex flex-wrap gap-1.5">{plan.data.likely_topics.map((t, i) => <Pill key={i} tone="terracotta">{t}</Pill>)}</div></Block>
                <Block title="Likely Technical Questions"><List items={plan.data.technical_questions} /></Block>
                <Block title="Behavioral Questions"><List items={plan.data.behavioral_questions} /></Block>
                {plan.data.project_questions?.length > 0 && <Block title="Project Questions"><List items={plan.data.project_questions} /></Block>}
                <div className="grid md:grid-cols-2 gap-4">
                  <Block title="Your Strengths"><List items={plan.data.candidate_strengths} tone="green" /></Block>
                  <Block title="Watch Out For"><List items={plan.data.candidate_risks} tone="warn" /></Block>
                </div>
                <div className="bg-cream border border-bordergray rounded-lg p-4">
                  <p className="label-eyebrow text-terracotta mb-2 flex items-center gap-1.5"><Sparkles size={13} /> Preparation Tasks</p>
                  <List items={plan.data.prep_tasks} check />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Block({ title, children }) {
  return <div><p className="label-eyebrow text-bodygray mb-2">{title}</p>{children}</div>;
}
function List({ items = [], check, tone }) {
  const dot = tone === "green" ? "text-brandgreen" : tone === "warn" ? "text-warning" : "text-terracotta";
  return (
    <ul className="space-y-1.5 text-sm text-charcoal">
      {items.map((t, i) => <li key={i} className="flex gap-2"><span className={`${dot} font-bold`}>{check ? "☐" : "•"}</span> {t}</li>)}
    </ul>
  );
}
