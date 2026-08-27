"""Iteration 8 — light auth sanity regression (bearer-token auth per test_credentials.md)."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env["REACT_APP_BACKEND_URL"]).rstrip("/")

ACCOUNTS = [
    ("admin@elevateme.com", "Admin@123", "admin"),
    ("employer@elevateme.com", "Demo@123", "employer"),
    ("talent@elevateme.com", "Demo@123", "talent"),
    ("recruiter@elevateme.com", "Demo@123", "recruiter"),
]


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.mark.parametrize("email,password,role", ACCOUNTS)
def test_login_and_me(api, email, password, role):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"{email} -> {r.status_code}: {r.text[:200]}"
    d = r.json()
    token = d.get("token")
    assert isinstance(token, str) and token
    assert d["user"]["email"] == email
    assert d["user"]["role"] == role
    me = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_login_wrong_password(api):
    r = api.post(f"{BASE_URL}/api/auth/login",
                 json={"email": "talent@elevateme.com", "password": "wrong-pass-123"})
    assert r.status_code in (400, 401, 403, 429), r.status_code


def test_me_without_token(api):
    r = api.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code in (401, 403), r.status_code
