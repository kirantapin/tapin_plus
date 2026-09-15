import { Fragment, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Panel } from "../shell/Panel";
import TapInCard from "../shell/TapInCard";
import { TeeThumb } from "../shell/Tee";
import { useCardFlight } from "../shell/cardFlight";
import { BenefitIcon, NavIcon } from "../shell/Icons";
import CheckoutSheet from "../shell/CheckoutSheet";
import type { PhoneIdentity } from "../shell/PhoneStep";
import { useName } from "../model/nameStore";
import { seatLine, seatsLeft, SEAT_CAP } from "../model/seats";
import {
  PLANS,
  type PlanId,
  lockedRateLine,
  lockedRateFor,
  benefits,
  FOUNDING_OPEN,
  foundingCloses,
  guarantee,
  GUARANTEE_CONTACT,
} from "../model/content";

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
  /* Where the app window opens over, on a desktop (AppLayer). */
  const location = useLocation();
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
  /* Preselected from the pitch's plan card when she arrived through one
     (14 Sep funnel audit: "pitch plan cards should carry state:{plan} so
     /reserve doesn't re-ask"). */
  const [planId, setPlanId] = useState<PlanId>(() => {
    const p = (location.state as { plan?: PlanId } | null)?.plan;
    return p && p in PLANS ? p : "monthly";
  });
  const plan = PLANS[planId];
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

        <div className="rs-card">
          <TapInCard
            name={cardName.trim() || "Your name"}
            innerRef={cardRef}
            className="reserve-card"
          />
        </div>


      <Panel className="checkout" id="plans">
        {/* The seat count used to open this panel. It is under the card now —
            see THE COUNT, UNDER THE OBJECT on the band above. */}

        {/* Both prices are stated on the control itself, so the choice is
            legible before it is made. */}
        <div className="plan-pick" role="radiogroup" aria-label="Choose a plan">
          {(["monthly", "pass", "year"] as PlanId[]).map((id) => {
            const p = PLANS[id];
            const on = id === planId;
            const tile = (
              <button
                type="button"
                role="radio"
                aria-checked={on}
                className={`plan-opt${on ? " is-on" : ""}`}
                onClick={() => setPlanId(id)}
              >
                <b>{p.label}</b>
                <span className="plan-figs">
                  {/* THE STRUCK FIGURE IS WHAT EVERYONE ELSE WILL PAY, and it
                      is labelled rather than left bare: $14.99 has never been
                      charged to anyone, so a lone strike-through would imply a
                      former price that did not exist. Announced to screen
                      readers as words, because a line-through is a visual
                      convention that reads aloud as nothing at all. */}
                  {/* Nothing to strike once the founding seats are gone —
                      this IS the price then, and a line through the number a
                      reader is about to be charged would be a false compare. */}
                  {/* NO STRUCK FIGURE. Sam, 14 Sep 2026: "remove the strike through
                      on the reserve plan tiles too." The comparison lives in the
                      "Save $X" line under the price and in the hero's plain sentence
                      ("Price for everyone else is $14.99"); a struck number that no
                      one has ever paid read as a fake former price to Rob's readers. */}
                  {/* The price and its period are one row under the struck
                      eyebrow — see reserve.css "THE STRIKE IS AN EYEBROW". */}
                  <span className="plan-now">
                    <b className="tnum">{p.price}</b>
                    <span className="plan-per">{p.per}</span>
                    {/* What everyone else pays, in words and not a strike
                        (Sam, 14 Sep 2026: "we need to show what non-early
                        birds would have to pay"). Same figure the hero's
                        sentence uses; per plan, so the pass and the year
                        state their own. */}
                    {p.saving ? (
                      <span className="plan-else">
                        <span className="tnum">{p.saving.after}</span> for everyone else
                      </span>
                    ) : null}
                  </span>
                </span>
                {/* NO "SAVE $X" LINE. Both 14 Sep review agents: three tiles
                    stated savings on three different bases, and the year's
                    "Save $72" sat under "Later members pay $96 more" — two
                    figures for one fact. One statement per tile now: the
                    price, and what everyone else pays. */}
                {/* The year's shirt — the one thing a plan includes that is
                    not money, so it is a line of its own rather than folded
                    into the price. Same string as its charge row. */}
                {p.perk ? <span className="plan-perk">{p.perk}</span> : null}
              </button>
            );
            /* The year's tile carries the shirt beside it — a second control
               (the close-up) that cannot live inside the radio button. */
            return p.perkImg ? (
              <div className="plan-year" key={id}>
                {tile}
                <TeeThumb className="plan-tee" plate />
              </div>
            ) : (
              <Fragment key={id}>{tile}</Fragment>
            );
          })}
        </div>

        {/* Said once, under the choice — the value of a founding seat is that
            the rate survives, and a reader choosing between two plans is
            deciding about that as much as about cadence. */}
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

        <div className={`rs-dock${ctaVisible ? " is-away" : ""}`} aria-hidden={ctaVisible}>
          <button
            type="button"
            className="action"
            tabIndex={ctaVisible ? -1 : 0}
            onClick={() => paySlot.current?.scrollIntoView({ block: "center", behavior: "smooth" })}
          >
            Checkout · {plan.price} {plan.per}
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
                /* A test reservation (checkoutEnv.testPurchase) is written with
                   the same shape and a flag, so every surface that reads it
                   can say it is one. Nothing was charged; no seat is held. */
                test: id.startsWith("test_"),
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
        onIdentity={(id) => {
          identity.current = id;
          /* WRITTEN BEFORE THE CHARGE, not after. If the wallet is dismissed or
             the card is declined, the number is still the one useful thing this
             visit produced — it is how a launch text reaches someone who meant
             to reserve and did not finish. Its own key, because it is not a
             reservation and must never be mistaken for one. */
          try {
            window.localStorage.setItem(
              "tapin.blacksburg.identity",
              JSON.stringify({ ...id, at: new Date().toISOString() }),
            );
          } catch {
            /* private mode — the sheet carries it in memory for this visit */
          }
        }}
      />
    </>
  );
}
