import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api";
import { Loading, Pill } from "@/components/brand";
import TalentCard from "@/components/product/TalentCard";
import { toast } from "sonner";

const TABS = ["Overview", "Matches", "Shortlist", "Interviews", "Activity"];

export default function TalentRoom() {
  const { roleId } = useParams();
  const [data, setData] = useState(null);
  const [counts, setCounts] = useState({ shortlisted: 0, interviews: 0 });
  const [tab, setTab] = useState("Matches");

  useEffect(() => {
    api.get(`/roles/${roleId}/matches`).then((r) => setData(r.data)).catch(() => {});
    Promise.all([
      api.get("/shortlist").catch(() => ({ data: [] })),
      api.get("/interviews").catch(() => ({ data: [] })),
    ]).then(([sl, iv]) => setCounts({
      shortlisted: sl.data.filter((s) => s.role_id === roleId).length,
      interviews: iv.data.filter((i) => i.role_id === roleId).length,
    }));
  }, [roleId]);

  if (!data) return <Loading label="Opening talent room..." />;
  const { role, matches } = data;
  const strong = matches.filter((m) => m.match.overall >= 85);
  const ready = strong.filter((m) => m.candidate.interview_ready);

  const shortlist = async (c) => { try { await api.post("/shortlist", { candidate_slug: c.slug, role_id: roleId }); toast.success(`${c.name} shortlisted`); } catch { toast.error("Error"); } };
  const message = async (c) => { try { await api.post("/messages", { to_candidate_slug: c.slug, body: "Hi — interested in this role?" }); toast.success("Message sent"); } catch { toast.error("Error"); } };
  const interview = async (c) => { try { await api.post("/interviews", { candidate_slug: c.slug, role_id: roleId, role_title: role.title }); toast.success("Interview requested"); } catch { toast.error("Error"); } };

  return (
    <div className="px-5 md:px-8 py-8 max-w-6xl">
      <p className="label-eyebrow text-terracotta">Talent Room</p>
      <h1 className="font-display text-4xl text-charcoal">{role.title} · {role.location}</h1>
      <div className="flex flex-wrap gap-2 mt-3">{role.must_have.map((s) => <Pill key={s} tone="terracotta">{s}</Pill>)}</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {[["Strong matches", strong.length], ["Interview-ready", ready.length], ["Shortlisted", counts.shortlisted], ["Interviews", counts.interviews]].map(([l, v]) => (
          <div key={l} className="bg-white border border-bordergray rounded-xl p-4" data-testid={`room-kpi-${l.toLowerCase().replace(/\s+/g, "-")}`}><p className="font-display text-3xl text-charcoal" data-testid={`room-kpi-value-${l.toLowerCase().replace(/\s+/g, "-")}`}>{v}</p><p className="label-eyebrow text-bodygray">{l}</p></div>
        ))}
      </div>

      <div className="flex gap-2 mt-6 border-b border-bordergray overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 label-eyebrow border-b-2 -mb-px transition-colors ${tab === t ? "border-terracotta text-terracotta" : "border-transparent text-bodygray hover:text-charcoal"}`} data-testid={`room-tab-${t.toLowerCase()}`}>{t}</button>
        ))}
      </div>

      <div className="mt-6">
        {(tab === "Matches" || tab === "Overview") && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {matches.slice(0, 9).map((m) => <TalentCard key={m.candidate.slug} candidate={m.candidate} match={m.match} onShortlist={shortlist} onMessage={message} onInterview={interview} compact />)}
          </div>
        )}
        {tab !== "Matches" && tab !== "Overview" && (
          <div className="bg-white border border-bordergray rounded-xl p-10 text-center text-bodygray">
            <p className="font-display text-xl text-charcoal">{tab}</p>
            <p className="mt-1">Manage {tab.toLowerCase()} for this role in the Shortlist and Interviews sections.</p>
          </div>
        )}
      </div>
    </div>
  );
}
