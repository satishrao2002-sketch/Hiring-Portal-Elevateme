"""Iteration 7: jobs seed fix + graduate/professional catalog realignment."""
import os
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

BLUE_COLLAR_CAREERS = [
    "electrician", "hvac-technician", "welder", "plumber", "warehouse-manager",
    "logistics-coordinator", "medical-assistant", "pharmacy-technician",
    "bookkeeper", "customer-support-specialist",
]
BLUE_COLLAR_SKILLS = ["blueprint-reading", "safety-compliance"]


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def jobs(client):
    r = client.get(f"{BASE_URL}/api/seo/jobs", timeout=60)
    assert r.status_code == 200, r.text[:300]
    return r.json()


@pytest.fixture(scope="module")
def careers(client):
    r = client.get(f"{BASE_URL}/api/seo/careers", timeout=60)
    assert r.status_code == 200, r.text[:300]
    return r.json()


@pytest.fixture(scope="module")
def skills(client):
    r = client.get(f"{BASE_URL}/api/seo/skills", timeout=60)
    assert r.status_code == 200, r.text[:300]
    return r.json()


# ---------------- Jobs seed / search ----------------
class TestJobs:
    def test_jobs_populated(self, jobs):
        assert isinstance(jobs, list)
        assert len(jobs) >= 25, f"expected ~31 jobs, got {len(jobs)}"
        for j in jobs:
            assert "_id" not in j
            assert j.get("id") and j.get("title") and j.get("company")

    def test_key_professional_titles_present(self, jobs):
        titles = " | ".join(j["title"].lower() for j in jobs)
        for t in ["machine learning engineer", "ai engineer", "cybersecurity analyst",
                  "data engineer", "data scientist", "financial analyst",
                  "product manager", "ux designer"]:
            assert t in titles, f"missing job title containing '{t}'"

    def test_no_blue_collar_jobs(self, jobs):
        titles = " | ".join(j["title"].lower() for j in jobs)
        for bad in ["electrician", "welder", "plumber", "hvac", "warehouse"]:
            assert bad not in titles, f"blue-collar job present: {bad}"

    @pytest.mark.parametrize("term,expected_min", [("machine", 2), ("cyber", 1), ("new york", 1)])
    def test_client_side_search_terms_have_matches(self, jobs, term, expected_min):
        """Mirrors the frontend filter (title / must_have / location)."""
        def m(txt):
            return bool(txt) and term in str(txt).lower()
        hits = [j for j in jobs if m(j.get("title")) or any(m(s) for s in (j.get("must_have") or [])) or m(j.get("location"))]
        assert len(hits) >= expected_min, f"'{term}' -> {len(hits)} hits"

    def test_job_detail(self, client, jobs):
        jid = jobs[0]["id"]
        r = client.get(f"{BASE_URL}/api/seo/jobs/{jid}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "_id" not in d
        assert d["id"] == jid
        assert d.get("must_have")
        assert d.get("company")

    def test_job_detail_404(self, client):
        r = client.get(f"{BASE_URL}/api/seo/jobs/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404


# ---------------- Careers catalog ----------------
class TestCareers:
    def test_count_and_no_blue_collar(self, careers):
        slugs = {c["slug"] for c in careers}
        assert len(careers) >= 35, f"got {len(careers)} careers"
        present = slugs & set(BLUE_COLLAR_CAREERS)
        assert not present, f"blue-collar careers still listed: {present}"

    def test_professional_careers_present(self, careers):
        slugs = {c["slug"] for c in careers}
        for s in ["ai-engineer", "data-engineer", "ml-engineer", "cybersecurity-analyst", "cloud-engineer"]:
            assert s in slugs, f"missing career {s}"

    def test_no_skilled_trades_category(self, careers):
        cats = {c.get("category") for c in careers}
        assert "Skilled Trades" not in cats

    @pytest.mark.parametrize("slug", ["ai-engineer", "data-engineer", "ml-engineer",
                                      "cybersecurity-analyst", "registered-nurse"])
    def test_career_detail_renders(self, client, slug):
        r = client.get(f"{BASE_URL}/api/seo/careers/{slug}", timeout=30)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert d["slug"] == slug
        assert d.get("answer") and d.get("core_skills") and d.get("title")
        assert isinstance(d.get("faqs", []), list)

    @pytest.mark.parametrize("slug", ["data-scientist", "backend-engineer"])
    def test_career_open_roles_populated(self, client, slug):
        r = client.get(f"{BASE_URL}/api/seo/careers/{slug}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert len(d.get("jobs") or []) > 0, f"{slug} has no open roles"
        assert d.get("salary_range"), f"{slug} salary_range empty"

    def test_related_and_skill_links_resolve(self, client, careers):
        """No career page should link to a slug that 404s."""
        slugs = {c["slug"] for c in careers}
        broken = set()
        for c in careers:
            r = client.get(f"{BASE_URL}/api/seo/careers/{c['slug']}", timeout=30)
            assert r.status_code == 200
            for rel in (r.json().get("related") or []):
                rs = rel["slug"] if isinstance(rel, dict) else rel
                if rs not in slugs:
                    broken.add((c["slug"], rs))
        assert not broken, f"broken related_careers links: {sorted(broken)}"


# ---------------- Skills catalog ----------------
class TestSkills:
    def test_count_and_ai_skills(self, skills):
        slugs = {s["slug"] for s in skills}
        assert len(skills) >= 40, f"got {len(skills)} skills"
        for s in ["artificial-intelligence", "deep-learning", "nlp", "cloud-computing", "machine-learning"]:
            assert s in slugs, f"missing skill {s}"
        bad = slugs & set(BLUE_COLLAR_SKILLS)
        assert not bad, f"blue-collar skills still listed: {bad}"

    @pytest.mark.parametrize("slug", ["artificial-intelligence", "nlp", "deep-learning", "cloud-computing"])
    def test_skill_detail(self, client, slug):
        r = client.get(f"{BASE_URL}/api/seo/skills/{slug}", timeout=30)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert d["slug"] == slug
        assert d.get("answer")

    def test_skill_role_links_resolve(self, client, skills, careers):
        """Skill pages list related roles; each must exist as a career guide."""
        career_slugs = {c["slug"] for c in careers}
        broken = set()
        for s in skills:
            r = client.get(f"{BASE_URL}/api/seo/skills/{s['slug']}", timeout=30)
            assert r.status_code == 200
            for role in (r.json().get("careers") or []):
                rs = role["slug"] if isinstance(role, dict) else role
                if rs not in career_slugs:
                    broken.add((s["slug"], rs))
        assert not broken, f"skill pages link to non-existent careers: {sorted(broken)}"

    def test_unknown_skill_404(self, client):
        r = client.get(f"{BASE_URL}/api/seo/skills/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404
