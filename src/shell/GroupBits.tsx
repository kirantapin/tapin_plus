import { useEffect, useState } from "react";
import type { Group } from "../model/groups";
import { scheduleSeatsLeft } from "../model/seats";

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
  return <h1 className="tpg-h1">A more rewarding Blacksburg, for {group.name}.</h1>;
}

/** The bar across the top while the group's own price applies: whose
 *  offer it is, then the price, in place of the students line. */
export function GroupBar({ group, line, short }: { group: Group; line: string; short: string }) {
  return (
    <aside className="tpa-wbar tpa-pbar tpg-bar" aria-label={`${group.name} exclusive: ${line}`}>
      <i className="tpa-pbar-dot" aria-hidden="true" />
      <span aria-hidden="true" className="tnum tpa-pbar-long">
        <b>{group.name} exclusive</b> · {line}
      </span>
      {/* One line on a phone, as the students line does. */}
      <span aria-hidden="true" className="tnum tpa-pbar-short">
        <b>{group.name}</b> · {short}
      </span>
    </aside>
  );
}

/** The group's spots left (model/seats.ts), checked once a minute so one
 *  can go while the page is open. */
export function useGroupSeats(group: Group | undefined): number {
  const [left, setLeft] = useState(() => (group ? scheduleSeatsLeft(group.seats) : 0));
  useEffect(() => {
    if (!group) return;
    const t = window.setInterval(() => setLeft(scheduleSeatsLeft(group.seats)), 60_000);
    return () => window.clearInterval(t);
  }, [group]);
  return left;
}

/** "286 of 300 Smith's Landing spots left at $3.99/mo", one line and a thin
 *  bar, in the offer card's own spots shape (ov-spots): the residents' 300
 *  at their price (Sam, 10 Nov 2026), with no next price after it. */
export function GroupSpots({ group, left, first }: { group: Group; left: number; first: string }) {
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

/** The exclusive price in the header, under the $25. */
export function GroupOffer({ first }: { first: string }) {
  return (
    <p className="tpa-wline tpg-offer" data-ph-show="">
      <svg className="tpg-offer-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3.5 12.6V5.2c0-.9.7-1.7 1.7-1.7h7.4c.5 0 .9.2 1.2.5l6.9 6.9c.7.7.7 1.7 0 2.4l-7.4 7.4c-.7.7-1.7.7-2.4 0L4 13.8c-.3-.3-.5-.8-.5-1.2Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <circle cx="8.2" cy="8.2" r="1.6" fill="currentColor" />
      </svg>
      <span className="tnum">
        <b>Resident exclusive</b> · {first} a month for your first full year
      </span>
    </p>
  );
}
