import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import api from "@/lib/api";
import { Loading } from "@/components/brand";

const FUNNEL = [
  { stage: "Matches", value: 36 }, { stage: "Shortlisted", value: 18 },
  { stage: "Interviews", value: 11 }, { stage: "Final Rounds", value: 6 },
  { stage: "Offers", value: 4 }, { stage: "Hires", value: 3 },
];
const TREND = [
  { m: "Jan", placements: 2 }, { m: "Feb", placements: 3 }, { m: "Mar", placements: 5 },
  { m: "Apr", placements: 4 }, { m: "May", placements: 7 }, { m: "Jun", placements: 9 },
];

export default function AdminAnalytics() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/command-center").then((r) => setD(r.data)).catch(() => {}); }, []);
  if (!d) return <Loading label="Loading analytics..." />;

  return (
    <div className="px-5 md:px-8 py-8 max-w-5xl">
      <p className="label-eyebrow text-terracotta">Analytics</p>
      <h1 className="font-display text-4xl text-charcoal mb-6">Marketplace performance</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-bordergray rounded-2xl p-6">
          <p className="label-eyebrow text-bodygray mb-4">Placement Funnel</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={FUNNEL}>
              <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#747474" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: "#F2F1EE" }} />
              <Bar dataKey="value" fill="#C7493A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-bordergray rounded-2xl p-6">
          <p className="label-eyebrow text-bodygray mb-4">Placements Over Time</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE8E3" vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#747474" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="placements" stroke="#488A6D" strokeWidth={3} dot={{ r: 4, fill: "#488A6D" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {[["Placement Rate", `${d.placement_rate}%`], ["Match Acceptance", "3.2×"], ["Interview Conversion", "42%"], ["Offer Conversion", "36%"]].map(([l, v]) => (
          <div key={l} className="bg-cream border border-bordergray rounded-xl p-5"><p className="font-display text-3xl text-charcoal">{v}</p><p className="label-eyebrow text-bodygray mt-1">{l}</p></div>
        ))}
      </div>
    </div>
  );
}
