import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin, Building2, Briefcase } from "lucide-react";
import { Pill } from "@/components/brand";
import api from "@/lib/api";

const chipClass = "bg-white border border-bordergray rounded-full px-4 py-2 text-sm font-bold text-charcoal";
const chipLinkClass = chipClass + " hover:border-terracotta hover:text-terracotta transition-colors";
const skillSlug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// module-level cache of valid skill slugs (populated once)
let _skillSlugSet = null;

// Renders skill chips, linking ONLY to skill pages that actually exist (no soft-404s).
// Accepts either strings (["SQL", ...]) or objects ([{name, slug, has_guide}]).
export function SkillChips({ skills }) {
  const hasObjects = skills.length > 0 && typeof skills[0] === "object";
  const [validSet, setValidSet] = useState(_skillSlugSet);
  useEffect(() => {
    if (hasObjects || _skillSlugSet) { setValidSet(_skillSlugSet); return; }
    api.get("/seo/skills").then((r) => { _skillSlugSet = new Set(r.data.map((s) => s.slug)); setValidSet(_skillSlugSet); })
      .catch(() => { _skillSlugSet = new Set(); setValidSet(_skillSlugSet); });
  }, [hasObjects]);
  const items = hasObjects
    ? skills
    : skills.map((s) => ({ name: s, slug: skillSlug(s), has_guide: validSet ? validSet.has(skillSlug(s)) : false }));
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => it.has_guide
        ? <Link key={it.name} to={`/skills/${it.slug}`} className={chipLinkClass} data-testid={`skill-chip-${it.slug}`}>{it.name}</Link>
        : <span key={it.name} className={chipClass} data-testid={`skill-chip-plain-${it.slug}`}>{it.name}</span>)}
    </div>
  );
}

export function AnswerBlock({ question, answer }) {
  return (
    <div className="bg-white border-l-4 border-terracotta rounded-r-xl p-6 shadow-sm" data-testid="answer-block">
      {question && <p className="label-eyebrow text-terracotta mb-2">{question}</p>}
      <p className="text-lg text-charcoal leading-relaxed">{answer}</p>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section className="mt-10">
      {title && <h2 className="font-display text-2xl text-charcoal mb-4">{title}</h2>}
      {children}
    </section>
  );
}

export function FaqList({ faqs }) {
  return (
    <div className="space-y-3">
      {faqs.map((f, i) => (
        <details key={i} className="bg-white border border-bordergray rounded-xl p-5 group" data-testid={`faq-${i}`}>
          <summary className="font-bold text-charcoal cursor-pointer list-none flex justify-between items-center">
            {f.q}<span className="text-terracotta group-open:rotate-45 transition-transform text-xl leading-none">+</span>
          </summary>
          <p className="text-bodygray mt-3 leading-relaxed">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job.id}`} className="bg-white border border-bordergray rounded-xl p-5 card-hover block" data-testid={`job-card-${job.id}`}>
      <div className="flex items-center justify-between">
        <Pill tone="green">{job.seniority}</Pill>
        {job.salary_min && <span className="text-sm font-bold text-charcoal">${Math.round(job.salary_min / 1000)}–{Math.round(job.salary_max / 1000)}k</span>}
      </div>
      <h3 className="font-display text-xl text-charcoal mt-3">{job.title}</h3>
      <p className="text-sm text-bodygray inline-flex items-center gap-1.5 mt-1"><Building2 size={13} /> {job.company}</p>
      <p className="text-sm text-bodygray inline-flex items-center gap-1.5"><MapPin size={13} /> {job.location} · {job.work_model}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">{(job.must_have || []).slice(0, 4).map((s) => <Pill key={s}>{s}</Pill>)}</div>
    </Link>
  );
}

export function RelatedLinks({ title, links }) {
  if (!links?.length) return null;
  return (
    <Section title={title}>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="inline-flex items-center gap-1.5 bg-white border border-bordergray rounded-full px-4 py-2 text-sm font-bold text-charcoal hover:border-terracotta hover:text-terracotta transition-colors" data-testid={`related-${l.to}`}>
            {l.label} <ArrowRight size={13} />
          </Link>
        ))}
      </div>
    </Section>
  );
}

export function ProductCta({ heading, sub, primary, primaryTo, secondary, secondaryTo }) {
  return (
    <section className="mt-12 bg-charcoal text-cream rounded-2xl p-8 md:p-10" data-testid="product-cta">
      <h2 className="font-display text-2xl md:text-3xl">{heading}</h2>
      {sub && <p className="text-cream/70 mt-2 max-w-xl">{sub}</p>}
      <div className="flex flex-wrap gap-3 mt-6">
        <Link to={primaryTo} className="btn-primary rounded-full px-6 py-3 label-eyebrow inline-flex items-center gap-2">{primary} <ArrowRight size={15} /></Link>
        {secondary && <Link to={secondaryTo} className="bg-white text-charcoal rounded-full px-6 py-3 label-eyebrow inline-flex items-center gap-2 hover:bg-cream transition-colors">{secondary}</Link>}
      </div>
    </section>
  );
}

export function PageWrap({ children }) {
  return <div className="max-w-5xl mx-auto px-5 md:px-8 pb-8">{children}</div>;
}

export function HubWrap({ children }) {
  return <div className="max-w-5xl mx-auto px-5 md:px-8 pt-24 md:pt-28 pb-8">{children}</div>;
}
