import { Helmet } from "react-helmet-async";

// Single source of truth for the canonical origin. Env-driven so the same build
// works on the preview host and the production domain (set REACT_APP_SITE_URL).
export const SITE = (
  process.env.REACT_APP_SITE_URL ||
  "https://hire-verified-talent-1.preview.emergentagent.com"
).replace(/\/$/, "");
export const DEFAULT_OG_IMAGE = `${SITE}/og-image.jpg`;
export const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ElevateMe",
  description: "A Talent Intelligence Marketplace connecting U.S. employers with verified, role-matched professionals while helping candidates become genuinely hire-ready.",
  url: SITE,
  logo: `${SITE}/og-image.jpg`,
  image: `${SITE}/og-image.jpg`,
  slogan: "Find the right talent. Get hired faster.",
  areaServed: "US",
  knowsAbout: [
    "Talent Intelligence", "Recruiting", "Verified Skills", "AI Matching",
    "Artificial Intelligence", "Machine Learning", "Data Science",
    "Software Engineering", "Cybersecurity", "Cloud Computing",
  ],
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

export function SiteVerification() {
  const google = process.env.REACT_APP_GOOGLE_SITE_VERIFICATION;
  const bing = process.env.REACT_APP_BING_SITE_VERIFICATION;
  if (!google && !bing) return null;
  return (
    <Helmet>
      {google && <meta name="google-site-verification" content={google} />}
      {bing && <meta name="msvalidate.01" content={bing} />}
    </Helmet>
  );
}

export default function Seo({ title, description, path = "", noindex = false, jsonLd = [], image }) {
  const url = `${SITE}${path}`;
  const ogImage = image || DEFAULT_OG_IMAGE;
  const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large"} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="ElevateMe" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="ElevateMe — Talent Intelligence Marketplace" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {blocks.filter(Boolean).map((b, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(b)}</script>
      ))}
    </Helmet>
  );
}
