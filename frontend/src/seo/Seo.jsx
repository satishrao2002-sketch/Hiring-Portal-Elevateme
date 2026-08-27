import { Helmet } from "react-helmet-async";

export const SITE = "https://hire-verified-talent-1.preview.emergentagent.com";
export const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ElevateMe",
  description: "A Talent Intelligence Marketplace connecting U.S. employers with verified, role-matched professionals while helping candidates become genuinely hire-ready.",
  url: SITE,
  slogan: "Find the right talent. Get hired faster.",
};
export const WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ElevateMe",
  url: SITE,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE}/jobs?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem", position: i + 1, name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

export function faqJsonLd(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question", name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export default function Seo({ title, description, path = "", noindex = false, jsonLd = [], image }) {
  const url = `${SITE}${path}`;
  const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large"} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {blocks.filter(Boolean).map((b, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(b)}</script>
      ))}
    </Helmet>
  );
}
