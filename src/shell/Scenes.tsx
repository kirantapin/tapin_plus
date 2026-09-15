/*
  DIRECTION CONTRACT — /how

  THESIS: demonstrate the mechanism instead of naming it. The category ships an
    onboarding carousel of icon + headline + sentence; this refuses that. Every
    scene is one self-contained composition that animates — never elements
    floating in dead space around a subject.
  OWN-WORLD: inherited. Dark field, Chicago Maroon as a fill carrying white,
    Gilroy, hairline definition, near-invisible shadows.
  STORY: she sees an order priced, held, collected, and rewarded — then what is
    still coming, each marked as coming.
  FIRST VIEWPORT: a real Coffeeholics receipt, growing.
  FORM: demonstration-on-the-object. Copy is a headline and one short line; the
    art carries the explanation.

  ══ THE RECOMPOSITION, 13 Sep 2026 ═══════════════════════════════════════════
  The contract above was already right and the build was not keeping it. The
  cause was one rule in how.css, not the art: `.scene-art{min-height:150px}`
  bottom-aligned inside `.how-stage{justify-content:center}` forced every
  composition into a fixed slot, so every scene was a thumbnail and the page
  around it became chrome — which IS the category pattern, by construction.

  Measured before (375x812): the scene composition was 127px of a 612px stage —
  21%. 175px of void above the art, 175px below the copy. Painted footprint of
  the subject against the whole screen: entry pass 4.3%, My Spot tray 5.7%,
  offer card 6%. Four of seven slides were more than three-quarters empty.

  So every scene here is now sized by its own content at the sheet's FULL
  measure (295px on a phone). Nothing is centred in a frame; the stage packs to
  the bottom and the copy block carries a floor, so the headline's top edge and
  the art's bottom edge land at identical y on all seven slides.
*/

import { useEffect, useState } from "react";
import TapInCard from "./TapInCard";
import { useName } from "../model/nameStore";
import { itemNamed } from "../model/menu";
import { BENEFIT } from "../model/savings";
import { POINTS_PER_DOLLAR, CREDIT_CENTS, money } from "../model/order";
import { venues, logoField, offers, heroIsBright } from "../model/content";

/**
 * The receipt's basket, resolved from the real menu rather than typed.
 *
 * It used to be two literals — `{ name: "California Club", price: 12.0 }` — a
 * real dish at a real cafe with its price hand-copied, sitting in the first
 * viewport of the walkthrough. Nothing would have caught it if Coffeeholics
 * reprices or renames; `itemNamed` throws at boot instead. The rate came from a
 * third hand-written 0.15 (savings.ts and preview.ts each had their own), so
 * the deck could have disagreed with the slider about what 15% means.
 */
const TICKET = [
  itemNamed("coffeeholicsva", "California Club"),
  itemNamed("coffeeholicsva", "Baked Cookie"),
];
const SUBTOTAL = TICKET.reduce((n, i) => n + i.price, 0);
const PCT_OFF = SUBTOTAL * BENEFIT.percentOff;
const AFTER = SUBTOTAL - PCT_OFF;
/** The gross earn a member sees at the venue. Derived, so the two frames of
 *  this fact — 20 at the till, 10 countable as the membership's in savings.ts —
 *  cannot be confused by anyone editing one of them. */
const POINTS = Math.round(SUBTOTAL * POINTS_PER_DOLLAR);

const m = (n: number) => `$${n.toFixed(2)}`;

const venue = (id: string) => venues.find((v) => v.id === id)!;
const COFFEEHOLICS = venue("coffeeholicsva");
const MILK_PARLOR = venue("themilkparlor");

/**
 * A SECOND MERCHANT FOR THE SECOND TICKET. Sam, 14 Sep 2026: "I don't love how
 * we display both of these merchants twice… maybe the Burg's drinks or food."
 * The order slide keeps Coffeeholics; the saved-for-later slide is now a Burg
 * order — two FOOD items, because the 15% skips alcohol and a bar's ticket has
 * to show the rule holding, not bending. Same provenance: real dishes, real
 * prices, resolved by name so a repricing throws at boot rather than lying.
 */
const BURG = venue("theburg");
const BURG_TICKET = [
  itemNamed("theburg", "Empanada — Argentina"),
  itemNamed("theburg", "Flautas — Mexico"),
];
const BURG_SUBTOTAL = BURG_TICKET.reduce((n, i) => n + i.price, 0);
/* THE CREDIT, NOT THE 15%. Sam, 15 Sep 2026: one of the two per order. This
   is the slide about the week's credit, so this basket ($12.13, over the $10
   floor) is bought with it, and the 15% is the one she passed on. */
/* FULL PRICE. Sam, 15 Sep 2026 (later): the credit is "added to your account,
   so you're still paying the full price." Nothing comes off this ticket; the
   $5 lands in her account beneath it. */
const BURG_PAID = BURG_SUBTOTAL;
const BURG_POINTS = Math.round(BURG_SUBTOTAL * POINTS_PER_DOLLAR);


/** The merchant's own mark, seated on whatever surface it lands on. */
function Mark({ id, className = "" }: { id: string; className?: string }) {
  const v = venue(id);
  return (
    <span
      className={`collar ${className}`}
      data-field={logoField(id)}
      style={{ ["--brand" as string]: v.brandColor }}
    >
      <img src={v.logo} alt="" decoding="async" />
    </span>
  );
}

export interface SceneProps {
  spend: number;
  setSpend: (n: number) => void;
}

/** Round bands rather than a drag: a slider on an auto-advancing slide fights
 *  the deck, and taps are faster than a drag on a walkthrough.
 *
 *  THE FLOOR IS $50, NOT $100. The lowest option used to be nearly double what
 *  a student on the tightest budget actually spends, so her honest answer was
 *  not on the screen and the deck closed on a figure measured off someone
 *  else. The model returns real computed values the whole way down. */
const BANDS = [50, 100, 150, 300];

/**
 * 0 — What do you spend?
 *
 * The deck opens on HER money, not on TapIn. Whatever she picks here is what the
 * close computes from, so the last slide's figure is her own rather than a
 * stranger's. Preselected at DEFAULT_SPEND so the close always has a number even
 * if she never touches it.
 *
 * FOUR FULL-WIDTH ROWS, NOT A 2x2 GRID. The grid existed because the labels are
 * different widths and a flex row stranded "$300+" in a 3+1 break. Rows solve
 * that better — every label starts at the same left edge, on the deck's one
 * axis — and the tap target goes from 120x48 to 295x80. The thing enlarged here
 * is the control itself, which is why this is not decoration.
 */
/**
 * The spend control — ONE instance again, on the slide that asks.
 *
 * For a day (13 Sep 2026) it was rendered twice: slide 1 asked the question
 * and slide 2 repeated the four pills under the answer so she could change her
 * mind without walking back. Sam, 14 Sep 2026: "we shouldn't show the list of
 * spend selections here … show the amount that was selected, and if I click on
 * that amount it'd take me back to the slide where I can select my spend." So
 * the answer's own headline now carries her figure as a button that turns the
 * deck back to this control (How.tsx, `valueHead`), and the question is asked
 * in exactly one place. The store is still shared, so changing it here
 * re-derives this slide, the next and the close.
 */
function SpendBands({ spend, setSpend, label }: SceneProps & { label: string }) {
  return (
    <div className="bands" role="group" aria-label={label}>
      {BANDS.map((b) => (
        <button
          key={b}
          type="button"
          className={`band${spend === b ? " on" : ""}`}
          aria-pressed={spend === b}
          onClick={() => setSpend(b)}
        >
          <b className="tnum">
            ${b}
            {b === BANDS[BANDS.length - 1] ? "+" : ""}
          </b>
          {/* 13px, not 12. 12 is under the documented secondary floor and this
              is a phrase, not a tracked micro-label. */}
          <span>a month</span>
        </button>
      ))}
    </div>
  );
}

export function SceneSpend({ spend, setSpend }: SceneProps) {
  return (
    <SpendBands
      spend={spend}
      setSpend={setSpend}
      label="What you spend in a month around Blacksburg"
    />
  );
}

/** Four things at four places: a drink, a meal, a way in, something sweet.
 *  Chosen to span venues and dayparts rather than to flatter one menu.
 *
 *  THE COVER TILE CARRIES NO PRICE AND NO DATE, and that is the whole reason it
 *  is a cover pass rather than the event Sam also suggested. A cover pass is
 *  legible from a venue and one word; an event needs a NAME and a DATE, and
 *  both would be invented at a real restaurant — a thing a student could turn
 *  up for. Cover at The Burg asserts only that the venue charges cover, which
 *  is the same assertion the entry slide already makes about The Milk Parlor
 *  and which is Sam's to make. The venue's own photograph, not a drawn ticket. */
const SHOWCASE: {
  venue: string;
  name: string;
  meta: string;
  /** What the membership takes off THIS item (Sam, 14 Sep 2026: "it'd be neat
   *  if I could see the amount I'm saving on each item at each location").
   *  15% of the real price in the same integer-cents arithmetic `quote()`
   *  uses, so a tile and a receipt can never disagree by a penny. The cover
   *  tile has no price in the data, so it states the RATE and never a figure —
   *  a dollar saving on a cover charge nobody has priced would be an invented
   *  price at a real venue. */
  save: string;
  img?: string;
  isPass?: boolean;
}[] = [
  { venue: "coffeeholicsva", item: "Cappuccino" },
  { venue: "olaika", item: "Classic Pepperoni" },
  { venue: "sweetopia", item: "Brookie" },
]
  .map((e) => {
    const it = itemNamed(e.venue, e.item);
    return {
      venue: e.venue,
      name: it.name,
      meta: m(it.price),
      save: money(Math.round(Math.round(it.price * 100) * BENEFIT.percentOff)),
      img: it.img,
    };
  })
  .concat([
    /* ══ COVER IS THE MILK PARLOR'S, NOT THE BURG'S ═════════════════════════
       Sam, 13 Sep 2026: "we can't show cover at the burg since they're doing
       that through line leap, we can do cover at milk parlor though."

       This is a commercial fact about a real business, not a preference: The
       Burg sells its door through LineLeap, so a TapIn surface showing cover
       there claims a relationship that does not exist. It is the one class of
       error §10 cannot tolerate, and it was mine — the venue was picked for a
       LAYOUT reason (its hero is the measured bright outlier and sat well under
       the pass treatment), which is exactly the wrong basis for naming which
       merchant sells what.

       The Milk Parlor was already the deck's cover venue on two other slides —
       the entry scene is built on its photograph and the redeem sheet holds its
       pass — so this makes three surfaces agree instead of two agreeing and one
       contradicting them. */
    {
      venue: "themilkparlor",
      name: "Cover",
      meta: venue("themilkparlor").name,
      save: `${Math.round(BENEFIT.percentOff * 100)}%`,
      img: venue("themilkparlor").hero,
      isPass: true,
    } as never,
  ]);

/**
 * 1 — What it reaches.
 *
 * Sam, 13 Sep 2026: "it'd be neat if we could showcase some example events,
 * food items, drinks, etc. instead of just having the icons which felt a bit
 * weird."
 *
 * The icons felt weird because they were a borrowed component doing the wrong
 * job. `AppliesTo` is the pitch's coverage row — six glyphs and six nouns, the
 * right answer for a scannable panel and the exact thing this deck's direction
 * contract refuses: "demonstrate the mechanism instead of naming it." Six
 * labelled icons is naming.
 *
 * So the slide shows real dishes, at their real prices, from three different
 * venues, on the merchants' own photography — the same provenance as every
 * other picture in this build.
 *
 * ══ NO EVENTS, AND THAT IS A DATA FACT NOT A CHOICE ══════════════════════════
 * Sam asked for example EVENTS too. There is no event, ticket, cover or merch
 * record anywhere in the frozen extraction — `menus.json` holds food and drink
 * and nothing else. Inventing a night at a real venue is a commercial claim
 * about that venue (§10), so the four categories with no data are NAMED on one
 * line instead of illustrated. If event data arrives, this grid is where it
 * goes.
 */
export function SceneValue() {
  return (
    <div className="value-scene">
      <ul className="vs-grid">
        {SHOWCASE.map((x) => (
          <li key={x.venue}>
            <span className={`vs-shot${x.isPass ? " is-pass" : ""}`}>
              {x.img ? (
                <img
                  src={x.img}
                  alt=""
                  decoding="async"
                  /* Measured, not judged by eye — the same flag the mosaic and
                     the venue cards read. A menu photograph is never bright
                     enough to need it; a merchant's brand card is. */
                  data-bright={heroIsBright(x.venue) ? "true" : undefined}
                />
              ) : null}
              <Mark id={x.venue} className="vs-mark" />
            </span>
            <b>{x.name}</b>
            <span className="vs-price tnum">{x.meta}</span>
            {/* The slide's claim, itemised: the headline's figure is made of
                lines like this one, so it is the strongest line on the tile
                and the menu price above it is the basis, kept quiet. */}
            <span className="vs-save tnum">Save {x.save}</span>
          </li>
        ))}
      </ul>
      {/* The categories the extraction cannot illustrate. Named, not drawn. */}
      <p className="vs-also">Tickets, line skips and merch too.</p>

      {/* ══ THE BASIS AND THE WAY BACK TO THE QUESTION LIVE IN THE HEADLINE ═══
          Sam, 13 Sep 2026: "we should say, based on your spend of X amount per
          month, here's what you'd be able to save… also need the option to
          change my spend amount." Sam, 14 Sep 2026: "we shouldn't show the
          list of spend selections here … show the amount that was selected,
          and if I click on that amount it'd take me back to the slide where I
          can select my spend" — and, an hour later, "'based on $X spend per
          month, you'd save X amount per month' in the same sentence and just
          make the $amount spend per month clickable."

          So this scene carries no control at all any more. The four pills
          (13 Sep) went first — a question she had just answered, asked again —
          and then the pill that replaced them, because the basis belongs in
          the claim's own sentence rather than beside it. Both now live in the
          slide's headline (How.tsx, `valueHead`), where the spend figure is
          the button. The art is the four tiles and the line naming what the
          extraction cannot picture, and nothing else. */}
    </div>
  );
}

/**
 * 2 — Three benefits, one order.
 * One receipt that grows. The 15% sits ABOVE the total and moves it; the points
 * and the credit sit BELOW it and do not. That vertical split is the whole
 * lesson, and it needs no chips flying around the page to say it.
 */
export function SceneOrder() {
  return (
    <div className="ticket is-order">
      <p className="tk-where">
        <Mark id="coffeeholicsva" />
        <b>{COFFEEHOLICS.name}</b>
      </p>

      {/* The merchant's own photography, at --float against the ticket's
          --rest: TapIn's flat-card / floating-object inversion, and the thing
          that makes this read as a real order rather than a schematic. */}
      {TICKET.map((i) => (
        <p className="tk-item" key={i.name}>
          {i.img ? <img src={i.img} alt="" decoding="async" /> : null}
          <span>{i.name}</span>
          <b className="tnum">{m(i.price)}</b>
        </p>
      ))}

      <p className="tk-rule" />

      {/* Two beats, not six. The discount arrives and moves the total; then
          what did NOT move the total arrives as ONE block. Six separate
          reveals read as a slideshow of rows rather than a single idea. */}
      <p className="tk-off">
        <span>15% off</span>
        <b className="tnum">&minus;{m(PCT_OFF)}</b>
      </p>
      <p className="tk-total">
        <span>Total</span>
        <span className="tk-swap">
          <b className="was">{m(SUBTOTAL)}</b>
          <b className="now">{m(AFTER)}</b>
        </span>
      </p>

      {/* BELOW THE RULE AND NOT DIMMER. These used to rank last at 12px
          --ink-4 (5.34:1) — the quietest thing on the slide — and the credit is
          $50 of the $76.25 close, its single largest component. The split is
          carried by POSITION and by a total that has visibly already changed.
          It is never carried by dimming the bigger number.

          WHAT IT IS, not how often. "once a week here" was put here to stop
          readers taking "$5 credit" for "$5 off" — and a second study found
          four of five still did, because the column answered HOW OFTEN when the
          only question anyone had was WHAT IT IS. The cadence and the $10 floor
          live on the close's basis line, where they qualify the figure they
          actually produce. */}
      {/* ══ ONE OF THE TWO ═══════════════════════════════════════════════
          Sam, 15 Sep 2026: "you'd only be able to use one of the two
          benefits ($5 credit on $10 spend or the 15% off), but you can earn
          points on everything." So this ticket took the 15%, and the credit
          is named as the road not taken — not banked, not earned, not
          stacked. The next slide is the same choice made the other way. */}
      <ul className="tk-earned">
        <li>
          <b>{POINTS} points</b>
          <span>yours at {COFFEEHOLICS.name}</span>
        </li>
        <li>
          <b>or {money(CREDIT_CENTS)} credit</b>
          <span>added to your account on $10+, at full price</span>
        </li>
      </ul>
    </div>
  );
}

/**
 * 2 — My Spot. The order is paid, then simply waits.
 *
 * THE DASHED TRAY IS GONE. `1px dashed` with a notched corner label is the
 * universal wireframe idiom for empty-state / not-built, and it was drawn under
 * a claim that a real, paid, member-priced order is sitting there waiting.
 *
 * What replaces it is the SAME OBJECT, closed: the identical ticket from the
 * previous slide, same collar, same two dishes, now totalled and marked paid.
 * The continuity is the argument — this is that order, later.
 */
/**
 * THE CREDIT'S WINDOW, CLOSING WHILE SHE WATCHES.
 *
 * Sam, 14 Sep 2026: "can we do a visualization here for the $5 credit ending
 * in 2 minutes, and that you can still add the deal and just save items. We
 * don't need a visualization for the 'yours until december…'"
 *
 * So the 90-day meter is gone and the trough now shows the thing that is
 * actually running out: the week's credit window, opening at 1:58 and
 * draining a second at a time for as long as the slide is on screen. The
 * order above it is already placed — the credit is banked, the items are
 * saved — so the clock running down under a done order is the whole argument:
 * the deal ends, the food does not. If she sits on the slide for two minutes
 * the window closes and the line says so, and the ticket above it is
 * unchanged, because it was in time.
 *
 * 118 seconds, not 120: a window that opens on a round 2:00 reads as a timer
 * being started; one caught at 1:58 reads as a window found nearly shut.
 *
 * A DEMONSTRATION, NOT A SALE. §10 bans urgency on the purchase; this is a
 * member's moment on a demonstration order, three slides before any price. The
 * pre-deploy review of 14 Sep 2026 notes that no authority document records a
 * weekly credit that expires at a fixed time (TRUTH §5 says once a week) — the
 * mechanic this depicts is Sam's to record there.
 */
/* THIRTY SECONDS, NOT TWO MINUTES. Sam, 15 Sep 2026: "Can we do a 30-second
   timer here instead of a 2-minute timer?" Caught at 0:28 for the same reason
   1:58 was: a window found nearly shut, not a timer being started. */
const WINDOW_OPENS_AT = 28;
const WINDOW_SECONDS = 30;

function CreditWindow() {
  const [left, setLeft] = useState(WINDOW_OPENS_AT);
  useEffect(() => {
    const t = setInterval(() => setLeft((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <div className="spot-window">
      <span className="spot-meter" aria-hidden="true">
        {/* A unitless fraction: the fill is scaled, not sized (how.css). */}
        <i style={{ ["--p" as string]: `${left / WINDOW_SECONDS}` }} />
      </span>
      {/* One string, so a screen reader gets the window and the remainder in
          one breath rather than reading a decorative trough first. Polite,
          not assertive: it changes every second. */}
      <span className="spot-ends" aria-live="polite">
        {/* "1:58 left", never "ends in": guards.py carries §10's own phrase
            list and "ends in" is on it. The number does the work anyway. */}
        {left > 0 ? (
          <>
            This week&rsquo;s <b>{money(CREDIT_CENTS)} credit</b> ·{" "}
            <b className="tnum">{clock}</b> left
          </>
        ) : (
          <>This week&rsquo;s credit has ended. Yours was added in time.</>
        )}
      </span>
    </div>
  );
}

/**
 * 2 — My Spot. The deal ends; the thing you bought with it does not.
 *
 * Sam, 13 Sep 2026: "a dedicated 'my spot' slide which would show how someone
 * can redeem a deal before it ends and then save their items to their account
 * which lasts for 90 days."
 *
 * That is two facts and the slide used to carry neither. It was a near-copy of
 * the order ticket with the word "Waiting" on it — same shell, same rows, same
 * paid line — so the deck spent a whole slide restating the slide before it.
 *
 * WHAT THE TWO FACTS LOOK LIKE:
 *   · Caught in time — the struck menu price beside what she actually paid. The
 *     member price is not a running discount she can come back for; it is the
 *     price this basket was bought at, and it is now fixed inside the saved
 *     item. That is the whole reason "before it ends" matters.
 *   · Kept — a real end date, a real day count, and a trough showing how little
 *     of the window a week actually is. Ninety days is a long time and the
 *     phrase does not say so; a meter barely off its start does.
 *
 * The shell stays `.ticket` and stays a sibling of the order slide on purpose.
 * In the product these ARE one object at two moments, and giving My Spot its
 * own card language would have invented a distinction the app does not make.
 */
export function SceneMySpot() {
  return (
    <div className="ticket is-spot">
      <p className="spot-label">Saved for later</p>
      <p className="tk-where">
        <Mark id="theburg" />
        <b>{BURG.name}</b>
        {/* ══ THE STATE SLOT PLAYS THE STORY ═══════════════════════════════
            Sam, 14 Sep 2026: an hour left on this week's $10-for-$5 credit;
            rather than miss it she orders now and the food waits in My Spot.

            The slot opens on the window ("2 min left") and swaps IN PLACE to
            the state ("Saved") once the credit has landed below — the same
            crossfade the order slide uses on its total, so the two tickets
            share one motion vocabulary. See how.css "THREE BEATS" for the
            timing and for why this is a member's moment, not urgency aimed at
            the buyer. Both strings are in the DOM; `aria-hidden` on the
            opening one so a screen reader hears the resting state only. */}
        <span className="tk-state spot-state">
          <span className="spot-win" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            30 sec left
          </span>
          {/* "Saved for later", not "Saved": Sam's second half — "you can
              still add the deal and just save items" — is the LATER. */}
          <span className="spot-saved">Saved for later</span>
        </span>
      </p>
      {BURG_TICKET.map((i) => (
        <p className="tk-item" key={i.name}>
          {i.img ? <img src={i.img} alt="" decoding="async" /> : null}
          <span>{i.name}</span>
        </p>
      ))}
      <p className="tk-rule" />
      {/* Struck menu price, then what she paid — the member price this basket
          was bought at, fixed inside the saved order. */}
      <p className="tk-paid">
        <span>Paid</span>
        <span className="spot-figs">
          <b className="tnum">{m(BURG_PAID)}</b>
        </span>
      </p>
      {/* THE CREDIT, USED. Same constants as the order slide, never retyped
          — arriving here because this is the slide about WHY she ordered
          before the window closed: the basket cleared the $10 floor, this
          week's credit came off it instead of the 15%, and it was not lost.
          Points on everything, so those still land. */}
      <p className="spot-earned">
        <b>+{money(CREDIT_CENTS)} credit</b> added to your account · {BURG_POINTS} points
      </p>
      {/* THE BAR SHOWS WHAT IS LEFT, NOT WHAT IS GONE — a bar is read as how
          much you HAVE — and what is left is the credit's window, draining
          live under an order that is already safe. See CreditWindow. */}
      <CreditWindow />
    </div>
  );
}

/**
 * 3 — Offers. Added to the order, not spent.
 *
 * Sam, 13 Sep 2026: "instead of a 'used' animation, maybe we do 'added'
 * animation that shows that the discount has been added to their cart."
 *
 * He is right and it is not only a nicer word. "Used" showed the END of the
 * offer's life — a thing already gone — on the one slide whose job is to make
 * a reader want it. "Added" shows the MECHANISM, and it is also what actually
 * happens: TapIn applies policies to a cart. A reader who takes "used" for the
 * interaction expects to hand something over at a till.
 *
 * ══ THE VENUE MOVED, BECAUSE THE OFFER TURNED OUT TO BE REAL ════════════════
 * Sam suggested "50% off entree with purchase of drink at Olaika", and this
 * slide held Italiano's invented 10% instead — because a 50% claim about a real
 * restaurant is not a designer's to make up, and because Olaika carries all
 * three standing policies while Italiano's carries none, which is what makes
 * Italiano's the one-time-offer venue in the first place.
 *
 * Sam, 13 Sep 2026: "the olaika offer is real yes."
 *
 * So it moved, and it moved the RIGHT way: into docs/data/money-and-terms.json
 * as an offer record, which is where the app preview, the Deals tab and this
 * slide all read it from. Nothing about the offer is typed into this component
 * — if the terms change, one file changes and three surfaces follow.
 *
 * The Example tag comes off the slide with it (How.tsx). A real offer at a real
 * merchant does not need a hedge, and leaving one on would have understated the
 * only genuinely verifiable thing on the slide.
 *
 * A Plus venue carrying an offer is not the inversion it looked like: the deck's
 * own line for this scene is "Partners run their own, ON TOP OF the three
 * standing benefits". Italiano's keeps its 10% and its section; Olaika has both
 * kinds, which is exactly what the copy always said could happen.
 */
export function SceneOffers() {
  /* BOTH OFFERS. Sam, 14 Sep 2026: "add another member deal or special offer
     from Italianos — it's 10% off a single order." That offer was already in
     money-and-terms.json (italianos-welcome) and had been held off this slide
     as unconfirmed; it is confirmed now, so the slide reads every offer in the
     file, in file order. The "added" stamp stays on the first, which is the
     one the deck's story adds to an order; the second states its status. */
  return (
    <div className="offers">
      {offers.map((o, k) => (
        <div className="offer" key={o.id}>
          <p className="offer-who">
            <Mark id={o.venueId} />
            <b>{venue(o.venueId).name}</b>
            <span className="offer-state">Members only</span>
          </p>
          <p className="offer-amt">{o.label}</p>
          <p className="offer-cond">{o.detail.toLowerCase()}</p>
          {k === 0 ? (
            <span className="stamp">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Added to your order
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * 4 — Entry earns.
 *
 * Sam: buying a line skip or cover is not TapIn's idea — LineLeap and others
 * already do it. TapIn's angle is that those purchases EARN, like any other. So
 * the scene is not a queue being skipped; it is the three benefits docking onto
 * an entry pass.
 *
 * No venue is named and no cover price is shown: cover prices do not exist in
 * the extracted data, and a price beside a real business is a commercial claim
 * about that business (§10). The mechanic needs neither.
 *
 * The perforation is SOLID. Dashed is being retired from this sheet with the
 * tray, not relocated to another object on it.
 */
export function SceneEntry() {
  return (
    <div className="pass">
      {/* Sam, 13 Sep 2026: "it'd be neat if we could show the milk parlor
          imagery here, and call it cover charge."

          The merchant's own photograph, veiled on the same curve the pitch's
          venue cards use, with the mark seated on it — so this stops being a
          drawn rectangle and becomes a door you recognise.

          STILL NO PRICE, and that limit has not moved: cover prices exist
          nowhere in the extracted data and a price beside a real business is a
          commercial claim about it. What IS newly asserted is that this venue
          has a cover at all. It is a music room and Sam named it, so that is
          his to assert — but it is an assertion, and it is the reason the
          scene named nobody before today. */}
      <img className="pass-shot" src={MILK_PARLOR.hero} alt="" decoding="async" />
      <span className="pass-veil" aria-hidden="true" />
      <Mark id="themilkparlor" className="pass-mark" />
      <p className="pass-kind">Cover charge</p>
      {/* One group, one arrival — three chips popping in sequence was three
          animations saying a single thing. 15px, not 11: eleven is for a
          tracked uppercase micro-label and a phrase is not a label. */}
      {/* "15% or credit" — one dock, because they are one choice (Sam, 15
          Sep 2026: one of the two per order). Points on everything. */}
      <ul className="docks">
        <li className="dock">15% or $5 credit</li>
        <li className="dock">points on everything</li>
      </ul>
    </div>
  );
}

/** The earn side of the loop, from real tickets rather than round numbers.
 *  POINTS_PER_DOLLAR is 20 (the base 10 doubled by the membership), so these
 *  are what those three orders actually pay out. Nothing here is typed. */
const EARNS = [
  { venue: "coffeeholicsva", item: "Americano" },
  { venue: "olaika", item: "Classic Burger" },
  { venue: "themilkparlor", item: "Chicken Tender Basket" },
].map((e) => {
  const it = itemNamed(e.venue, e.item);
  return { ...e, name: it.name, price: it.price, points: Math.round(it.price * POINTS_PER_DOLLAR) };
});
const EARNED_TOTAL = EARNS.reduce((n, e) => n + e.points, 0);

/**
 * 5 — Points. Earned everywhere, spent on nearly everything.
 *
 * Sam, 13 Sep 2026, two asks folded into one scene because they are one idea:
 *   "points being added to an account, like +20 at coffeeholics, +100 at
 *    olaika, +50 at milk parlor… and then show the balance at each location and
 *    the aggregate balance which is a 4:1 transfer ratio"
 *   "make it apparent that you can earn points on everything, and then use
 *    those points on just about everything too… for milk parlor you can
 *    purchase drinks to earn points and credit, then use those points and
 *    credit towards line skips or cover charges"
 *
 * So the scene is the LOOP, top to bottom: three real orders paying out, one
 * balance they gather into, and the things that balance buys. The old version
 * showed only the gathering, which is the least interesting third of it.
 *
 * THE FIGURES ARE DERIVED, NOT SAM'S ROUND NUMBERS. +20 at 20 points a dollar
 * is a one-dollar order, which no one places. These are what an Americano, a
 * Classic Burger and a Chicken Tender Basket actually pay at the real prices —
 * 65, 260 and 200 — so a reader who multiplies gets the same answer we did.
 *
 * ══ THE 4:1 RATIO, DIRECTION SETTLED ════════════════════════════════════════
 * Sam, 13 Sep 2026: "4 partner points = 1 TapIn Point." A partner is a
 * merchant — the places you earn at — so four points at Coffeeholics make one
 * TapIn point, and the aggregate is SMALLER than the sum of the venue balances,
 * not larger. That is already what /app/points computes (`asTapInPoints` in
 * model/preview.ts divides), so this slide was the only surface disagreeing.
 *
 * TWO THINGS IT WAS GETTING WRONG, both now fixed:
 *   1. It summed 65 + 260 + 200 into "One balance — 525 points". That is three
 *      separate venue balances added up and labelled as though they had already
 *      pooled. They have not: pooling is the part that costs 4:1 and the part
 *      that is Coming.
 *   2. The rate hung off the airline line — "Airline miles and card points, at
 *      4 to 1" — which put it on the wrong transfer entirely. 4:1 is the
 *      venue→TapIn step. No outbound rate to miles or cards exists, so none is
 *      stated.
 *
 * So the plate is now the LIVE half, in the only frame that is true of it: the
 * points you earned are spendable at the place you earned them, on anything
 * that place sells — which is Sam's "earn on everything, spend on everything",
 * and it needs no pooling to be true. Gathering, and the rate it costs, sits
 * under Coming where it belongs.
 *
 * STILL TRUE AND STILL WORTH KNOWING: docs/CONVERSION-RESEARCH.md:49 says "Do
 * not publish the 4:1 points ratio" — Chun & Hamilton, JMR 2024, a non-1:1
 * exchange rate induces optimism and REDUCES redemption versus a fixed rate of
 * the same average value. Sam has asked for it three times now and it is his
 * call, not a designer's. Recorded, not re-argued.
 */
/** Off for now — see the note inside the scene. Flip to bring the plate back. */
const SHOW_TRANSFER = false;

export function ScenePoints() {
  return (
    <div className="pts">
      {/* EARN. No caption: three rows of "+N" beside a venue mark do not need a
          label telling the reader they are earnings. */}
      <ul className="pt-earn">
        {EARNS.map((e, n) => (
          <li key={e.venue} style={{ ["--n" as string]: n }}>
            <Mark id={e.venue} className="pt-mark" />
            <span className="pt-what">
              <b>{venue(e.venue).name}</b>
              <span>{e.name}</span>
            </span>
            <b className="pt-add tnum">+{e.points}</b>
          </li>
        ))}
      </ul>

      {/* GATHER, and what it is for — one object rather than three sections.
          The previous version ran ten separate text blocks down the slide:
          three captions, two lists, a rate line, a balance and the rows. Sam:
          "far too busy." Right — the slide has one idea (points from anywhere
          become one balance) and it was being told as four. */}
      <div className="one-plate">
        <p className="one-head">
          <span>Yours to spend</span>
          <b className="tnum">{EARNED_TOTAL} points</b>
        </p>
      </div>

      {/* ══ THE UNBUILT HALF, AS A PLATE RATHER THAN A CAPTION ═══════════════
          Sam, 13 Sep 2026: "need to change the positioning and the look for the
          tapin 4:1 transfer option."

          THREE THINGS WERE WRONG AND THEY WERE ALL POSITIONAL. The "Coming"
          chip sat on a line of its own with nothing attached to it — a badge
          governing a sentence it was not touching. The sentence itself was
          loose grey body text under a bordered plate, so it read as a footnote
          about the plate rather than as the plate's sibling. And the ratio was
          told in words — "four at a place make one TapIn point" — on a deck
          whose whole contract is to demonstrate a mechanism instead of naming
          it.

          It is now the SECOND PLATE, matching the first: two destinations for
          the same points, one live and one coming, in the same object at the
          same measure. The badge sits in the plate's own header, on the thing
          it governs. And the rate is a figure pair with an arrow between it —
          4 → 1, each labelled — which is the one part of this a reader was
          previously asked to parse from a sentence.

          THE PLATE IS HELD BACK, NOT DISABLED. It is a real future benefit, so
          it keeps the border and the measure; what it gives up is fill. Quiet
          by weight, never by being hard to read. */}
      {/* ══ THE 4→1 TRANSFER PLATE IS OFF THE SLIDE ══════════════════════════
          Rob's Virginia Tech readers, 14 Sep 2026: "slide 7 confusing". The plate
          drew the unbuilt half (moving a balance out, Coming) at the largest
          size on the slide, on top of a live benefit. Retained behind a flag,
          not deleted — the same treatment the three cut scenes get. */}
      {SHOW_TRANSFER ? (
      <div className="pt-move">
        <p className="pt-move-head">
          <span>Gather them</span>
          <span className="pt-soon">Coming</span>
        </p>
        {/* ONE LABEL FOR THE WHOLE RATIO. Read cell by cell a screen reader
            would say "4 at a place 1 TapIn point", which is the arithmetic
            without the operator — the arrow is the verb and it is a graphic. */}
        <p
          className="pt-rate"
          role="img"
          aria-label="Four points at a place make one TapIn point"
        >
          <span className="pt-rate-cell">
            <b className="tnum">4</b>
            <span>at a place</span>
          </span>
          <svg className="pt-arrow" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12h15m-5.5-5.5L19.5 12l-6 5.5" fill="none"
              stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="pt-rate-cell">
            <b className="tnum">1</b>
            <span>TapIn point</span>
          </span>
        </p>
        <p className="pt-move-for">Miles &middot; Card points &middot; Merch</p>
      </div>
      ) : null}
    </div>
  );
}

/**
 * 6 — How you actually get it.
 *
 * Sam, 13 Sep 2026: "it'd make sense to have a slide talking about the ways to
 * redeem items… depending on the item and the merchant, some items are manually
 * redeemed by showing a staff member your phone, some items are sent to
 * kitchen, some items require you have someone scan your phone, and almost all
 * items can be saved to my spot."
 *
 * ══ THIS RIDES V3.1'S REAL RAILS AND DOES NOT INVENT ONE ═════════════════════
 * On 8 Sep a spoken three-digit redemption code was designed from scratch for a
 * sibling prototype and Sam's answer was "this is nothing like the actual
 * redemption flow". So every route below is the merchant app's, verified in its
 * source rather than imagined:
 *   · Send to Kitchen and Save to My Spot are the two rails of
 *     `FulfillmentToggle` ("Choose what happens next"). A closed venue forces
 *     Save — closed is a fulfilment fact, never a gate on the benefit.
 *   · A saved item is redeemed BUYER-INITIATED from My Spot via
 *     `SelfRedeemModal`. Staff tap nothing to apply a benefit.
 *   · 90 days is that modal's real window, and it is the same number the
 *     merchant app prints on Unredeemed Items.
 *
 * THE SHEET IS LIGHT ON A DARK DECK, ON PURPose AND FOR A REASON THAT IS IN THE
 * SOURCE: the self-redeem screen forces a light palette because it is "held out
 * to venue staff, often in a dark bar". That inversion IS the demonstration —
 * it is why the object looks like that — so the scene would be lying to render
 * it in the deck's own dark. It declares the light ramp locally, exactly as the
 * membership card declares a dark one inside the light app.
 *
 * THE FOURTH ROUTE WAS FLAGGED AND IS NOW CONFIRMED. "Scanned at the counter"
 * is not in the V3.1 source I read — `SelfRedeemModal` is buyer-initiated and
 * nothing there scans a member's phone — so it was held out rather than
 * silently blessed. Sam, 13 Sep 2026: "scanned at the counter, it's a real
 * thing yes, specifically used for event tickets but can also be used for other
 * items." So it is in, and its subtitle carries his qualifier rather than
 * generalising it: event tickets are what it is FOR, other items are what it
 * also covers, and the row says both in that order.
 *
 * Four rows, not three, on a stage whose height is fixed — so the short-viewport
 * tier gives .rd-ways back the room by tightening its own paddings rather than
 * by letting the slide grow. A carousel slide that scrolls is the defect Sam
 * caught once already.
 */
/**
 * The code on the screen, DRAWN — it is not a real code and will never scan.
 *
 * Same status as the "Redeem" button it replaces: a picture of a screen, on a
 * slide about an app that does not open until Spring 2027. Drawing it rather
 * than encoding something real is the honest choice; a working code on a
 * marketing deck would resolve to a URL that has to exist.
 *
 * Deterministic by construction. A Math.random() fill would reshuffle on every
 * re-render — and this scene remounts on every visit to the slide, so the code
 * would visibly scramble each time it came round, which is exactly the tell
 * that makes a fake object read as fake.
 */
const QR_N = 21;
const QR_FINDERS = [
  [0, 0],
  [QR_N - 7, 0],
  [0, QR_N - 7],
] as const;
const QR_CELLS: [number, number][] = (() => {
  const out: [number, number][] = [];
  let s = 0x2f6e2b1;
  const next = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const inFinder = (x: number, y: number) =>
    QR_FINDERS.some(([fx, fy]) => x >= fx && x < fx + 8 && y >= fy && y < fy + 8);
  for (let y = 0; y < QR_N; y++) {
    for (let x = 0; x < QR_N; x++) {
      const r = next();
      if (!inFinder(x, y) && r > 0.5) out.push([x, y]);
    }
  }
  return out;
})();

function Qr() {
  return (
    <svg className="rd-qr" viewBox={`0 0 ${QR_N} ${QR_N}`} aria-hidden="true">
      {QR_FINDERS.map(([fx, fy]) => (
        <g key={`${fx}-${fy}`}>
          <rect x={fx + 0.5} y={fy + 0.5} width="6" height="6" rx="1.4"
            fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x={fx + 2} y={fy + 2} width="3" height="3" rx=".7" />
        </g>
      ))}
      {QR_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  );
}

/** The four routes, each drawn rather than described. 24px box, stroked, so
 *  they sit in the same family as the deck's other glyphs. */
function WayGlyph({ id }: { id: string }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {id === "staff" ? (
        /* A phone held out, and the light coming off it. */
        <g {...p}>
          <rect x="7" y="3" width="10" height="15" rx="2.4" />
          <path d="M10.4 15h3.2" />
          <path d="M4.4 21h15.2" />
        </g>
      ) : null}
      {id === "scan" ? (
        /* A scanner's corners and its line. */
        <g {...p}>
          <path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5" />
          <path d="M4 12h16" />
        </g>
      ) : null}
      {id === "kitchen" ? (
        /* A docket on the rail, with the heat above it. */
        <g {...p}>
          <path d="M6 20V8.5h12V20l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4Z" />
          <path d="M9.5 5.2c0-1 1-1.3 1-2.2M14.5 5.2c0-1 1-1.3 1-2.2" />
          <path d="M9.5 12h5" />
        </g>
      ) : null}
      {id === "spot" ? (
        /* Put away, and the clock it keeps. */
        <g {...p}>
          <path d="M7 20V5.4A1.4 1.4 0 0 1 8.4 4h7.2A1.4 1.4 0 0 1 17 5.4V20l-5-3.4L7 20Z" />
          <path d="M12 8v2.6l1.7 1" />
        </g>
      ) : null}
    </svg>
  );
}

const WAYS = [
  /* Shorter, and "Saved for later" not "My Spot" — Sam, 14 Sep 2026, after Rob's
     readers "don't understand what My Spot is". The app's own tab keeps its real
     name; this deck describes what it does. */
  { id: "staff", label: "Show your phone" },
  { id: "scan", label: "Scan at the counter" },
  { id: "kitchen", label: "Sent to the kitchen" },
  { id: "spot", label: "Saved for later" },
] as const;

export function SceneRedeem() {
  return (
    <div className="rd">
      {/* The artifact: the screen you hold out, in the palette it really uses.
          THE CODE REPLACED THE DRAWN BUTTON, and that is a correction as much
          as a redesign. The old sheet showed a "Redeem" control — the moment
          BEFORE anything happens — on the one slide whose job is to show what
          happens. Tapping Redeem in V3.1 produces a code; this is that screen,
          one beat later, and it is also the single object that makes two of the
          four routes below legible at a glance.

          THE ITEM IS A COVER CHARGE, NOT A SANDWICH. Sam, 13 Sep 2026: "we
          could call this cover charge at the milk parlor for the scanned item
          since those are usually either scanned or shown to staff." He is
          right, and the old pairing was actively confusing: a California Club
          under a scannable code implied you scan your lunch, when a sandwich is
          the one item on this deck that goes to the KITCHEN. A cover is the
          class of thing a code is genuinely for, so the artifact and the two
          routes it illustrates finally agree.

          The Milk Parlor is also already the deck's cover venue — the entry
          slide is built on its photograph — so this names no new fact about a
          real business. STILL NO PRICE, for the same reason it carries none
          there: cover prices exist nowhere in the extraction, and a figure
          beside a real venue is a commercial claim about it. */}
      <div className="rd-sheet">
        <p className="rd-head">
          <Mark id="themilkparlor" className="rd-mark" />
          <b>{MILK_PARLOR.name}</b>
          <span className="rd-one">Cover</span>
        </p>
        <Qr />
      </div>

      {/* Four routes, two across. Sam: "it should be a bit more visual."
          The sub-lines came off with the change and that is the trade being
          made deliberately — a 2×2 of drawn tiles says "there are four of these
          and they are different kinds of thing" in one glance, where four rows
          of 15px-over-13px said it in about six seconds of reading. What the
          sub-lines carried that still matters moved into the slide's own line. */}
      <ul className="rd-ways">
        {WAYS.map((w) => (
          <li key={w.id}>
            <span className="rd-glyph">
              <WayGlyph id={w.id} />
            </span>
            <span className="rd-way-label">{w.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── retained, not consumed ────────────────────────────────────────────────
   The three cut scenes stay built and one line from returning. NOTE: they were
   written against the old fixed, centred .scene-art frame, so restoring one
   means re-sizing it to the sheet's measure first — it will not simply drop in.
   ------------------------------------------------------------------------- */

/** Collection, two ways. Both shown, neither preferred. */
export function SceneHandover() {
  return (
    <div className="sc sc-two">
      <div className="half h1">
        <svg viewBox="0 0 24 24" className="gl" aria-hidden="true">
          <path d="M12 4.6a5 5 0 0 1 5 5c0 3.8 1.2 4.8 1.9 5.8H5.1c.7-1 1.9-2 1.9-5.8a5 5 0 0 1 5-5Z" />
          <path d="M10.2 18.6a1.9 1.9 0 0 0 3.6 0" />
        </svg>
        <span>They ping you</span>
      </div>
      <span className="or">or</span>
      <div className="half h2">
        <svg viewBox="0 0 24 24" className="gl" aria-hidden="true">
          <rect x="7" y="3" width="10" height="18" rx="2.4" />
          <path d="M10.6 17.4h2.8" />
        </svg>
        <span>You show your phone</span>
      </div>
    </div>
  );
}

/** More of the week. The row of places keeps going. */
export function SceneMoreTown() {
  return (
    <div className="sc sc-center">
      <div className="street">
        {[0, 1, 2, 3, 4].map((n) => (
          <span className={`shop s${n}`} key={n} />
        ))}
      </div>
    </div>
  );
}

/** Nights. A ticket, and the plus-one that comes with it. */
export function SceneNights() {
  return (
    <div className="sc sc-center">
      <div className="tix">
        <span className="tix-card t1" />
        <span className="tix-card t2" />
      </div>
    </div>
  );
}

/**
 * 6 — The close. The card stops being chrome and becomes the subject.
 *
 * The §7 block — the figure, the condition, the disclaimer and month one —
 * lives in How.tsx's copy slot, not here: §7 makes type size part of the rule,
 * and keeping the figure in the same element the other six headlines use is
 * what stops it drifting into its own private treatment.
 *
 * NO SEAT NUMBER. The old build allocated them from an invented count of 63, so
 * receipts read "Seat 064" — and a serial number is a count, which §10 forbids
 * every surface from stating. The card's rail carries the city instead. §11.1
 * is still open on what a real buyer's number should be; nothing here invents
 * one in the meantime.
 */
export function SceneClose() {
  /* Session-wide: the checkout's name field opens with this and the /reserve
     card shows it. See nameStore.ts. */
  const [name, setName] = useName();
  return (
    <div className="sc-close-wrap">
      <div className="sc-close">
        {/* "Your name", not "You" and not an invented one. Sam, 13 Sep 2026.
            It reads as the slot it is — this is where your name will sit —
            rather than as a name the card is claiming to know, which is the
            line this build has always held: no demonstration data pretending
            to be real. And since 14 Sep the slot is hers to fill: "they'd just
            click on the membership card to add their name, it's optional." */}
        <TapInCard name={name} onName={setName} />
      </div>
      {/* Outside .sc-close so it does not float with the card. Says the one
          thing the card cannot say about itself — that it takes a name — and
          that nothing depends on it. */}
      <p className="sc-hint">Tap the card to add your name · optional</p>
    </div>
  );
}

export const SCENES: Record<string, (p: SceneProps) => JSX.Element> = {
  spend: SceneSpend,
  value: SceneValue,
  order: SceneOrder,
  myspot: SceneMySpot,
  entry: SceneEntry,
  handover: SceneHandover,
  offers: SceneOffers,
  moretown: SceneMoreTown,
  nights: SceneNights,
  points: ScenePoints,
  redeem: SceneRedeem,
  close: SceneClose,
};
