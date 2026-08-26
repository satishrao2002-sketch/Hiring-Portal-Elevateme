import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp, Target } from "lucide-react";
import api from "@/lib/api";
import { Loading, MatchRing, DimBar, Pill } from "@/components/brand";
import { useAuth } from "@/context/AuthContext";

export default function TalentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/talent/dashboard").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <Loading label="Building your career control center..." />;

  const { readiness, career_paths, opportunities, holding_back } = data;

  return (
    <div className="px-5 md:px-8 py-8 max-w-5xl">
      <p className="label-eyebrow text-terracotta">Your Career Control Center</p>
      <h1 className="font-display text-4xl text-charcoal">Hi, {user.name.split(" ")[0]}.</h1>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 mt-6">
        {/* Readiness */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-charcoal text-cream rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div><p className="label-eyebrow text-terracotta">Career Readiness</p><p className="font-display text-5xl">{readiness.overall}<span className="text-2xl text-cream/50">/100</span></p></div>
            <MatchRing value={readiness.overall} size={72} stroke={7} />
          </div>
          <div className="mt-5 space-y-2.5">
            {Object.entries(readiness.components).slice(0, 5).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="label-eyebrow text-cream/60 w-32 shrink-0">{k}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-mint rounded-full" style={{ width: `${v}%` }} /></div>
                <span className="text-sm w-8 text-right">{v}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Career paths */}
        <div className="bg-white border border-bordergray rounded-2xl p-6">
          <p className="label-eyebrow text-bodygray mb-4 flex items-center gap-2"><Target size={14} className="text-terracotta" /> Strongest Career Paths</p>
          <div className="space-y-3">
            {career_paths.map((p) => <DimBar key={p.title} label={p.title} value={p.match} />)}
          </div>
          <Link to="/talent/career" className="label-eyebrow text-terracotta inline-flex items-center gap-1 mt-5 hover:gap-2 transition-all">Explore Career Match <ArrowUpRight size={14} /></Link>
        </div>
      </div>

      {/* What's holding you back */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-warning/15 border border-warning rounded-2xl p-6 mt-6" data-testid="holding-back">
        <p className="label-eyebrow text-charcoal mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-terracotta" /> What's Holding You Back?</p>
        <div className="grid md:grid-cols-3 gap-5">
          <div><p className="label-eyebrow text-bodygray">You're strong in</p><div className="flex flex-wrap gap-1.5 mt-2">{holding_back.strong_in.map((s) => <Pill key={s} tone="green">{s}</Pill>)}</div></div>
          <div><p className="label-eyebrow text-bodygray">Biggest blocker</p><p className="font-display text-xl text-charcoal mt-1">{holding_back.blocker}</p></div>
          <div><p className="label-eyebrow text-bodygray">Improve this</p><p className="text-charcoal mt-1">{holding_back.action}</p><p className="text-sm text-brandgreen font-bold mt-1">+{holding_back.expected_gain} readiness points</p></div>
        </div>
      </motion.div>

      {/* Opportunities */}
      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="font-display text-2xl text-charcoal">Opportunities where you're competitive</h2>
        <Link to="/talent/opportunities" className="label-eyebrow text-terracotta">View all</Link>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {opportunities.slice(0, 3).map((o) => (
          <div key={o.role.id} className="bg-white border border-bordergray rounded-xl p-5 card-hover">
            <div className="flex items-center justify-between"><Pill tone="green">{o.company?.name}</Pill><MatchRing value={o.match.overall} size={44} stroke={4} /></div>
            <h3 className="font-display text-lg text-charcoal mt-3">{o.role.title}</h3>
            <p className="text-sm text-bodygray">{o.role.location} · ${Math.round(o.role.salary_min / 1000)}–{Math.round(o.role.salary_max / 1000)}k</p>
            {o.match.missing_skills.length > 0 && <p className="text-xs text-bodygray mt-2">Missing: {o.match.missing_skills.join(", ")}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
