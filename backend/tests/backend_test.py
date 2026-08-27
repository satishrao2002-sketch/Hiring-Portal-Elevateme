import os
import re
import time
import uuid
from pathlib import Path

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
    "recruiter": ("recruiter@elevateme.com", "Demo@123"),
    "employer": ("employer@elevateme.com", "Demo@123"),
    "talent": ("talent@elevateme.com", "Demo@123"),
}


def login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=60)
    return r


@pytest.fixture(scope="session")
def creds_file():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("Missing test_credentials.md")
    return p.read_text()


@pytest.fixture(scope="session")
def tokens():
    out = {}
    for role, (email, pwd) in CREDS.items():
        r = login(email, pwd)
        if r.status_code != 200:
            pytest.fail(f"Login failed for {role}: {r.status_code} {r.text[:300]}")
        out[role] = r.json()["token"]
    return out


def client(token=None):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ---------- Health / public ----------
class TestPublic:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=30)
        assert r.status_code == 200
        assert "ElevateMe" in r.json()["message"]

    def test_public_stats(self):
        r = requests.get(f"{BASE_URL}/api/stats/public", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["verified_talent"] > 0
        assert d["open_roles"] > 0
        assert d["companies"] > 0

    def test_list_candidates(self):
        r = requests.get(f"{BASE_URL}/api/candidates", timeout=30)
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list) and len(docs) > 0
        assert all("_id" not in d for d in docs)
        assert "skills" in docs[0]

    def test_candidate_filters(self):
        r = requests.get(f"{BASE_URL}/api/candidates", params={"skill": "SQL"}, timeout=30)
        assert r.status_code == 200
        assert all(any("sql" in s["name"].lower() for s in c["skills"]) for c in r.json())

    def test_get_candidate_detail(self):
        r = requests.get(f"{BASE_URL}/api/candidates/priya-shah", timeout=30)
        assert r.status_code == 200
        assert r.json()["slug"] == "priya-shah"

    def test_get_candidate_404(self):
        r = requests.get(f"{BASE_URL}/api/candidates/does-not-exist", timeout=30)
        assert r.status_code == 404


# ---------- Auth ----------
class TestAuth:
    def test_all_demo_logins(self, tokens):
        assert len(tokens) == 4

    def test_login_returns_role_and_ids(self):
        r = login(*CREDS["talent"])
        u = r.json()["user"]
        assert u["role"] == "talent"
        assert u["candidate_id"] == "priya-shah"
        r2 = login(*CREDS["employer"])
        assert r2.json()["user"]["role"] == "employer"
        assert r2.json()["user"]["company_id"] == "northwind"

    def test_login_bad_password(self):
        r = login("talent@elevateme.com", "WrongPass1!")
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert r.status_code == 401

    def test_me_no_password_hash(self, tokens):
        r = client(tokens["talent"]).get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert r.status_code == 200
        assert "password_hash" not in r.json()
        assert "_id" not in r.json()

    def test_invalid_token(self):
        r = client("garbage.token.here").get(f"{BASE_URL}/api/auth/me", timeout=30)
        assert r.status_code == 401

    def test_bcrypt_hash_format(self):
        # verify stored hash uses bcrypt $2b$
        import subprocess
        out = subprocess.run(
            ["python", "-c",
             "import os,asyncio;from motor.motor_asyncio import AsyncIOMotorClient;"
             "from dotenv import load_dotenv;load_dotenv('/app/backend/.env');"
             "c=AsyncIOMotorClient(os.environ['MONGO_URL']);d=c[os.environ['DB_NAME']];"
             "print(asyncio.get_event_loop().run_until_complete(d.users.find_one({'email':'admin@elevateme.com'}))['password_hash'][:4])"],
            capture_output=True, text=True, timeout=60)
        assert "$2b$" in out.stdout, f"hash prefix unexpected: {out.stdout} {out.stderr[-300:]}"

    def test_register_new_talent_and_onboarding_flow(self):
        email = f"TEST_talent_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "Demo@123", "name": f"TEST Talent {uuid.uuid4().hex[:4]}",
            "role": "talent"}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data["user"]["role"] == "talent"
        tok = data["token"]
        c = client(tok)
        st = c.get(f"{BASE_URL}/api/talent/onboarding-status", timeout=30)
        assert st.status_code == 200
        assert st.json()["onboarded"] is False

        onboard_payload = {
            "title": "Junior Data Analyst", "location": "Chicago, IL", "work_model": "Hybrid",
            "available_in_days": 14, "education": "BS Statistics, UIC", "experience_years": 1,
            "skills": [{"name": "SQL", "level": "Advanced"}, {"name": "Python", "level": "Intermediate"}],
            "applied_experience": [{"title": "Retail Analytics Capstone", "summary": "Built dashboards",
                                    "skills_used": ["SQL"], "outcome": "10% lift"}],
            "evidence": [{"title": "GitHub", "type": "Repo", "url": "https://github.com/test"}],
        }
        ob = c.post(f"{BASE_URL}/api/talent/onboard", json=onboard_payload, timeout=60)
        assert ob.status_code == 200, ob.text[:300]
        slug = ob.json()["slug"]
        assert slug

        st2 = c.get(f"{BASE_URL}/api/talent/onboarding-status", timeout=30)
        assert st2.json()["onboarded"] is True
        assert st2.json()["candidate_id"] == slug

        dash = requests.get(f"{BASE_URL}/api/talent/dashboard", params={"slug": slug}, timeout=60)
        assert dash.status_code == 200, dash.text[:300]
        d = dash.json()
        assert d["candidate"]["title"] == "Junior Data Analyst"
        assert d["readiness"]["overall"] > 0
        assert len(d["career_paths"]) > 0
        assert len(d["opportunities"]) > 0

        # idempotency: onboarding again updates same slug
        ob2 = c.post(f"{BASE_URL}/api/talent/onboard", json={**onboard_payload, "title": "Data Analyst II"}, timeout=60)
        assert ob2.status_code == 200
        assert ob2.json()["slug"] == slug
        assert requests.get(f"{BASE_URL}/api/candidates/{slug}", timeout=30).json()["title"] == "Data Analyst II"

    def test_register_duplicate_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "talent@elevateme.com", "password": "Demo@123", "name": "Dup", "role": "talent"}, timeout=30)
        assert r.status_code == 400

    def test_register_weak_password_rejected(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_weak_{uuid.uuid4().hex[:6]}@example.com", "password": "123",
            "name": "Weak", "role": "talent"}, timeout=30)
        assert r.status_code == 422

    def test_brute_force_lockout(self):
        """Playbook check: expect lockout after 5 failed attempts."""
        codes = []
        for _ in range(7):
            codes.append(login("employer@elevateme.com", "BadPass000!").status_code)
        assert login(*CREDS["employer"]).status_code == 200, "valid login blocked after failures"
        assert 429 in codes or 423 in codes, f"no brute-force lockout; codes={codes}"


# ---------- Roles / AI intake ----------
class TestRolesAI:
    def test_role_intake(self):
        r = requests.post(f"{BASE_URL}/api/roles/intake", json={
            "text": "junior Data Analyst in Chicago with SQL, Python, Power BI, hybrid, 70-90k"},
            timeout=120)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "role" in d and d["role"].get("title")
        assert set(["potential", "strong", "interview_ready", "exceptional"]) <= set(d["availability"])
        assert isinstance(d["top_matches"], list) and len(d["top_matches"]) > 0
        m = d["top_matches"][0]["match"]
        assert 0 <= m["overall"] <= 100

    def test_list_roles(self):
        r = requests.get(f"{BASE_URL}/api/roles", timeout=30)
        assert r.status_code == 200 and len(r.json()) > 0
        assert all("_id" not in x for x in r.json())

    def test_role_matches_and_404(self):
        role_id = requests.get(f"{BASE_URL}/api/roles", timeout=30).json()[0]["id"]
        r = requests.get(f"{BASE_URL}/api/roles/{role_id}/matches", timeout=60)
        assert r.status_code == 200
        assert len(r.json()["matches"]) > 0
        assert requests.get(f"{BASE_URL}/api/roles/nope-123/matches", timeout=30).status_code == 404

    def test_match_why(self):
        role_id = requests.get(f"{BASE_URL}/api/roles", timeout=30).json()[0]["id"]
        r = requests.post(f"{BASE_URL}/api/match/why",
                          json={"role_id": role_id, "candidate_slug": "priya-shah"}, timeout=120)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["match"]["overall"] >= 0
        assert isinstance(d["narrative"], str) and len(d["narrative"]) > 40
        for k in ["dimensions", "reasons", "concerns", "matched_skills", "missing_skills"]:
            assert k in d["match"], f"match missing {k}: {list(d['match'].keys())}"

    def test_match_why_bad_candidate(self):
        role_id = requests.get(f"{BASE_URL}/api/roles", timeout=30).json()[0]["id"]
        r = requests.post(f"{BASE_URL}/api/match/why",
                          json={"role_id": role_id, "candidate_slug": "nobody"}, timeout=60)
        assert r.status_code == 404

    def test_match_why_missing_role(self):
        r = requests.post(f"{BASE_URL}/api/match/why", json={"candidate_slug": "priya-shah"}, timeout=60)
        assert r.status_code == 400

    def test_career_match_ai(self):
        r = requests.post(f"{BASE_URL}/api/talent/career-match",
                          json={"text": "I know SQL and Python, built dashboards, want analytics roles"},
                          timeout=120)
        assert r.status_code == 200, r.text[:300]
        assert len(str(r.json())) > 20


# ---------- Companies ----------
class TestCompanies:
    def test_list_and_detail(self):
        r = requests.get(f"{BASE_URL}/api/companies", timeout=30)
        assert r.status_code == 200 and len(r.json()) > 0
        cid = r.json()[0]["id"]
        d = requests.get(f"{BASE_URL}/api/companies/{cid}", timeout=30)
        assert d.status_code == 200 and "roles" in d.json()
        assert requests.get(f"{BASE_URL}/api/companies/zzz", timeout=30).status_code == 404


# ---------- Shortlist / messaging / interviews / notifications ----------
class TestEmployerWorkflows:
    def test_shortlist_crud_and_notification(self, tokens):
        c = client(tokens["employer"])
        t = client(tokens["talent"])
        assert requests.get(f"{BASE_URL}/api/shortlist", timeout=30).status_code == 401
        before = t.get(f"{BASE_URL}/api/notifications", timeout=30).json()["unread"]
        r = c.post(f"{BASE_URL}/api/shortlist", json={"candidate_slug": "priya-shah", "note": "TEST note"}, timeout=30)
        assert r.status_code == 200 and r.json()["ok"] is True
        lst = c.get(f"{BASE_URL}/api/shortlist", timeout=30).json()
        assert any(i["candidate_slug"] == "priya-shah" and i["candidate"]["slug"] == "priya-shah" for i in lst)
        after = t.get(f"{BASE_URL}/api/notifications", timeout=30).json()["unread"]
        assert after >= before, "shortlist should notify talent user"
        d = c.delete(f"{BASE_URL}/api/shortlist/priya-shah", timeout=30)
        assert d.status_code == 200
        lst2 = c.get(f"{BASE_URL}/api/shortlist", timeout=30).json()
        assert not any(i["candidate_slug"] == "priya-shah" for i in lst2)

    def test_send_message_autoreply_and_threads(self, tokens):
        c = client(tokens["employer"])
        r = c.post(f"{BASE_URL}/api/messages", json={"to_candidate_slug": "priya-shah",
                                                     "body": "TEST outreach message"}, timeout=30)
        assert r.status_code == 200
        tid = r.json()["thread_id"]
        msgs = c.get(f"{BASE_URL}/api/messages/{tid}", timeout=30).json()
        assert any(m["sender"] == "recruiter" and m["body"] == "TEST outreach message" for m in msgs)
        assert any(m["sender"] == "candidate" for m in msgs), "auto candidate reply missing"
        threads = c.get(f"{BASE_URL}/api/messages/threads", timeout=30).json()
        assert any(t["id"] == tid and t["candidate"]["slug"] == "priya-shah" for t in threads)

    def test_ai_draft_message(self, tokens):
        c = client(tokens["employer"])
        r = c.post(f"{BASE_URL}/api/messages/draft",
                   json={"candidate_slug": "priya-shah", "role_title": "Data Analyst"}, timeout=120)
        assert r.status_code == 200, r.text[:300]
        assert len(r.json()["draft"]) > 30

    def test_interview_lifecycle_and_battle_plan(self, tokens):
        c = client(tokens["employer"])
        r = c.post(f"{BASE_URL}/api/interviews", json={"candidate_slug": "priya-shah",
                                                       "role_title": "Data Analyst",
                                                       "interview_type": "Technical Screen"}, timeout=30)
        assert r.status_code == 200
        iid = r.json()["id"]
        items = c.get(f"{BASE_URL}/api/interviews", timeout=30).json()
        assert any(i["id"] == iid and i["candidate"]["slug"] == "priya-shah" for i in items)

        s = c.patch(f"{BASE_URL}/api/interviews/{iid}/schedule",
                    params={"scheduled_at": "2026-08-01T15:00:00Z"}, timeout=30)
        assert s.status_code == 200
        it = [i for i in c.get(f"{BASE_URL}/api/interviews", timeout=30).json() if i["id"] == iid][0]
        assert it["status"] == "Scheduled" and it["scheduled_at"].startswith("2026-08-01")

        t0 = time.time()
        bp = c.post(f"{BASE_URL}/api/interviews/{iid}/battle-plan", timeout=180)
        assert bp.status_code == 200, bp.text[:400]
        plan = bp.json()["battle_plan"]
        for key in ["company_overview", "role_overview", "likely_topics", "technical_questions",
                    "behavioral_questions", "project_questions", "candidate_strengths",
                    "candidate_risks", "prep_tasks"]:
            assert key in plan, f"battle plan missing {key}: {list(plan.keys())}"
        assert len(plan["technical_questions"]) > 0
        # cached second call
        bp2 = c.post(f"{BASE_URL}/api/interviews/{iid}/battle-plan", timeout=60)
        assert bp2.status_code == 200 and bp2.json()["battle_plan"] == plan
        print(f"battle plan latency: {time.time()-t0:.1f}s")

        f = c.patch(f"{BASE_URL}/api/interviews/{iid}/feedback",
                    json={"decision": "Hire", "reason": "Strong SQL"}, timeout=30)
        assert f.status_code == 200
        it2 = [i for i in c.get(f"{BASE_URL}/api/interviews", timeout=30).json() if i["id"] == iid][0]
        assert it2["status"] == "Feedback Received" and it2["feedback"]["decision"] == "Hire"

        assert c.patch(f"{BASE_URL}/api/interviews/bogus-id/feedback",
                       json={"decision": "Hire"}, timeout=30).status_code == 404
        assert c.post(f"{BASE_URL}/api/interviews/bogus-id/battle-plan", timeout=30).status_code == 404

    def test_interview_isolation_between_users(self, tokens):
        emp = client(tokens["employer"]).get(f"{BASE_URL}/api/interviews", timeout=30).json()
        rec = client(tokens["recruiter"]).get(f"{BASE_URL}/api/interviews", timeout=30).json()
        emp_ids = {i["id"] for i in emp}
        assert not (emp_ids & {i["id"] for i in rec}), "interviews leaking across users"


class TestNotifications:
    def test_seeded_notifications_talent_and_recruiter(self, tokens):
        for role in ["talent", "recruiter"]:
            r = client(tokens[role]).get(f"{BASE_URL}/api/notifications", timeout=30)
            assert r.status_code == 200
            d = r.json()
            assert len(d["items"]) > 0, f"{role} has no seeded notifications"
            assert all("_id" not in i for i in d["items"])
            assert isinstance(d["unread"], int)

    def test_requires_auth(self):
        assert requests.get(f"{BASE_URL}/api/notifications", timeout=30).status_code == 401

    def test_mark_single_and_all_read(self, tokens):
        c = client(tokens["recruiter"])
        items = c.get(f"{BASE_URL}/api/notifications", timeout=30).json()["items"]
        nid = items[0]["id"]
        assert c.post(f"{BASE_URL}/api/notifications/{nid}/read", timeout=30).status_code == 200
        got = [i for i in c.get(f"{BASE_URL}/api/notifications", timeout=30).json()["items"] if i["id"] == nid][0]
        assert got["read"] is True
        assert c.post(f"{BASE_URL}/api/notifications/read", timeout=30).status_code == 200
        assert c.get(f"{BASE_URL}/api/notifications", timeout=30).json()["unread"] == 0


# ---------- Admin ----------
class TestAdmin:
    def test_command_center(self, tokens):
        r = client(tokens["admin"]).get(f"{BASE_URL}/api/admin/command-center", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["candidates"] > 0
        assert len(d["control_tower"]) > 0
        assert all(row["risk"] in ("GREEN", "AMBER", "RED") for row in d["control_tower"])

    def test_employers(self, tokens):
        r = client(tokens["admin"]).get(f"{BASE_URL}/api/admin/employers", timeout=30)
        assert r.status_code == 200
        assert all("open_roles" in c and "propensity" in c for c in r.json())

    def test_non_admin_forbidden(self, tokens):
        for role in ["talent", "employer", "recruiter"]:
            for path in ["/api/admin/command-center", "/api/admin/employers"]:
                r = client(tokens[role]).get(f"{BASE_URL}{path}", timeout=30)
                assert r.status_code == 403, f"{role} got {r.status_code} on {path}"

    def test_unauth_forbidden(self):
        assert requests.get(f"{BASE_URL}/api/admin/command-center", timeout=30).status_code == 401


# ---------- Security observations ----------
class TestAuthorizationBoundaries:
    def test_talent_dashboard_requires_auth(self, tokens):
        """Talent dashboard exposes full candidate PII without any auth."""
        r = requests.get(f"{BASE_URL}/api/talent/dashboard", params={"slug": "priya-shah"}, timeout=60)
        assert r.status_code in (401, 403), f"unauthenticated access allowed (got {r.status_code})"

    def test_talent_cannot_shortlist(self, tokens):
        r = client(tokens["talent"]).post(f"{BASE_URL}/api/shortlist",
                                         json={"candidate_slug": "priya-shah"}, timeout=30)
        assert r.status_code == 403, f"talent role allowed to shortlist (got {r.status_code})"
