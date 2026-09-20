import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { campaignTrials, campaignVenue } from "../model/campaign";
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

  const steps = [
    {
      k: "open",
      h: `Open ${venue?.name ?? "the shop"} on TapIn`,
      p: "Either offer below takes you straight there, already attached to your order.",
    },
    {
      k: "order",
      h: "Order what you want",
      p: "The 15% comes off the top, or the $5 credit lands in My Spot for whenever you want it.",
    },
    {
      k: "collect",
      h: "Collect it",
      p: "Your order goes straight to the counter as a ticket when you place it.",
    },
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
                <span>
                  <b>{s.h}</b>
                  <span>{s.p}</span>
                </span>
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
                  <span>
                    <b>{t.label}</b>
                    <span>{t.note}</span>
                  </span>
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
          <p className="t-compact ct-once">
            One time each, on your next order at {venue?.name ?? "the shop"}.
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
              Early access is ${monthlyToday.toFixed(2)} before the price goes up to{" "}
              {standardAfter}.
            </p>
            <Link className="action ct-go" to="/reserve" onClick={onClose}>
              Get early access
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
