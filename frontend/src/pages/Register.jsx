import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Building2, GraduationCap, UserSearch } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth, homeForRole } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";

const ROLES = [
  ["talent", "Talent", "Students, grads & professionals", GraduationCap],
  ["employer", "Employer", "Founders & hiring managers", Building2],
  ["recruiter", "Recruiter", "Talent acquisition teams", UserSearch],
];

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [role, setRole] = useState(loc.state?.role || "employer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const u = await register({ name, email, password, role });
      toast.success(`Welcome to ElevateMe, ${u.name.split(" ")[0]}`);
      const dest = homeForRole(u.role);
      nav(dest, { state: loc.state?.intake ? { intake: loc.state.intake } : undefined });
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="grain min-h-screen bg-cream flex flex-col">
      <div className="p-6"><Link to="/" className="inline-flex items-center gap-2 text-bodygray hover:text-charcoal"><ArrowLeft size={16} /> <Logo size="text-xl" /></Link></div>
      <div className="flex-1 grid place-items-center px-5 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-white border border-bordergray rounded-2xl p-8 shadow-sm">
            <p className="label-eyebrow text-terracotta">Get started</p>
            <h1 className="font-display text-3xl text-charcoal mt-1">Create your account</h1>

            <div className="grid grid-cols-3 gap-2 mt-5">
              {ROLES.map(([val, label, , Icon]) => (
                <button key={val} onClick={() => setRole(val)} type="button"
                  className={`rounded-xl border p-3 text-center transition-colors ${role === val ? "border-terracotta bg-terracotta/5" : "border-bordergray hover:border-charcoal"}`}
                  data-testid={`role-${val}`}>
                  <Icon size={18} className={`mx-auto mb-1 ${role === val ? "text-terracotta" : "text-bodygray"}`} />
                  <span className="text-xs font-bold text-charcoal">{label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-cream border border-bordergray rounded-lg px-4 py-3 outline-none focus:border-terracotta transition-colors" data-testid="register-name" />
              <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-cream border border-bordergray rounded-lg px-4 py-3 outline-none focus:border-terracotta transition-colors" data-testid="register-email" />
              <input required type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-cream border border-bordergray rounded-lg px-4 py-3 outline-none focus:border-terracotta transition-colors" data-testid="register-password" />
              {error && <p className="text-salmon text-sm font-bold" data-testid="register-error">{error}</p>}
              <button disabled={loading} className="btn-primary rounded-lg w-full py-3 label-eyebrow inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="register-submit">
                {loading ? "Creating..." : <>Create account <ArrowRight size={16} /></>}
              </button>
            </form>
            <p className="text-sm text-bodygray mt-4">Already have an account? <Link to="/login" className="text-terracotta font-bold">Sign in</Link></p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
