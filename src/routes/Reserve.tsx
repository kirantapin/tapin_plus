import { useEffect, useLayoutEffect, useRef, useState } from "react";
import TapInCard from "../shell/TapInCard";
import IncludedPanel from "../shell/IncludedPanel";
import Timeline, { type Stop } from "../shell/Timeline";
import { useCardFlight } from "../shell/cardFlight";
import { useReserveFlow } from "../shell/ReserveLayer";
import { useName } from "../model/nameStore";
import { SEAT_CAP } from "../model/seats";
import { useSeatsLeft } from "../model/presale";
import {
  PLANS,
  launchWindow,
  FOUNDING_OPEN,
  foundingCloses,
  firstEarlyBirdPrice,
  foundingTierName,
  monthlyToday,
  GUARANTEE_CONTACT,
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
   included panel with the card at its foot, the plan tiles, the order card
   (the seats, the schedule), and the docked button (§31).

   ══ THE INCLUDED PANEL, AND DESKTOP WITHOUT A SCROLL (23 Sep 2026, §18) ════
   Sam, on the trial modal's call-out: "I like how you formatted this, maybe we
   use the same on the checkout flow." So what you get, where it works and the
   guarantee — three open blocks — are one `--inner` panel in that call-out's
   construction (no button and no price inside it).
   And "checkout on desktop should be wider so I don't need to scroll": from
   1024 the sheet is two columns — what it buys on the left (the panel, the
   card inside it), the money on the right (tiles, order card; §30), the dock
   under both. Below 1024 the column wrappers generate no boxes, so the phone
   reads the DOM order: the panel first, then the money (24 Sep 2026). */
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
/* THE WAY OUT (Sam, 24 Sep 2026: "shorten it to just the cancel and refund
   part"; the guarantee is the panel's). Held to the terms: cancel any time; a
   full refund only while the refund charge row stands, before we open. */
const refundLine = plan.chargeRows.some((r) => r.id === "refund")
  ? "Cancel any time, with a full refund before we open, no reason needed."
  : "Cancel any time, no reason needed.";
/* And the door to a person (Sam, 30 Sep 2026: "can we add support@tapin.app
   here?"): the same address the guarantee gives, as a mailto, after the
   sentence. */
const refundFoot = (
  <>
    {refundLine} Questions?{" "}
    <a className="rs-contact" href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>
  </>
);
const schedule: Stop[] = [
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
    /* The "Always" row folded in here (Sam, 30 Sep 2026: the sheet was busy). */
    clause: "Then automatically, your first month already paid. Never goes up while you stay a member.",
  },
];

/* The checklist, the six marks and the guarantee are shell/IncludedPanel.tsx
   now, shared with /in; the schedule's rail is shell/Timeline.tsx. */

/* The dock's words. NOT `plan.per` — what this opens takes a DEPOSIT (Sam:
   "need to make sure it says $4.99 deposit"). */
const checkoutLabel = `Checkout · ${plan.price} deposit`;

/* A count that falls while the sheet is open settles over this long. */
const SETTLE_MS = 240;
/* Under this many spots the bar turns red and pulses (Sam, 30 Sep 2026). */
const LOW_SEATS = 20;
/** Reduced motion, or a `data-still` ancestor: the count changes in one step. */
const holdsStill = (el: Element | null | undefined): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  el?.closest("[data-still]") != null;

/* ══ THE SEATS: ONE OBJECT, TWO HOMES (POLISH §31, §45, §67) ══════════════
   The count and its bar, from `useSeatsLeft()` (model/presale.ts, the invented
   schedule every visitor shares; it re-reads each minute) of `SEAT_CAP`.
   From 1024 it leads the order card; below 1024 it rides on the dock, over
   the button (Sam, 23 Sep: "make this counter a part of the sticky button").
   One component in both, so the tick and the settle are one implementation;
   reserve.css shows the copy that belongs to the width. */
function Seats() {
  const left = useSeatsLeft();
  /* Each tick: the number settles from 1.06 to its size, and the bar's fill
     follows the same step over its own transform. Transform only; under
     reduced motion both change in one step and nothing plays. */
  const num = useRef<HTMLElement | null>(null);
  const fill = useRef<HTMLElement | null>(null);
  const was = useRef(left);
  useLayoutEffect(() => {
    const from = was.current;
    was.current = left;
    const n = num.current;
    const f = fill.current;
    if (left === from || !n || !f || holdsStill(n)) return;
    const timing = {
      duration: SETTLE_MS,
      easing: getComputedStyle(n).getPropertyValue("--ease").trim() || "cubic-bezier(.22,1,.36,1)",
    };
    n.animate([{ transform: "scale(1.06)" }, { transform: "none" }], timing);
    f.animate(
      [
        { transform: `scaleX(${from / SEAT_CAP})` },
        { transform: `scaleX(${left / SEAT_CAP})` },
      ],
      timing,
    );
  }, [left]);
  return (
    <div className={left < LOW_SEATS ? "rs-seats is-low" : "rs-seats"}>
      <p className="rs-seats-line">
        <span className="rs-seats-count">
          <b className="tnum rs-seats-n" ref={num}>{left}</b> of {SEAT_CAP} {foundingTierName} spots left
        </span>
        <span className="rs-seats-close">closes at {foundingCloses}</span>
      </p>
      {/* The fill is the spots LEFT, `left / cap` (Sam, 30 Sep 2026: "this
          should be inverted, the black bar would be shorter now"), so it
          shrinks as they go. The line is the statement of record; this is
          aria-hidden. */}
      <span className="rs-seats-bar" aria-hidden="true">
        <i ref={fill} style={{ ["--p" as string]: `${left / SEAT_CAP}` }} />
      </span>
    </div>
  );
}

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
  /* ══ NO DROP AND NO BANNER AT CHECKOUT (§67) ══════════════════════════════
     Sam, 26 Sep 2026: the purchase notification here was "a bit too easy to
     spot as fake". The count falls on the shared schedule instead, and the
     purchases it counts are the ones the pages' notifications name. */
  const modal = useRef<HTMLDivElement | null>(null);

  /* ══ THE MODAL IS THE DECISION, AND ONLY THE DECISION ═══════════════════
     Sam, 15 Sep 2026: "the main focus is just on the sale." Since 23 Sep it
     reads as a review sheet (see the note above `plan`): the money as a
     schedule, one button, one panel of what it includes with the card at its
     foot. §4 is
     untouched — the rows, the consent and the control still travel together
     on page 2, one tap on. */
  /* The sold-out tile refuses a tap with a brief shake and a status line
     (Kiran's tile, 23 Sep; kept 30 Sep, Sam: "creates scarcity"). */
  const [refused, setRefused] = useState<"sold" | null>(null);
  const calm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(calm.current), []);
  const saySoldOut = () => {
    setRefused(null);
    window.clearTimeout(calm.current);
    window.requestAnimationFrame(() => {
      setRefused("sold");
      calm.current = window.setTimeout(() => setRefused(null), 900);
    });
  };
  return (
    <div className="rs-modal" ref={modal}>
      {/* ══ WHAT IT BUYS: THE INCLUDED PANEL, THE CARD AT ITS FOOT ═════════
          The left column from 1024; `display:contents` below it, where the
          panel opens the sheet in place of the photo-card row (Sam, 24 Sep
          2026: "get rid of the top section of the checkout… and replace it"). */}
      <div className="rs-get-col">
        {/* The included panel (shell/IncludedPanel.tsx, POLISH §18): the
            heading, the checklist, the six marks and the guarantee, with the
            card at its foot. Shared with /in, which has its own card above. */}
        <IncludedPanel>
          {/* ══ THE CARD LIVES IN THE PANEL (23 Sep 2026, POLISH §26) ══════
              It was the sheet's close under its own hairline (§8), a second
              object after the panel. The heading's list adds up to it, so the
              panel grows a foot: a hairline, the card centred at the one card
              width, no caption (its STARTS field says when it is hers). On a
              phone the panel opens page 0 (24 Sep), so the card leads into
              the tiles. `cardRef` is what the deck's card flies onto (shell/cardFlight.ts),
              and the name field on page 1 still fills it as she types. */}
          <div className="rs-inc-card">
            <TapInCard
              name={cardName.trim() || undefined}
              innerRef={cardRef}
              className="reserve-card"
            />
          </div>
        </IncludedPanel>
      </div>

      {/* ══ THE MONEY: WHAT YOU PAY, AND THE DOOR TO PAYING IT ═════════════
          The right column from 1024 (the tiles, then the order card); below
          1024 this wrapper is `display:contents` and follows the panel. */}
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
          className={`plan-pick${FOUNDING_OPEN ? " is-ladder" : " is-solo"}`}
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
        <p className="sr-only" role="status">
          {refused === "sold"
            ? `The ${firstEarlyBirdPrice} Early Bird is sold out. ${foundingTierName} Deposit is the only plan open now.`
            : ""}
        </p>
        {/* The price anchor as one line, not a tile (Sam, 30 Sep 2026: the
            sheet was busy). The $14.99 is the same `plan.saving.after` the
            Standard tile carried. */}
        {FOUNDING_OPEN && plan.saving ? (
          <p className="t-compact plan-after">
            After the first {SEAT_CAP} spots, it&rsquo;s {plan.saving.after} a month.
          </p>
        ) : null}

                  </div>

        
        {/* ══ THE ORDER CARD (23 Sep 2026, POLISH §29, §31) ═════════════════
            One card, text only: the seats, the schedule on its rail, the refund
            under a hairline, and from 1024 its own button (§31.1); below 1024
            the dock is the one Checkout. */}
        <section className="rs-order" aria-labelledby="rs-order-head">
          {/* The seats lead the card from 1024, only while FOUNDING_OPEN;
              below 1024 this copy is hidden and the dock's is shown (§45). */}
          {FOUNDING_OPEN ? <Seats /> : null}
          <h2 className="t-title rs-order-head" id="rs-order-head">
            What you pay, and when
          </h2>
          <Timeline stops={schedule} foot={refundFoot} />
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

      {/* The phone's foot: sticky to the scroller's bottom, always on, page 0's
          Checkout below 1024 (reserve.css hides it from there). The seats
          ride on it there, over the button (§45); the button alone once the
          round has closed. */}
      <div className="rs-dock">
        {FOUNDING_OPEN ? <Seats /> : null}
        <button type="button" className="action" onClick={openCheckout}>
          {paid ? "View your seat" : checkoutLabel}
        </button>
      </div>
    </div>
  );
}
