import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth, homeForRole } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";

const DEMO = [
  ["Employer", "employer@elevateme.com"],
  ["Recruiter", "recruiter@elevateme.com"],
  ["Talent", "talent@elevateme.com"],
  ["Admin", "admin@elevateme.com"],
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      nav(loc.state?.from || homeForRole(u.role));
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const quick = (em) => { setEmail(em); setPassword(em.startsWith("admin") ? "Admin@123" : "Demo@123"); };

  return (
    <div className="grain min-h-screen bg-cream flex flex-col">
      <div className="p-6"><Link to="/" className="inline-flex items-center gap-2 text-bodygray hover:text-charcoal"><ArrowLeft size={16} /> <Logo size="text-xl" /></Link></div>
      <div className="flex-1 grid place-items-center px-5 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-white border border-bordergray rounded-2xl p-8 shadow-sm">
            <p className="label-eyebrow text-terracotta">Welcome back</p>
            <h1 className="font-display text-3xl text-charcoal mt-1">Sign in</h1>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="label-eyebrow text-bodygray">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 bg-cream border border-bordergray rounded-lg px-4 py-3 outline-none focus:border-terracotta transition-colors" data-testid="login-email" />
              </div>
              <div>
                <label className="label-eyebrow text-bodygray">Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 bg-cream border border-bordergray rounded-lg px-4 py-3 outline-none focus:border-terracotta transition-colors" data-testid="login-password" />
              </div>
              {error && <p className="text-salmon text-sm font-bold" data-testid="login-error">{error}</p>}
              <button disabled={loading} className="btn-primary rounded-lg w-full py-3 label-eyebrow inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="login-submit">
                {loading ? "Signing in..." : <>Sign in <ArrowRight size={16} /></>}
              </button>
            </form>
            <p className="text-sm text-bodygray mt-4">No account? <Link to="/register" className="text-terracotta font-bold">Create one</Link></p>
          </div>
          <div className="mt-4 bg-white/60 border border-bordergray/60 rounded-xl p-4">
            <p className="label-eyebrow text-bodygray mb-2">Quick demo access</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map(([label, em]) => (
                <button key={em} onClick={() => quick(em)} className="text-left text-sm bg-cream border border-bordergray rounded-lg px-3 py-2 hover:border-terracotta transition-colors" data-testid={`demo-${label.toLowerCase()}`}>
                  <span className="font-bold text-charcoal">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
