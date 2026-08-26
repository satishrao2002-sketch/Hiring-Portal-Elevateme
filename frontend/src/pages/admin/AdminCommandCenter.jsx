import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Building2, CalendarCheck, Trophy, Gauge, Clock, Activity } from "lucide-react";
import api from "@/lib/api";
import { Loading } from "@/components/brand";

const GROUPS = [
  ["Talent", [["Candidates", "candidates", Users], ["Ready", "ready_candidates", Activity], ["At Risk", "at_risk_candidates", Gauge]]],
  ["Demand", [["Employers", "employers", Building2], ["Active Roles", "active_roles", Activity], ["Matches", "matches", Trophy]]],
  ["Pipeline", [["Interviews", "interviews", CalendarCheck], ["Final Rounds", "final_rounds", CalendarCheck], ["Offers", "offers", Trophy], ["Placements", "placements", Trophy]]],
];

export default function AdminCommandCenter() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/command-center").then((r) => setD(r.data)).catch(() => {}); }, []);
  if (!d) return <Loading label="Loading command center..." />;

  return (
    <div className="px-5 md:px-8 py-8 max-w-6xl">
      <p className="label-eyebrow text-terracotta">ElevateMe · Command Center</p>
      <h1 className="font-display text-4xl text-charcoal">Where is the highest probability of placement?</h1>

      {GROUPS.map(([group, items], gi) => (
        <div key={group} className="mt-8">
          <p className="label-eyebrow text-bodygray mb-3">{group}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map(([label, key, Icon], i) => (
              <motion.div key={key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (gi * 3 + i) * 0.04 }}
                className="bg-white border border-bordergray rounded-xl p-5">
                <Icon size={17} className="text-terracotta mb-3" />
                <p className="font-display text-4xl text-charcoal">{d[key]}</p>
                <p className="label-eyebrow text-bodygray mt-1">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      <div className="grid md:grid-cols-4 gap-4 mt-8">
        {[["Placement Rate", `${d.placement_rate}%`], ["Time to 1st Interview", `${d.time_to_first_interview}d`], ["Time to Offer", `${d.time_to_offer}d`], ["Time to Placement", `${d.time_to_placement}d`]].map(([l, v]) => (
          <div key={l} className="bg-charcoal text-cream rounded-xl p-5"><Clock size={16} className="text-terracotta mb-2" /><p className="font-display text-3xl">{v}</p><p className="label-eyebrow text-cream/60">{l}</p></div>
        ))}
      </div>
    </div>
  );
}
