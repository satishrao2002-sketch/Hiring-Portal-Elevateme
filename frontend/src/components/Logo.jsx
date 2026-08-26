import { ArrowUpRight } from "lucide-react";

export default function Logo({ className = "", dark = false, size = "text-2xl" }) {
  const base = dark ? "#F2F1EE" : "#1A1A1A";
  return (
    <span className={`inline-flex items-center font-display ${size} ${className}`} data-testid="elevateme-logo">
      <span style={{ color: base }} className="tracking-tight">Elevate</span>
      <span className="relative inline-flex items-center justify-center mx-[1px]">
        <ArrowUpRight size={18} strokeWidth={3.2} color="#488A6D" className="-mb-1" />
      </span>
      <span style={{ color: "#C7493A" }} className="tracking-tight">Me</span>
    </span>
  );
}
