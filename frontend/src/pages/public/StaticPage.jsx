import { Link } from "react-router-dom";
import PublicLayout, { Breadcrumbs } from "@/components/public/PublicLayout";
import Seo, { breadcrumbJsonLd, faqJsonLd } from "@/seo/Seo";
import { AnswerBlock, Section, FaqList, ProductCta, PageWrap } from "@/components/public/parts";

export const CONTENT = {
  about: {
    title: "About ElevateMe", crumb: "About",
    seoTitle: "About ElevateMe — The Talent Intelligence Marketplace",
    seoDesc: "ElevateMe is a Talent Intelligence Marketplace connecting U.S. employers with verified, role-matched professionals while helping candidates become genuinely hire-ready.",
    answer: "ElevateMe is a Talent Intelligence Marketplace. It connects U.S. employers with verified, role-matched professionals and helps candidates — students, graduates and early-career professionals — become genuinely hire-ready through evidence, skills verification and AI matching.",
    sections: [
      ["Who we serve", "ElevateMe serves four groups: talent (students, graduates and professionals), recruiters, employers and hiring managers, and the internal ElevateMe team that connects them."],
      ["The problem we solve", "Traditional job boards optimize for volume — applications and listings. ElevateMe optimizes for successful matches: reducing employer effort to find good talent, candidate effort to find good opportunities, and the effort to convert candidates into placements."],
      ["What makes us different", "We compete on match intelligence, verified talent, evidence, hiring speed and placement outcomes — not on the number of jobs or candidates. Every match is explainable, and every skill claim is backed by evidence."],
    ],
    faqs: [
      { q: "What is ElevateMe?", a: "ElevateMe is a Talent Intelligence Marketplace connecting U.S. employers with verified, role-matched professionals while helping candidates become genuinely hire-ready." },
      { q: "How is ElevateMe different from a job board?", a: "Instead of listing thousands of jobs and letting candidates apply everywhere, ElevateMe matches verified candidates to roles with explainable scores and evidence, prioritizing successful placements over application volume." },
    ],
    cta: ["Join ElevateMe", "Get Started", "/register", "See How It Works", "/how-it-works"],
  },
  "how-it-works": {
    title: "How ElevateMe Works", crumb: "How It Works",
    seoTitle: "How ElevateMe Works — Define, Match, Prove, Interview, Hire",
    seoDesc: "See how ElevateMe turns a plain-English hiring need into verified, role-matched candidates — and how candidates get discovered where they actually fit.",
    answer: "ElevateMe works in two directions. Employers describe who they need in plain English; the platform structures the requirement and surfaces verified, interview-ready candidates with explainable matches. Candidates build a verified profile and get matched to roles where they're competitive, with a clear plan for what to improve.",
    sections: [
      ["For employers", "Describe your hiring need → ElevateMe generates structured role intelligence → see strong, interview-ready and exceptional matches → review evidence → shortlist, compare, message and request interviews → hire."],
      ["For talent", "Build a verified profile → see your career matches and readiness → discover roles where you're competitive → understand what's holding you back → prepare with an interview battle plan → get discovered and hired."],
      ["Why matches are explainable", "Every match decomposes into skills, experience, role alignment, location, availability and readiness, with evidence-based reasons and honest risk flags — no black-box scores."],
    ],
    faqs: [
      { q: "How does ElevateMe match candidates?", a: "ElevateMe matches candidates to roles based on role requirements, verified skills, project evidence, assessments, experience, location and availability — producing an explainable score with reasons and risks." },
      { q: "How does ElevateMe verify skills?", a: "Skills are supported by evidence such as projects, portfolios, technical assessments and reviewed work, rather than self-reported claims alone." },
    ],
    cta: ["Ready to start?", "Get Started", "/register", "Browse Jobs", "/jobs"],
  },
  trust: {
    title: "Trust & Integrity", crumb: "Trust",
    seoTitle: "Trust & Integrity at ElevateMe — Verified Talent, Real Evidence",
    seoDesc: "How ElevateMe protects candidates and employers: verification, privacy, human oversight and a strict no-fabrication policy on employment and credentials.",
    answer: "Trust is the foundation of ElevateMe. We verify identity, education, skills and evidence; we protect private information; and we never fabricate or misrepresent employment, credentials or work authorization. Candidates control their public visibility.",
    sections: [
      ["Verification", "We support verification of identity, education, skills (via assessment), project evidence, portfolios and communication before candidates are presented to employers."],
      ["Privacy & control", "Private information — contact details, work authorization specifics, recruiter notes, assessment detail and interview feedback — is protected. Candidates control whether their profile is publicly discoverable."],
      ["Integrity", "We never fabricate experience, credentials, employment, references, assessment results or work authorization. Projects and training are never misrepresented as employment."],
    ],
    faqs: [
      { q: "Does ElevateMe use work authorization to rank candidates?", a: "No. Work authorization information is collected in structured form and only surfaced and used in legally appropriate hiring workflows — never as an indiscriminate ranking mechanism." },
      { q: "Can candidates control who sees their profile?", a: "Yes. Candidates control public discoverability and data sharing; profiles are not indexed publicly without explicit opt-in." },
    ],
    cta: ["Build a profile you can trust", "Get Started", "/register", "Our AI Principles", "/ai"],
  },
  methodology: {
    title: "Our Methodology", crumb: "Methodology",
    seoTitle: "ElevateMe Methodology — How Matching & Readiness Are Measured",
    seoDesc: "How ElevateMe calculates match scores, the Talent Score, readiness and market insights — what the numbers mean and what they don't.",
    answer: "ElevateMe scores are decomposable and evidence-based. A match score combines skills, experience, role alignment, location, availability and readiness. The Talent Score reflects skill verification, evidence quality, capability, communication, problem solving, readiness, role alignment and profile completeness.",
    sections: [
      ["Match score", "Each match weighs skills most heavily, followed by role alignment, experience, readiness, location and availability. Every dimension is shown and explained so recruiters can judge fit for themselves."],
      ["Talent Score & readiness", "Readiness combines technical, behavioral, communication, portfolio and interview components. Scores are guidance, not guarantees, and always decomposable."],
      ["Market insights & salary", "Salary ranges shown on career pages are illustrative and derived from roles currently on the ElevateMe platform — not a national statistical survey. Market reports use aggregated, privacy-safe platform signals."],
    ],
    faqs: [
      { q: "What does an ElevateMe match score mean?", a: "It's an explainable estimate of fit combining skills, experience, role alignment, location, availability and readiness — with evidence-based reasons and honest risk flags. It is decision support, not an automated hiring decision." },
      { q: "Are the salary ranges official statistics?", a: "No. They are illustrative ranges derived from roles currently on ElevateMe and vary by location, seniority and industry." },
    ],
    cta: ["Explore the platform", "Get Started", "/register", "Read Market Insights", "/market-insights"],
  },
  ai: {
    title: "Our AI Principles", crumb: "AI Principles",
    seoTitle: "ElevateMe AI Principles — Helpful, Explainable, Human-Controlled",
    seoDesc: "How ElevateMe uses AI responsibly for matching, search, summaries and interview prep — and the things AI is never allowed to do.",
    answer: "ElevateMe uses AI to assist with matching, search, recommendations, candidate summaries, comparisons and interview preparation. AI supports human decisions; it never makes final hiring decisions and never fabricates facts about candidates.",
    sections: [
      ["What AI helps with", "Parsing hiring needs and resumes, classifying roles and skills, semantic matching, candidate and career recommendations, profile improvement suggestions, message drafting and interview preparation."],
      ["What AI must never do", "AI must not fabricate experience, credentials, employment, references, assessment results or work authorization, and must not make automatic discriminatory or final hiring decisions."],
      ["Explainability", "Every recommendation supports why, evidence, confidence, missing data and potential risk. AI should be understandable rather than a black box."],
    ],
    faqs: [
      { q: "Does ElevateMe use AI to make hiring decisions?", a: "No. AI assists with matching, search, summaries and preparation, but humans stay in control and make the final decisions." },
      { q: "Can ElevateMe's AI invent experience or credentials?", a: "No. Fabricating experience, credentials, employment, references, assessments or work authorization is strictly prohibited." },
    ],
    cta: ["Experience explainable AI", "Get Started", "/register", "About ElevateMe", "/about"],
  },
  "for-students": {
    title: "ElevateMe for Students & Graduates", crumb: "For Students",
    seoTitle: "ElevateMe for Students & Graduates — Get Hired Where You Fit",
    seoDesc: "For U.S. students, international students, OPT/STEM OPT candidates and recent graduates: build a verified profile, find roles you match and learn what to improve.",
    answer: "ElevateMe helps students, international students, OPT and STEM OPT candidates and recent graduates get discovered where they actually fit. Build a verified profile, see your strongest career paths, understand what's holding you back, and prepare for interviews.",
    sections: [
      ["Your career control center", "See your readiness score, strongest career paths, and a clear answer to 'what's holding me back?' — with the single next action that will move you forward most."],
      ["Get discovered, don't spam applications", "Instead of applying everywhere, get matched to roles where you're competitive, with an honest view of what's strong and what's missing."],
      ["International students", "We provide carefully framed educational context around the U.S. job search, resumes and interviews. For immigration specifics, we point to authoritative government sources; we do not provide legal advice."],
    ],
    faqs: [
      { q: "Can international students use ElevateMe?", a: "Yes. ElevateMe supports international students and OPT/STEM OPT candidates. Work authorization is collected in structured form and used only in legally appropriate workflows." },
      { q: "How can international students find U.S. jobs?", a: "Build a verified, evidence-backed profile, target roles where you're competitive, and prepare with structured interview guidance. ElevateMe surfaces employers open to your profile." },
    ],
    cta: ["Build your profile", "Get Started", "/register", "Explore Careers", "/careers"],
  },
  "for-employers": {
    title: "ElevateMe for Employers", crumb: "For Employers",
    seoTitle: "ElevateMe for Employers — Tell Us Who You Need, Meet Verified Talent",
    seoDesc: "For founders, hiring managers and business owners: describe your hiring need in plain English and meet verified, role-matched, interview-ready candidates fast.",
    answer: "ElevateMe lets employers describe a hiring need in plain English and instantly see verified, role-matched candidates — strong, interview-ready and exceptional matches — each with explainable reasons and evidence, so you can identify who to interview in minutes.",
    sections: [
      ["Tell us who you need", "Skip the giant candidate directory. Describe the role naturally; ElevateMe structures the requirement and surfaces the best-fit verified talent."],
      ["Decide with evidence", "Every candidate card shows a decomposed match, verified skills and one-click evidence — so you can answer 'why should I interview this person?' in about 30 seconds."],
      ["Move fast to hire", "Shortlist, compare, message, request interviews and capture structured feedback in one workspace built around outcomes, not vanity metrics."],
    ],
    faqs: [
      { q: "How do employers find talent on ElevateMe?", a: "Describe your hiring need in plain English; ElevateMe converts it into structured requirements and returns verified, role-matched candidates with explainable scores and evidence." },
      { q: "How fast can I find interview-worthy candidates?", a: "The workflow is designed so a recruiter can identify several interview-worthy, verified candidates without manually browsing hundreds of profiles." },
    ],
    cta: ["Tell us who you need", "Find Talent", "/register", "How It Works", "/how-it-works"],
  },
  "for-recruiters": {
    title: "ElevateMe for Recruiters", crumb: "For Recruiters",
    seoTitle: "ElevateMe for Recruiters — Match Intelligence & Talent Rooms",
    seoDesc: "For internal, technical, agency and university recruiters: match intelligence, verified evidence, candidate comparison, shortlists and a Talent Room per role.",
    answer: "ElevateMe gives recruiters match intelligence and verified evidence in one workspace. Search by natural language or role, compare candidates side by side, build shortlists, message, run interviews and manage each role in a dedicated Talent Room.",
    sections: [
      ["Match intelligence", "Every role-to-candidate relationship generates an explainable match with reasons and risks — so you can prioritize the strongest, interview-ready candidates first."],
      ["Talent Rooms", "Each role gets a dedicated workspace: matches, shortlist, interviews, messages, notes and analytics — bridging a marketplace and an ATS-style workflow."],
      ["Feedback that improves matching", "Structured interview feedback and 'not a fit' reasons feed the matching engine, so recommendations improve over time."],
    ],
    faqs: [
      { q: "What is a Talent Room?", a: "A Talent Room is a dedicated workspace for a single role, bringing together matches, shortlist, interviews, messages, notes and analytics." },
      { q: "Can recruiters compare candidates?", a: "Yes. Recruiters can select candidates and compare match, technical fit, experience, assessment, communication, availability, location, skills, evidence and risks side by side." },
    ],
    cta: ["Start recruiting smarter", "Get Started", "/register", "How It Works", "/how-it-works"],
  },
};

export default function StaticPage({ slug }) {
  const c = CONTENT[slug];
  if (!c) return <PublicLayout><PageWrap><h1 className="font-display text-3xl pt-28">Page not found</h1></PageWrap></PublicLayout>;
  const crumbs = [{ name: "Home", path: "/" }, { name: c.crumb, path: `/${slug}` }];
  return (
    <PublicLayout>
      <Seo title={c.seoTitle} description={c.seoDesc} path={`/${slug}`} jsonLd={[breadcrumbJsonLd(crumbs), faqJsonLd(c.faqs)]} />
      <Breadcrumbs items={crumbs} />
      <PageWrap>
        <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-5 mt-6">{c.title}</h1>
        <AnswerBlock answer={c.answer} />
        {c.sections.map(([t, body]) => (
          <Section key={t} title={t}><p className="text-bodygray leading-relaxed max-w-3xl">{body}</p></Section>
        ))}
        <Section title="Frequently asked questions"><FaqList faqs={c.faqs} /></Section>
        <ProductCta heading={c.cta[0]} primary={c.cta[1]} primaryTo={c.cta[2]} secondary={c.cta[3]} secondaryTo={c.cta[4]} />
      </PageWrap>
    </PublicLayout>
  );
}
