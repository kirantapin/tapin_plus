import type { ReactNode } from "react";
import { GLYPHS, Glyph } from "../routes/parents_kit";
import { KINDS, LockIco, MoreIco } from "./OfferVersions";
import { usePlusSeats } from "./PlusSeats";
import { PLUS_NEXT_PRICE, PLUS_SEAT_CAP } from "../model/seats";

/* ══ THE LOWER HALF OF THE OFFER CARD, FIVE LAYOUTS (Sam, 11 Nov 2026: "We
   might have to do /impeccable redesign instead, it's all so clustered
   still. I guess you can expand the selection a bit. let's get 5 unique
   layout variations") ═════════════════════════════════════════════════════
   Preview only, on the students page: ?lowv=1|2|3|4|5. Without it the card
   is as shipped. Each holds the same true things, in a different shape:
   the kinds of place joining and the price that stays, the spots left at
   the price, Join and Try, and the three promises that sat under the card
   (points on everything, refund auto-approved if Plus saved you less than
   you paid, cancel anytime in the Tapin app).

   1 · Checklist: the spots as one line over Join, then four ticked lines.
   2 · Split: the price that stays beside the kinds joining, the spots,
       Join; the promises as one line under the card.
   3 · Count: the spots as the big number, Join, and the rest folded into
       one line that opens.
   4 · Spec sheet: one label-and-value table, then Join.
   5 · Bare card: only the spots and Join in the card; the price lock and
       the promises move under it, on the ground. */
export type LowV = "1" | "2" | "3" | "4" | "5";
export const lowerVersion = (): LowV | null => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("lowv");
  return v === "1" || v === "2" || v === "3" || v === "4" || v === "5" ? v : null;
};

const Tick = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5.5 12.5 4 4 9-9.5" />
  </svg>
);
const Chev = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7 10 5 5 5-5" />
  </svg>
);

const Bar = ({ left }: { left: number }) => (
  <span className="lw-bar" aria-hidden="true">
    <i style={{ transform: `scaleX(${left / PLUS_SEAT_CAP})` }} />
  </span>
);

const kindLabel = (key: string, name: string) => (key === "barbers" ? "Barbers" : name);

export function LowerVersion({ v, monthly, join, tryCta }: { v: LowV; monthly: string; join: ReactNode; tryCta: ReactNode }) {
  const left = usePlusSeats();

  if (v === "1")
    return (
      <div className="lw lw-1">
        <p className="lw-1-spots tnum">
          <span>
            <b>{left} spots left</b> at {monthly}, then {PLUS_NEXT_PRICE}
          </span>
          <Bar left={left} />
        </p>
        {join}
        {tryCta}
        <ul className="lw-checks tnum">
          <li>
            <Tick />
            <span>
              <b>{monthly} a month, locked in</b> as bars, gyms, clubs and barbers&nbsp;join
            </span>
          </li>
          <li>
            <Tick />
            <span>
              <b>Points</b> on everything
            </span>
          </li>
          <li>
            <Tick />
            <span>
              <b>Refund auto-approved</b> if Plus saved you less than you&nbsp;paid
            </span>
          </li>
          <li>
            <Tick />
            <span>
              <b>Cancel anytime</b> in the Tapin app
            </span>
          </li>
        </ul>
      </div>
    );

  if (v === "2")
    return (
      <div className="lw lw-2">
        <div className="lw-2-split">
          <div className="lw-2-lock tnum">
            <LockIco />
            <b>{monthly}</b>
            <span>a month, locked in as new places join</span>
          </div>
          <ul className="lw-2-kinds" aria-label="Joining">
            {KINDS.map(({ key, name, Icon }) => (
              <li key={key}>
                <Icon />
                {kindLabel(key, name)}
              </li>
            ))}
          </ul>
        </div>
        <div className="lw-2-spots tnum">
          <p>
            <b>{left} spots left</b> at {monthly}, then {PLUS_NEXT_PRICE}
          </p>
          <Bar left={left} />
        </div>
        {join}
        {tryCta}
      </div>
    );

  if (v === "3")
    return (
      <div className="lw lw-3">
        <div className="lw-3-count tnum">
          <b>{left}</b>
          <p>
            <span>spots left at {monthly}</span>
            <small>of {PLUS_SEAT_CAP}, then {PLUS_NEXT_PRICE}</small>
          </p>
        </div>
        <Bar left={left} />
        {join}
        {tryCta}
        <details className="lw-3-more">
          <summary>
            <span>Price lock, refunds and cancelling</span>
            <Chev />
          </summary>
          <ul className="tnum">
            <li>
              <b>{monthly} a month, locked in.</b> New bars, gyms, clubs and barbers are joining, and your price doesn’t go&nbsp;up.
            </li>
            <li>
              <b>Refund auto-approved</b> if Plus saved you less than you&nbsp;paid.
            </li>
            <li>
              <b>Cancel anytime</b> in the Tapin app.
            </li>
            <li>
              <b>Points</b> on everything.
            </li>
          </ul>
        </details>
      </div>
    );

  if (v === "4")
    return (
      <div className="lw lw-4">
        <dl className="lw-4-table tnum">
          <div>
            <dt>Your price</dt>
            <dd>
              <b>{monthly}/mo, locked in</b>
            </dd>
          </div>
          <div>
            <dt>Joining next</dt>
            <dd className="lw-4-kinds" aria-label="Bars, gyms, clubs, barbers and more">
              {KINDS.map(({ key, Icon }) => (
                <i key={key}>
                  <Icon />
                </i>
              ))}
              <i className="lw-4-more">
                <MoreIco />
              </i>
            </dd>
          </div>
          <div>
            <dt>Spots left</dt>
            <dd>
              <b>
                {left} of {PLUS_SEAT_CAP}
              </b>
              , then {PLUS_NEXT_PRICE}
            </dd>
          </div>
          <div>
            <dt>If you don’t save</dt>
            <dd>Refund auto-approved</dd>
          </div>
          <div>
            <dt>Cancel</dt>
            <dd>Anytime, in the app</dd>
          </div>
          <div>
            <dt>Points</dt>
            <dd>On everything</dd>
          </div>
        </dl>
        {join}
        {tryCta}
      </div>
    );

  return (
    <div className="lw lw-5">
      <p className="lw-5-spots tnum">
        <b>{left} spots left</b> at {monthly}
      </p>
      <Bar left={left} />
      {join}
      {tryCta}
    </div>
  );
}

/** What sits under the card for the versions that move things out of it. */
export function LowerAfter({ v, monthly }: { v: LowV; monthly: string }) {
  if (v === "2")
    return (
      <p className="lw-2-after">
        <span>
          <b>Points</b> on everything
        </span>
        <span>
          <b>Refund auto-approved</b> if you don’t save
        </span>
        <span>
          <b>Cancel anytime</b> in the app
        </span>
      </p>
    );
  if (v === "5")
    return (
      <div className="lw-5-after tnum">
        <div className="lw-5-lock">
          <p>
            <b>{monthly} a month, locked in.</b> New Blacksburg favorites are joining, and your price doesn’t go&nbsp;up.
          </p>
          <ul aria-label="Joining">
            {KINDS.map(({ key, name, Icon }) => (
              <li key={key}>
                <Icon />
                {kindLabel(key, name)}
              </li>
            ))}
          </ul>
        </div>
        <ul className="lw-5-list">
          <li>
            <Glyph d={GLYPHS.star} />
            <span>
              <b>Points</b> on everything
            </span>
          </li>
          <li>
            <Glyph d={GLYPHS.refund} />
            <span>
              <b>Refund auto-approved</b> if Plus saved you less than you paid
            </span>
          </li>
          <li>
            <Glyph d={GLYPHS.phone} />
            <span>
              <b>Cancel anytime</b> in the Tapin app
            </span>
          </li>
        </ul>
      </div>
    );
  return null;
}
