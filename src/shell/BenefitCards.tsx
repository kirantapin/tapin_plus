import { BenefitIcon, NavIcon } from "./Icons";
import PhotoCard from "./PhotoCard";
import {
  benefitFragments,
  benefitShots,
  benefits,
  offers,
  venues,
} from "../model/content";

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
 * ══ THE PITCH'S BENEFITS BECOME PHOTOGRAPHS — 21 Sep 2026 ══════════════════
 * The 21 Sep morning pass (§4.3) made these an open statement: a giant `$5`
 * beside a small "credit", then two hairlined columns, then a line. Sam, on a
 * phone: "I really don't like this" — naming the split figure, the hairline
 * columns and the bare glyph row under them. Then: "can you take a look at the
 * meandu website? I like their styling for this kind of thing. I think it'd be
 * cool if we had photos from the coffeeholics instagram too."
 *
 * So each benefit is a PHOTOGRAPH CARD (docs/POLISH-2026-09-21.md §7): a venue
 * hero full-bleed under a veil, the benefit's own label and condition in the
 * top-left, and a frosted fragment floating in the lower half showing what the
 * benefit does to one order. The photo is the evidence and the chip is the
 * proof — no icon tiles, no hairlines, no display figure, which is what the
 * three rejected devices had in common.
 *
 * NOTHING HERE IS TYPED. The title is the record's `label` WHOLE — the figure
 * is no longer lifted out of it, which is the split Sam rejected — the line is
 * its `detail`, the fragment is `benefitFragments` (whose discounts are derived
 * from BENEFIT, not written), and the photograph is `benefitShots` resolved
 * through the venue's own `hero`. The credit leads by SIZE alone, as it always
 * has: full grid width and a larger title (Sam, 12 Sep: "this is the big one").
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

  /* The four, in §7's order: the credit, the two standing benefits behind it,
     then offers. Each carries its own photograph, its own words and its own
     fragment; the offers card reads all three off the offer record.

     ══ THE FOURTH THING: OFFERS, ON TOP ═══════════════════════════════════
     Sam, 14 Sep 2026: "include a section for special offers, like the one at
     olaika, that are on TOP of the benefits they already have." The example is
     the real Olaika offer from money-and-terms.json — the same record the
     deck's offers slide and the app's Deals screen read — so a venue's name
     and terms are never typed here.

     IT IS A CARD LIKE THE OTHER THREE NOW, not the single line §4.3 made of
     it. The line was right when the three above it were an open statement and
     a fourth row would have read as a fourth equal; against three photographs
     a bare line reads as a footnote to them, which is the opposite of "on
     top". Size still separates it from the credit, which is the only thing
     that ever needed separating. */
  const cards = [
    ...(credit ? [{ policy: credit, line: credit.detail }] : []),
    ...rest.map((b) => ({ policy: b, line: b.detail })),
    ...(offer
      ? [
          {
            policy: { id: "offers", label: "Special offers" },
            line: `Like ${offer.label.toLowerCase()} at ${offerVenue?.name ?? "a TapIn Plus place"}, on top of the three`,
          },
        ]
      : []),
  ];

  return (
    <div className="bshots">
      {cards.map(({ policy, line }) => {
        const shot = venues.find((v) => v.id === benefitShots[policy.id])?.hero;
        /* The offers fragment is the offer itself — the venue and the terms as
           the record holds them, so a real business's deal is never retyped. */
        const chip =
          policy.id === "offers"
            ? offer
              ? { line: offerVenue?.name ?? "A TapIn Plus place", figure: offer.label }
              : undefined
            : benefitFragments[policy.id];
        /* THE LABEL WHOLE. "$5 credit" is one string in money-and-terms.json
           and it is set as one. The photograph is the card's mood (alt=""),
           and the markup is PhotoCard's, shared with the Coffeeholics splash. */
        return (
          <PhotoCard
            key={policy.id}
            img={shot}
            title={policy.label}
            line={line}
            lead={policy.id === "credit"}
            chip={
              chip
                ? {
                    ...chip,
                    icon:
                      policy.id === "offers" ? <NavIcon id="deals" /> : <BenefitIcon id={policy.id} />,
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
