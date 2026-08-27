import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, ArrowRight, Compass, SlidersHorizontal } from "lucide-react";
import api from "@/lib/api";
import { Loading, EmptyState, Pill } from "@/components/brand";
import TalentCard from "@/components/product/TalentCard";
import { toast } from "sonner";

const LOADERS = [
  "Understanding your hiring requirements...",
  "Finding verified talent...",
  "Analyzing candidate evidence...",
  "Preparing match explanations...",
];

const MODES = [["match", "Match", Sparkles], ["discover", "Discover", Compass], ["search", "Search", SlidersHorizontal]];

export default function FindTalent() {
  const loc = useLocation();
  const [mode, setMode] = useState("match");
  const [text, setText] = useState(loc.state?.intake || "");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState(LOADERS[0]);
  const [result, setResult] = useState(null);
  const [discover, setDiscover] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get("/candidates").then((r) => setDiscover(r.data)).catch(() => {});
    if (loc.state?.intake) runIntake(loc.state.intake);
    // eslint-disable-next-line
  }, []);

  const runIntake = async (t) => {
    const payload = t ?? text;
    if (!payload.trim()) { toast.error("Describe who you need first"); return; }
    setLoading(true); setResult(null);
    let i = 0;
    const iv = setInterval(() => { i = (i + 1) % LOADERS.length; setLoadMsg(LOADERS[i]); }, 900);
    try {
      const { data } = await api.post("/roles/intake", { text: payload });
      setResult(data);
    } catch { toast.error("Could not process request"); }
    finally { clearInterval(iv); setLoading(false); }
  };

  const shortlist = async (c) => {
    try { await api.post("/shortlist", { candidate_slug: c.slug, role_id: result?.role_id }); toast.success(`${c.name} shortlisted`); }
    catch { toast.error("Sign in as recruiter/employer"); }
  };
  const message = async (c) => {
    try { await api.post("/messages", { to_candidate_slug: c.slug, body: "Hi — I'd love to connect about a role." }); toast.success(`Message sent to ${c.name}`); }
    catch { toast.error("Could not send message"); }
  };
  const interview = async (c) => {
    try { await api.post("/interviews", { candidate_slug: c.slug, role_title: result?.role?.title }); toast.success(`Interview requested with ${c.name}`); }
    catch { toast.error("Could not request interview"); }
  };

  const filteredDiscover = discover.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.skills.some((s) => s.name.toLowerCase().includes(q));
  });

  return (
    <div className="px-5 md:px-8 py-8 max-w-6xl">
      <p className="label-eyebrow text-terracotta">Find Talent</p>
      <h1 className="font-display text-4xl text-charcoal">Tell us who you need.</h1>

      <div className="flex gap-2 mt-5">
        {MODES.map(([val, label, Icon]) => (
          <button key={val} onClick={() => setMode(val)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full label-eyebrow border transition-colors ${mode === val ? "bg-charcoal text-cream border-charcoal" : "border-bordergray text-charcoal hover:border-charcoal"}`} data-testid={`mode-${val}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {mode === "match" && (
        <div className="mt-5 bg-white border border-bordergray rounded-2xl p-6">
          <p className="label-eyebrow text-bodygray mb-2 flex items-center gap-2"><Search size={14} /> Describe the role in plain English</p>
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="I need a junior Data Analyst in Chicago who knows SQL, Python and Power BI, hybrid, $70–90k, start within 30 days."
            className="w-full bg-cream border border-bordergray rounded-lg p-4 outline-none focus:border-terracotta transition-colors resize-none" data-testid="intake-input" />
          <button onClick={() => runIntake()} disabled={loading} className="btn-primary rounded-lg mt-3 px-6 py-3 label-eyebrow inline-flex items-center gap-2 disabled:opacity-60" data-testid="intake-submit">
            Find Talent <ArrowRight size={16} />
          </button>
        </div>
      )}

      {(mode === "discover" || mode === "search") && (
        <div className="mt-5">
          {mode === "search" && (
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, role or skill..."
              className="w-full bg-white border border-bordergray rounded-lg px-4 py-3 outline-none focus:border-terracotta transition-colors mb-5" data-testid="search-input" />
          )}
          {filteredDiscover.length === 0 ? (
            <EmptyState title="No strong matches yet" hint="Try expanding location or adjusting seniority." />
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDiscover.map((c) => <TalentCard key={c.slug} candidate={c} onShortlist={shortlist} onMessage={message} onInterview={interview} showPools compact />)}
            </div>
          )}
        </div>
      )}

      {loading && <Loading label={loadMsg} />}

      <AnimatePresence>
        {mode === "match" && result && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
            <div className="bg-charcoal text-cream rounded-2xl p-6" data-testid="role-intelligence">
              <p className="label-eyebrow text-terracotta">Role Intelligence</p>
              <h2 className="font-display text-2xl mt-1">{result.role.title} · {result.role.seniority}</h2>
              <div className="flex flex-wrap gap-2 mt-3">
                {result.role.must_have.map((s) => <Pill key={s} tone="terracotta">{s}</Pill>)}
                <Pill>{result.role.location}</Pill><Pill>{result.role.work_model}</Pill>
                {result.role.salary_min && <Pill>${Math.round(result.role.salary_min / 1000)}–{Math.round(result.role.salary_max / 1000)}k</Pill>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {[["potential", "Potential"], ["strong", "Strong"], ["interview_ready", "Interview-Ready"], ["exceptional", "Exceptional"]].map(([k, l]) => (
                  <div key={k} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="font-display text-3xl text-cream">{result.availability[k]}</p>
                    <p className="label-eyebrow text-cream/60">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="font-display text-2xl text-charcoal mt-8 mb-4">Recommended candidates</h3>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {result.top_matches.map((m) => (
                <TalentCard key={m.candidate.slug} candidate={m.candidate} match={m.match} onShortlist={shortlist} onMessage={message} onInterview={interview} showPools roleId={result?.role_id} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
