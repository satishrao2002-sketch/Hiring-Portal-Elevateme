import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, X, ArrowRight, ArrowLeft, Check, Link2 } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Pill } from "@/components/brand";
import { toast } from "sonner";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const EV_TYPES = ["GitHub", "Portfolio", "Dashboard", "Case Study", "Assessment"];

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", location: "", work_model: "Hybrid", available_in_days: 30,
    work_authorization: "U.S. Citizen", education: "", experience_years: 0,
  });
  const [skills, setSkills] = useState([{ name: "", level: "Intermediate" }]);
  const [experience, setExperience] = useState([{ type: "Project", title: "", summary: "" }]);
  const [evidence, setEvidence] = useState([{ type: "GitHub", label: "" }]);

  useEffect(() => {
    if (!user?.candidate_id) return;
    api.get(`/candidates/${user.candidate_id}`).then(({ data }) => {
      setForm({
        title: data.title || "", location: data.location || "",
        work_model: data.work_model || "Hybrid", available_in_days: data.available_in_days ?? 30,
        work_authorization: data.work_authorization || "U.S. Citizen", education: data.education || "",
        experience_years: data.experience_years ?? 0,
      });
      if (data.skills?.length) setSkills(data.skills.map((s) => ({ name: s.name, level: s.level })));
      if (data.applied_experience?.length) setExperience(data.applied_experience);
      if (data.evidence?.length) setEvidence(data.evidence);
    }).catch(() => {});
  }, [user]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const steps = ["Basics", "Skills", "Applied Experience", "Evidence", "Review"];

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        experience_years: Number(form.experience_years) || 0,
        available_in_days: Number(form.available_in_days) || 30,
        skills: skills.filter((s) => s.name.trim()),
        applied_experience: experience.filter((e) => e.title.trim()),
        evidence: evidence.filter((e) => e.label.trim()),
      };
      const { data } = await api.post("/talent/onboard", payload);
      await refresh();
      toast.success("Profile published!");
      nav("/talent");
    } catch { toast.error("Could not save profile"); }
    finally { setSaving(false); }
  };

  const canNext = step === 0 ? form.title && form.location && form.education
    : step === 1 ? skills.some((s) => s.name.trim()) : true;

  return (
    <div className="grain min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <p className="label-eyebrow text-terracotta">Talent Onboarding</p>
        <h1 className="font-display text-4xl text-charcoal">Build your verified profile.</h1>
        <p className="text-bodygray mt-1">Get a shareable elevateme.com/talent link recruiters can trust.</p>

        {/* Stepper */}
        <div className="flex items-center gap-2 mt-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${i < step ? "bg-brandgreen text-white" : i === step ? "bg-terracotta text-white" : "bg-white border border-bordergray text-bodygray"}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? "bg-brandgreen" : "bg-bordergray"}`} />}
            </div>
          ))}
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
          className="bg-white border border-bordergray rounded-2xl p-6 mt-6" data-testid={`onboard-step-${step}`}>
          <p className="label-eyebrow text-bodygray mb-4">{steps[step]}</p>

          {step === 0 && (
            <div className="space-y-4">
              <Field label="Target title"><input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Data Analyst" className="inp" data-testid="onboard-title" /></Field>
              <Field label="Location"><input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Chicago, IL" className="inp" data-testid="onboard-location" /></Field>
              <Field label="Education"><input value={form.education} onChange={(e) => set("education", e.target.value)} placeholder="M.S. Business Analytics — UIC" className="inp" data-testid="onboard-education" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Experience (yrs)"><input type="number" step="0.1" value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} className="inp" data-testid="onboard-exp" /></Field>
                <Field label="Available in (days)"><input type="number" value={form.available_in_days} onChange={(e) => set("available_in_days", e.target.value)} className="inp" data-testid="onboard-avail" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Work model"><select value={form.work_model} onChange={(e) => set("work_model", e.target.value)} className="inp" data-testid="onboard-model">{["Onsite", "Hybrid", "Remote"].map((o) => <option key={o}>{o}</option>)}</select></Field>
                <Field label="Work authorization"><select value={form.work_authorization} onChange={(e) => set("work_authorization", e.target.value)} className="inp" data-testid="onboard-auth">{["U.S. Citizen", "Permanent Resident", "EAD", "OPT", "STEM OPT", "Prefer to discuss"].map((o) => <option key={o}>{o}</option>)}</select></Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {skills.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input value={s.name} onChange={(e) => setSkills(skills.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="e.g. SQL" className="inp flex-1" data-testid={`skill-name-${i}`} />
                  <select value={s.level} onChange={(e) => setSkills(skills.map((x, j) => j === i ? { ...x, level: e.target.value } : x))} className="inp w-40" data-testid={`skill-level-${i}`}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
                  <button onClick={() => setSkills(skills.filter((_, j) => j !== i))} className="w-10 grid place-items-center rounded-lg border border-bordergray hover:text-salmon hover:border-salmon transition-colors"><X size={16} /></button>
                </div>
              ))}
              <button onClick={() => setSkills([...skills, { name: "", level: "Intermediate" }])} className="label-eyebrow text-terracotta inline-flex items-center gap-1" data-testid="add-skill"><Plus size={14} /> Add skill</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {experience.map((e, i) => (
                <div key={i} className="border border-bordergray rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <select value={e.type} onChange={(ev) => setExperience(experience.map((x, j) => j === i ? { ...x, type: ev.target.value } : x))} className="inp w-40">{["Project", "Internship", "Volunteer", "Contract", "Open Source"].map((o) => <option key={o}>{o}</option>)}</select>
                    <input value={e.title} onChange={(ev) => setExperience(experience.map((x, j) => j === i ? { ...x, title: ev.target.value } : x))} placeholder="Title" className="inp flex-1" data-testid={`exp-title-${i}`} />
                    <button onClick={() => setExperience(experience.filter((_, j) => j !== i))} className="w-10 grid place-items-center rounded-lg border border-bordergray hover:text-salmon transition-colors"><X size={16} /></button>
                  </div>
                  <textarea value={e.summary} onChange={(ev) => setExperience(experience.map((x, j) => j === i ? { ...x, summary: ev.target.value } : x))} placeholder="One-line summary" rows={2} className="inp w-full resize-none" />
                </div>
              ))}
              <button onClick={() => setExperience([...experience, { type: "Project", title: "", summary: "" }])} className="label-eyebrow text-terracotta inline-flex items-center gap-1" data-testid="add-exp"><Plus size={14} /> Add experience</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {evidence.map((e, i) => (
                <div key={i} className="flex gap-2">
                  <select value={e.type} onChange={(ev) => setEvidence(evidence.map((x, j) => j === i ? { ...x, type: ev.target.value } : x))} className="inp w-40">{EV_TYPES.map((o) => <option key={o}>{o}</option>)}</select>
                  <input value={e.label} onChange={(ev) => setEvidence(evidence.map((x, j) => j === i ? { ...x, label: ev.target.value } : x))} placeholder="github.com/you or link" className="inp flex-1" data-testid={`ev-label-${i}`} />
                  <button onClick={() => setEvidence(evidence.filter((_, j) => j !== i))} className="w-10 grid place-items-center rounded-lg border border-bordergray hover:text-salmon transition-colors"><X size={16} /></button>
                </div>
              ))}
              <button onClick={() => setEvidence([...evidence, { type: "GitHub", label: "" }])} className="label-eyebrow text-terracotta inline-flex items-center gap-1" data-testid="add-evidence"><Plus size={14} /> Add evidence</button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brandgreen"><Link2 size={16} /> <span className="font-bold">elevateme.com/talent/{(user?.name || "you").toLowerCase().replace(/\s+/g, "-")}</span></div>
              <div><p className="label-eyebrow text-bodygray">{form.title} · {form.location}</p><p className="text-charcoal">{form.education}</p></div>
              <div><p className="label-eyebrow text-bodygray mb-1">Skills</p><div className="flex flex-wrap gap-1.5">{skills.filter((s) => s.name).map((s, i) => <Pill key={i} tone="green">{s.name} · {s.level}</Pill>)}</div></div>
              <p className="text-sm text-bodygray">{experience.filter((e) => e.title).length} experience items · {evidence.filter((e) => e.label).length} evidence links</p>
            </div>
          )}

          <div className="flex justify-between mt-6 pt-5 border-t border-bordergray/50">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="rounded-lg px-5 py-2.5 label-eyebrow border border-bordergray text-charcoal disabled:opacity-40 inline-flex items-center gap-2" data-testid="onboard-back"><ArrowLeft size={14} /> Back</button>
            {step < 4 ? (
              <button onClick={() => canNext && setStep(step + 1)} disabled={!canNext} className="btn-primary rounded-lg px-6 py-2.5 label-eyebrow inline-flex items-center gap-2 disabled:opacity-50" data-testid="onboard-next">Continue <ArrowRight size={14} /></button>
            ) : (
              <button onClick={submit} disabled={saving} className="btn-primary rounded-lg px-6 py-2.5 label-eyebrow inline-flex items-center gap-2 disabled:opacity-60" data-testid="onboard-publish">{saving ? "Publishing..." : <>Publish Profile <Check size={14} /></>}</button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="label-eyebrow text-bodygray">{label}</span><div className="mt-1">{children}</div></label>;
}
