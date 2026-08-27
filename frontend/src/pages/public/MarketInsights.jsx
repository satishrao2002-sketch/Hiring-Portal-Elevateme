import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Loading } from "@/components/brand";
import PublicLayout, { Breadcrumbs } from "@/components/public/PublicLayout";
import Seo, { breadcrumbJsonLd, SITE } from "@/seo/Seo";
import { AnswerBlock, Section, ProductCta, PageWrap, HubWrap } from "@/components/public/parts";

export function MarketInsightsHub() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get("/seo/market-insights").then((r) => setItems(r.data)).catch(() => setItems([])); }, []);
  return (
    <PublicLayout>
      <Seo title="U.S. Hiring Market Insights & Reports | ElevateMe"
        description="Original, privacy-safe analysis of U.S. entry-level and early-career tech hiring — the skills employers request, demand trends and candidate readiness."
        path="/market-insights" jsonLd={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Market Insights", path: "/market-insights" }])]} />
      <HubWrap>
        <p className="label-eyebrow text-terracotta">Market Insights</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal">The U.S. talent market, decoded.</h1>
        <p className="text-bodygray mt-3 max-w-2xl mb-6">Original, privacy-safe analysis built from aggregated ElevateMe platform signals. We never expose confidential candidate or employer information.</p>
        <AnswerBlock question="What are ElevateMe market insights?" answer="ElevateMe market insights are original, privacy-safe analyses of U.S. hiring built from aggregated platform signals — covering the skills employers request most, demand trends and candidate readiness. They are illustrative of the platform, not national statistical surveys." />
        {!items ? <Loading label="Loading reports..." /> : (
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            {items.map((m) => (
              <Link key={m.slug} to={`/market-insights/${m.slug}`} className="bg-white border border-bordergray rounded-xl p-6 card-hover" data-testid={`report-${m.slug}`}>
                <h2 className="font-display text-xl text-charcoal">{m.title}</h2>
                <p className="text-bodygray text-sm mt-2">{m.summary}</p>
              </Link>
            ))}
          </div>
        )}
        <ProductCta heading="Put these insights to work" sub="Employers: describe who you need. Candidates: see where you're competitive."
          primary="Get Started" primaryTo="/register" secondary="Explore Careers" secondaryTo="/careers" />
      </HubWrap>
    </PublicLayout>
  );
}

export function MarketReport() {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { setD(null); api.get(`/seo/market-insights/${slug}`).then((r) => setD(r.data)).catch(() => setErr(true)); }, [slug]);
  if (err) return <PublicLayout><PageWrap><h1 className="font-display text-3xl pt-28">Report not found</h1></PageWrap></PublicLayout>;
  if (!d) return <PublicLayout><Loading label="Loading report..." /></PublicLayout>;

  const crumbs = [{ name: "Home", path: "/" }, { name: "Market Insights", path: "/market-insights" }, { name: d.title, path: `/market-insights/${slug}` }];
  const article = { "@context": "https://schema.org", "@type": "Article", headline: d.title, author: { "@type": "Organization", name: "ElevateMe" }, publisher: { "@type": "Organization", name: "ElevateMe" }, mainEntityOfPage: `${SITE}/market-insights/${slug}` };

  return (
    <PublicLayout>
      <Seo title={`${d.title} | ElevateMe`} description={d.summary.slice(0, 155)} path={`/market-insights/${slug}`} jsonLd={[breadcrumbJsonLd(crumbs), article]} />
      <Breadcrumbs items={crumbs} />
      <PageWrap>
        <p className="label-eyebrow text-terracotta mt-6">Market Report{d.live ? " · Live" : ""}</p>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-2">{d.title}</h1>
        {d.generated_on && <p className="text-sm text-bodygray mb-5" data-testid="report-generated">Updated {d.generated_on} · computed live from ElevateMe platform data</p>}
        {!d.generated_on && <div className="mb-5" />}
        <AnswerBlock question="Key takeaway" answer={d.answer} />

        {d.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6" data-testid="report-stats">
            {d.stats.map((s) => (
              <div key={s.label} className="bg-white border border-bordergray rounded-xl p-5">
                <p className="font-display text-3xl text-charcoal">{s.value}</p>
                <p className="text-sm text-bodygray mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {d.skill_demand && (
          <Section title="Most-requested skills right now">
            <div className="bg-white border border-bordergray rounded-xl divide-y divide-bordergray/60" data-testid="report-skill-demand">
              {d.skill_demand.map((s, i) => (
                <div key={s.skill} className="flex items-center gap-4 px-5 py-3">
                  <span className="font-display text-lg text-bodygray w-6">{i + 1}</span>
                  <Link to={`/skills/${s.slug}`} className="font-bold text-charcoal hover:text-terracotta transition-colors flex-1">{s.skill}</Link>
                  <div className="hidden sm:block flex-1 h-2 bg-cream rounded-full overflow-hidden max-w-xs">
                    <div className="h-full bg-terracotta" style={{ width: `${Math.round(100 * s.count / (d.skill_demand[0]?.count || 1))}%` }} />
                  </div>
                  <span className="text-sm font-bold text-charcoal w-16 text-right">{s.count} role{s.count === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {d.top_locations && (
          <Section title="Where employers are hiring">
            <div className="flex flex-wrap gap-2">
              {d.top_locations.map((l) => (
                <span key={l.location} className="bg-white border border-bordergray rounded-full px-4 py-2 text-sm font-bold text-charcoal">{l.location} · {l.count} role{l.count === 1 ? "" : "s"}</span>
              ))}
            </div>
          </Section>
        )}

        <Section title="What we found">
          <ul className="space-y-2">{d.findings.map((f, i) => <li key={i} className="bg-white border border-bordergray rounded-lg px-4 py-3 text-charcoal">{f}</li>)}</ul>
        </Section>
        <Section title="Methodology">
          <p className="text-bodygray leading-relaxed">{d.methodology} Read more about how we measure things on our <Link to="/methodology" className="text-terracotta font-bold">methodology page</Link>.</p>
        </Section>
        <ProductCta heading="Put these insights to work" sub="Employers: describe who you need. Candidates: see where you're competitive."
          primary="Find Talent" primaryTo="/register" secondary="Find Opportunities" secondaryTo="/register" />
      </PageWrap>
    </PublicLayout>
  );
}
