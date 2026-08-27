import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Loading } from "@/components/brand";
import PublicLayout, { Breadcrumbs } from "@/components/public/PublicLayout";
import Seo, { breadcrumbJsonLd, faqJsonLd, SITE } from "@/seo/Seo";
import { AnswerBlock, Section, FaqList, JobCard, RelatedLinks, ProductCta, PageWrap, HubWrap } from "@/components/public/parts";

export function SkillsHub() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get("/seo/skills").then((r) => setItems(r.data)).catch(() => setItems([])); }, []);
  return (
    <PublicLayout>
      <Seo title="In-Demand Tech Skills — Guides, Jobs & Careers | ElevateMe"
        description="Guides to the most in-demand U.S. tech skills — what each skill is, where it's used, which roles require it and how to build verifiable evidence."
        path="/skills" jsonLd={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Skills", path: "/skills" }])]} />
      <HubWrap>
        <p className="label-eyebrow text-terracotta">Skills</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal">Skills that get you hired.</h1>
        <p className="text-bodygray mt-3 max-w-2xl mb-6">Understand the skills employers actually request — and how ElevateMe verifies them through projects, assessments and evidence.</p>
        <AnswerBlock question="Which skills matter most for U.S. tech jobs?" answer="For analytics roles, SQL, Python and a BI tool (Power BI or Tableau) are the most requested; for engineering roles, Python, a web framework and a cloud platform like AWS lead. ElevateMe verifies these through projects, assessments and portfolios rather than self-reported claims." />
        {!items ? <Loading label="Loading skills..." /> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {items.map((s) => (
              <Link key={s.slug} to={`/skills/${s.slug}`} className="bg-white border border-bordergray rounded-xl p-5 card-hover" data-testid={`skill-${s.slug}`}>
                <h2 className="font-display text-xl text-charcoal">{s.name}</h2>
                <p className="text-bodygray text-sm mt-2 line-clamp-3">{s.answer}</p>
              </Link>
            ))}
          </div>
        )}
        <ProductCta heading="Turn your skills into verified evidence" sub="Build a profile where every skill is backed by projects and assessments recruiters trust."
          primary="Build Your Profile" primaryTo="/register" secondary="Explore Careers" secondaryTo="/careers" />
      </HubWrap>
    </PublicLayout>
  );
}

export function SkillDetail() {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { setD(null); api.get(`/seo/skills/${slug}`).then((r) => setD(r.data)).catch(() => setErr(true)); }, [slug]);
  if (err) return <PublicLayout><HubWrap><h1 className="font-display text-3xl">Skill not found</h1><Link to="/skills" className="text-terracotta font-bold">Back to skills</Link></HubWrap></PublicLayout>;
  if (!d) return <PublicLayout><Loading label="Loading skill guide..." /></PublicLayout>;

  const faqs = [
    { q: `What is ${d.name}?`, a: d.answer },
    { q: `Which jobs require ${d.name}?`, a: `${d.name} is commonly required for roles such as ${d.careers.map((c) => c.title).join(", ")}.` },
    { q: `How do I learn ${d.name}?`, a: d.learn.join(" ") },
  ];
  const crumbs = [{ name: "Home", path: "/" }, { name: "Skills", path: "/skills" }, { name: d.name, path: `/skills/${slug}` }];

  return (
    <PublicLayout>
      <Seo title={`${d.name} — Skill Guide, Jobs & Careers | ElevateMe`}
        description={d.answer.slice(0, 155)} path={`/skills/${slug}`}
        jsonLd={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} />
      <PageWrap>
        <p className="label-eyebrow text-terracotta mt-6">Skill Guide</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-5">{d.name}</h1>
        <AnswerBlock question={`What is ${d.name}?`} answer={d.answer} />

        <Section title="Where it's used">
          <div className="flex flex-wrap gap-2">{d.used_for.map((u) => <span key={u} className="bg-white border border-bordergray rounded-full px-4 py-2 text-sm font-bold text-charcoal">{u}</span>)}</div>
        </Section>

        <Section title="How to build it">
          <ul className="space-y-2">{d.learn.map((l, i) => <li key={i} className="bg-white border border-bordergray rounded-lg px-4 py-3 text-charcoal text-sm">{l}</li>)}</ul>
        </Section>

        {d.jobs?.length > 0 && (
          <Section title={`Jobs requiring ${d.name}`}>
            <div className="grid md:grid-cols-2 gap-4">{d.jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
          </Section>
        )}

        <Section title="Frequently asked questions"><FaqList faqs={faqs} /></Section>
        <RelatedLinks title="Related careers" links={d.careers.map((c) => ({ to: `/careers/${c.slug}`, label: c.title }))} />
        <ProductCta heading={`Prove your ${d.name} skills`} sub="ElevateMe turns your projects and assessments into verified evidence recruiters trust."
          primary="Build Your Profile" primaryTo="/register" secondary="Browse Jobs" secondaryTo="/jobs" />
      </PageWrap>
    </PublicLayout>
  );
}
