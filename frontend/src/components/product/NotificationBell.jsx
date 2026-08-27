import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Sparkles, MessageSquare, Eye, CalendarCheck, TrendingUp, CheckCheck, Users } from "lucide-react";
import api from "@/lib/api";

const ICONS = { match: Sparkles, message: MessageSquare, view: Eye, interview: CalendarCheck, readiness: TrendingUp, shortlist: CheckCheck, feedback: CalendarCheck, pool: Users };

export default function NotificationBell({ variant = "desktop" }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const nav = useNavigate();
  const ref = useRef(null);

  const load = () => api.get("/notifications").then((r) => setData(r.data)).catch(() => {});
  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => { clearInterval(iv); document.removeEventListener("mousedown", close); };
  }, []);

  const markAll = async () => { await api.post("/notifications/read"); load(); };
  const click = async (n) => {
    await api.post(`/notifications/${n.id}/read`).catch(() => {});
    setOpen(false);
    if (n.link) nav(n.link);
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative w-9 h-9 grid place-items-center rounded-lg hover:bg-cream transition-colors" data-testid={`notification-bell-${variant}`}>
        <Bell size={19} className="text-charcoal" />
        {data.unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-terracotta text-white text-[10px] font-bold grid place-items-center" data-testid={`notification-count-${variant}`}>{data.unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
            className="absolute right-0 mt-2 w-80 bg-white border border-bordergray rounded-xl shadow-xl overflow-hidden z-50" data-testid="notification-panel">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bordergray">
              <p className="label-eyebrow text-charcoal">Notifications</p>
              {data.unread > 0 && <button onClick={markAll} className="label-eyebrow text-terracotta" data-testid="mark-all-read">Mark all read</button>}
            </div>
            <div className="max-h-96 overflow-auto">
              {data.items.length === 0 ? (
                <p className="text-sm text-bodygray p-6 text-center">You're all caught up.</p>
              ) : data.items.map((n) => {
                const Icon = ICONS[n.kind] || Bell;
                return (
                  <button key={n.id} onClick={() => click(n)} className={`w-full text-left flex gap-3 px-4 py-3 border-b border-bordergray/40 hover:bg-cream/60 transition-colors ${!n.read ? "bg-terracotta/5" : ""}`} data-testid={`notification-${n.id}`}>
                    <div className="w-8 h-8 rounded-lg bg-cream grid place-items-center shrink-0"><Icon size={15} className="text-terracotta" /></div>
                    <div className="min-w-0"><p className="font-bold text-charcoal text-sm">{n.title}</p><p className="text-xs text-bodygray">{n.body}</p></div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-terracotta shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
