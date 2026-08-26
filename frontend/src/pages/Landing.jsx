import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Lenis from "lenis";
import {
  ArrowRight, ArrowUpRight, Sparkles, ShieldCheck, Target, Gauge,
  Search, MessagesSquare, CalendarCheck, Trophy, Menu, X,
} from "lucide-react";
import Logo from "@/components/Logo";
import { MatchRing, DimBar, Pill, VerifiedBadge, CheckLine } from "@/components/brand";
import { useAuth, homeForRole } from "@/context/AuthContext";
import api from "@/lib/api";

const REVEAL = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08, ease: [0.2, 0.7, 0.3, 1] } }),
};

function MaskLine({ children, delay = 0 }) {
  return (
    <span className="reveal-mask">
      <motion.span
        className="block"
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Nav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const links = [
    ["Talent", "#talent"], ["Employers", "#employers"],
    ["How It Works", "#how"], ["Match Intelligence", "#match"], ["Outcomes", "#outcomes"],
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-5 md:px-8 mt-4">
        <nav className="flex items-center justify-between bg-cream/85 backdrop-blur-md border border-bordergray/60 rounded-full px-5 py-2.5">
          <Link to="/"><Logo /></Link>
          <div className="hidden lg:flex items-center gap-7">
            {links.map(([l, h]) => (
              <a key={l} href={h} className="text-sm font-bold text-charcoal/80 hover:text-terracotta transition-colors">{l}</a>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <Link to={homeForRole(user.role)} className="btn-primary rounded-full px-5 py-2 label-eyebrow" data-testid="nav-dashboard">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-bold text-charcoal hover:text-terracotta px-3 py-2" data-testid="nav-login">Sign in</Link>
                <Link to="/register" className="btn-primary rounded-full px-5 py-2 label-eyebrow" data-testid="nav-get-started">Get Started</Link>
              </>
            )}
          </div>
          <button className="lg:hidden text-charcoal" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle">{open ? <X /> : <Menu />}</button>
        </nav>
        {open && (
          <div className="lg:hidden mt-2 bg-cream border border-bordergray rounded-2xl p-4 flex flex-col gap-3">
            {links.map(([l, h]) => <a key={l} href={h} onClick={() => setOpen(false)} className="font-bold text-charcoal">{l}</a>)}
            <Link to="/login" className="font-bold text-charcoal">Sign in</Link>
            <Link to="/register" className="btn-primary rounded-full px-5 py-2.5 label-eyebrow text-center">Get Started</Link>
          </div>
        )}
      </div>
    </header>
  );
}

function Section({ id, children, className = "" }) {
  return <section id={id} className={`relative z-10 max-w-7xl mx-auto px-5 md:px-8 ${className}`}>{children}</section>;
}

function Chapter({ n, title }) {
  return (
    <motion.div variants={REVEAL} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
      className="flex items-baseline gap-4 mb-10">
      <span className="font-serif-accent text-terracotta text-2xl italic">{n}</span>
      <span className="label-eyebrow text-bodygray">{title}</span>
      <span className="flex-1 h-px bg-bordergray/70" />
    </motion.div>
  );
}

const SAMPLE_MATCH = {
  overall: 94,
  dimensions: { skills: 96, experience: 87, role: 95, location: 100, availability: 95, readiness: 91 },
};

export default function Landing() {
  const navigate = useNavigate();
  const [intake, setIntake] = useState("");

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    api.get("/stats/public").catch(() => {});
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  const startIntake = () => {
    navigate("/register", { state: { role: "employer", intake } });
  };

  return (
    <div className="grain min-h-screen bg-cream overflow-x-hidden">
      <Nav />

      {/* HERO */}
      <Section className="pt-36 md:pt-44 pb-20">
        <motion.p variants={REVEAL} initial="hidden" animate="show" className="label-eyebrow text-terracotta mb-6 flex items-center gap-2">
          <Sparkles size={14} /> Talent Intelligence Marketplace
        </motion.p>
        <h1 className="font-display text-charcoal leading-[0.92] text-[13vw] sm:text-[10vw] lg:text-[7.5rem]">
          <MaskLine delay={0.05}>FIND THE</MaskLine>
          <MaskLine delay={0.15}><span className="text-terracotta">RIGHT TALENT.</span></MaskLine>
          <MaskLine delay={0.25}>GET HIRED</MaskLine>
          <MaskLine delay={0.35}><span className="text-brandgreen">FASTER.</span></MaskLine>
        </h1>

        <motion.div variants={REVEAL} custom={5} initial="hidden" animate="show" className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-end mt-12">
          <div>
            <p className="text-lg md:text-xl text-bodygray max-w-xl leading-relaxed">
              A talent intelligence platform connecting employers with <span className="text-charcoal font-bold">verified, role-matched</span> professionals — while helping candidates become genuinely hire-ready.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/register" state={{ role: "employer" }} className="btn-primary rounded-full px-7 py-3.5 label-eyebrow inline-flex items-center gap-2" data-testid="hero-find-talent">
                Find Talent <ArrowRight size={16} />
              </Link>
              <Link to="/register" state={{ role: "talent" }} className="btn-secondary rounded-full px-7 py-3.5 label-eyebrow inline-flex items-center gap-2" data-testid="hero-find-opportunities">
                Find Opportunities
              </Link>
              <a href="#how" className="rounded-full px-7 py-3.5 label-eyebrow border border-bordergray text-charcoal hover:border-charcoal transition-colors inline-flex items-center gap-2" data-testid="hero-how-it-works">
                How It Works
              </a>
            </div>
          </div>

          {/* Floating match card (subtle parallax) */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: -1.2 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ rotate: 0, y: -6 }}
            className="bg-white border border-bordergray rounded-2xl p-6 shadow-[0_30px_60px_-30px_rgba(26,26,26,0.35)]"
            data-testid="hero-match-card"
          >
            <div className="flex items-center gap-4">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&q=85&w=200" alt="Priya Shah" className="w-14 h-14 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="font-display text-lg text-charcoal">Priya Shah</p>
                <p className="text-sm text-bodygray">Data Analyst · Chicago</p>
              </div>
              <MatchRing value={94} size={56} stroke={5} />
            </div>
            <div className="flex gap-1.5 mt-4">{["SQL", "Python", "Power BI"].map((s) => <Pill key={s}>{s}</Pill>)}</div>
            <div className="mt-4 space-y-2">
              <DimBar label="Skills" value={96} />
              <DimBar label="Readiness" value={91} />
            </div>
            <div className="flex items-center gap-2 mt-4"><Pill tone="green">Interview Ready</Pill><VerifiedBadge /></div>
          </motion.div>
        </motion.div>
      </Section>

      {/* MARQUEE */}
      <div className="relative z-10 border-y border-bordergray/60 py-4 bg-charcoal my-6 overflow-hidden">
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <span key={k} className="text-cream/90 font-display text-xl md:text-2xl">
              {["Match Intelligence", "Verified Talent", "Evidence Over Claims", "Hiring Speed", "Placement Outcomes", "Career Readiness"].map((w) => (
                <span key={w} className="mx-8 inline-flex items-center gap-3">{w} <ArrowUpRight size={18} className="text-terracotta" /></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* STATS */}
      <Section className="py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[["Verified talent", "1,200+"], ["Avg. time to interview", "6 days"], ["Placement rate", "78%"], ["Match acceptance", "3.2×"]].map(([l, v], i) => (
            <motion.div key={l} variants={REVEAL} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <p className="font-display text-4xl md:text-5xl text-charcoal">{v}</p>
              <p className="label-eyebrow text-bodygray mt-1">{l}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* TELL US WHO YOU NEED — employers */}
      <Section id="employers" className="py-20">
        <Chapter n="01" title="For Employers" />
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div variants={REVEAL} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h2 className="font-display text-4xl md:text-6xl text-charcoal leading-[0.95]">Tell us who you need.<br /><span className="text-terracotta">We'll show you who to meet.</span></h2>
            <p className="text-bodygray text-lg mt-5 max-w-lg">Skip the giant candidate directory. Describe your hiring need in plain English and ElevateMe converts it into structured requirements — then surfaces verified, interview-ready talent.</p>
            <ul className="mt-6 space-y-2">
              <CheckLine>Natural-language role intake, powered by AI</CheckLine>
              <CheckLine>Instant availability: strong, ready & exceptional matches</CheckLine>
              <CheckLine>Every match is explainable with real evidence</CheckLine>
            </ul>
          </motion.div>

          <motion.div variants={REVEAL} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="bg-white border border-bordergray rounded-2xl p-6 shadow-sm" data-testid="landing-intake">
            <p className="label-eyebrow text-terracotta mb-3 flex items-center gap-2"><Search size={14} /> Tell Us Who You Need</p>
            <textarea
              value={intake}
              onChange={(e) => setIntake(e.target.value)}
              rows={4}
              placeholder="I need a junior Data Analyst in Chicago who knows SQL, Python and Power BI, hybrid, $70–90k, start within 30 days."
              className="w-full bg-cream border border-bordergray rounded-lg p-4 text-charcoal outline-none focus:border-terracotta transition-colors resize-none"
              data-testid="landing-intake-input"
            />
            <button onClick={startIntake} className="btn-primary rounded-lg w-full mt-3 py-3 label-eyebrow inline-flex items-center justify-center gap-2" data-testid="landing-intake-submit">
              Find Talent <ArrowRight size={16} />
            </button>
            <div className="grid grid-cols-3 gap-3 mt-5 text-center">
              {[["23", "strong"], ["8", "interview-ready"], ["4", "exceptional"]].map(([n, l]) => (
                <div key={l} className="bg-cream rounded-lg py-3 border border-bordergray/50">
                  <p className="font-display text-2xl text-charcoal">{n}</p>
                  <p className="label-eyebrow text-bodygray">{l}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section id="how" className="py-20">
        <Chapter n="02" title="How ElevateMe Works" />
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            [Target, "Define", "Describe the role"],
            [Search, "Match", "AI finds verified fits"],
            [ShieldCheck, "Prove", "Evidence over claims"],
            [Trophy, "Shortlist", "Compare top talent"],
            [CalendarCheck, "Interview", "Prep & schedule"],
            [Gauge, "Hire", "Track to placement"],
          ].map(([Icon, t, d], i) => (
            <motion.div key={t} variants={REVEAL} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="bg-white border border-bordergray rounded-xl p-5 card-hover">
              <div className="w-10 h-10 rounded-lg bg-cream border border-bordergray grid place-items-center mb-3"><Icon size={18} className="text-terracotta" /></div>
              <p className="label-eyebrow text-bodygray">Step {i + 1}</p>
              <p className="font-display text-lg text-charcoal">{t}</p>
              <p className="text-sm text-bodygray mt-1">{d}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* MATCH INTELLIGENCE */}
      <Section id="match" className="py-20">
        <Chapter n="03" title="Match Intelligence" />
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div variants={REVEAL} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="bg-white border border-bordergray rounded-2xl p-7 shadow-sm order-2 lg:order-1" data-testid="landing-why-match">
            <div className="flex items-center gap-4 mb-5">
              <MatchRing value={94} size={80} stroke={7} />
              <div><p className="label-eyebrow text-terracotta">Why This Match?</p><h3 className="font-display text-2xl">94% Match</h3></div>
            </div>
            <div className="space-y-2.5">
              {Object.entries(SAMPLE_MATCH.dimensions).map(([k, v]) => (
                <DimBar key={k} label={k[0].toUpperCase() + k.slice(1)} value={v} />
              ))}
            </div>
            <ul className="mt-5 space-y-1.5 text-sm">
              <CheckLine>SQL skill verified through assessment</CheckLine>
              <CheckLine>Power BI demonstrated through two projects</CheckLine>
              <CheckLine>Python capability above role benchmark</CheckLine>
            </ul>
            <div className="mt-4 bg-warning/15 border border-warning rounded-md p-3 text-sm text-charcoal">
              <span className="label-eyebrow">Potential concern</span><br />Limited direct healthcare-domain experience.
            </div>
          </motion.div>

          <motion.div variants={REVEAL} initial="hidden" whileInView="show" viewport={{ once: true }} className="order-1 lg:order-2">
            <h2 className="font-display text-4xl md:text-6xl text-charcoal leading-[0.95]">No black-box scores. Just evidence.</h2>
            <p className="text-bodygray text-lg mt-5 max-w-lg">Every role-to-candidate relationship generates an explainable match — skills, experience, role alignment, location, availability and readiness — each decomposed and defensible.</p>
            <div className="flex flex-wrap gap-2 mt-6">
              {["Verified skills", "Project evidence", "Assessment scores", "Honest risk flags"].map((t) => <Pill key={t} tone="terracotta">{t}</Pill>)}
            </div>
          </motion.div>
        </div>
      </Section>

      {/* TALENT SIDE */}
      <Section id="talent" className="py-20">
        <Chapter n="04" title="For Talent" />
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
          <motion.div variants={REVEAL} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h2 className="font-display text-4xl md:text-6xl text-charcoal leading-[0.95]">Don't apply everywhere.<br /><span className="text-brandgreen">Get discovered where you fit.</span></h2>
            <p className="text-bodygray text-lg mt-5 max-w-lg">Your career control center shows exactly what to target, why you're a match, what's holding you back and what to do next.</p>
            <Link to="/register" state={{ role: "talent" }} className="btn-secondary rounded-full px-7 py-3.5 label-eyebrow inline-flex items-center gap-2 mt-7" data-testid="talent-cta">
              Build Your Profile <ArrowRight size={16} />
            </Link>
          </motion.div>

          <motion.div variants={REVEAL} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="bg-white border border-bordergray rounded-2xl p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="label-eyebrow text-brandgreen">Career Readiness</p><p className="font-display text-5xl text-charcoal">87<span className="text-2xl text-bodygray">/100</span></p></div>
              <MatchRing value={87} size={72} stroke={7} />
            </div>
            <div className="mt-5">
              <p className="label-eyebrow text-bodygray mb-2">Strongest paths</p>
              {[["Data Analyst", 94], ["BI Analyst", 89], ["Business Analyst", 84]].map(([r, v]) => (
                <div key={r} className="mb-2"><DimBar label={r} value={v} /></div>
              ))}
            </div>
            <div className="mt-5 bg-cream border border-bordergray rounded-lg p-4">
              <p className="label-eyebrow text-terracotta mb-1">What's holding you back?</p>
              <p className="text-charcoal font-bold">Interview communication</p>
              <p className="text-sm text-bodygray mt-1">Complete 2 mock interviews · <span className="text-brandgreen font-bold">+6 readiness points</span></p>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* OUTCOMES / TRUST */}
      <Section id="outcomes" className="py-20">
        <Chapter n="05" title="Outcomes & Trust" />
        <div className="grid md:grid-cols-3 gap-5">
          {[
            [ShieldCheck, "Verified Talent", "Identity, education, skills, evidence and communication — all reviewed before you meet."],
            [Gauge, "Placement Intelligence", "We track every interview and outcome, so matching gets smarter with the marketplace."],
            [Trophy, "Hiring Speed", "Identify three interview-worthy candidates without browsing hundreds of profiles."],
          ].map(([Icon, t, d], i) => (
            <motion.div key={t} variants={REVEAL} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="bg-charcoal text-cream rounded-2xl p-7 card-hover">
              <Icon size={22} className="text-terracotta mb-4" />
              <h3 className="font-display text-2xl">{t}</h3>
              <p className="text-cream/70 mt-2">{d}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section className="py-24">
        <div className="bg-terracotta rounded-3xl px-8 md:px-16 py-16 text-center relative overflow-hidden">
          <h2 className="font-display text-4xl md:text-6xl text-white leading-[0.95] relative z-10">Build better talent.<br />Match better. Place better.</h2>
          <div className="flex flex-wrap gap-3 justify-center mt-8 relative z-10">
            <Link to="/register" state={{ role: "employer" }} className="bg-white text-terracotta rounded-full px-7 py-3.5 label-eyebrow inline-flex items-center gap-2 hover:bg-cream transition-colors" data-testid="cta-employer">Find Talent <ArrowRight size={16} /></Link>
            <Link to="/register" state={{ role: "talent" }} className="bg-charcoal text-cream rounded-full px-7 py-3.5 label-eyebrow inline-flex items-center gap-2 hover:bg-black transition-colors" data-testid="cta-talent">Find Opportunities</Link>
          </div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-bordergray/60 py-12">
        <Section>
          <div className="flex flex-col md:flex-row justify-between gap-6 items-start">
            <div><Logo size="text-3xl" /><p className="text-bodygray mt-3 max-w-xs">The talent intelligence marketplace. Build better talent, match better, place better.</p></div>
            <div className="flex gap-12">
              <div><p className="label-eyebrow text-charcoal mb-3">Product</p><ul className="space-y-2 text-bodygray text-sm"><li>Match Intelligence</li><li>Verified Talent</li><li>Career Readiness</li></ul></div>
              <div><p className="label-eyebrow text-charcoal mb-3">Access</p><ul className="space-y-2 text-bodygray text-sm"><li><Link to="/login" className="hover:text-terracotta">Sign in</Link></li><li><Link to="/register" className="hover:text-terracotta">Get started</Link></li></ul></div>
            </div>
          </div>
          <p className="text-bodygray text-sm mt-10">© {new Date().getFullYear()} ElevateMe. A talent intelligence marketplace.</p>
        </Section>
      </footer>
    </div>
  );
}
