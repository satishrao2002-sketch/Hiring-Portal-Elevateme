import { Link } from "react-router-dom";
import { ChevronRight, ArrowUpRight } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth, homeForRole } from "@/context/AuthContext";

const NAV = [
  ["Careers", "/careers"], ["Programs", "/programs"], ["Jobs", "/jobs"], ["Skills", "/skills"],
  ["Insights", "/market-insights"], ["How It Works", "/how-it-works"],
];

const FOOTER = {
  "Careers": [["Data Scientist", "/careers/data-scientist"], ["AI Engineer", "/careers/ai-engineer"], ["Cybersecurity Analyst", "/careers/cybersecurity-analyst"], ["Financial Analyst", "/careers/financial-analyst"], ["Product Manager", "/careers/product-manager"]],
  "Skills": [["Python", "/skills/python"], ["Machine Learning", "/skills/machine-learning"], ["SQL", "/skills/sql"], ["Cloud Computing", "/skills/cloud-computing"], ["Communication", "/skills/communication"]],
  "Locations": [["Chicago", "/locations/chicago-il"], ["Austin", "/locations/austin-tx"], ["New York", "/locations/new-york-ny"], ["Boston", "/locations/boston-ma"], ["Remote", "/locations/remote"]],
  "Company": [["About", "/about"], ["How It Works", "/how-it-works"], ["Methodology", "/methodology"], ["Trust & Integrity", "/trust"], ["Our AI Principles", "/ai"]],
  "For You": [["For Students", "/for-students"], ["Program Guides", "/programs"], ["For Employers", "/for-employers"], ["For Recruiters", "/for-recruiters"], ["Browse Jobs", "/jobs"]],
};

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="max-w-5xl mx-auto px-5 md:px-8 pt-24 md:pt-28">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-bodygray">
        {items.map((it, i) => (
          <li key={it.path} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} />}
            {i < items.length - 1 ? <Link to={it.path} className="hover:text-terracotta">{it.name}</Link> : <span className="text-charcoal font-bold">{it.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function PublicLayout({ children }) {
  const { user } = useAuth();
  return (
    <div className="grain min-h-screen bg-cream flex flex-col">
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-6xl px-5 md:px-8 mt-4">
          <nav className="flex items-center justify-between bg-cream/85 backdrop-blur-md border border-bordergray/60 rounded-full px-5 py-2.5">
            <Link to="/" aria-label="ElevateMe home"><Logo /></Link>
            <div className="hidden lg:flex items-center gap-7">
              {NAV.map(([l, h]) => <Link key={l} to={h} className="text-sm font-bold text-charcoal/80 hover:text-terracotta transition-colors">{l}</Link>)}
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <Link to={homeForRole(user.role)} className="btn-primary rounded-full px-5 py-2 label-eyebrow">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="hidden sm:inline text-sm font-bold text-charcoal hover:text-terracotta px-3 py-2">Sign in</Link>
                  <Link to="/register" className="btn-primary rounded-full px-5 py-2 label-eyebrow">Get Started</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1">{children}</main>

      <footer className="relative z-10 border-t border-bordergray/60 bg-white/50 mt-16">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14">
          <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-8">
            <div className="lg:col-span-1">
              <Logo size="text-2xl" />
              <p className="text-sm text-bodygray mt-3">The Talent Intelligence Marketplace for the U.S. job market.</p>
            </div>
            {Object.entries(FOOTER).map(([group, links]) => (
              <div key={group}>
                <p className="label-eyebrow text-charcoal mb-3">{group}</p>
                <ul className="space-y-2">
                  {links.map(([l, h]) => <li key={h}><Link to={h} className="text-sm text-bodygray hover:text-terracotta transition-colors">{l}</Link></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row justify-between gap-3 mt-10 pt-6 border-t border-bordergray/50">
            <p className="text-sm text-bodygray">© {new Date().getFullYear()} ElevateMe — Talent Intelligence Marketplace.</p>
            <Link to="/register" className="label-eyebrow text-terracotta inline-flex items-center gap-1">Build your profile <ArrowUpRight size={13} /></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
