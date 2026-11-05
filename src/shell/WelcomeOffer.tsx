import { shortClock, spokenClock, useEndsAt, useWelcomeEnds, welcomeEndsDay } from "../model/deadline";
import type { Invite } from "../model/invite";

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
    /* It's the offer that ends, not your first month (UX audit, 4 Nov 2026:
       "can be misread as 'your first month ends'"). An aside, so the bar is in
       a landmark. */
    <aside className="tpa-wbar" role="timer" aria-label={`${price} first month offer ends in ${spokenClock(r)}`}>
      <Clock />
      <span aria-hidden="true">
        {price} first month · offer ends in <span className="tnum">{shortClock(r)}</span>
      </span>
    </aside>
  );
}

/** One sentence for the close card and the walkthrough's last step. */
export function WelcomeEnds({ className }: { className?: string }) {
  const r = useWelcomeEnds();
  if (!r) return null;
  return <p className={className}>Welcome offer ends {welcomeEndsDay}.</p>;
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

/** A quiet line for a card: "Welcome offer ends November 30 · 27 days left".
 *  Days, not a ticking clock: the bar at the top already ticks. */
export function WelcomeDays() {
  const r = useWelcomeEnds();
  if (!r) return null;
  const left = r.days >= 1 ? `${r.days} ${r.days === 1 ? "day" : "days"} left` : "last day";
  return (
    <p className="tpa-wdays">
      <Clock />
      <span>
        Offer ends {welcomeEndsDay} · {left}
      </span>
    </p>
  );
}

/* ══ A PROMO LINK'S BAR (5 Nov 2026) ═══════════════════════════════════════════
   When a link's offer prices the first month (model/link.ts), the welcome
   offer's November 30 clock is someone else's deadline. The bar says the
   link's offer instead, with its audience's mark when it has one
   (model/invite.ts, Sam: "the welcome week logo somewhere, tied to the
   offer"), and counts down only if that offer has an end. */
export function LinkBar({ line, invite, ends }: { line: string; invite: Invite | null; ends: string | null }) {
  const r = useEndsAt(ends ? Date.parse(ends) : null);
  const label = `${invite ? `${invite.who} exclusive: ` : ""}${line}${r ? `, ends in ${spokenClock(r)}` : ""}`;
  return (
    <aside className={`tpa-wbar${invite ? " tpa-wbar-invite" : ""}`} aria-label={label}>
      {invite ? <img className="tpa-wbar-logo" src={invite.logo} alt="" width="22" height="22" /> : <Clock />}
      <span aria-hidden="true">
        {invite ? `${invite.who} exclusive · ` : ""}
        {line}
        {r ? (
          <>
            {" · ends in "}
            <span className="tnum">{shortClock(r)}</span>
          </>
        ) : null}
      </span>
    </aside>
  );
}
