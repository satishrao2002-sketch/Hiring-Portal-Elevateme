import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Loading, Pill } from "@/components/brand";
import PublicLayout, { Breadcrumbs } from "@/components/public/PublicLayout";
import Seo, { breadcrumbJsonLd, faqJsonLd, SITE } from "@/seo/Seo";
import { AnswerBlock, Section, FaqList, JobCard, RelatedLinks, ProductCta, PageWrap, SkillChips } from "@/components/public/parts";
import NotFound from "@/pages/public/NotFound";

export function LocationCareer() {
  const { slug, location } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { setD(null); setErr(false); api.get(`/seo/careers/${slug}/in/${location}`).then((r) => setD(r.data)).catch(() => setErr(true)); }, [slug, location]);
  if (err) return <NotFound />;
  if (!d) return <PublicLayout><Loading label="Loading local career insights..." /></PublicLayout>;

  const cTitle = d.career.title, city = d.location.name;
  const sal = d.salary_range || d.career.salary_us;
  const salIllustrative = !d.salary_range;
  const salaryTxt = sal ? `$${Math.round(sal.min / 1000)}k–$${Math.round(sal.max / 1000)}k` : null;
  const skillsList = d.career.core_skills.slice(0, 4).join(", ");
  const answer = d.jobs.length > 0
    ? `ElevateMe currently lists ${d.jobs.length} ${cTitle} ${d.jobs.length === 1 ? "role" : "roles"} in ${city}. Core skills employers expect are ${skillsList}.${salaryTxt ? ` ${salIllustrative ? "Illustrative U.S. pay" : "Advertised pay"} for this role runs about ${salaryTxt}.` : ""} Build a verified profile to be matched automatically as new local roles open.`
    : `Thinking about becoming a ${cTitle} in ${city}? This guide covers what the role does, the core skills employers expect (${skillsList}), and how to build verifiable evidence so you get matched the moment a local role opens.${salaryTxt ? ` Illustrative U.S. pay for a ${cTitle} runs about ${salaryTxt}.` : ""}`;
  const crumbs = [{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }, { name: cTitle, path: `/careers/${slug}` }, { name: city, path: `/careers/${slug}/in/${location}` }];
  const faqs = [
    { q: `Are there ${cTitle} jobs in ${city}?`, a: d.jobs.length ? `Yes — ElevateMe currently lists ${d.jobs.length} ${cTitle} role${d.jobs.length === 1 ? "" : "s"} in ${city}: ${d.jobs.map((j) => j.title).join(", ")}. New roles open regularly; build a profile to be matched automatically.` : `There are no ${cTitle} roles open in ${city} on ElevateMe at this exact moment. Build a verified profile to be matched the instant a local role opens, and use this guide to prepare in the meantime.` },
    { q: `What does a ${cTitle} in ${city} earn?`, a: salaryTxt ? `${salIllustrative ? `Illustrative U.S. pay for a ${cTitle} runs roughly ${salaryTxt}` : `Advertised ${cTitle} ranges on ElevateMe fall roughly between ${salaryTxt}`}. Pay in ${city} varies by seniority, industry and employer — see our methodology.` : `Pay varies by seniority, industry and employer. See our methodology for how ElevateMe reports salary context.` },
    { q: `What skills do ${cTitle}s need in ${city}?`, a: `Core skills are ${d.career.core_skills.join(", ")}. Employers increasingly value verified evidence — projects, assessments and portfolios — over self-reported skill lists.` },
    { q: `How do I get hired as a ${cTitle} in ${city}?`, a: `${d.career.education} Build verifiable evidence, then use ElevateMe to see which ${city} roles you match today and exactly what to improve.` },
  ];
  const article = { "@context": "https://schema.org", "@type": "Article", headline: `${cTitle} Jobs in ${city}`, about: `${cTitle} careers in ${city}`, author: { "@type": "Organization", name: "ElevateMe" }, publisher: { "@type": "Organization", name: "ElevateMe" }, mainEntityOfPage: `${SITE}/careers/${slug}/in/${location}` };

  return (
    <PublicLayout>
      <Seo title={`${cTitle} Jobs in ${city} — Salary, Skills & Demand | ElevateMe`}
        description={`${cTitle} careers in ${city}: open roles, in-demand skills, illustrative salary and local hiring demand. See where you match and how to get hired.`}
        path={`/careers/${slug}/in/${location}`} jsonLd={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs), article]} />
      <Breadcrumbs items={crumbs} />
      <PageWrap>
        <p className="label-eyebrow text-terracotta mt-6">Career · {city}</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-5">{cTitle} Jobs in {city}</h1>
        <AnswerBlock question={`Are there ${cTitle} jobs in ${city}?`} answer={answer} />

        <div className="grid sm:grid-cols-3 gap-3 mt-6">
          {d.jobs.length > 0 ? (
            <>
              <div className="bg-white border border-bordergray rounded-xl p-5"><p className="font-display text-3xl text-charcoal">{d.jobs.length}</p><p className="text-sm text-bodygray mt-1">Open {cTitle} roles here</p></div>
              <div className="bg-white border border-bordergray rounded-xl p-5"><p className="font-display text-3xl text-charcoal">{d.location_talent_count}</p><p className="text-sm text-bodygray mt-1">Verified candidates in {city}</p></div>
              <div className="bg-white border border-bordergray rounded-xl p-5"><p className="font-display text-3xl text-charcoal">{salaryTxt || "—"}</p><p className="text-sm text-bodygray mt-1">Illustrative pay range</p></div>
            </>
          ) : (
            <>
              <div className="bg-white border border-bordergray rounded-xl p-5"><p className="font-display text-3xl text-charcoal">{d.career.core_skills.length}</p><p className="text-sm text-bodygray mt-1">Core skills to master</p></div>
              <div className="bg-white border border-bordergray rounded-xl p-5"><p className="font-display text-3xl text-charcoal">{salaryTxt || "—"}</p><p className="text-sm text-bodygray mt-1">Illustrative pay range</p></div>
              <div className="bg-white border border-bordergray rounded-xl p-5"><p className="font-display text-3xl text-charcoal">{d.career.path.length}</p><p className="text-sm text-bodygray mt-1">Stages in the career path</p></div>
            </>
          )}
        </div>

        <Section title={`Core skills for a ${cTitle}`}>
          <SkillChips skills={d.career.core_skills_linked || d.career.core_skills} />
        </Section>

        {d.jobs.length > 0 ? (
          <Section title={`Open ${cTitle} roles in ${city}`}><div className="grid md:grid-cols-2 gap-4">{d.jobs.map((j) => <JobCard key={j.id} job={j} />)}</div></Section>
        ) : (
          <Section title={`${cTitle} roles in ${city}`}><p className="text-bodygray">No {cTitle} roles are open in {city} at this exact moment. <Link to={`/careers/${slug}`} className="text-terracotta font-bold">See the {cTitle} guide</Link> or <Link to="/jobs" className="text-terracotta font-bold">browse all jobs</Link> — or build a profile to be matched the moment one opens.</p></Section>
        )}

        {salaryTxt && (
          <Section title={`${cTitle} salary in ${city}`}>
            <div className="bg-white border border-bordergray rounded-xl p-6">
              <p className="font-display text-3xl text-charcoal">{salaryTxt}</p>
              <p className="text-sm text-bodygray mt-1">{salIllustrative ? `Illustrative U.S. range for a ${cTitle}, shown as general context.` : `Illustrative range based on ${cTitle} roles currently on ElevateMe.`} Pay in {city} varies by seniority and industry — see our <Link to="/methodology" className="text-terracotta font-bold">methodology</Link>.</p>
            </div>
          </Section>
        )}

        <Section title="Frequently asked questions"><FaqList faqs={faqs} /></Section>

        <RelatedLinks title={`${cTitle} in other cities`} links={d.other_locations.map((l) => ({ to: `/careers/${slug}/in/${l.slug}`, label: `${cTitle} in ${l.name.split(",")[0]}` }))} />
        <RelatedLinks title={`Related careers in ${city}`} links={d.related_careers.map((r) => ({ to: `/careers/${r.slug}/in/${location}`, label: `${r.title} in ${city.split(",")[0]}` }))} />

        <ProductCta heading={`Get discovered as a ${cTitle} in ${city}`} sub="Build a verified profile and let local employers find you through role-matched search."
          primary="Build Your Profile" primaryTo="/register" secondary={`All ${cTitle} roles`} secondaryTo={`/careers/${slug}`} />
      </PageWrap>
    </PublicLayout>
  );
}

export function LocationDetail() {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  const [careers, setCareers] = useState([]);
  const [err, setErr] = useState(false);
  useEffect(() => {
    setD(null);
    api.get(`/seo/locations/${slug}`).then((r) => setD(r.data)).catch(() => setErr(true));
    api.get("/seo/careers").then((r) => setCareers(r.data)).catch(() => setCareers([]));
  }, [slug]);
  if (err) return <NotFound />;
  if (!d) return <PublicLayout><Loading label="Loading local hiring insights..." /></PublicLayout>;

  // one representative career per category for a cross-industry spread
  const spread = Object.values(careers.reduce((acc, c) => { if (!acc[c.category]) acc[c.category] = c; return acc; }, {}));
  const city0 = d.name.split(",")[0];
  const hasJobs = d.jobs.length > 0;
  const answer = `${d.name} has active hiring across many industries — from technology, AI and data to business, finance, healthcare and design.${hasJobs ? ` ElevateMe currently lists ${d.jobs.length} open role${d.jobs.length === 1 ? "" : "s"} sourced locally, and` : " Explore"} career guides for ${spread.length || "dozens of"} professions with local salary and skills context.`;
  const crumbs = [{ name: "Home", path: "/" }, { name: "Locations", path: "/jobs" }, { name: d.name, path: `/locations/${slug}` }];
  const faqs = [
    { q: `What jobs are available in ${d.name}?`, a: `${d.name} has demand across technology, AI, data, cybersecurity, business, finance, healthcare, marketing and design. ${hasJobs ? `ElevateMe currently lists roles such as ${d.jobs.map((j) => j.title).join(", ")}, and` : "ElevateMe"} publishes local career guides for many professions — explore them below.` },
    { q: `What skills are in demand in ${d.name}?`, a: `In-demand skills in ${d.name} span every professional field — from Python, SQL and machine learning to financial modeling, digital marketing and clinical assessment. Explore the career guides to see exactly what each role requires.` },
    { q: `How do I find a job in ${d.name}?`, a: `Build a verified profile, explore the ${city0} career guides below to see the skills employers expect, and let ElevateMe match you to local roles as they open.` },
  ];

  return (
    <PublicLayout>
      <Seo title={`Jobs & Careers in ${d.name} — Every Industry | ElevateMe`}
        description={`Explore jobs and career guides in ${d.name} across technology, healthcare, business, finance, trades and more: open roles, in-demand skills, salary context and local hiring insights.`}
        path={`/locations/${slug}`} jsonLd={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} />
      <PageWrap>
        <p className="label-eyebrow text-terracotta mt-6">Location</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-5">Jobs & Careers in {d.name}</h1>
        <AnswerBlock answer={answer} />

        {spread.length > 0 && (
          <Section title={`Explore careers in ${city0}`}>
            <div className="flex flex-wrap gap-2">
              {spread.map((c) => <Link key={c.slug} to={`/careers/${c.slug}/in/${slug}`} className="bg-white border border-bordergray rounded-full px-4 py-2 text-sm font-bold hover:border-terracotta hover:text-terracotta transition-colors" data-testid={`loc-career-${c.slug}`}>{c.title}</Link>)}
            </div>
          </Section>
        )}

        {d.top_skills.length > 0 && (
          <Section title="In-demand skills here">
            <SkillChips skills={d.top_skills} />
          </Section>
        )}

        {d.jobs.length > 0 ? (
          <Section title={`Open roles in ${d.name}`}><div className="grid md:grid-cols-2 gap-4">{d.jobs.map((j) => <JobCard key={j.id} job={j} />)}</div></Section>
        ) : (
          <Section title="Open roles"><p className="text-bodygray">No open roles sourced in {d.name} right now — <Link to="/jobs" className="text-terracotta font-bold">browse all jobs</Link> or build a profile to be matched when new roles open.</p></Section>
        )}

        <Section title="Frequently asked questions"><FaqList faqs={faqs} /></Section>
        <ProductCta heading={`Get discovered by employers in ${d.name}`} sub="Build a verified profile and let local employers find you through role-matched search."
          primary="Build Your Profile" primaryTo="/register" secondary="Browse All Jobs" secondaryTo="/jobs" />
      </PageWrap>
    </PublicLayout>
  );
}

export function CompanyPublic() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { setD(null); api.get(`/seo/companies/${id}`).then((r) => setD(r.data)).catch(() => setErr(true)); }, [id]);
  if (err) return <NotFound />;
  if (!d) return <PublicLayout><Loading label="Loading company profile..." /></PublicLayout>;

  const crumbs = [{ name: "Home", path: "/" }, { name: "Companies", path: "/jobs" }, { name: d.name, path: `/companies/${id}` }];
  const org = { "@context": "https://schema.org", "@type": "Organization", name: d.name, description: d.about, industry: d.industry, url: d.website ? `https://${d.website}` : undefined };

  return (
    <PublicLayout>
      <Seo title={`${d.name} — Careers, Open Roles & Hiring | ElevateMe`}
        description={`${d.about}`.slice(0, 155)} path={`/companies/${id}`}
        jsonLd={[breadcrumbJsonLd(crumbs), org]} />
      <Breadcrumbs items={crumbs} />
      <PageWrap>
        <p className="label-eyebrow text-terracotta mt-6">Employer</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal">{d.name}</h1>
        <p className="text-bodygray mt-1">{d.industry} · {d.size} · {d.locations?.join(", ")}</p>
        <div className="mt-5"><AnswerBlock answer={`${d.name} is a ${d.industry.toLowerCase()} company (${d.size} employees) hiring on ElevateMe${d.jobs?.length ? `, with ${d.jobs.length} open role${d.jobs.length === 1 ? "" : "s"}` : ""}. ${d.about}`} /></div>
        <div className="bg-white border border-bordergray rounded-xl p-6 mt-5"><p className="text-charcoal leading-relaxed">{d.about}</p>
          <div className="flex flex-wrap gap-1.5 mt-4">{(d.tech || []).map((t) => <Pill key={t}>{t}</Pill>)}</div>
        </div>
        {d.jobs?.length > 0 && <Section title={`Open roles at ${d.name}`}><div className="grid md:grid-cols-2 gap-4">{d.jobs.map((j) => <JobCard key={j.id} job={j} />)}</div></Section>}
        <ProductCta heading={`Interested in ${d.name}?`} sub="Build a verified profile to see how you match their open roles."
          primary="Build Your Profile" primaryTo="/register" secondary="Browse Jobs" secondaryTo="/jobs" />
      </PageWrap>
    </PublicLayout>
  );
}
