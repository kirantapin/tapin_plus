import TapInLogo from "./TapInLogo";

/**
 * The legal footer. Sam, 14 Sep 2026: "add the following to our footer" — the
 * three documents at go.tapin.app. TRUTH §10 banned linking terms or a privacy
 * policy while neither existed; both exist now (checked: all three return 200),
 * so the ban's reason is gone and scripts/guards.py flags only RELATIVE
 * terms/privacy links — a link to a page this build does not have.
 *
 * Rendered on the three landing pages (/, /reserve, /in). Not on the deck,
 * which is a fixed sheet, and not inside the app preview.
 */
const LINKS = [
  { label: "Terms and Conditions", href: "https://go.tapin.app/terms-and-conditions" },
  { label: "Privacy Policy", href: "https://go.tapin.app/privacy-policy" },
  { label: "Cookie Policy", href: "https://go.tapin.app/cookie-policy" },
];

export default function SiteFoot({ brand = false }: { brand?: boolean }) {
  return (
    <footer className={`site-foot${brand ? " has-brand" : ""}`}>
      {/* The wordmark and the place, on the checkout only — moved here from
          the modal's header (Sam, 15 Sep 2026), where they doubled the card. */}
      {brand ? (
        <p className="foot-brand">
          <TapInLogo className="foot-logo" />
          <span className="sheet-place">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"
                fill="none" stroke="currentColor" strokeWidth="1.9"
                strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
            </svg>
            Blacksburg
          </span>
        </p>
      ) : null}
      <nav aria-label="Legal">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
