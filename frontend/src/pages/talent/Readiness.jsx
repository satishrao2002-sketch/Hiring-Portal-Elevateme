import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowUpRight } from "lucide-react";
import api from "@/lib/api";
import { Loading, MatchRing, DimBar } from "@/components/brand";

export default function Readiness() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/talent/dashboard").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <Loading label="Analyzing your readiness..." />;
  const { readiness, holding_back } = data;

  return (
    <div className="px-5 md:px-8 py-8 max-w-4xl">
      <p className="label-eyebrow text-terracotta">Career Readiness</p>
      <h1 className="font-display text-4xl text-charcoal">Know what to improve next.</h1>

      <div className="grid md:grid-cols-[240px_1fr] gap-6 mt-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-charcoal text-cream rounded-2xl p-6 grid place-items-center text-center">
          <div><MatchRing value={readiness.overall} size={120} stroke={9} /><p className="label-eyebrow text-cream/60 mt-3">Overall Readiness</p></div>
        </motion.div>
        <div className="bg-white border border-bordergray rounded-2xl p-6 space-y-3">
          {Object.entries(readiness.components).map(([k, v]) => <DimBar key={k} label={k} value={v} />)}
        </div>
      </div>

      <div className="bg-white border border-bordergray rounded-2xl p-6 mt-6">
        <p className="label-eyebrow text-terracotta mb-3">Your improvement plan</p>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-brandgreen shrink-0 mt-0.5" />
          <div>
            <p className="font-display text-lg text-charcoal">{holding_back.action}</p>
            <p className="text-bodygray text-sm mt-1">Focus area: <span className="font-bold text-charcoal">{holding_back.blocker}</span> · Expected impact: <span className="text-brandgreen font-bold">+{holding_back.expected_gain} points</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
