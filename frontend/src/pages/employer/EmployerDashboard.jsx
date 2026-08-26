import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Users, CalendarCheck, Trophy, ArrowUpRight, AlertCircle, Bell } from "lucide-react";
import api from "@/lib/api";
import { Loading, Pill } from "@/components/brand";
import { useAuth } from "@/context/AuthContext";

const STATS = [
  ["Open Roles", "roles", Briefcase], ["Shortlisted", "shortlist", Users],
  ["Interviews", "interviews", CalendarCheck], ["Offers", "offers", Trophy],
];

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [roles, cands, sl, iv] = await Promise.all([
        api.get("/roles"), api.get("/candidates?ready=true"),
        api.get("/shortlist").catch(() => ({ data: [] })),
        api.get("/interviews").catch(() => ({ data: [] })),
      ]);
      setData({ roles: roles.data, candidates: cands.data, shortlist: sl.data, interviews: iv.data });
    })();
  }, []);

  if (!data) return <Loading label="Loading your workspace..." />;
  const counts = { roles: data.roles.length, shortlist: data.shortlist.length, interviews: data.interviews.length, offers: 1 };

  return (
    <div className="px-5 md:px-8 py-8 max-w-6xl">
      <p className="label-eyebrow text-terracotta">Dashboard</p>
      <h1 className="font-display text-4xl text-charcoal">Welcome, {user.name.split(" ")[0]}.</h1>
      <p className="text-bodygray mt-1">Focus on decisions and actions — not vanity metrics.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {STATS.map(([label, key, Icon], i) => (
          <motion.div key={key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white border border-bordergray rounded-xl p-5">
            <Icon size={18} className="text-terracotta mb-3" />
            <p className="font-display text-4xl text-charcoal">{counts[key]}</p>
            <p className="label-eyebrow text-bodygray mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Needs your attention */}
      <div className="bg-charcoal text-cream rounded-2xl p-6 mt-6">
        <p className="label-eyebrow text-terracotta flex items-center gap-2"><Bell size={14} /> Needs Your Attention</p>
        <div className="grid md:grid-cols-3 gap-3 mt-4">
          {[
            [`${data.candidates.length} strong candidates ready`, "Review interview-ready talent"],
            ["2 interviews need scheduling", "Confirm times with candidates"],
            ["New exceptional match", "94% fit for Data Analyst"],
          ].map(([t, d]) => (
            <div key={t} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <AlertCircle size={16} className="text-warning mb-2" />
              <p className="font-bold">{t}</p><p className="text-cream/60 text-sm mt-0.5">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Open roles */}
      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="font-display text-2xl text-charcoal">My Roles</h2>
        <Link to="/employer/find-talent" className="label-eyebrow text-terracotta inline-flex items-center gap-1 hover:gap-2 transition-all">Create role <ArrowUpRight size={14} /></Link>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {data.roles.map((r) => (
          <Link key={r.id} to={`/employer/room/${r.id}`} className="bg-white border border-bordergray rounded-xl p-5 card-hover block" data-testid={`role-card-${r.id}`}>
            <div className="flex items-center justify-between">
              <Pill tone="green">{r.status}</Pill>
              <span className="label-eyebrow text-bodygray">{r.seniority}</span>
            </div>
            <h3 className="font-display text-xl text-charcoal mt-3">{r.title}</h3>
            <p className="text-bodygray text-sm">{r.location} · {r.work_model}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">{r.must_have.slice(0, 3).map((s) => <Pill key={s}>{s}</Pill>)}</div>
            <p className="label-eyebrow text-terracotta mt-4 inline-flex items-center gap-1">Open Talent Room <ArrowUpRight size={13} /></p>
          </Link>
        ))}
      </div>
    </div>
  );
}
