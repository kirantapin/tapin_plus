import { useSyncExternalStore } from "react";
import { seatsLeft } from "./seats";

/**
 * ══ THIS DROP IS INVENTED. NO SEAT IS TAKEN BY IT. ═════════════════════════
 *
 * The first time the checkout opens in a session, the count it prints falls by
 * two seats while the reader looks at it. Nobody took those seats. There is
 * no reservation, no write anywhere but this reader's own `sessionStorage`,
 * and nothing any other visitor can see: it is a display offset subtracted
 * from a number that was already invented (model/seats.ts, whose header says
 * so at length).
 *
 * Sam asked for it in those terms on 23 Sep 2026 — "when someone views either
 * of these checkouts, we should show the count go down 1 or 2 seats, and show
 * a 'someone just purchased' notification." His call, recorded here in the
 * register the seat counter and the feed (shell/LiveFeed.tsx) already use,
 * and recorded LOUDLY so that nobody reading this file in 2027 mistakes the
 * falling number for a sale or wires analytics to it.
 * docs/POLISH-2026-09-21.md §35.
 *
 * ══ WHAT IT DOES NOT TOUCH ═════════════════════════════════════════════════
 * `seatsLeft()`, `FOUNDING_OPEN` and every price are exactly what they were.
 * The round does not close sooner, the rate does not flip, and a reader who
 * reloads in a new tab sees the model's own count again. Only the number the
 * checkout prints moves, and only for this session.
 *
 * ══ ITS LIMITS, WHICH ARE THE POINT ════════════════════════════════════════
 * One drop a session, of two seats, on the first open only (§35.2, Sam: "it
 * should only be shown once though not twice"); a reopen prints the lowered
 * count and nothing moves. Never below 30 — a floor so the room can never be
 * emptied. If the model's own count is already under the floor, the offset
 * takes nothing and the count is the model's.
 */

/** One key: how many seats this session has "watched go", 0 to 2. */
const KEY = "tapin.seats.takenThisSession";
/** The most one session can take: its one drop, then nothing (§35.2). */
const MOST = 2;
/** The count the drop never takes the room below. */
const FLOOR = 30;
/** One integer at a time, this far apart. */
export const TICK_MS = 220;

/** How many seats this session has taken so far, 0 to 2. */
const takenThisSession = (): number => {
  try {
    const n = Number(sessionStorage.getItem(KEY) ?? 0);
    return Number.isInteger(n) ? Math.min(MOST, Math.max(0, n)) : 0;
  } catch {
    return 0;
  }
};
const store = (n: number): void => {
  try {
    sessionStorage.setItem(KEY, String(n));
  } catch {
    /* private mode: the drop lasts as long as this page does */
  }
};

/** The model's count less `taken`, held at the floor — or at the model's own
 *  count when that is already under it, so the floor can never raise it. */
const shownFor = (left: number, taken: number): number =>
  Math.max(Math.min(left, FLOOR), left - taken);

/* ══ THE PRINTED OFFSET TRAILS THE STORED ONE BY A TICK ═════════════════════
   `takeSeats` writes the session's whole drop at once, so a reload mid-count
   cannot lose it; what the sheet prints walks down to it one integer per
   tick. Loaded from storage on first read, so a reload starts where the
   session left off and a fresh session starts at the model's count. */
let printed: number | null = null;
let tick = 0;
const listeners = new Set<() => void>();
const current = (): number => (printed ??= takenThisSession());
const print = (n: number): void => {
  printed = n;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** The count the checkout prints. Every seat figure on the sheet reads this;
 *  the model's `seatsLeft()` is read nowhere else there. */
export function useSeatsShown(): number {
  return shownFor(seatsLeft(), useSyncExternalStore(subscribe, current, current));
}

/** What the next open takes: two on the session's first, none after. */
export const nextDrop = (): number => {
  const taken = takenThisSession();
  return taken === 0 ? 2 : 0;
};

/**
 * Take up to `n` seats from the printed count and return how many were taken
 * (0 when the cap or the floor leaves no room). The first integer goes at
 * once, the rest `stepMs` apart; `stepMs` 0 prints the whole drop in one step.
 */
export function takeSeats(n: number, stepMs: number = TICK_MS): number {
  const from = takenThisSession();
  const left = seatsLeft();
  const room = shownFor(left, from) - Math.min(left, FLOOR);
  const take = Math.max(0, Math.min(Math.round(n), MOST - from, room));
  if (take === 0) return 0;
  const to = from + take;
  store(to);
  window.clearTimeout(tick);
  if (stepMs <= 0) {
    print(to);
    return take;
  }
  const step = (at: number) => {
    print(at);
    if (at < to) tick = window.setTimeout(() => step(at + 1), stepMs);
  };
  step(from + 1);
  return take;
}
