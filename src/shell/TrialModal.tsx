import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { campaignTrials, campaignVenue } from "../model/campaign";
import { useReserveCta } from "./useReserveCta";
import { monthlyToday, standardAfter } from "../model/content";

/**
 * HOW TO TRY IT FREE — the campaign page's one modal.
 *
 * Sam, 20 Sep 2026: "when I click on try it once for free, instead of
 * scrolling to a section on the page (which we can remove), we can instead
 * have a modal pop up that shows me how I can try this for free (it'll take
 * me to the live coffeeholics page with the deals, orders go straight to the
 * counter as a ticket when placed), and then there should be a call out (want
 * this every week? get early access before price goes up to $14.99)."
 *
 * ══ WHY A MODAL BEATS THE SECTION IT REPLACES ══════════════════════════════
 * The docked button used to scroll to a panel further down the page. That
 * panel held the two links and nothing else, so the reader arrived somewhere
 * that answered "which offer" without ever answering "and then what happens" —
 * and a button that moves the page rather than doing something is the weakest
 * thing a landing page can put in its most valuable slot.
 *
 * Here the answer is the content: three steps, then the two doors, then the
 * reason to stop renting the trial and buy the thing.
 *
 * ══ THE STEPS ARE NUMBERED BECAUSE THEY ARE A SEQUENCE ═════════════════════
 * Not as decoration. You open their page, you order, you collect — in that
 * order, and the third step is the one nobody expects ("straight to the
 * counter as a ticket"), which is exactly why it has to be last rather than
 * folded into the second.
 *
 * ══ NO `data-lit` ══════════════════════════════════════════════════════════
 * The page under this is already light and carries Coffeeholics' own tinted
 * ramp. Inheriting it keeps the modal in the same room as the page; adding
 * `data-lit` would drop the house neutral on top of the merchant's tint and
 * the two whites would disagree by a few points of hue.
 */
export default function TrialModal({ onClose }: { onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const venue = campaignVenue;
  /* ══ THE SILO HELD ON THE PAGE AND BROKE IN HERE ═══════════════════════
     Sam, 20 Sep 2026: "when I clicked on get early access again it took me
     to the main tapin page checkout not the one for coffeeholics."

     `/reserve` is a layer over `state.background ?? "/"`, and this Link was
     written as a bare `to="/reserve"` — so it took the fallback and put the
     pitch under the sheet. The page's own two buttons have carried the
     background since the silo was asked for; this one was added later and
     did not. It uses the same hook now, which is the point of the hook. */
  const cta = useReserveCta();

  const close = () => {
    if (closing) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, 200);
  };

  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ══ HEADINGS ONLY ═══════════════════════════════════════════════════════
     Sam, 20 Sep 2026: "this is too confusing, but I like the steps involved
     here — can you just use /impeccable polish to make it a bit less wordy."

     Each step carried a sentence under it and two of the three were saying
     what the buttons below already say in their own words: step one described
     what tapping an offer does, step two restated both offers' terms, and the
     offers then restated them again. Ninety-five words to say three things.

     So the sentences are gone and the third heading absorbs the one fact that
     was only ever in them — the ticket — because that is the part nobody
     expects and the only reason this list is longer than one line. */
  const steps = [
    { k: "open", h: `Open ${venue?.name ?? "the shop"} on TapIn` },
    { k: "order", h: "Order what you want" },
    { k: "collect", h: "It goes straight to the counter as a ticket" },
  ];

  /* On <body>: the campaign page's panels are transformed surfaces, and a
     fixed scrim inside a transformed ancestor is clipped to that ancestor. */
  return createPortal(
    <div className={`ct-root${closing ? " is-closing" : ""}`} onClick={close}>
      <div className="ct-scrim" aria-hidden="true" />
      <div
        className="ct"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ct-title"
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ct-head">
          <h2 id="ct-title">Try it once, free</h2>
          <button type="button" className="ct-close" onClick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="m7 7 10 10M17 7 7 17"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="ct-body">
          <ol className="ct-steps">
            {steps.map((s, i) => (
              <li key={s.k}>
                <span className="ct-num" aria-hidden="true">
                  {i + 1}
                </span>
                <b>{s.h}</b>
              </li>
            ))}
          </ol>

          <ul className="ct-trials">
            {campaignTrials.map((t) => (
              <li key={t.id}>
                <a
                  className="action action-ghost cg-trial"
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* The label alone. "Spend $10, get $5 credit" is a whole
                      claim, and the line under it repeated the step above. */}
                  <b>{t.label}</b>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M14 5h5v5M19 5l-8 8M9 6H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
          {/* The two facts worth keeping from the four lines that went: it is
              one use each, and the credit keeps. */}
          <p className="t-compact ct-once">
            One time each. Your credit waits in My Spot.
          </p>

          {/* ══ THE CALL-OUT ═══════════════════════════════════════════════
              Sam's own framing: "want this every week? get early access
              before price goes up to $14.99."

              Both halves are true and both come from constants rather than
              from this sentence: the trials above are one-time and the
              membership is weekly, and $14.99 is the standard rate every
              other surface prints. It is the ordinary terms of the offer
              stated once — no clock, no counter, and nothing here says the
              rise is sooner than the seat line already says it is. */}
          <div className="ct-more">
            <p className="ct-more-h">Want this every week?</p>
            <p className="t-compact ct-more-p">
              ${monthlyToday.toFixed(2)} now, {standardAfter} once the spots are gone.
            </p>
            <Link
              className="action ct-go"
              to={cta.to}
              state={cta.state}
              onClick={onClose}
            >
              {cta.label}
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
