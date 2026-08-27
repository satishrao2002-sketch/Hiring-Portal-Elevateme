"""Iteration 8 — verify blue-collar cleanup (stale slug sanitization), footer target
slugs resolve, NotFound 404 behaviour, and jobs/careers regression."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")

DELETED_SLUGS = {
    "electrician", "welder", "plumber", "hvac-technician", "cnc-machinist",
    "bookkeeper", "warehouse-manager", "logistics-coordinator",
    "medical-assistant", "customer-support-specialist",
}

FOOTER_CAREERS = ["data-scientist", "ai-engineer", "cybersecurity-analyst",
                  "financial-analyst", "product-manager"]
FOOTER_SKILLS = ["python", "machine-learning", "sql", "cloud-computing", "communication"]
FOOTER_LOCATIONS = ["chicago-il", "austin-tx", "new-york-ny", "boston-ma", "remote"]


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- catalog listings ---
class TestCatalogs:
    def test_careers_hub_list(self, api):
        r = api.get(f"{BASE_URL}/api/seo/careers")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        careers = data["careers"] if isinstance(data, dict) else data
        slugs = {c["slug"] for c in careers}
        assert len(slugs) >= 40
        assert not (slugs & DELETED_SLUGS), f"deleted slugs still listed: {slugs & DELETED_SLUGS}"
        for s in ["ai-engineer", "ml-engineer", "data-scientist",
                  "cybersecurity-analyst", "data-engineer"]:
            assert s in slugs, f"missing {s}"
        cats = {c.get("category") for c in careers}
        assert "Skilled Trades" not in cats, cats

    def test_skills_hub_list(self, api):
        r = api.get(f"{BASE_URL}/api/seo/skills")
        assert r.status_code == 200
        data = r.json()
        skills = data["skills"] if isinstance(data, dict) else data
        slugs = {s["slug"] for s in skills}
        for s in FOOTER_SKILLS:
            assert s in slugs, f"footer skill {s} missing from catalog"

    def test_jobs_list_count(self, api):
        r = api.get(f"{BASE_URL}/api/seo/jobs")
        assert r.status_code == 200
        data = r.json()
        jobs = data["jobs"] if isinstance(data, dict) else data
        assert len(jobs) >= 25, f"only {len(jobs)} jobs"
        titles = " ".join(j["title"].lower() for j in jobs)
        assert "machine learning" in titles
        for j in jobs:
            assert "_id" not in j


# --- footer targets resolve ---
class TestFooterTargets:
    @pytest.mark.parametrize("slug", FOOTER_CAREERS)
    def test_footer_career_resolves(self, api, slug):
        r = api.get(f"{BASE_URL}/api/seo/careers/{slug}")
        assert r.status_code == 200, f"{slug} -> {r.status_code}"
        d = r.json()
        assert d.get("slug") == slug or d.get("career", {}).get("slug") == slug

    @pytest.mark.parametrize("slug", FOOTER_SKILLS)
    def test_footer_skill_resolves(self, api, slug):
        r = api.get(f"{BASE_URL}/api/seo/skills/{slug}")
        assert r.status_code == 200, f"{slug} -> {r.status_code}"

    @pytest.mark.parametrize("slug", FOOTER_LOCATIONS)
    def test_footer_location_resolves(self, api, slug):
        r = api.get(f"{BASE_URL}/api/seo/locations/{slug}")
        assert r.status_code == 200, f"{slug} -> {r.status_code}"


# --- stale slug sanitization (the iteration_7 minor issues) ---
class TestSanitization:
    def test_career_related_careers_have_no_deleted_slugs(self, api):
        listing = api.get(f"{BASE_URL}/api/seo/careers").json()
        careers = listing["careers"] if isinstance(listing, dict) else listing
        valid = {c["slug"] for c in careers}
        bad = {}
        for c in careers:
            d = api.get(f"{BASE_URL}/api/seo/careers/{c['slug']}").json()
            payload = d.get("career", d)
            for key in ("related_careers", "related"):
                for s in payload.get(key) or []:
                    slug = s["slug"] if isinstance(s, dict) else s
                    if slug not in valid:
                        bad.setdefault(c["slug"], []).append(f"{key}:{slug}")
        assert not bad, f"stale career cross-refs: {bad}"

    def test_skill_roles_have_no_deleted_slugs(self, api):
        careers = api.get(f"{BASE_URL}/api/seo/careers").json()
        careers = careers["careers"] if isinstance(careers, dict) else careers
        valid = {c["slug"] for c in careers}
        skills = api.get(f"{BASE_URL}/api/seo/skills").json()
        skills = skills["skills"] if isinstance(skills, dict) else skills
        bad = {}
        for sk in skills:
            d = api.get(f"{BASE_URL}/api/seo/skills/{sk['slug']}").json()
            payload = d.get("skill", d)
            for key in ("roles", "careers"):
                for s in payload.get(key) or []:
                    slug = s["slug"] if isinstance(s, dict) else s
                    if slug not in valid:
                        bad.setdefault(sk["slug"], []).append(f"{key}:{slug}")
        assert not bad, f"stale skill->career refs: {bad}"


# --- 404 behaviour for unknown slugs ---
class TestNotFound:
    @pytest.mark.parametrize("path", [
        "/api/seo/careers/electrician",
        "/api/seo/careers/zzz-nope",
        "/api/seo/skills/zzz-nope",
        "/api/seo/jobs/zzz-nope",
        "/api/seo/locations/zzz-nope",
    ])
    def test_unknown_slug_404(self, api, path):
        r = api.get(f"{BASE_URL}{path}")
        assert r.status_code == 404, f"{path} -> {r.status_code}: {r.text[:200]}"


# --- career detail regression: open roles populated ---
class TestCareerDetail:
    @pytest.mark.parametrize("slug", ["ai-engineer", "data-scientist"])
    def test_open_roles_present(self, api, slug):
        r = api.get(f"{BASE_URL}/api/seo/careers/{slug}")
        assert r.status_code == 200
        d = r.json()
        payload = d.get("career", d)
        jobs = d.get("jobs") or payload.get("jobs") or []
        assert len(jobs) > 0, f"{slug} has no open roles"
        assert d.get("salary_range") or payload.get("salary_range")

    def test_no_objectid_leak(self, api):
        r = api.get(f"{BASE_URL}/api/seo/careers/data-scientist")
        assert "_id" not in r.text or '"_id"' not in r.text
