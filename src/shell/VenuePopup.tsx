import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CoverIcon, NavIcon } from "./Icons";
import PlusFlag from "./PlusFlag";
import {
  covers,
  offers,
  heroIsBright,
  logoField,
  venueCovers,
  venuePolicyFigure,
  type Venue,
} from "../model/content";

/**
 * One merchant, in a pop-up: what the membership gives you there, what it
 * works on, and the door to their live TapIn page.
 *
 * Sam, 20 Sep 2026: "when I click on merchant pages… I should just see a pop
 * up of the benefits at that merchant's location, and then a link to order at
 * that merchant's page, this helps validate to consumers that the merchants
 * are already live." That second half is the point of the whole component: the
 * live pages are real and orderable today, so the strongest thing the landing
 * page can do with a merchant tap is send the reader to the merchant.
 *
 * ══ REDESIGNED, 21 SEP 2026 ════════════════════════════════════════════════
 * Sam, on The Burg's card: "when done can we /impeccable redesign these
 * merchant page pop ups." docs/POLISH-2026-09-21.md §10 names what was wrong
 * with the old one and it was all one fault — nine objects at one weight. A
 * band, then the name again as a heading (so The Burg was named three times in
 * 300px), two uppercase tracked eyebrows with rules under them, three icon-tile
 * + bold + grey-subline rows, three tall plates, a button.
 *
 * The composition now has four objects and a clear largest thing:
 *
 *   THE PHOTOGRAPH      the object, not a band. The name, the PLUS chip and
 *                       `category · street` ride it; the collar is top-left,
 *                       the close top-right. The name is said ONCE.
 *   THE FIGURES         $5 / 15% / 1× in three hairlined columns — the
 *                       splash's `.cg-figures` construction at sheet scale.
 *   WORKS ON            the plates Sam likes, compact, one row.
 *   THE ACTION          unchanged.
 *
 * ══ EVERY FACT STILL COMES FROM THAT VENUE'S OWN RECORD ════════════════════
 * `venue.policies`, not the global `benefits` list — Italiano's carries none
 * and gets its offer instead, which is the §6 rule that a benefit a venue does
 * not have is a column that is not there. The figures and their qualifiers are
 * built from BENEFIT in content.ts (`venuePolicyFigure`), so neither the $5 nor
 * the 15 is typed on this surface.
 *
 * ══ TWO QUESTIONS, ANSWERED ONCE EACH ══════════════════════════════════════
 * Sam, 20 Sep 2026: "for these pop ups I need to be able to see what it can be
 * used on", and "less confusion". The figures answer "what do I get"; the
 * plates answer "what does it work on", from `venueCovers`, narrowed to one
 * address — so a coffee shop does not advertise line skips. They were one
 * block saying both, and saying the second wrongly.
 */

/* Credit, percent, points — the splash's order and not the record's, so the
   $5 leads on every card. A kind the venue does not carry is skipped. */
const FIGURE_ORDER = ["credit", "percent", "points"];

export default function VenuePopup({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const offer = offers.find((o) => o.venueId === venue.id);
  /* Ordered by `covers`, never by the record, so every card lists them in the
     same order and the row is scannable across venues. */
  const scope = covers.filter((c) => (venueCovers[venue.id] ?? []).includes(c.id));
  const figures = FIGURE_ORDER.flatMap((kind) => {
    const policy = venue.policies.find((p) => p.kind === kind);
    const fig = policy ? venuePolicyFigure(policy) : undefined;
    return policy && fig ? [{ id: policy.id, ...fig }] : [];
  });

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
      {/* `data-lit` inverts the nine ground-and-ink tokens on this subtree
          (styles/light.css). Sam, 20 Sep 2026: "can we make these pop ups,
          along with the checkout modal pop up also be light theme." The
          scrim, the sheet's shadow and the veil over the photograph stay
          dark, because none of them is a surface — and the type that rides
          the photograph takes `--on-maroon`, the one white this build holds
          that does NOT invert with the surface. */}
      <div
        className="vp"
        data-lit=""
        role="dialog"
        aria-modal="true"
        aria-label={venue.name}
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ══ THE PHOTOGRAPH IS THE OBJECT ═══════════════════════════════════
            It was a 132px band under which the name was set again as a
            heading. A merchant's own photograph is the evidence that this is a
            real place on a real street, and the name belongs on it — the venue
            card's construction, which the rail and the splash both already
            use, so a reader who tapped a tile lands on the same object larger. */}
        {/* `data-bright` rides the WRAPPER, not the image: it now steers the
            veil as well as the filter, and a veil drawn by `.vp-shot::after`
            cannot read an attribute on its sibling. */}
        <div className="vp-shot" data-bright={heroIsBright(venue.id) ? "" : undefined}>
          <img src={venue.hero} alt="" decoding="async" />
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
          <div className="vp-id">
            <h2 className="vp-name">
              <span>{venue.name}</span>
              {venue.plus ? <PlusFlag className="plus vp-plus" /> : null}
            </h2>
            <p className="vp-where">
              {venue.category} · {venue.street}
            </p>
          </div>
        </div>

        <div className="vp-body">
          {/* The one thing on this card that changes by the hour — The Milk
              Parlor's live page reads CLOSED today and its record says so
              too. Filled dot open, hollow dot closed: §9 keeps this palette
              to maroon, so the state separates on the ink ramp and on the
              shape of the mark, never on a status hue. */}
          <p className="vp-state" data-open={venue.open ? "" : undefined}>
            <span className="vp-dot" aria-hidden="true" />
            {venue.open ? "Open now" : "Closed right now"}
          </p>

          {/* ══ THE BENEFITS ARE FIGURES ═══════════════════════════════════
              §10.2, and the biggest move on the sheet: the numbers that ARE
              the membership are set as the membership, in open columns parted
              by a hairline, with no tile beside them. Same construction as
              the splash's `.cg-figures`, scaled to 460px. Points is "1×",
              read from the policy's multiplier, so the three are one size
              (Sam, 22 Sep 2026: "it's a bit weird right now"). */}
          {figures.length ? (
            <ul className="vp-figures">
              {figures.map((f) => (
                <li key={f.id}>
                  <b className="vp-fig">{f.figure}</b>
                  {/* A CONDITION or a CADENCE, never a restatement of the
                      figure: a figure printed without the thing that
                      qualifies it is the §10 claim this build does not make. */}
                  <span>{f.qualifier}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {/* An offer is the merchant's own promotion rather than one of the
              standing three, so it is one line under the offers glyph — the
              same mark the pitch gives it — and never a figure column. */}
          {offer ? (
            <p className="vp-offer">
              <span className="vp-offer-glyph" aria-hidden="true">
                <NavIcon id="deals" />
              </span>
              <span>
                <b>{offer.label}</b> · {offer.detail} · members only
              </span>
            </p>
          ) : null}

          {/* ══ WHAT IT WORKS ON, AT THIS ADDRESS ═════════════════════════
              Sam, 20 Sep 2026, on the plates: "I liked the styling of the
              'works on:' for the individual merchant pages." They stay, as
              one row of compact plates rather than three tall ones — glyph
              and word on a line, which is what lets five of them sit under a
              heading instead of eating a third of the sheet. Absent entirely
              for a venue with no entry, rather than guessed.

              `.vp-cover`, not the pitch's `.cover`: the pitch wears the tall
              plate on its own page and this is a different size of the same
              idea, so the two do not share a rule to fight over. */}
          {scope.length ? (
            <>
              <p className="vp-covers-head">Works on</p>
              <div className="vp-covers">
                {scope.map((c) => (
                  <span className="vp-cover" key={c.id}>
                    <CoverIcon id={c.id} />
                    <span>{c.label}</span>
                  </span>
                ))}
              </div>
            </>
          ) : null}

          {/* ══ THE PROOF, AND THE ONLY ACTION ═════════════════════════════
              Their real page, in a new tab. `liveUrl` means "you can order and
              pay here today" and is filled one venue at a time on Sam's word.
              A button that names a real business and opens that business's
              page is already the proof; the sentence that used to sit under it
              was cut on 20 Sep and stays cut. */}
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
            /* Some of these have a TapIn page that renders but cannot take a
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
