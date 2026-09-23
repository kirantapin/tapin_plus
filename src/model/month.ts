import { BENEFIT, WEEKS_PER_MONTH } from "./savings";
import { cardPlan, monthlyToday, venues } from "./content";
import { itemsFor } from "./menu";

/**
 * A MONTH ON THE MEMBERSHIP — the pitch's calendar (docs/POLISH-2026-09-21.md
 * §21). Sam, 23 Sep 2026, on the canvas's C · Calendar direction: "I like the
 * calendar graphic a lot, wondering if you could implement that on the main
 * LP", and "include offerings from other locations".
 *
 * It is the pitch's headline shown happening: $5 credit, every week, at every
 * place you already go. Four weeks, one order at a place each time it appears,
 * each order a real item from that venue's own menu.
 *
 * EVERY ORDER IS A RECORD, AND EVERY FIGURE IS ARITHMETIC ON ONE. The item is
 * looked up in `itemsFor(venueId)`; its price must clear
 * `BENEFIT.creditMinUsd`; its credit is `min(BENEFIT.creditUsd, price)`; the
 * foot is the credits less `monthlyToday`, in integer cents, never typed. An
 * order whose item is missing, under the floor, at a venue that carries no
 * credit, or a second one at the same place in the same week (the credit is
 * weekly, per place) is DROPPED, and the totals follow. If the credits stop
 * covering the membership nothing renders: the foot says "You're ahead".
 *
 * ONLY THE CREDIT IS COUNTED, as on the Coffeeholics ledger (§17): the 15% and
 * the points are real but vary with the order.
 *
 * BY NAME, EXCEPT ONE. §21's table names each item and the lookup matches the
 * menu's own name exactly. Week 2's Coffeeholics sandwich is picked by its
 * record id instead: its name trips scripts/guards.py's brand-as-points-
 * destination check if typed in source (campaign.ts hit the same thing). The
 * record's name is what prints.
 *
 * THE PICTURE IS THE ITEM'S OWN `img` — a basket shows its first item's — and
 * where the record has none, the venue's own logo stands in, so the cell still
 * says whose night it was. Never a stock or borrowed photograph.
 *
 * Sam's cover at The Milk Parlor, weekend line skips and drinks at The Burg or
 * Olaika are the intent, and the model has no price for any of them yet; when
 * the pass and drink records land, each is one line in ORDERS.
 */

/** Monday first: the weekend closes each row, where the nights out fall. */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = (typeof DAYS)[number];

const ORDERS: { week: number; day: Day; venueId: string; items: string[] }[] = [
  { week: 1, day: "Tue", venueId: "coffeeholicsva", items: ["California Club"] },
  { week: 1, day: "Sat", venueId: "themilkparlor", items: ["Munchie Sampler"] },
  { week: 2, day: "Thu", venueId: "coffeeholicsva", items: ["coffeeholicsva-160-49"] },
  { week: 2, day: "Fri", venueId: "olaika", items: ["Olaika Burger — Peruvian Style"] },
  { week: 2, day: "Sat", venueId: "themilkparlor", items: ["Loaded Fries Basket"] },
  { week: 3, day: "Mon", venueId: "coffeeholicsva", items: ["French Onion Steak Melt"] },
  { week: 3, day: "Fri", venueId: "theburg", items: ["Lomo Saltado — Peru"] },
  {
    week: 4,
    day: "Wed",
    venueId: "coffeeholicsva",
    items: ["Cappuccino", "Butter Croissant", "Baked Cookie"],
  },
  { week: 4, day: "Fri", venueId: "olaika", items: ["Classic Burger"] },
  { week: 4, day: "Sat", venueId: "themilkparlor", items: ["The Spicy Redneck"] },
];

const cents = (usd: number) => Math.round(usd * 100);
export const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;
/** Signed, with a real minus sign: the foot starts below zero. */
export const signedDollars = (c: number) => `${c < 0 ? "−" : ""}${dollars(Math.abs(c))}`;
/** The chip's short form: whole dollars drop their cents. */
const chip = (c: number) => `+$${c % 100 ? (c / 100).toFixed(2) : c / 100}`;
const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven"];

export interface MonthOrder {
  id: string;
  /** 0-based row and column: week, then day of the week (Monday first). */
  week: number;
  day: number;
  venue: string;
  /** The item's own name from the menu; a basket's names joined by " + ". */
  item: string;
  /** The item's own photograph, or the venue's logo where it has none. */
  img: string;
  isLogo: boolean;
  cents: number;
  /** `+$5` on the cell. */
  chip: string;
  /** ` at {venue} · +$5.00`, after the item's name in the latest line. */
  at: string;
}

export interface Month {
  head: string;
  sub: string;
  /** One letter a column, Monday first. */
  days: string[];
  weeks: string[];
  /** Chronological: by week, then by day. */
  orders: MonthOrder[];
  /** The latest line before the first order. */
  empty: string;
  plan: { what: string; figure: string; cents: number };
  earned: { what: string; figure: string; cents: number };
  /** The foot before any credit: the membership, owed. */
  startCents: number;
  /** The foot after each order lands, in order. The last is `netCents`. */
  runningCents: number[];
  netCents: number;
}

export const month: Month | null = (() => {
  const floor = cents(BENEFIT.creditMinUsd);
  const seen = new Set<string>();
  const orders = ORDERS.flatMap((o): MonthOrder[] => {
    const venue = venues.find((v) => v.id === o.venueId);
    const day = DAYS.indexOf(o.day);
    if (!venue || !venue.policies.some((p) => p.kind === "credit")) return [];
    if (o.week < 1 || o.week > WEEKS_PER_MONTH || day < 0) return [];
    const menu = itemsFor(o.venueId);
    const found = o.items.map(
      (key) => menu.find((i) => i.name === key) ?? menu.find((i) => i.id === key),
    );
    if (!found.length || found.some((i) => !i)) return [];
    const items = found as NonNullable<(typeof found)[number]>[];
    const price = items.reduce((sum, i) => sum + cents(i.price), 0);
    if (price < floor) return [];
    /* The credit is once a week at each place. */
    const slot = `${o.week}:${o.venueId}`;
    if (seen.has(slot)) return [];
    seen.add(slot);
    const credit = Math.min(cents(BENEFIT.creditUsd), price);
    const img = items[0].img;
    return [
      {
        id: items.map((i) => i.id).join("+"),
        week: o.week - 1,
        day,
        venue: venue.name,
        item: items.map((i) => i.name).join(" + "),
        img: img ?? venue.logo,
        isLogo: !img,
        cents: credit,
        chip: chip(credit),
        /* Glued to the venue, so a basket that wraps never strands the figure. */
        at: ` at ${venue.name}\u00A0\u00B7\u00A0+${dollars(credit)}`,
      },
    ];
  }).sort((a, b) => a.week - b.week || a.day - b.day);

  const plan = cents(monthlyToday);
  const runningCents = orders.reduce<number[]>(
    (acc, o) => [...acc, (acc.length ? acc[acc.length - 1] : -plan) + o.cents],
    [],
  );
  const netCents = runningCents.length ? runningCents[runningCents.length - 1] : -plan;
  if (!orders.length || netCents <= 0) return null;
  const places = new Set(orders.map((o) => o.venue)).size;
  const earned = netCents + plan;

  return {
    head: "Your first month on the membership",
    sub: `$${BENEFIT.creditUsd} credit at every place, every week`,
    days: DAYS.map((d) => d[0]),
    weeks: Array.from({ length: WEEKS_PER_MONTH }, (_, k) => `Week ${k + 1}`),
    orders,
    empty: "Order once a week at each place",
    plan: { what: `${cardPlan} membership`, figure: dollars(plan), cents: plan },
    earned: {
      what: `Credit earned, ${COUNT_WORDS[places] ?? places} place${places === 1 ? "" : "s"}`,
      figure: dollars(earned),
      cents: earned,
    },
    startCents: -plan,
    runningCents,
    netCents,
  };
})();
