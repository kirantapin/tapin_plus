import { useEffect, useState } from "react";

/* ══ THE $5.99-FOR-LIFE DEADLINE (Sam, 28 Oct 2026) ═══════════════════════════
   "add a countdown … instead of showing the 1 out of 100 earlyish bird spots
   … the countdown is until October 31st. These are the last chances to get
   TapIn Plus at $5.99 before it goes up. Again, this is $5.99 for life."

   A REAL date, set by Sam, after which new members pay more. That is why a
   clock is allowed here when §10 forbade one for the invented seat count:
   this one counts down to something that happens. The end of 31 October,
   Blacksburg time (EDT, UTC−4 until 1 November). When it passes every
   countdown renders nothing; the price itself changes by Sam's hand. */
export const DEADLINE_MS = Date.UTC(2026, 10, 1, 4, 0, 0);
/** The date as the copy says it. */
export const deadlineDay = "October 31";

/** Dev only: `?deadline=<ISO>` moves the deadline, to see the last hours and
 *  the expired state. Never read in a production build. */
const deadlineAt = (): number => {
  if (!import.meta.env.DEV || typeof window === "undefined") return DEADLINE_MS;
  const raw = new URLSearchParams(window.location.search).get("deadline");
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(t) ? t : DEADLINE_MS;
};

export interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const split = (ms: number): Remaining => {
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, seconds: s % 60 };
};

/** Time left to the deadline, ticking each second; null once it has passed. */
export function useDeadline(): Remaining | null {
  const end = deadlineAt();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (now >= end) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [end, now >= end]); // eslint-disable-line react-hooks/exhaustive-deps
  return now >= end ? null : split(end - now);
}

const two = (n: number) => String(n).padStart(2, "0");
/** "2d 14h 05m 09s"; the days drop once there are none. */
export const shortClock = (r: Remaining): string =>
  `${r.days ? `${r.days}d ` : ""}${r.days ? two(r.hours) : r.hours}h ${two(r.minutes)}m ${two(r.seconds)}s`;
/** For a screen reader, to the minute: "2 days, 14 hours and 5 minutes". */
export const spokenClock = (r: Remaining): string => {
  const p = [
    r.days ? `${r.days} day${r.days === 1 ? "" : "s"}` : "",
    r.hours ? `${r.hours} hour${r.hours === 1 ? "" : "s"}` : "",
    `${r.minutes} minute${r.minutes === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return p.length > 1 ? `${p.slice(0, -1).join(", ")} and ${p[p.length - 1]}` : p[0];
};
