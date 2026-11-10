import type { ReactNode } from "react";
import { CREDIT, PERCENT, PLACES } from "../routes/parents_kit";
import { Clock } from "./WelcomeOffer";
import { useWelcomeEnds, welcomeEndsDay } from "../model/deadline";
import { usePlusSeats } from "./PlusSeats";
import { PLUS_NEXT_PRICE, PLUS_SEAT_CAP } from "../model/seats";

/* ══ THE OFFER CARD, THREE NEW TAKES (Sam, 10 Nov 2026: "can we redesign
   this? Still don't love it") ════════════════════════════════════════════
   Preview only, on any build: ?offv=a, ?offv=b or ?offv=c. Without it the
   card is as it was. Each says the same true things (the $5 a month at each
   of the five spots, no minimum; then 15% off the other orders, once a day;
   $3.99 for the first month, then the monthly price), the November 30 end
   and the spots left, and leaves Join and Try to the card under it.

   A · Every month: what a month of Plus holds, as two rows, then the price.
   B · The stack: the five spots one by one, $5 each, adding up to $25, then
       what it costs against it.
   C · Pay / get: what you pay and what you get as two full rows, nothing
       said twice. */

export type OfferV = "a" | "b" | "c";
/** C · Pay / get is the card (Sam, 10 Nov 2026: "this is great, for both the
 *  moms and regular page"). ?offv=a or b still previews the others, and
 *  ?offv=0 the card as it was. */
export const offerVersion = (): OfferV | null => {
  if (typeof window === "undefined") return "c";
  const v = new URLSearchParams(window.location.search).get("offv");
  if (v === "0") return null;
  return v === "a" || v === "b" ? v : "c";
};

/** C's two rows, shared with /parents: what you pay, and what you (or they)
 *  get, with the 15% inside it. `foot` is what follows: the student page's
 *  Nov 30 end and spots, the parents page's holiday price. */
export function PayGet({ first, monthly, they = false, term = "first month" }: { first: string; monthly: string; they?: boolean; term?: string }) {
  const total = `$${PLACES.length * CREDIT}`;
  return (
    <>
      <div className="ov-c-row ov-c-pay">
        <span>You pay</span>
        <b className="tnum">{first}</b>
        <small className="tnum">
          {term}, then {monthly}
        </small>
      </div>
      <div className="ov-c-row ov-c-get">
        <span>{they ? "They get" : "You get"}</span>
        <b className="tnum">{total}</b>
        <small className="tnum">
          in credit every month, ${CREDIT} at each spot
        </small>
        <p className="ov-c-plus tnum">
          <Percent />
          Then {PERCENT}% off, every day
        </p>
      </div>
    </>
  );
}

/** "Offer ends November 30 · 20 days left"; nothing once it's over. */
function Ends() {
  const r = useWelcomeEnds();
  if (!r) return null;
  const left = r.days >= 1 ? `${r.days} ${r.days === 1 ? "day" : "days"} left` : "last day";
  return (
    <p className="ov-ends">
      <Clock />
      <span className="tnum">
        Offer ends {welcomeEndsDay} · {left}
      </span>
    </p>
  );
}

/** The spots left at the monthly price, one line and a thin bar. */
function Spots({ monthly }: { monthly: string }) {
  const left = usePlusSeats();
  return (
    <div className="ov-spots">
      <p className="tnum">
        <b>{left} spots left</b> at {monthly}, then {PLUS_NEXT_PRICE}
      </p>
      <span aria-hidden="true">
        <i style={{ transform: `scaleX(${left / PLUS_SEAT_CAP})` }} />
      </span>
    </div>
  );
}

const Percent = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 6 6 18M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Logos = ({ size = 28 }: { size?: number }) => (
  <span className="ov-logos" aria-hidden="true">
    {PLACES.map((p) => (
      <img key={p.id} src={p.logo} alt="" width={size} height={size} decoding="async" loading="lazy" />
    ))}
  </span>
);

export function OfferVersion({ v, first, monthly, term, spots }: { v: OfferV; first: string; monthly: string; term?: string; spots?: ReactNode }) {
  const total = `$${PLACES.length * CREDIT}`;
  if (v === "a") {
    return (
      <div className="ov ov-a" data-ph-show="">
        <h2 className="ov-h">Every month with Plus</h2>
        <ul className="ov-a-rows">
          <li>
            <Logos />
            <p>
              <b className="tnum">{total} in credit</b>
              <span className="tnum">
                ${CREDIT} at each of the {PLACES.length} spots, no minimum
              </span>
            </p>
          </li>
          <li>
            <span className="ov-a-ico">
              <Percent />
            </span>
            <p>
              <b className="tnum">Then {PERCENT}% off</b>
              <span>Your other orders there, once a day</span>
            </p>
          </li>
        </ul>
        <div className="ov-a-price">
          <b className="tnum">{first}</b>
          <p className="tnum">
            your first month
            <br />
            then {monthly} a month
          </p>
        </div>
        <Ends />
        <Spots monthly={monthly} />
      </div>
    );
  }
  if (v === "b") {
    return (
      <div className="ov ov-b" data-ph-show="">
        <h2 className="ov-h tnum">
          {total} in credit for {first}
        </h2>
        <ul className="ov-b-rows">
          {PLACES.map((p) => (
            <li key={p.id}>
              <img src={p.logo} alt="" width="32" height="32" decoding="async" loading="lazy" />
              <span>{p.name}</span>
              <b className="tnum">${CREDIT}</b>
            </li>
          ))}
          <li className="ov-b-total">
            <span>Every month, no minimum</span>
            <b className="tnum">{total}</b>
          </li>
        </ul>
        <p className="ov-b-then">
          <Percent />
          <span className="tnum">
            <b>Then {PERCENT}% off</b> your other orders, once a day
          </span>
        </p>
        <p className="ov-b-cost tnum">
          <b>{first}</b> your first month, then {monthly}
        </p>
        <Ends />
        <Spots monthly={monthly} />
      </div>
    );
  }
  return (
    <div className="ov ov-c" data-ph-show="">
      <PayGet first={first} monthly={monthly} term={term} />
      {/* A promo link's own price (a group's year at $3.99) has no end
          date: the November 30 clock is the welcome offer's. */}
      {term ? null : <Ends />}
      {/* A group's own spots (shell/GroupBits.tsx) in place of the $7.99
          ones, which lead to $14.99. */}
      {spots ?? <Spots monthly={monthly} />}
    </div>
  );
}
