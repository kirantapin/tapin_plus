import { shortClock, spokenClock, useEndsAt, useWelcomeEnds, welcomeEndsDay } from "../model/deadline";
import { inviteFor, type Invite } from "../model/invite";
import { firstFigure, firstMonthLine, usePlusPrice, usePlusPriceLoad } from "../model/plus";
import { inviteExpected } from "../model/invite";
import { useState } from "react";

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
  /* Whose offer it is, always (Sam, 5 Nov 2026: "need to make sure people
     know this is a welcome week exclusive"); with a clock the short name
     beside the mark, and the strip under the headline says what it is. */
  const who = invite ? `${r ? invite.short : invite.who} exclusive${r ? "" : " · "}` : "";
  return (
    <aside className={`tpa-wbar${invite ? " tpa-wbar-invite" : ""}`} aria-label={label}>
      {invite ? <img className="tpa-wbar-logo" src={invite.logo} alt="" width="22" height="22" /> : <Clock />}
      <span aria-hidden="true">
        {who}
        {invite && r ? null : line}
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

/* ══ AN INVITATION'S CLOCK, IN THE OFFER (Sam, 5 Nov 2026) ════════════════════
   "a countdown until sunday": in the slot the spots bar holds on the
   ordinary page, the same shape: the bar drains from when the offer went out
   to when it ends, the words under it. Nothing once it has ended. */
export function InviteClock({ invite, className }: { invite: Invite; className?: string }) {
  const end = invite.ends ? Date.parse(invite.ends) : null;
  const r = useEndsAt(end);
  if (!r || end === null) return null;
  const span = end - Date.parse(invite.from);
  const left = span > 0 ? Math.max(0, Math.min(1, (end - Date.now()) / span)) : 0;
  return (
    <div
      className={`plus-seats tpa-invite-clock ${className ?? ""}`}
      role="timer"
      aria-label={`The free first month offer ends ${invite.endsLabel}, in ${spokenClock(r)}`}
    >
      <p className="plus-seats-line" aria-hidden="true">
        {/* "First month free" is right above it: the line says when the offer ends. */}
        <b>Offer ends {invite.endsLabel}</b>
        <span className="tnum">{shortClock(r)}</span>
      </p>
      <span className="plus-seats-bar" aria-hidden="true">
        <i style={{ transform: `scaleX(${left})` }} />
      </span>
    </div>
  );
}

/** What Join says (Sam, 5 Nov 2026: on the Welcome Week link "the CTA would
 *  be 'try plus for free'"): "Try Plus for free" while an invitation's free
 *  month is what joining gets, else "Join Tapin Plus". */
export function useJoinLabel(): string {
  const price = usePlusPrice();
  return inviteFor(price) && price?.first === 0 ? "Try Plus for free" : "Join Tapin Plus";
}

/** The pinned offer bar for a page other than home (Sam, 5 Nov 2026: "the
 *  countdown banner should still show on the member page"): the same bar
 *  home shows, a link's own or the welcome offer's clock. */
export function OfferBar() {
  const { price, failed } = usePlusPriceLoad();
  const [guess] = useState(inviteExpected);
  const invite = price ? inviteFor(price) : failed ? null : guess;
  const free = price ? price.first === 0 : !!guess && !failed;
  const linked = price ? !!price.linkId : !!guess && !failed;
  return linked ? (
    <LinkBar line={free ? (invite?.ends ? "Free first month offer" : "First month free") : firstMonthLine(price)} invite={invite} ends={price?.linkEnds ?? invite?.ends ?? null} />
  ) : (
    <WelcomeBar price={firstFigure(price)} />
  );
}
