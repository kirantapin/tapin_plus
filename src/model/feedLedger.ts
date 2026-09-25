import { blacksburgClock, tryable } from "./feedHours";

/**
 * A SESSION'S RECENT ACTIVITY, INVENTED ONCE (docs/POLISH-2026-09-21.md §57).
 * Nothing here happened; shell/LiveFeed.tsx says so at its head.
 *
 * Sam, 25 Sep 2026: "it's fine to show them more frequently, if it's like
 * '[name] purchased Tapin plus 4 hours ago' but even still it just needs to
 * be more realistic." So the feed shows a history, not a stream: purchases
 * about one every 1.5 to 5 hours back over the last day, none between 2am and
 * 8am Blacksburg time, each a different first name; and one or two free tries
 * per place in the last 2.5 hours, inside its hours whenever they have been
 * open. Built once
 * a session and kept, so every card, page and reload tells the same story,
 * and each "ago" grows with the clock.
 */
export interface FeedEvent {
  id: string;
  kind: "joined" | "tried";
  /** Epoch ms the event claims. */
  at: number;
  name?: string;
  venueId?: string;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
/** How far back the history reaches, and how many purchases it holds at most. */
const SPAN = 30 * HOUR;
const MOST = 9;

export function buildLedger(
  now: number,
  names: readonly string[],
  tryPlaces: readonly string[],
  rand: () => number = Math.random,
): FeedEvent[] {
  const pick = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const pool = [...names];
  const events: FeedEvent[] = [];
  let at = now - pick(18, 75) * MIN;
  for (let k = 0; events.length < MOST && now - at < SPAN; k++) {
    const { hour } = blacksburgClock(at);
    /* Asleep: step back to the small hours of the night before. */
    if (hour >= 2 && hour < 8) {
      at -= (hour - 1) * HOUR + pick(0, 50) * MIN;
      continue;
    }
    const name = pool.splice(Math.floor(rand() * pool.length), 1)[0] ?? names[k % names.length];
    events.push({ id: `j${k}`, kind: "joined", at: Math.round(at), name });
    at -= pick(90, 300) * MIN;
  }
  /* One or two tries a place, drawn from the moments in the last 2.5 hours
     that fall inside its hours, so an open place always has some. */
  tryPlaces.forEach((venueId) => {
    const open: number[] = [];
    for (let m = 6; m <= 150; m += 3) if (tryable(venueId, now - m * MIN)) open.push(now - m * MIN);
    const count = open.length ? (rand() < 0.5 ? 2 : 1) : 0;
    for (let k = 0; k < count && open.length; k++) {
      const t = open.splice(Math.floor(rand() * open.length), 1)[0];
      /* A minute or two off the 3-minute step, unless that leaves the hours. */
      const off = t - pick(0, 2) * MIN;
      events.push({ id: `t:${venueId}:${k}`, kind: "tried", at: Math.round(tryable(venueId, off) ? off : t), venueId });
    }
  });
  return events.sort((a, b) => b.at - a.at);
}

/** "12 minutes ago", "4 hours ago", "Yesterday". */
export const agoText = (ms: number): string => {
  const m = Math.max(1, Math.round(ms / MIN));
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} hour${h === 1 ? "" : "s"} ago` : "Yesterday";
};
