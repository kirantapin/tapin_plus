import { useEffect, useState } from "react";

/* ══ LIVE ON PLUS FRIDAY 20 NOVEMBER (Sam, 12 Nov 2026: "for italianos and
   crumbl cards, we should show 'live on plus' next Friday with a small
   countdown so it's clear. Same with Sweetopia") ══════════════════════════════
   Until midnight Eastern on Friday 20 November these three show a pill with
   the day and the time left ("Live Fri 20 Nov · 7d 4h"); from then on it
   goes and the card is an ordinary Plus or Lite card. One date for all three:
   if one moves, give LIVE_ON a date per place. */
export const LIVE_ON = Date.parse("2026-11-20T00:00:00-05:00");
const SOON = new Set(["crumbl", "italianospizza", "sweetopia"]);

/** Whether a place shows the countdown now. */
export const liveSoon = (id: string, now: number = Date.now()) => SOON.has(id) && now < LIVE_ON;

const left = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  return d >= 1 ? `${d}d ${h}h` : h >= 1 ? `${h}h ${min}m` : `${Math.max(1, min)}m`;
};

/** "Live Fri 20 Nov · 7d 4h", ticking each minute; nothing once it's live. */
export function LiveCountdown({ className }: { className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  if (now >= LIVE_ON) return null;
  return (
    <span className={className}>
      <span className="tpa-live-dot" aria-hidden="true" />
      <span>
        Live Fri 20 Nov <i className="tnum">· {left(LIVE_ON - now)}</i>
      </span>
    </span>
  );
}
