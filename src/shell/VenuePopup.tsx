import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BenefitIcon, NavIcon } from "./Icons";
import PlusFlag from "./PlusFlag";
import { offers, heroIsBright, logoField, type Venue } from "../model/content";

/**
 * One merchant, in a pop-up: what the membership gives you there, and the
 * door to their live TapIn page.
 *
 * Sam, 20 Sep 2026: "when I click on merchant pages… I should just see a pop
 * up of the benefits at that merchant's location, and then a link to order at
 * that merchant's page, this helps validate to consumers that the merchants
 * are already live."
 *
 * That second half is the point of the whole component. The app preview this
 * replaces was a mock of a product that does not open until 2026-10-31; these
 * six pages are real, live and orderable today, so the strongest thing the
 * landing page can do with a merchant tap is send the reader to the merchant.
 *
 * ══ EVERY BENEFIT ROW COMES FROM THAT VENUE'S OWN RECORD ═══════════════════
 * `venue.policies`, not the global `benefits` list — Italiano's carries none
 * and gets its offer instead, which is the §6 rule that a benefit a venue does
 * not have is a row that is not there.
 */
export default function VenuePopup({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const offer = offers.find((o) => o.venueId === venue.id);

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

  /* On <body>, never inside the ticker: the rail is a transformed, scrolling
     box, and a fixed scrim inside one is clipped to it rather than covering
     the viewport. */
  return createPortal(
    <div className={`vp-root${closing ? " is-closing" : ""}`} onClick={close}>
      <div className="vp-scrim" aria-hidden="true" />
      <div
        className="vp"
        role="dialog"
        aria-modal="true"
        aria-label={venue.name}
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vp-shot">
          <img
            src={venue.hero}
            alt=""
            decoding="async"
            data-bright={heroIsBright(venue.id) ? "true" : undefined}
          />
          <button type="button" className="vp-close" onClick={close} aria-label="Close">
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
          <span
            className="collar vp-collar"
            data-field={logoField(venue.id)}
            style={{ ["--brand" as string]: venue.brandColor }}
          >
            <img src={venue.logo} alt="" decoding="async" />
          </span>
        </div>

        <div className="vp-body">
          <h2 className="vp-name">
            {venue.name}
            {venue.plus ? <PlusFlag className="plus vp-plus" /> : null}
          </h2>
          <p className="vp-meta">
            {venue.category} · {venue.street}
            {/* Straight from the record, and it is the one thing on this card
                that changes by the hour — The Milk Parlor's live page reads
                CLOSED today and its record says so too. */}
            {venue.open ? <em className="vp-open">Open now</em> : <em className="vp-shut">Closed right now</em>}
          </p>

          <p className="t-caption vp-label">
            {venue.plus ? "Your benefits here" : "What you get here"}
          </p>
          <ul className="vp-benefits">
            {venue.policies.map((p) => (
              <li key={p.id}>
                <span className="vp-icon" aria-hidden="true">
                  <BenefitIcon id={p.id} />
                </span>
                <span>
                  <b>{p.label}</b>
                  <span>{p.detail}</span>
                </span>
              </li>
            ))}
            {offer ? (
              <li>
                {/* The offers glyph, not a benefit one: an offer is the
                    merchant's own promotion rather than one of the standing
                    three, and the pitch marks it with this same mark. */}
                <span className="vp-icon" aria-hidden="true">
                  <NavIcon id="deals" />
                </span>
                <span>
                  <b>{offer.label}</b>
                  <span>{offer.detail} · members only</span>
                </span>
              </li>
            ) : null}
          </ul>

          {/* ══ THE PROOF, AND THE ONLY ACTION ═══════════════════════════════
              Their real page, in a new tab. Verified live in a browser on
              20 Sep 2026 — all six resolve to the merchant's own menu. The
              sentence under it is the one the venue page used to carry. */}
          {venue.liveUrl ? (
            <>
              <a
                className="action vp-go"
                href={venue.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Order at {venue.name}
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
              <p className="t-compact vp-note">
                Open now, not a preview. Points and credit you earn here today carry into
                your membership.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
