import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BenefitIcon, CoverIcon, NavIcon } from "./Icons";
import PlusFlag from "./PlusFlag";
import {
  covers,
  offers,
  heroIsBright,
  logoField,
  venueCovers,
  venuePolicyDetail,
  type Venue,
} from "../model/content";

/**
 * One merchant, in a pop-up: what the membership gives you there, what it
 * works on, and the door to their live TapIn page.
 *
 * Sam, 20 Sep 2026: "when I click on merchant pages… I should just see a pop
 * up of the benefits at that merchant's location, and then a link to order at
 * that merchant's page, this helps validate to consumers that the merchants
 * are already live."
 *
 * That second half is the point of the whole component. The app preview this
 * replaces was a mock of a product that does not open until 2026-10-31; the
 * live pages are real and orderable today, so the strongest thing the landing
 * page can do with a merchant tap is send the reader to the merchant.
 *
 * ══ EVERY BENEFIT ROW COMES FROM THAT VENUE'S OWN RECORD ═══════════════════
 * `venue.policies`, not the global `benefits` list — Italiano's carries none
 * and gets its offer instead, which is the §6 rule that a benefit a venue does
 * not have is a row that is not there.
 *
 * ══ THE CARD ANSWERS TWO QUESTIONS, AND KEEPS THEM APART ═══════════════════
 * Sam, same day, after reading The Burg's card on a phone: "for these pop ups
 * I need to be able to see what it can be used on", and "less confusion".
 *
 * Both notes have one cause. The card was answering "what do I get" and "what
 * does it work on" in the same three lines, and answering the second one
 * wrongly: two of the three rows read "Food and non-alcoholic drinks", which
 * is too narrow for the 15% (it reaches cover, tickets, line skips and merch)
 * and simply false for points (they earn on everything). So the same four
 * words appeared twice, said different things each time, and neither was true.
 *
 * They are now two separate blocks, and each answers once:
 *
 *   WHAT YOU GET      the rows, each carrying its own CONDITION if it has one
 *   WORKS ON          that venue's marks, from `venueCovers`
 *
 * The scope row is the pitch's own `covers` vocabulary, narrowed to one
 * address — so a coffee shop does not advertise line skips, and The Milk
 * Parlor's cover and line skips appear where they are real.
 *
 * ══ AND NOTHING ELSE ═══════════════════════════════════════════════════════
 * Sam, an hour later: "we'd want to remove a lot of these little supporting
 * text things it's just way too crowded and dense. We gotta dial back
 * significantly." Three lines went, and the rule for what stays is the same
 * each time: a CONDITION on a benefit stays, because a figure printed without
 * the thing that qualifies it is the §10 claim this build does not make.
 * Everything that was only restating what a control, a glyph or the row below
 * already said is gone.
 */
export default function VenuePopup({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const offer = offers.find((o) => o.venueId === venue.id);
  /* Ordered by `covers`, never by the record, so every card lists them in the
     same order and the row is scannable across venues. */
  const scope = covers.filter((c) => (venueCovers[venue.id] ?? []).includes(c.id));

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
        {/* A BAND, NOT A PANEL. It was 168px on a phone and pushed the action
            under the fold; several of these heroes are the merchant's own
            wordmark, so at that height the card said the venue's name three
            times before saying anything about the membership. It is evidence
            that this is a real place, which a band does as well as a block. */}
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
            {venue.plus ? "What you get here" : "What you get"}
          </p>
          <ul className="vp-benefits">
            {venue.policies.map((p) => (
              <li key={p.id}>
                <span className="vp-icon" aria-hidden="true">
                  <BenefitIcon id={p.id} />
                </span>
                <span>
                  <b>{p.label}</b>
                  {/* The CONDITION on this benefit, never its scope — scope is
                      the row below, once, for all three. A benefit with no
                      condition prints no second line rather than an empty
                      one, which is the same §6 move as the missing badge. */}
                  {venuePolicyDetail(p.kind, p.detail) ? (
                    <span>{venuePolicyDetail(p.kind, p.detail)}</span>
                  ) : null}
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

          {/* ══ WHAT IT WORKS ON, AT THIS ADDRESS ═══════════════════════════
              The pitch's scope row, narrowed to one venue. Same glyphs, same
              words, same rule running out of the label — a reader who has seen
              the pitch's "Applies to" recognizes this as the same statement
              rather than as a new one. Absent entirely for a venue with no
              entry, rather than guessed. */}
          {scope.length ? (
            <>
              <p className="t-caption covers-head vp-covers-head">Works on</p>
              <div className="covers vp-covers">
                {scope.map((c) => (
                  <div className="cover" key={c.id}>
                    <CoverIcon id={c.id} />
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {/* ══ THE PROOF, AND THE ONLY ACTION ═══════════════════════════════
              Their real page, in a new tab. `liveUrl` means "you can order and
              pay here today" and is filled one venue at a time on Sam's word.

              IT CARRIED A SENTENCE UNDER IT, and does not any more: "their
              real TapIn page, not a preview. Points and credit you earn here
              today carry into your membership." Sam, 20 Sep 2026, reading it
              on a phone — "way too crowded and dense. We gotta dial back
              significantly." A button that names a real business and opens
              that business's page is already the proof the sentence was
              asserting. */}
          {venue.liveUrl ? (
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
          ) : (
            /* ══ NO ORDERING HERE YET, AND IT SAYS SO ════════════════════════
               Some of these have a TapIn page that renders but cannot take a
               payment, and carry none of the in-store assets either (Sam,
               20 Sep 2026). So they get no "Order at" button and no claim
               about earning today — just the one forward-looking sentence the
               rest of the site is already written in. */
            <p className="t-compact vp-soon">
              Ordering through TapIn opens here when we do.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
