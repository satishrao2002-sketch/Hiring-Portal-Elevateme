"""Iteration 10 — security authz (talent dashboard, shortlist), brute-force lockout,
talent pools + admin regression, and AI crawlability endpoints."""
import os
import time
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

CREDS = {
    "admin": ("admin@elevateme.com", "Admin@123"),
    "employer": ("employer@elevateme.com", "Demo@123"),
    "recruiter": ("recruiter@elevateme.com", "Demo@123"),
    "talent": ("talent@elevateme.com", "Demo@123"),
}


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(client, role):
    email, pwd = CREDS[role]
    r = client.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pwd}, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Login failed for {role}: {r.status_code} {r.text[:300]}")
    data = r.json()
    assert data["user"]["email"] == email
    assert data["user"]["role"] == role
    return data["token"]


@pytest.fixture(scope="session")
def tokens(client):
    return {role: _login(client, role) for role in CREDS}


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth sanity: all 4 demo accounts still log in ----------
class TestLoginSanity:
    @pytest.mark.parametrize("role", list(CREDS))
    def test_demo_accounts_login(self, client, role):
        token = _login(client, role)
        me = client.get(f"{BASE_URL}/api/auth/me", headers=H(token), timeout=30)
        assert me.status_code == 200
        body = me.json()
        assert body["email"] == CREDS[role][0]
        assert "password_hash" not in body
        assert "_id" not in body


# ---------- SECURITY: /api/talent/dashboard requires auth + role scoping ----------
class TestTalentDashboardAuthz:
    def test_no_token_401(self, client):
        r = client.get(f"{BASE_URL}/api/talent/dashboard", timeout=30)
        assert r.status_code == 401, r.text[:300]

    def test_talent_gets_own_profile(self, client, tokens):
        r = client.get(f"{BASE_URL}/api/talent/dashboard", headers=H(tokens["talent"]), timeout=60)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        cand = data.get("candidate") or data.get("profile") or {}
        blob = str(data)
        assert "priya-shah" in blob or cand.get("slug") == "priya-shah", blob[:300]
        assert '"_id"' not in blob  # no mongo ObjectId leak

    def test_talent_cannot_override_slug(self, client, tokens):
        r = client.get(f"{BASE_URL}/api/talent/dashboard", params={"slug": "marcus-johnson"},
                       headers=H(tokens["talent"]), timeout=60)
        assert r.status_code == 200
        assert "priya-shah" in str(r.json())

    @pytest.mark.parametrize("role", ["employer", "recruiter"])
    def test_non_talent_403(self, client, tokens, role):
        r = client.get(f"{BASE_URL}/api/talent/dashboard", headers=H(tokens[role]), timeout=30)
        assert r.status_code == 403, r.text[:300]

    def test_admin_200(self, client, tokens):
        r = client.get(f"{BASE_URL}/api/talent/dashboard", headers=H(tokens["admin"]), timeout=60)
        assert r.status_code == 200, r.text[:300]


# ---------- SECURITY: /api/shortlist restricted to employer/recruiter/admin ----------
class TestShortlistAuthz:
    SLUG = "priya-shah"

    def test_no_token_401(self, client):
        assert client.get(f"{BASE_URL}/api/shortlist", timeout=30).status_code == 401
        assert client.post(f"{BASE_URL}/api/shortlist", json={"candidate_slug": self.SLUG},
                           timeout=30).status_code == 401

    def test_talent_forbidden(self, client, tokens):
        r = client.post(f"{BASE_URL}/api/shortlist", json={"candidate_slug": self.SLUG},
                        headers=H(tokens["talent"]), timeout=30)
        assert r.status_code == 403, r.text[:300]
        assert client.get(f"{BASE_URL}/api/shortlist", headers=H(tokens["talent"]),
                          timeout=30).status_code == 403
        assert client.delete(f"{BASE_URL}/api/shortlist/{self.SLUG}", headers=H(tokens["talent"]),
                             timeout=30).status_code == 403

    def test_employer_crud_and_persistence(self, client, tokens):
        h = H(tokens["employer"])
        post = client.post(f"{BASE_URL}/api/shortlist",
                           json={"candidate_slug": self.SLUG, "note": "TEST_note"}, headers=h, timeout=30)
        assert post.status_code == 200, post.text[:300]
        get = client.get(f"{BASE_URL}/api/shortlist", headers=h, timeout=30)
        assert get.status_code == 200
        items = get.json()
        assert isinstance(items, list)
        assert any(str(i).find(self.SLUG) >= 0 for i in items), items
        d = client.delete(f"{BASE_URL}/api/shortlist/{self.SLUG}", headers=h, timeout=30)
        assert d.status_code == 200, d.text[:300]
        after = client.get(f"{BASE_URL}/api/shortlist", headers=h, timeout=30).json()
        assert not any(str(i).find(self.SLUG) >= 0 for i in after), after


# ---------- SECURITY: brute-force lockout (throwaway emails only) ----------
class TestBruteForceLockout:
    def test_lockout_after_five_failures(self, client):
        email = f"TEST_bf_{uuid.uuid4().hex[:10]}@example.com"
        codes = []
        for _ in range(6):
            r = client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": email, "password": "WrongPass!123"}, timeout=30)
            codes.append(r.status_code)
            time.sleep(0.2)
        assert codes[:5] == [401] * 5, codes
        assert codes[5] == 429, codes

    def test_lockout_does_not_block_other_accounts(self, client):
        email = f"TEST_bf_{uuid.uuid4().hex[:10]}@example.com"
        for _ in range(6):
            client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": email, "password": "Nope!123"}, timeout=30)
        r = client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": CREDS["recruiter"][0], "password": CREDS["recruiter"][1]}, timeout=30)
        assert r.status_code == 200, r.text[:300]

    def test_wrong_password_real_account_recoverable(self, client):
        """3 wrong attempts (below threshold) then correct login must clear the counter."""
        email, pwd = CREDS["employer"]
        for _ in range(3):
            r = client.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "Bad!123"}, timeout=30)
            assert r.status_code == 401, r.text[:200]
        ok = client.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pwd}, timeout=30)
        assert ok.status_code == 200, ok.text[:300]


# ---------- REGRESSION: talent pools ----------
class TestPoolsRegression:
    def test_employer_pool_flow(self, client, tokens):
        h = H(tokens["employer"])
        created = client.post(f"{BASE_URL}/api/pools", json={"name": "TEST_pool_it10"}, headers=h, timeout=30)
        assert created.status_code == 200, created.text[:300]
        pool = created.json()
        pid = pool["id"]
        assert pool["name"] == "TEST_pool_it10"
        assert pool["count"] == 0
        add = client.post(f"{BASE_URL}/api/pools/{pid}/candidates",
                          json={"candidate_slug": "priya-shah"}, headers=h, timeout=30)
        assert add.status_code == 200, add.text[:300]
        listed = client.get(f"{BASE_URL}/api/pools", headers=h, timeout=30)
        assert listed.status_code == 200
        mine = [p for p in listed.json() if p["id"] == pid]
        assert mine and mine[0]["count"] == 1, listed.json()
        assert client.delete(f"{BASE_URL}/api/pools/{pid}", headers=h, timeout=30).status_code == 200

    def test_talent_forbidden_on_pool_writes(self, client, tokens):
        h = H(tokens["talent"])
        r = client.post(f"{BASE_URL}/api/pools", json={"name": "TEST_nope"}, headers=h, timeout=30)
        assert r.status_code == 403, r.text[:300]
        r2 = client.post(f"{BASE_URL}/api/pools/anything/candidates",
                         json={"candidate_slug": "priya-shah"}, headers=h, timeout=30)
        assert r2.status_code == 403, r2.text[:300]

    def test_pools_requires_auth(self, client):
        assert client.get(f"{BASE_URL}/api/pools", timeout=30).status_code == 401


# ---------- REGRESSION: admin endpoints ----------
class TestAdminRegression:
    @pytest.mark.parametrize("path", ["/api/admin/command-center", "/api/admin/employers"])
    def test_admin_ok(self, client, tokens, path):
        r = client.get(f"{BASE_URL}{path}", headers=H(tokens["admin"]), timeout=60)
        assert r.status_code == 200, r.text[:300]
        assert "_id" not in str(r.json())

    @pytest.mark.parametrize("path", ["/api/admin/command-center", "/api/admin/employers"])
    @pytest.mark.parametrize("role", ["employer", "talent", "recruiter"])
    def test_non_admin_403(self, client, tokens, path, role):
        r = client.get(f"{BASE_URL}{path}", headers=H(tokens[role]), timeout=30)
        assert r.status_code == 403, f"{role} {path} -> {r.status_code}"

    @pytest.mark.parametrize("path", ["/api/admin/command-center", "/api/admin/employers"])
    def test_no_token_401(self, client, path):
        assert client.get(f"{BASE_URL}{path}", timeout=30).status_code == 401


# ---------- CRAWLABILITY ----------
class TestCrawlability:
    def test_llms_txt(self, client):
        r = client.get(f"{BASE_URL}/llms.txt", timeout=30)
        assert r.status_code == 200, r.status_code
        assert "text/plain" in r.headers.get("content-type", ""), r.headers.get("content-type")
        assert "ElevateMe" in r.text
        # links present (llms.txt uses site-relative markdown links)
        assert "](/" in r.text or "http" in r.text
        assert "/sitemap.xml" in r.text

    def test_og_image(self, client):
        r = client.get(f"{BASE_URL}/og-image.jpg", timeout=30)
        assert r.status_code == 200, r.status_code
        assert "image/jpeg" in r.headers.get("content-type", ""), r.headers.get("content-type")
        assert len(r.content) > 1000

    def test_root_html_meta(self, client):
        r = client.get(f"{BASE_URL}/", timeout=30)
        assert r.status_code == 200
        html = r.text
        assert 'name="description"' in html, "missing meta description"
        assert 'property="og:image"' in html or "og:image" in html, "missing og:image"
        assert 'application/ld+json' in html, "missing JSON-LD"

    def test_robots_file_exists(self):
        p = "/app/frontend/public/robots.txt"
        assert os.path.exists(p)
        content = open(p).read()
        assert "User-agent" in content
        assert "Sitemap" in content
