import { BENEFIT } from "./savings";
import { venues } from "./content";

/**
 * A CAMPAIGN LANDING PAGE — one venue, two live offers, one decision.
 *
 * Sam, 20 Sep 2026: "I'm creating a post on meta for coffeeholics, focusing on
 * the $5 credit 15% off and points towards rewards that are already available.
 * Let's get a dedicated splash page for this. Narrowing the focus on
 * coffeeholics. Should be a separate URL, like
 * plus.tapin.app/blacksburg/coffeeholics."
 *
 * ══ WHY THIS IS NOT THE PITCH WITH A VENUE FILTER ══════════════════════════
 * The pitch sells a membership to a town. This page answers a Meta ad about
 * ONE coffee shop, and it has something the pitch does not: two offers a
 * stranger can use at that shop today, for nothing. The ad's own last card
 * asks for the membership, so the page does too — but after the proof, not
 * before it.
 *
 * ══ THE TWO OFFERS ARE REAL, AND WERE OPENED TO CHECK ══════════════════════
 * Sam: "they can already order at coffeeholics now and use the benefit, which
 * is $10 spend to get $5 credit. It's a one time offer. Redeem now or save for
 * later… it'd be gated behind the custom link that I provide to you here",
 * then a second link for the 15%.
 *
 * Both were opened in a browser on 20 Sep 2026 and both resolve to
 * Coffeeholics' real page with their policy attached:
 *
 *   87f41cfd…  "Spend $10 Get $5 Credit (TAPIN PLUS)"
 *              "Try It Out, View Credit in My Spot Once Purchase Is Made."
 *   d50544d7…  "15% Off Your Order (TAPIN PLUS)"
 *              "Try It Out, 15% Comes Right Off the Top."
 *
 * A first check at eight seconds found neither and was wrong: that page hangs
 * its gated policy in late, so anything verifying these links has to wait for
 * the offer row rather than for the menu. The labels above are the merchant
 * page's own words, which is why this file quotes rather than paraphrases
 * them — the reader meets them again one tap later, and a promise that
 * rewords itself between the advert and the till is the §10 failure.
 *
 * ⚠ ONE TIME EACH, AND THE PAGE MUST SAY SO. Both are trials. A reader who
 * takes a one-time credit for the standing weekly one has been misled by
 * omission, which counts the same as by statement.
 */

/** The venue this campaign is about, from the same record every other surface
 *  reads, so its name, mark, photograph, category and street cannot drift. */
export const campaignVenue = venues.find((v) => v.id === "coffeeholicsva");

/**
 * The two gated trials, in the order the advert names them.
 *
 * `label` is this site's sentence and `proof` is the merchant page's own, kept
 * together so nobody edits one and leaves the other behind.
 */
export const campaignTrials = [
  {
    id: "credit",
    label: `Spend $${Math.round(BENEFIT.creditMinUsd)}, get $${BENEFIT.creditUsd} credit`,
    /* Sam's "redeem now or save for later", in the merchant page's words. */
    note: "Your credit waits in My Spot until you want it",
    href: "https://tapin.app/coffeeholicsva?l=87f41cfd-9a61-421c-b2c3-2466563d5064",
  },
  {
    id: "percent",
    label: "15% off your order",
    note: "Comes off the top, on anything",
    href: "https://tapin.app/coffeeholicsva?l=d50544d7-ac2d-46c2-89b4-1a1d2205bf17",
  },
];

/**
 * What a MEMBER gets at Coffeeholics, worded as the advert words it.
 *
 * ══ MESSAGE MATCH, WHICH IS NOT A STYLE PREFERENCE ═════════════════════════
 * A reader who taps a card reading "$5 credit — every week at Coffeeholics"
 * and lands on a page that opens differently has to re-decide they are in the
 * right place. So these are the carousel's own lines.
 *
 * ⚠ "ONCE A DAY" IS THE ADVERT'S, NOT THE DATA'S. docs/data/money-and-terms.json
 * gives the 15% no cadence at all, and no other surface prints one. Sam wrote
 * it on the card himself and it is the tighter of the two claims, so it is the
 * one printed here — but the JSON and this file now disagree, and the JSON is
 * what the checkout's terms are built from. It is his to reconcile.
 *
 * `note` is a CONDITION or a CADENCE, never a restatement of the label. The
 * merchant pop-up learned that on the same afternoon.
 */
export const campaignBenefits: { id: string; label: string; note: string }[] = [
  {
    id: "credit",
    label: `$${BENEFIT.creditUsd} credit`,
    note: `Every week, on any order over $${Math.round(BENEFIT.creditMinUsd)}`,
  },
  { id: "percent", label: "15% off", note: "Once a day" },
  { id: "points", label: "Points toward rewards", note: "Earned on every order" },
];
