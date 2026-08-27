import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Loading, Pill } from "@/components/brand";
import PublicLayout, { Breadcrumbs } from "@/components/public/PublicLayout";
import Seo, { breadcrumbJsonLd, faqJsonLd } from "@/seo/Seo";
import { AnswerBlock, Section, FaqList, JobCard, RelatedLinks, ProductCta, PageWrap } from "@/components/public/parts";

export function LocationDetail() {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { setD(null); api.get(`/seo/locations/${slug}`).then((r) => setD(r.data)).catch(() => setErr(true)); }, [slug]);
  if (err) return <PublicLayout><PageWrap><h1 className="font-display text-3xl pt-28">Location not found</h1></PageWrap></PublicLayout>;
  if (!d) return <PublicLayout><Loading label="Loading local hiring insights..." /></PublicLayout>;

  const answer = `${d.name} has active demand for verified tech and analytics talent on ElevateMe, with ${d.jobs.length} open role${d.jobs.length === 1 ? "" : "s"} and ${d.talent_count} candidate${d.talent_count === 1 ? "" : "s"} in the area. The most common skills among local talent are ${d.top_skills.slice(0, 4).join(", ")}.`;
  const crumbs = [{ name: "Home", path: "/" }, { name: "Locations", path: "/jobs" }, { name: d.name, path: `/locations/${slug}` }];
  const faqs = [
    { q: `What tech jobs are available in ${d.name}?`, a: `ElevateMe currently lists roles such as ${d.jobs.map((j) => j.title).join(", ") || "a range of tech and analytics roles"} in ${d.name}.` },
    { q: `What skills are in demand in ${d.name}?`, a: `The most common skills among ${d.name} talent on ElevateMe are ${d.top_skills.join(", ")}.` },
  ];

  return (
    <PublicLayout>
      <Seo title={`Tech & Data Jobs in ${d.name} | ElevateMe`}
        description={`Verified tech and analytics jobs in ${d.name}: open roles, in-demand skills and local hiring insights.`}
        path={`/locations/${slug}`} jsonLd={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} />
      <PageWrap>
        <p className="label-eyebrow text-terracotta mt-6">Location</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-5">Tech & Data Jobs in {d.name}</h1>
        <AnswerBlock answer={answer} />

        <Section title="In-demand skills here">
          <div className="flex flex-wrap gap-2">{d.top_skills.map((s) => <Link key={s} to={`/skills/${s.toLowerCase().replace(/\s+/g, "-")}`} className="bg-white border border-bordergray rounded-full px-4 py-2 text-sm font-bold hover:border-terracotta hover:text-terracotta transition-colors">{s}</Link>)}</div>
        </Section>

        {d.jobs.length > 0 ? (
          <Section title={`Open roles in ${d.name}`}><div className="grid md:grid-cols-2 gap-4">{d.jobs.map((j) => <JobCard key={j.id} job={j} />)}</div></Section>
        ) : (
          <Section title="Open roles"><p className="text-bodygray">No open roles in {d.name} right now — <Link to="/jobs" className="text-terracotta font-bold">browse all jobs</Link> or build a profile to be matched when new roles open.</p></Section>
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
  if (err) return <PublicLayout><PageWrap><h1 className="font-display text-3xl pt-28">Company not found</h1></PageWrap></PublicLayout>;
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
