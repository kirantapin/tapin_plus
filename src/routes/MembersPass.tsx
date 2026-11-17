import { useLayoutEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { asset } from "../asset";
import { useAuth } from "../context/auth_context";
import { useEventTracking } from "../context/event_tracking_context";
import { AppQr, AppleGlyph, appHref, device } from "../shell/GetTheApp";
import { CREDIT, PERCENT, PLACES } from "./parents_kit";
import { plusPageBack } from "../model/backTo";

/* ══ THE MEMBER'S PAGE: THE PASS (Sam, 17 Nov 2026, picked A of five:
   "this one") ══════════════════════════════════════════════════════════════
   What /in shows a member. The membership as an object, a dark card with the
   collage inside it, the paper mark, Tapin Plus Blacksburg, Member, their
   last four and Active; who's signed in and the way out under it. Then the
   one thing to do, the Tapin app (a button on a phone, the QR on a
   computer), and what Plus gets them every month: Get $5 to spend at each
   spot, Earn $5 back every week on $10, Save 15% once a day, points on
   everything; the Promise, a person to email, the terms. On a computer the
   card holds the left side and the rest reads beside it.
   The other four takes (Spots, One thing, Home, Start here) were previews
   and went with the pick. Styles: styles/members-v.css. */

const COLLAGE = asset("/collage/blacksburg.webp");
const PAPER_MARK = asset("/brand/plus-paper-mark.svg");
const MAIL = "mailto:support@tapin.app";
const TERMS_URL = "https://go.tapin.app/terms-and-conditions";
const PRIVACY_URL = "https://go.tapin.app/privacy-policy";

/* The last four of the number they signed in with. A local preview with no
   session shows a marked sample. */
function useFour(): string | null {
  const { userSession } = useAuth();
  const d = (userSession?.user?.phone ?? "").replace(/\D/g, "");
  if (d.length >= 4) return d.slice(-4);
  return import.meta.env.DEV ? "0000" : null;
}

const BENEFITS = [
  { big: `Get $${CREDIT}`, rest: "to spend at each spot, every month. No minimum." },
  { big: `Earn $${CREDIT} back`, rest: "every week when you spend $10." },
  { big: `Save ${PERCENT}%`, rest: "on your other orders, once a day." },
  { big: "Points", rest: "on everything." },
];
const FINE = `Credit and ${PERCENT}% off don’t go toward alcohol. One per order: credit or ${PERCENT}% off.`;
const PROMISE = "Use a Tapin benefit each month. If Plus saves you less than you paid, we refund the difference automatically.";

function Back() {
  return (
    <Link className="tpa-glass tpa-signin mv-back" to={plusPageBack()} state={{ from: "members" }}>
      <svg className="tpa-back" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Tapin Plus
    </Link>
  );
}

/** The one action: the app. A button on a phone; on a computer the QR to
 *  scan with the phone, and the App Store link. */
function GetApp({ where, tone = "dark", qr = 120 }: { where: string; tone?: "dark" | "light"; qr?: number }) {
  const { track } = useEventTracking();
  const d = device();
  const tap = () => track("plus_get_app_clicked", { where, device: d });
  if (d === "desktop")
    return (
      <div className={`mv-scan mv-scan-${tone}`}>
        <AppQr className="mv-qr" size={qr} />
        <p>
          <b>Scan with your iPhone’s camera</b>
          <a href={appHref(d)} target="_blank" rel="noopener noreferrer" onClick={tap}>
            Or open the App Store
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M8 16 16 8M9.5 8H16v6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </p>
      </div>
    );
  return (
    <a className={`mv-cta mv-cta-${tone}`} href={appHref(d)} rel="noopener noreferrer" onClick={tap}>
      {d === "android" ? null : <AppleGlyph />}
      {d === "android" ? "Open Tapin" : "Get the Tapin app"}
    </a>
  );
}

/** Who's signed in, and the way out. */
function Account({ four, className = "" }: { four: string | null; className?: string }) {
  const { userSession, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <p className={`mv-acct ${className}`}>
      <span>{four ? <>Signed in as <span className="tnum">••• {four}</span></> : "Signed in"}</span>
      {userSession ? (
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
      ) : null}
    </p>
  );
}

/** The promise, a person, the terms: the page's last word in every version. */
function Foot({ onMail }: { onMail: () => void }) {
  return (
    <footer className="mv-foot">
      <p className="mv-promise">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="m8.8 12.2 2.2 2.2 4.4-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>
          <b>The Plus Promise.</b> {PROMISE}
        </span>
      </p>
      <p className="mv-help">
        Questions about your plan, your credit or a refund?{" "}
        <a href={MAIL} onClick={onMail}>
          support@tapin.app
        </a>
      </p>
      <p className="mv-fine">{FINE}</p>
      <p className="mv-links">
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
          Terms
        </a>
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          Privacy
        </a>
      </p>
    </footer>
  );
}

function Logos({ size = 40 }: { size?: number }) {
  return (
    <ul className="mv-logos" aria-label={`${PLACES.length} Blacksburg spots`}>
      {PLACES.map((p) => (
        <li key={p.id}>
          <img src={p.logo} alt={p.name} width={size} height={size} decoding="async" />
        </li>
      ))}
    </ul>
  );
}

function Benefits({ className = "" }: { className?: string }) {
  return (
    <ul className={`mv-ben ${className}`}>
      {BENEFITS.map((b) => (
        <li key={b.big}>
          <b className="tnum">{b.big}</b>
          <span>{b.rest}</span>
        </li>
      ))}
    </ul>
  );
}

function Shell({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = "tpa";
    window.scrollTo(0, 0);
    const t = document.title;
    document.title = "Your account · Tapin Plus";
    return () => {
      delete root.dataset.surface;
      document.title = t;
    };
  }, []);
  return <div className="tpa mv mv-a">{children}</div>;
}

function VersionA({ four, onMail }: { four: string | null; onMail: () => void }) {
  return (
    <Shell>
      <div className="mv-a-top">
        <Back />
      </div>
      <div className="mv-a-grid">
        <div className="mv-a-left">
          <section className="mv-pass" aria-label="Your Tapin Plus membership">
            <img className="mv-pass-art" src={COLLAGE} alt="" decoding="async" />
            <div className="mv-pass-head">
              <img className="mv-pass-mark" src={PAPER_MARK} alt="" width="56" height="44" decoding="async" />
              <p className="mv-pass-live">
                <i aria-hidden="true" />
                Active
              </p>
            </div>
            <div className="mv-pass-foot">
              <p className="mv-pass-name">
                Tapin Plus
                <span>Blacksburg</span>
              </p>
              <p className="mv-pass-who">
                <span>Member</span>
                <b className="tnum">{four ? `••• ${four}` : "Signed in"}</b>
              </p>
            </div>
          </section>
          <Account four={four} className="mv-a-acct" />
        </div>
        <div className="mv-a-right">
          <h1 className="mv-a-h">You’re a Plus member</h1>
          <p className="mv-a-lede">Your credit, {PERCENT}% off and points live in the Tapin app. Sign in there with the number you joined with.</p>
          <GetApp where="members_pass" />
          <h2 className="mv-h2">Every month with Plus</h2>
          <Benefits />
          <Logos />
          <Foot onMail={onMail} />
        </div>
      </div>
    </Shell>
  );
}

export function MembersPass() {
  const four = useFour();
  const { track } = useEventTracking();
  return <VersionA four={four} onMail={() => track("members_email")} />;
}
