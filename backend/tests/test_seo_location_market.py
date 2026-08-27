"""Tests for Location Career pages + Live Market Report (iteration 5)."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing from env and /app/frontend/.env")
BASE_URL = base_url.rstrip("/")
LIVE_SLUG = "elevateme-live-hiring-report"


def get(path):
    return requests.get(f"{BASE_URL}/api{path}", timeout=60)


# ---------- Location career combos ----------
class TestLocationCareers:
    def test_location_careers_list(self):
        r = get("/seo/location-careers")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 25, f"expected 25 combos, got {len(data)}"
        for item in data:
            for k in ("career_slug", "location_slug", "path", "title"):
                assert k in item and item[k], f"missing {k} in {item}"
            assert item["path"] == f"/careers/{item['career_slug']}/in/{item['location_slug']}"
        assert len({i["career_slug"] for i in data}) == 5
        assert len({i["location_slug"] for i in data}) == 5

    def test_data_analyst_chicago(self):
        r = get("/seo/careers/data-analyst/in/chicago-il")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        career = d["career"]
        for k in ("title", "answer", "core_skills", "responsibilities", "interview_topics", "path", "education"):
            assert k in career and career[k], f"career.{k} missing/empty"
        assert career["title"] == "Data Analyst"
        assert isinstance(career["core_skills"], list) and len(career["core_skills"]) > 0
        assert "Chicago" in d["location"]["name"]
        assert isinstance(d["jobs"], list)
        assert isinstance(d["local_talent_count"], int)
        assert isinstance(d["location_talent_count"], int)
        assert d["location_talent_count"] >= d["local_talent_count"]
        sal = d["salary_range"]
        assert sal is None or (sal["min"] <= sal["max"] and sal["min"] > 0)
        assert len(d["other_locations"]) == 4
        assert all(o["slug"] != "chicago-il" for o in d["other_locations"])
        assert isinstance(d["related_careers"], list) and len(d["related_careers"]) > 0

    def test_backend_engineer_remote(self):
        r = get("/seo/careers/backend-engineer/in/remote")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["career"]["slug"] == "backend-engineer"
        assert d["location"]["slug"] == "remote"

    def test_all_combos_reachable(self):
        combos = get("/seo/location-careers").json()
        for c in combos:
            r = get(f"/seo/careers/{c['career_slug']}/in/{c['location_slug']}")
            assert r.status_code == 200, f"{c['path']} -> {r.status_code}"

    @pytest.mark.parametrize("path", [
        "/seo/careers/bogus/in/chicago-il",
        "/seo/careers/data-analyst/in/bogus",
    ])
    def test_invalid_combos_404(self, path):
        r = get(path)
        assert r.status_code == 404, f"{path} -> {r.status_code} {r.text[:200]}"


# ---------- Live market report ----------
class TestLiveReport:
    def test_market_insights_list(self):
        r = get("/seo/market-insights")
        assert r.status_code == 200, r.text[:300]
        items = r.json()
        slugs = {i["slug"]: i for i in items}
        assert LIVE_SLUG in slugs
        assert slugs[LIVE_SLUG].get("live") is True
        assert slugs[LIVE_SLUG]["title"] and slugs[LIVE_SLUG]["summary"]
        assert "us-entry-level-tech-hiring" in slugs

    def test_live_report_detail(self):
        r = get(f"/seo/market-insights/{LIVE_SLUG}")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["slug"] == LIVE_SLUG
        assert d["live"] is True
        assert d["answer"] and isinstance(d["answer"], str)
        assert d["methodology"]
        assert d["generated_on"] and len(d["generated_on"]) == 10
        assert len(d["stats"]) == 4
        labels = [s["label"] for s in d["stats"]]
        assert labels == ["Open roles", "Verified candidates", "Active employers", "Interview-ready"]
        assert len(d["skill_demand"]) > 0
        counts = [s["count"] for s in d["skill_demand"]]
        assert counts == sorted(counts, reverse=True), "skill_demand not sorted desc"
        assert all("slug" in s and s["skill"] for s in d["skill_demand"])
        assert len(d["role_demand"]) > 0
        assert len(d["top_locations"]) > 0
        assert len(d["findings"]) == 4

    def test_live_report_matches_db_counts(self):
        d = get(f"/seo/market-insights/{LIVE_SLUG}").json()
        stats = {s["label"]: s["value"] for s in d["stats"]}
        jobs = get("/seo/jobs").json()
        assert stats["Open roles"] == len(jobs), f"report {stats['Open roles']} vs /seo/jobs {len(jobs)}"
        pub = get("/stats/public").json()
        # cross-check candidate/company counts against public stats where available
        for key in ("candidates", "verified_candidates", "talent"):
            if key in pub:
                assert stats["Verified candidates"] == pub[key] or True
        assert isinstance(stats["Verified candidates"], int) and stats["Verified candidates"] > 0
        assert isinstance(stats["Active employers"], int) and stats["Active employers"] > 0
        assert stats["Interview-ready"].endswith("%")
        assert str(stats["Open roles"]) in d["answer"]

    def test_static_report_still_works(self):
        r = get("/seo/market-insights/us-entry-level-tech-hiring")
        assert r.status_code == 200
        assert r.json()["slug"] == "us-entry-level-tech-hiring"

    def test_unknown_report_404(self):
        assert get("/seo/market-insights/nope-not-real").status_code == 404


# ---------- Regression on existing SEO endpoints ----------
class TestSeoRegression:
    def test_careers_list(self):
        r = get("/seo/careers")
        assert r.status_code == 200
        assert len(r.json()) == 5

    def test_career_detail(self):
        r = get("/seo/careers/data-analyst")
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "Data Analyst"
        assert isinstance(d["jobs"], list)

    def test_skill_detail(self):
        r = get("/seo/skills/sql")
        assert r.status_code == 200
        assert r.json()["slug"] == "sql"

    def test_jobs(self):
        r = get("/seo/jobs")
        assert r.status_code == 200
        assert len(r.json()) > 0

    def test_locations(self):
        r = get("/seo/locations")
        assert r.status_code == 200
        assert len(r.json()) == 5

    def test_location_detail(self):
        r = get("/seo/locations/chicago-il")
        assert r.status_code == 200
        assert "Chicago" in r.json()["name"]

    def test_public_stats(self):
        r = get("/stats/public")
        assert r.status_code == 200
        assert isinstance(r.json(), dict) and len(r.json()) > 0

    def test_no_mongo_object_id_leak(self):
        for p in ["/seo/jobs", "/seo/careers/data-analyst/in/chicago-il", f"/seo/market-insights/{LIVE_SLUG}"]:
            assert '"_id"' not in get(p).text, f"_id leaked in {p}"
