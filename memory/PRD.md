# ElevateMe — Talent Intelligence Marketplace (PRD)

## Original Problem Statement
Build a next-gen U.S. recruitment platform positioned as a **Talent Intelligence Marketplace** (NOT a job board / LinkedIn / Indeed). Combines talent marketplace + recruiting platform + talent intelligence + verified skills + AI matching + candidate readiness + interview workflow + placement intelligence. Full MVP with real AI, premium light editorial UI, using the official ElevateMe brand system.

## Design / Brand
- Brand from official ElevateMe AI-Ready Design System PDF: Charcoal #1A1A1A, Terracotta #C7493A, Green #488A6D, Cream #F2F1EE, white cards, Nunito Sans (800 headings). No purple/neon/blue-SaaS.
- Marketing = editorial/kinetic (framer-motion + lenis, masked hero reveal, marquee, numbered chapters). Product = information-dense, 1px borders, clean.

## Architecture
- Backend: FastAPI + MongoDB (motor). Files: server.py, auth.py (JWT+bcrypt, 4 roles), matching.py (deterministic explainable match), ai_service.py (Emergent LLM key, gpt-5.4), seed_data.py (12 candidates, 3 companies, 3 roles).
- Frontend: React 19 + Tailwind + shadcn + framer-motion + lenis + recharts. AuthContext (Bearer token in localStorage), ProductLayout with role-based sidebar.
- AI: role intake NL→structured, why-this-match narrative, career recommendations, message drafting (all via Emergent LLM key, with deterministic fallbacks).

## User Personas
Talent (students/grads/pros), Recruiter, Employer/Hiring Manager, ElevateMe Admin.

## Implemented (2026-06)
- JWT auth + RBAC (talent/recruiter/employer/admin), demo accounts + admin seed.
- Marketing landing: kinetic hero, Tell Us Who You Need, How It Works, Match Intelligence (Why This Match), Talent, Outcomes, marquee, CTA.
- Employer: dashboard, Find Talent (Match/Discover/Search + AI role intake + availability + ranked matches), Talent Cards, Candidate Talent Intelligence Profile (verified skills, evidence "Show Me The Work", assessment, Why This Match), Shortlist + Compare table, Messages (+AI draft, auto-reply), Interviews (request/schedule/feedback), Talent Room workspace.
- Talent: Career Control Center (readiness, career paths, What's Holding You Back), Career Match (AI), Opportunities (match-aware), Readiness.
- Admin: Command Center KPIs, Placement Control Tower (risk GREEN/AMBER/RED), Employer CRM, Analytics (recharts funnel + trend).

## Backlog
- P1: Interview Battle Plan generation, Market Intelligence, Referral engine, Network, Notifications center, Employer profile pages, profile analytics.
- P2: Talent Intelligence Graph, placement probability, employer propensity model, ATS/calendar integrations, resume parsing/upload, candidate onboarding wizard.

## Next Tasks
- Visual QA of authenticated screens via browser automation.
- Talent onboarding to create real candidate profiles (currently seeded).
- Notifications + activity timelines per entity.
