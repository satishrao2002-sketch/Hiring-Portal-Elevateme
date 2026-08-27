"""Iteration 6: cross-industry SEO catalog expansion tests."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Careers hub ----------
class TestCareersCatalog:
    def test_careers_count_and_shape(self, client):
        r = client.get(f"{BASE_URL}/api/seo/careers", timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        careers = data["careers"] if isinstance(data, dict) else data
        assert len(careers) >= 45, f"expected ~50 careers, got {len(careers)}"
        for c in careers:
            for k in ("slug", "title", "answer", "core_skills", "category"):
                assert k in c, f"{c.get('slug')} missing {k}"
            assert isinstance(c["core_skills"], list) and c["core_skills"]
        cats = {c["category"] for c in careers}
        assert len(cats) >= 10, f"expected >=10 categories, got {sorted(cats)}"
        assert "Healthcare & Nursing" in cats
        assert "Skilled Trades" in cats

    @pytest.mark.parametrize("slug,category", [
        ("registered-nurse", "Healthcare & Nursing"),
        ("electrician", "Skilled Trades"),
        ("accountant", "Finance & Accounting"),
        ("sales-representative", "Sales"),
        ("graphic-designer", "Design & Creative"),
        ("data-analyst", "Technology & Data"),
    ])
    def test_career_detail(self, client, slug, category):
        r = client.get(f"{BASE_URL}/api/seo/careers/{slug}", timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        c = d.get("career", d)
        assert c["category"] == category
        assert "_id" not in c
        sal = c["salary_us"]
        assert isinstance(sal["min"], int) and isinstance(sal["max"], int)
        assert 0 < sal["min"] < sal["max"]

    def test_unknown_career_404(self, client):
        r = client.get(f"{BASE_URL}/api/seo/careers/not-a-real-career", timeout=30)
        assert r.status_code == 404


# ---------- Skills ----------
class TestSkills:
    def test_skills_list(self, client):
        r = client.get(f"{BASE_URL}/api/seo/skills", timeout=30)
        assert r.status_code == 200
        data = r.json()
        skills = data["skills"] if isinstance(data, dict) else data
        assert len(skills) >= 28, len(skills)
        for s in skills:
            assert "slug" in s and "name" in s and "category" in s
        names = {s["name"] for s in skills}
        for expected in ("Communication", "Accounting", "Patient Care", "Salesforce"):
            assert expected in names, f"missing skill {expected}"

    @pytest.mark.parametrize("slug", ["patient-care", "accounting", "sql", "figma"])
    def test_skill_detail(self, client, slug):
        r = client.get(f"{BASE_URL}/api/seo/skills/{slug}", timeout=30)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        s = d.get("skill", d)
        assert s["slug"] == slug
        assert s.get("category")


# ---------- Locations ----------
class TestLocations:
    def test_locations(self, client):
        r = client.get(f"{BASE_URL}/api/seo/locations", timeout=30)
        assert r.status_code == 200
        data = r.json()
        locs = data["locations"] if isinstance(data, dict) else data
        assert len(locs) == 30, len(locs)
        for loc in locs:
            assert "slug" in loc and "name" in loc
            assert isinstance(loc["top"], bool)
        assert any(l["top"] for l in locs)

    def test_location_careers_combos(self, client):
        r = client.get(f"{BASE_URL}/api/seo/location-careers", timeout=60)
        assert r.status_code == 200
        data = r.json()
        combos = data["combos"] if isinstance(data, dict) else data
        if isinstance(combos, dict):
            combos = combos.get("items", combos)
        assert len(combos) == 1500, len(combos)


# ---------- Career x Location ----------
class TestCareerLocation:
    def test_non_platform_combo_softened(self, client):
        r = client.get(f"{BASE_URL}/api/seo/careers/registered-nurse/in/miami-fl", timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["jobs"] == []
        assert d["salary_range"] is None
        assert d["career"]["salary_us"]["min"] == 65000
        assert d["career"]["salary_us"]["max"] == 110000

    def test_platform_combo_has_jobs(self, client):
        r = client.get(f"{BASE_URL}/api/seo/careers/data-analyst/in/chicago-il", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["jobs"], list) and len(d["jobs"]) > 0, "expected platform jobs"
        assert d["salary_range"] is not None

    @pytest.mark.parametrize("path", [
        "electrician/in/austin-tx", "accountant/in/new-york-ny",
    ])
    def test_other_combos(self, client, path):
        r = client.get(f"{BASE_URL}/api/seo/careers/{path}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["career"]["answer"]
        assert d["location"]["name"]


# ---------- Regression ----------
class TestRegression:
    def test_market_insights_hub(self, client):
        r = client.get(f"{BASE_URL}/api/seo/market-insights", timeout=30)
        assert r.status_code == 200
        data = r.json()
        reports = data.get("reports", data) if isinstance(data, dict) else data
        assert len(reports) > 0

    def test_live_hiring_report(self, client):
        r = client.get(f"{BASE_URL}/api/seo/market-insights/elevateme-live-hiring-report", timeout=45)
        assert r.status_code == 200
        d = r.json()
        rep = d.get("report", d)
        assert rep["slug"] == "elevateme-live-hiring-report"

    def test_seo_jobs(self, client):
        r = client.get(f"{BASE_URL}/api/seo/jobs", timeout=30)
        assert r.status_code == 200
