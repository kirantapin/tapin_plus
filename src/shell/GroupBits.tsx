import { useEffect, useState } from "react";
import type { Group } from "../model/groups";
import { scheduleSeatsLeft } from "../model/seats";
import { shortClock, spokenClock, useEndsAt } from "../model/deadline";

/* ══ A GROUP'S OWN PIECES (Sam, 10 Nov 2026) ════════════════════════════════
   What a group landing page (model/groups.ts) says that the home page
   doesn't: the headline, and the group's exclusive price in the bar and the
   header. Everything else is the home page's, the founders section too.
   The headline was the distance ("about 1.5 miles from Smith's Landing",
   Sam's pick of three) until Sam asked for it to be about a more rewarding
   Blacksburg. */

/** The headline (Sam, 10 Nov 2026: "should be about making blacksburg
 *  more rewarding"), said to the group. */
export function GroupHeadline({ group }: { group: Group }) {
  return <h1 className="tpg-h1">{group.headline ?? `A more rewarding Blacksburg, for ${group.name}.`}</h1>;
}

/** The bar across the top while the group's own price applies: whose
 *  offer it is, then the price, in place of the students line. */
export function GroupBar({ group, line, short }: { group: Group; line: string; short: string }) {
  /* A sale with a real end says the time left (Welcome Week). */
  const left = useEndsAt(group.endsMs ?? null);
  const who = group.label ?? `${group.name} exclusive`;
  return (
    <aside
      className="tpa-wbar tpa-pbar tpg-bar"
      aria-label={`${who}: ${line}${left ? `, ${(group.endsLine ?? "Ends at midnight tonight").toLowerCase()}, ${spokenClock(left)} left` : ""}`}
    >
      <i className="tpa-pbar-dot" aria-hidden="true" />
      <span aria-hidden="true" className="tnum tpa-pbar-long">
        <b>{who}</b> · {line}
        {left ? <> · <span className="tpg-left">{shortClock(left)} left</span></> : null}
      </span>
      {/* One line on a phone, as the students line does; a sale keeps its
          clock and drops the name. */}
      <span aria-hidden="true" className="tnum tpa-pbar-short">
        {left ? (
          <>
            <b>{short}</b> · <span className="tpg-left">{shortClock(left)} left</span>
          </>
        ) : (
          <>
            <b>{group.name}</b> · {short}
          </>
        )}
      </span>
    </aside>
  );
}

/** Whether a group's sale has ended: one timer to its end, not a tick a
 *  second, so the page doesn't re-render every second (the clocks below
 *  tick on their own). */
export function useSaleEnded(group: Group | undefined): boolean {
  const end = group?.endsMs ?? null;
  const [ended, setEnded] = useState(() => end !== null && Date.now() >= end);
  useEffect(() => {
    if (end === null) return setEnded(false);
    const wait = end - Date.now();
    if (wait <= 0) return setEnded(true);
    setEnded(false);
    /* setTimeout holds at most ~24.8 days; a sale ends sooner. */
    const t = window.setTimeout(() => setEnded(true), Math.min(wait, 2_147_000_000));
    return () => window.clearTimeout(t);
  }, [end]);
  return ended;
}

/** "Ends at midnight · 8h 34m 12s left", ticking on its own, for the dock. */
export function GroupLeftLine({ group }: { group: Group }) {
  const left = useEndsAt(group.endsMs ?? null);
  if (!left) return null;
  return (
    <span className="tnum" aria-label={`${group.endsLine ?? "Ends at midnight tonight"}, ${spokenClock(left)} left`}>
      {group.endsShort ?? "Ends at midnight"} · <span className="tpg-left">{shortClock(left)} left</span>
    </span>
  );
}

/** "Ends at midnight tonight · 8h 34m 12s left" and a bar that drains from
 *  the sale's start to its end, in the offer card's spots shape (ov-spots).
 *  The end is real (model/groups.ts WELCOME_WEEK), so a clock is honest. */
export function GroupClock({ group, className = "ov-spots" }: { group: Group; className?: string }) {
  const left = useEndsAt(group.endsMs ?? null);
  if (!group.endsMs || !left) return null;
  const span = group.endsMs - (group.startMs ?? group.endsMs - 86_400_000);
  const ms = ((left.days * 24 + left.hours) * 60 + left.minutes) * 60_000 + left.seconds * 1000;
  return (
    <div className={`${className} tpg-clock`} data-ph-show="">
      <p className="tnum" aria-label={`${group.endsLine ?? "Ends at midnight tonight"}, ${spokenClock(left)} left`}>
        <b>{group.endsLine ?? "Ends at midnight tonight"}</b> · {shortClock(left)} left
      </p>
      <span aria-hidden="true">
        <i style={{ transform: `scaleX(${Math.max(0, Math.min(1, ms / span))})` }} />
      </span>
    </div>
  );
}

/** Once a sale is over: one line saying so, where its price was. */
export function GroupEnded({ group }: { group: Group }) {
  return (
    <p className="tpa-wline tpg-offer tpg-ended" data-ph-show="">
      <span>{group.endedLine ?? `The ${group.name} price ended at midnight.`}</span>
    </p>
  );
}

/** The group's spots left (model/seats.ts), checked once a minute so one
 *  can go while the page is open. */
export function useGroupSeats(group: Group | undefined): number {
  const seats = group?.seats ?? null;
  const [left, setLeft] = useState(() => (seats ? scheduleSeatsLeft(seats) : 0));
  useEffect(() => {
    if (!seats) return;
    const t = window.setInterval(() => setLeft(scheduleSeatsLeft(seats)), 60_000);
    return () => window.clearInterval(t);
  }, [seats]);
  return left;
}

/** "286 of 300 Smith's Landing spots left at $3.99/mo", one line and a thin
 *  bar, in the offer card's own spots shape (ov-spots): the residents' 300
 *  at their price (Sam, 10 Nov 2026), with no next price after it. */
export function GroupSpots({ group, left, first }: { group: Group; left: number; first: string }) {
  if (!group.seats) return null;
  return (
    <div className="ov-spots">
      <p className="tnum">
        <b>
          {left} of {group.seats.cap}
        </b>{" "}
        {group.name} spots left at {first}/mo
      </p>
      <span aria-hidden="true">
        <i style={{ transform: `scaleX(${left / group.seats.cap})` }} />
      </span>
    </div>
  );
}

/** How a group's price is said after its figure: "a month for your first
 *  full year" (Smith's Landing) or "a month for life" (Brexx), and the
 *  short forms for the bar and the dock. */
export const groupTerm = (group: Group) =>
  group.term === "forever"
    ? { long: "a month for life", short: "/mo for life" }
    : { long: "a month for your first full year", short: "/mo for a year" };

/** The exclusive price in the header, under the $25. */
export function GroupOffer({ group, first }: { group: Group; first: string }) {
  return (
    <>
    <p className={`tpa-wline tpg-offer${group.mark ? " tpg-offer-marked" : ""}`} data-ph-show="">
      {group.mark ? (
        /* The group's own mark in place of the tag (Welcome Week's, as the
           5 Nov invitation wore it). */
        <img className="tpg-offer-mark" src={group.mark.src} alt={group.mark.alt} width="28" height="28" decoding="async" />
      ) : (
        <svg className="tpg-offer-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3.5 12.6V5.2c0-.9.7-1.7 1.7-1.7h7.4c.5 0 .9.2 1.2.5l6.9 6.9c.7.7.7 1.7 0 2.4l-7.4 7.4c-.7.7-1.7.7-2.4 0L4 13.8c-.3-.3-.5-.8-.5-1.2Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
          <circle cx="8.2" cy="8.2" r="1.6" fill="currentColor" />
        </svg>
      )}
      <span className="tnum">
        <b>{group.label ?? "Resident exclusive"}</b> · {first} {groupTerm(group).long}
      </span>
    </p>
    {group.note ? <p className="tpa-wline tpg-note">{group.note}</p> : null}
    </>
  );
}
