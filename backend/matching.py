"""Deterministic, explainable match scoring for ElevateMe."""


def _skill_names(candidate):
    return {s["name"].lower(): s for s in candidate.get("skills", [])}


def _level_score(level):
    return {"advanced": 1.0, "intermediate": 0.72, "beginner": 0.5}.get((level or "").lower(), 0.6)


def compute_match(role, candidate):
    """Return an explainable match dict for a role<->candidate pair.
    `role` is a structured dict (title, seniority, location, work_model,
    must_have[], nice_to_have[], salary, availability_days, experience_min, domain)."""
    cskills = _skill_names(candidate)
    must = [s.lower() for s in role.get("must_have", [])]
    nice = [s.lower() for s in role.get("nice_to_have", [])]

    # Skills dimension
    if must:
        hit = 0.0
        for s in must:
            if s in cskills:
                hit += _level_score(cskills[s]["level"])
        skills_score = round((hit / len(must)) * 100)
    else:
        skills_score = 70
    for s in nice:
        if s in cskills:
            skills_score = min(100, skills_score + 3)
    skills_score = max(0, min(100, skills_score))

    # Experience dimension
    exp_min = role.get("experience_min", 0) or 0
    cexp = candidate.get("experience_years", 0)
    if exp_min <= 0:
        exp_score = 85
    elif cexp >= exp_min:
        exp_score = min(100, 87 + round((cexp - exp_min) * 4))
    else:
        exp_score = max(45, round((cexp / exp_min) * 87))

    # Role alignment (title/family similarity + assessment technical)
    tech = candidate.get("assessment", {}).get("technical", 75)
    title_match = 96 if role.get("title", "").lower() in candidate.get("title", "").lower() \
        or candidate.get("title", "").lower() in role.get("title", "").lower() else 82
    role_score = round((title_match + tech) / 2)

    # Location
    r_loc = (role.get("location") or "").lower()
    c_loc = (candidate.get("location") or "").lower()
    r_model = (role.get("work_model") or "").lower()
    if "remote" in r_model or "remote" in c_loc or (r_loc and r_loc in c_loc):
        loc_score = 100
    elif r_loc and c_loc and r_loc.split(",")[0] in c_loc:
        loc_score = 95
    else:
        loc_score = 70

    # Availability
    need = role.get("availability_days", 30) or 30
    have = candidate.get("available_in_days", 30)
    avail_score = 100 if have <= need else max(55, 100 - (have - need))

    # Readiness
    ready_score = candidate.get("assessment", {}).get("interview_readiness", 75)

    weights = {"skills": 0.34, "experience": 0.16, "role": 0.18,
               "location": 0.12, "availability": 0.08, "readiness": 0.12}
    dims = {"skills": skills_score, "experience": exp_score, "role": role_score,
            "location": loc_score, "availability": avail_score, "readiness": ready_score}
    overall = round(sum(dims[k] * weights[k] for k in weights))

    # Evidence-based reasons
    reasons = []
    for s in must:
        if s in cskills and cskills[s].get("verified"):
            reasons.append(f"{cskills[s]['name']} verified through assessment")
    if candidate.get("applied_experience"):
        ev = candidate["applied_experience"][0]
        reasons.append(f"{ev['title']} demonstrates hands-on capability")
    if candidate.get("professional_experience"):
        pe = candidate["professional_experience"][0]
        reasons.append(f"Prior work at {pe['company']} aligns with the role")
    for st in candidate.get("strengths", []):
        if st not in reasons:
            reasons.append(st)
    reasons = reasons[:5]

    concerns = candidate.get("gaps", [])
    if skills_score < 70:
        concerns = ["Missing one or more must-have skills"] + concerns

    return {
        "overall": overall,
        "dimensions": dims,
        "reasons": reasons,
        "concerns": concerns[:3],
        "matched_skills": [cskills[s]["name"] for s in must if s in cskills],
        "missing_skills": [s.title() for s in must if s not in cskills],
    }


def rank_candidates(role, candidates):
    scored = []
    for c in candidates:
        m = compute_match(role, c)
        scored.append({"candidate": c, "match": m})
    scored.sort(key=lambda x: x["match"]["overall"], reverse=True)
    return scored
