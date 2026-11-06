import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useEventTracking } from "../context/event_tracking_context";
import { FlatMark, GLYPHS, Glyph } from "./parents_kit";

/* ══ THE PARENT'S ACCOUNT PAGE (/parents/account; Sam, 6 Nov 2026: "add a
   member login at the top right ... That takes parents to a page where they
   can manage their subscription for their kid - only way to manage it at the
   moment is 1. email support@tapin.app or 2. have their kid cancel the
   subscription in the app") ═══════════════════════════════════════════════
   No sign-in yet: it says, plainly, the two ways to change or cancel today.
   In the app's look (styles/plus-app.css .tpa, styles/parent-pages.css
   .ppm), the same as the manage page. */

const TERMS_URL = "https://go.tapin.app/terms-and-conditions";
const PRIVACY_URL = "https://go.tapin.app/privacy-policy";
const MAIL = `mailto:support@tapin.app?subject=${encodeURIComponent("My student’s Tapin Plus")}&body=${encodeURIComponent(
  "Hi Tapin,\n\nI’d like to change / cancel my student’s Tapin Plus.\n\nMy name:\nMy mobile:\nMy student’s first name:\n\nThanks!",
)}`;

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function ParentAccount() {
  const { track } = useEventTracking();
  const page = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = "tpa";
    window.scrollTo(0, 0);
    const title = document.title;
    document.title = "Your account · Tapin Plus";
    if (!still())
      page.current?.animate?.([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], {
        duration: 340,
        easing: "cubic-bezier(.22,1,.36,1)",
      });
    return () => {
      delete root.dataset.surface;
      document.title = title;
    };
  }, []);

  return (
    <div ref={page} className="tpa ppm ppa">
      <header className="ppm-top ppa-top">
        <Link to="/parents" className="ppa-back" aria-label="Back to Tapin Plus for parents">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span className="ppa-brand">
          <FlatMark className="ppa-mark" />
          Tapin Plus
        </span>
      </header>

      <main className="ppm-main">
        <section className="tpa-module ppm-card ppa-intro" aria-labelledby="ppa-title">
          <h1 id="ppa-title" className="ppm-h1">
            Manage your student’s Plus
          </h1>
          <p className="ppm-line">There are two ways to change or cancel it.</p>
        </section>

        {/* The two ways, side by side on a computer: they're alternatives,
            not steps (parent-pages.css). */}
        <div className="ppa-ways">
        <section className="tpa-module ppm-card ppa-way" aria-labelledby="ppa-mail">
          <span className="ppa-glyph" aria-hidden="true">
            <Glyph d={GLYPHS.mail} />
          </span>
          <h2 id="ppa-mail" className="ppa-h2">
            Email us
          </h2>
          <p className="ppm-line">
            Write to support@tapin.app with your name, the mobile you signed up with and your student’s first name, and a person will change or
            cancel it for you.
          </p>
          <a className="tpa-cta ppa-cta" href={MAIL} onClick={() => track("parent_account_email")}>
            Email support@tapin.app
          </a>
        </section>

        <section className="tpa-module ppm-card ppa-way" aria-labelledby="ppa-app">
          <span className="ppa-glyph" aria-hidden="true">
            <Glyph d={GLYPHS.phone} />
          </span>
          <h2 id="ppa-app" className="ppa-h2">
            Your student cancels in the app
          </h2>
          <p className="ppm-line">
            They can cancel their Plus in the Tapin app. If they do, your billing stops.
          </p>
        </section>
        </div>

        <p className="ppa-note">
          If your student hasn’t signed in within 14 days of signing them up, we cancel it and refund you in full.
        </p>

        <footer className="tpa-foot ppm-foot">
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
