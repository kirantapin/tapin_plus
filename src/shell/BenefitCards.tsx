import { BenefitIcon, NavIcon } from "./Icons";
import { benefits, offers, venues } from "../model/content";

/**
 * The three standing benefits, as cards.
 *
 * Sam, 12 Sep 2026, after a stranger read the pitch cold and asked "do I just
 * get deals at these or what?" — the benefits were a row of three 22px glyphs
 * with a two-word label under each, which is a legend, not an answer. His note:
 * "show the discounts that I get as a customer at each of these places... the
 * $5 weekly credit at each location — this is the big one."
 *
 * ══ THE CARD IS THE STOREFRONT'S, NOT A NEW ONE ════════════════════════════
 * Ported from ~/desktop-ui (V3.1), the app a customer already uses: a 16px
 * radius on the card fill, 12px pad, a 1px hairline at 10% ink, and the near-
 * invisible seating shadow — with ONE floating tile inside it. That inversion
 * (flat card, floating tile) is the thing three separate readings of the
 * storefront named as its signature, and this build already held both values as
 * --rest and --float.
 *
 * ══ THE CREDIT LEADS, BY SIZE, NOT BY COLOUR ═══════════════════════════════
 * Sam called it the big one, so it gets the full width and the larger figure
 * while the other two share a row beneath. It is NOT given a maroon fill:
 * tokens.css spends a solid maroon only on a chosen or acting thing, and a
 * benefit sitting on a marketing page is neither. Hierarchy here is width and
 * type size, which cost nothing and break no rule.
 *
 * Every string is read from the benefit records — the labels and the conditions
 * are the same ones the app preview and the checkout print, so the three
 * surfaces cannot drift.
 */
/**
 * `compact` — the four as CHIPS: tile + label, no detail line. The checkout
 * modal uses it (Sam, 14 Sep 2026: make "what the membership gives you" WAY
 * smaller there, it is the pre-checkout now); the pitch keeps the rows.
 */
/**
 * ══ THE PITCH'S ROWS BECOME FIGURES AND COLUMNS — 21 Sep 2026 ══════════════
 * Sam: "it still feels a bit AI generated." The four rows were the textbook
 * tell — icon tile, bold label, grey subline, four times, same size — and on
 * the pitch's desktop they were four equal CARDS of exactly that. So the
 * non-compact path drops the tiles entirely (docs/POLISH-2026-09-21.md §4.3):
 * the credit's dollar becomes the panel's display figure with its word beside
 * it, the other two stand as open columns divided by a hairline, and the
 * offers line closes under one more. Hairlines, not boxes.
 *
 * THE FIGURE IS LIFTED OUT OF THE LABEL, NOT TYPED. `credit.label` is
 * "$5 credit" in money-and-terms.json; the money token leads and the rest of
 * the label sits beside it at reading size, so the row still prints exactly
 * the string the data holds — set at two sizes, the same device the hero uses
 * for its headline and lead. Nothing here invents a cadence: "once a week at
 * each place" is the condition's own words, underneath.
 *
 * `compact` is untouched. The checkout's chip list is drawn by reserve.css off
 * `.bcards.is-chips` and still needs the tile and the same tree.
 */
export default function BenefitCards({ compact = false }: { compact?: boolean } = {}) {
  const by = (id: string) => benefits.find((b) => b.id === id);
  const credit = by("credit");
  const rest = benefits.filter((b) => b.id !== "credit");
  /* Olaika's by venue, not by index: the array is data, and Italiano's 10%
     sits in front of it. Falls back to the first offer if Olaika's ever goes. */
  const offer = offers.find((o) => o.venueId === "olaika") ?? offers[0];
  const offerVenue = offer ? venues.find((v) => v.id === offer.venueId) : undefined;
  /* The leading money token of the credit's label, and what is left of it. */
  const leadFigure = credit ? (/^\$[\d.,]+/.exec(credit.label)?.[0] ?? "") : "";
  const leadWord = credit ? credit.label.slice(leadFigure.length).trim() : "";

  if (compact) {
    return (
      <div className="bcards is-chips">
        {credit ? (
          <div className="bcard is-lead">
            <span className="bcard-tile" aria-hidden="true">
              <BenefitIcon id={credit.id} />
            </span>
            <span className="bcard-text">
              <b>{credit.label}</b>
              {/* The condition, at the reading floor and never as fine print.
                  It is the half that makes the figure true. */}
              <span>{credit.detail}</span>
            </span>
          </div>
        ) : null}

        <div className="bcard-pair">
          {rest.map((b) => (
            <div className="bcard" key={b.id}>
              <span className="bcard-tile" aria-hidden="true">
                <BenefitIcon id={b.id} />
              </span>
              <span className="bcard-text">
                <b>{b.label}</b>
                <span>{b.detail}</span>
              </span>
            </div>
          ))}
        </div>
        {offer ? (
          <div className="bcard is-offers">
            <span className="bcard-tile" aria-hidden="true">
              <NavIcon id="deals" />
            </span>
            <span className="bcard-text">
              <b>Special offers</b>
              <span>
                Like {offer.label.toLowerCase()} at {offerVenue?.name ?? "a TapIn Plus place"}, on top of the three
              </span>
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bcards">
      {credit ? (
        <div className="bcard is-lead">
          <b className="t-figure tnum bcard-fig">{leadFigure}</b>
          <span className="bcard-text">
            <b>{leadWord}</b>
            {/* The condition, at the reading floor and never as fine print. It
                is the half that makes the figure true. */}
            <span>{credit.detail}</span>
          </span>
          {/* The scope used to be repeated here as "at each of N places". Cut:
              the hero lead already says "at every Plus place in town" and the
              panel note below says it again, so a third statement bought
              nothing and cost the condition its line. */}
        </div>
      ) : null}

      <div className="bcard-pair">
        {rest.map((b) => (
          <div className="bcard" key={b.id}>
            <span className="bcard-text">
              <b>{b.label}</b>
              <span>{b.detail}</span>
            </span>
          </div>
        ))}
      </div>
      {/* ══ THE FOURTH THING: OFFERS, ON TOP ═══════════════════════════════════
          Sam, 14 Sep 2026: "include a section for special offers, like the one
          at olaika, that are on TOP of the benefits they already have." The
          example is the real Olaika offer from money-and-terms.json — the same
          record the deck's offers slide and the app's Deals screen read — so a
          venue's name and terms are never typed here.

          ONE LINE, under one hairline: it is the fourth thing and the smallest
          of the four, and giving it the three's treatment was what made the
          block read as a grid of equals. */}
      {offer ? (
        <p className="bcard is-offers">
          <b>Special offers</b>{" "}
          <span>
            Like {offer.label.toLowerCase()} at {offerVenue?.name ?? "a TapIn Plus place"}, on top of the three
          </span>
        </p>
      ) : null}
    </div>
  );
}
