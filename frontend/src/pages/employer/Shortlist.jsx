import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Columns3, X } from "lucide-react";
import api from "@/lib/api";
import { Loading, EmptyState, MatchRing, Pill, VerifiedBadge } from "@/components/brand";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Shortlist() {
  const [items, setItems] = useState(null);
  const [compare, setCompare] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const load = () => api.get("/shortlist").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setShowCompare(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const remove = async (slug) => {
    await api.delete(`/shortlist/${slug}`);
    toast.success("Removed from shortlist");
    setCompare(compare.filter((s) => s !== slug));
    load();
  };
  const toggleCompare = (slug) => setCompare((p) => p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]);

  if (!items) return <Loading label="Building your shortlist..." />;

  const compareCands = items.filter((i) => compare.includes(i.candidate.slug)).map((i) => i.candidate);

  return (
    <div className="px-5 md:px-8 py-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><p className="label-eyebrow text-terracotta">My Shortlist</p><h1 className="font-display text-4xl text-charcoal">{items.length} Candidates</h1></div>
        {compare.length >= 2 && (
          <button onClick={() => setShowCompare(true)} className="btn-primary rounded-full px-5 py-2.5 label-eyebrow inline-flex items-center gap-2" data-testid="compare-btn">
            <Columns3 size={15} /> Compare ({compare.length})
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-8"><EmptyState title="No candidates shortlisted yet" hint="Find talent and shortlist candidates to compare them here."
          actions={<Link to="/employer/find-talent" className="btn-primary rounded-full px-6 py-2.5 label-eyebrow inline-block">Find Talent</Link>} /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {items.map((it) => {
            const c = it.candidate;
            const sel = compare.includes(c.slug);
            return (
              <motion.div key={c.slug} layout className={`bg-white border rounded-xl p-5 ${sel ? "border-terracotta" : "border-bordergray"}`} data-testid={`shortlist-item-${c.slug}`}>
                <div className="flex items-start gap-4">
                  <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1">
                    <Link to={`/employer/candidate/${c.slug}`} className="font-display text-lg text-charcoal hover:text-terracotta">{c.name}</Link>
                    <p className="text-sm text-bodygray">{c.title} · {c.location}</p>
                    <div className="flex items-center gap-2 mt-2">{c.interview_ready && <Pill tone="green">Interview Ready</Pill>}<VerifiedBadge /></div>
                  </div>
                  <MatchRing value={c.talent_score} size={48} stroke={5} />
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-bordergray/50">
                  <button onClick={() => toggleCompare(c.slug)} className={`flex-1 rounded-md py-2 label-eyebrow border transition-colors ${sel ? "bg-terracotta text-white border-terracotta" : "border-bordergray text-charcoal hover:border-terracotta"}`} data-testid={`compare-toggle-${c.slug}`}>
                    {sel ? "Selected" : "Add to Compare"}
                  </button>
                  <button onClick={() => remove(c.slug)} className="w-9 h-9 grid place-items-center rounded-md border border-bordergray hover:border-salmon hover:text-salmon transition-colors" data-testid={`remove-${c.slug}`}><Trash2 size={16} /></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showCompare && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 grid place-items-center p-4" onClick={() => setShowCompare(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-auto" data-testid="compare-modal">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl text-charcoal">Candidate Comparison</h2>
              <button onClick={() => setShowCompare(false)}><X /></button>
            </div>
            <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[420px]">
              <thead><tr className="border-b border-bordergray">
                <th className="text-left py-3 label-eyebrow text-bodygray">Candidate</th>
                {compareCands.map((c) => <th key={c.slug} className="text-left py-3 font-display text-charcoal">{c.name}</th>)}
              </tr></thead>
              <tbody className="text-charcoal">
                {[
                  ["Match / Score", (c) => c.talent_score],
                  ["Technical", (c) => c.assessment.technical],
                  ["Communication", (c) => c.assessment.communication],
                  ["Experience", (c) => `${c.experience_years} yrs`],
                  ["Availability", (c) => `${c.available_in_days} days`],
                  ["Location", (c) => c.location],
                  ["Skills", (c) => c.skills.slice(0, 3).map((s) => s.name).join(", ")],
                  ["Risk", (c) => c.gaps[0] || "None"],
                ].map(([label, fn]) => (
                  <tr key={label} className="border-b border-bordergray/40">
                    <td className="py-2.5 label-eyebrow text-bodygray">{label}</td>
                    {compareCands.map((c) => <td key={c.slug} className="py-2.5">{fn(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
