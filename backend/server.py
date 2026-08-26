from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from auth import build_auth_router, seed_admin
import seed_data
from matching import compute_match, rank_candidates
import ai_service

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="ElevateMe API")
api = APIRouter(prefix="/api")

auth_router, current_user = build_auth_router(db)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("elevateme")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def require_role(*roles):
    async def dep(user: dict = Depends(current_user)):
        if roles and user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Not authorized for this action")
        return user
    return dep


# ---------- Public / candidates ----------
@api.get("/")
async def root():
    return {"message": "ElevateMe Talent Intelligence API"}


@api.get("/stats/public")
async def public_stats():
    return {
        "verified_talent": await db.candidates.count_documents({}),
        "open_roles": await db.roles.count_documents({}),
        "companies": await db.companies.count_documents({}),
        "avg_time_to_first_interview_days": 6,
        "placement_rate": 78,
    }


@api.get("/candidates")
async def list_candidates(q: Optional[str] = None, skill: Optional[str] = None,
                          location: Optional[str] = None, ready: Optional[bool] = None):
    query = {}
    if skill:
        query["skills.name"] = {"$regex": skill, "$options": "i"}
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if ready is not None:
        query["interview_ready"] = ready
    docs = await db.candidates.find(query, {"_id": 0}).to_list(200)
    if q:
        ql = q.lower()
        docs = [d for d in docs if ql in d["name"].lower() or ql in d["title"].lower()
                or any(ql in s["name"].lower() for s in d["skills"])]
    return docs


@api.get("/candidates/{slug}")
async def get_candidate(slug: str):
    doc = await db.candidates.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return doc


# ---------- Roles & AI intake ----------
class IntakeInput(BaseModel):
    text: str
    save: bool = False
    company_id: Optional[str] = None


@api.post("/roles/intake")
async def role_intake(body: IntakeInput):
    structured = await ai_service.parse_role_intake(body.text)
    candidates = await db.candidates.find({}, {"_id": 0}).to_list(200)
    ranked = rank_candidates(structured, candidates)
    strong = [r for r in ranked if r["match"]["overall"] >= 85]
    ready = [r for r in strong if r["candidate"]["interview_ready"]]
    exceptional = [r for r in ranked if r["match"]["overall"] >= 92]
    role_id = None
    if body.save:
        role_id = f"role-{uuid.uuid4().hex[:8]}"
        doc = {**structured, "id": role_id, "company_id": body.company_id,
               "status": "Open", "created_at": now_iso()}
        await db.roles.insert_one(doc)
    return {
        "role": structured,
        "role_id": role_id,
        "availability": {
            "potential": len(ranked),
            "strong": len(strong),
            "interview_ready": len(ready),
            "exceptional": len(exceptional),
        },
        "top_matches": [
            {"candidate": r["candidate"], "match": r["match"]} for r in ranked[:6]
        ],
    }


@api.get("/roles")
async def list_roles(company_id: Optional[str] = None):
    q = {"company_id": company_id} if company_id else {}
    return await db.roles.find(q, {"_id": 0}).to_list(100)


@api.get("/roles/{role_id}")
async def get_role(role_id: str):
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@api.get("/roles/{role_id}/matches")
async def role_matches(role_id: str):
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    candidates = await db.candidates.find({}, {"_id": 0}).to_list(200)
    ranked = rank_candidates(role, candidates)
    return {"role": role, "matches": [{"candidate": r["candidate"], "match": r["match"]} for r in ranked]}


class WhyInput(BaseModel):
    role_id: Optional[str] = None
    role: Optional[dict] = None
    candidate_slug: str


@api.post("/match/why")
async def why_match(body: WhyInput):
    role = body.role
    if body.role_id:
        role = await db.roles.find_one({"id": body.role_id}, {"_id": 0}) or role
    if not role:
        raise HTTPException(status_code=400, detail="Role required")
    cand = await db.candidates.find_one({"slug": body.candidate_slug}, {"_id": 0})
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    match = compute_match(role, cand)
    narrative = await ai_service.why_match_narrative(role, cand, match)
    return {"match": match, "narrative": narrative}


# ---------- Companies ----------
@api.get("/companies")
async def list_companies():
    return await db.companies.find({}, {"_id": 0}).to_list(100)


@api.get("/companies/{company_id}")
async def get_company(company_id: str):
    c = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
    roles = await db.roles.find({"company_id": company_id}, {"_id": 0}).to_list(100)
    return {**c, "roles": roles}


# ---------- Shortlist ----------
class ShortlistInput(BaseModel):
    candidate_slug: str
    role_id: Optional[str] = None
    note: Optional[str] = None


@api.get("/shortlist")
async def get_shortlist(user: dict = Depends(current_user)):
    items = await db.shortlists.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    out = []
    for it in items:
        cand = await db.candidates.find_one({"slug": it["candidate_slug"]}, {"_id": 0})
        if cand:
            out.append({**it, "candidate": cand})
    return out


@api.post("/shortlist")
async def add_shortlist(body: ShortlistInput, user: dict = Depends(current_user)):
    existing = await db.shortlists.find_one({"user_id": user["id"], "candidate_slug": body.candidate_slug})
    if existing:
        await db.shortlists.update_one({"_id": existing["_id"]}, {"$set": {"note": body.note, "role_id": body.role_id}})
        return {"ok": True, "updated": True}
    await db.shortlists.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "candidate_slug": body.candidate_slug,
        "role_id": body.role_id, "note": body.note, "created_at": now_iso(),
    })
    return {"ok": True}


@api.delete("/shortlist/{candidate_slug}")
async def remove_shortlist(candidate_slug: str, user: dict = Depends(current_user)):
    await db.shortlists.delete_one({"user_id": user["id"], "candidate_slug": candidate_slug})
    return {"ok": True}


# ---------- Messaging ----------
class MessageInput(BaseModel):
    to_candidate_slug: str
    body: str


@api.get("/messages/threads")
async def threads(user: dict = Depends(current_user)):
    docs = await db.threads.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    for t in docs:
        cand = await db.candidates.find_one({"slug": t["candidate_slug"]}, {"_id": 0})
        t["candidate"] = cand
        last = await db.messages.find({"thread_id": t["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1)
        t["last_message"] = last[0] if last else None
    docs.sort(key=lambda x: (x.get("last_message") or {}).get("created_at", ""), reverse=True)
    return docs


@api.get("/messages/{thread_id}")
async def thread_messages(thread_id: str, user: dict = Depends(current_user)):
    return await db.messages.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1).to_list(500)


@api.post("/messages")
async def send_message(body: MessageInput, user: dict = Depends(current_user)):
    thread = await db.threads.find_one({"user_id": user["id"], "candidate_slug": body.to_candidate_slug})
    if not thread:
        tid = str(uuid.uuid4())
        thread = {"id": tid, "user_id": user["id"], "candidate_slug": body.to_candidate_slug, "created_at": now_iso()}
        await db.threads.insert_one(thread)
    else:
        tid = thread["id"]
    msg = {"id": str(uuid.uuid4()), "thread_id": tid, "sender": "recruiter",
           "body": body.body, "created_at": now_iso()}
    await db.messages.insert_one(msg)
    # auto candidate reply for demo realism
    reply = {"id": str(uuid.uuid4()), "thread_id": tid, "sender": "candidate",
             "body": "Thanks for reaching out — I'd be glad to learn more. I'm available this week.",
             "created_at": now_iso()}
    await db.messages.insert_one(reply)
    return {"ok": True, "thread_id": tid}


class DraftInput(BaseModel):
    candidate_slug: str
    role_title: Optional[str] = None


@api.post("/messages/draft")
async def draft(body: DraftInput, user: dict = Depends(current_user)):
    cand = await db.candidates.find_one({"slug": body.candidate_slug}, {"_id": 0})
    ctx = f"Draft outreach to {cand['name']} ({cand['title']}) for a {body.role_title or 'relevant'} role. Reference one concrete strength."
    return {"draft": await ai_service.draft_message(ctx)}


# ---------- Interviews ----------
class InterviewInput(BaseModel):
    candidate_slug: str
    role_id: Optional[str] = None
    role_title: Optional[str] = None
    scheduled_at: Optional[str] = None
    interview_type: str = "Technical Screen"


@api.get("/interviews")
async def list_interviews(user: dict = Depends(current_user)):
    docs = await db.interviews.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for it in docs:
        it["candidate"] = await db.candidates.find_one({"slug": it["candidate_slug"]}, {"_id": 0})
    return docs


@api.post("/interviews")
async def request_interview(body: InterviewInput, user: dict = Depends(current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "candidate_slug": body.candidate_slug,
           "role_id": body.role_id, "role_title": body.role_title, "scheduled_at": body.scheduled_at,
           "interview_type": body.interview_type, "status": "Requested",
           "feedback": None, "created_at": now_iso()}
    await db.interviews.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


class FeedbackInput(BaseModel):
    decision: str
    reason: Optional[str] = None
    notes: Optional[str] = None


@api.patch("/interviews/{interview_id}/feedback")
async def interview_feedback(interview_id: str, body: FeedbackInput, user: dict = Depends(current_user)):
    res = await db.interviews.update_one(
        {"id": interview_id, "user_id": user["id"]},
        {"$set": {"feedback": body.model_dump(), "status": "Feedback Received"}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")
    return {"ok": True}


@api.patch("/interviews/{interview_id}/schedule")
async def schedule_interview(interview_id: str, scheduled_at: str, user: dict = Depends(current_user)):
    await db.interviews.update_one({"id": interview_id, "user_id": user["id"]},
                                   {"$set": {"scheduled_at": scheduled_at, "status": "Scheduled"}})
    return {"ok": True}


# ---------- Talent side ----------
@api.get("/talent/dashboard")
async def talent_dashboard(slug: str = "priya-shah"):
    cand = await db.candidates.find_one({"slug": slug}, {"_id": 0})
    if not cand:
        raise HTTPException(status_code=404, detail="Talent profile not found")
    roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    opps = []
    for role in roles:
        m = compute_match(role, cand)
        company = await db.companies.find_one({"id": role["company_id"]}, {"_id": 0})
        opps.append({"role": role, "company": company, "match": m})
    opps.sort(key=lambda x: x["match"]["overall"], reverse=True)
    a = cand["assessment"]
    readiness = {
        "overall": cand["career_readiness"],
        "components": {
            "Technical": a["technical"], "Problem Solving": a["problem_solving"],
            "Communication": a["communication"], "Interview Readiness": a["interview_readiness"],
            "Portfolio": min(100, 60 + len(cand["evidence"]) * 12),
            "Profile Completeness": 92,
        },
    }
    blocker = min(readiness["components"], key=readiness["components"].get)
    holding_back = {
        "strong_in": [s["name"] for s in cand["skills"] if s["level"] == "Advanced"][:3],
        "blocker": blocker,
        "impact": "Improving this unlocks stronger opportunities and interviews",
        "action": "Complete 2 mock interviews" if "Interview" in blocker or "Communication" in blocker
        else "Ship one portfolio case study",
        "expected_gain": 6,
    }
    return {
        "candidate": cand,
        "readiness": readiness,
        "career_paths": [{"title": o["role"]["title"], "match": o["match"]["overall"]} for o in opps[:4]],
        "opportunities": opps,
        "holding_back": holding_back,
    }


class CareerMatchInput(BaseModel):
    text: str


@api.post("/talent/career-match")
async def career_match(body: CareerMatchInput):
    return await ai_service.career_recommendations(body.text)


# ---------- Admin ----------
@api.get("/admin/command-center")
async def command_center(user: dict = Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    cands = await db.candidates.find({}, {"_id": 0}).to_list(200)
    ready = [c for c in cands if c["interview_ready"]]
    at_risk = [c for c in cands if c["career_readiness"] < 78]
    interviews = await db.interviews.count_documents({})
    return {
        "candidates": len(cands),
        "ready_candidates": len(ready),
        "at_risk_candidates": len(at_risk),
        "employers": await db.companies.count_documents({}),
        "active_roles": await db.roles.count_documents({}),
        "matches": len(cands) * await db.roles.count_documents({}),
        "interviews": interviews,
        "final_rounds": 3,
        "offers": 2,
        "placements": 5,
        "placement_rate": 78,
        "time_to_first_interview": 6,
        "time_to_offer": 21,
        "time_to_placement": 34,
        "control_tower": [
            {
                "slug": c["slug"], "name": c["name"], "avatar": c["avatar"],
                "target_role": c["title"], "readiness": c["career_readiness"],
                "blocker": c["gaps"][0] if c["gaps"] else "None",
                "risk": "GREEN" if c["career_readiness"] >= 86 else "AMBER" if c["career_readiness"] >= 76 else "RED",
                "next_action": "Advance to employer matches" if c["interview_ready"] else "Coaching: interview readiness",
                "owner": "A. Rivera",
            } for c in cands
        ],
    }


@api.get("/admin/employers")
async def admin_employers(user: dict = Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    companies = await db.companies.find({}, {"_id": 0}).to_list(100)
    for c in companies:
        c["open_roles"] = await db.roles.count_documents({"company_id": c["id"]})
        c["propensity"] = "High" if c["hiring_velocity"] == "High" else "Medium"
    return companies


app.include_router(auth_router)
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await seed_admin(db)
    await db.users.create_index("email", unique=True)
    if await db.candidates.count_documents({}) == 0:
        await db.candidates.insert_many([dict(c) for c in seed_data.CANDIDATES])
    if await db.companies.count_documents({}) == 0:
        await db.companies.insert_many([dict(c) for c in seed_data.COMPANIES])
    if await db.roles.count_documents({}) == 0:
        await db.roles.insert_many([{**r, "created_at": now_iso()} for r in seed_data.ROLES])
    # ensure a demo recruiter + talent user
    from auth import hash_password
    for email, name, role, extra in [
        ("recruiter@elevateme.com", "Jordan Blake", "recruiter", {"company_id": "acme-inc"}),
        ("talent@elevateme.com", "Priya Shah", "talent", {"candidate_id": "priya-shah"}),
        ("employer@elevateme.com", "Dana Cole", "employer", {"company_id": "northwind"}),
    ]:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "email": email, "password_hash": hash_password("Demo@123"),
                "name": name, "role": role, "created_at": now_iso(),
                "candidate_id": extra.get("candidate_id"), "company_id": extra.get("company_id"),
            })
    logger.info("ElevateMe seed complete")


@app.on_event("shutdown")
async def shutdown():
    client.close()
