import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Loading } from "@/components/brand";
import PublicLayout, { Breadcrumbs } from "@/components/public/PublicLayout";
import Seo, { breadcrumbJsonLd, faqJsonLd, SITE } from "@/seo/Seo";
import { AnswerBlock, Section, FaqList, JobCard, RelatedLinks, ProductCta, PageWrap, HubWrap } from "@/components/public/parts";

export function CareersHub() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get("/seo/careers").then((r) => setItems(r.data)).catch(() => setItems([])); }, []);
  return (
    <PublicLayout>
      <Seo title="Career Guides — Roles, Skills, Salary & Paths | ElevateMe"
        description="Explore in-depth U.S. career guides for data, analytics and engineering roles: what each role does, required skills, salary context, interview topics and how to get hired."
        path="/careers" jsonLd={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }])]} />
      <HubWrap>
        <p className="label-eyebrow text-terracotta">Career Guides</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal">Find the career that fits you.</h1>
        <p className="text-bodygray mt-3 max-w-2xl mb-6">Honest, structured guides to the roles ElevateMe hires for — what they do, the skills employers expect, typical paths, and how to become genuinely hire-ready.</p>
        <AnswerBlock question="What career guides does ElevateMe offer?" answer="ElevateMe publishes evidence-based guides for in-demand U.S. roles including Data Analyst, Data Scientist, Backend Engineer, Business Analyst and BI Analyst — each covering responsibilities, required skills, salary context, career path and interview topics." />
        {!items ? <Loading label="Loading career guides..." /> : (
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            {items.map((c) => (
              <Link key={c.slug} to={`/careers/${c.slug}`} className="bg-white border border-bordergray rounded-xl p-6 card-hover" data-testid={`career-${c.slug}`}>
                <h2 className="font-display text-2xl text-charcoal">{c.title}</h2>
                <p className="text-bodygray text-sm mt-2 line-clamp-3">{c.answer}</p>
                <p className="text-sm text-bodygray mt-3">Core: {c.core_skills.slice(0, 4).join(" · ")}</p>
              </Link>
            ))}
          </div>
        )}
        <ProductCta heading="Not sure which path fits you?" sub="Build a verified profile and ElevateMe will recommend the roles where you're most competitive."
          primary="Build Your Profile" primaryTo="/register" secondary="Browse Jobs" secondaryTo="/jobs" />
      </HubWrap>
    </PublicLayout>
  );
}

export function CareerDetail() {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { setD(null); api.get(`/seo/careers/${slug}`).then((r) => setD(r.data)).catch(() => setErr(true)); }, [slug]);
  if (err) return <PublicLayout><HubWrap><h1 className="font-display text-3xl">Guide not found</h1><Link to="/careers" className="text-terracotta font-bold">Back to careers</Link></HubWrap></PublicLayout>;
  if (!d) return <PublicLayout><Loading label="Loading career guide..." /></PublicLayout>;

  const faqs = [
    { q: `What does a ${d.title} do?`, a: d.answer },
    { q: `What skills does a ${d.title} need?`, a: `Core skills include ${d.core_skills.join(", ")}. Employers increasingly value verified evidence — projects, assessments and portfolios — over self-reported skill lists.` },
    { q: `What is the typical salary for a ${d.title}?`, a: d.salary_range ? `Based on ${d.title} roles currently on ElevateMe, advertised ranges fall roughly between $${Math.round(d.salary_range.min / 1000)}k and $${Math.round(d.salary_range.max / 1000)}k. Ranges vary by location, seniority and industry (see our methodology).` : `Salary varies by location, seniority and industry.` },
    { q: `How do I become a ${d.title}?`, a: `${d.education} Build verifiable evidence (projects, a portfolio, assessments), then use ElevateMe to see which roles you match and what to improve.` },
  ];
  const crumbs = [{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }, { name: d.title, path: `/careers/${slug}` }];
  const article = { "@context": "https://schema.org", "@type": "Article", headline: `${d.title} Career Guide`, about: d.title, author: { "@type": "Organization", name: "ElevateMe" }, publisher: { "@type": "Organization", name: "ElevateMe" }, mainEntityOfPage: `${SITE}/careers/${slug}` };

  return (
    <PublicLayout>
      <Seo title={`${d.title} Career Guide | Skills, Salary & Career Path | ElevateMe`}
        description={`${d.answer.slice(0, 155)}`}
        path={`/careers/${slug}`}
        jsonLd={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs), article]} />
      <Breadcrumbs items={crumbs} />
      <PageWrap>
        <p className="label-eyebrow text-terracotta mt-6">Career Guide</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-5">{d.title}</h1>
        <AnswerBlock question={`What does a ${d.title} do?`} answer={d.answer} />

        <Section title="Key responsibilities">
          <ul className="grid sm:grid-cols-2 gap-2">
            {d.responsibilities.map((r, i) => <li key={i} className="bg-white border border-bordergray rounded-lg px-4 py-3 text-charcoal text-sm">{r}</li>)}
          </ul>
        </Section>

        <Section title="Core skills">
          <div className="flex flex-wrap gap-2">
            {d.core_skills.map((s) => {
              const skillSlug = s.toLowerCase().replace(/\s+/g, "-");
              return <Link key={s} to={`/skills/${skillSlug}`} className="bg-white border border-bordergray rounded-full px-4 py-2 text-sm font-bold hover:border-terracotta hover:text-terracotta transition-colors">{s}</Link>;
            })}
          </div>
        </Section>

        <Section title="Education & typical path">
          <p className="text-bodygray">{d.education}</p>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {d.path.map((p, i) => (
              <span key={p} className="inline-flex items-center gap-2">
                <span className="bg-white border border-bordergray rounded-lg px-3 py-2 text-sm font-bold text-charcoal">{p}</span>
                {i < d.path.length - 1 && <span className="text-terracotta">→</span>}
              </span>
            ))}
          </div>
        </Section>

        {d.salary_range && (
          <Section title="Salary context">
            <div className="bg-white border border-bordergray rounded-xl p-6">
              <p className="font-display text-3xl text-charcoal">${Math.round(d.salary_range.min / 1000)}k – ${Math.round(d.salary_range.max / 1000)}k</p>
              <p className="text-sm text-bodygray mt-1">Illustrative range based on {d.title} roles currently on ElevateMe. See our <Link to="/methodology" className="text-terracotta font-bold">methodology</Link>.</p>
            </div>
          </Section>
        )}

        <Section title="Common interview topics">
          <ul className="grid sm:grid-cols-2 gap-2">
            {d.interview_topics.map((t, i) => <li key={i} className="bg-white border border-bordergray rounded-lg px-4 py-3 text-charcoal text-sm">{t}</li>)}
          </ul>
        </Section>

        {d.jobs?.length > 0 && (
          <Section title={`Open ${d.title} roles on ElevateMe`}>
            <div className="grid md:grid-cols-2 gap-4">{d.jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
          </Section>
        )}

        <Section title="Frequently asked questions"><FaqList faqs={faqs} /></Section>

        <RelatedLinks title="Related careers" links={(d.related || []).map((r) => ({ to: `/careers/${r.slug}`, label: r.title }))} />

        <ProductCta heading={`Ready to become a ${d.title}?`} sub="Build a verified profile, see the roles you match today, and get a clear plan for what to improve."
          primary="Build Your Profile" primaryTo="/register" secondary="Browse Jobs" secondaryTo="/jobs" />
      </PageWrap>
    </PublicLayout>
  );
}
