#!/usr/bin/env node
/**
 * ElevateMe browserless static prerender + sitemap/robots/llms generator.
 *
 * CRA does not server-render at runtime, so at build time we write real static
 * HTML per public route: full <head> (title, description, canonical, OG/Twitter,
 * JSON-LD) plus a crawlable <body> content block injected into #root. React still
 * hydrates on top for real users. NO headless browser / Chromium dependency, so it
 * runs deterministically in any deploy build environment.
 *
 * Runs via `postbuild` after `craco build`. Also runnable standalone: `node scripts/prerender.js`.
 * Fail-safe: any error is non-fatal (build still succeeds).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "build");
const PUBLIC_DIR = path.join(ROOT, "public");

function readEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    const line = env.split("\n").find((l) => l.startsWith(key + "="));
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return "";
  }
}

// Canonical public origin. On deploy set REACT_APP_SITE_URL to the real domain.
const SITE = (readEnv("REACT_APP_SITE_URL") || readEnv("REACT_APP_BACKEND_URL") || "").replace(/\/$/, "");
const OG_IMAGE = `${SITE}/og-image.jpg`;

async function j(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}
async function jRetry(base, pathname, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await j(`${base}${pathname}`); }
    catch (e) { last = e; await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
  }
  throw last;
}
async function pickDataBase() {
  const backend = (readEnv("REACT_APP_BACKEND_URL") || "").replace(/\/$/, "");
  const candidates = [backend, "http://localhost:8001", "http://127.0.0.1:8001"].filter(Boolean);
  for (const base of candidates) {
    try { await jRetry(base, "/api/seo/careers", 2); return base; }
    catch {}
  }
  return backend;
}

// ---------- helpers ----------
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; };

const ORG_LD = {
  "@context": "https://schema.org", "@type": "Organization", name: "ElevateMe",
  description: "A Talent Intelligence Marketplace connecting U.S. employers with verified, role-matched professionals while helping candidates become genuinely hire-ready.",
  url: SITE, logo: OG_IMAGE, image: OG_IMAGE, slogan: "Find the right talent. Get hired faster.", areaServed: "US",
};
const WEBSITE_LD = {
  "@context": "https://schema.org", "@type": "WebSite", name: "ElevateMe", url: SITE,
  potentialAction: { "@type": "SearchAction", target: `${SITE}/jobs?q={search_term_string}`, "query-input": "required name=search_term_string" },
};
const breadcrumbLd = (items) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE}${it.path}` })),
});
const faqLd = (faqs) => ({
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: (faqs || []).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

function buildHead({ title, description, routePath, image, jsonLd }) {
  const url = SITE + routePath;
  const img = image || OG_IMAGE;
  const ld = (jsonLd || []).filter(Boolean)
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join("");
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}"/>`,
    `<link rel="canonical" href="${esc(url)}"/>`,
    `<meta name="robots" content="index,follow,max-image-preview:large"/>`,
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:site_name" content="ElevateMe"/>`,
    `<meta property="og:url" content="${esc(url)}"/>`,
    `<meta property="og:title" content="${esc(title)}"/>`,
    `<meta property="og:description" content="${esc(description)}"/>`,
    `<meta property="og:image" content="${esc(img)}"/>`,
    `<meta property="og:image:width" content="1200"/>`,
    `<meta property="og:image:height" content="630"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:title" content="${esc(title)}"/>`,
    `<meta name="twitter:description" content="${esc(description)}"/>`,
    `<meta name="twitter:image" content="${esc(img)}"/>`,
    ld,
  ].join("");
}

const ul = (items) => items.length ? `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>` : "";
const link = (href, label) => `<a href="${esc(SITE + href)}">${esc(label)}</a>`;

// Build a clean base shell from build/index.html: strip the homepage SEO tags so we
// can inject per-route ones. Works whether or not HTML comments survived minification.
function cleanShell(raw) {
  return raw
    .replace(/<!--SEO_HEAD_START-->[\s\S]*?<!--SEO_HEAD_END-->/gi, "")
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, "")
    .replace(/<meta[^>]+name=["']description["'][^>]*>/gi, "")
    .replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, "")
    .replace(/<meta[^>]+property=["']og:[^"']*["'][^>]*>/gi, "")
    .replace(/<meta[^>]+name=["']twitter:[^"']*["'][^>]*>/gi, "")
    .replace(/<script[^>]+type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi, "");
}

function assemble(base, head, bodyInner) {
  let html = base.replace(/<\/head>/i, head + "</head>");
  html = html.replace('<div id="root"></div>', `<div id="root">${bodyInner}</div>`);
  return html;
}

// ---------- static knowledge / legal pages (no backend data needed) ----------
const STATIC_PAGES = {
  "about": ["About ElevateMe — The Talent Intelligence Marketplace", "ElevateMe is a Talent Intelligence Marketplace connecting U.S. employers with verified, role-matched professionals while helping candidates become genuinely hire-ready.", "ElevateMe is a Talent Intelligence Marketplace. It connects U.S. employers with verified, role-matched professionals and helps candidates become genuinely hire-ready through evidence, skills verification and AI matching."],
  "how-it-works": ["How ElevateMe Works — Define, Match, Prove, Interview, Hire", "See how ElevateMe turns a plain-English hiring need into verified, role-matched candidates — and how candidates get discovered where they actually fit.", "Employers describe who they need in plain English; ElevateMe structures the requirement and surfaces verified, interview-ready candidates with explainable matches. Candidates build a verified profile and get matched to roles where they're competitive."],
  "trust": ["Trust & Integrity at ElevateMe — Verified Talent, Real Evidence", "How ElevateMe protects candidates and employers: verification, privacy, human oversight and a strict no-fabrication policy on employment and credentials.", "Trust is the foundation of ElevateMe. We verify identity, education, skills and evidence; we protect private information; and we never fabricate or misrepresent employment, credentials or work authorization."],
  "methodology": ["ElevateMe Methodology — How Matching & Readiness Are Measured", "How ElevateMe calculates match scores, the Talent Score, readiness and market insights — what the numbers mean and what they don't.", "ElevateMe scores are decomposable and evidence-based. A match score combines skills, experience, role alignment, location, availability and readiness. Salary ranges are illustrative and derived from platform roles."],
  "ai": ["ElevateMe AI Principles — Helpful, Explainable, Human-Controlled", "How ElevateMe uses AI responsibly for matching, search, summaries and interview prep — and the things AI is never allowed to do.", "ElevateMe uses AI to assist with matching, search, recommendations, summaries and interview preparation. AI supports human decisions; it never makes final hiring decisions and never fabricates facts about candidates."],
  "for-students": ["ElevateMe for Students & Graduates — Get Hired Where You Fit", "For U.S. students, international students, OPT/STEM OPT candidates and recent graduates: build a verified profile, find roles you match and learn what to improve.", "ElevateMe helps students, international students, OPT and STEM OPT candidates and recent graduates get discovered where they actually fit — with a verified profile, career paths and interview prep."],
  "for-employers": ["ElevateMe for Employers — Tell Us Who You Need, Meet Verified Talent", "Describe your hiring need in plain English and meet verified, role-matched, interview-ready candidates fast.", "ElevateMe lets employers describe a hiring need in plain English and instantly see verified, role-matched candidates — strong, interview-ready and exceptional matches — each with explainable reasons and evidence."],
  "for-recruiters": ["ElevateMe for Recruiters — Match Intelligence & Talent Rooms", "Match intelligence, verified evidence, candidate comparison, shortlists and a Talent Room per role.", "ElevateMe gives recruiters match intelligence and verified evidence in one workspace: search by natural language or role, compare candidates, build shortlists, message, run interviews and manage each role in a dedicated Talent Room."],
  "privacy": ["Privacy Policy — ElevateMe", "How ElevateMe collects, uses, protects and shares personal data for candidates, employers and recruiters, and the rights you have over your information.", "This Privacy Policy explains what personal information ElevateMe collects, how we use and protect it, who we share it with, and the choices and rights you have — including how to access, export or delete your data."],
  "terms": ["Terms of Service — ElevateMe", "The terms governing your use of ElevateMe, including acceptable use, accounts, content, disclaimers and limitations.", "These Terms of Service govern your access to and use of ElevateMe. By creating an account or using the platform, you agree to these terms."],
  "cookies": ["Cookie Policy — ElevateMe", "How ElevateMe uses cookies and similar technologies for essential functionality and analytics, and how you can control your preferences.", "This Cookie Policy explains how ElevateMe uses cookies and similar technologies, the categories we use, and how you can manage your choices at any time."],
  "data-request": ["Data Access & Deletion Requests — ElevateMe", "Request a copy of your ElevateMe data or ask us to delete your account and personal information.", "You control your data. You can request a copy of your personal information (data export) or ask us to permanently delete your account and personal data."],
};

// ---------- per-route page builder ----------
async function buildPage(routePath, cache) {
  const get = (p) => jRetry(cache.DATA, p);
  const home = { name: "Home", path: "/" };

  // Home
  if (routePath === "/") {
    const body = `<main><h1>ElevateMe — Talent Intelligence Marketplace</h1>`
      + `<p>ElevateMe connects U.S. employers and recruiters with verified, role-matched graduate, post-graduate and professional talent. Matching is based on verified skills, real project evidence and readiness scores — not self-reported resumes.</p>`
      + `<nav>${ul([link("/how-it-works", "How It Works"), link("/for-employers", "For Employers"), link("/for-recruiters", "For Recruiters"), link("/for-students", "For Students & Graduates"), link("/careers", "Careers"), link("/programs", "University Programs"), link("/skills", "Skills"), link("/jobs", "Jobs"), link("/market-insights", "Market Insights")])}</nav></main>`;
    return {
      title: "ElevateMe — Talent Intelligence Marketplace",
      description: "ElevateMe is a U.S. Talent Intelligence Marketplace connecting employers with verified, role-matched graduate and professional talent — powered by verified skills, real project evidence and AI matching.",
      jsonLd: [ORG_LD, WEBSITE_LD], body,
    };
  }

  // Static knowledge / legal pages
  const staticKey = routePath.replace(/^\//, "");
  if (STATIC_PAGES[staticKey]) {
    const [title, description, answer] = STATIC_PAGES[staticKey];
    const crumbs = [home, { name: title.split(" — ")[0], path: routePath }];
    const body = `<main><h1>${esc(title.split(" — ")[0])}</h1><p>${esc(answer)}</p></main>`;
    return { title, description, jsonLd: [breadcrumbLd(crumbs)], body };
  }

  const parts = routePath.split("/").filter(Boolean);

  // Hubs
  if (routePath === "/careers") {
    const careers = await get("/api/seo/careers").catch(() => []);
    const body = `<main><h1>Careers — Graduate & Professional Career Guides</h1>`
      + `<p>Explore career guides for graduate and professional roles across AI, ML, data, software, cybersecurity, cloud, product, finance, marketing and design.</p>`
      + ul(careers.map((c) => link(`/careers/${c.slug}`, c.title))) + `</main>`;
    return { title: "Careers — Graduate & Professional Career Guides | ElevateMe", description: "Browse ElevateMe career guides for graduate and professional roles: AI, ML, data science, software engineering, cybersecurity, cloud, product, finance and more.", jsonLd: [breadcrumbLd([home, { name: "Careers", path: "/careers" }])], body };
  }
  if (routePath === "/skills") {
    const skills = await get("/api/seo/skills").catch(() => []);
    const body = `<main><h1>Skills — In-Demand Professional Skills</h1><p>In-demand professional skills for graduate and professional careers.</p>` + ul(skills.map((s) => link(`/skills/${s.slug}`, s.name))) + `</main>`;
    return { title: "Skills — In-Demand Professional Skills | ElevateMe", description: "Explore in-demand professional skills — Python, SQL, Machine Learning, Deep Learning, NLP, Cloud Computing, Cybersecurity and more — with career-focused guides.", jsonLd: [breadcrumbLd([home, { name: "Skills", path: "/skills" }])], body };
  }
  if (routePath === "/programs") {
    const programs = await get("/api/seo/programs").catch(() => []);
    const body = `<main><h1>University Programs — Careers by Degree</h1><p>Degree-focused guides mapping university programs to the careers, skills and jobs they lead to.</p>` + ul(programs.map((p) => link(`/programs/${p.slug}`, `Careers for ${p.name} graduates`))) + `</main>`;
    return { title: "University Programs — Careers by Degree | ElevateMe", description: "Degree-focused career guides: see the careers, skills and live jobs that Computer Science, Data Science, Cybersecurity, Business, Finance and other graduates can pursue.", jsonLd: [breadcrumbLd([home, { name: "Programs", path: "/programs" }])], body };
  }
  if (routePath === "/jobs") {
    const jobs = await get("/api/seo/jobs").catch(() => []);
    const body = `<main><h1>Jobs — Graduate & Professional Roles</h1><p>Live graduate and professional roles from ElevateMe employers.</p>` + ul(jobs.slice(0, 60).map((jb) => link(`/jobs/${jb.id}`, `${jb.title}${jb.company_name ? " · " + jb.company_name : ""}${jb.location ? " · " + jb.location : ""}`))) + `</main>`;
    return { title: "Jobs — Graduate & Professional Roles | ElevateMe", description: "Browse live graduate and professional job openings on ElevateMe across AI, data, software, cybersecurity, cloud, product, finance and more.", jsonLd: [breadcrumbLd([home, { name: "Jobs", path: "/jobs" }])], body };
  }
  if (routePath === "/market-insights") {
    const items = await get("/api/seo/market-insights").catch(() => []);
    const body = `<main><h1>Market Insights — Live Hiring Reports</h1><p>Hiring reports computed from aggregated, privacy-safe ElevateMe platform activity.</p>` + ul(items.map((m) => link(`/market-insights/${m.slug}`, m.title))) + `</main>`;
    return { title: "Market Insights — Live Hiring Reports | ElevateMe", description: "Live hiring and skills-demand reports derived from aggregated ElevateMe platform activity. Illustrative of current demand, not a national statistical survey.", jsonLd: [breadcrumbLd([home, { name: "Market Insights", path: "/market-insights" }])], body };
  }

  // Details
  if (parts[0] === "careers" && parts.length === 2) {
    const c = await get(`/api/seo/careers/${parts[1]}`);
    const crumbs = [home, { name: "Careers", path: "/careers" }, { name: c.title, path: routePath }];
    const faqs = [{ q: `What does a ${c.title} do?`, a: c.answer }];
    const body = `<main><h1>${esc(c.title)}</h1><p>${esc(c.answer)}</p>`
      + (c.core_skills ? `<h2>Core skills</h2>${ul(c.core_skills.map(esc))}` : "")
      + (c.responsibilities ? `<h2>Responsibilities</h2>${ul(c.responsibilities.map(esc))}` : "")
      + `</main>`;
    return { title: `${c.title} — Career Guide | ElevateMe`, description: clip(c.answer, 158), jsonLd: [breadcrumbLd(crumbs), faqLd(faqs)], body };
  }
  if (parts[0] === "skills" && parts.length === 2) {
    const s = await get(`/api/seo/skills/${parts[1]}`);
    const crumbs = [home, { name: "Skills", path: "/skills" }, { name: s.name, path: routePath }];
    const body = `<main><h1>${esc(s.name)}</h1><p>${esc(s.answer)}</p></main>`;
    return { title: `${s.name} — Skill Guide | ElevateMe`, description: clip(s.answer, 158), jsonLd: [breadcrumbLd(crumbs), faqLd([{ q: `What is ${s.name}?`, a: s.answer }])], body };
  }
  if (parts[0] === "programs" && parts.length === 2) {
    const p = await get(`/api/seo/programs/${parts[1]}`);
    const crumbs = [home, { name: "Programs", path: "/programs" }, { name: p.name, path: routePath }];
    const body = `<main><h1>Careers for ${esc(p.name)} Graduates</h1><p>${esc(p.answer)}</p>`
      + (p.careers ? `<h2>Career paths</h2>${ul(p.careers.map((c) => link(`/careers/${c.slug}`, c.title)))}` : "") + `</main>`;
    return { title: `Careers for ${p.name} Graduates | ElevateMe`, description: clip(p.answer, 158), jsonLd: [breadcrumbLd(crumbs), faqLd([{ q: `What careers can ${p.name} graduates pursue?`, a: p.answer }])], body };
  }
  if (parts[0] === "jobs" && parts.length === 2) {
    const jb = await get(`/api/seo/jobs/${parts[1]}`);
    const crumbs = [home, { name: "Jobs", path: "/jobs" }, { name: jb.title, path: routePath }];
    const jobLd = {
      "@context": "https://schema.org", "@type": "JobPosting", title: jb.title,
      description: jb.description || jb.title, datePosted: jb.date_posted || jb.created_at,
      hiringOrganization: { "@type": "Organization", name: jb.company_name || "ElevateMe Employer" },
      jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: jb.location || "United States", addressCountry: "US" } },
      employmentType: jb.employment_type || "FULL_TIME",
    };
    if (jb.salary_min) jobLd.baseSalary = { "@type": "MonetaryAmount", currency: "USD", value: { "@type": "QuantitativeValue", minValue: jb.salary_min, maxValue: jb.salary_max, unitText: "YEAR" } };
    const body = `<main><h1>${esc(jb.title)}</h1><p>${esc(jb.company_name || "")}${jb.location ? " · " + esc(jb.location) : ""}</p><p>${esc(jb.description || "")}</p></main>`;
    return { title: `${jb.title}${jb.company_name ? " at " + jb.company_name : ""} | ElevateMe`, description: clip(jb.description || `${jb.title} role on ElevateMe.`, 158), jsonLd: [breadcrumbLd(crumbs), jobLd], body };
  }
  if (parts[0] === "locations" && parts.length === 2) {
    const loc = await get(`/api/seo/locations/${parts[1]}`);
    const crumbs = [home, { name: loc.name, path: routePath }];
    const body = `<main><h1>Tech & Professional Careers in ${esc(loc.name)}</h1><p>${esc(loc.answer || `Explore verified talent and open roles in ${loc.name}.`)}</p>`
      + (loc.jobs ? ul(loc.jobs.slice(0, 20).map((jb) => link(`/jobs/${jb.id}`, jb.title))) : "") + `</main>`;
    return { title: `Careers & Jobs in ${loc.name} | ElevateMe`, description: clip(loc.answer || `Graduate and professional careers, in-demand skills and open roles in ${loc.name}.`, 158), jsonLd: [breadcrumbLd(crumbs)], body };
  }
  if (parts[0] === "careers" && parts[2] === "in" && parts.length === 4) {
    const lc = await get(`/api/seo/careers/${parts[1]}/in/${parts[3]}`);
    const title = `${lc.career.title} in ${lc.location.name}`;
    const crumbs = [home, { name: "Careers", path: "/careers" }, { name: lc.career.title, path: `/careers/${parts[1]}` }, { name: lc.location.name, path: routePath }];
    const body = `<main><h1>${esc(title)}</h1><p>${esc(lc.career.answer)}</p></main>`;
    return { title: `${title} | ElevateMe`, description: clip(`${lc.career.title} careers and jobs in ${lc.location.name}. ${lc.career.answer}`, 158), jsonLd: [breadcrumbLd(crumbs)], body };
  }
  if (parts[0] === "companies" && parts.length === 2) {
    const co = await get(`/api/seo/companies/${parts[1]}`);
    const crumbs = [home, { name: co.name, path: routePath }];
    const body = `<main><h1>${esc(co.name)}</h1><p>${esc(co.about || `${co.name} hires verified talent on ElevateMe.`)}</p>`
      + (co.jobs ? ul(co.jobs.map((jb) => link(`/jobs/${jb.id}`, jb.title))) : "") + `</main>`;
    return { title: `${co.name} — Open Roles | ElevateMe`, description: clip(co.about || `${co.name} is hiring verified, role-matched talent on ElevateMe.`, 158), jsonLd: [breadcrumbLd(crumbs)], body };
  }
  if (parts[0] === "market-insights" && parts.length === 2) {
    const m = await get(`/api/seo/market-insights/${parts[1]}`);
    const crumbs = [home, { name: "Market Insights", path: "/market-insights" }, { name: m.title, path: routePath }];
    const body = `<main><h1>${esc(m.title)}</h1><p>${esc(m.answer || m.summary || "")}</p>`
      + (m.findings ? ul(m.findings.map(esc)) : "") + `</main>`;
    return { title: `${m.title} | ElevateMe`, description: clip(m.summary || m.answer || m.title, 158), jsonLd: [breadcrumbLd(crumbs)], body };
  }

  return null; // unknown -> leave client-rendered
}

// ---------- route discovery ----------
async function collectRoutes(DATA) {
  const routes = [
    { path: "/", priority: "1.0", render: true },
    ...["about", "how-it-works", "trust", "methodology", "ai", "for-students", "for-employers", "for-recruiters", "privacy", "terms", "cookies", "data-request"].map((s) => ({ path: `/${s}`, priority: "0.7", render: true })),
    { path: "/careers", priority: "0.9", render: true },
    { path: "/programs", priority: "0.9", render: true },
    { path: "/skills", priority: "0.9", render: true },
    { path: "/jobs", priority: "0.9", render: true },
    { path: "/market-insights", priority: "0.8", render: true },
  ];
  const add = (p, priority, render = true) => { if (!routes.some((r) => r.path === p)) routes.push({ path: p, priority, render }); };
  const get = (pathname) => jRetry(DATA, pathname).catch(() => []);
  try {
    const [careers, skills, jobs, companies, locations, locCareers, reports, programs] = await Promise.all([
      get("/api/seo/careers"), get("/api/seo/skills"), get("/api/seo/jobs"),
      get("/api/companies"), get("/api/seo/locations"), get("/api/seo/location-careers"),
      get("/api/seo/market-insights"), get("/api/seo/programs"),
    ]);
    const topLocs = new Set(locations.filter((l) => l.top).map((l) => l.slug));
    careers.forEach((c) => add(`/careers/${c.slug}`, "0.8"));
    programs.forEach((p) => add(`/programs/${p.slug}`, "0.8"));
    skills.forEach((s) => add(`/skills/${s.slug}`, "0.8"));
    jobs.forEach((jb) => add(`/jobs/${jb.id}`, "0.7"));
    companies.forEach((c) => add(`/companies/${c.id}`, "0.6"));
    locations.forEach((l) => add(`/locations/${l.slug}`, "0.7"));
    locCareers.forEach((lc) => add(lc.path, "0.6", topLocs.has(lc.location_slug)));
    reports.forEach((m) => add(`/market-insights/${m.slug}`, "0.7"));
  } catch (e) {
    console.warn("[prerender] route discovery partial:", e.message);
  }
  return routes;
}

// ---------- sitemap ----------
function writeSitemap(routes) {
  const urls = routes.map((r) => `  <url><loc>${SITE}${r.path}</loc><priority>${r.priority}</priority></url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  writeToDirs("sitemap-pages.xml", xml);
  console.log(`[prerender] sitemap-pages.xml written with ${routes.length} URLs`);
}

// ---------- crawler files ----------
const AI_AGENTS = [
  "Googlebot", "Bingbot", "DuckDuckBot", "Applebot",
  "GPTBot", "ChatGPT-User", "OAI-SearchBot",
  "ClaudeBot", "Claude-Web", "anthropic-ai",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended",
  "meta-externalagent", "FacebookBot", "Amazonbot", "cohere-ai", "CCBot", "YouBot", "Diffbot",
];
function writeToDirs(name, content) {
  for (const dir of [PUBLIC_DIR, BUILD_DIR]) {
    try { if (fs.existsSync(dir)) fs.writeFileSync(path.join(dir, name), content); } catch {}
  }
}
function writeRobots() {
  const agents = AI_AGENTS.map((a) => `User-agent: ${a}\nAllow: /`).join("\n");
  const txt = `# ElevateMe — Talent Intelligence Marketplace\n`
    + `# Public discovery layer is open to search engines and AI answer engines.\n`
    + `# Authenticated application routes are excluded from indexing.\n`
    + `# AI guide for language models: /llms.txt\n\n`
    + `User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /register\n`
    + `Disallow: /employer\nDisallow: /talent\nDisallow: /admin\n\n`
    + `${agents}\n\n`
    + `Sitemap: ${SITE}/sitemap.xml\n`;
  writeToDirs("robots.txt", txt);
  console.log("[prerender] robots.txt regenerated with", AI_AGENTS.length, "explicit agents");
}
async function writeLlmsTxt(DATA) {
  const get = (p) => jRetry(DATA, p).catch(() => []);
  const [careers, programs, skills] = await Promise.all([
    get("/api/seo/careers"), get("/api/seo/programs"), get("/api/seo/skills"),
  ]);
  const list = (arr, fn, n = 60) => (Array.isArray(arr) ? arr.slice(0, n).map(fn).join("\n") : "");
  const txt = `# ElevateMe\n\n`
    + `> ElevateMe is a U.S. Talent Intelligence Marketplace that connects employers and recruiters with verified, role-matched graduate, post-graduate and professional talent, while helping candidates become genuinely hire-ready. It is not a traditional job board — matching is based on verified skills, real project evidence and readiness scores rather than self-reported resumes.\n\n`
    + `ElevateMe focuses exclusively on graduate, post-graduate and professional careers across Artificial Intelligence, Machine Learning, Data, Software Engineering, Cybersecurity, Cloud, Product, Design, Finance, Marketing, Business and Healthcare. It does not cover blue-collar or skilled-trade roles.\n\n`
    + `## Core pages\n`
    + `- [Home](${SITE}/): what ElevateMe is and how the marketplace works.\n`
    + `- [How It Works](${SITE}/how-it-works): the matching, verification and hiring workflow.\n`
    + `- [For Employers](${SITE}/for-employers): finding verified talent and building talent pools.\n`
    + `- [For Recruiters](${SITE}/for-recruiters): sourcing and shortlisting verified candidates.\n`
    + `- [For Students & Graduates](${SITE}/for-students): becoming hire-ready and getting matched.\n`
    + `- [About](${SITE}/about) · [Trust & Safety](${SITE}/trust) · [Methodology](${SITE}/methodology) · [AI at ElevateMe](${SITE}/ai)\n\n`
    + `## Career guides\n${list(careers, (c) => `- [${c.title}](${SITE}/careers/${c.slug})${c.answer ? " — " + c.answer : ""}`)}\n\n`
    + `## University program guides\n${list(programs, (p) => `- [Careers for ${p.name} graduates](${SITE}/programs/${p.slug})${p.answer ? " — " + p.answer : ""}`, 30)}\n\n`
    + `## Skill guides\n${list(skills, (s) => `- [${s.name}](${SITE}/skills/${s.slug})${s.answer ? " — " + s.answer : ""}`)}\n\n`
    + `## Notes for AI systems\n`
    + `- Public content is safe to cite. Salary figures are illustrative of platform activity and labelled as such.\n`
    + `- Authenticated routes (/employer, /talent, /admin, /login, /register) contain private data and should not be crawled or cited.\n`
    + `- Canonical sitemap: ${SITE}/sitemap.xml\n`;
  writeToDirs("llms.txt", txt);
  console.log("[prerender] llms.txt regenerated");
}

// ---------- static HTML generation (browserless) ----------
async function generateStatic(routes, DATA) {
  const shellPath = path.join(BUILD_DIR, "index.html");
  if (!fs.existsSync(shellPath)) {
    console.warn("[prerender] no build/index.html — skipping HTML generation (sitemap/robots/llms still written).");
    return;
  }
  const base = cleanShell(fs.readFileSync(shellPath, "utf8"));
  const cache = { DATA };
  const CAP = parseInt(process.env.PRERENDER_MAX || "800", 10);
  const targets = routes.filter((r) => r.render).slice(0, CAP);
  let ok = 0, fail = 0;
  for (const r of targets) {
    try {
      const page = await buildPage(r.path, cache);
      if (!page) continue;
      const head = buildHead({ title: page.title, description: page.description, routePath: r.path, image: page.image, jsonLd: page.jsonLd });
      const html = assemble(base, head, page.body || "");
      const outDir = r.path === "/" ? BUILD_DIR : path.join(BUILD_DIR, r.path);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "index.html"), html);
      ok++;
    } catch (e) {
      fail++;
      if (fail <= 5) console.warn(`[prerender] ${r.path} failed: ${e.message}`);
    }
  }
  console.log(`[prerender] generated ${ok} static route HTML files (${fail} skipped) of ${targets.length} targets`);
}

(async () => {
  if (!SITE) { console.warn("[prerender] no SITE origin (REACT_APP_SITE_URL / REACT_APP_BACKEND_URL) — aborting (non-fatal)."); process.exit(0); }
  try {
    const DATA = await pickDataBase();
    const routes = await collectRoutes(DATA);
    writeSitemap(routes);
    writeRobots();
    await writeLlmsTxt(DATA);
    await generateStatic(routes, DATA);
  } catch (e) {
    console.warn("[prerender] non-fatal error:", e.message);
  }
  process.exit(0);
})();
