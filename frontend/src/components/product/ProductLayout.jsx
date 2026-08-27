import { NavLink, useNavigate, Navigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Search, Users, Bookmark, MessagesSquare, CalendarCheck,
  Bell, LogOut, Gauge, Target, Compass, BarChart3, Building2, User,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { Loading } from "@/components/brand";
import NotificationBell from "@/components/product/NotificationBell";

const SHORT_LABELS = {
  "Career Match": "Career", "Career Readiness": "Ready", "Find Talent": "Find",
  "Command Center": "Center", "Opportunities": "Jobs", "Talent Pools": "Pools",
};

const NAVS = {
  employer: [
    ["/employer", "Dashboard", LayoutDashboard],
    ["/employer/find-talent", "Find Talent", Search],
    ["/employer/shortlist", "Shortlist", Bookmark],
    ["/employer/pools", "Talent Pools", Users],
    ["/employer/messages", "Messages", MessagesSquare],
    ["/employer/interviews", "Interviews", CalendarCheck],
  ],
  recruiter: [
    ["/employer", "Dashboard", LayoutDashboard],
    ["/employer/find-talent", "Find Talent", Search],
    ["/employer/shortlist", "Shortlist", Bookmark],
    ["/employer/pools", "Talent Pools", Users],
    ["/employer/messages", "Messages", MessagesSquare],
    ["/employer/interviews", "Interviews", CalendarCheck],
  ],
  talent: [
    ["/talent", "Home", LayoutDashboard],
    ["/talent/career", "Career Match", Compass],
    ["/talent/opportunities", "Opportunities", Target],
    ["/talent/readiness", "Career Readiness", Gauge],
    ["/talent/onboarding", "Profile", User],
  ],
  admin: [
    ["/admin", "Command Center", LayoutDashboard],
    ["/admin/candidates", "Candidates", Users],
    ["/admin/employers", "Employers", Building2],
    ["/admin/analytics", "Analytics", BarChart3],
  ],
};

export default function ProductLayout({ children, roles }) {
  const { user, ready, logout } = useAuth();
  const nav = useNavigate();
  const [acct, setAcct] = useState(false);

  if (!ready) return <div className="min-h-screen bg-white"><Loading label="Loading your workspace..." /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  const items = NAVS[user.role] || NAVS.employer;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-[220px] shrink-0 border-r border-bordergray flex-col fixed inset-y-0 bg-cream/40">
        <div className="px-5 py-5"><Logo size="text-xl" /></div>
        <nav className="flex-1 px-3 space-y-1">
          {items.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${isActive ? "bg-terracotta text-white" : "text-charcoal/80 hover:bg-cream"}`}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-bordergray/60">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brandgreen text-white grid place-items-center font-bold text-sm">{user.name?.[0]}</div>
            <div className="min-w-0"><p className="text-sm font-bold text-charcoal truncate">{user.name}</p><p className="text-xs text-bodygray capitalize">{user.role}</p></div>
          </div>
          <button onClick={() => { logout(); nav("/"); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-bold text-bodygray hover:text-terracotta hover:bg-cream transition-colors" data-testid="logout-btn">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-bordergray flex justify-around py-2">
        {items.slice(0, 5).map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 ${isActive ? "text-terracotta" : "text-bodygray"}`}
            data-testid={`mobile-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <Icon size={20} /><span className="text-[10px] font-bold">{SHORT_LABELS[label] || label.split(" ")[0]}</span>
          </NavLink>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 md:ml-[220px] min-w-0 pb-20 md:pb-0">
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-bordergray px-5 md:px-8 py-3 flex items-center justify-between md:hidden">
          <Logo size="text-lg" />
          <div className="flex items-center gap-1">
            <NotificationBell variant="mobile" />
            <div className="relative">
              <button onClick={() => setAcct(!acct)} className="w-8 h-8 rounded-full bg-brandgreen text-white grid place-items-center font-bold text-sm" data-testid="mobile-account-btn">{user.name?.[0]}</button>
              {acct && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAcct(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-bordergray rounded-xl shadow-xl p-2 z-50">
                    <div className="px-2 py-2 border-b border-bordergray/50 mb-1">
                      <p className="text-sm font-bold text-charcoal truncate">{user.name}</p>
                      <p className="text-xs text-bodygray capitalize">{user.role}</p>
                    </div>
                    <button onClick={() => { logout(); nav("/"); }} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm font-bold text-bodygray hover:text-terracotta hover:bg-cream transition-colors" data-testid="mobile-logout-btn">
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="hidden md:flex sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-bordergray px-8 py-2.5 items-center justify-end">
          <NotificationBell variant="desktop" />
        </div>
        {children}
      </main>
    </div>
  );
}
