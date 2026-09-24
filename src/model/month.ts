import { BENEFIT, WEEKS_PER_MONTH } from "./savings";
import { cardPlan, logoField, monthlyToday, venues } from "./content";
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
 * THE PICTURE IS THE PLACE, NOT THE DISH. Sam, 23 Sep 2026, at 1440: "maybe
 * it should be the merchant logos." Each cell is the venue's own mark
 * (`venue.logo`) seated as the site's collars seat it — its `brandColor`
 * around it, the seat hairline by `logoField` — so a glance down the month
 * reads as four places coming round again. The item is still looked up and
 * still gated on its price; it is named in the latest line, not pictured.
 *
 * Sam's cover at The Milk Parlor, weekend line skips and drinks at The Burg or
 * Olaika are the intent, and the model has no price for any of them yet; when
 * the pass and drink records land, each is one line in ORDERS.
 *
 * SWEETOPIA IS THE FIFTH PLACE (§36.1, Sam: "be sure to throw sweet topia in
 * there as well"). Every item on its menu is $7.20, under the floor, so its
 * order is a basket of two; the places word follows on its own.
 *
 * A MONTH AT ONE PLACE is `monthAt(venueId)`, below: the same calendar, that
 * venue's own orders, every benefit counted (§36).
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
  { week: 3, day: "Sat", venueId: "sweetopia", items: ["Strawberry Shortcake", "Cookies & Cream"] },
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
const COUNT_WORDS = [
  "no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty",
];
const counted = (n: number, noun: string) =>
  `${COUNT_WORDS[n] ?? n} ${noun}${n === 1 ? "" : "s"}`;

interface Placed {
  id: string;
  /** 0-based row and column: week, then day of the week (Monday first). */
  week: number;
  day: number;
  venue: string;
  /** The item's own name from the menu; a basket's names joined by " + ". */
  item: string;
  /** What the order brings back in money: its credit, or its 15%. */
  cents: number;
  /** `+$5`, `15%` or `pts` on the cell. */
  chip: string;
  /** What follows the item's name in the latest line. */
  at: string;
}

/** The pitch's cell: the venue's own mark, `venue.logo`, and how its collar
 *  seats it. */
interface CollarOrder extends Placed {
  thumb?: undefined;
  img: string;
  brand: string;
  field: "light" | "dark";
}

/** A venue's cell: the item's own photograph, and the one benefit it earned
 *  with the points every order earns. */
interface ThumbOrder extends Placed {
  thumb: string;
  benefit: "credit" | "percent" | "points";
  priceCents: number;
  creditCents: number;
  percentCents: number;
  points: number;
}

export type MonthOrder = CollarOrder | ThumbOrder;

/** A line of the foot. One that moves carries its value before the first
 *  order and after each, in order; the last is the figure. */
export interface MonthRow {
  what: string;
  figure: string;
  run?: { unit: "usd" | "pts"; start: number; running: number[] };
}

/** A running value as its row prints it. */
export const runFigure = (unit: "usd" | "pts", v: number) =>
  unit === "pts" ? `${v}\u00A0pts` : dollars(v);

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
  /** The foot above "You're ahead": the membership, then what came back. */
  rows: MonthRow[];
  /** The net before any order: the membership, owed. */
  startCents: number;
  /** The net after each order lands, in order. The last is `netCents`. */
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
    return [
      {
        id: items.map((i) => i.id).join("+"),
        week: o.week - 1,
        day,
        venue: venue.name,
        item: items.map((i) => i.name).join(" + "),
        img: venue.logo,
        brand: venue.brandColor,
        field: logoField(venue.id),
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

  return {
    head: "Your first month on the membership",
    sub: `$${BENEFIT.creditUsd} credit at every place, every week`,
    days: DAYS.map((d) => d[0]),
    weeks: Array.from({ length: WEEKS_PER_MONTH }, (_, k) => `Week ${k + 1}`),
    orders,
    empty: "Order once a week at each place",
    rows: [
      { what: `${cardPlan} membership`, figure: dollars(plan) },
      {
        what: `Credit earned, ${counted(places, "place")}`,
        figure: dollars(netCents + plan),
        run: { unit: "usd", start: 0, running: runningCents.map((c) => c + plan) },
      },
    ],
    startCents: -plan,
    runningCents,
    netCents,
  };
})();

/**
 * A MONTH AT ONE PLACE (docs/POLISH-2026-09-21.md §36). Sam, on the calendar
 * in the Coffeeholics band: "these should be food and drink items at
 * coffeeholics, showing multiple purchases a week — including the 15%
 * benefit, $5 benefit, and points benefit."
 *
 * Three or four orders a week from that venue's own menu, each pictured by
 * its first item's own photograph and each carrying the ONE benefit it earns,
 * by the model's rules, in the order they happen:
 *   credit   the week's first order at or over the floor: min($5, price)
 *   percent  every other order at or over it: 15% of what is not alcohol
 *   points   an order under it: points only
 * Every order also earns points, whole, at the venue's own multiplier (1×,
 * content.ts) on its dollars; the foot counts them all. An item missing from
 * the menu or without its photograph drops its order, and the benefits
 * re-derive from what is left. Only the money nets against the plan.
 *
 * The sandwich picked by id is the one campaign.ts and ORDERS pick by id: its
 * name trips scripts/guards.py if typed. There is no latte on this menu, so
 * there is none here.
 */
const ORDERS_AT: Record<string, { week: number; day: Day; items: string[] }[]> = {
  coffeeholicsva: [
    { week: 1, day: "Tue", items: ["Cappuccino"] },
    { week: 1, day: "Wed", items: ["California Club"] },
    { week: 1, day: "Fri", items: ["French Onion Steak Melt", "Americano"] },
    { week: 2, day: "Mon", items: ["Cortado"] },
    { week: 2, day: "Tue", items: ["coffeeholicsva-160-49"] },
    { week: 2, day: "Thu", items: ["Butter Croissant", "Breve"] },
    { week: 2, day: "Sat", items: ["California Club", "Breve"] },
    { week: 3, day: "Tue", items: ["Breve", "Brownie"] },
    { week: 3, day: "Wed", items: ["French Onion Steak Melt"] },
    { week: 3, day: "Fri", items: ["Americano", "Brownie", "Butter Croissant"] },
    { week: 4, day: "Mon", items: ["Baked Cookie"] },
    { week: 4, day: "Wed", items: ["Cappuccino", "Butter Croissant", "Baked Cookie"] },
    { week: 4, day: "Thu", items: ["coffeeholicsva-160-49"] },
    { week: 4, day: "Sat", items: ["Cheesecake", "Cortado"] },
  ],
};

export function monthAt(venueId: string): Month | null {
  const venue = venues.find((v) => v.id === venueId);
  const planned = ORDERS_AT[venueId];
  if (!venue || !planned) return null;
  const pointsRate = venue.policies.find((p) => p.kind === "points")?.multiplier ?? 0;
  const hasCredit = venue.policies.some((p) => p.kind === "credit");
  const hasPercent = venue.policies.some((p) => p.kind === "percent");
  const floor = cents(BENEFIT.creditMinUsd);
  const pct = Math.round(BENEFIT.percentOff * 100);
  const menu = itemsFor(venueId);

  const placed = planned
    .flatMap((o) => {
      const day = DAYS.indexOf(o.day);
      if (o.week < 1 || o.week > WEEKS_PER_MONTH || day < 0) return [];
      const found = o.items.map(
        (key) => menu.find((i) => i.name === key) ?? menu.find((i) => i.id === key),
      );
      if (!found.length || found.some((i) => !i)) return [];
      const items = found as NonNullable<(typeof found)[number]>[];
      const thumb = items[0].img;
      if (!thumb) return [];
      return [{ week: o.week - 1, day, items, thumb }];
    })
    .sort((a, b) => a.week - b.week || a.day - b.day);

  const credited = new Set<number>();
  const orders = placed.map((o): ThumbOrder => {
    const priceCents = o.items.reduce((sum, i) => sum + cents(i.price), 0);
    /* The 15% never touches alcohol; the credit and the points earn on it. */
    const percentBase = o.items.reduce((sum, i) => sum + (i.alcohol ? 0 : cents(i.price)), 0);
    const points = Math.round((priceCents / 100) * pointsRate);
    let benefit: ThumbOrder["benefit"] = "points";
    if (priceCents >= floor && hasCredit && !credited.has(o.week)) {
      credited.add(o.week);
      benefit = "credit";
    } else if (priceCents >= floor && hasPercent && percentBase > 0) benefit = "percent";
    const creditCents = benefit === "credit" ? Math.min(cents(BENEFIT.creditUsd), priceCents) : 0;
    const percentCents = benefit === "percent" ? Math.round(percentBase * BENEFIT.percentOff) : 0;
    const earned =
      benefit === "credit"
        ? `${dollars(creditCents)} credit`
        : benefit === "percent"
          ? `${dollars(percentCents)} off`
          : `${points} point${points === 1 ? "" : "s"}`;
    return {
      id: `${o.week}:${o.day}:${o.items.map((i) => i.id).join("+")}`,
      week: o.week,
      day: o.day,
      venue: venue.name,
      item: o.items.map((i) => i.name).join(" + "),
      thumb: o.thumb,
      benefit,
      priceCents,
      creditCents,
      percentCents,
      points,
      cents: creditCents + percentCents,
      chip: benefit === "credit" ? chip(creditCents) : benefit === "percent" ? `${pct}%` : "pts",
      /* The price and what it earned are glued, so a basket that wraps
         breaks after the name and never strands a figure. */
      at: `\u00A0\u00B7 ${dollars(priceCents)}\u00A0\u00B7\u00A0${earned.replace(" ", "\u00A0")}`,
    };
  });

  const plan = cents(monthlyToday);
  const sums = (pick: (o: ThumbOrder) => number) =>
    orders.reduce<number[]>((acc, o) => [...acc, (acc.length ? acc[acc.length - 1] : 0) + pick(o)], []);
  const runningCredit = sums((o) => o.creditCents);
  const runningPercent = sums((o) => o.percentCents);
  const runningPoints = sums((o) => o.points);
  const runningCents = sums((o) => o.cents).map((c) => c - plan);
  const last = (xs: number[]) => (xs.length ? xs[xs.length - 1] : 0);
  const netCents = runningCents.length ? last(runningCents) : -plan;
  if (!orders.length || netCents <= 0) return null;
  const nCredit = orders.filter((o) => o.benefit === "credit").length;
  const nPercent = orders.filter((o) => o.benefit === "percent").length;

  const rows: MonthRow[] = [{ what: `${cardPlan} membership`, figure: dollars(plan) }];
  if (nCredit)
    rows.push({
      what: `$${BENEFIT.creditUsd} credit, ${counted(nCredit, "week")}`,
      figure: dollars(last(runningCredit)),
      run: { unit: "usd", start: 0, running: runningCredit },
    });
  if (nPercent)
    rows.push({
      what: `${pct}% off, ${counted(nPercent, "order")}`,
      figure: dollars(last(runningPercent)),
      run: { unit: "usd", start: 0, running: runningPercent },
    });
  if (last(runningPoints))
    rows.push({
      what: `Points, ${counted(orders.length, "order")}`,
      figure: runFigure("pts", last(runningPoints)),
      run: { unit: "pts", start: 0, running: runningPoints },
    });

  return {
    head: `Your first month at ${venue.name}`,
    sub: `$${BENEFIT.creditUsd} credit once a week, ${pct}% off the rest, points on all of it`,
    days: DAYS.map((d) => d[0]),
    weeks: Array.from({ length: WEEKS_PER_MONTH }, (_, k) => `Week ${k + 1}`),
    orders,
    empty: "Order the way you already do",
    rows,
    startCents: -plan,
    runningCents,
    netCents,
  };
}
