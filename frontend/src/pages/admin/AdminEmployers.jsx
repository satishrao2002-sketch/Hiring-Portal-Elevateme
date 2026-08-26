import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Loading, Pill } from "@/components/brand";

export default function AdminEmployers() {
  const [c, setC] = useState(null);
  useEffect(() => { api.get("/admin/employers").then((r) => setC(r.data)).catch(() => {}); }, []);
  if (!c) return <Loading label="Loading employer CRM..." />;

  return (
    <div className="px-5 md:px-8 py-8 max-w-5xl">
      <p className="label-eyebrow text-terracotta">Employer CRM</p>
      <h1 className="font-display text-4xl text-charcoal mb-6">Employers</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {c.map((e) => (
          <div key={e.id} className="bg-white border border-bordergray rounded-xl p-6 card-hover" data-testid={`employer-${e.id}`}>
            <div className="flex items-start justify-between">
              <div><h3 className="font-display text-xl text-charcoal">{e.name}</h3><p className="text-sm text-bodygray">{e.industry} · {e.size}</p></div>
              <Pill tone={e.propensity === "High" ? "green" : "warning"}>{e.propensity} propensity</Pill>
            </div>
            <p className="text-sm text-bodygray mt-3">{e.about}</p>
            <div className="flex flex-wrap gap-1.5 mt-4">{e.tech.map((t) => <Pill key={t}>{t}</Pill>)}</div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-bordergray/50 text-sm">
              <span className="text-bodygray">Open roles: <span className="font-bold text-charcoal">{e.open_roles}</span></span>
              <span className="text-bodygray">Hiring velocity: <span className="font-bold text-charcoal">{e.hiring_velocity}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
