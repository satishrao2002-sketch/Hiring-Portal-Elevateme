import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Loading } from "@/components/brand";
import PublicLayout, { Breadcrumbs } from "@/components/public/PublicLayout";
import Seo, { breadcrumbJsonLd, faqJsonLd, SITE } from "@/seo/Seo";
import { AnswerBlock, Section, FaqList, JobCard, RelatedLinks, ProductCta, PageWrap, HubWrap, SkillChips } from "@/components/public/parts";
import NotFound from "@/pages/public/NotFound";

export function CareersHub() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get("/seo/careers").then((r) => setItems(r.data)).catch(() => setItems([])); }, []);
  const grouped = items ? items.reduce((acc, c) => { (acc[c.category] = acc[c.category] || []).push(c); return acc; }, {}) : {};
  const categories = Object.keys(grouped);
  return (
    <PublicLayout>
      <Seo title="Career Guides Across Every Industry — Skills, Salary & Paths | ElevateMe"
        description="Explore in-depth U.S. career guides across technology, AI, data, cybersecurity, business, finance, healthcare, marketing and design: what each role does, required skills, salary context and how to get hired."
        path="/careers" jsonLd={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }])]} />
      <HubWrap>
        <p className="label-eyebrow text-terracotta">Career Guides</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal">Find the career that fits you.</h1>
        <p className="text-bodygray mt-3 max-w-2xl mb-6">Honest, structured guides across every professional field — technology, AI & data, cybersecurity, business, finance, healthcare, marketing and design. Whatever your degree, understand what a role does, the skills employers expect, and how to become genuinely hire-ready.</p>
        <AnswerBlock question="What career guides does ElevateMe offer?" answer={`ElevateMe publishes evidence-based guides for ${items ? items.length : "40+"} U.S. careers across ${categories.length || 11} industries — from Data Scientist, AI Engineer and Cybersecurity Analyst to Financial Analyst, Product Manager, Registered Nurse and UX Designer. Each guide covers responsibilities, required skills, salary context, career path and interview topics.`} />
        {!items ? <Loading label="Loading career guides..." /> : (
          <div className="mt-8 space-y-10">
            {categories.map((cat) => (
              <div key={cat} data-testid={`career-category-${cat.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                <h2 className="font-display text-2xl text-charcoal mb-4 flex items-center gap-3"><span className="w-6 h-px bg-terracotta" />{cat}</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped[cat].map((c) => (
                    <Link key={c.slug} to={`/careers/${c.slug}`} className="bg-white border border-bordergray rounded-xl p-5 card-hover" data-testid={`career-${c.slug}`}>
                      <h3 className="font-display text-xl text-charcoal">{c.title}</h3>
                      <p className="text-bodygray text-sm mt-2 line-clamp-2">{c.answer}</p>
                      <p className="text-xs text-bodygray mt-3">Core: {c.core_skills.slice(0, 3).join(" · ")}</p>
                    </Link>
                  ))}
                </div>
              </div>
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
  if (err) return <NotFound />;
  if (!d) return <PublicLayout><Loading label="Loading career guide..." /></PublicLayout>;

  const sal = d.salary_range || d.salary_us;
  const salIllustrative = !d.salary_range && !!d.salary_us;
  const faqs = [
    { q: `What does a ${d.title} do?`, a: d.answer },
    { q: `What skills does a ${d.title} need?`, a: `Core skills include ${d.core_skills.join(", ")}. Employers increasingly value verified evidence — projects, assessments and portfolios — over self-reported skill lists.` },
    { q: `What is the typical salary for a ${d.title}?`, a: sal ? `${d.salary_range ? `Based on ${d.title} roles currently on ElevateMe, advertised ranges` : `Illustrative U.S. pay for a ${d.title}`} fall roughly between $${Math.round(sal.min / 1000)}k and $${Math.round(sal.max / 1000)}k. Ranges vary by location, seniority and industry (see our methodology).` : `Salary varies by location, seniority and industry.` },
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
          <SkillChips skills={d.core_skills_linked || d.core_skills} />
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

        {sal && (
          <Section title="Salary context">
            <div className="bg-white border border-bordergray rounded-xl p-6">
              <p className="font-display text-3xl text-charcoal">${Math.round(sal.min / 1000)}k – ${Math.round(sal.max / 1000)}k</p>
              <p className="text-sm text-bodygray mt-1">{salIllustrative ? `Illustrative U.S. range for a ${d.title}, shown as general context.` : `Illustrative range based on ${d.title} roles currently on ElevateMe.`} Pay varies by location, seniority and industry — see our <Link to="/methodology" className="text-terracotta font-bold">methodology</Link>.</p>
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
