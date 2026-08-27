# ElevateMe — SEO / GEO / AEO Deployment Guide

This app ships a full public discovery layer (careers, skills, jobs, locations,
role×city guides, companies, and a live market report) with per-page metadata and
Schema.org JSON-LD. Below is everything needed to make it fully crawlable and
citable by Google, Bing and AI answer engines in production.

## 1. Static Prerender for Bots
CRA renders on the client, so raw HTML is otherwise an empty shell. We snapshot
every public route into full HTML at build time.

- Script: `frontend/scripts/prerender.js`
- Runs automatically after every `yarn build` (wired as `postbuild`), and can be
  run manually with `yarn prerender`.
- It:
  1. Discovers all public routes from the backend `/api/seo/*` endpoints.
  2. Regenerates `sitemap-pages.xml` (in `public/` and `build/`).
  3. If a Chromium binary is present, renders each route with headless Chromium
     and writes `build/<route>/index.html` containing the real title, meta,
     canonical, JSON-LD, answer blocks and FAQ.
- **Fail-safe:** if Chromium or `puppeteer-core` is unavailable, or the backend is
  unreachable, it logs a warning and exits 0 — it will **never** break a deploy.
- Chromium path is auto-detected; override with `PUPPETEER_EXECUTABLE_PATH` if needed.

> The static host must serve nested `index.html` files (e.g. `/careers/data-analyst`
> → `build/careers/data-analyst/index.html`) with SPA fallback. Standard static
> hosting (and Emergent deploy) does this.

## 2. Google Search Console + Bing Webmaster
Verification is env-driven (no code change needed):

1. Google Search Console → add property (URL-prefix) → choose **HTML tag** → copy
   the `content` value → set in `frontend/.env`:
   ```
   REACT_APP_GOOGLE_SITE_VERIFICATION=xxxxxxxxxxxxxxxxxxxx
   ```
2. Bing Webmaster Tools → add site → **Meta tag** option → copy the `content` value:
   ```
   REACT_APP_BING_SITE_VERIFICATION=xxxxxxxxxxxxxxxxxxxx
   ```
3. Redeploy. The tags render sitewide via `SiteVerification` (see `frontend/src/seo/Seo.jsx`).
4. In each console: **Submit sitemap** → `https://<your-domain>/sitemap.xml`.
5. Bing also imports Search Console properties directly if you prefer.

File-based verification (alternative): drop the provider's `google*.html` /
`BingSiteAuth.xml` into `frontend/public/` and it will be served at the site root.

## 3. Sitemaps & robots
- `public/robots.txt` — allows Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User,
  PerplexityBot, Google-Extended; disallows authenticated routes.
- `sitemap.xml` (index) → `sitemap-pages.xml` (all public URLs, regenerated on build).

> Note: the preview edge may serve its own robots.txt / `x-robots-tag: noindex`.
> This only applies to the preview host; the app's own files apply on the real domain.

## 4. Tracking AI grounding queries
Once Search Console is connected, use the **Performance → Search results** report and
filter for AI Overview / discover surfaces. Bing Webmaster shows Copilot/answer
impressions under **Search Performance**. There is no public API from ChatGPT/Perplexity
for citation tracking yet; monitor referral traffic in analytics for those user agents.
