"""AI services for ElevateMe using the Emergent LLM key."""
import os
import json
import uuid
import re
from emergentintegrations.llm.chat import LlmChat, UserMessage

MODEL_PROVIDER = "openai"
MODEL_NAME = "gpt-5.4"


def _key():
    return os.environ["EMERGENT_LLM_KEY"]


async def _complete(system: str, prompt: str) -> str:
    chat = LlmChat(api_key=_key(), session_id=str(uuid.uuid4()), system_message=system).with_model(
        MODEL_PROVIDER, MODEL_NAME
    )
    return await chat.send_message(UserMessage(text=prompt))


def _extract_json(text: str):
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if m:
        text = m.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


ROLE_INTAKE_SYSTEM = (
    "You are ElevateMe's Role Intelligence engine. Convert a recruiter's natural-language "
    "hiring need into structured requirements. Never invent salary if not implied. "
    "Respond ONLY with a JSON object, no prose."
)


async def parse_role_intake(text: str) -> dict:
    prompt = f"""Convert this hiring need into JSON with EXACTLY these keys:
title (string), seniority (one of Junior/Mid/Senior/Lead), must_have (array of skill strings),
nice_to_have (array of skill strings), domain (string), location (string),
work_model (one of Onsite/Hybrid/Remote), salary_min (integer or null), salary_max (integer or null),
availability_days (integer, default 30), experience_min (number of years), summary (one sentence).

Hiring need: \"\"\"{text}\"\"\""""
    try:
        raw = await _complete(ROLE_INTAKE_SYSTEM, prompt)
        data = _extract_json(raw)
    except Exception:
        data = _fallback_role(text)
    # normalize
    data.setdefault("title", "Open Role")
    data.setdefault("seniority", "Mid")
    data.setdefault("must_have", [])
    data.setdefault("nice_to_have", [])
    data.setdefault("domain", "General")
    data.setdefault("location", "Remote")
    data.setdefault("work_model", "Remote")
    data.setdefault("availability_days", 30)
    data.setdefault("experience_min", 1.0)
    data.setdefault("summary", data.get("title", "Open Role"))
    data["salary_min"] = data.get("salary_min")
    data["salary_max"] = data.get("salary_max")
    return data


def _fallback_role(text: str) -> dict:
    t = text.lower()
    skill_bank = ["sql", "python", "power bi", "tableau", "fastapi", "postgresql", "aws",
                  "react", "typescript", "ml", "docker", "kubernetes", "java", "r", "excel"]
    found = [s for s in skill_bank if s in t]
    title = "Data Analyst" if "analyst" in t else "Backend Engineer" if "backend" in t else \
        "Data Scientist" if "scientist" in t or "ml" in t else "Software Engineer"
    seniority = "Junior" if "junior" in t or "entry" in t else "Senior" if "senior" in t else "Mid"
    location = "Chicago, IL" if "chicago" in t else "Remote"
    work_model = "Hybrid" if "hybrid" in t else "Remote" if "remote" in t else "Onsite"
    sal = re.findall(r"\$?(\d{2,3})[kK]", text)
    salary_min = int(sal[0]) * 1000 if sal else None
    salary_max = int(sal[1]) * 1000 if len(sal) > 1 else None
    return {
        "title": title, "seniority": seniority,
        "must_have": [s.title() if s not in ("sql", "ml", "aws", "r") else s.upper() for s in found[:4]] or ["SQL"],
        "nice_to_have": [], "domain": "General", "location": location, "work_model": work_model,
        "salary_min": salary_min, "salary_max": salary_max, "availability_days": 30,
        "experience_min": 1.0 if seniority == "Junior" else 3.0 if seniority == "Mid" else 5.0,
        "summary": f"{seniority} {title}",
    }


async def why_match_narrative(role: dict, candidate: dict, match: dict) -> str:
    system = ("You are ElevateMe's Match Intelligence explainer. Be concise, evidence-based, "
              "and honest. 2-3 sentences. Never fabricate experience or credentials.")
    prompt = f"""Role: {role.get('title')} ({role.get('seniority')}), must-have {role.get('must_have')}.
Candidate: {candidate.get('name')}, {candidate.get('title')}, {candidate.get('experience_years')} yrs.
Verified skills: {[s['name'] for s in candidate.get('skills', [])]}.
Match {match['overall']}%. Explain in 2-3 sentences why this candidate matches, citing evidence."""
    try:
        return (await _complete(system, prompt)).strip()
    except Exception:
        return " ".join(match.get("reasons", [])[:2]) or "Strong alignment with the role requirements."


async def career_recommendations(profile_text: str) -> dict:
    system = ("You are ElevateMe's Career Match engine for candidates. Recommend target roles with "
              "honest fit percentages and actionable guidance. Respond ONLY with JSON.")
    prompt = f"""Candidate summary: \"\"\"{profile_text}\"\"\"
Return JSON: {{ "roles": [{{"title": str, "match": int(50-98), "why": str, "missing": str, "improve": str}}] }}
Include 4 roles ordered by match descending."""
    try:
        raw = await _complete(system, prompt)
        data = _extract_json(raw)
        assert "roles" in data
        return data
    except Exception:
        return {"roles": [
            {"title": "Data Analyst", "match": 94, "why": "Strong SQL + Python + Power BI alignment",
             "missing": "Domain-specific analytics depth", "improve": "Ship one industry case study"},
            {"title": "BI Analyst", "match": 89, "why": "Dashboarding and reporting strengths",
             "missing": "Advanced modeling", "improve": "Complete a DAX assessment"},
            {"title": "Business Analyst", "match": 84, "why": "Communication and requirements skills",
             "missing": "Stakeholder case evidence", "improve": "Document a requirements project"},
            {"title": "Data Scientist", "match": 63, "why": "Solid Python foundation",
             "missing": "ML depth and statistics", "improve": "Build a supervised learning project"},
        ]}


async def draft_message(context: str) -> str:
    system = ("You are ElevateMe's messaging assistant. Draft a warm, professional, concise "
              "recruiter outreach message (3-4 sentences). Human stays in control.")
    try:
        return (await _complete(system, context)).strip()
    except Exception:
        return ("Hi — I came across your ElevateMe profile and your background looks like a strong "
                "match for a role we're hiring for. Would you be open to a quick conversation this week?")



async def interview_battle_plan(candidate: dict, role: dict, company: dict) -> dict:
    system = ("You are ElevateMe's Interview Battle Plan generator. Produce honest, practical, "
              "role-specific interview preparation. Never fabricate facts about the company. "
              "Respond ONLY with JSON.")
    cname = (company or {}).get("name", "the company")
    prompt = f"""Generate an interview battle plan as JSON with EXACTLY these keys:
company_overview (2 sentences about {cname} in the {(company or {}).get('industry','tech')} space),
role_overview (2 sentences about the {role.get('title')} role),
likely_topics (array of 4-6 short strings),
technical_questions (array of 4 strings),
behavioral_questions (array of 3 strings),
project_questions (array of 2 strings referencing the candidate's actual work),
candidate_strengths (array of 3 strings),
candidate_risks (array of 2 honest strings),
prep_tasks (array of 4 short actionable strings).

Role: {role.get('title')} ({role.get('seniority')}), must-have {role.get('must_have')}, domain {role.get('domain')}.
Candidate: {candidate.get('name')}, {candidate.get('title')}, {candidate.get('experience_years')} yrs.
Verified skills: {[s['name'] for s in candidate.get('skills', [])]}.
Applied experience: {[e.get('title') for e in candidate.get('applied_experience', [])]}.
Strengths: {candidate.get('strengths')}. Gaps: {candidate.get('gaps')}."""
    try:
        raw = await _complete(system, prompt)
        data = _extract_json(raw)
        for k in ["likely_topics", "technical_questions", "behavioral_questions", "project_questions",
                  "candidate_strengths", "candidate_risks", "prep_tasks"]:
            data.setdefault(k, [])
        data.setdefault("company_overview", f"{cname} is hiring for this role.")
        data.setdefault("role_overview", f"{role.get('title')} role focused on {role.get('domain','the domain')}.")
        return data
    except Exception:
        return {
            "company_overview": f"{cname} operates in {(company or {}).get('industry','technology')}.",
            "role_overview": f"A {role.get('seniority','')} {role.get('title')} focused on {role.get('domain','the domain')}.",
            "likely_topics": role.get("must_have", [])[:5] + ["Problem solving", "Communication"],
            "technical_questions": [f"Walk through how you would use {s} on this role." for s in role.get("must_have", [])[:4]],
            "behavioral_questions": ["Tell me about a project you're proud of.", "Describe a time you handled ambiguity.", "How do you prioritize under deadlines?"],
            "project_questions": [f"Explain your {e.get('title')} project end to end." for e in candidate.get("applied_experience", [])[:2]],
            "candidate_strengths": candidate.get("strengths", [])[:3],
            "candidate_risks": candidate.get("gaps", [])[:2],
            "prep_tasks": ["Review must-have skills", "Prepare 2 project walkthroughs", "Complete 1 mock interview", "Research the company"],
        }
