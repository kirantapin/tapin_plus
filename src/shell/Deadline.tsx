import { useDeadline, shortClock, spokenClock, deadlineDay } from "../model/deadline";
import { monthlyToday } from "../model/content";

/* ══ THE COUNTDOWN, THREE SIZES (Sam, 28 Oct 2026; model/deadline.ts) ══════════
   One clock, read by: the announcement bar on every page that sells (sticky,
   so it is always on screen), the checkout's order card from 1024, and the
   checkout's dock below it. Each renders nothing once the deadline passes. */

const price = `$${monthlyToday.toFixed(2)}`;

const Clock = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="ann-clock">
    <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
    <path d="M12 7.6V12l3 2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** The announcement bar's: "$5.99 for life ends in 2d 14h 05m 09s". */
export function DeadlineChip() {
  const r = useDeadline();
  if (!r) return null;
  return (
    <span className="ann-deadline" role="timer" aria-label={`${price} a month for life ends in ${spokenClock(r)}`}>
      <Clock />
      <span aria-hidden="true">
        <b>{price} for life</b> ends in <span className="tnum ann-deadline-n">{shortClock(r)}</span>
      </span>
    </span>
  );
}

const units = (r: NonNullable<ReturnType<typeof useDeadline>>) => [
  { n: r.days, label: r.days === 1 ? "day" : "days" },
  { n: r.hours, label: "hrs" },
  { n: r.minutes, label: "min" },
  { n: r.seconds, label: "sec" },
];

/** The checkout's order card, from 1024: the offer, four cells, the date. */
export function DeadlineBlock() {
  const r = useDeadline();
  if (!r) return null;
  return (
    <div className="rs-deadline">
      <p className="rs-deadline-head">Last chance at {price} a month, for life</p>
      <p className="rs-deadline-clock" role="timer" aria-label={`Ends in ${spokenClock(r)}`}>
        {units(r).map((u) => (
          <span key={u.label} aria-hidden="true">
            <b className="tnum">{String(u.n).padStart(2, "0")}</b>
            <small>{u.label}</small>
          </span>
        ))}
      </p>
      <p className="rs-deadline-foot">
        Join by {deadlineDay} and it never goes up while you stay a member.
      </p>
    </div>
  );
}

/** The checkout's dock, below 1024: one line over the button. */
export function DeadlineLine() {
  const r = useDeadline();
  if (!r) return null;
  return (
    <p className="rs-deadline-line" role="timer" aria-label={`${price} a month for life ends in ${spokenClock(r)}`}>
      <span aria-hidden="true">
        <b>{price} for life</b> ends in <span className="tnum">{shortClock(r)}</span>
      </span>
    </p>
  );
}
