import { useEffect, useRef, useState } from "react";
import { Panel } from "../shell/Panel";
import TapInCard from "../shell/TapInCard";
import { useCardFlight } from "../shell/cardFlight";
import { BenefitIcon, NavIcon } from "../shell/Icons";
import CheckoutSheet from "../shell/CheckoutSheet";
import VenueTicker from "../shell/VenueTicker";
import type { PhoneIdentity } from "../shell/PhoneStep";
import { useName } from "../model/nameStore";
import { useEventTracking } from "../context/event_tracking_context";
import { seatLine, seatsLeft, SEAT_CAP } from "../model/seats";
import {
  PLANS,
  lockedRateLine,
  lockedRateFor,
  benefits,
  FOUNDING_OPEN,
  foundingCloses,
  guarantee,
  GUARANTEE_CONTACT,
  monthlyToday,
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

export default function Reserve() {
  /* The PaymentIntent id once the charge has settled — and the page's proof it
     has. Never seeded from storage: a previous reservation is not this visit's,
     and rendering a stale receipt over a live checkout would be the worst
     possible confusion on a page that takes money. */
  const [paid, setPaid] = useState<string | null>(null);

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
  const [refused, setRefused] = useState(false);
  const calm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(calm.current), []);
  const sayLater = () => {
    setRefused(false);
    /* Restart the animation even on a second tap: the class has to leave the
       element for a frame or the keyframe does not re-run. */
    window.clearTimeout(calm.current);
    window.requestAnimationFrame(() => {
      setRefused(true);
      calm.current = window.setTimeout(() => setRefused(false), 900);
    });
  };
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
  const [noWallet, setNoWallet] = useState(false);
  /** The checkout sheet. Everything that discloses or charges lives in it. */
  const [sheetOpen, setSheetOpen] = useState(false);

  /* ══ THE SHEET OPENING IS THE MID-FUNNEL EVENT ═════════════════════════════
     One `checkout_opened` per open, not per render — both buttons below set the
     same flag, and this fires on the transition to true only. It reaches Meta
     as InitiateCheckout (context/meta_pixel.ts); a /reserve pageview is not the
     same thing, since most of that traffic never opens the sheet. */
  const { track } = useEventTracking();
  useEffect(() => {
    if (sheetOpen) track("checkout_opened");
  }, [sheetOpen, track]);
  /**
   * The signed-in number, held here so it survives the charge and can be
   * written into the reservation alongside the PaymentIntent id. A ref rather
   * than state: nothing on this page renders it, and a re-render between
   * signing in and paying would be pure cost.
   */
  const identity = useRef<PhoneIdentity | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  /* The name she gave the card on the deck's close, or typed into the sheet —
     the card here shows it as it is typed. Placeholder until there is one. */
  const [cardName] = useName();
  /* `seatLine()` stays the single source of the seat sentence; the tile only
     sets its leading number larger. Sold out, there is no number to lift. */
  const seatParts = (() => {
    const line = seatLine();
    const m = line.match(/^(\d+)\s(.*)$/);
    return m ? { n: m[1], rest: m[2] } : { n: null, rest: line };
  })();
  /* ONE PLAN. The picker is gone (see the note where it stood), and monthly
     is the only thing `create_simple_intent` can actually charge. A `?plan=`
     in the router state is ignored rather than honoured — there is nothing
     for it to select. */
  const plan = PLANS.monthly;
  const refundTerm = plan.terms.find((t) => t.id === "refund")?.term;
  // If the walkthrough sent us here, its card flies onto this one.
  useCardFlight(cardRef);

  /* ══ THE MODAL IS THE DECISION, AND ONLY THE DECISION ═══════════════════
     Sam, 15 Sep 2026: "the checkout page should be more focused on urgency or
     scarcity: the three purchase plans, maybe the TapIn membership card, and
     then a brief reminder of what you get. The main focus is just on the
     sale." And: two pages with the same components was the wrong shape.

     What the field does (Mobbin, 15 Sep: Notion, Todoist, Quizlet, Talabat on
     the phone; Flodesk, Mural on the web): a plan picker is a compact sheet or
     dialog — the plans, one highlighted, a short checklist of what is
     included, the exact charge under one button, the cancel/refund line —
     never a second landing page. So this is that. Gone from here: the photo
     band, the places carousel, the applies-to marks, the deck and app links,
     the footer. They live on the pitch, which is the page beneath this one.

     §4 is untouched: the rows, the consent and the control still travel
     together inside CheckoutSheet, one tap on. */
  return (
    <>
      <div className="rs-modal">
        {/* ══ THE DEPOSIT COMES BACK, AND IT SAYS SO FIRST ══════════════════
            Sam, 21 Sep 2026: "the checkout modal should show the 'earn back
            the cost of membership on first $10 purchase' at the top."

            EVERY FIGURE IS READ. The deposit is `monthlyToday`, so it follows
            the price when the Early Bird seats go; the floor and the amount are
            BENEFIT's own `creditMinUsd` and `creditUsd`, the same two constants
            the credit's benefit row prints. Nothing here is typed.

            ══ AND IT IS GATED TWICE ════════════════════════════════════════
            FOUNDING_OPEN: after the flip the deposit is $14.99 and one $10
            order does not come near it, so the sentence would be false beside
            that price — this is the same condition `plan.saving` keys off.

            The second guard is the comparative's own. `depositEarnsCredit` in
            content.ts carried this line until 20 Sep with a check that dropped
            "more than the deposit" if the price ever met the credit; the helper
            was deleted that day on Sam's word ("too complicated") and asked for
            again today, so the guard comes back with it. If a founding price is
            ever set at or above $5 this block simply does not render, rather
            than printing a comparison that no longer holds. */}
        {FOUNDING_OPEN && monthlyToday < BENEFIT.creditUsd ? (
          <div className="rs-earnback">
            <span className="rs-earnback-ico" aria-hidden="true">
              <BenefitIcon id="credit" />
            </span>
            <p className="rs-earnback-say">
              <b>
                Earn the ${monthlyToday.toFixed(2)} back on your first $
                {Math.round(BENEFIT.creditMinUsd)}+ order
              </b>
              <span>
                It earns ${BENEFIT.creditUsd} credit, more than the deposit.
              </span>
            </p>
          </div>
        ) : null}

        {/* ══ THE COUNT, AS A CARD ABOVE THE CARD ═══════════════════════════
            Sam, 15 Sep 2026: "bring back the original progress bar and put it
            above the membership card." So: the sentence with the number
            lifted, the close date on the same line, and beneath them the
            ten-cell meter — one cell per five seats, a mask over one fill so
            the fraction is exact. Still Sam's artificial count (model/seats.ts),
            still body ink, still no clock. */}
        <div className="rs-seat-card">
          <p className="rs-seat-line">
            {seatParts.n !== null ? (
              <>
                <b className="tnum">{seatParts.n}</b>
                <span>{seatParts.rest}</span>
              </>
            ) : (
              <span>{seatParts.rest}</span>
            )}
          </p>
          <span className="rs-meter" aria-hidden="true">
            <i style={{ ["--p" as string]: `${seatsLeft() / SEAT_CAP}` }} />
          </span>
          {/* The close date as a caption under the bar — the sentence is the
              count; the date qualifies the bar, so it sits with the bar. */}
          {FOUNDING_OPEN ? <p className="rs-seat-close">Closes {foundingCloses}</p> : null}
        </div>

        {/* THE CARD USED TO STAND HERE, between the count and the plans.
            It is at the foot now — see the panel below the places. */}

      <Panel className="checkout" id="plans">
        {/* The seat count used to open this panel. It is under the card now —
            see THE COUNT, UNDER THE OBJECT on the band above. */}

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
            <b>{FOUNDING_OPEN ? "Early Bird Deposit" : "Deposit"}</b>
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
              className={`plan-opt is-later${refused ? " is-refused" : ""}`}
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
                  <span className="plan-else">a month, once the Early Bird spots are gone</span>
                </span>
              </span>
            </div>
          ) : null}
        </div>

        {/* The sentence the toast used to carry, for a reader who cannot see
            a tile change colour. `status`, not `alert`: nothing failed. */}
        <p className="sr-only" role="status">
          {refused ? "Standard opens after launch. Early Bird is the only plan open now." : ""}
        </p>

        {/* The founding rate survives — said here because it is the whole value
            of taking a seat now rather than later. */}
        {/* THE DEPOSIT-EARNS-CREDIT SENTENCE IS GONE from here too (Sam,
            20 Sep 2026, "too complicated"). It was the same string the hero
            carried, so leaving it on the one page where the reader is closest
            to paying would have made the checkout the wordiest statement of a
            line he had just cut. The charge rows, the consent sentence and
            the refund are untouched — those are terms, not this. */}
        <p className="t-compact plan-locked">{lockedRateFor(plan.price, plan.per)}</p>

        {/* THE REFUND, WHERE THE PLAN IS CHOSEN. 14 Sep funnel audit: "Full
            refund any time before we open" appeared only inside the sheet,
            two taps past the decision it makes rational. The term's own
            words, from the chosen plan's terms — never retyped. */}
        {refundTerm ? <p className="t-compact plan-refund">{refundTerm}</p> : null}

        {/* ══ THE DOOR TO THE CHARGE ═════════════════════════════════════
            Sam, 13 Sep 2026: "we only need the disclosure and terms right at
            checkout." So the rows, the forfeit, the consent, the wallet and
            the full terms all live in `CheckoutSheet` now, and this button is
            what opens it. §4 travelled with them — see that file's header.

            THE OBSERVER STAYS. It is what suppresses the sticky bar while a
            real control is on screen, and that is still exactly what this is:
            the one control on the page that starts a purchase. */}
        <div ref={paySlot} className="pay-slot">
          {paid ? (
            <button
              type="button"
              className="action"
              onClick={() => setSheetOpen(true)}
            >
              View your seat
            </button>
          ) : (
            <button
              type="button"
              className="action"
              onClick={() => setSheetOpen(true)}
            >
              Checkout
            </button>
          )}
        </div>
      </Panel>

        {/* WHAT YOU GET, IN ITS OWN CONTAINER, WITH THE HOME PAGE'S ICONS.
            Sam, 15 Sep 2026: "put all of the bulleted points in a parent
            container, and use the same icons they had on the main page." The
            same four glyph tiles the pitch's cards carry, one row each, the
            detail from the same list. */}
        <Panel label="What you get" className="flush rs-includes-panel">
          <ul className="rs-list" aria-label="What you get">
            {benefits.map((b) => (
              <li key={b.id}>
                <span className="rs-li-icon" aria-hidden="true">
                  <BenefitIcon id={b.id} />
                </span>
                <span>
                  <b>{b.label}</b> {b.detail.charAt(0).toLowerCase() + b.detail.slice(1)}
                </span>
              </li>
            ))}
            <li>
              <span className="rs-li-icon" aria-hidden="true">
                <NavIcon id="deals" />
              </span>
              <span>
                <b>Special offers</b> from the places, on top
              </span>
            </li>
          </ul>
        </Panel>

        {/* The refund card, as it was — Sam, 15 Sep 2026: "i liked the original
            refund card we had." The shield tile, the sentence, the address on
            its own line; the same panel the page carried before the modal. */}
        <Panel className="closing rs-closing">
          <span className="guarantee-tile" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3.4 5.2 6v5.4c0 4.4 2.9 8.3 6.8 9.6 3.9-1.3 6.8-5.2 6.8-9.6V6L12 3.4Z" />
              <path d="m9.2 12.2 1.9 1.9 3.8-4" />
            </svg>
          </span>
          <div className="guarantee-body">
            <p className="guarantee">{guarantee}</p>
            <p className="t-compact guarantee-contact">
              <a href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>
            </p>
          </div>
        </Panel>

        {/* ══ WHERE IT WORKS, AT THE FOOT ══════════════════════════════════
            Sam, 20 Sep 2026: "too much space at the bottom here too, for this
            modal. And we should have a small section with the logos of the
            spots on tapin too at the very bottom."

            One ask, two problems, one answer. The sheet is full height and
            its content ran out several hundred pixels early, and the last
            thing a reader saw before deciding was a refund promise with
            nothing under it. The places are the answer to the question the
            price raises — "worth $4.99 where?" — so they go here, where it is
            asked, and the space closes because something true fills it.

            `rail`, the same prop /in uses: this sits in a column, not across
            a page, and the grid state it would otherwise reach at 1280 is a
            seven-across row inside a 670px track. Sam asked for "the carousel
            of places" on this surface once before, 15 Sep 2026; it is the
            same component, back where it was. */}
        <section className="places rs-places">
          <p className="t-caption places-label">Where it works</p>
          <VenueTicker rail />
        </section>

        {/* ══ THE CARD, AT THE FOOT, IN ITS OWN PANEL ══════════════════════
            Sam, 20 Sep 2026: "can we move the membership card down to the
            bottom? Make sure that it doesn't just fit there awkwardly. Maybe
            it lives in a parent container itself. I'm just thinking having it
            here on both checkout modals might lead to some bounce for
            customers."

            He is right about what it was doing. The card is the most
            arresting object in this build and it stood directly above the
            plans, so the first screenful of the surface that takes money was
            a picture of a thing you do not own yet, with the decision pushed
            under it. Aspiration belongs after the argument, not in front of
            it.

            "Not awkwardly" is the panel. On its own the card is a floating
            object with nothing to sit on, which is exactly how it looked in
            the one earlier attempt at moving it; in a labelled panel it is
            the build's own inversion — a flat container with one raised
            thing inside — which is the shape the benefit cards, the plan
            tiles and the venue rail all already use.

            It keeps its name field. That field is optional and the checkout
            sheet asks for the name again, so nothing is lost by it sitting
            after the button rather than before it. */}
        <Panel label="Your card" className="rs-card-panel">
          <div className="rs-card">
            <TapInCard
              name={cardName.trim() || undefined}
              innerRef={cardRef}
              className="reserve-card"
            />
          </div>
        </Panel>

        <div className={`rs-dock${ctaVisible ? " is-away" : ""}`} aria-hidden={ctaVisible}>
          <button
            type="button"
            className="action"
            tabIndex={ctaVisible ? -1 : 0}
            onClick={() => paySlot.current?.scrollIntoView({ block: "center", behavior: "smooth" })}
          >
            {/* NOT `plan.per` ("a month"). What this button opens takes a
                DEPOSIT, and the tile it docks under says so — a bar reading
                "$4.99 a month" beside a tile reading "$4.99 deposit" is the
                same figure carrying two different promises. Sam settled the
                word today: "need to make sure it says $4.99 deposit." */}
            Checkout · {plan.price} deposit
          </button>
        </div>
      </div>

      <CheckoutSheet
        plan={plan}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        paid={paid}
        onPaid={(id) => {
          /* Local only — there is no order backend in this project. Written
             before the receipt renders so a reload cannot lose the reference
             of a charge that already settled. */
          try {
            window.localStorage.setItem(
              "tapin.blacksburg.reservation",
              JSON.stringify({
                id,
                plan: plan.id,
                cents: plan.paidTodayCents,
                at: new Date().toISOString(),
                /* ══ WHAT SHE BOUGHT, NOT WHAT IT COSTS TODAY ═══════════════
                   Pre-deploy review, 14 Sep 2026: /in rendered today's PLANS,
                   so from the 27 Sep flip every $4.99 founder would have been
                   told her locked rate was $14.99, lost her saved row, and
                   read a term saying the founding seats were gone. The words
                   and figures she agreed to are written with the charge and
                   read back from here; the site's live prices never touch her
                   receipt again. */
                founding: FOUNDING_OPEN,
                price: plan.price,
                per: plan.per,
                saving: plan.saving,
                locked: lockedRateLine,
                terms: plan.terms,
                name: identity.current?.name ?? null,
                phone: identity.current?.phone ?? null,
                phoneVerified: identity.current?.verified ?? false,
                marketingOptIn: identity.current?.marketingOptIn ?? false,
              }),
            );
          } catch {
            /* private mode — the reference still renders in the sheet */
          }
          setPaid(id);
        }}
        noWallet={noWallet}
        onNoWallet={() => setNoWallet(true)}
        /* ══ `tapin.blacksburg.identity` IS GONE (15 Sep 2026) ═══════════════
           It held the number of someone who signed in and then did not pay, so
           a launch text could still reach them. Nothing ever read it — the
           value was entirely in it being there when a server finally existed.
           One does now: signing in creates a Supabase auth user carrying the
           verified number, the name and the marketing opt-in, and it is
           created AT VERIFY, before the wallet opens. The abandoned-checkout
           case the key was written for is already covered, on a record that
           survives a cleared cache and is queryable. A second copy in this
           browser could only go stale. */
        onIdentity={(id) => {
          identity.current = id;
        }}
      />

    </>
  );
}
