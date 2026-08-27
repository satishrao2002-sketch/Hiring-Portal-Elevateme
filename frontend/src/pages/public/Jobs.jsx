import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Building2, Briefcase, Clock, DollarSign, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { Loading, Pill } from "@/components/brand";
import PublicLayout, { Breadcrumbs } from "@/components/public/PublicLayout";
import Seo, { breadcrumbJsonLd, faqJsonLd, SITE } from "@/seo/Seo";
import { AnswerBlock, Section, FaqList, JobCard, RelatedLinks, ProductCta, PageWrap, HubWrap } from "@/components/public/parts";
import NotFound from "@/pages/public/NotFound";

export function JobsHub() {
  const [items, setItems] = useState(null);
  const [careers, setCareers] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    api.get("/seo/jobs").then((r) => setItems(r.data)).catch(() => setItems([]));
    api.get("/seo/careers").then((r) => setCareers(r.data)).catch(() => setCareers([]));
  }, []);
  const ql = q.trim().toLowerCase();
  const match = (txt) => txt && txt.toLowerCase().includes(ql);
  const filtered = (items || []).filter((j) => !ql || match(j.title) || (j.must_have || []).some((s) => match(s)) || match(j.location));
  const matchedCareers = ql ? careers.filter((c) => match(c.title) || (c.core_skills || []).some((s) => match(s)) || match(c.answer)).slice(0, 8) : [];
  return (
    <PublicLayout>
      <Seo title="Browse Verified Jobs — Data, AI, Engineering, Business & More | ElevateMe"
        description="Explore verified, role-matched U.S. jobs across data, AI, software, cybersecurity, business, finance, marketing and design. See requirements, salary context and how well you match."
        path="/jobs" jsonLd={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Jobs", path: "/jobs" }])]} />
      <HubWrap>
        <p className="label-eyebrow text-terracotta">Jobs</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal">Roles where you're competitive.</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by role, skill or location — e.g. machine learning, cybersecurity, New York…"
          className="w-full max-w-lg mt-5 bg-white border border-bordergray rounded-lg px-4 py-3 outline-none focus:border-terracotta transition-colors" data-testid="jobs-search" />
        <div className="mt-6"><AnswerBlock question="What kinds of jobs are on ElevateMe?" answer="ElevateMe lists verified, role-matched U.S. jobs across data, AI and machine learning, software engineering, cybersecurity, cloud, product, business, finance, marketing and design. Each job shows requirements, salary context and — once you build a profile — how well you match, with evidence-based reasons." /></div>
        {!items ? <Loading label="Finding verified jobs..." /> : (
          <>
            {filtered.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4 mt-6" data-testid="jobs-results">{filtered.map((j) => <JobCard key={j.id} job={j} />)}</div>
            )}
            {ql && filtered.length === 0 && (
              <div className="mt-6 bg-white border border-bordergray rounded-xl p-6" data-testid="jobs-empty">
                <p className="text-charcoal font-bold">No open roles match "{q}" right now.</p>
                <p className="text-bodygray text-sm mt-1">New roles are posted regularly. {matchedCareers.length > 0 ? "Meanwhile, explore these career guides to prepare and get matched automatically:" : "Build a verified profile to be matched the moment a fitting role opens."}</p>
              </div>
            )}
            {matchedCareers.length > 0 && (
              <div className="mt-4">
                {filtered.length > 0 && <h2 className="font-display text-2xl text-charcoal mb-3">Related career guides</h2>}
                <div className="flex flex-wrap gap-2" data-testid="jobs-career-suggestions">
                  {matchedCareers.map((c) => <Link key={c.slug} to={`/careers/${c.slug}`} className="bg-white border border-bordergray rounded-full px-4 py-2 text-sm font-bold text-charcoal hover:border-terracotta hover:text-terracotta transition-colors" data-testid={`job-career-${c.slug}`}>{c.title}</Link>)}
                </div>
              </div>
            )}
          </>
        )}
        <ProductCta heading="See how well you match" sub="Build a verified profile to unlock your match score and evidence-based reasons on every role."
          primary="Build Your Profile" primaryTo="/register" secondary="Explore Careers" secondaryTo="/careers" />
      </HubWrap>
    </PublicLayout>
  );
}

export function JobDetail() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { setD(null); api.get(`/seo/jobs/${id}`).then((r) => setD(r.data)).catch(() => setErr(true)); }, [id]);
  if (err) return <NotFound />;
  if (!d) return <PublicLayout><Loading label="Loading job..." /></PublicLayout>;

  const crumbs = [{ name: "Home", path: "/" }, { name: "Jobs", path: "/jobs" }, { name: d.title, path: `/jobs/${id}` }];
  const jobPosting = {
    "@context": "https://schema.org", "@type": "JobPosting",
    title: d.title, description: d.description || `${d.title} at ${d.company}`,
    datePosted: d.date_posted, validThrough: d.valid_through, employmentType: d.employment_type,
    hiringOrganization: { "@type": "Organization", name: d.company },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: d.location, addressCountry: "US" } },
    ...(d.work_model === "Remote" ? { jobLocationType: "TELECOMMUTE" } : {}),
    ...(d.salary_min ? { baseSalary: { "@type": "MonetaryAmount", currency: "USD", value: { "@type": "QuantitativeValue", minValue: d.salary_min, maxValue: d.salary_max, unitText: "YEAR" } } } : {}),
  };
  const faqs = [
    { q: `What are the requirements for this ${d.title} role?`, a: `Must-have skills: ${(d.must_have || []).join(", ")}.${d.nice_to_have?.length ? ` Nice-to-have: ${d.nice_to_have.join(", ")}.` : ""}` },
    { q: "Is this role remote?", a: `This role is ${d.work_model}${d.location ? `, based in ${d.location}` : ""}.` },
  ];

  return (
    <PublicLayout>
      <Seo title={`${d.title} at ${d.company}${d.location ? ` — ${d.location}` : ""} | ElevateMe`}
        description={(d.description || `${d.title} at ${d.company} in ${d.location}.`).slice(0, 155)}
        path={`/jobs/${id}`} jsonLd={[breadcrumbJsonLd(crumbs), jobPosting, faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} />
      <PageWrap>
        <div className="bg-charcoal text-cream rounded-2xl p-7 mt-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Pill tone="green">{d.seniority}</Pill><Pill tone="terracotta">{d.work_model}</Pill>
          </div>
          <h1 className="font-display text-4xl">{d.title}</h1>
          <p className="text-cream/70 mt-1 inline-flex items-center gap-2"><Building2 size={15} /> <Link to={`/companies/${d.company_id}`} className="hover:text-terracotta underline-offset-2 hover:underline">{d.company}</Link></p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-cream/80">
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {d.location}</span>
            {d.salary_min && <span className="inline-flex items-center gap-1.5"><DollarSign size={14} /> ${Math.round(d.salary_min / 1000)}k–${Math.round(d.salary_max / 1000)}k</span>}
            <span className="inline-flex items-center gap-1.5"><Briefcase size={14} /> {d.experience_min}+ yrs</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={14} /> Posted {d.date_posted}</span>
          </div>
        </div>

        <div className="mt-6"><AnswerBlock answer={`${d.title} is a ${d.seniority} role at ${d.company}${d.location ? ` in ${d.location}` : ""} (${d.work_model}). Key skills: ${(d.must_have || []).join(", ")}.${d.salary_min ? ` Advertised range: $${Math.round(d.salary_min / 1000)}k–$${Math.round(d.salary_max / 1000)}k.` : ""}`} /></div>
        <Section title="About the role"><p className="text-bodygray leading-relaxed">{d.description}</p>{d.company_about && <p className="text-bodygray leading-relaxed mt-3">{d.company_about}</p>}</Section>
        <Section title="Requirements">
          <div className="grid sm:grid-cols-2 gap-6">
            <div><p className="label-eyebrow text-charcoal mb-2">Must-have</p><ul className="space-y-1.5">{(d.must_have || []).map((s) => <li key={s} className="flex items-center gap-2 text-charcoal"><CheckCircle2 size={15} className="text-brandgreen" /> {s}</li>)}</ul></div>
            {d.nice_to_have?.length > 0 && <div><p className="label-eyebrow text-charcoal mb-2">Nice-to-have</p><ul className="space-y-1.5">{d.nice_to_have.map((s) => <li key={s} className="flex items-center gap-2 text-bodygray"><CheckCircle2 size={15} className="text-bordergray" /> {s}</li>)}</ul></div>}
          </div>
        </Section>

        <Section title="Frequently asked questions"><FaqList faqs={faqs} /></Section>
        <RelatedLinks title="Explore more" links={[
          ...(d.career_slug ? [{ to: `/careers/${d.career_slug}`, label: `${d.title} Career Guide` }] : []),
          { to: `/companies/${d.company_id}`, label: `${d.company} profile` },
          { to: "/jobs", label: "All jobs" },
        ]} />
        <ProductCta heading="See how well you match this role" sub="Build a verified profile to get your match score, evidence-based reasons and what to improve."
          primary="Build Your Profile & Apply" primaryTo="/register" secondary="How It Works" secondaryTo="/how-it-works" />
      </PageWrap>
    </PublicLayout>
  );
}
