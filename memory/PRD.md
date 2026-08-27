# ElevateMe — Talent Intelligence Marketplace (PRD)

## Original Problem Statement
Build a next-gen U.S. recruitment platform positioned as a **Talent Intelligence Marketplace** (NOT a job board / LinkedIn / Indeed). Combines talent marketplace + recruiting platform + talent intelligence + verified skills + AI matching + candidate readiness + interview workflow + placement intelligence. Full MVP with real AI, premium light editorial UI, using the official ElevateMe brand system.

## Design / Brand
- Brand from official ElevateMe AI-Ready Design System PDF: Charcoal #1A1A1A, Terracotta #C7493A, Green #488A6D, Cream #F2F1EE, white cards, Nunito Sans (800 headings). No purple/neon/blue-SaaS.
- Marketing = editorial/kinetic (framer-motion + lenis, masked hero reveal, marquee, numbered chapters). Product = information-dense, 1px borders, clean.

## Architecture
- Backend: FastAPI + MongoDB (motor). Files: server.py, auth.py (JWT+bcrypt, 4 roles), matching.py (deterministic explainable match), ai_service.py (Emergent LLM key, gpt-5.4), seed_data.py (12 candidates, 3 companies, 3 roles).
- Frontend: React 19 + Tailwind + shadcn + framer-motion + lenis + recharts. AuthContext (Bearer token in localStorage), ProductLayout with role-based sidebar.
- AI: role intake NL→structured, why-this-match narrative, career recommendations, message drafting (all via Emergent LLM key, with deterministic fallbacks).

## User Personas
Talent (students/grads/pros), Recruiter, Employer/Hiring Manager, ElevateMe Admin.

## Implemented (2026-06)
- JWT auth + RBAC (talent/recruiter/employer/admin), demo accounts + admin seed.
- Marketing landing: kinetic hero, Tell Us Who You Need, How It Works, Match Intelligence (Why This Match), Talent, Outcomes, marquee, CTA.
- Employer: dashboard, Find Talent (Match/Discover/Search + AI role intake + availability + ranked matches), Talent Cards, Candidate Talent Intelligence Profile (verified skills, evidence "Show Me The Work", assessment, Why This Match), Shortlist + Compare table, Messages (+AI draft, auto-reply), Interviews (request/schedule/feedback), Talent Room workspace.
- Talent: Career Control Center (readiness, career paths, What's Holding You Back), Career Match (AI), Opportunities (match-aware), Readiness.
- Admin: Command Center KPIs, Placement Control Tower (risk GREEN/AMBER/RED), Employer CRM, Analytics (recharts funnel + trend).

## Backlog
- P1: Interview Battle Plan generation, Market Intelligence, Referral engine, Network, Notifications center, Employer profile pages, profile analytics.
- P2: Talent Intelligence Graph, placement probability, employer propensity model, ATS/calendar integrations, resume parsing/upload, candidate onboarding wizard.

## Next Tasks
- Visual QA of authenticated screens via browser automation.
- Talent onboarding to create real candidate profiles (currently seeded).
- Notifications + activity timelines per entity.

## Search + AI Discovery Architecture (2026-06)
- **Public discovery layer** (crawlable, entity-first URLs): /careers + /careers/:slug, /skills + /skills/:slug, /jobs + /jobs/:id, /locations/:slug, /companies/:id, /market-insights + /:slug, and knowledge pages /about /how-it-works /trust /methodology /ai /for-students /for-employers /for-recruiters.
- **Metadata**: react-helmet-async `Seo` component (single source of head tags) → unique title, description, canonical (matches path), robots, OG/Twitter per page. Static tags removed from index.html to avoid duplicate canonicals.
- **Structured data (JSON-LD)**: Organization + WebSite(SearchAction) sitewide; BreadcrumbList, FAQPage, Article on guides; JobPosting on job pages (title, hiringOrganization, datePosted, validThrough, baseSalary).
- **AEO**: direct-answer AnswerBlocks + visible FAQ (matching FAQPage schema) on every entity/knowledge page; answer-first content structure.
- **Internal linking engine**: PublicLayout footer (26 links) + related-entity chips (career↔skill↔job↔company↔location) + landing footer links into hubs.
- **Crawlability**: /robots.txt (allows Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Google-Extended; disallows authenticated routes), /sitemap.xml (index) + /sitemap-pages.xml (31 URLs). NOTE: preview edge serves its own robots.txt; app robots.txt applies on real deployment.
- **Backend**: /api/seo/* endpoints (careers, skills, locations, jobs, companies, market-insights) derive content from seeded platform data + curated factual guides in seo_content.py. No fabricated statistics; salary ranges illustrative from platform roles (documented on /methodology).
- **Content→product loop**: every public page ends with a ProductCta → /register.
- **DEFERRED (needs production infra/keys)**: true SSR/prerendering (currently CRA client-render — Googlebot renders JS; SSR/Next.js recommended for max crawlability), Search Console/Bing Webmaster/AI-citation monitoring wiring, programmatic role×location pages at scale.

## Session 2026-07 — Prerender, Location Careers, Live Report, Search Console, Catalog Realignment
- **Static prerender for bots (deploy-time)**: `frontend/scripts/prerender.js` (postbuild + `yarn prerender`). Fail-safe (never breaks a build): discovers routes from `/api/seo/*`, regenerates `sitemap-pages.xml`, and — if Chromium is present — snapshots every public route to `build/<route>/index.html` with full title/meta/canonical/JSON-LD/answer/FAQ. Serves a pristine in-memory shell as SPA fallback + strips duplicate head tags so each snapshot has exactly one title/canonical/description. Bounded by `PRERENDER_MAX` (default 500); long-tail combos stay client-rendered but are in the sitemap. Uses `puppeteer-core` + `/root/bin/chromium`. See `/app/SEO_DEPLOYMENT.md`.
- **Location Career pages**: `/careers/:slug/in/:location` (role×city guides). Backend `GET /api/seo/careers/{c}/in/{loc}` + `GET /api/seo/location-careers` (all combos, in sitemap). Encouraging copy + illustrative salary when a career has no live local jobs.
- **Live Hiring Report**: `/market-insights/elevateme-live-hiring-report` computed live from DB aggregates (open roles, verified candidates, most-requested skills, top locations, interview-ready %). Rendered with stat cards + ranked skill-demand bars. Methodology labelled illustrative.
- **Search Console / Bing**: env-driven verification via `SiteVerification` (reads `REACT_APP_GOOGLE_SITE_VERIFICATION` / `REACT_APP_BING_SITE_VERIFICATION`). Inert until codes set. Docs in `/app/SEO_DEPLOYMENT.md`.
- **Catalog realignment to GRADUATE/POST-GRADUATE professional audience** (per user): removed blue-collar/vocational careers (electrician, HVAC, welder, plumber, warehouse, logistics, medical assistant, pharmacy tech, bookkeeper, support specialist) and trades skills; added **AI Engineer, Data Engineer** careers and **Artificial Intelligence, Deep Learning, NLP, Cloud Computing** skills. Now ~42 careers across 11 professional categories, ~48 skills. Careers/Skills hubs grouped by category; `category` + illustrative `salary_us` on every career.
- **Seed expanded + version-gated reseed**: `seed_data.py` now has 11 companies + 31 graduate-level jobs (ML/AI/Cybersecurity/Cloud/Data/SWE/Product/Finance/Marketing/Design/CS). `SEED_VERSION` bump in `server.py startup()` drops+reseeds companies/roles. Fixes the "empty jobs search" bug.
- **Jobs search fix**: `/jobs` lists all jobs by default; search filters by role/skill/location AND surfaces related career-guide chips + empty-state so it never dead-ends.
- **No broken internal links**: skill chips only link when a guide exists (`core_skills_linked` from backend, `SkillChips` component); unknown `/careers|/skills|/jobs` slugs render a real `NotFound` page (noindex) instead of redirecting home. Backend sanitizes stale cross-reference slugs.
- **Testing**: iterations 5–8 all pass (backend 100%; frontend 100% on iteration 8).

## Session 2026-07 (cont.) — Program Pages, Talent Pools, Logo
- **University / Program pages (public SEO/AEO)**: `/programs` hub + `/programs/:slug` guides ("Careers for <degree> Graduates"). 8 programs (Computer Science, Data Science, Information Technology, Cybersecurity, Business/MBA, Finance, Marketing, Design), each mapping the degree → career paths + skills + live jobs + salary + FAQ, with Article/FAQ/ItemList/Breadcrumb JSON-LD. Backend: `GET /api/seo/programs` + `/api/seo/programs/{slug}`. Added to nav, footer, sitemap and prerender.
- **Grad Talent Pools (authenticated, employer/recruiter/admin)**: named shortlists (e.g. "Data Science New-Grads 2026") extending the flat Shortlist. `db.talent_pools` scoped by user_id; CRUD at `/api/pools` (+ `/candidates`), role-gated via `_require_employer` (talent → 403). Frontend: `/employer/pools` (list/create/detail), sidebar entry, and a reusable `AddToPoolMenu` popover on Find Talent candidate cards (`showPools`) + candidate profile. Adding a candidate fires a `pool` notification.
- **Logo rectified**: `Logo.jsx` now renders the official mark — charcoal "Elevate", a two-tone green up-right arrow, terracotta "Me" (crisp SVG, scales + dark-mode safe).
- **Testing**: iteration 9 — backend 100%, frontend 100% for both new features. Pre-existing security gaps remain open (unauth `/api/talent/dashboard` PII, talent can POST `/api/shortlist`, no login brute-force lockout) — out of scope, tracked for backlog. Legacy `/app/backend/tests/*.py` have stale hard-coded catalog counts (expected — catalog expanded).
