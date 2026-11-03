import { shortClock, spokenClock, useWelcomeEnds, welcomeEndsDay } from "../model/deadline";

/* ══ THE WELCOME OFFER'S CLOCK, THREE PLACES (Sam, 3 Nov 2026) ═════════════════
   model/deadline.ts holds the date. The bar pinned over the page, a pill in
   the offer, and a line for the close and the walkthrough.
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
        {price} first month ends in <span className="tnum">{shortClock(r)}</span>
      </span>
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
