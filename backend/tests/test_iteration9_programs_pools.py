"""Iteration 9: University/Program SEO pages + Grad Talent Pools."""
import os
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

RECRUITER = {"email": "recruiter@elevateme.com", "password": "Demo@123"}
EMPLOYER = {"email": "employer@elevateme.com", "password": "Demo@123"}
TALENT = {"email": "talent@elevateme.com", "password": "Demo@123"}

EXPECTED_PROGRAMS = {
    "computer-science", "data-science", "information-technology", "cybersecurity",
    "business-administration", "finance", "marketing", "design",
}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"login failed {creds['email']}: {r.status_code} {r.text[:300]}")
    tok = r.json().get("token")
    assert tok, "no token in login response"
    return tok


@pytest.fixture(scope="session")
def recruiter_token():
    return _login(RECRUITER)


@pytest.fixture(scope="session")
def employer_token():
    return _login(EMPLOYER)


@pytest.fixture(scope="session")
def talent_token():
    return _login(TALENT)


def _c(token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


# ---------- Programs (public SEO) ----------
class TestPrograms:
    def test_programs_list(self):
        r = requests.get(f"{BASE_URL}/api/seo/programs", timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data, list) and len(data) == 8, f"expected 8 programs got {len(data)}"
        slugs = {p["slug"] for p in data}
        assert slugs == EXPECTED_PROGRAMS, f"slug mismatch: {slugs ^ EXPECTED_PROGRAMS}"
        for p in data:
            for k in ("slug", "name", "degree_level", "answer", "career_count"):
                assert k in p, f"{p['slug']} missing {k}"
            assert isinstance(p["career_count"], int) and p["career_count"] > 0
            assert len(p["answer"]) > 40

    @pytest.mark.parametrize("slug", sorted(EXPECTED_PROGRAMS))
    def test_program_detail(self, slug):
        r = requests.get(f"{BASE_URL}/api/seo/programs/{slug}", timeout=45)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["slug"] == slug
        assert d["careers"] and isinstance(d["careers"], list)
        for c in d["careers"]:
            assert c["title"] and c["slug"]
            assert "salary_us" in c
        assert d["skills"] and all(s.get("name") for s in d["skills"])
        assert isinstance(d["jobs"], list)
        assert "salary_range" in d

    def test_cs_has_jobs(self):
        d = requests.get(f"{BASE_URL}/api/seo/programs/computer-science", timeout=45).json()
        assert len(d["jobs"]) > 0, "CS program should surface live roles"
        j = d["jobs"][0]
        assert j.get("title")
        assert d["salary_range"] is None or d["salary_range"]["min"] <= d["salary_range"]["max"]

    def test_program_404(self):
        r = requests.get(f"{BASE_URL}/api/seo/programs/bogus", timeout=30)
        assert r.status_code == 404, f"expected 404 got {r.status_code}"


# ---------- Talent Pools ----------
class TestPools:
    created = []

    def test_pool_crud_lifecycle(self, recruiter_token):
        c = _c(recruiter_token)
        # CREATE
        r = c.post(f"{BASE_URL}/api/pools", json={"name": "TEST_Pool_A", "description": "qa"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        p = r.json()
        assert p["name"] == "TEST_Pool_A"
        assert p["count"] == 0 and p["preview"] == []
        pid = p["id"]
        TestPools.created.append((recruiter_token, pid))

        # LIST
        lr = c.get(f"{BASE_URL}/api/pools", timeout=30)
        assert lr.status_code == 200
        assert any(x["id"] == pid and x["count"] == 0 for x in lr.json())

        # ADD CANDIDATE
        ar = c.post(f"{BASE_URL}/api/pools/{pid}/candidates", json={"candidate_slug": "priya-shah"}, timeout=30)
        assert ar.status_code == 200, ar.text[:300]
        assert ar.json().get("ok") is True

        gr = c.get(f"{BASE_URL}/api/pools/{pid}", timeout=30)
        assert gr.status_code == 200
        g = gr.json()
        assert "_id" not in g
        assert g["candidate_slugs"] == ["priya-shah"]
        assert len(g["candidates"]) == 1 and g["candidates"][0]["slug"] == "priya-shah"
        assert g["candidates"][0].get("name")

        # duplicate add is idempotent
        dr = c.post(f"{BASE_URL}/api/pools/{pid}/candidates", json={"candidate_slug": "priya-shah"}, timeout=30)
        assert dr.status_code == 200 and dr.json().get("already") is True

        # preview populated in list
        lr2 = c.get(f"{BASE_URL}/api/pools", timeout=30).json()
        me = [x for x in lr2 if x["id"] == pid][0]
        assert me["count"] == 1 and len(me["preview"]) == 1

        # RENAME
        pr = c.patch(f"{BASE_URL}/api/pools/{pid}", json={"name": "TEST_Pool_A_Renamed"}, timeout=30)
        assert pr.status_code == 200
        assert c.get(f"{BASE_URL}/api/pools/{pid}", timeout=30).json()["name"] == "TEST_Pool_A_Renamed"

        # REMOVE CANDIDATE
        rr = c.delete(f"{BASE_URL}/api/pools/{pid}/candidates/priya-shah", timeout=30)
        assert rr.status_code == 200
        assert c.get(f"{BASE_URL}/api/pools/{pid}", timeout=30).json()["candidates"] == []

        # DELETE
        dl = c.delete(f"{BASE_URL}/api/pools/{pid}", timeout=30)
        assert dl.status_code == 200
        assert c.get(f"{BASE_URL}/api/pools/{pid}", timeout=30).status_code == 404
        TestPools.created.remove((recruiter_token, pid))

    def test_pool_requires_auth(self):
        for m, u in [("get", "/api/pools"), ("post", "/api/pools")]:
            r = getattr(requests, m)(f"{BASE_URL}{u}", json={"name": "x"}, timeout=30)
            assert r.status_code in (401, 403), f"{u} returned {r.status_code}"

    def test_pools_scoped_per_user(self, recruiter_token, employer_token):
        rc, ec = _c(recruiter_token), _c(employer_token)
        pid = rc.post(f"{BASE_URL}/api/pools", json={"name": "TEST_Scoped"}, timeout=30).json()["id"]
        TestPools.created.append((recruiter_token, pid))
        assert all(x["id"] != pid for x in ec.get(f"{BASE_URL}/api/pools", timeout=30).json())
        assert ec.get(f"{BASE_URL}/api/pools/{pid}", timeout=30).status_code == 404
        assert ec.patch(f"{BASE_URL}/api/pools/{pid}", json={"name": "hax"}, timeout=30).status_code == 404
        assert ec.post(f"{BASE_URL}/api/pools/{pid}/candidates",
                       json={"candidate_slug": "priya-shah"}, timeout=30).status_code == 404
        # still intact for owner
        assert rc.get(f"{BASE_URL}/api/pools/{pid}", timeout=30).json()["name"] == "TEST_Scoped"

    def test_add_candidate_creates_pool_notification(self, recruiter_token, talent_token):
        rc, tc = _c(recruiter_token), _c(talent_token)
        before = tc.get(f"{BASE_URL}/api/notifications", timeout=30)
        assert before.status_code == 200, before.text[:300]
        before_ids = {n.get("id") for n in before.json()["items"]}
        pid = rc.post(f"{BASE_URL}/api/pools", json={"name": "TEST_Notify_Pool"}, timeout=30).json()["id"]
        TestPools.created.append((recruiter_token, pid))
        ar = rc.post(f"{BASE_URL}/api/pools/{pid}/candidates", json={"candidate_slug": "priya-shah"}, timeout=30)
        assert ar.status_code == 200
        after = tc.get(f"{BASE_URL}/api/notifications", timeout=30).json()["items"]
        new = [n for n in after if n.get("id") not in before_ids]
        pool_notifs = [n for n in new if (n.get("kind") or n.get("type")) == "pool"]
        assert pool_notifs, f"no 'pool' notification created; new={new[:3]}"
        assert "TEST_Notify_Pool" in (pool_notifs[0].get("body") or "")

    def test_pool_404_unknown_id(self, recruiter_token):
        c = _c(recruiter_token)
        assert c.get(f"{BASE_URL}/api/pools/does-not-exist", timeout=30).status_code == 404

    def test_zz_cleanup(self):
        for tok, pid in list(TestPools.created):
            r = _c(tok).delete(f"{BASE_URL}/api/pools/{pid}", timeout=30)
            assert r.status_code in (200, 204, 404)
        TestPools.created.clear()


# ---------- Regression ----------
class TestRegression:
    def test_shortlist_separate(self, recruiter_token):
        c = _c(recruiter_token)
        r = c.get(f"{BASE_URL}/api/shortlist", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_jobs_search(self):
        r = requests.get(f"{BASE_URL}/api/seo/jobs", timeout=45)
        assert r.status_code == 200
        assert len(r.json()) > 0

    def test_careers_and_skills_hubs(self):
        for u in ("/api/seo/careers", "/api/seo/skills"):
            r = requests.get(f"{BASE_URL}{u}", timeout=45)
            assert r.status_code == 200, f"{u} -> {r.status_code}"
            assert len(r.json()) > 0
