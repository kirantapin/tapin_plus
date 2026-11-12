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

/* ══ THE LIVE BADGE, FIVE TAKES (?livev=1..5, Sam, 12 Nov 2026: "this
   'live' design needs to look different here I don't like the way it looks.
   Can you /impeccable redesign it and maybe find a better placement for it")
   ════════════════════════════════════════════════════════════════════════════
   1 · Line: no badge; the kind line under the name becomes "Live on Plus Fri
       20 Nov", in the money green, with the time left after it.
   2 · Calendar: a small calendar leaf in the photo's corner, NOV over 20,
       the time left under it.
   3 · Ribbon: a band across the foot of the photo, "Live on Plus Fri 20 Nov"
       and the time left at its right.
   4 · Soon: the photo held back (dimmed, a little grey) with the date set
       large in its middle, so the card reads as not open yet.
   5 · Chip: a solid white chip in the photo's corner, ink words and the time
       left in orange; no glass, no dot. */
export type LiveV = "1" | "2" | "3" | "4" | "5";
export const liveVersion = (): LiveV | null => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("livev");
  return v === "1" || v === "2" || v === "3" || v === "4" || v === "5" ? v : null;
};

/** The time left to the day, ticking. Null once it's live. */
export function useLiveLeft(): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now >= LIVE_ON ? null : left(LIVE_ON - now);
}

/** On the photo (takes 2 to 5). */
export function LiveOnPhoto({ v }: { v: LiveV }) {
  const t = useLiveLeft();
  if (!t || v === "1") return null;
  if (v === "2")
    return (
      <span className="lv lv-cal" aria-label={`Live on Plus Friday 20 November, in ${t}`}>
        <span className="lv-cal-leaf" aria-hidden="true">
          <i>Nov</i>
          <b>20</b>
        </span>
        <span className="lv-cal-left tnum" aria-hidden="true">
          {t}
        </span>
      </span>
    );
  if (v === "3")
    return (
      <span className="lv lv-ribbon">
        <span>Live on Plus Fri 20 Nov</span>
        <b className="tnum">{t}</b>
      </span>
    );
  if (v === "4")
    return (
      <span className="lv lv-soon">
        <small>Live on Plus</small>
        <b>Fri 20 Nov</b>
        <span className="tnum">in {t}</span>
      </span>
    );
  return (
    <span className="lv lv-chip">
      <span>Live Fri 20 Nov</span>
      <b className="tnum">{t}</b>
    </span>
  );
}

/** Under the name (take 1), in place of the kind of place. */
export function LiveLine() {
  const t = useLiveLeft();
  if (!t) return null;
  return (
    <small className="lv-line tnum">
      Live Fri 20 Nov <i>· {t}</i>
    </small>
  );
}

/* ══ THE POP-UP'S COUNTDOWN ROW (Sam, 12 Nov 2026: "need another way for
   the 'live fri 20' to show up differently here. Maybe a countdown bar? And
   it can be full width - might be able to look like the 10% off your order
   once a day thing") ═════════════════════════════════════════════════════════
   A row in the perks' own shape: a round mark (the calendar day), the date in
   ink with the time left under it, and a thin bar across the foot that fills
   as the day comes, from 12 November, the day it was announced. */
const ANNOUNCED = Date.parse("2026-11-12T00:00:00-05:00");
export function LiveRow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  if (now >= LIVE_ON) return null;
  const done = Math.min(1, Math.max(0, (now - ANNOUNCED) / (LIVE_ON - ANNOUNCED)));
  return (
    <div className="pp-liverow">
      <span className="pp-liverow-day" aria-hidden="true">
        <i>Nov</i>
        <b>20</b>
      </span>
      <span className="pp-liverow-words">
        <b>Live on Plus Fri 20 Nov</b>
        <span className="tnum">{left(LIVE_ON - now)} to go</span>
      </span>
      <span
        className="pp-liverow-bar"
        role="progressbar"
        aria-label="Time until it's live"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(done * 100)}
      >
        <i style={{ transform: `scaleX(${done})` }} />
      </span>
    </div>
  );
}
