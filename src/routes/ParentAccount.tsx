import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import { AppCard } from "../shell/GetTheApp";
import { GLYPHS, Glyph } from "./parents_kit";

/* ══ THE PARENT'S ACCOUNT PAGE (/parents/account; Sam, 6 Nov 2026: "add a
   member login at the top right ... That takes parents to a page where they
   can manage their subscription for their kid - only way to manage it at the
   moment is 1. email support@tapin.app or 2. have their kid cancel the
   subscription in the app") ═══════════════════════════════════════════════
   No sign-in yet: it says, plainly, how to change or cancel today.
   In the students' Members page's look (Sam, 8 Nov 2026: "can it look
   somewhat like this"): the same band, sheet, modules and two-column frame
   (routes/Members.tsx, styles/plus-app.css .tpa-members), with the parents'
   facts and glyphs; parent-pages.css .ppa holds the few differences. The app
   card is framed for the student, whose Plus it is. No offer clock: that is
   the student offer. */

const PAPER_MARK = asset("/brand/plus-paper-mark.svg");
const COLLAGE = asset("/collage/blacksburg.webp");
const TERMS_URL = "https://go.tapin.app/terms-and-conditions";
const PRIVACY_URL = "https://go.tapin.app/privacy-policy";
const MAIL = `mailto:support@tapin.app?subject=${encodeURIComponent("My student’s Tapin Plus")}&body=${encodeURIComponent(
  "Hi Tapin,\n\nI’d like to change / cancel my student’s Tapin Plus.\n\nMy name:\nMy mobile:\nMy student’s first name:\n\nThanks!",
)}`;
/* The manage page keeps its key in this tab's session once opened from the
   parent's text (ParentManage.tsx, model/redact.ts takeKey). Only then is
   there a manage page to link to; otherwise the page says where the link is. */
const MANAGE_KEY = "tp_parent_manage_v1";
const hasManageKey = () => {
  try {
    return typeof window !== "undefined" && !!window.sessionStorage.getItem(MANAGE_KEY);
  } catch {
    return false;
  }
};

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ease = "cubic-bezier(.22,1,.36,1)";

const ROWS: ReadonlyArray<{ glyph: keyof typeof GLYPHS; title: string; line?: string }> = [
  { glyph: "refund", title: "Full refund if they don’t save what you spent", line: "Email us to ask." },
  { glyph: "bell", title: "An email before each bill", line: "A few days ahead." },
  { glyph: "mail", title: "Cancel anytime by email", line: "A person does it for you." },
  { glyph: "phone", title: "They can cancel in the app", line: "Your billing stops and we’ll text you." },
];

export default function ParentAccount() {
  const { track } = useEventTracking();
  const navigate = useNavigate();
  const page = useRef<HTMLDivElement | null>(null);
  const [manage] = useState(hasManageKey);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = "tpa";
    window.scrollTo(0, 0);
    const title = document.title;
    document.title = "Your account · Tapin Plus";
    /* Members' arrival: a fade with a very slight settle. */
    if (!still()) page.current?.animate?.([{ opacity: 0, transform: "scale(1.02)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: ease });
    return () => {
      delete root.dataset.surface;
      document.title = title;
    };
  }, []);
  const back = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = page.current;
    if (!el || still() || typeof el.animate !== "function" || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const run = el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(1.02)" }], { duration: 200, easing: "ease-in", fill: "forwards" });
    run.onfinish = () => navigate("/parents");
  };

  return (
    <div ref={page} className="tpa tpa-members ppa">
      <header className="tpa-band">
        <img className="tpa-band-art" src={COLLAGE} alt="" decoding="async" />
        <div className="tpa-band-top">
          <Link className="tpa-glass tpa-signin" to="/parents" onClick={back}>
            <svg className="tpa-back" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Tapin Plus
          </Link>
        </div>
        <div className="tpa-band-title">
          <h1>Your account</h1>
        </div>
      </header>

      <main className="tpa-sheet">
        <section className="tpa-module tpa-offer tpa-members-status" aria-label="Your student’s Plus">
          <img className="tpa-paper" src={PAPER_MARK} alt="" width="112" height="89" decoding="async" />
          <p className="tpa-lead">Bought them a care package? You’re on file.</p>
          <p className="tpa-price-then">
            {manage
              ? "To change, skip or cancel, email us and a person will sort it out, or manage it here."
              : "To change, skip or cancel, email us and a person will sort it out. Your texts from us also have a link to manage it."}
          </p>
          <div className="tpa-members-acts">
            <a className="tpa-try tpa-members-mail" href={MAIL} onClick={() => track("parent_account_email")}>
              Email support@tapin.app
            </a>
            {/* Only when this tab already holds the key from the text. */}
            {manage ? (
              <Link className="tpa-try tpa-members-mail" to="/parents/manage" onClick={() => track("parent_account_manage")}>
                Manage their Plus
              </Link>
            ) : null}
          </div>
        </section>

        {/* The app is the student's: their Plus lives there. */}
        <section className="tpa-module tpa-members-app" aria-label="Their Plus is in the Tapin app">
          <AppCard where="parent_account" line="Their Plus is in the Tapin app. They sign in with the number you gave us." />
        </section>

        <section className="tpa-module" aria-labelledby="ppa-help">
          <h2 id="ppa-help" className="tpa-h2">
            Good to know
          </h2>
          <ul className="tpa-rows">
            {ROWS.map((r) => (
              <li key={r.glyph}>
                <span className="tpa-well" aria-hidden="true">
                  <Glyph d={GLYPHS[r.glyph]} className="tpa-well-mark" />
                </span>
                <span>
                  <b>{r.title}</b>
                  {r.line ? <span>{r.line}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="tpa-foot">
          <p className="tpa-links">
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
              Terms
            </a>
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
