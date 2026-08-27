export default function Logo({ className = "", dark = false, size = "text-2xl" }) {
  const base = dark ? "#F2F1EE" : "#1A1A1A";
  return (
    <span className={`inline-flex items-baseline font-display ${size} ${className}`} data-testid="elevateme-logo">
      <span style={{ color: base }} className="tracking-tight">Elevate</span>
      <span
        aria-hidden="true"
        className="relative inline-block shrink-0"
        style={{ width: "0.7em", height: "0.7em", margin: "0 0.02em", transform: "translateY(-0.12em)" }}
      >
        <svg viewBox="0 0 32 32" width="100%" height="100%" style={{ display: "block" }}>
          {/* lighter folded facet */}
          <path d="M8 24 L8 9 L23 9 Z" fill="#8FBBA6" />
          {/* bold up-right arrow */}
          <path
            d="M9 23 L23 9 M13.5 9 H23 V18.5"
            fill="none"
            stroke="#3F7D63"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span style={{ color: "#C7493A" }} className="tracking-tight">Me</span>
    </span>
  );
}
