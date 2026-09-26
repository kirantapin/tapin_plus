import { useEffect, useState } from "react";
import { blacksburgClock, tryable } from "./feedHours";

/**
 * ══ THE PRESALE'S SCHEDULE. INVENTED, AND THE SAME FOR EVERYONE (§67) ══════
 *
 * Nothing here is a real purchase. There is no orders table behind it; it is a
 * pure function of the clock and fixed seeds, so every visitor on every device
 * sees the same seats left and the same named purchases at the same times.
 *
 * Sam, 26 Sep 2026: "let's have the count for available memberships go down by
 * 5-10 seats every day, until we reach the 9-11 mark where it goes down 1-2 per
 * day, and it should actually go down … throughout the day we can have
 * notifications … to every user … '[name] purchased Tapin Plus X hours ago'
 * but the number actually depletes." The seat count (model/seats.ts) and the
 * notifications (shell/LiveFeed.tsx) both read this file, so a purchase card
 * and the count it took a seat from can never disagree.
 *
 * ⚠ IT STOPS AT ONE. Zero would flip every price on the site to the standard
 * rate (seats.ts `foundingOpen`), and the checkout's wallet amount does not
 * follow that flip. Closing the round stays a deliberate edit.
 */

/** 41 left at the start of 26 Sep 2026, Blacksburg time: what the site showed. */
const START_DAY = "2026-09-26";
const START_LEFT = 41;
const FLOOR = 1;
/** Purchases happen between 8am and 1am, Blacksburg time. */
const OPEN_H = 8;
const CLOSE_H = 25;

const HOUR = 3_600_000;

/** A seeded generator: FNV-1a over the seed, then mulberry32. */
const rng = (seed: string): (() => number) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

/** Where the 5–10 a day turns into 1–2 a day: fixed once, somewhere in 9–11. */
const TURN = int(rng("tapin-presale-turn"), 9, 11);

/** "YYYY-MM-DD" in Blacksburg at an instant. */
const dayOf = (ms: number): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
/** Blacksburg midnight at the start of a "YYYY-MM-DD", as epoch ms. */
const midnightOf = (day: string): number => {
  const [y, m, d] = day.split("-").map(Number);
  let t = Date.UTC(y, m - 1, d, 4);
  for (let i = 0; i < 4 && blacksburgClock(t).hour !== 0; i++) t -= blacksburgClock(t).hour * HOUR;
  return t;
};
const nextDay = (day: string): string => dayOf(midnightOf(day) + 30 * HOUR);

export const NAMES = [
  "Maya", "Jordan", "Ava", "Ethan", "Chloe", "Liam", "Priya", "Noah", "Sofia", "Caleb",
  "Emma", "Tyler", "Hannah", "Marcus", "Grace", "Elijah", "Zoe", "Andre", "Lily", "Owen",
  "Nia", "Ryan", "Isabella", "Jake", "Aisha", "Ben", "Olivia", "Mason", "Leah", "Diego",
] as const;

export interface Sale {
  id: string;
  /** Epoch ms it claims. */
  at: number;
  name: string;
}

/**
 * Every day's purchases from START_DAY to the day of `until`, in time order.
 * A day takes 5–10 while more than `TURN` are left at its start (stopping at
 * the turn, not past it), else 1–2, never past the floor; its times fall between 8am and 1am; its names are
 * new against the day before, so a day and a half of cards never repeats one.
 */
const days = new Map<string, Sale[]>();
export function salesThrough(until: number): Sale[] {
  const out: Sale[] = [];
  let left = START_LEFT;
  let prev = new Set<string>();
  const last = dayOf(until);
  for (let day = START_DAY; ; day = nextDay(day)) {
    let sales = days.get(day);
    if (!sales) {
      const r = rng(`tapin-presale-${day}`);
      /* A fast day stops at the turn rather than jumping past it. */
      const want = left > TURN ? Math.min(int(r, 5, 10), left - TURN) : int(r, 1, 2);
      const count = Math.max(0, Math.min(want, left - FLOOR));
      const start = midnightOf(day);
      const pool = NAMES.filter((n) => !prev.has(n));
      sales = Array.from({ length: count }, (_, k) => ({
        id: `${day}-${k}`,
        at: Math.round(start + (OPEN_H + r() * (CLOSE_H - OPEN_H)) * HOUR),
        name: pool.splice(Math.floor(r() * pool.length), 1)[0],
      })).sort((a, b) => a.at - b.at);
      days.set(day, sales);
    }
    out.push(...sales);
    left -= sales.length;
    prev = new Set(sales.map((s) => s.name));
    if (day >= last) break;
  }
  return out;
}

/** Seats left at an instant: the start less every purchase already made. */
export const seatsLeftAt = (now: number): number =>
  now < midnightOf(START_DAY)
    ? START_LEFT
    : Math.max(FLOOR, START_LEFT - salesThrough(now).filter((s) => s.at <= now).length);

/** The purchases already made, newest first, back to `sinceMs` ago. */
export const recentSales = (now: number, sinceMs: number): Sale[] =>
  salesThrough(now)
    .filter((s) => s.at <= now && now - s.at <= sinceMs)
    .sort((a, b) => b.at - a.at);

/**
 * Free tries, the same for everyone too: two to four a day at each place, at
 * moments inside its hours (feedHours.ts), back to `sinceMs` ago.
 */
export const recentTries = (now: number, places: readonly string[], sinceMs: number) => {
  const out: { id: string; at: number; venueId: string }[] = [];
  for (const day of [dayOf(now - 24 * HOUR), dayOf(now)]) {
    const start = midnightOf(day);
    places.forEach((venueId) => {
      const r = rng(`tapin-tries-${venueId}-${day}`);
      for (let k = 0, n = int(r, 2, 4), tries = 0; k < n && tries < 40; tries++) {
        const at = Math.round(start + r() * 26 * HOUR);
        if (!tryable(venueId, at)) continue;
        out.push({ id: `t:${venueId}:${day}:${k}`, at, venueId });
        k++;
      }
    });
  }
  return out.filter((t) => t.at <= now && now - t.at <= sinceMs).sort((a, b) => b.at - a.at);
};

/** Seats left now, re-read each minute so the count falls while a page is open. */
export function useSeatsLeft(): number {
  const [left, setLeft] = useState(() => seatsLeftAt(Date.now()));
  useEffect(() => {
    const id = window.setInterval(() => setLeft(seatsLeftAt(Date.now())), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return left;
}

/** "12 minutes ago", "4 hours ago", "Yesterday". */
export const agoText = (ms: number): string => {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} hour${h === 1 ? "" : "s"} ago` : "Yesterday";
};
