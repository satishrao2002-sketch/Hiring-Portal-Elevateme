import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

JWT_ALGORITHM = "HS256"
VALID_ROLES = {"talent", "recruiter", "employer", "admin"}


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: str = "talent"


class LoginInput(BaseModel):
    email: EmailStr
    password: str


def build_auth_router(db):
    router = APIRouter(prefix="/api/auth", tags=["auth"])

    async def _current_user(request: Request) -> dict:
        auth_header = request.headers.get("Authorization", "")
        token = auth_header[7:] if auth_header.startswith("Bearer ") else request.cookies.get("access_token")
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

    @router.post("/register")
    async def register(body: RegisterInput):
        email = body.email.lower()
        role = body.role if body.role in VALID_ROLES else "talent"
        if await db.users.find_one({"email": email}):
            raise HTTPException(status_code=400, detail="An account with this email already exists")
        import uuid
        uid = str(uuid.uuid4())
        doc = {
            "id": uid,
            "email": email,
            "password_hash": hash_password(body.password),
            "name": body.name,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "candidate_id": None,
            "company_id": None,
        }
        await db.users.insert_one(doc)
        token = create_access_token(uid, email, role)
        return {"token": token, "user": {"id": uid, "email": email, "name": body.name, "role": role}}

    @router.post("/login")
    async def login(body: LoginInput, request: Request):
        email = body.email.lower()
        fwd = request.headers.get("x-forwarded-for", "")
        ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")
        identifier = f"{ip}:{email}"
        now = datetime.now(timezone.utc)
        window = timedelta(minutes=15)

        def _parse(dt):
            return datetime.fromisoformat(dt) if isinstance(dt, str) else dt

        # Brute-force lockout: 5 failed attempts within a 15-min window => 15 min lock.
        record = await db.login_attempts.find_one({"identifier": identifier})
        prev_count = 0
        if record:
            locked_until = _parse(record.get("locked_until"))
            if locked_until and locked_until > now:
                retry = int((locked_until - now).total_seconds() / 60) + 1
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many failed login attempts. Try again in {retry} minute(s).",
                )
            # Carry forward the count only if the last attempt is still inside the
            # window and there is no expired lock; otherwise start fresh.
            last_attempt = _parse(record.get("last_attempt"))
            if not locked_until and last_attempt and (now - last_attempt) <= window:
                prev_count = record.get("count", 0)

        user = await db.users.find_one({"email": email})
        if not user or not verify_password(body.password, user["password_hash"]):
            attempts = prev_count + 1
            update = {"identifier": identifier, "count": attempts, "last_attempt": now.isoformat()}
            op = {"$set": update}
            if attempts >= 5:
                update["locked_until"] = (now + window).isoformat()
            else:
                op["$unset"] = {"locked_until": ""}
            await db.login_attempts.update_one({"identifier": identifier}, op, upsert=True)
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # success: clear any failed-attempt record
        await db.login_attempts.delete_one({"identifier": identifier})
        token = create_access_token(user["id"], email, user["role"])
        return {
            "token": token,
            "user": {
                "id": user["id"], "email": email, "name": user["name"], "role": user["role"],
                "candidate_id": user.get("candidate_id"), "company_id": user.get("company_id"),
            },
        }

    @router.get("/me")
    async def me(user: dict = Depends(_current_user)):
        return user

    return router, _current_user


async def seed_admin(db):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@elevateme.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        import uuid
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email,
            "password_hash": hash_password(admin_password), "name": "ElevateMe Admin",
            "role": "admin", "created_at": datetime.now(timezone.utc).isoformat(),
            "candidate_id": None, "company_id": None,
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
