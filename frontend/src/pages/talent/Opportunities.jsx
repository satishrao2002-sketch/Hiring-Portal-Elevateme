import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, ArrowRight, TrendingUp } from "lucide-react";
import api from "@/lib/api";
import { Loading, MatchRing, Pill, CheckLine } from "@/components/brand";
import { toast } from "sonner";

export default function Opportunities() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/talent/dashboard").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <Loading label="Finding opportunities aligned to your profile..." />;

  return (
    <div className="px-5 md:px-8 py-8 max-w-5xl">
      <p className="label-eyebrow text-terracotta">Opportunities</p>
      <h1 className="font-display text-4xl text-charcoal">Where you're competitive</h1>
      <p className="text-bodygray mt-1">Curated, match-aware — not hundreds of generic jobs.</p>

      <div className="space-y-4 mt-6">
        {data.opportunities.map((o, i) => (
          <motion.div key={o.role.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white border border-bordergray rounded-xl p-6" data-testid={`opportunity-${o.role.id}`}>
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex items-center gap-4 md:w-72">
                <MatchRing value={o.match.overall} size={60} stroke={6} />
                <div><h3 className="font-display text-xl text-charcoal">{o.role.title}</h3><p className="text-sm text-bodygray">{o.company?.name} · {o.role.location}</p><p className="text-sm text-bodygray">${Math.round(o.role.salary_min / 1000)}–{Math.round(o.role.salary_max / 1000)}k · {o.role.work_model}</p></div>
              </div>
              <div className="flex-1">
                <p className="label-eyebrow text-brandgreen mb-1">Strong</p>
                <div className="flex flex-wrap gap-1.5">{o.match.matched_skills.map((s) => <Pill key={s} tone="green">{s}</Pill>)}</div>
                {o.match.missing_skills.length > 0 && <>
                  <p className="label-eyebrow text-terracotta mt-3 mb-1">Missing</p>
                  <div className="flex flex-wrap gap-1.5">{o.match.missing_skills.map((s) => <Pill key={s} tone="terracotta">{s}</Pill>)}</div>
                </>}
              </div>
              <div className="flex md:flex-col gap-2 md:w-40">
                <button onClick={() => toast.success("Application submitted")} className="btn-primary rounded-lg px-4 py-2 label-eyebrow inline-flex items-center justify-center gap-1.5 flex-1" data-testid={`apply-${o.role.id}`}>Apply <ArrowRight size={14} /></button>
                <button onClick={() => toast("Add mock interview to improve match")} className="rounded-lg px-4 py-2 label-eyebrow border border-bordergray text-charcoal hover:border-terracotta transition-colors inline-flex items-center justify-center gap-1.5 flex-1" data-testid={`improve-${o.role.id}`}><TrendingUp size={14} /> Improve</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
