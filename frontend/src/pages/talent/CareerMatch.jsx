import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { Loading, MatchRing } from "@/components/brand";
import { toast } from "sonner";

export default function CareerMatch() {
  const [text, setText] = useState("I'm a recent master's graduate with SQL, Python and Power BI.");
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState(null);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true); setRoles(null);
    try { const { data } = await api.post("/talent/career-match", { text }); setRoles(data.roles); }
    catch { toast.error("Could not generate career match"); }
    finally { setLoading(false); }
  };

  return (
    <div className="px-5 md:px-8 py-8 max-w-4xl">
      <p className="label-eyebrow text-terracotta">Career Match</p>
      <h1 className="font-display text-4xl text-charcoal">What role should I target?</h1>
      <p className="text-bodygray mt-1">Describe your background — ElevateMe recommends roles with honest fit and next steps.</p>

      <div className="bg-white border border-bordergray rounded-2xl p-6 mt-5">
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)}
          className="w-full bg-cream border border-bordergray rounded-lg p-4 outline-none focus:border-terracotta transition-colors resize-none" data-testid="career-input" />
        <button onClick={run} disabled={loading} className="btn-primary rounded-lg mt-3 px-6 py-3 label-eyebrow inline-flex items-center gap-2 disabled:opacity-60" data-testid="career-submit">
          <Sparkles size={15} /> Find My Career Match
        </button>
      </div>

      {loading && <Loading label="Finding opportunities aligned to your profile..." />}

      {roles && (
        <div className="mt-8 space-y-4">
          {roles.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white border border-bordergray rounded-xl p-6" data-testid={`career-role-${i}`}>
              <div className="flex items-start gap-4">
                <MatchRing value={r.match} size={60} stroke={6} />
                <div className="flex-1">
                  <h3 className="font-display text-2xl text-charcoal">{r.title}</h3>
                  <p className="text-charcoal mt-1"><span className="label-eyebrow text-brandgreen">Why</span> {r.why}</p>
                  <p className="text-bodygray text-sm mt-2"><span className="label-eyebrow text-terracotta">Missing</span> {r.missing}</p>
                  <p className="text-bodygray text-sm mt-1 inline-flex items-center gap-1"><ArrowRight size={13} className="text-charcoal" /> {r.improve}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
