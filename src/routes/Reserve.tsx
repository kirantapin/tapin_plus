import { Fragment, useEffect, useRef, useState } from "react";
import TapInCard from "../shell/TapInCard";
import GuaranteeLine from "../shell/GuaranteeLine";
import { useCardFlight } from "../shell/cardFlight";
import { useReserveFlow } from "../shell/ReserveLayer";
import { useName } from "../model/nameStore";
import { seatsLeft, SEAT_CAP } from "../model/seats";
import {
  PLANS,
  launchWindow,
  benefits,
  FOUNDING_OPEN,
  firstEarlyBirdPrice,
  foundingCloses,
  foundingTierName,
  guarantee,
  logoField,
  monthlyToday,
  offers,
  plusVenues,
  venuePolicyFigure,
  venues,
} from "../model/content";
/* The credit's own constants, from the model that computes the saving — the
   floor and the amount are read, never retyped beside a price. */
import { BENEFIT } from "../model/savings";

/**
 * /reserve — the checkout. Mode: Operate. The decision and nothing else.
 *
 * ══ THE DISCLOSURES LEFT THIS FILE ON 13 Sep 2026 ══════════════════════════
 * Sam: "instead of all these disclosures here, they'd exist in a checkout modal
 * flow… we only need the disclosure and terms right at checkout." The charge
 * rows, the forfeit line, the consent sentence, the wallet and the full terms
 * are now `shell/CheckoutSheet.tsx`, and **TRUTH.md §4 went with them** — it
 * still governs, it just governs there. Read that file's header before touching
 * the order of anything inside it.
 *
 * What is left here is the ARGUMENT and one door: what it costs, what the
 * founding rate saves, what the rate does after the founding round, and a
 * button that opens the sheet. Nothing on this page takes money any more.
 *
 * THE SEAT COUNT IS NOW SHOWN, AND IT IS ARTIFICIAL. This file's header used to
 * say "no seat count (§10 — there are no members, so any number is invented)".
 * Sam asked for one on 13 Sep and reaffirmed it after being shown that TRUTH.md
 * retires the device by name. It counts nothing; see `model/seats.ts`. Still no
 * countdown clock, and the October close beside it is real.
 */

/* ══ A REVIEW SHEET, NOT A LANDING PAGE (23 Sep 2026) ═══════════════════════
   Sam: "the checkout page needs some more work, can you look at mobbin to take
   inspiration and use /impeccable to design." Every reference (Cash App's
   "Review your plan", CLEAR+, Panera Sip Club, Shopify's "Start for free, stay
   for $1", Fresha's "Review and checkout") is one column: a ledger of what you
   pay and when, a short checklist of what is included, a guarantee line, one
   button that names the amount. None has two columns of marketing panels, and
   this sheet had grown them — a subtitle band, a figure strip, a rail, a
   guarantee block (docs/POLISH-2026-09-21.md §16).

   The pitch and the splash persuade; this sheet CONFIRMS. So page 0 is the
   plan tiles, the order card (the seats, the schedule), the included panel
   with the card at its foot, and the docked button (§31).

   ══ THE INCLUDED PANEL, AND DESKTOP WITHOUT A SCROLL (23 Sep 2026, §18) ════
   Sam, on the trial modal's call-out: "I like how you formatted this, maybe we
   use the same on the checkout flow." So what you get, where it works and the
   guarantee — three open blocks — are one `--inner` panel in that call-out's
   construction (no button and no price inside it).
   And "checkout on desktop should be wider so I don't need to scroll": from
   1024 the sheet is two columns — what it buys on the left (the panel, the
   card inside it), the money on the right (tiles, order card; §30), the dock
   under both. Below 1024 the column wrappers generate no boxes, so the phone
   reads the DOM order. */
const plan = PLANS.monthly;

/* ══ THE SCHEDULE — WHAT YOU PAY, AND WHEN ══════════════════════════════════
   Shopify states its money as a schedule (`Today · 3 days free`, `Jul 3 ·
   $1/mo`, `Always · cancel anytime`); this is that, built from the model.
   Every price is `plan.price` / `plan.per` (so it follows the flip to the
   standard rate), the date is `launchWindow`, the credit and its floor are
   BENEFIT's, and the refund sentence exists only while the plan's own refund
   charge row does. The moments are words; a figure in a clause is the plan's.

   THE CREDIT STOP KEEPS THE EARN-BACK'S TWO GATES. `FOUNDING_OPEN`: after the
   flip the price is $14.99 and one $10 order does not come near it.
   `monthlyToday < creditUsd`: "more than the deposit" is a comparative, and if
   a founding price is ever set at or above the credit the stop does not
   render rather than print a comparison that no longer holds. A `+` on a
   credit is money arriving, not a minus on a price (§16's refusals).

   The Halloween stop states the RATE, not a second charge: today's deposit is
   the first month (the tile says so, and so do page 2's rows), the month
   itself starts when we open, and the same figure recurs from there.

   A TIMELINE, NOT A TABLE (23 Sep 2026, POLISH §26). A ledger of label and
   figure rows read as terms; what it describes is three moments and one
   promise. So each stop is the moment with its figure on one line and a
   clause under it, on a rail, and the refund is the one sentence under the
   rail — the plan's own refund term, while its refund charge row stands. The
   tier in Today's clause is `foundingTierName`, never typed. */
const refundLine = plan.chargeRows.some((r) => r.id === "refund")
  ? plan.terms.find((t) => t.id === "refund")?.term
  : undefined;
const schedule: { id: string; when: string; figure: string; clause: string }[] = [
  {
    id: "today",
    when: "Today",
    figure: plan.price,
    clause: `${FOUNDING_OPEN ? `${foundingTierName} deposit` : "Deposit"}, counts toward your first month`,
  },
  ...(FOUNDING_OPEN && monthlyToday < BENEFIT.creditUsd
    ? [
        {
          id: "credit",
          when: `Your first $${Math.round(BENEFIT.creditMinUsd)}+ order`,
          figure: `+$${BENEFIT.creditUsd} credit`,
          clause: "More than the deposit",
        },
      ]
    : []),
  {
    id: "opens",
    when: launchWindow,
    figure: `${plan.price} ${plan.per}`,
    clause: "Then automatically, your first month already paid",
  },
  { id: "always", when: "Always", figure: plan.price, clause: "Never goes up while you stay a member" },
];

/* ══ WHAT YOU GET, AS A CHECKLIST ══════════════════════════════════════════
   A receipt lists what is included; it does not display it. The figure strip
   (§15) is a marketing device and stays on the splash and the pop-up.

   `benefits` says WHICH lines stand; the figure in each is a held venue
   policy's, through `venuePolicyFigure` — the $5 and the 15 are BENEFIT's,
   and the 1× is the multiplier content.ts corrects on the venue records
   (the extraction's benefit record still says 2×, which the product retired
   on 15 Sep). The words after each figure are the splash's and the pop-up's
   qualifiers. A kind with no figure prints no line. */
const heldFigure = (kind: string) => {
  if (!benefits.some((b) => b.kind === kind)) return undefined;
  const held = plusVenues.flatMap((v) => v.policies).find((p) => p.kind === kind);
  return held ? venuePolicyFigure(held) : undefined;
};
const creditFig = heldFigure("credit");
const percentFig = heldFigure("percent");
const pointsFig = heldFigure("points");
const included: { id: string; line: string }[] = [
  ...(creditFig ? [{ id: "credit", line: `${creditFig.figure} credit every week` }] : []),
  ...(percentFig ? [{ id: "percent", line: `${percentFig.figure} ${percentFig.qualifier}` }] : []),
  ...(pointsFig ? [{ id: "points", line: `${pointsFig.figure} points, toward free items` }] : []),
  ...(offers.length ? [{ id: "offers", line: "Special offers from the places" }] : []),
];

/* ══ WHERE IT WORKS, AS ONE ROW ═══════════════════════════════════════════
   The trial modal's call-out row — the marks overlapped on the left, the names
   in a sentence beside them — for all six, rebuilt under `.rs-*` so the sheet
   and the modal never share a rule. Names as the records hold them, so a real
   business's name is never shortened or retyped here. The rail stays on the
   pitch; on a sheet that confirms, it was a second carousel to scroll. */
/* The joins between the names, in the splash's own grammar: commas, then
   " and " before the last. Each name is kept whole on a narrow sheet (a line
   break inside "The Burg" reads as two places). */
const joinAfter = (k: number, n: number) => (k === n - 1 ? "" : k === n - 2 ? " and " : ", ");

/* The dock's words. NOT `plan.per` — what this opens takes a DEPOSIT (Sam:
   "need to make sure it says $4.99 deposit"). */
const checkoutLabel = `Checkout · ${plan.price} deposit`;

export default function Reserve() {
  /* ══ THE CHECKOUT IS THIS SHEET'S OTHER PAGES NOW (21 Sep 2026) ═══════════
     The charge used to be a second sheet this page opened, so this file held
     its state. It is pages 1–3 of the one sheet the layer draws — see
     shell/ReserveLayer.tsx — and what is left to read from here is the two
     things the page's own controls need: whether a seat has been paid for, and
     the one call that moves the sheet on to "Your details". */
  const { paid, openCheckout } = useReserveFlow();

  /* ══ STANDARD REFUSES IN PLACE ════════════════════════════════════════
     Sam, 20 Sep 2026: "I don't like this toast, let's get rid of it. Instead
     the 'standard' option should flash red softly."

     The toast was a second surface arriving over the sheet to say something
     about a tile the reader was already looking at — and it covered the top
     of that sheet to do it. The tile answers for itself now: a soft red pulse
     on the thing that was tapped, which is where the question was asked.

     THE WORDS DO NOT GO WITH IT. A colour is the whole signal for a sighted
     reader and none of it for anyone else, so the same sentence stays in a
     visually hidden live region. The tile's own second line — "once the Early
     Bird spots are gone" — is on screen permanently either way, which is what
     keeps the flash from being the only explanation. */
  /* Which unavailable tile was last tapped — the sold-out first round above
     the live tile, or Standard below it. Both refuse the same way. */
  const [refused, setRefused] = useState<"sold" | "later" | null>(null);
  const calm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(calm.current), []);
  const refuse = (which: "sold" | "later") => {
    setRefused(null);
    /* Restart the animation even on a second tap: the class has to leave the
       element for a frame or the keyframe does not re-run. */
    window.clearTimeout(calm.current);
    window.requestAnimationFrame(() => {
      setRefused(which);
      calm.current = window.setTimeout(() => setRefused(null), 900);
    });
  };
  const sayLater = () => refuse("later");
  const saySoldOut = () => refuse("sold");
  /* ══ ONE BUTTON A WIDTH (23 Sep 2026, POLISH §31, §31.1) ═════════════════
     Sam: "just have the checkout button always be sticky to the bottom instead
     of a dedicated button here" — then, at desktop: "we still need a checkout
     button on desktop, unlike the sticky one we have on the mobile version."
     Below 1024 the dock is page 0's Checkout, always on; from 1024 the order
     card's own button is. `openCheckout` moves the sheet to page 1. */
  const cardRef = useRef<HTMLDivElement | null>(null);
  /* The name she gave the card on the deck's close, or typed into the sheet —
     the card here shows it as it is typed. Placeholder until there is one. */
  const [cardName] = useName();
  // If the walkthrough sent us here, its card flies onto this one.
  useCardFlight(cardRef);
  const left = seatsLeft();

  /* ══ THE MODAL IS THE DECISION, AND ONLY THE DECISION ═══════════════════
     Sam, 15 Sep 2026: "the main focus is just on the sale." Since 23 Sep it
     reads as a review sheet (see the note above `plan`): the money as a
     schedule, one button, one panel of what it includes with the card at its
     foot. §4 is
     untouched — the rows, the consent and the control still travel together
     on page 2, one tap on. */
  return (
    <div className="rs-modal">
      {/* ══ THE MONEY: WHAT YOU PAY, AND THE DOOR TO PAYING IT ═════════════
          The right column from 1024 (the tiles, then the order card); below
          1024 this wrapper is `display:contents` and draws nothing. */}
      <div className="rs-pay-col">
        {/* ══ ONE PLAN. THE PICKER IS GONE (15 Sep 2026, Sam) ═══════════════
           It offered monthly, the 3-month pass and the year-with-a-shirt as a
           radiogroup. Two reasons it had to go, and the second is the serious
           one.

           SAM ASKED FOR IT: "get rid of those and just have the standard $6.99
           one."

           AND IT WAS NEVER REAL. `create_simple_intent` hardcodes ONE price in
           subscription mode — every tile created the same subscription for the
           same amount. Choosing "3 months" charged the monthly figure and
           produced a monthly subscription, while the rows, the consent sentence
           and the terms beside it all described a 3-month pass. That is a
           control that looks like it did something and did not, on the one
           surface where §4 says the stated terms must match what is charged.
           Do not restore a tile without a price id behind it.

           `PLANS.pass` and `PLANS.year` stay in content.ts: /in reads the plan
           off a stored reservation, and a record written before today still has
           to render the words its owner agreed to. */}
        {/* THE TILE STAYS, AND IT IS ALREADY CHOSEN. One plan, so the group
            holds one option and that option is selected — the reader sees what
            they are buying in the same object that used to offer the choice,
            rather than a panel of prose with no figure on it.

            STILL A RADIO, not a div dressed as one: it is the single member of
            a radiogroup, `aria-checked` is true, and it is focusable — a
            screen reader should meet "Early Bird Deposit, selected, 1 of 1",
            which is the truth. Tapping it re-selects what is already selected, so there is
            no handler; a control that cannot change state must not pretend it
            can. */}
        <div
          className={`plan-pick${FOUNDING_OPEN && plan.saving ? " is-ladder" : " is-solo"}`}
          role="radiogroup"
          aria-label="Your plan"
        >
          {/* ══ THE FIRST EARLY BIRD, SOLD OUT ═════════════════════════════
              Kiran, 23 Sep 2026: the $4.99 Early Bird is over; the live tile
              below is an "Early-ish Bird" at $5.99. Shown, struck and flagged
              "Sold out" in the same corner flag Standard uses for "Coming
              soon", and refused the same way when tapped. */}
          {FOUNDING_OPEN ? (
            <div
              className={`plan-opt is-later is-sold${refused === "sold" ? " is-refused" : ""}`}
              role="radio"
              aria-checked="false"
              aria-disabled="true"
              tabIndex={0}
              onClick={saySoldOut}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  saySoldOut();
                }
              }}
            >
              <span className="plan-chip">Sold out</span>
              <b>Early Bird Deposit</b>
              <span className="plan-figs">
                <span className="plan-now">
                  <s className="tnum">{firstEarlyBirdPrice}</s>
                  <span className="plan-else">Every spot at this price has been claimed</span>
                </span>
              </span>
            </div>
          ) : null}

          <div className="plan-opt is-on" role="radio" aria-checked="true" tabIndex={0}>
            {/* NOT `plan.label` ("Monthly"), and NO `plan.per` ("a month").
                Kiran, 15 Sep 2026. What is taken today is one charge that holds
                the seat; the recurring rate and its cadence are the consent
                sentence's job, two lines below, where they are disclosed
                together with the control. A tile reading "Monthly · $4.99 a
                month" put the schedule on the object and said it twice.

                Follows the flip: after the Early Bird spots are gone there is
                nothing early about it, and `plan.label` is not a substitute
                because it names the cadence this tile no longer states. */}
            <b>{FOUNDING_OPEN ? `${foundingTierName} Deposit` : "Deposit"}</b>
            <span className="plan-figs">
              <span className="plan-now">
                <b className="tnum">{plan.price}</b>
                {/* WHAT THE DEPOSIT IS, said beside the figure. Sam, 20 Sep
                    2026: "we'd want to say for early bird price at checkout
                    that the $4.99 counts towards the first month." It is the
                    answer to the only question the word "deposit" raises, and
                    it sits where the Standard tile's own second line sits, so
                    the two tiles read as a pair rather than as a price and a
                    price-with-a-note.

                    The "$14.99 for everyone else" footnote that used to be
                    here became the tile below; printing it in both places put
                    the same figure twice, adjacent. */}
                <span className="plan-else">Counts toward your first month</span>
              </span>
            </span>
          </div>

          {/* ══ THE STANDARD TIER, SHOWN AND NOT SELECTABLE ═══════════════
              Sam, 20 Sep 2026: "I think we should have a second tier right
              beneath and it'd be the $14.99 membership. This creates a really
              strong price anchor. Of course no one would be able to select it
              because it's not live yet."

              WHAT KEEPS THIS THE RIGHT SIDE OF §10. An anchor is a dark
              pattern when the reference price is invented, or when the option
              looks available and is not. Neither holds: $14.99 is the real
              standard rate this build already prints in the seat line and in
              the founding lock, read from the same `plan.saving.after` the
              tile above used to carry — and this tile says in its own words
              that it is not open yet, rather than leaving a reader to discover
              that by tapping.

              `aria-disabled` AND reachable, which is the pair that makes an
              unavailable option honest: a screen reader meets "Standard, not
              selected, dimmed, 2 of 2", the tile is in the tab order so the
              same reader can reach it, and activating it produces the same
              sentence a tap does rather than nothing at all. */}
          {FOUNDING_OPEN && plan.saving ? (
            <div
              className={`plan-opt is-later${refused === "later" ? " is-refused" : ""}`}
              role="radio"
              aria-checked="false"
              aria-disabled="true"
              tabIndex={0}
              onClick={sayLater}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  sayLater();
                }
              }}
            >
              {/* Sam, 20 Sep 2026: "this should have a chip that says 'coming
                  soon'." The tile's second line already said WHEN it opens;
                  this says THAT it is not open, which is the faster read and
                  the one a reader needs before they tap.

                  A CORNER FLAG, not a pill beside the label. This build
                  already marks "signed, not open" on the venue cards with a
                  flag in the tile's top corner (.vflag.is-soon), and reusing
                  it does two things a pill could not: the status leaves the
                  reading line entirely, so "Standard" sits alone above its
                  own price the way "Early Bird Deposit" does, and the two
                  places this product says "not yet" now say it the same way.
                  As a pill it was also wider than the word it qualified. */}
              <span className="plan-chip">Coming soon</span>
              <b>Standard</b>
              <span className="plan-figs">
                <span className="plan-now">
                  <b className="tnum">{plan.saving.after}</b>
                  <span className="plan-else">{`a month, once the ${foundingTierName} spots are gone`}</span>
                </span>
              </span>
            </div>
          ) : null}
        </div>

        {/* The sentence the toast used to carry, for a reader who cannot see
            a tile change colour. `status`, not `alert`: nothing failed. */}
        <p className="sr-only" role="status">
          {refused === "later"
            ? "Standard opens after launch. Early-ish Bird Deposit is the only plan open now."
            : refused === "sold"
              ? `The ${firstEarlyBirdPrice} Early Bird is sold out. Early-ish Bird Deposit is the only plan open now.`
              : ""}
        </p>

        {/* ══ THE ORDER CARD (23 Sep 2026, POLISH §29, §31) ═════════════════
            One card, text only: the seats, the schedule on its rail, the refund
            under a hairline, and from 1024 its own button (§31.1); below 1024
            the dock is the one Checkout. */}
        <section className="rs-order" aria-labelledby="rs-order-head">
          {/* The seats lead: `seatsLeft()` of `SEAT_CAP` (model/seats.ts, still
              artificial) and `foundingCloses`, only while FOUNDING_OPEN. The
              deadline shares the line from 480 and takes its own below. */}
          {FOUNDING_OPEN ? (
            <div className="rs-seats">
              <p className="rs-seats-line">
                <span>
                  <b className="tnum">{left}</b> of {SEAT_CAP} {foundingTierName} spots left
                </span>
                <span className="rs-seats-close">closes at {foundingCloses}</span>
              </p>
              {/* ⚠ THE FILL IS THE SEATS TAKEN, `1 − left / cap`, NOT THE SEATS
                  LEFT — DO NOT "FIX" IT. A bar nearly full says what the line
                  says; the line is the statement of record, this is aria-hidden. */}
              <span className="rs-seats-bar" aria-hidden="true">
                <i style={{ ["--p" as string]: `${1 - left / SEAT_CAP}` }} />
              </span>
            </div>
          ) : null}
          <h2 className="t-title rs-order-head" id="rs-order-head">
            What you pay, and when
          </h2>
          <ol className="rs-time">
            {schedule.map((stop) => (
              <li className="rs-stop" key={stop.id}>
                <p className="rs-stop-head">
                  <span className="rs-when">{stop.when}</span>
                  <span className="rs-fig tnum">{stop.figure}</span>
                </p>
                <p className="rs-clause">{stop.clause}</p>
              </li>
            ))}
          </ol>
          {refundLine ? <p className="rs-refund">{refundLine}</p> : null}
          {/* DESKTOP KEEPS ITS OWN BUTTON (Sam, 23 Sep 2026: "we still need a
              checkout button on desktop, unlike the sticky one we have on the
              mobile version"): shown from 1024; below it the dock is the one
              Checkout. Same handler, same words. */}
          <div className="rs-buy">
            <button type="button" className="action" onClick={openCheckout}>
              {paid ? "View your seat" : checkoutLabel}
            </button>
          </div>
        </section>
      </div>

      {/* ══ WHAT IT BUYS: THE INCLUDED PANEL, THE CARD AT ITS FOOT ═════════
          The left column from 1024; `display:contents` below it, where the
          panel follows the order card. */}
      <div className="rs-get-col">
        {/* ══ THE INCLUDED PANEL (23 Sep 2026, POLISH §18) ════════════════
            Sam, on the trial modal's call-out: "I like how you formatted
            this, maybe we use the same on the checkout flow." Its
            construction, rebuilt under `.rs-*`: one `--inner` plate, a
            heading, then what you get, where it works and the guarantee —
            the three open blocks that followed the count — as its rows.

            THE HEADING ANSWERS THE MODAL'S QUESTION. The call-out asks "Want
            this every week? And at every location?"; by checkout the reader
            has said yes, so the plate states it. Words, never a figure.

            NO BUTTON AND NO PRICE INSIDE IT. The action is the dock's and
            the money is the tiles' and the order card's; a second
            price here would be the same figure stated twice on one sheet. */}
        <section className="rs-inc" aria-labelledby="rs-inc-head">
          <h2 className="t-title rs-inc-head" id="rs-inc-head">
            Every week, at every location
          </h2>
          {/* Four lines, a check each — the checklist every reference plan
              sheet carries. The glyph is ink, not a tile. */}
          {included.length ? (
            <ul className="rs-checks">
              {included.map((item) => (
                <li key={item.id}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m3.2 8.4 3 3 6.6-6.8" />
                  </svg>
                  <span>{item.line}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {/* Where it works: the six marks stacked on the left, their names
              in a sentence beside them — the call-out's two-column row. */}
          <div className="rs-inc-also">
            <span className="rs-inc-marks" aria-hidden="true">
              {venues.map((v) => (
                <span
                  key={v.id}
                  className="collar"
                  data-field={logoField(v.id)}
                  style={{ ["--brand" as string]: v.brandColor }}
                >
                  <img src={v.logo} alt="" decoding="async" />
                </span>
              ))}
            </span>
            <p className="rs-inc-line">
              At{" "}
              {venues.map((v, k, all) => (
                <Fragment key={v.id}>
                  <span className="rs-venue-name">{v.name}</span>
                  {joinAfter(k, all.length)}
                </Fragment>
              ))}
              .
            </p>
          </div>
          {/* The guarantee, under a hairline (shell/GuaranteeLine.tsx). */}
          <GuaranteeLine />
          {/* ══ THE CARD LIVES IN THE PANEL (23 Sep 2026, POLISH §26) ══════
              It was the sheet's close under its own hairline (§8), a second
              object after the panel. The heading's list adds up to it, so the
              panel grows a foot: a hairline, the card centred at the one card
              width, no caption (its STARTS field says when it is hers). On a
              phone the panel closes page 0, so the card closes it there too.
              `cardRef` is what the deck's card flies onto (shell/cardFlight.ts),
              and the name field on page 1 still fills it as she types. */}
          <div className="rs-inc-card">
            <TapInCard
              name={cardName.trim() || undefined}
              innerRef={cardRef}
              className="reserve-card"
            />
          </div>
        </section>

      </div>

      {/* The phone's foot: sticky to the scroller's bottom, always on, page 0's
          Checkout below 1024 (reserve.css hides it from there). */}
      <div className="rs-dock">
        <button type="button" className="action" onClick={openCheckout}>
          {paid ? "View your seat" : checkoutLabel}
        </button>
      </div>
    </div>
  );
}
