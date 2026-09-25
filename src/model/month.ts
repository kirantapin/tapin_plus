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
  /** What "You saved" is made of (§56): the $5 credits and the 15%, each a
   *  running sum and a running count by order, and in all. */
  runningCredit: number[];
  runningCredits: number[];
  runningPercent: number[];
  runningPercents: number[];
  creditCents: number;
  credits: number;
  percentCents: number;
  percents: number;
}

/** An order in its day, off its venue's menu; nothing earned yet. */
interface Plan {
  week: number;
  day: number;
  venue: Venue;
  items: MenuItem[];
}

/** One set of rules at every place, in the order things happen: the week's
 *  first order at or over the floor AT EACH PLACE is the credit; any other
 *  order, where the place gives 15%, is the 15% (never on alcohol, and no
 *  floor: the policy has none, and the storefront's terms read "15% off or
 *  the week's $5 credit — one per order", §52); the rest is points. Every
 *  order earns points at 10 a dollar × the multiplier. */
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
    } else if (has("percent") && percentBase > 0) benefit = "percent";
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
  const runningCredit = sums((o) => o.creditCents);
  const runningCredits = sums((o) => (o.benefit === "credit" ? 1 : 0));
  const runningPercent = sums((o) => o.percentCents);
  const runningPercents = sums((o) => (o.benefit === "percent" ? 1 : 0));
  const end = (xs: number[]) => xs[xs.length - 1];
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
    runningCredit,
    runningCredits,
    runningPercent,
    runningPercents,
    creditCents: end(runningCredit),
    credits: end(runningCredits),
    percentCents: end(runningPercent),
    percents: end(runningPercents),
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
 * ACROSS BLACKSBURG, THE CREDITS COME FIRST (§58). Sam, 25 Sep 2026:
 * "prioritize and exhaust the $5 credit before we worry about points or
 * percent discounts … if I spend $50 around blacks burg a month, I'm going to
 * be redeeming 5 $5 credits … I'd prefer to argue the best case scenario."
 *
 * So the month takes as many credit orders as the amount buys, one a place a
 * week at that place's cheapest order that earns it, spread evenly over the
 * weeks. It may run up to `OVER` past the amount, which is what lets $50 buy
 * five. The places within $1 of the cheapest take turns leading each week so
 * the month shows more than one place. What is left goes on 15% orders.
 */
const OVER = 1.03;
function creditsFirst(ids: string[], budgetCents: number): Plan[] {
  const floor = cents(BENEFIT.creditMinUsd);
  /* Built once: `baskets` makes new objects each call, and a reorder is
     recognised by identity. */
  const menus = new Map(ids.map((id) => [id, baskets(id)]));
  const cheapest = (id: string) => menus.get(id)?.[0]?.c ?? Infinity;
  const byCheap = ids.filter((id) => cheapest(id) < Infinity).sort((a, b) => cheapest(a) - cheapest(b));
  if (!byCheap.length) return [];
  const tier = byCheap.filter((id) => cheapest(id) - cheapest(byCheap[0]) <= cents(1));
  const rest = byCheap.filter((id) => !tier.includes(id));
  const cap = budgetCents * OVER;
  /* A regular reorders: a place's credit order is a new one only while it
     costs within 50¢ of that place's cheapest, else the cheapest again. */
  const credit = (n: number) => {
    const shop = larder(ids);
    const had = new Map<string, Set<Basket>>();
    const order = (id: string) => {
      const list = menus.get(id) ?? [];
      const seen = had.get(id) ?? new Set<Basket>();
      had.set(id, seen);
      const b = list.find((x) => !seen.has(x) && x.c <= list[0].c + 50) ?? list[0];
      seen.add(b);
      return b;
    };
    let total = 0;
    const weeks = Array.from({ length: WEEKS_PER_MONTH }, (_, wk) => {
      const count = Math.floor(n / WEEKS_PER_MONTH) + (wk < n % WEEKS_PER_MONTH ? 1 : 0);
      const lead = tier.map((_, k) => tier[(k + wk) % tier.length]);
      return [...lead, ...rest].slice(0, count).map((id) => {
        const b = order(id);
        total += b.c;
        return { id, b };
      });
    });
    return { shop, weeks, total };
  };
  let n = Math.min(byCheap.length * WEEKS_PER_MONTH, Math.floor(cap / floor));
  let month = credit(n);
  while (n > 0 && month.total > cap) month = credit(--n);

  /* The rest, spread over the weeks, on 15% orders: a place's next order
     over $10 where one fits, else its dearest small item that does. */
  const { shop, weeks } = month;
  const spare = Math.max(0, budgetCents - month.total);
  let room = 0;
  const plans: Plan[] = [];
  weeks.forEach((week, wk) => {
    room += Math.floor(spare / WEEKS_PER_MONTH);
    const order = ids.map((_, k) => ids[(k + wk) % ids.length]);
    for (let k = 0, miss = 0; miss < order.length && week.length < SPREAD.length; k++) {
      const id = order[k % order.length];
      const b = shop.take(id, "big", room) ?? shop.take(id, "small", room);
      if (!b) {
        miss++;
        continue;
      }
      miss = 0;
      week.push({ id, b });
      room -= b.c;
    }
    const days = SPREAD.slice(0, week.length).sort((a, b) => a - b);
    week.forEach(({ id, b }, k) => plans.push({ week: wk, day: days[k], venue: byId(id) as Venue, items: b.items }));
  });
  return plans;
}

/**
 * WHAT A MONTHLY BUDGET BUYS (§48). "all" is `creditsFirst` (§58). One place:
 * each week spends a quarter of it plus what earlier weeks left, greedily,
 * one order a day: the credit order, then a 15% order and a small item in
 * turn until nothing fits. A week that cannot yet afford a credit order
 * saves instead of buying small items (the last week spends what is left),
 * so a small budget buys the credit it can reach — $25 is two $10 orders,
 * not six coffees and a loss. At one place, a week with more than $10 a
 * day left to spend orders over $10 rather than alternating. Cached.
 */
const built = new Map<string, Month | null>();
export function monthFor(scope: string, budgetCents: number): Month | null {
  const key = `${scope}:${budgetCents}`;
  if (built.has(key)) return built.get(key) ?? null;
  const all = scope === "all";
  const ids = (all ? PLACES : [scope]).filter((id) => byId(id));
  const shop = larder(ids);
  const plans: Plan[] = all ? creditsFirst(ids, budgetCents) : [];
  let room = 0;
  /* One place: week by week. */
  for (let wk = 0; wk < (all ? 0 : WEEKS_PER_MONTH); wk++) {
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
    const credited = ids.filter((id) => shop.has(id) && add(id, "big"));
    const last = wk === WEEKS_PER_MONTH - 1;
    if (!credited.length && !last) {
      /* Nothing reached the credit floor this week: carry the room forward. */
    } else if (ids.length) {
      const other = (k: "big" | "small") => (k === "big" ? "small" : "big");
      const floor = cents(BENEFIT.creditMinUsd);
      for (let want: "big" | "small" = "big"; ; ) {
        /* More a day than small items could spend: $300 at one café buys
           orders over $10, not $226 and a head that overstates it (§48.2). */
        const open = SPREAD.length - week.length;
        if (open && room / open >= floor) want = "big";
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
