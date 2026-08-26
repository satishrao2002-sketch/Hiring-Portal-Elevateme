import { useEffect, useState } from "react";
import { CalendarCheck, Check, X, HelpCircle } from "lucide-react";
import api from "@/lib/api";
import { Loading, EmptyState, Pill } from "@/components/brand";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const DECISIONS = [["Strong Hire", "green"], ["Hire", "green"], ["Maybe", "warning"], ["No", "terracotta"]];
const STATUS_TONE = { Requested: "warning", Scheduled: "green", "Feedback Received": "terracotta" };

export default function Interviews() {
  const [items, setItems] = useState(null);
  const [fb, setFb] = useState(null);

  const load = () => api.get("/interviews").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const schedule = async (id) => {
    const dt = new Date(Date.now() + 3 * 864e5).toISOString();
    await api.patch(`/interviews/${id}/schedule?scheduled_at=${encodeURIComponent(dt)}`);
    toast.success("Interview scheduled"); load();
  };
  const submitFb = async (id, decision) => {
    await api.patch(`/interviews/${id}/feedback`, { decision, reason: "Technical", notes: "Strong evidence-based interview." });
    toast.success(`Feedback saved: ${decision}`); setFb(null); load();
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
    </div>
  );
}
