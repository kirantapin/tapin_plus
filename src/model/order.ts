import { BENEFIT } from "./savings";
import type { MenuItem } from "./menu";
import { offers, type Venue } from "./content";

/**
 * What one order at one venue costs a member, and what it earns.
 *
 * This is the only place in the app preview that prices a basket, and it is
 * deliberately NOT a second savings model. It answers "what does THIS ticket
 * cost" from the same constants savings.ts answers "what does a month save"
 * from — §7 keeps the monthly figure and its justifying sentence together in
 * savings.ts, and nothing here may re-derive, annualise or project anything.
 *
 * INTEGER CENTS THROUGHOUT, for savings.ts's own stated reason: a merchant page
 * shows the menu total and the member total on the same line, and a pair that
 * disagrees with itself by a penny is worse than no pair at all.
 */

const cents = (usd: number) => Math.round(usd * 100);
export const money = (c: number) => `$${(c / 100).toFixed(2)}`;
/** For a threshold, not a price: "$10+ order", never "$10.00+ order".
 *  TAKES CENTS, like everything else in this file — see `wholeUsd` below. */
export const whole = (c: number) => `$${Math.round(c / 100)}`;
/**
 * The same format, for a figure that is already in DOLLARS.
 *
 * ══ WHY BOTH UNITS ARE NOW IN THE NAMES ════════════════════════════════════
 * `whole` takes cents. The monthly spend a reader picks is in dollars — 50,
 * 100, 150, 300 — so `whole(150)` returns **"$2"**, a plausible-looking string
 * rather than an error. That is exactly what the walkthrough's new spend
 * caption printed on 13 Sep 2026: "Based on $2 a month", directly above four
 * buttons one of which read $150.
 *
 * Three other surfaces format that same dollar figure — SavingsSlider,
 * Concentration and /savings — and none of them had the bug, because each had
 * quietly declared its OWN `const whole = (n) => $${Math.round(n)}` taking
 * dollars. Three private helpers with one name, one shared name meaning
 * something else, and no way to tell at a call site which you had. They now all
 * import this, so there is one dollars formatter and one cents formatter and
 * each says which it is.
 */
export const wholeUsd = (usd: number) => `$${Math.round(usd)}`;

/**
 * The gross earn a member SEES at a venue: 10 a dollar, doubled.
 *
 * Derived here rather than written as 20, because 20 and BENEFIT.pointsPerDollar
 * are two frames of one fact and confusing them doubles a headline. savings.ts
 * may only count the extra 1x as the membership's — this is the other frame, and
 * the multiplication sits at the point of derivation so the two can never be
 * mistaken for each other.
 */
/* 1×, not 2×. Sam, 15 Sep 2026: "Make sure that those points are at 1x now,
   not 2x." The base rate, unmultiplied. */
export const POINTS_PER_DOLLAR = BENEFIT.pointsPerDollar;

/** Exported so the page states the rule from the constant rather than typing
 *  "$5 credit on a $10+ order" as a sentence that can go stale. */
export const CREDIT_MIN_CENTS = cents(BENEFIT.creditMinUsd);
export const CREDIT_CENTS = cents(BENEFIT.creditUsd);

export interface Quote {
  /** What the menu says, before anything. */
  subtotalCents: number;
  /** After the percentage, before credit is spent. */
  afterPercentCents: number;
  /**
   * Credit taken off this ticket from the balance she already holds here.
   *
   * §5: the credit "is a balance, not a discount... Later orders spend it."
   * A merchant page that prints "$5.00 credit here" at the top and a total that
   * ignores it 370px below is not showing a member a benefit, it is showing her
   * a number she cannot use — and the first thing anyone on a budget does with
   * two figures like that is subtract one from the other and wonder which is
   * the lie. Spending it is both the honest reading of §5 and the better
   * demonstration: the credit is the part of this product that only makes sense
   * once you watch it come off something.
   */
  creditSpentCents: number;
  /** What a member hands over. */
  dueCents: number;
  /**
   * Credit still sitting at this venue after the ticket.
   *
   * Shown so the page's own arithmetic closes: a reader told she holds $5.00
   * and then shown $3.61 of it spent will look for the $1.39, and a page that
   * spends a balance without ever saying what is left of it has only moved the
   * unanswered subtraction one line down.
   */
  creditLeftCents: number;
  /** subtotal - due. Derived, never independently rounded. */
  offCents: number;
  /** The rate that produced `offCents`, as a whole number for display. */
  offPercent: number;
  /**
   * Whether this ticket clears the threshold. Tested on the GROSS subtotal:
   * TRUTH.md §5, "Credit spent does not count toward the $10. The 15% does",
   * and savings.ts derives visits from all spend for the same reason. So a
   * $10.00 basket earns even though the member pays $8.50.
   */
  earnsCredit: boolean;
  /**
   * ALWAYS ONE CREDIT, however many items are in the basket. The cadence is
   * once a week per place, not once per item. savings.ts:113 records the same
   * bug caught at month scale — 40 visits reporting 40 credits against a real
   * ceiling of 20 — and this is where it would come back per-order.
   */
  creditCents: number;
  /** Which of the two the ticket takes — 15% off now, or full price and the
   *  weekly $5 credit ADDED to her account (Sam, 15 Sep 2026) — never both.
   *  "none" at a venue with neither. */
  using: "percent" | "credit" | "none";
  /** Credit added to her account by THIS order — CREDIT_CENTS in credit mode
   *  on a $10+ basket, else 0. It never reduces this ticket. */
  creditEarnedCents: number;
  /** What the OTHER benefit would have taken off this ticket, in cents — 0 when
   *  it does not apply (a credit needs a $10+ basket). */
  altCents: number;
  /** A count. Never a dollar value: that is the transfer question, not this one. */
  points: number;
  /** Plus venues earn the standing three. Italiano's earns its own offer only. */
  standing: boolean;
}

/**
 * ITALIANO'S IS NOT PLUS AND THIS IS WHERE THAT BITES.
 *
 * Reaching for a flat 15% here would manufacture a standing discount at a venue
 * that carries no standing benefits — the sharpest trap on this page, because
 * the number would look completely reasonable. The branch is on the venue's own
 * derived `plus`, which comes from whether it carries policies at all, so a
 * venue cannot be priced as Plus and fail to be Plus.
 *
 * A non-Plus venue's rate comes from its own one-time offer in the extraction,
 * and it earns no credit and no points, because it has none to earn.
 */
export type BenefitMode = "percent" | "credit";

export function quote(
  venue: Venue,
  items: MenuItem[],
  /** Which of the two the ticket takes — see the note in the body. */
  mode: BenefitMode = "percent",
): Quote {
  const subtotalCents = items.reduce((n, i) => n + cents(i.price), 0);

  if (!venue.plus) {
    /**
     * NO DISCOUNT IS APPLIED AT A NON-PLUS VENUE, and this is the correction
     * that matters most on Italiano's page.
     *
     * §5 defines an offer as the opposite of a standing benefit: a one-time
     * merchant promotion the member ADDS, which applies once and then reads
     * used. Pricing every basket 10% down — in the same struck-pair shape the
     * Plus venues use for an automatic 15% — says Italiano's discounts every
     * order forever. That is a claim by layout about a real named business, and
     * it is the same species of claim §10 forbids about alcohol.
     *
     * So the ticket prices at menu price. The offer is shown on the page as
     * what it is: available, once.
     */
    return {
      subtotalCents,
      afterPercentCents: subtotalCents,
      creditSpentCents: 0,
      dueCents: subtotalCents,
      creditLeftCents: 0,
      offCents: 0,
      offPercent: offers.find((o) => o.venueId === venue.id)?.percentOff ?? 0,
      earnsCredit: false,
      creditCents: 0,
      creditEarnedCents: 0,
      using: "none",
      altCents: 0,
      points: 0,
      standing: false,
    };
  }

  const offCents = Math.round(subtotalCents * BENEFIT.percentOff);
  const afterPercentCents = subtotalCents - offCents;

  /* ══ ONE OF THE TWO, AND THE CREDIT IS EARNED, NOT SPENT ═══════════════════
     Sam, 15 Sep 2026, first: "you'd only be able to use one of the two
     benefits ($5 credit on $10 spend or the 15% off), but you can earn points
     on everything." Then, later the same night, what the credit IS: "spend
     $10, get $5 credit … it's a credit added to your account, so you're still
     paying the full price. The credit doesn't expire … it will just be added
     to someone's account after they spend at least $10 within that week or
     on a single order with that merchant."

     So an order takes ONE of two:
       percent — 15% off this order, now.
       credit  — full price now; if the order clears $10, $5 is ADDED TO HER
                 ACCOUNT for later. Nothing comes off this ticket.
     The first pass of this rule subtracted the credit from the order; that was
     the wrong reading and is gone. `mode` is the member's choice (the venue
     page offers the switch once the basket clears $10); the other side is
     reported as the alternative so a surface can say what she passed on. */
  const canCredit = subtotalCents >= CREDIT_MIN_CENTS;
  const using: Quote["using"] = mode === "credit" && canCredit ? "credit" : "percent";
  const creditEarnedCents = using === "credit" ? CREDIT_CENTS : 0;

  return {
    subtotalCents,
    afterPercentCents,
    creditSpentCents: 0,
    creditLeftCents: 0,
    dueCents: using === "credit" ? subtotalCents : afterPercentCents,
    offCents,
    offPercent: Math.round(BENEFIT.percentOff * 100),
    earnsCredit: canCredit,
    creditCents: canCredit ? CREDIT_CENTS : 0,
    creditEarnedCents,
    using,
    altCents: using === "credit" ? offCents : canCredit ? CREDIT_CENTS : 0,
    // Floor: a member is never told she earned a point she did not earn.
    points: Math.floor((subtotalCents * POINTS_PER_DOLLAR) / 100),
    standing: true,
  };
}

/**
 * NOTHING ON THIS PAGE SAYS WHERE A FINISHED ORDER GOES, and both halves of
 * that were deliberate.
 *
 * A `fulfilment(venue)` helper used to read `open` and print "To the kitchen"
 * or "To My Spot", which demonstrated §5 neatly. It came off for two reasons.
 * First, `open` is one frozen moment of a September 2026 extraction: rendered
 * with no hours and no timestamp it tells a student that a real Blacksburg
 * venue is shut, at whatever hour she happens to be reading, which is a claim
 * about a business's operating state this build cannot stand behind — and §5's
 * own point is that closure changes nothing that matters to the sale. Second,
 * once `open` was gone the line said the same three words on every page while
 * sitting directly above a filled maroon button, which is exactly the stack a
 * food app uses for checkout: total, destination, place order.
 *
 * The My Spot rule is taught on /how, where it is a rule rather than an
 * assertion about one venue's doors tonight.
 */

/**
 * What a page opens holding.
 *
 * ONE ITEM, UNDER $10, on purpose. An empty basket makes the whole ticket dead
 * and leaves a reader guessing what the page is for; a full one over the
 * threshold reduces the page to a screenshot and spends both transitions worth
 * having. One cheap item populates the ticket, makes removal discoverable, and
 * leaves her next tap to cross $10 — which is the moment the credit row stops
 * stating a rule and starts stating an amount.
 *
 * Every name is resolved through the menu at render, so a renamed or unpriced
 * dish fails loudly instead of quietly seeding an empty basket.
 */
export const SEED: Record<string, string> = {
  coffeeholicsva: "Cappuccino",
  theburg: "Empanada — Argentina",
  themilkparlor: "The Good Good",
  olaika: "Buffalo",
  italianospizza: "Garlic Knots",
  sweetopia: "Brookie",
};
