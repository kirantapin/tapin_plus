import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { campaignTrialPlaces, campaignVenue } from "../model/campaign";
import { useReserveCta } from "./useReserveCta";
import {
  monthlyToday,
  standardAfter,
  logoField,
  venues,
} from "../model/content";

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
 * ══ `data-lit` IS THE CALLER'S, BECAUSE IT DEPENDS ON THE PAGE ═════════════
 * On Coffeeholics: off. That page is already light and carries the merchant's
 * own tinted ramp — inheriting it keeps the modal in the same room as the page,
 * where `data-lit` would drop the house neutral on top of the tint and the two
 * whites would disagree by a few points of hue.
 *
 * On the pitch (21 Sep 2026): on. That page is the committed dark field, and
 * every pop-up on it is light — the merchant pop-up and the checkout sheet
 * both invert (shell/VenuePopup.tsx, styles/light.css), so a modal that stayed
 * dark here would be the only one of the three that did.
 */
export default function TrialModal({
  lit,
  onClose,
}: {
  /** Invert the nine ground-and-ink tokens on the panel — set on a dark page. */
  lit?: boolean;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  /* ══ THE SILO HELD ON THE PAGE AND BROKE IN HERE ═══════════════════════
     Sam, 20 Sep 2026: "when I clicked on get early access again it took me
     to the main tapin page checkout not the one for coffeeholics."

     `/reserve` is a layer over `state.background ?? "/"`, and this Link was
     written as a bare `to="/reserve"` — so it took the fallback and put the
     pitch under the sheet. The page's own two buttons have carried the
     background since the silo was asked for; this one was added later and
     did not. It uses the same hook now, which is the point of the hook. */
  const cta = useReserveCta();
  /* The rest of the network, from the records. Same list and same marks the
     page's own closing row draws, so the two say it identically. */
  const others = venues.filter((o) => o.id !== campaignVenue?.id && o.plus);

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
    { k: "open", h: "Open the shop on TapIn" },
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
        data-lit={lit ? "" : undefined}
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

          {/* TWO PLACES (Sam, 23 Sep 2026: "add two places for this, try at
              coffeeholics and try at the burg"): each place is a small head —
              its collar and name — over its own offers, from the same records
              the rest of the page draws. */}
          <ul className="ct-places">
            {campaignTrialPlaces.map((place) => {
              const at = venues.find((v) => v.id === place.venueId);
              if (!at) return null;
              return (
                <li key={place.venueId}>
                  <p className="ct-place-h">
                    <span
                      className="collar"
                      data-field={logoField(at.id)}
                      style={{ ["--brand" as string]: at.brandColor }}
                      aria-hidden="true"
                    >
                      <img src={at.logo} alt="" decoding="async" />
                    </span>
                    At {at.name}
                  </p>
                  <ul className="ct-trials">
                    {place.trials.map((t) => (
                  <li key={t.id}>
                    <a
                      className="action action-ghost cg-trial"
                      href={t.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {/* ══ THE LABEL, AND THE ACTION ═════════════════════════
                          Sam, 20 Sep 2026, converging on it in four messages:
                          "click here to use", then "too wordy", then "or just
                          'redeem'", then "Or 'try now'".

                          "Try now" over "Redeem" because it is already this
                          page's word — the docked bar says "Try it once for
                          free", the list says "Try the first two free today" and
                          this modal is titled "Try it once, free". Redeem is what
                          the merchant's own page calls it one tap later, which is
                          the right place for a second vocabulary, not here.

                          Two words, and beside the arrow rather than under the
                          label — a second line would have been another fact about
                          the offer, which is what the sublines cut from here were.
                          On the right it reads as the row's verb, which is what
                          the external-link glyph alone was having to carry. */}
                      <b>{t.label}</b>
                      <span className="ct-do">
                        Try now
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
                      </span>
                    </a>
                  </li>
                    ))}
                  </ul>
                </li>
              );
            })}
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
            {/* ══ AND EVERYWHERE ELSE ════════════════════════════════════
                Sam, 20 Sep 2026: "on the try it once, it should have the same
                mention. 'Want this every week? And at every location?'"

                The trial is one order at one shop, so the escalation has two
                steps and the modal was only making one of them. His second
                question is the other, and the marks under it are the page's
                own closing row — the same list from the same records, so a
                reader meets the network described identically in both places
                rather than twice in two voices. */}
            <p className="ct-more-h">Want this every week? And at every location?</p>
            {others.length ? (
              <div className="cg-also ct-also">
                <span className="cg-also-marks" aria-hidden="true">
                  {others.map((o) => (
                    <span
                      key={o.id}
                      className="collar"
                      data-field={logoField(o.id)}
                      style={{ ["--brand" as string]: o.brandColor }}
                    >
                      <img src={o.logo} alt="" decoding="async" />
                    </span>
                  ))}
                </span>
                <p className="t-compact">
                  Also at{" "}
                  {others.map((o, k, arr) => (
                    <Fragment key={o.id}>
                      {o.name}
                      {k === arr.length - 1 ? "" : k === arr.length - 2 ? " and " : ", "}
                    </Fragment>
                  ))}
                  .
                </p>
              </div>
            ) : null}
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
