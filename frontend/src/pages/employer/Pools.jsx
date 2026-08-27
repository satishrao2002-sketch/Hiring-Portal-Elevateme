import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, FolderPlus, Plus, ArrowLeft, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Loading, EmptyState, MatchRing, Pill, VerifiedBadge } from "@/components/brand";

export default function Pools() {
  const [pools, setPools] = useState(null);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/pools").then((r) => setPools(r.data)).catch(() => setPools([]));
  useEffect(() => { load(); }, []);

  const createPool = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await api.post("/pools", { name: name.trim() }); toast.success(`Pool "${name.trim()}" created`); setName(""); setCreating(false); load(); }
    catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
    finally { setBusy(false); }
  };
  const deletePool = async (id, e) => {
    e && e.stopPropagation();
    await api.delete(`/pools/${id}`); toast.success("Pool deleted"); load();
  };
  const openPool = async (id) => {
    setSelected("loading");
    try { const r = await api.get(`/pools/${id}`); setSelected(r.data); }
    catch { setSelected(null); toast.error("Couldn't open pool"); }
  };
  const removeCandidate = async (slug) => {
    await api.delete(`/pools/${selected.id}/candidates/${slug}`);
    toast.success("Removed from pool");
    setSelected({ ...selected, candidates: selected.candidates.filter((c) => c.slug !== slug) });
    load();
  };

  if (!pools) return <Loading label="Loading your talent pools..." />;

  // ---- Detail view ----
  if (selected && selected !== "loading") {
    return (
      <div className="px-5 md:px-8 py-8 max-w-6xl">
        <button onClick={() => { setSelected(null); load(); }} className="text-bodygray hover:text-terracotta inline-flex items-center gap-1.5 label-eyebrow mb-4" data-testid="pool-back"><ArrowLeft size={15} /> All Pools</button>
        <p className="label-eyebrow text-terracotta">Talent Pool</p>
        <h1 className="font-display text-4xl text-charcoal">{selected.name}</h1>
        {selected.description && <p className="text-bodygray mt-1">{selected.description}</p>}
        <p className="text-sm text-bodygray mt-1">{selected.candidates.length} candidate{selected.candidates.length === 1 ? "" : "s"}</p>

        {selected.candidates.length === 0 ? (
          <div className="mt-8"><EmptyState title="This pool is empty" hint="Add candidates from Find Talent or a candidate's profile using ‘Add to Pool’."
            actions={<Link to="/employer/find-talent" className="btn-primary rounded-full px-6 py-2.5 label-eyebrow inline-block">Find Talent</Link>} /></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {selected.candidates.map((c) => (
              <motion.div key={c.slug} layout className="bg-white border border-bordergray rounded-xl p-5" data-testid={`pool-candidate-${c.slug}`}>
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
                  <Link to={`/employer/candidate/${c.slug}`} className="flex-1 rounded-md py-2 label-eyebrow border border-bordergray text-charcoal hover:border-terracotta transition-colors text-center" data-testid={`pool-view-${c.slug}`}>View Profile</Link>
                  <button onClick={() => removeCandidate(c.slug)} className="w-9 h-9 grid place-items-center rounded-md border border-bordergray hover:border-salmon hover:text-salmon transition-colors" data-testid={`pool-remove-${c.slug}`}><Trash2 size={16} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (selected === "loading") return <Loading label="Opening pool..." />;

  // ---- List view ----
  return (
    <div className="px-5 md:px-8 py-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><p className="label-eyebrow text-terracotta">Talent Pools</p><h1 className="font-display text-4xl text-charcoal">{pools.length} Pool{pools.length === 1 ? "" : "s"}</h1></div>
        {creating ? (
          <div className="flex items-center gap-2">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createPool()}
              placeholder="e.g. Data Science New-Grads 2026" data-testid="pool-name-input"
              className="border border-bordergray rounded-lg px-3 py-2.5 text-sm outline-none focus:border-terracotta w-64" />
            <button onClick={createPool} disabled={busy || !name.trim()} className="btn-primary rounded-full px-5 py-2.5 label-eyebrow disabled:opacity-50" data-testid="pool-create-confirm">Create</button>
            <button onClick={() => { setCreating(false); setName(""); }} className="text-bodygray label-eyebrow px-2">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="btn-primary rounded-full px-5 py-2.5 label-eyebrow inline-flex items-center gap-2" data-testid="new-pool-btn"><Plus size={15} /> New Pool</button>
        )}
      </div>

      {pools.length === 0 ? (
        <div className="mt-8"><EmptyState title="No talent pools yet" hint="Create named pools (like ‘Data Science New-Grads 2026’) to organise and compare shortlisted candidates per role."
          actions={<button onClick={() => setCreating(true)} className="btn-primary rounded-full px-6 py-2.5 label-eyebrow inline-flex items-center gap-2" data-testid="empty-new-pool"><FolderPlus size={15} /> Create Your First Pool</button>} /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {pools.map((p) => (
            <motion.div key={p.id} layout onClick={() => openPool(p.id)} data-testid={`pool-card-${p.id}`}
              className="bg-white border border-bordergray rounded-xl p-5 cursor-pointer card-hover">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-cream grid place-items-center text-terracotta"><Users size={18} /></div>
                <button onClick={(e) => deletePool(p.id, e)} className="text-bodygray hover:text-salmon transition-colors" data-testid={`pool-delete-${p.id}`}><Trash2 size={15} /></button>
              </div>
              <h2 className="font-display text-xl text-charcoal mt-3">{p.name}</h2>
              {p.description && <p className="text-sm text-bodygray mt-1 line-clamp-2">{p.description}</p>}
              <p className="text-sm text-charcoal font-bold mt-3">{p.count} candidate{p.count === 1 ? "" : "s"}</p>
              {p.preview.length > 0 && <p className="text-xs text-bodygray mt-1 truncate">{p.preview.map((c) => c.name).join(", ")}{p.count > p.preview.length ? "…" : ""}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
