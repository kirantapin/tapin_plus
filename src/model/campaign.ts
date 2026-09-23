import { BENEFIT } from "./savings";
import { benefitFragments, venues } from "./content";
import { itemsFor } from "./menu";

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
 * ══ A FIGURE AND ITS QUALIFIER, NOT A LABEL AND A NOTE ═════════════════════
 * 21 Sep 2026 (docs/POLISH-2026-09-21.md §3): the splash sets these three as
 * DISPLAY FIGURES on the page rather than as rows beside icon tiles, so the
 * record is split at the same seam the type is — `figure` is the thing that is
 * set large, `qualifier` is the ≤3-word line under it. The claims are the
 * advert's, unchanged; only where the line breaks has moved.
 *
 * ALL THREE ARE NUMBERS, AT ONE SIZE. "Points" was a word set smaller on the
 * same baseline; Sam, 22 Sep 2026: "what if we reworked the 'points' '$5' and
 * '15%' to be the same size text… We could do 1X points, towards free items."
 * So it is `1×`, the `1` read from Coffeeholics' own points policy (content.ts
 * sets the multiplier), and no column is printed if that policy is gone.
 *
 * ⚠ "ONCE A DAY" IS THE ADVERT'S, NOT THE DATA'S. docs/data/money-and-terms.json
 * gives the 15% no cadence at all, and no other surface prints one. Sam wrote
 * it on the card himself and it is the tighter of the two claims, so it is the
 * one printed here — but the JSON and this file now disagree, and the JSON is
 * what the checkout's terms are built from. It is his to reconcile.
 *
 * `qualifier` is a CONDITION or a CADENCE, never a restatement of the figure.
 * The merchant pop-up learned that on the same afternoon.
 */
const pointsRate = campaignVenue?.policies.find((p) => p.kind === "points")?.multiplier;

export const campaignBenefits: {
  id: string;
  figure: string;
  qualifier: string;
}[] = [
  {
    id: "credit",
    figure: `$${BENEFIT.creditUsd}`,
    qualifier: "credit every week",
  },
  {
    id: "percent",
    figure: `${Math.round(BENEFIT.percentOff * 100)}%`,
    qualifier: "off, once a day",
  },
  ...(pointsRate
    ? [{ id: "points", figure: `${pointsRate}\u00D7`, qualifier: "points, toward free items" }]
    : []),
];

/**
 * WHAT YOU'D SAVE HERE — three of Coffeeholics' own items, each under the
 * benefit it exercises (docs/POLISH-2026-09-21.md §11). Sam, 22 Sep 2026:
 * "showing items from their page, and when ordering what they save."
 *
 * Every figure is arithmetic on the record: the price is the menu's, the
 * saving is BENEFIT's, in integer cents. An item missing from the data (or
 * without its photograph) drops its card — no placeholder, no guess — and the
 * credit card also drops if its item stops clearing the $10 threshold, since
 * that would picture a credit nobody earns. "Once a week", not "at each
 * place": these are this shop's items on this shop's page.
 *
 * THE PHOTOGRAPHS ARE COFFEEHOLICS' OWN PROMOTIONAL SHOTS, not the menu
 * thumbnails. Sam, 23 Sep 2026: "do we have better images for coffeeholics
 * here?" The item images in docs/data are 162px resamples of 300–550px
 * originals, soft at a card's width. Their live TapIn page carries four
 * 1,500px+ photographs (highlights and the Weekly Fix bundle) from the same
 * public bucket and the same permission as the logos and heroes; three are
 * copied to public/shots/. A card's `shot` wins over the item's thumbnail;
 * the item line stays the record's, so the price is still the menu's.
 */
const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const cents = (usd: number) => Math.round(usd * 100);

const SHOT_ITEMS = [
  {
    id: "credit",
    item: "California Club",
    shot: "/shots/coffeeholicsva-bagel.jpg",
    title: `$${BENEFIT.creditUsd} credit`,
    line: `On a $${Math.round(BENEFIT.creditMinUsd)}+ order, once a week`,
    saves: (price: number) =>
      price >= BENEFIT.creditMinUsd
        ? `You save ${dollars(Math.min(cents(BENEFIT.creditUsd), cents(price)))}`
        : undefined,
  },
  {
    id: "percent",
    item: "French Onion Steak Melt",
    shot: "/shots/coffeeholicsva-spread.jpg",
    title: `${Math.round(BENEFIT.percentOff * 100)}% off`,
    line: "Everything except alcohol",
    saves: (price: number) => `You save ${dollars(Math.round(cents(price) * BENEFIT.percentOff))}`,
  },
  {
    id: "points",
    /* A drink, because the photograph is the drinks and the loyalty card. */
    item: "Cappuccino",
    shot: "/shots/coffeeholicsva-drinks.jpg",
    title: "Points",
    line: "On every order",
    /* The pitch's own words for it: no rate is published for redemption. */
    saves: () => benefitFragments.points.figure,
  },
];

export const campaignShots: {
  id: string;
  img: string;
  title: string;
  line: string;
  chip: { line: string; figure: string };
}[] = SHOT_ITEMS.flatMap((s) => {
  const found = itemsFor("coffeeholicsva").find((i) => i.name === s.item);
  const figure = found ? s.saves(found.price) : undefined;
  return found?.img && figure
    ? [
        {
          id: s.id,
          img: s.shot ?? found.img,
          title: s.title,
          line: s.line,
          chip: { line: `${found.name} · ${dollars(cents(found.price))}`, figure },
        },
      ]
    : [];
});
