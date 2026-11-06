import { useLayoutEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { asset } from "../asset";
import AccountLine from "../shell/AccountLine";
import { AppCard, appHref, device } from "../shell/GetTheApp";
import { OfferBar } from "../shell/WelcomeOffer";
import { useEventTracking } from "../context/event_tracking_context";
import MemberDot from "../shell/MemberDot";
import { useAuth } from "../context/auth_context";
/* The parents flow (5 Nov 2026): "Ask a parent to cover it" for a signed-in non-member. */
import AskParent from "../shell/AskParent";

/* ══ MEMBERS, IN THE APP'S LOOK (Sam, 3 Nov 2026: "redirect + rebuild") ═════
   /in was the presale's receipt: a "Your name / Early-ish Bird / Halloween
   2026" card, "No seat on this device", and a sign-in for a checkout that has
   closed. Plus lives in the Tapin app now, so this page says where to manage
   it and how to reach a person. Same band, sheet and modules as the home page
   (styles/plus-app.css). */

const PAPER_MARK = asset("/brand/plus-paper-mark.svg");
const COLLAGE = asset("/collage/blacksburg.webp");
const TAPIN_HOME = "https://www.tapin.app/discovery?zone=blacksburg";

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ease = "cubic-bezier(.22,1,.36,1)";

export default function Members() {
  const page = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { subscribed } = useAuth();
  const { track } = useEventTracking();
  /* A signed-in member sees their status; ?member previews it, local dev only. */
  const member = subscribed === true || (import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("member"));
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = "tpa";
    window.scrollTo(0, 0);
    /* A fade with a very slight settle, not a slide (Sam, 3 Nov 2026: "more
       of like a smooth fade. And like a zoom out / zoom in very subtle"): the
       page arrives a touch large and eases to size, and leaves the same way
       (PlusHome does the other half). */
    if (!still()) page.current?.animate?.([{ opacity: 0, transform: "scale(1.02)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: ease });
    return () => {
      delete root.dataset.surface;
    };
  }, []);
  const back = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = page.current;
    if (!el || still() || typeof el.animate !== "function" || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const run = el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(1.02)" }], { duration: 200, easing: "ease-in", fill: "forwards" });
    run.onfinish = () => navigate("/", { state: { from: "members" } });
  };

  return (
    <div ref={page} className="tpa tpa-members">
      {/* The offer's clock, as on home, for anyone not yet a member. */}
      {member ? null : <OfferBar />}
      <header className="tpa-band">
        <img className="tpa-band-art" src={COLLAGE} alt="" decoding="async" />
        <div className="tpa-band-top">
          <Link className="tpa-glass tpa-signin" to="/" onClick={back}>
            <svg className="tpa-back" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Tapin Plus
          </Link>
        </div>
        <div className="tpa-band-title">
          <h1>Members</h1>
        </div>
      </header>

      <main className="tpa-sheet">
        {/* Who you are with Plus: a member's live status, or the note for
            early-access buyers. Then the app, which is where Plus is used
            (Sam, 4 Nov 2026: "should include the same get the tapin app
            callout"); on a computer the two sit side by side, the app card
            held in view as the home page's offer is. */}
        <section className="tpa-module tpa-offer tpa-members-status" aria-label="Your membership">
          <img className="tpa-paper" src={PAPER_MARK} alt="" width="112" height="89" decoding="async" />
          {member ? (
            <>
              <p className="tpa-member-kicker">
                <MemberDot />
                Plus is on
              </p>
              <h2 className="tpa-h2">You’re a Plus member</h2>
              <p className="tpa-price-then">
                For anything about your plan, your credit or a refund, email support@tapin.app and a person will sort
                it out.
              </p>
            </>
          ) : (
            <>
              {/* Early-access memberships bought here are not in the app yet
                  (Sam, 3 Nov 2026, after talking to Kiran), so this page
                  promises nothing about where they show up: it says they are
                  on file and who to ask. */}
              <p className="tpa-lead">Joined early access? You’re on file.</p>
              <p className="tpa-price-then">
                Your membership is saved with us. Every Plus place takes orders on Tapin. For anything about your plan,
                your credit or a refund, email support@tapin.app and a person will sort it out.
              </p>
            </>
          )}
          <div className="tpa-members-acts">
          <a className="tpa-try tpa-members-mail" href="mailto:support@tapin.app">
            Email support@tapin.app
          </a>
          {/* The app as the second way on (Sam, 5 Nov 2026: "add 'download
              the app' as a second button here"). */}
          <a
            className="tpa-try tpa-members-mail tpa-members-dl"
            href={appHref()}
            target={device() === "desktop" ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={() => track("plus_get_app_clicked", { where: "members_status", device: device() })}
          >
            Download the app
          </a>
          </div>
          {/* THE PARENTS FLOW (Sam, 5 Nov 2026; docs/parents/API.md): a quiet
              "Ask a parent to cover it" for a signed-in student who isn't a
              member yet. AskParent hides itself for anyone else. */}
          {member ? null : <AskParent where="members" className="askp-members" />}
        </section>

        <section className="tpa-module tpa-members-app" aria-label="Get the Tapin app">
          <AppCard where="members" line="Your $5 back, 15% off and points are in the app. Sign in with the number you joined with." />
          {/* www.tapin.app stays, quieter: the app card leads now. */}
          <a className="tpa-members-web" href={TAPIN_HOME}>
            Or order on www.tapin.app
          </a>
        </section>

        <section className="tpa-module" aria-labelledby="tpa-help">
          <h2 id="tpa-help" className="tpa-h2">
            Good to know
          </h2>
          <ul className="tpa-rows">
            <li>
              <span className="tpa-well" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="m8.8 12.2 2.2 2.2 4.4-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                <b>The Plus Promise</b>
                <span>Save more than Plus costs each month, or get your money back. Ask for a refund and it’s auto-approved.</span>
              </span>
            </li>
          </ul>
        </section>

        <footer className="tpa-foot">
          <AccountLine where="members_foot" />
          <p className="tpa-links">
            <a href="https://go.tapin.app/terms-and-conditions" target="_blank" rel="noopener noreferrer">
              Terms
            </a>
            <a href="https://go.tapin.app/privacy-policy" target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
