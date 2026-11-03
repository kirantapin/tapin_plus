import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { asset } from "../asset";

/* ══ MEMBERS, IN THE APP'S LOOK (Sam, 3 Nov 2026: "redirect + rebuild") ═════
   /in was the presale's receipt: a "Your name / Early-ish Bird / Halloween
   2026" card, "No seat on this device", and a sign-in for a checkout that has
   closed. Plus lives in the Tapin app now, so this page says where to manage
   it and how to reach a person. Same band, sheet and modules as the home page
   (styles/plus-app.css). */

const PAPER_MARK = asset("/brand/plus-paper-mark.svg");
const COLLAGE = asset("/collage/blacksburg.webp");
const TAPIN_HOME = "https://www.tapin.app/discovery?zone=blacksburg";

export default function Members() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = "tpa";
    return () => {
      delete root.dataset.surface;
    };
  }, []);

  return (
    <div className="tpa tpa-members">
      <header className="tpa-band">
        <img className="tpa-band-art" src={COLLAGE} alt="" decoding="async" />
        <div className="tpa-band-top">
          <Link className="tpa-glass tpa-signin" to="/">
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
        <section className="tpa-module tpa-offer" aria-label="Your membership">
          <img className="tpa-paper" src={PAPER_MARK} alt="" width="112" height="89" decoding="async" />
          {/* Early-access memberships bought here are not in the app yet (Sam,
              3 Nov 2026, after talking to Kiran), so this page promises
              nothing about where they show up: it says they are on file and
              who to ask. */}
          <p className="tpa-lead">Joined early access? You’re on file.</p>
          <p className="tpa-price-then">
            Your membership is saved with us. Every Plus place takes orders on Tapin. For anything about your plan,
            your credit or a refund, email support@tapin.app and a person will sort it out.
          </p>
          {/* Sam, 3 Nov 2026: "the CTA would be to download the tapin app or go
              to www.tapin.app". www.tapin.app until the App Store link exists. */}
          <a className="tpa-cta" href={TAPIN_HOME}>
            Go to www.tapin.app
          </a>
          <a className="tpa-try" href="mailto:support@tapin.app">
            Email support@tapin.app
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
                <span>Save what you spend on Plus, or your money back. Ask for a refund and it’s auto-approved.</span>
              </span>
            </li>
          </ul>
        </section>

        <footer className="tpa-foot">
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
