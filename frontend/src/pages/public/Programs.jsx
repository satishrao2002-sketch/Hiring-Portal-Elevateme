import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Loading } from "@/components/brand";
import PublicLayout, { Breadcrumbs } from "@/components/public/PublicLayout";
import Seo, { breadcrumbJsonLd, faqJsonLd, SITE } from "@/seo/Seo";
import { AnswerBlock, Section, FaqList, JobCard, RelatedLinks, ProductCta, PageWrap, HubWrap, SkillChips } from "@/components/public/parts";
import NotFound from "@/pages/public/NotFound";

export function ProgramsHub() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get("/seo/programs").then((r) => setItems(r.data)).catch(() => setItems([])); }, []);
  return (
    <PublicLayout>
      <Seo title="Careers by Degree — Program & University Guides | ElevateMe"
        description="What can you do with your degree? Explore where Computer Science, Data Science, Business, Finance, Marketing, Cybersecurity and Design programs lead — the careers, skills, salary and live jobs for graduates and post-graduates."
        path="/programs" jsonLd={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Programs", path: "/programs" }])]} />
      <HubWrap>
        <p className="label-eyebrow text-terracotta">Program Guides</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal">Where your degree can take you.</h1>
        <p className="text-bodygray mt-3 max-w-2xl mb-6">For graduate and post-graduate students: see the careers each degree leads to, the skills employers expect, salary context and the roles open right now.</p>
        <AnswerBlock question="What careers can I pursue with my degree?" answer="It depends on your field: Computer Science and Data Science lead to software, AI, machine learning, cloud and cybersecurity roles; Business and Finance lead to product, consulting, analysis and management; Marketing and Design lead to growth and product-design careers. Each ElevateMe program guide maps your degree to specific careers, the skills to build, and live jobs." />
        {!items ? <Loading label="Loading program guides..." /> : (
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            {items.map((p) => (
              <Link key={p.slug} to={`/programs/${p.slug}`} className="bg-white border border-bordergray rounded-xl p-6 card-hover" data-testid={`program-${p.slug}`}>
                <p className="label-eyebrow text-bodygray">{p.degree_level}</p>
                <h2 className="font-display text-2xl text-charcoal mt-1">{p.name}</h2>
                <p className="text-bodygray text-sm mt-2 line-clamp-3">{p.answer}</p>
                <p className="text-sm text-terracotta font-bold mt-3">{p.career_count} career paths →</p>
              </Link>
            ))}
          </div>
        )}
        <ProductCta heading="Turn your degree into offers" sub="Build a verified profile and get matched to graduate roles that fit your field and skills."
          primary="Build Your Profile" primaryTo="/register" secondary="Browse Careers" secondaryTo="/careers" />
      </HubWrap>
    </PublicLayout>
  );
}

export function ProgramDetail() {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { setD(null); setErr(false); api.get(`/seo/programs/${slug}`).then((r) => setD(r.data)).catch(() => setErr(true)); }, [slug]);
  if (err) return <NotFound />;
  if (!d) return <PublicLayout><Loading label="Loading program guide..." /></PublicLayout>;

  const salaryTxt = d.salary_range ? `$${Math.round(d.salary_range.min / 1000)}k–$${Math.round(d.salary_range.max / 1000)}k` : null;
  const crumbs = [{ name: "Home", path: "/" }, { name: "Programs", path: "/programs" }, { name: d.name, path: `/programs/${slug}` }];
  const faqs = [
    { q: `What careers can a ${d.name} graduate pursue?`, a: `${d.name} graduates commonly move into roles such as ${d.careers.slice(0, 6).map((c) => c.title).join(", ")}. ElevateMe publishes a full guide for each, covering skills, salary and how to get hired.` },
    { q: `What skills should ${d.name} students build?`, a: `The most valuable skills include ${d.skills.map((s) => s.name).join(", ")}. Employers increasingly value verified evidence — projects, assessments and portfolios — over self-reported skills.` },
    { q: `Are there jobs for ${d.name} graduates on ElevateMe?`, a: d.jobs.length ? `Yes — ElevateMe currently lists ${d.jobs.length} role${d.jobs.length === 1 ? "" : "s"} relevant to ${d.name} graduates${salaryTxt ? `, with advertised pay roughly ${salaryTxt}` : ""}. Build a profile to be matched automatically.` : `New graduate roles are posted regularly. Build a verified profile to be matched the moment a fitting role opens.` },
  ];
  const itemList = { "@context": "https://schema.org", "@type": "ItemList", name: `Careers for ${d.name} graduates`, itemListElement: d.careers.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.title, url: `${SITE}/careers/${c.slug}` })) };
  const article = { "@context": "https://schema.org", "@type": "Article", headline: `Careers for ${d.name} Graduates`, author: { "@type": "Organization", name: "ElevateMe" }, publisher: { "@type": "Organization", name: "ElevateMe" }, mainEntityOfPage: `${SITE}/programs/${slug}` };

  return (
    <PublicLayout>
      <Seo title={`Careers for ${d.name} Graduates — Jobs, Skills & Salary | ElevateMe`}
        description={`What can you do with a ${d.name} degree? Explore ${d.careers.length} career paths, the skills to build, salary context and live jobs for graduates and post-graduates.`}
        path={`/programs/${slug}`} jsonLd={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs), itemList, article]} />
      <Breadcrumbs items={crumbs} />
      <PageWrap>
        <p className="label-eyebrow text-terracotta mt-6">{d.degree_level}</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-5">Careers for {d.name} Graduates</h1>
        <AnswerBlock question={`What can you do with a ${d.name} degree?`} answer={d.answer} />

        <Section title="Career paths">
          <div className="grid md:grid-cols-2 gap-4">
            {d.careers.map((c) => (
              <Link key={c.slug} to={`/careers/${c.slug}`} className="bg-white border border-bordergray rounded-xl p-5 card-hover" data-testid={`program-career-${c.slug}`}>
                <h3 className="font-display text-xl text-charcoal">{c.title}</h3>
                <p className="text-bodygray text-sm mt-2 line-clamp-2">{c.answer}</p>
                {c.salary_us && <p className="text-xs text-bodygray mt-3">Illustrative pay: ${Math.round(c.salary_us.min / 1000)}k–${Math.round(c.salary_us.max / 1000)}k</p>}
              </Link>
            ))}
          </div>
        </Section>

        <Section title={`Skills ${d.name} students should build`}>
          <SkillChips skills={d.skills.map((s) => ({ name: s.name, slug: s.slug, has_guide: true }))} />
        </Section>

        {d.jobs.length > 0 && (
          <Section title={`Open roles for ${d.name} graduates`}>
            <div className="grid md:grid-cols-2 gap-4">{d.jobs.slice(0, 6).map((j) => <JobCard key={j.id} job={j} />)}</div>
            {d.jobs.length > 6 && <Link to="/jobs" className="text-terracotta font-bold text-sm mt-3 inline-block">See all jobs →</Link>}
          </Section>
        )}

        <Section title="Frequently asked questions"><FaqList faqs={faqs} /></Section>
        <RelatedLinks title="Explore other programs" links={[["computer-science", "Computer Science"], ["data-science", "Data Science"], ["cybersecurity", "Cybersecurity"], ["business-administration", "Business / MBA"], ["finance", "Finance & Accounting"], ["design", "Design & HCI"]].filter(([s]) => s !== slug).map(([s, n]) => ({ to: `/programs/${s}`, label: `Careers for ${n} graduates` }))} />
        <ProductCta heading={`Get hired as a ${d.name} graduate`} sub="Build a verified profile and let employers find you through role-matched search."
          primary="Build Your Profile" primaryTo="/register" secondary="All Career Guides" secondaryTo="/careers" />
      </PageWrap>
    </PublicLayout>
  );
}
