import { BENEFIT, WEEKS_PER_MONTH } from "./savings";
import { logoField, monthlyToday, venues, type Venue } from "./content";
import { sectionsFor, type MenuItem } from "./menu";

/**
 * A MONTH ON THE MEMBERSHIP — the calendar on the pitch and on Coffeeholics
 * (docs/POLISH-2026-09-21.md §21, §36, §40, §42, §48). `monthFor(scope, budget)`
 * spends a monthly budget on real menu items, week by week, and earns by one
 * set of rules; every figure is arithmetic on `docs/data/menus.json`, in cents.
 */

/** Monday first: the weekend closes each row, where the nights out fall. */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
/** The days a week's orders take, in this order of use (§48): a week of n
 *  orders takes the first n, and its orders fill them Monday first. */
const SPREAD = ["Tue", "Thu", "Sat", "Mon", "Wed", "Fri", "Sun"].map((d) =>
  DAYS.indexOf(d as (typeof DAYS)[number]),
);
/** Across Blacksburg, the credits go round the places in this order (§48). */
const PLACES = ["coffeeholicsva", "theburg", "themilkparlor", "olaika", "sweetopia"];

const cents = (usd: number) => Math.round(usd * 100);
export const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;
/** Signed, with a real minus sign: "You saved" starts below zero. */
export const signedDollars = (c: number) => `${c < 0 ? "−" : ""}${dollars(Math.abs(c))}`;
/** The chip's short form: whole dollars drop their cents. */
const chip = (c: number) => `+$${c % 100 ? (c / 100).toFixed(2) : c / 100}`;

/** A section of the menu that is drinks, by its own label ("Espresso Drinks"). */
const DRINKS = /drink/i;

interface Basket {
  items: MenuItem[];
  c: number;
}

/**
 * A venue's orders at or over the credit floor, cheapest first: one to three
 * of its own photographed items, every one needed to reach the floor, never
 * two drinks, and each led by a different item so no two are pictured alike.
 */
function baskets(venueId: string): Basket[] {
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
  return found
    .filter((o) => !led.has(o.at[0]) && !!led.add(o.at[0]))
    .map((o) => ({ items: o.at.map((k) => menu[k].item), c: o.c }));
}

/** A venue's photographed items under the floor, one at a time, dearest first. */
function smalls(venueId: string): Basket[] {
  const floor = cents(BENEFIT.creditMinUsd);
  return sectionsFor(venueId)
    .flatMap((s) => s.items)
    .filter((i) => i.img && cents(i.price) < floor)
    .map((i) => ({ items: [i], c: cents(i.price) }))
    .sort((x, y) => y.c - x.c);
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
}

/** An order in its day, off its venue's menu; nothing earned yet. */
interface Plan {
  week: number;
  day: number;
  venue: Venue;
  items: MenuItem[];
}

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
/** The venue's mark: a month across places answers "where". */
const collar = (o: EarnedPlan): CollarOrder => ({
  ...placed(o),
  img: o.venue.logo,
  brand: o.venue.brandColor,
  field: logoField(o.venue.id),
});
/** The lead item's photograph: a month at one place answers "what". */
const dish = (o: EarnedPlan): ThumbOrder => ({ ...placed(o), thumb: o.items[0].img as string });

/** The running figures and the claim; "You saved" may end below zero (§48). */
function monthOf(orders: MonthOrder[], head: string, sub: string): Month | null {
  if (!orders.length) return null;
  const plan = cents(monthlyToday);
  const sums = (pick: (o: MonthOrder) => number) =>
    orders.reduce<number[]>((acc, o) => [...acc, (acc.length ? acc[acc.length - 1] : 0) + pick(o)], []);
  const runningSpent = sums((o) => o.priceCents);
  const runningCents = sums((o) => o.cents).map((c) => c - plan);
  return {
    head,
    sub,
    days: DAYS.map((d) => d[0]),
    weeks: Array.from({ length: WEEKS_PER_MONTH }, (_, k) => `Week ${k + 1}`),
    orders,
    planCents: plan,
    runningSpent,
    spentCents: runningSpent[runningSpent.length - 1],
    startCents: -plan,
    runningCents,
    netCents: runningCents[runningCents.length - 1],
  };
}

/** Each venue's menu lists, walked in turn: a place's next ≥$10 order is its
 *  cheapest not yet taken this month (round again once all are), and its
 *  next small item the dearest not yet taken that fits. */
function larder(ids: string[]) {
  const lists = new Map(ids.map((id) => [id, { big: baskets(id), small: smalls(id) }]));
  const used = new Map<string, Set<Basket>>();
  const take = (id: string, kind: "big" | "small", room: number): Basket | null => {
    const list = lists.get(id)?.[kind] ?? [];
    const seen = used.get(id) ?? new Set<Basket>();
    used.set(id, seen);
    if (list.length && list.every((b) => seen.has(b))) list.forEach((b) => seen.delete(b));
    const fits = list.filter((b) => b.c <= room);
    const pick = fits.find((b) => !seen.has(b)) ?? fits[0] ?? null;
    if (pick) seen.add(pick);
    return pick;
  };
  return { take, has: (id: string) => (lists.get(id)?.big.length ?? 0) > 0 };
}

const byId = (id: string) => venues.find((v) => v.id === id && v.plus && v.policies.some((p) => p.kind === "credit"));

/**
 * WHAT A MONTHLY BUDGET BUYS (§48). Each week spends a quarter of it plus what
 * earlier weeks left, greedily, one order a day. One place: the credit order,
 * then a 15% order and a small item in turn until nothing fits. "all": each
 * place's credit order in PLACES order (a place later each week), then 15%
 * orders, then small items. Cached.
 */
const built = new Map<string, Month | null>();
export function monthFor(scope: string, budgetCents: number): Month | null {
  const key = `${scope}:${budgetCents}`;
  if (built.has(key)) return built.get(key) ?? null;
  const all = scope === "all";
  const ids = (all ? PLACES : [scope]).filter((id) => byId(id));
  const shop = larder(ids);
  const plans: Plan[] = [];
  let room = 0;
  for (let wk = 0; wk < WEEKS_PER_MONTH; wk++) {
    room += Math.floor(budgetCents / WEEKS_PER_MONTH);
    const week: { id: string; b: Basket }[] = [];
    const add = (id: string, kind: "big" | "small") => {
      if (week.length >= SPREAD.length) return false;
      const b = shop.take(id, kind, room);
      if (!b) return false;
      week.push({ id, b });
      room -= b.c;
      return true;
    };
    /* Round the places until a whole round adds nothing. */
    const round = (places: string[], kind: "big" | "small") => {
      for (let k = 0, miss = 0; miss < places.length; k++) miss = add(places[k % places.length], kind) ? 0 : miss + 1;
    };
    const order = all ? ids.map((_, k) => ids[(k + wk) % ids.length]) : ids;
    const credited = order.filter((id) => shop.has(id) && add(id, "big"));
    if (all) {
      round(credited, "big");
      round(order, "small");
    } else if (ids.length) {
      const other = (k: "big" | "small") => (k === "big" ? "small" : "big");
      for (let want: "big" | "small" = "big"; ; ) {
        const got = add(ids[0], want) ? want : add(ids[0], other(want)) ? other(want) : null;
        if (!got) break;
        want = other(got);
      }
    }
    const days = SPREAD.slice(0, week.length).sort((a, b) => a - b);
    week.forEach(({ id, b }, k) => plans.push({ week: wk, day: days[k], venue: byId(id) as Venue, items: b.items }));
  }
  const venue = all ? null : byId(scope);
  const amount = `$${Math.round(budgetCents / 100)}`;
  const month = monthOf(
    all ? earn(plans).map(collar) : earn(plans).map(dish),
    `Spend ${amount} a month ${venue ? `at ${venue.name}` : "across Blacksburg"}`,
    all
      ? `$${BENEFIT.creditUsd} credit at every place, every week`
      : `$${BENEFIT.creditUsd} credit once a week, ${Math.round(BENEFIT.percentOff * 100)}% off the rest, points on all of it`,
  );
  built.set(key, month);
  return month;
}
