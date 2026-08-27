import { useEffect, useRef, useState } from "react";
import { FolderPlus, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";

export default function AddToPoolMenu({ candidateSlug, roleId, variant = "icon", onChanged }) {
  const [open, setOpen] = useState(false);
  const [pools, setPools] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const load = async () => {
    setPools(null);
    try { const r = await api.get("/pools"); setPools(r.data); }
    catch { setPools([]); }
  };

  const toggle = () => { const next = !open; setOpen(next); if (next) load(); };

  const addTo = async (pool) => {
    setBusy(true);
    try {
      await api.post(`/pools/${pool.id}/candidates`, { candidate_slug: candidateSlug });
      toast.success(`Added to "${pool.name}"`);
      setOpen(false);
      onChanged && onChanged();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const createAndAdd = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const r = await api.post("/pools", { name: name.trim(), role_id: roleId });
      await api.post(`/pools/${r.data.id}/candidates`, { candidate_slug: candidateSlug });
      toast.success(`Created "${r.data.name}" and added`);
      setName(""); setCreating(false); setOpen(false);
      onChanged && onChanged();
    } catch (e) { toast.error(formatApiError(e?.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <div className="relative" ref={ref}>
      {variant === "icon" ? (
        <button onClick={toggle} title="Add to pool" data-testid={`add-to-pool-${candidateSlug}`}
          className="w-9 h-9 grid place-items-center rounded-md border border-bordergray hover:border-terracotta hover:text-terracotta transition-colors">
          <FolderPlus size={16} />
        </button>
      ) : (
        <button onClick={toggle} data-testid={`add-to-pool-${candidateSlug}`}
          className="bg-white text-charcoal rounded-lg px-4 py-2 label-eyebrow inline-flex items-center gap-2 hover:bg-cream transition-colors">
          <FolderPlus size={14} /> Add to Pool
        </button>
      )}
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 bg-white border border-bordergray rounded-xl shadow-xl p-2" data-testid="pool-menu">
          <p className="label-eyebrow text-bodygray px-2 py-1">Add to a talent pool</p>
          <div className="max-h-56 overflow-auto">
            {pools === null ? (
              <div className="px-2 py-3 text-sm text-bodygray inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
            ) : pools.length === 0 ? (
              <p className="px-2 py-2 text-sm text-bodygray">No pools yet. Create one below.</p>
            ) : pools.map((p) => (
              <button key={p.id} disabled={busy} onClick={() => addTo(p)} data-testid={`pool-option-${p.id}`}
                className="w-full text-left px-2 py-2 rounded-md hover:bg-cream transition-colors flex items-center justify-between text-sm">
                <span className="font-bold text-charcoal truncate">{p.name}</span>
                <span className="text-bodygray text-xs inline-flex items-center gap-1"><Check size={12} /> {p.count}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-bordergray mt-2 pt-2">
            {creating ? (
              <div className="flex items-center gap-1.5 px-1">
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Pool name"
                  onKeyDown={(e) => e.key === "Enter" && createAndAdd()} data-testid="new-pool-name"
                  className="flex-1 min-w-0 border border-bordergray rounded-md px-2 py-1.5 text-sm outline-none focus:border-terracotta" />
                <button onClick={createAndAdd} disabled={busy || !name.trim()} data-testid="create-pool-confirm"
                  className="bg-terracotta text-white rounded-md px-2.5 py-1.5 text-sm font-bold disabled:opacity-50">Add</button>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} data-testid="new-pool-btn"
                className="w-full text-left px-2 py-2 rounded-md hover:bg-cream transition-colors text-sm font-bold text-terracotta inline-flex items-center gap-2"><Plus size={14} /> New pool</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
