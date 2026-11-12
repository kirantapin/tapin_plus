import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { asset } from "../asset";
import { useAuth } from "../context/auth_context";
import { useEventTracking } from "../context/event_tracking_context";
import { AppQr, AppleGlyph, appHref, device } from "./GetTheApp";
import { CREDIT, GLYPHS, Glyph, PERCENT, PLACES } from "../routes/parents_kit";

/* ══ THE ACCOUNT PAGE, ONE FRAME FOR BOTH (Sam, 9 Nov 2026: "redesign the
   account page for both the parent page and the main page ... relatively
   consistent design across the two") ═════════════════════════════════════
   /in (students) and /parents/account share this: a short strip of the
   Blacksburg collage with the way back, then one column. The account card
   sits over the strip's lower edge and says who you are here and the one
   thing to do; "In the app" is where Plus is used (a QR on a computer, a
   button on a phone); "Good to know" ends with the way to reach a person.
   No two-column frame, no card inside a card. Styles: styles/account.css. */

const COLLAGE = asset("/collage/blacksburg.webp");
const PAPER_MARK = asset("/brand/plus-paper-mark.svg");
const APP_ICON = asset("/brand/tapin-app-icon.png");
const TERMS_URL = "https://go.tapin.app/terms-and-conditions";
const PRIVACY_URL = "https://go.tapin.app/privacy-policy";

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ease = "cubic-bezier(.22,1,.36,1)";

export type Tone = "good" | "wait" | "warn" | "off";

/** The page: the strip, the way back, one column, the foot. */
export function AccountFrame({
  back,
  backState,
  docTitle,
  bar,
  children,
}: {
  back: string;
  backState?: unknown;
  docTitle: string;
  bar?: ReactNode;
  children: ReactNode;
}) {
  const page = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = "tpa";
    window.scrollTo(0, 0);
    const title = document.title;
    document.title = docTitle;
    /* A fade with a very slight settle (Sam, 3 Nov 2026), as before. */
    if (!still()) page.current?.animate?.([{ opacity: 0, transform: "scale(1.02)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: ease });
    return () => {
      delete root.dataset.surface;
      document.title = title;
    };
  }, [docTitle]);
  const leave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = page.current;
    if (!el || still() || typeof el.animate !== "function" || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const run = el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(1.02)" }], { duration: 200, easing: "ease-in", fill: "forwards" });
    run.onfinish = () => navigate(back, { state: backState });
  };
  return (
    <div ref={page} className="tpa acc">
      {bar}
      <div className="acc-col">
        <header className="acc-band">
          <img className="acc-band-art" src={COLLAGE} alt="" decoding="async" />
          <Link className="tpa-glass tpa-signin acc-back" to={back} state={backState} onClick={leave}>
            <svg className="tpa-back" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Tapin Plus
          </Link>
        </header>
        <main className="acc-main">
          {children}
          <footer className="acc-foot">
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
              Terms
            </a>
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}

/** The account card: the Plus mark, the heading, a status under it, a line,
    then whatever the page needs (an action, the gifts), then who is signed in. */
export function AccountCard({
  title,
  status,
  line,
  children,
}: {
  title: ReactNode;
  status?: { tone: Tone; label: string } | null;
  line?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="acc-card" aria-labelledby="acc-h">
      <div className="acc-who">
        <img className="acc-mark" src={PAPER_MARK} alt="" width="64" height="51" decoding="async" />
        <div className="acc-who-words">
          <h1 id="acc-h">{title}</h1>
          {status ? (
            <p className="acc-status" data-tone={status.tone}>
              <i aria-hidden="true" />
              {status.label}
            </p>
          ) : null}
        </div>
      </div>
      {line ? <p className="acc-line">{line}</p> : null}
      {children}
      <SignedIn />
    </section>
  );
}

const lastFour = (phone: string | undefined) => {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : null;
};

/** "Signed in as ••• 1234 · Sign out" at the card's foot; nothing signed out. */
function SignedIn() {
  const { userSession, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!userSession) return null;
  const four = lastFour(userSession.user?.phone);
  return (
    <p className="acc-signed">
      <span>{four ? <>Signed in as <span className="tnum">••• {four}</span></> : "Signed in"}</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void logout().finally(() => setBusy(false));
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </p>
  );
}

/** "In the app" (Sam, 10 Nov 2026: "redesign this on the member page ... for
    parents and regular"). What's waiting in the app, shown, not said: the
    five spots with their $5 each, then 15% off and points. Then the way in:
    a scan tile on a computer, the button on a phone, and the one thing to
    know when they open it (`signIn`). */
export function AppPanel({ where, signIn, they = false }: { where: string; signIn: string; they?: boolean }) {
  const { track } = useEventTracking();
  const d = device();
  const tap = () => track("plus_get_app_clicked", { where, device: d });
  return (
    <section className="acc-section" aria-labelledby="acc-app-h">
      <h2 id="acc-app-h" className="acc-h2">
        In the app
      </h2>
      <div className="acc-panel acc-app" data-device={d}>
        {/* What's waiting and the way in: side by side on a wide card, one
            above the other on a narrow one (account.css). */}
        <div className="acc-app-wide">
        <div className="acc-app-main">
          <div className="acc-app-head">
            <img className="acc-app-icon" src={APP_ICON} alt="" width="48" height="48" decoding="async" />
            <p className="acc-app-name">
              <b>Tapin</b>
              <span>{d === "android" ? "On the web for Android" : "Free on the App Store"}</span>
            </p>
          </div>
          <ul className="acc-app-spots" aria-label={`$${CREDIT} credit at each of ${PLACES.length} spots, every month`}>
            {PLACES.map((p) => (
              <li key={p.id}>
                <img src={p.logo} alt="" width="44" height="44" decoding="async" loading="lazy" />
                <b className="tnum" aria-hidden="true">
                  ${CREDIT}
                </b>
              </li>
            ))}
          </ul>
          <ul className="acc-app-perks">
            <li>
              <b className="tnum">${CREDIT} credit</b> at each spot, every month
            </li>
            <li>
              <b className="tnum">{PERCENT}% off</b> {they ? "their" : "your"} other orders, once a day
            </li>
            <li>
              <b>Points</b> on everything
            </li>
          </ul>
        </div>
        {d === "desktop" ? (
          <div className="acc-app-scan">
            <AppQr className="acc-app-qr" size={112} />
            <p>Scan with {they ? "an" : "your"} iPhone’s camera</p>
            <a href={appHref(d)} target="_blank" rel="noopener noreferrer" onClick={tap}>
              Or open the App Store
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M8 16 16 8M9.5 8H16v6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        ) : (
          <a className="acc-btn acc-btn-dark acc-app-get" href={appHref(d)} rel="noopener noreferrer" onClick={tap}>
            {d === "android" ? null : <AppleGlyph />}
            {d === "android" ? "Open Tapin" : "Get the app"}
          </a>
        )}
        </div>
        <p className="acc-app-sign">
          <Glyph d={GLYPHS.phone} className="acc-glyph" />
          {signIn}
        </p>
      </div>
    </section>
  );
}

/** "Good to know": a few plain facts, then the email row. */
export function InfoPanel({
  rows,
  mail,
  onMail,
}: {
  rows: ReadonlyArray<{ key: string; icon: ReactNode; title: string; line?: string }>;
  mail: string;
  onMail?: () => void;
}) {
  return (
    <section className="acc-section" aria-labelledby="acc-info-h">
      <h2 id="acc-info-h" className="acc-h2">
        Good to know
      </h2>
      <ul className="acc-panel acc-list">
        {rows.map((r) => (
          <li key={r.key}>
            <span className="acc-ico" aria-hidden="true">
              {r.icon}
            </span>
            <span className="acc-list-words">
              <b>{r.title}</b>
              {r.line ? <span>{r.line}</span> : null}
            </span>
          </li>
        ))}
        <li className="acc-mail">
          <a href={mail} onClick={onMail}>
            <span className="acc-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="m4.5 7 7.5 6 7.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="acc-list-words">
              <b>Questions? Email us</b>
              <span>support@tapin.app. A person will sort it out.</span>
            </span>
            <svg className="acc-go" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </li>
      </ul>
    </section>
  );
}
