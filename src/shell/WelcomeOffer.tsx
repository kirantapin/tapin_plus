import { WELCOME_ENDS_MS, shortClock, spokenClock, useWelcomeEnds, welcomeEndsDay } from "../model/deadline";

/* ══ THE WELCOME OFFER'S CLOCK, THREE PLACES (Sam, 3 Nov 2026) ═════════════════
   model/deadline.ts holds the date. The bar pinned over the page, the four
   cells over the offer's price, and a line for the close and the walkthrough.
   Each one is its own small component so only it ticks, and each renders
   nothing once the offer has ended. */

const Clock = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="tpa-clock">
    <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
    <path d="M12 7.6V12l3 2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Pinned to the top of the page: "$3.99 first month ends in 27d 04h 12m 09s". */
export function WelcomeBar({ price }: { price: string }) {
  const r = useWelcomeEnds();
  if (!r) return null;
  return (
    <div className="tpa-wbar" role="timer" aria-label={`${price} first month ends in ${spokenClock(r)}`}>
      <Clock />
      <span aria-hidden="true">
        <b>{price} first month</b> ends in <span className="tnum">{shortClock(r)}</span>
      </span>
    </div>
  );
}

/** Over the offer's price: the date, then days, hours, minutes, seconds. */
export function WelcomeCells() {
  const r = useWelcomeEnds();
  if (!r) return null;
  const cells = [
    { n: r.days, label: r.days === 1 ? "day" : "days" },
    { n: r.hours, label: "hrs" },
    { n: r.minutes, label: "min" },
    { n: r.seconds, label: "sec" },
  ];
  return (
    <div className="tpa-wcells">
      <p className="tpa-wcells-h">Welcome offer ends {welcomeEndsDay}</p>
      <p className="tpa-wcells-row" role="timer" aria-label={`Ends in ${spokenClock(r)}`}>
        {cells.map((c) => (
          <span key={c.label} aria-hidden="true">
            <b className="tnum">{String(c.n).padStart(2, "0")}</b>
            <small>{c.label}</small>
          </span>
        ))}
      </p>
    </div>
  );
}

/** One sentence for the close card and the walkthrough's last step. */
export function WelcomeEnds({ className }: { className?: string }) {
  const r = useWelcomeEnds();
  if (!r) return null;
  return <p className={className}>Welcome offer ends {welcomeEndsDay}. Join before then.</p>;
}

/** One line in a pill: "Ends November 30 · 27d 07h 50m 11s". */
export function WelcomeChip() {
  const r = useWelcomeEnds();
  if (!r) return null;
  return (
    <p className="tpa-wchip" role="timer" aria-label={`Welcome offer ends in ${spokenClock(r)}`}>
      <Clock />
      <span aria-hidden="true">
        Ends {welcomeEndsDay} · <span className="tnum">{shortClock(r)}</span>
      </span>
    </p>
  );
}

/* The welcome offer runs through November: from the start of 1 November,
   Blacksburg time (EDT, UTC−4 until 2am that morning), to the end of the 30th. */
const NOVEMBER_STARTS_MS = Date.UTC(2026, 10, 1, 4, 0, 0);

/** November as a bar that empties toward the 30th, the days left beside it. */
export function WelcomeMonth() {
  const r = useWelcomeEnds();
  if (!r) return null;
  const total = WELCOME_ENDS_MS - NOVEMBER_STARTS_MS;
  const left = ((r.days * 24 + r.hours) * 60 + r.minutes) * 60_000 + r.seconds * 1000;
  const share = Math.max(0, Math.min(1, left / total));
  return (
    <div className="tpa-wmonth" role="timer" aria-label={`Welcome offer ends ${welcomeEndsDay}, in ${spokenClock(r)}`}>
      <p aria-hidden="true">
        <b>Offer ends {welcomeEndsDay}</b>
        <span className="tnum">{shortClock(r)}</span>
      </p>
      <span className="tpa-wmonth-bar" aria-hidden="true">
        <i style={{ transform: `scaleX(${share})` }} />
      </span>
    </div>
  );
}
