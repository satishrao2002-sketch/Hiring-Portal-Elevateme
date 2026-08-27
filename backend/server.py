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


async def add_notification(user_id, kind, title, body, link=None):
    if not user_id:
        return
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "kind": kind, "title": title,
        "body": body, "link": link, "read": False, "created_at": now_iso(),
    })


async def talent_user_for_candidate(slug):
    u = await db.users.find_one({"candidate_id": slug}, {"_id": 0, "id": 1, "name": 1})
    return u["id"] if u else None


def _slugify(name):
    base = "".join(c if c.isalnum() else "-" for c in name.lower()).strip("-")
    return "-".join(filter(None, base.split("-")))


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
    tuid = await talent_user_for_candidate(body.candidate_slug)
    company = None
    if user.get("company_id"):
        company = await db.companies.find_one({"id": user["company_id"]}, {"_id": 0, "name": 1})
    await add_notification(tuid, "shortlist", "You were shortlisted",
                           f"{(company or {}).get('name', user['name'])} added you to a shortlist.", "/talent")
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
    import random
    replies = [
        "Thanks for reaching out — I'd be glad to learn more. I'm available this week.",
        "Appreciate you connecting! This role sounds interesting — happy to chat.",
        "Thanks! I'd love to hear more about the team and the day-to-day.",
        "Great to hear from you. I'm open to a quick call — mornings work best for me.",
        "Thank you for considering me. Could you share a bit more about the scope?",
    ]
    reply = {"id": str(uuid.uuid4()), "thread_id": tid, "sender": "candidate",
             "body": random.choice(replies), "created_at": now_iso()}
    await db.messages.insert_one(reply)
    tuid = await talent_user_for_candidate(body.to_candidate_slug)
    await add_notification(tuid, "message", "New recruiter message",
                           f"{user['name']} sent you a message.", "/talent")
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
           "feedback": None, "battle_plan": None, "created_at": now_iso()}
    await db.interviews.insert_one(doc)
    tuid = await talent_user_for_candidate(body.candidate_slug)
    await add_notification(tuid, "interview", "Interview requested",
                           f"{user['name']} requested an interview for {body.role_title or 'a role'}.", "/talent")
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


@api.post("/interviews/{interview_id}/battle-plan")
async def gen_battle_plan(interview_id: str, user: dict = Depends(current_user)):
    it = await db.interviews.find_one({"id": interview_id, "user_id": user["id"]}, {"_id": 0})
    if not it:
        raise HTTPException(status_code=404, detail="Interview not found")
    if it.get("battle_plan"):
        return {"battle_plan": it["battle_plan"]}
    cand = await db.candidates.find_one({"slug": it["candidate_slug"]}, {"_id": 0})
    role = await db.roles.find_one({"id": it.get("role_id")}, {"_id": 0}) if it.get("role_id") else None
    if not role:
        role = {"title": it.get("role_title") or cand.get("title"), "seniority": "Mid",
                "must_have": [s["name"] for s in cand.get("skills", [])[:4]], "domain": "General"}
    company = await db.companies.find_one({"id": role.get("company_id")}, {"_id": 0}) if role.get("company_id") else None
    plan = await ai_service.interview_battle_plan(cand, role, company)
    await db.interviews.update_one({"id": interview_id}, {"$set": {"battle_plan": plan}})
    return {"battle_plan": plan}


# ---------- Notifications ----------
@api.get("/notifications")
async def list_notifications(user: dict = Depends(current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    unread = sum(1 for n in items if not n["read"])
    return {"items": items, "unread": unread}


@api.post("/notifications/read")
async def mark_all_read(user: dict = Depends(current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------- Talent onboarding ----------
class OnboardInput(BaseModel):
    title: str
    location: str
    work_model: str = "Hybrid"
    available_in_days: int = 30
    work_authorization: str = "U.S. Citizen"
    education: str
    experience_years: float = 0
    skills: List[dict] = []
    applied_experience: List[dict] = []
    evidence: List[dict] = []


@api.get("/talent/onboarding-status")
async def onboarding_status(user: dict = Depends(current_user)):
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {"onboarded": bool(fresh.get("candidate_id")), "candidate_id": fresh.get("candidate_id")}


@api.post("/talent/onboard")
async def onboard(body: OnboardInput, user: dict = Depends(current_user)):
    slug = _slugify(user["name"]) or f"talent-{user['id'][:6]}"
    if await db.candidates.find_one({"slug": slug}):
        slug = f"{slug}-{user['id'][:4]}"
    skills = [{"name": s.get("name", "").strip(), "level": s.get("level", "Intermediate"), "verified": True}
              for s in body.skills if s.get("name")]
    adv = sum(1 for s in skills if s["level"] == "Advanced")
    tech = min(96, 70 + adv * 5 + len(body.evidence) * 2)
    assessment = {"technical": tech, "problem_solving": max(70, tech - 4),
                  "communication": 84, "interview_readiness": min(95, 74 + len(body.evidence) * 4)}
    score = round((tech + assessment["interview_readiness"] + assessment["communication"]) / 3)
    doc = {
        "id": slug, "slug": slug, "name": user["name"], "title": body.title, "location": body.location,
        "avatar": seed_data.AVATARS[hash(slug) % len(seed_data.AVATARS)],
        "experience_years": body.experience_years, "available_in_days": body.available_in_days,
        "work_model": body.work_model, "work_authorization": body.work_authorization,
        "education": body.education, "skills": skills, "assessment": assessment,
        "professional_experience": [], "applied_experience": body.applied_experience,
        "evidence": body.evidence, "talent_score": score,
        "interview_ready": assessment["interview_readiness"] >= 80,
        "verified": {"identity": True, "education": True, "skills_assessed": True,
                     "evidence_reviewed": bool(body.evidence), "communication_assessed": True},
        "gaps": [] if body.evidence else ["Add portfolio evidence to strengthen profile"],
        "strengths": [s["name"] + " capability" for s in skills[:3]],
        "career_readiness": score, "role_family": "general",
    }
    existing = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if existing.get("candidate_id"):
        await db.candidates.update_one({"slug": existing["candidate_id"]}, {"$set": {k: v for k, v in doc.items() if k not in ("id", "slug")}})
        slug = existing["candidate_id"]
    else:
        await db.candidates.insert_one(dict(doc))
        await db.users.update_one({"id": user["id"]}, {"$set": {"candidate_id": slug}})
    return {"ok": True, "slug": slug, "profile_url": f"elevateme.com/talent/{slug}"}


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


# ---------- Public SEO / discovery layer ----------
import seo_content


def _job_from_role(role, company):
    return {
        "id": role["id"], "title": role["title"], "seniority": role.get("seniority"),
        "company": (company or {}).get("name", "ElevateMe Employer"),
        "company_id": role.get("company_id"),
        "location": role.get("location"), "work_model": role.get("work_model"),
        "salary_min": role.get("salary_min"), "salary_max": role.get("salary_max"),
        "must_have": role.get("must_have", []), "nice_to_have": role.get("nice_to_have", []),
        "domain": role.get("domain"), "description": role.get("description"),
        "experience_min": role.get("experience_min"),
        "date_posted": (role.get("created_at") or now_iso())[:10],
        "valid_through": "2026-12-31",
        "employment_type": "FULL_TIME",
    }


@api.get("/seo/careers")
async def seo_careers():
    return [{"slug": c["slug"], "title": c["title"], "answer": c["answer"], "core_skills": c["core_skills"]}
            for c in seo_content.CAREERS.values()]


@api.get("/seo/careers/{slug}")
async def seo_career(slug: str):
    c = seo_content.CAREERS.get(slug)
    if not c:
        raise HTTPException(status_code=404, detail="Career guide not found")
    roles = await db.roles.find({"title": {"$regex": c["title"], "$options": "i"}}, {"_id": 0}).to_list(50)
    jobs = []
    sal = []
    for r in roles:
        comp = await db.companies.find_one({"id": r["company_id"]}, {"_id": 0})
        jobs.append(_job_from_role(r, comp))
        if r.get("salary_min"):
            sal += [r["salary_min"], r["salary_max"]]
    salary_range = {"min": min(sal), "max": max(sal)} if sal else None
    related = [{"slug": s, "title": seo_content.CAREERS[s]["title"]} for s in c.get("related_careers", []) if s in seo_content.CAREERS]
    return {**c, "jobs": jobs, "salary_range": salary_range, "related": related}


@api.get("/seo/skills")
async def seo_skills():
    return [{"slug": s["slug"], "name": s["name"], "answer": s["answer"]} for s in seo_content.SKILLS.values()]


@api.get("/seo/skills/{slug}")
async def seo_skill(slug: str):
    s = seo_content.SKILLS.get(slug)
    if not s:
        raise HTTPException(status_code=404, detail="Skill not found")
    roles = await db.roles.find({"must_have": {"$regex": f"^{s['name']}$", "$options": "i"}}, {"_id": 0}).to_list(50)
    jobs = []
    for r in roles:
        comp = await db.companies.find_one({"id": r["company_id"]}, {"_id": 0})
        jobs.append(_job_from_role(r, comp))
    careers = [{"slug": rs, "title": seo_content.CAREERS[rs]["title"]} for rs in s.get("roles", []) if rs in seo_content.CAREERS]
    return {**s, "jobs": jobs, "careers": careers}


@api.get("/seo/locations")
async def seo_locations():
    return [{"slug": l["slug"], "name": l["name"]} for l in seo_content.LOCATIONS.values()]


@api.get("/seo/locations/{slug}")
async def seo_location(slug: str):
    loc = seo_content.LOCATIONS.get(slug)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    roles = await db.roles.find({"location": {"$regex": loc["match"], "$options": "i"}}, {"_id": 0}).to_list(100)
    jobs = []
    for r in roles:
        comp = await db.companies.find_one({"id": r["company_id"]}, {"_id": 0})
        jobs.append(_job_from_role(r, comp))
    cands = await db.candidates.find({"location": {"$regex": loc["match"], "$options": "i"}}, {"_id": 0}).to_list(50)
    top_skills = {}
    for c in cands:
        for sk in c.get("skills", []):
            top_skills[sk["name"]] = top_skills.get(sk["name"], 0) + 1
    top = sorted(top_skills, key=top_skills.get, reverse=True)[:6]
    return {**loc, "jobs": jobs, "talent_count": len(cands), "top_skills": top}


@api.get("/seo/jobs")
async def seo_jobs():
    roles = await db.roles.find({}, {"_id": 0}).to_list(200)
    out = []
    for r in roles:
        comp = await db.companies.find_one({"id": r["company_id"]}, {"_id": 0})
        out.append(_job_from_role(r, comp))
    return out


@api.get("/seo/jobs/{job_id}")
async def seo_job(job_id: str):
    r = await db.roles.find_one({"id": job_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Job not found")
    comp = await db.companies.find_one({"id": r["company_id"]}, {"_id": 0})
    job = _job_from_role(r, comp)
    career_slug = next((k for k, v in seo_content.CAREERS.items() if v["title"].lower() == r["title"].lower()), None)
    return {**job, "company_about": (comp or {}).get("about"), "career_slug": career_slug}


@api.get("/seo/market-insights")
async def seo_market_insights():
    return [{"slug": m["slug"], "title": m["title"], "summary": m["summary"]} for m in seo_content.MARKET_REPORTS.values()]


@api.get("/seo/market-insights/{slug}")
async def seo_market_report(slug: str):
    m = seo_content.MARKET_REPORTS.get(slug)
    if not m:
        raise HTTPException(status_code=404, detail="Report not found")
    return m


@api.get("/seo/companies/{company_id}")
async def seo_company(company_id: str):
    c = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Company not found")
    roles = await db.roles.find({"company_id": company_id}, {"_id": 0}).to_list(50)
    comp = await db.companies.find_one({"id": company_id}, {"_id": 0})
    return {**c, "jobs": [_job_from_role(r, comp) for r in roles]}


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

    # seed demo notifications
    if await db.notifications.count_documents({}) == 0:
        talent_u = await db.users.find_one({"email": "talent@elevateme.com"})
        rec_u = await db.users.find_one({"email": "recruiter@elevateme.com"})
        if talent_u:
            for k, t, b, link in [
                ("match", "New 94% match", "A Data Analyst role at Acme Inc. is a strong fit.", "/talent/opportunities"),
                ("view", "Recruiter viewed your profile", "Jordan Blake viewed your Talent Intelligence Profile.", "/talent"),
                ("readiness", "Boost your readiness", "Complete 2 mock interviews to gain +6 points.", "/talent/readiness"),
            ]:
                await add_notification(talent_u["id"], k, t, b, link)
        if rec_u:
            for k, t, b, link in [
                ("match", "3 new strong matches", "New verified candidates match your open Data Analyst role.", "/employer/find-talent"),
                ("feedback", "Feedback pending", "An interview is awaiting your feedback.", "/employer/interviews"),
            ]:
                await add_notification(rec_u["id"], k, t, b, link)


@app.on_event("shutdown")
async def shutdown():
    client.close()
