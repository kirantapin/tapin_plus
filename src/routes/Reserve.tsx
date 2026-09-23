import { Fragment, useEffect, useRef, useState } from "react";
import TapInCard from "../shell/TapInCard";
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
  GUARANTEE_CONTACT,
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
   plan tiles, the schedule, the button and its count, the included panel, and
   the card.

   ══ THE INCLUDED PANEL, AND DESKTOP WITHOUT A SCROLL (23 Sep 2026, §18) ════
   Sam, on the trial modal's call-out: "I like how you formatted this, maybe we
   use the same on the checkout flow." So what you get, where it works and the
   guarantee — three open blocks — are one `--inner` panel in that call-out's
   construction (no button and no price inside it: the ledger carries both).
   And "checkout on desktop should be wider so I don't need to scroll": from
   1024 the sheet is two columns — the money on the left (tiles, schedule,
   button, count), what it buys on the right (the panel, the card). Below 1024
   the column wrappers generate no boxes, so the phone reads the same order. */
const plan = PLANS.monthly;

/* ══ THE SCHEDULE — WHAT YOU PAY, AND WHEN ══════════════════════════════════
   Shopify states its money as a schedule (`Today · 3 days free`, `Jul 3 ·
   $1/mo`, `Always · cancel anytime`); this is that, built from the model.
   Every price is `plan.price` / `plan.per` (so it follows the flip to the
   standard rate), the date is `launchWindow`, the credit and its floor are
   BENEFIT's, and the refund row exists only while the plan's own refund
   charge row does. The labels are words; a figure in a clause is the plan's.

   THE CREDIT ROW KEEPS THE EARN-BACK'S TWO GATES. `FOUNDING_OPEN`: after the
   flip the price is $14.99 and one $10 order does not come near it.
   `monthlyToday < creditUsd`: "more than the deposit" is a comparative, and if
   a founding price is ever set at or above the credit the row does not
   render rather than print a comparison that no longer holds. A `+` on a
   credit is money arriving, not a minus on a price (§16's refusals).

   The Halloween row states the RATE, not a second charge: today's deposit is
   the first month (the tile says so, and so do page 2's rows), the month
   itself starts when we open, and the same figure recurs from there.

   ONE LINE A ROW (23 Sep 2026, POLISH §23). Sam: "the rest could use some
   touching up." Each row was a label, a figure and a note under it — fifteen
   text objects for five facts. Now the clause rides after the label at the
   label's size, so a row is one line. Today has no clause: the tile above
   already says the deposit counts toward the first month. */
const refundRow = plan.chargeRows.find((r) => r.id === "refund");
const schedule: { id: string; when: string; clause?: string; figure: string }[] = [
  { id: "today", when: "Today", figure: plan.price },
  ...(FOUNDING_OPEN && monthlyToday < BENEFIT.creditUsd
    ? [
        {
          id: "credit",
          when: `Your first $${Math.round(BENEFIT.creditMinUsd)}+ order`,
          clause: "more than the deposit",
          figure: `+$${BENEFIT.creditUsd} credit`,
        },
      ]
    : []),
  {
    id: "opens",
    when: launchWindow,
    clause: `then ${plan.price} ${plan.per}, automatic`,
    figure: `${plan.price} ${plan.per}`,
  },
  { id: "always", when: "Always", clause: "never goes up while you stay", figure: plan.price },
  ...(refundRow
    ? [
        {
          id: "refund",
          when: "Before we open",
          clause: refundRow.detail.charAt(0).toLowerCase() + refundRow.detail.slice(1),
          figure: "Full refund",
        },
      ]
    : []),
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

/* The docked bar's own words, on the button too: the control on the page and
   the bar that stands in for it say the same thing. NOT `plan.per` — what this
   opens takes a DEPOSIT (Sam: "need to make sure it says $4.99 deposit"). */
const checkoutLabel = `Checkout · ${plan.price} deposit`;

export default function Reserve() {
  /* ══ THE CHECKOUT IS THIS SHEET'S OTHER PAGES NOW (21 Sep 2026) ═══════════
     The charge used to be a second sheet this page opened, so this file held
     its state. It is pages 1–3 of the one sheet the layer draws — see
     shell/ReserveLayer.tsx — and what is left to read from here is the two
     things the page's own controls need: whether a seat has been paid for, and
     the one call that moves the sheet on to "Your details". */
  const { paid, openCheckout } = useReserveFlow();

  /* ══ ONE VISIBLE "Reserve a founding seat" AT A TIME ═══════════════════════
     Sam, 13 Sep 2026: "while the 'reserve a founding seat' is in view there's
     no need for the sticky button."

     Right, and it is worse than redundant. The docked bar is a full-maroon
     control with the real button's exact words that CANNOT TAKE MONEY — it is
     an anchor to #checkout — so with both on screen the page shows two
     identical maroon buttons and the nearer one is the decoy. This build
     already removed that shape from /reserve's DESKTOP layout (layout.css's
     `.column:has(#checkout)` rule) and the mobile bar was logged as still open.
     This closes it, with the same IntersectionObserver the pitch uses on its
     hero CTA — one mechanism, not a second invention. */
  const paySlot = useRef<HTMLDivElement>(null);

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
  /* THE DOCKED CHECKOUT, for the phone sheet (Sam, 15 Sep 2026: "still need a
     sticky checkout button for this modal, which scrolls down to the buy
     box"). Shown while the real button is out of view, gone the moment it is
     not — two identical maroon buttons on one screen is the decoy problem
     this page solved once already. It scrolls; it never takes money. */
  const [ctaVisible, setCtaVisible] = useState(true);
  useEffect(() => {
    const el = paySlot.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  /* ══ ONE ACTION, IN TWO PLACES ════════════════════════════════════════════
     Sam, 21 Sep 2026: "when I click this sticky checkout button it should take
     me to the next step in the funnel instead of scrolling down or up to the
     checkout button."

     It used to `scrollIntoView` the real button, which asked the reader to
     press twice for one intention and moved the page under them to do it. Both
     controls now run this, so the docked bar IS the Checkout button rather
     than a pointer at it, and any guard added here can only ever be added
     once. (There is none today: the Standard tier's refusal is the tile's own
     pulse and never disabled this control.)

     THE OBSERVER STAYS, and so does `is-away`. Its job was never the scroll —
     it is what keeps two identical maroon buttons off one screen. `openCheckout`
     is the layer's: it moves the sheet to page 1 (shell/ReserveLayer.tsx). */
  const cardRef = useRef<HTMLDivElement | null>(null);
  /* The name she gave the card on the deck's close, or typed into the sheet —
     the card here shows it as it is typed. Placeholder until there is one. */
  const [cardName] = useName();
  // If the walkthrough sent us here, its card flies onto this one.
  useCardFlight(cardRef);

  /* ══ THE MODAL IS THE DECISION, AND ONLY THE DECISION ═══════════════════
     Sam, 15 Sep 2026: "the main focus is just on the sale." Since 23 Sep it
     reads as a review sheet (see the note above `plan`): the money as a
     schedule, one button, one panel of what it includes, the card. §4 is
     untouched — the rows, the consent and the control still travel together
     on page 2, one tap on. */
  return (
    <div className="rs-modal">
      {/* ══ THE MONEY: WHAT YOU PAY, AND THE DOOR TO PAYING IT ═════════════
          The left column from 1024 (tiles, schedule, button, count); below
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

        {/* ══ THE SCHEDULE ══════════════════════════════════════════════════
            Replaces the subtitle band ("earn the $4.99 back…", Sam 21 Sep) and
            the two prose lines under the tiles (the locked rate, the refund):
            the same facts, each a row with its figure on one right edge. An
            open ledger — hairlines between rows, no plate — because a panel
            around a list of charges is a bill, and this is the terms of one. */}
        <dl className="rs-ledger" aria-label="What you pay, and when">
          {schedule.map((row) => (
            <div className="rs-row" key={row.id}>
              <dt className="rs-when">
                {row.when}
                {row.clause ? (
                  <span className="rs-clause">
                    <span className="rs-sep"> · </span>
                    {row.clause}
                  </span>
                ) : null}
              </dt>
              <dd className="rs-fig tnum">{row.figure}</dd>
            </div>
          ))}
        </dl>

        {/* ══ THE DOOR TO THE CHARGE ═════════════════════════════════════════
            Sam, 13 Sep 2026: "we only need the disclosure and terms right at
            checkout." The rows, the consent, the wallet and the full terms are
            pages 1–2 of this sheet; this button moves it on.

            THE OBSERVER STAYS. It is what suppresses the docked bar while a real
            control is on screen — two identical maroon buttons on one screen is
            the decoy problem this page solved once already. */}
        <div className="rs-buy">
          <div ref={paySlot} className="pay-slot">
            <button type="button" className="action" onClick={openCheckout}>
              {paid ? "View your seat" : checkoutLabel}
            </button>
          </div>

          {/* ══ THE COUNT, AS THE BUTTON'S CAPTION ════════════════════════════
              Sam, 21 Sep 2026: "maybe we move the 6 of 50 counter right below
              the actual checkout button and allow the earn $5 back to replace
              it." So the head of the sheet is one statement instead of two
              stacked boxes, and the order a reader meets is price → button →
              how many are left: the scarcity qualifies the action rather than
              standing in front of it.

              AND IT IS THE BUTTON'S CAPTION, NOT A CARD. It sat in an --inner
              box with its own border, which made it a second object arguing with
              the panel it sits in; centred under the control, in the control's
              own measure, it needs no container at all. Every source is
              unchanged — `seatLine()` for the sentence, `seatsLeft()/SEAT_CAP`
              for the fraction, the real close date under it. Still artificial
              (model/seats.ts), still no clock.

              OUTSIDE `.pay-slot`, deliberately: that box is what the
              IntersectionObserver measures, and growing it would change when
              the docked bar hides.

              ONE LINE, THEN THE BAR (23 Sep 2026, POLISH §23): the count and
              the close date were a sentence, a bar and a second sentence. The
              tier is named in the tile above, so the line does not repeat it;
              the number is `seatsLeft()` of `SEAT_CAP` from model/seats.ts, the
              date `foundingCloses`, and the whole block only renders while
              FOUNDING_OPEN, so there is always a number here. */}
          {FOUNDING_OPEN ? (
            <div className="rs-seats-under">
              <p className="rs-seat-line">
                <b className="tnum">{seatsLeft()}</b> of {SEAT_CAP} spots left · closes {foundingCloses}
              </p>
              <span className="rs-meter" aria-hidden="true">
                {/* ⚠ THE FILL IS THE SEATS TAKEN, NOT THE SEATS LEFT, AND THAT
                    IS DELIBERATE — DO NOT "FIX" IT BACK. `1 - left/cap` is 88%
                    today where `left/cap` is 12%: a bar that is nearly full says
                    what the sentence above it says, while a bar with a 12%
                    sliver reads as an empty room. Same fact, drawn the way a
                    reader already reads a progress bar. The sentence is the
                    statement of record; this is aria-hidden and never carries a
                    number of its own. */}
                <i style={{ ["--p" as string]: `${1 - seatsLeft() / SEAT_CAP}` }} />
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ══ WHAT IT BUYS: THE INCLUDED PANEL, THEN THE CARD ═════════════════
          The right column from 1024; `display:contents` below it, where the
          panel and the card follow the count in the one column. */}
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

            NO BUTTON AND NO PRICE INSIDE IT. The action stays with the
            ledger and the money is the tiles' and the ledger's; a second
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
          {/* The guarantee, under a hairline: the promise and the address to
              claim it at, after the shield. The words are the model's
              (`guarantee`, `GUARANTEE_CONTACT`), and the claim is the
              server's to keep (TRUTH.md §3). */}
          <p className="rs-promise">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3.4 5.2 6v5.4c0 4.4 2.9 8.3 6.8 9.6 3.9-1.3 6.8-5.2 6.8-9.6V6L12 3.4Z" />
              <path d="m9.2 12.2 1.9 1.9 3.8-4" />
            </svg>
            <span>
              <b>{guarantee}</b>{" "}
              <a href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>
            </span>
          </p>
        </section>

        {/* ══ THE CARD IS THE SHEET'S CLOSE ═══════════════════════════════
            Sam, 21 Sep 2026, at the foot of this sheet: "we should /impeccable
            redesign this section of the checkout it's a bit weird. The membership
            card feels out of place."

            WHAT MADE IT WEIRD WAS THE PLATE. Three surfaces nested — the light
            sheet, a white panel labelled YOUR CARD, and the dark maroon card
            inside it — and a dark object on a white plate on a light sheet is a
            framed picture of a thing, not the thing. The uppercase label was the
            eyebrow tic §2 removed everywhere else, and it announced that the last
            object before the button is something the reader does not own yet.

            The panel was the answer to "not awkwardly" on 20 Sep, and the plate
            is what is awkward now. So the card stops being CONTENT and becomes
            the sheet's CLOSE: one hairline, the card on the sheet's own ground at
            the size you would hold one, and a single line under it saying when it
            is hers. Nothing above the rail moves; the docked button still clears
            it; `TapInCard`'s name contract is untouched, so the field in the
            checkout still fills this card as she types.

            NO CAPTION SINCE 23 Sep 2026 (POLISH §23). "Yours from Halloween
            2026" said what the card's own STARTS field says, an inch above it.
            The hairline stays; the card is the last thing on the sheet. */}
        <div className="rs-card-close">
          <div className="rs-card">
            <TapInCard
              name={cardName.trim() || undefined}
              innerRef={cardRef}
              className="reserve-card"
            />
          </div>
        </div>
      </div>

      <div className={`rs-dock${ctaVisible ? " is-away" : ""}`} aria-hidden={ctaVisible}>
        <button
          type="button"
          className="action"
          tabIndex={ctaVisible ? -1 : 0}
          onClick={openCheckout}
        >
          {/* NOT `plan.per` ("a month"). What this button opens takes a
              DEPOSIT, and the tile it docks under says so — a bar reading
              "$4.99 a month" beside a tile reading "$4.99 deposit" is the
              same figure carrying two different promises. Sam settled the
              word today: "need to make sure it says $4.99 deposit." */}
          {checkoutLabel}
        </button>
      </div>
    </div>
  );
}
