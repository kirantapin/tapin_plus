import { itemNamed, type MenuItem } from "./menu";
import { BENEFIT } from "./savings";
import { venues, offers } from "./content";

/**
 * DEMONSTRATION DATA for the locked app preview.
 *
 * Everything in this file is invented and must never be presented as a real
 * balance, order or figure. It exists so a prospect can SEE the app she would
 * get rather than read a description of it, and every surface that renders it
 * says "Preview" and is non-interactive.
 *
 * What is NOT invented: venue names, menu items and menu prices all come from
 * the frozen production extraction (docs/data/*.json). A made-up latte at a real
 * coffee shop would be a claim about that business (TRUTH.md §10).
 */

/* Menu types and access live in ./menu — one source, so the merchant pages and
   this demonstration data cannot disagree about what is on a menu or what it
   costs. `itemNamed` also drops the extraction's one unpriced item. */

/* DERIVED, NOT DECLARED. 0.15 used to be written out here as well as in
   savings.ts and again in Scenes.tsx — three copies of one rate across the
   slider, the walkthrough receipt and the app preview, any one of which could
   have been edited alone. Same for the points rate. */
export const PCT_OFF = BENEFIT.percentOff;
/** A point is worth 1c where it was earned. Derived: this was a second copy of
 *  BENEFIT.pointValueUsd, and the two had split consumers — savings.ts drove the
 *  pitch's figure, this drove /app/points' dollar column, so editing the token
 *  moved one and left the other. */
export const POINT_VALUE_USD = BENEFIT.pointValueUsd;
export { POINTS_PER_DOLLAR } from "./order";
/** Four points earned at a venue become one TapIn point. The balance moves; the
 *  value does not survive the move intact. That is the honest framing. */
export const TRANSFER_RATIO = 4;

export interface SavedOrder {
  id: string;
  venueId: string;
  items: MenuItem[];
  savedAgo: string;
}

/** My Spot — paid for, waiting. Real items, real prices. */
export const savedOrders: SavedOrder[] = [
  {
    id: "spot-1",
    venueId: "coffeeholicsva",
    items: [
      itemNamed("coffeeholicsva", "California Club"),
      itemNamed("coffeeholicsva", "Baked Cookie"),
    ],
    savedAgo: "Saved Tuesday",
  },
  {
    id: "spot-2",
    venueId: "olaika",
    items: [itemNamed("olaika", "Classic Burger")],
    savedAgo: "Saved this morning",
  },
];

/* orderSubtotal and memberPrice lived here and totalled in floating-point
   dollars. They are deleted rather than kept as a convenience: appBits.ts
   re-exports this whole module into every app screen, so a second pricing path
   in scope is a second pricing path someone reaches for. Across every basket of
   up to three items at the five Plus venues the two paths disagreed on 50 of
   1,179 — always a penny higher on the float side, i.e. quietly a penny less
   off. Everything prices through quote() in src/model/order.ts now. */

export interface VenuePoints {
  venueId: string;
  points: number;
  /** Credit earned and not yet spent at that venue. */
  creditUsd: number;
}

/**
 * Per-venue balances. Points are worth most where they were earned.
 *
 * SWEETOPIA IS BACK, and the round trip is worth recording. Its row came out
 * when merchant pages made the incoherence visible: it had no menu, so its
 * page said ordering was not in the app, and a points balance at a venue you
 * cannot order from is impossible — ordering there is the only way to earn
 * one. Sam then supplied the menu from production, so the premise is gone and
 * the balance is coherent again. It carries no credit: one credit-spending
 * demonstration, at Olaika, is enough to teach the mechanism.
 */
/*
 * COFFEEHOLICS HOLDS NO CREDIT, and that is a rendering decision made in the
 * data because it cannot be made anywhere else.
 *
 * Its merchant page seeds a $4.25 cappuccino. With $5.00 of credit here, the
 * ticket at rest read: $4.25 → $3.61 member price → −$3.61 credit → You pay
 * $0.00. Every part of that is arithmetically correct and the whole thing is
 * wrong to ship. The first paint of the flagship merchant page said a
 * cappuccino at a real Draper Road cafe costs nothing — a price claim about a
 * real business, made by layout — and the ticket that exists to demonstrate the
 * 15% demonstrated "free" instead, so the page's own thesis was unreadable at
 * rest. No seed price fixes it: at $5.00 of credit any Coffeeholics item under
 * $5.88 lands on zero, and every sub-$10 item there is.
 *
 * Olaika carries the credit instead and teaches it better: $9.99 → $8.49 →
 * −$5.00 → $3.49, one cent under the threshold, so the same ticket also shows
 * the credit she has NOT yet earned. Coffeeholics now opens on a clean 15%.
 */
export const venuePoints: VenuePoints[] = [
  { venueId: "coffeeholicsva", points: 940, creditUsd: 0 },
  { venueId: "theburg", points: 620, creditUsd: 0 },
  { venueId: "olaika", points: 480, creditUsd: 5 },
  { venueId: "themilkparlor", points: 300, creditUsd: 0 },
  { venueId: "sweetopia", points: 160, creditUsd: 0 },
];

export const totalPoints = venuePoints.reduce((n, v) => n + v.points, 0);
export const totalCredit = venuePoints.reduce((n, v) => n + v.creditUsd, 0);

/**
 * THIS WEEK'S CREDIT, PER PLACE — whether it has been EARNED yet.
 *
 * Sam, 15 Sep 2026: "the credit will just be added to someone's account after
 * they spend at least $10 within that week or on a single order with that
 * merchant" — and it does not expire. So the account carries a balance
 * (`venuePoints.creditUsd`, summed in `totalCredit`), and the week is about
 * whether each place's $5 has been earned yet. Demonstration states, like
 * everything here; The Burg's "earned Tuesday" exists so the list shows both.
 */
export interface WeeklyCredit {
  venueId: string;
  /** Set once this week's credit at the place has been earned — the day. */
  earned?: string;
}
export const weeklyCredit: WeeklyCredit[] = [
  { venueId: "coffeeholicsva" },
  { venueId: "theburg", earned: "Tuesday" },
  { venueId: "olaika" },
  { venueId: "themilkparlor" },
  { venueId: "sweetopia" },
];
/** Places where this week's $5 can still be earned. */
export const creditPlacesLeft = weeklyCredit.filter((w) => !w.earned).length;

/** What a venue balance is worth spent where it was earned. */
export const worthHere = (points: number) => points * POINT_VALUE_USD;
/** What it becomes as one portable TapIn balance. Fewer points, not more. */
export const asTapInPoints = (points: number) => Math.floor(points / TRANSFER_RATIO);

export const venueById = (id: string) => venues.find((v) => v.id === id);

/** The one real offer in the extraction. */
export const liveOffers = offers;
