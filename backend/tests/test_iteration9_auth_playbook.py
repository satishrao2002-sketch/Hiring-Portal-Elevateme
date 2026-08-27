"""Iteration 9: auth playbook spot-checks + pool role-boundary observation."""
import os
import asyncio
import pytest
import requests
from dotenv import dotenv_values

fe = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or fe["REACT_APP_BACKEND_URL"]).rstrip("/")


def test_bcrypt_hash_format():
    from motor.motor_asyncio import AsyncIOMotorClient
    be = dotenv_values("/app/backend/.env")

    async def go():
        cli = AsyncIOMotorClient(be["MONGO_URL"])
        db = cli[be["DB_NAME"]]
        u = await db.users.find_one({"email": "recruiter@elevateme.com"})
        cli.close()
        return u

    u = asyncio.run(go())
    assert u, "recruiter user missing in DB"
    h = u.get("password_hash") or u.get("password") or ""
    assert h.startswith("$2b$"), f"password hash not bcrypt $2b$: {h[:8]}"


def test_login_sets_cookie_or_bearer_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "recruiter@elevateme.com", "password": "Demo@123"}, timeout=30)
    assert r.status_code == 200
    assert r.json().get("token"), "no bearer token"
    print("Set-Cookie:", r.headers.get("set-cookie"))


def test_brute_force_lockout():
    codes = []
    for _ in range(7):
        rr = requests.post(f"{BASE_URL}/api/auth/login",
                           json={"email": "recruiter@elevateme.com", "password": "wrong-pw"}, timeout=30)
        codes.append(rr.status_code)
    assert 429 in codes or 423 in codes, f"no brute-force lockout; codes={codes}"


def test_pools_role_boundary_talent():
    """Observation: pools are an employer/recruiter feature; talent role should not create pools."""
    tok = requests.post(f"{BASE_URL}/api/auth/login",
                        json={"email": "talent@elevateme.com", "password": "Demo@123"}, timeout=30).json()["token"]
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {tok}"})
    r = s.post(f"{BASE_URL}/api/pools", json={"name": "TEST_talent_pool"}, timeout=30)
    if r.status_code == 200:
        s.delete(f"{BASE_URL}/api/pools/{r.json()['id']}", timeout=30)
    assert r.status_code == 403, f"talent role allowed to create a pool (got {r.status_code})"
