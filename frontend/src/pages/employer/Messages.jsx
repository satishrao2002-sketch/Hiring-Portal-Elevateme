import { useEffect, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { Loading, EmptyState } from "@/components/brand";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Messages() {
  const [threads, setThreads] = useState(null);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [drafting, setDrafting] = useState(false);

  const loadThreads = () => api.get("/messages/threads").then((r) => { setThreads(r.data); if (!active && r.data[0]) openThread(r.data[0]); }).catch(() => setThreads([]));
  useEffect(() => { loadThreads(); }, []); // eslint-disable-line

  const openThread = async (t) => {
    setActive(t);
    const { data } = await api.get(`/messages/${t.id}`);
    setMsgs(data);
  };

  const send = async () => {
    if (!text.trim() || !active) return;
    await api.post("/messages", { to_candidate_slug: active.candidate.slug, body: text });
    setText("");
    openThread(active); loadThreads();
  };

  const draft = async () => {
    if (!active) return;
    setDrafting(true);
    try { const { data } = await api.post("/messages/draft", { candidate_slug: active.candidate.slug }); setText(data.draft); }
    catch { toast.error("Could not draft message"); }
    finally { setDrafting(false); }
  };

  if (!threads) return <Loading label="Loading messages..." />;

  return (
    <div className="px-5 md:px-8 py-8 max-w-6xl">
      <p className="label-eyebrow text-terracotta">Messages</p>
      <h1 className="font-display text-4xl text-charcoal mb-6">Conversations</h1>

      {threads.length === 0 ? (
        <EmptyState title="No conversations yet" hint="Message a candidate from Find Talent to start a thread."
          actions={<Link to="/employer/find-talent" className="btn-primary rounded-full px-6 py-2.5 label-eyebrow inline-block">Find Talent</Link>} />
      ) : (
        <div className="grid md:grid-cols-[300px_1fr] gap-4 border border-bordergray rounded-2xl overflow-hidden bg-white" style={{ height: "60vh" }}>
          <div className="border-r border-bordergray overflow-auto">
            {threads.map((t) => (
              <button key={t.id} onClick={() => openThread(t)} className={`w-full text-left px-4 py-3 border-b border-bordergray/50 flex items-center gap-3 transition-colors ${active?.id === t.id ? "bg-cream" : "hover:bg-cream/60"}`} data-testid={`thread-${t.candidate?.slug}`}>
                <img src={t.candidate?.avatar} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div className="min-w-0"><p className="font-bold text-charcoal truncate">{t.candidate?.name}</p><p className="text-xs text-bodygray truncate">{t.last_message?.body}</p></div>
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            {active ? (
              <>
                <div className="flex-1 overflow-auto p-5 space-y-3">
                  {msgs.map((m) => (
                    <div key={m.id} className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.sender === "recruiter" ? "ml-auto bg-terracotta text-white" : "bg-cream text-charcoal border border-bordergray"}`}>
                      <p className="text-sm">{m.body}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-bordergray p-3">
                  <div className="flex items-center gap-2">
                    <button onClick={draft} disabled={drafting} className="w-9 h-9 grid place-items-center rounded-lg border border-bordergray hover:border-terracotta hover:text-terracotta transition-colors shrink-0" title="AI draft" data-testid="ai-draft-btn"><Sparkles size={16} /></button>
                    <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={drafting ? "Drafting..." : "Type a message..."} className="flex-1 bg-cream border border-bordergray rounded-lg px-4 py-2.5 outline-none focus:border-terracotta transition-colors" data-testid="message-input" />
                    <button onClick={send} className="btn-primary rounded-lg w-10 h-10 grid place-items-center shrink-0" data-testid="send-message"><Send size={16} /></button>
                  </div>
                </div>
              </>
            ) : <div className="grid place-items-center h-full text-bodygray">Select a conversation</div>}
          </div>
        </div>
      )}
    </div>
  );
}
