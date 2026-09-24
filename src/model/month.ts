import { BENEFIT, WEEKS_PER_MONTH } from "./savings";
import { logoField, monthlyToday, venues, type Venue } from "./content";
import { sectionsFor, type MenuItem } from "./menu";

/**
 * A MONTH ON THE MEMBERSHIP — the calendar on the pitch and on Coffeeholics
 * (docs/POLISH-2026-09-21.md §21, §36, §40, §42).
 *
 * SPEND A LITTLE, SAVE A LOT (§42). Sam: "show how little you have to spend
 * and how much you can save with such little spend." Every order in a month
 * is the MODEST one: at each visit, the place's cheapest real order that
 * reaches the credit floor — one item, or a basket off the same menu — so the
 * foot's "You spent" is as small as the month can honestly be, and "You
 * saved" is what that spend brings back. Nothing is typed but the schedule
 * below: which place, which week, which day. The items and every figure are
 * arithmetic on the menu (`docs/data/menus.json`), in integer cents.
 *
 * THE CHEAPEST ORDER, AND WHAT COUNTS AS ONE (`cheapest`). A set of one to
 * three of the menu's own items, each with its photograph, at or over
 * `BENEFIT.creditMinUsd`, every item needed to get there (drop any and it
 * falls under), and never two drinks — one person's order, not a round. The
 * cheapest first; a place visited again takes its next cheapest, never the
 * same lead item twice, so no two visits are pictured alike. The lead is the
 * first item in menu order and is the one a dish-pictured month shows.
 *
 * THREE MONTHS FROM ONE SCHEDULE. `month` is the pitch's: every place, each
 * day the venue's own mark. `monthAt(id)` is one place's visits pictured by
 * the dish (§36). `monthAcross(id)` is every place again, on that place's
 * page (§40's "All of Blacksburg"), so the toggle and the main page tell the
 * same story. All three earn by `earn`'s rules and total by `monthOf`.
 *
 * Sam's cover at The Milk Parlor, line skips and drinks at The Burg or Olaika
 * are the intent, and the model has no price for any of them yet; when those
 * records land, each is one line in ORDERS. Italiano's carries no credit, so
 * it is not on the calendar.
 */

/** Monday first: the weekend closes each row, where the nights out fall. */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = (typeof DAYS)[number];

/** Where and when, and nothing else: each visit's order comes off the menu. */
const ORDERS: { week: number; day: Day; venueId: string }[] = [
  { week: 1, day: "Tue", venueId: "coffeeholicsva" },
  { week: 1, day: "Sat", venueId: "themilkparlor" },
  { week: 2, day: "Thu", venueId: "coffeeholicsva" },
  { week: 2, day: "Fri", venueId: "olaika" },
  { week: 2, day: "Sat", venueId: "themilkparlor" },
  { week: 3, day: "Mon", venueId: "coffeeholicsva" },
  { week: 3, day: "Fri", venueId: "theburg" },
  { week: 3, day: "Sat", venueId: "sweetopia" },
  { week: 4, day: "Wed", venueId: "coffeeholicsva" },
  { week: 4, day: "Fri", venueId: "olaika" },
  { week: 4, day: "Sat", venueId: "themilkparlor" },
];

const cents = (usd: number) => Math.round(usd * 100);
export const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;
/** Signed, with a real minus sign: "You saved" starts below zero. */
export const signedDollars = (c: number) => `${c < 0 ? "−" : ""}${dollars(Math.abs(c))}`;
/** The chip's short form: whole dollars drop their cents. */
const chip = (c: number) => `+$${c % 100 ? (c / 100).toFixed(2) : c / 100}`;

/** A section of the menu that is drinks, by its own label ("Espresso Drinks"). */
const DRINKS = /drink/i;

/**
 * A venue's `n` cheapest orders at or over the floor, as `cheapest` above
 * describes: by price, then fewer items, then menu order; a lead item used
 * once is not used again. Fewer than `n` if the menu runs out.
 */
function cheapest(venueId: string, n: number): MenuItem[][] {
  const floor = cents(BENEFIT.creditMinUsd);
  const menu = sectionsFor(venueId).flatMap((s) =>
    s.items.filter((i) => i.img).map((i) => ({ item: i, c: cents(i.price), drink: DRINKS.test(s.label) })),
  );
  const found: { at: number[]; c: number }[] = [];
  const consider = (at: number[]) => {
    const c = at.reduce((sum, k) => sum + menu[k].c, 0);
    if (c < floor || at.filter((k) => menu[k].drink).length > 1) return;
    if (at.length > 1 && c - Math.min(...at.map((k) => menu[k].c)) >= floor) return;
    found.push({ at, c });
  };
  for (let a = 0; a < menu.length; a++) {
    consider([a]);
    for (let b = a + 1; b < menu.length; b++) {
      consider([a, b]);
      for (let d = b + 1; d < menu.length; d++) consider([a, b, d]);
    }
  }
  const byMenu = (x: number[], y: number[]) => {
    const k = x.findIndex((v, i) => v !== y[i]);
    return k < 0 ? 0 : x[k] - y[k];
  };
  found.sort((x, y) => x.c - y.c || x.at.length - y.at.length || byMenu(x.at, y.at));
  const led = new Set<number>();
  const picks: MenuItem[][] = [];
  for (const o of found) {
    if (picks.length >= n) break;
    if (led.has(o.at[0])) continue;
    led.add(o.at[0]);
    picks.push(o.at.map((k) => menu[k].item));
  }
  return picks;
}

/** One benefit an order earned, and the points every order earns. */
interface Earned {
  benefit: "credit" | "percent" | "points";
  priceCents: number;
  creditCents: number;
  percentCents: number;
  points: number;
}

interface Placed extends Earned {
  id: string;
  /** 0-based row and column: week, then day of the week (Monday first). */
  week: number;
  day: number;
  venue: string;
  /** The items' own names from the menu, joined by " + ". */
  item: string;
  /** What the order brings back in money: its credit, or its 15%. */
  cents: number;
  /** `+$5`, `15%` or `pts` on the cell. */
  chip: string;
}

/** A cell showing the venue's own mark, `venue.logo`, seated as its collar. */
interface CollarOrder extends Placed {
  thumb?: undefined;
  img: string;
  brand: string;
  field: "light" | "dark";
}

/** A cell showing the lead item's own photograph. */
interface ThumbOrder extends Placed {
  thumb: string;
}

export type MonthOrder = CollarOrder | ThumbOrder;

export interface Month {
  head: string;
  sub: string;
  /** One letter a column, Monday first. */
  days: string[];
  weeks: string[];
  /** Chronological: by week, then by day. */
  orders: MonthOrder[];
  /** The membership's price for the month: what "You saved" is after. */
  planCents: number;
  /** "You spent": what the orders cost, after each lands, and in all. */
  runningSpent: number[];
  spentCents: number;
  /** "You saved": the credit and the 15% less the membership — before any
   *  order (the membership owed), after each, and at the end. */
  startCents: number;
  runningCents: number[];
  netCents: number;
  /** Every order's points, whole. */
  points: number;
}

/** An order in its day, off its venue's menu; nothing earned yet. */
interface Plan {
  week: number;
  day: number;
  venue: Venue;
  items: MenuItem[];
}

/** Every visit in ORDERS at a Plus place with a credit, each with its order:
 *  a place's k-th visit takes its k-th cheapest. One order a day. */
const plans: Plan[] = (() => {
  const visits = [...ORDERS]
    .map((o) => ({ ...o, d: DAYS.indexOf(o.day) }))
    .filter((o) => o.week >= 1 && o.week <= WEEKS_PER_MONTH && o.d >= 0)
    .sort((a, b) => a.week - b.week || a.d - b.d);
  const menus = new Map<string, MenuItem[][]>();
  const taken = new Set<string>();
  const out: Plan[] = [];
  for (const o of visits) {
    const venue = venues.find((v) => v.id === o.venueId);
    if (!venue?.plus || !venue.policies.some((p) => p.kind === "credit")) continue;
    if (!menus.has(venue.id))
      menus.set(venue.id, cheapest(venue.id, visits.filter((v) => v.venueId === venue.id).length));
    const at = out.filter((p) => p.venue.id === venue.id).length;
    const items = menus.get(venue.id)?.[at];
    const slot = `${o.week}:${o.d}`;
    if (!items || taken.has(slot)) continue;
    taken.add(slot);
    out.push({ week: o.week - 1, day: o.d, venue, items });
  }
  return out;
})();

/** One set of rules at every place, in the order things happen: the week's
 *  first order at or over the floor AT EACH PLACE is the credit; another at
 *  or over it, where the place gives 15%, is the 15% (never on alcohol); the
 *  rest is points. Every order earns points at 10 a dollar × the multiplier. */
function earn(list: Plan[]) {
  const floor = cents(BENEFIT.creditMinUsd);
  const pct = Math.round(BENEFIT.percentOff * 100);
  const credited = new Set<string>();
  return list.map((o) => {
    const has = (kind: string) => o.venue.policies.some((p) => p.kind === kind);
    const rate = o.venue.policies.find((p) => p.kind === "points")?.multiplier ?? 0;
    const priceCents = o.items.reduce((sum, i) => sum + cents(i.price), 0);
    const percentBase = o.items.reduce((sum, i) => sum + (i.alcohol ? 0 : cents(i.price)), 0);
    const points = Math.round((priceCents / 100) * BENEFIT.pointsPerDollar * rate);
    const slot = `${o.week}:${o.venue.id}`;
    let benefit: Earned["benefit"] = "points";
    if (priceCents >= floor && has("credit") && !credited.has(slot)) {
      credited.add(slot);
      benefit = "credit";
    } else if (priceCents >= floor && has("percent") && percentBase > 0) benefit = "percent";
    const creditCents = benefit === "credit" ? Math.min(cents(BENEFIT.creditUsd), priceCents) : 0;
    const percentCents = benefit === "percent" ? Math.round(percentBase * BENEFIT.percentOff) : 0;
    return {
      ...o,
      id: `${o.week}:${o.day}:${o.items.map((i) => i.id).join("+")}`,
      item: o.items.map((i) => i.name).join(" + "),
      benefit,
      priceCents,
      creditCents,
      percentCents,
      points,
      cents: creditCents + percentCents,
      chip: benefit === "credit" ? chip(creditCents) : benefit === "percent" ? `${pct}%` : "pts",
    };
  });
}
type EarnedPlan = ReturnType<typeof earn>[number];

/** What every cell carries, whatever it pictures. */
const placed = (o: EarnedPlan): Placed => ({
  id: o.id,
  week: o.week,
  day: o.day,
  venue: o.venue.name,
  item: o.item,
  benefit: o.benefit,
  priceCents: o.priceCents,
  creditCents: o.creditCents,
  percentCents: o.percentCents,
  points: o.points,
  cents: o.cents,
  chip: o.chip,
});
/** The venue's mark: the pitch's month and §40's. */
const collar = (o: EarnedPlan): CollarOrder => ({
  ...placed(o),
  img: o.venue.logo,
  brand: o.venue.brandColor,
  field: logoField(o.venue.id),
});
/** The lead item's photograph: a month at one place. */
const dish = (o: EarnedPlan): ThumbOrder => ({ ...placed(o), thumb: o.items[0].img as string });

/** The foot's figures, from earned orders; null when there is nothing to
 *  show or the money back does not cover the membership. */
function monthOf(orders: MonthOrder[], text: Pick<Month, "head" | "sub">): Month | null {
  const plan = cents(monthlyToday);
  const sums = (pick: (o: MonthOrder) => number) =>
    orders.reduce<number[]>((acc, o) => [...acc, (acc.length ? acc[acc.length - 1] : 0) + pick(o)], []);
  const runningSpent = sums((o) => o.priceCents);
  const runningCents = sums((o) => o.cents).map((c) => c - plan);
  const last = (xs: number[], none: number) => (xs.length ? xs[xs.length - 1] : none);
  const netCents = last(runningCents, -plan);
  if (!orders.length || netCents <= 0) return null;
  return {
    ...text,
    days: DAYS.map((d) => d[0]),
    weeks: Array.from({ length: WEEKS_PER_MONTH }, (_, k) => `Week ${k + 1}`),
    orders,
    planCents: plan,
    runningSpent,
    spentCents: last(runningSpent, 0),
    startCents: -plan,
    runningCents,
    netCents,
    points: orders.reduce((s, o) => s + o.points, 0),
  };
}

export const month: Month | null = monthOf(earn(plans).map(collar), {
  head: "Your first month on the membership",
  sub: `$${BENEFIT.creditUsd} credit at every place, every week`,
});

/**
 * A MONTH AT ONE PLACE (§36, §42): that place's visits, each pictured by its
 * lead item's own photograph. One order a week at Coffeeholics, each the
 * next cheapest to reach the floor, each earning the week's $5.
 */
export function monthAt(venueId: string): Month | null {
  const venue = venues.find((v) => v.id === venueId);
  const own = plans.filter((p) => p.venue.id === venueId);
  if (!venue || !own.length) return null;
  return monthOf(earn(own).map(dish), {
    head: `Your first month at ${venue.name}`,
    sub: `$${BENEFIT.creditUsd} credit once a week, points on every order`,
  });
}

/**
 * ACROSS BLACKSBURG (§40). Sam: "a toggle for 'all tapin plus' locations in
 * blacksburg so someone can see how much they would save across all of these
 * locations." The page's own visits and every other place's, by the same
 * rules: the pitch's month, on that place's page. Each cell is the venue's
 * mark: this month answers "where", not "what".
 */
export function monthAcross(venueId: string): Month | null {
  if (!plans.some((p) => p.venue.id === venueId)) return null;
  return monthOf(earn(plans).map(collar), {
    head: "Your first month across Blacksburg",
    sub: `$${BENEFIT.creditUsd} credit at every place, every week`,
  });
}
