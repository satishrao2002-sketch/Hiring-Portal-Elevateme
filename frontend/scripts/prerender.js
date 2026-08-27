#!/usr/bin/env node
/**
 * ElevateMe static prerender + sitemap generator.
 *
 * Two jobs, both fail-safe (never break the production build):
 *   1) Regenerate public/sitemap-pages.xml (and build/ copy) from live backend data.
 *   2) If a production build exists AND a Chromium binary is available, snapshot every
 *      public route to build/<route>/index.html so crawlers/AI engines that don't run
 *      JavaScript receive full HTML (title, meta, canonical, JSON-LD, answer blocks, FAQ).
 *
 * Run automatically via `postbuild`. Also runnable standalone: `node scripts/prerender.js`.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "build");
const PUBLIC_DIR = path.join(ROOT, "public");

function readEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
    const line = env.split("\n").find((l) => l.startsWith(key + "="));
    return line ? line.slice(key.length + 1).trim() : "";
  } catch {
    return "";
  }
}

const BACKEND = (readEnv("REACT_APP_BACKEND_URL") || "").replace(/\/$/, "");
const SITE = BACKEND; // public site is served from the same origin

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

// Pick a data source that actually responds (public URL first, then local backend).
async function pickDataBase() {
  const candidates = [BACKEND, "http://localhost:8001", "http://127.0.0.1:8001"].filter(Boolean);
  for (const base of candidates) {
    try { await jRetry(base, "/api/seo/careers", 2); return base; }
    catch {}
  }
  return BACKEND;
}

// ---------- route discovery ----------
async function collectRoutes() {
  const routes = [
    { path: "/", priority: "1.0", render: true },
    ...["about", "how-it-works", "trust", "methodology", "ai", "for-students", "for-employers", "for-recruiters"].map((s) => ({ path: `/${s}`, priority: "0.7", render: true })),
    { path: "/careers", priority: "0.9", render: true },
    { path: "/skills", priority: "0.9", render: true },
    { path: "/jobs", priority: "0.9", render: true },
    { path: "/market-insights", priority: "0.8", render: true },
  ];
  const add = (p, priority, render = true) => { if (!routes.some((r) => r.path === p)) routes.push({ path: p, priority, render }); };
  const DATA = await pickDataBase();
  const get = (pathname) => jRetry(DATA, pathname).catch(() => []);
  try {
    const [careers, skills, jobs, companies, locations, locCareers, reports] = await Promise.all([
      get("/api/seo/careers"), get("/api/seo/skills"), get("/api/seo/jobs"),
      get("/api/companies"), get("/api/seo/locations"), get("/api/seo/location-careers"),
      get("/api/seo/market-insights"),
    ]);
    // Locations flagged `top` get their role x city guides statically prerendered;
    // the rest are still listed in the sitemap and render client-side (crawlable).
    const topLocs = new Set(locations.filter((l) => l.top).map((l) => l.slug));
    careers.forEach((c) => add(`/careers/${c.slug}`, "0.8"));
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
  for (const dir of [PUBLIC_DIR, BUILD_DIR]) {
    try { if (fs.existsSync(dir)) fs.writeFileSync(path.join(dir, "sitemap-pages.xml"), xml); } catch {}
  }
  console.log(`[prerender] sitemap-pages.xml written with ${routes.length} URLs`);
}

// ---------- static server (SPA fallback uses a pristine shell) ----------
const MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "application/xml", ".woff2": "font/woff2" };
function startServer(shellHtml) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      let file = path.join(BUILD_DIR, p);
      const isAsset = path.extname(file) && fs.existsSync(file) && fs.statSync(file).isFile();
      if (!isAsset) {
        // Always serve the pristine SPA shell for route requests so previously
        // written snapshots never poison later pages' <head>.
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(shellHtml);
        return;
      }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end("not found"); return; }
        res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.on("error", () => {});
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

function findChromium() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, "/root/bin/chromium", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return candidates.find((c) => c && fs.existsSync(c));
}

async function prerender(routes) {
  const shellPath = path.join(BUILD_DIR, "index.html");
  if (!fs.existsSync(shellPath)) {
    console.warn("[prerender] no build/index.html — skipping HTML snapshots (sitemap still generated).");
    return;
  }
  // Capture the pristine CRA shell BEFORE we start overwriting index.html, and
  // strip its default <title> so react-helmet's per-page title is the only one
  // (prevents duplicate <title>/canonical/description in snapshots).
  let shellHtml = fs.readFileSync(shellPath, "utf8").replace(/<title>[\s\S]*?<\/title>/gi, "");
  let puppeteer;
  try { puppeteer = require("puppeteer-core"); } catch {
    console.warn("[prerender] puppeteer-core not installed — skipping HTML snapshots.");
    return;
  }
  const exe = findChromium();
  if (!exe) { console.warn("[prerender] no Chromium binary found — skipping HTML snapshots."); return; }

  const { server, port: livePort } = await startServer(shellHtml);
  const launchOpts = { executablePath: exe, headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process"] };
  const BLOCK = ["posthog", "emergent.sh", "google-analytics", "googletagmanager"];

  async function snapshot(browser, r) {
    const page = await browser.newPage();
    try {
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const u = req.url();
        const isLocal = u.startsWith(`http://127.0.0.1:${livePort}`);
        if (!isLocal && BLOCK.some((b) => u.includes(b))) return req.abort().catch(() => {});
        req.continue().catch(() => {});
      });
      await page.goto(`http://127.0.0.1:${livePort}${r.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      // wait for the app to finish loading data & render content + head tags
      await page.waitForFunction(() => document.querySelector('link[rel="canonical"]') && document.querySelector("h1, [data-testid='answer-block']"), { timeout: 25000 });
      await new Promise((res) => setTimeout(res, 400));
      // de-duplicate singleton head tags (keep the last = react-helmet's)
      await page.evaluate(() => {
        const head = document.head;
        ["title", 'link[rel="canonical"]', 'meta[name="description"]', 'meta[name="robots"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:url"]', 'meta[name="twitter:title"]', 'meta[name="twitter:description"]'].forEach((sel) => {
          const nodes = [...head.querySelectorAll(sel)];
          if (nodes.length <= 1) return;
          const rh = nodes.filter((n) => n.hasAttribute("data-rh"));
          const keep = rh.length ? rh[rh.length - 1] : nodes[nodes.length - 1];
          nodes.forEach((n) => { if (n !== keep) n.remove(); });
        });
      });
      const html = await page.content();
      const outDir = r.path === "/" ? BUILD_DIR : path.join(BUILD_DIR, r.path);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "index.html"), html);
    } finally {
      await page.close().catch(() => {});
    }
  }

  let browser;
  try {
    browser = await puppeteer.launch(launchOpts);
    let ok = 0;
    const CAP = parseInt(process.env.PRERENDER_MAX || "500", 10);
    const renderRoutes = routes.filter((r) => r.render).slice(0, CAP);
    console.log(`[prerender] snapshotting ${renderRoutes.length} of ${routes.length} routes (rest are client-rendered but in the sitemap)`);
    for (const r of renderRoutes) {
      let done = false;
      for (let attempt = 0; attempt < 2 && !done; attempt++) {
        try {
          if (!browser || !browser.connected) browser = await puppeteer.launch(launchOpts);
          await snapshot(browser, r);
          ok++; done = true;
        } catch (e) {
          console.warn(`[prerender] ${r.path} attempt ${attempt + 1} failed: ${e.message}`);
          try { if (browser) await browser.close(); } catch {}
          browser = null;
        }
      }
    }
    console.log(`[prerender] snapshotted ${ok} routes to build/`);
  } catch (e) {
    console.warn("[prerender] browser prerender skipped:", e.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.close();
  }
}

(async () => {
  if (!BACKEND) { console.warn("[prerender] REACT_APP_BACKEND_URL not set — aborting (non-fatal)."); process.exit(0); }
  try {
    const routes = await collectRoutes();
    writeSitemap(routes);
    await prerender(routes);
  } catch (e) {
    console.warn("[prerender] non-fatal error:", e.message);
  }
  process.exit(0);
})();
