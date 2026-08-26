import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Loading, RiskDot } from "@/components/brand";

export default function AdminCandidates() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/command-center").then((r) => setD(r.data)).catch(() => {}); }, []);
  if (!d) return <Loading label="Loading placement control tower..." />;

  return (
    <div className="px-5 md:px-8 py-8 max-w-6xl">
      <p className="label-eyebrow text-terracotta">Placement Control Tower</p>
      <h1 className="font-display text-4xl text-charcoal mb-6">Candidates</h1>

      <div className="bg-white border border-bordergray rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream border-b border-bordergray">
              <tr>{["Candidate", "Target Role", "Readiness", "Blocker", "Next Action", "Owner", "Risk"].map((h) => <th key={h} className="text-left px-4 py-3 label-eyebrow text-bodygray whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {d.control_tower.map((c) => (
                <tr key={c.slug} className="border-b border-bordergray/40 hover:bg-cream/50 transition-colors" data-testid={`ct-row-${c.slug}`}>
                  <td className="px-4 py-3"><Link to={`/employer/candidate/${c.slug}`} className="flex items-center gap-2 font-bold text-charcoal hover:text-terracotta"><img src={c.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />{c.name}</Link></td>
                  <td className="px-4 py-3 text-charcoal whitespace-nowrap">{c.target_role}</td>
                  <td className="px-4 py-3 font-display text-charcoal">{c.readiness}</td>
                  <td className="px-4 py-3 text-bodygray max-w-[180px]">{c.blocker}</td>
                  <td className="px-4 py-3 text-charcoal">{c.next_action}</td>
                  <td className="px-4 py-3 text-bodygray whitespace-nowrap">{c.owner}</td>
                  <td className="px-4 py-3"><RiskDot risk={c.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
