import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

const KEY = "elevateme_cookie_consent";

// Read current consent ("accepted" | "declined" | null). Other modules can call this
// before firing non-essential scripts (analytics).
export function getCookieConsent() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

// Footer/anywhere trigger to reopen the banner.
export function openCookiePreferences() {
  window.dispatchEvent(new Event("open-cookie-preferences"));
}

export default function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener("open-cookie-preferences", reopen);
    return () => window.removeEventListener("open-cookie-preferences", reopen);
  }, []);

  const choose = (value) => {
    try { localStorage.setItem(KEY, value); } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      data-testid="cookie-consent-banner"
      className="fixed bottom-4 inset-x-4 md:left-auto md:right-6 md:max-w-md z-[60] bg-charcoal text-cream rounded-2xl shadow-2xl border border-white/10 p-5"
    >
      <div className="flex items-start gap-3">
        <Cookie size={20} className="text-green shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-cream">We value your privacy</p>
          <p className="text-sm text-cream/75 leading-relaxed mt-1">
            We use essential cookies to run ElevateMe and optional analytics cookies to improve it.
            You can accept or decline non-essential cookies. See our{" "}
            <Link to="/cookies" className="underline hover:text-green">Cookie Policy</Link>.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              onClick={() => choose("accepted")}
              data-testid="cookie-accept-btn"
              className="btn-primary rounded-full px-4 py-2 text-sm font-bold"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => choose("declined")}
              data-testid="cookie-decline-btn"
              className="rounded-full px-4 py-2 text-sm font-bold border border-cream/30 text-cream hover:bg-cream/10 transition-colors"
            >
              Decline non-essential
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
