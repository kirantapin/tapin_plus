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
export function PayGet({
  first,
  monthly,
  they = false,
  term = "first month",
  forever = false,
}: {
  first: string;
  monthly: string;
  they?: boolean;
  term?: string;
  /** A price for as long as you're a member (a group's, model/groups.ts):
   *  there is no "then". */
  forever?: boolean;
}) {
  const total = `$${PLACES.length * CREDIT}`;
  return (
    <>
      <div className="ov-c-row ov-c-pay">
        <span>You pay</span>
        <b className="tnum">{first}</b>
        <small className="tnum">{forever ? term : `${term}, then ${monthly}`}</small>
      </div>
      <div className="ov-c-row ov-c-get">
        <span>{they ? "They get" : "You get"}</span>
        <b className="tnum">{total}</b>
        <small className="tnum">
          to spend every month, ${CREDIT} at each spot
        </small>
        {/* Then the other two rungs (Sam, 10 Nov 2026: Get $5 · Earn $5 ·
            Save 15%). */}
        <ul className="ov-c-more tnum">
          <li>
            <Coin />
            Earn ${CREDIT} back every week on $10+
          </li>
          <li>
            <Percent />
            Save {PERCENT}% every day
          </li>
        </ul>
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

/* ══ LOCKED IN (Sam, 11 Nov 2026: "make it very apparent that as new spots
   join, which they are, the rate doesn't go up. So what they pay now is
   that they're locked in at") ═══════════════════════════════════════════════
   Its own band in the price card, straight under what you pay and get, so it
   reads as part of the price, not fine print. The FAQ says it in full. */
export function LockedIn({ monthly, they = false }: { monthly: string; they?: boolean }) {
  /* B · What's coming is the band (Sam, 11 Nov 2026: "actually this one
     instead please", after a turn on A); ?lockv=a / ?lockv=c preview the
     other two, ?lockv=0 the plain band. */
  const lv = lockVersion();
  if (lv !== "0") return <LockedInVersion v={lv} monthly={monthly} they={they} />;
  return (
    <div className="ov-lock">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="tnum">
        <b>
          {they ? "Their" : "Your"} {monthly} a month is locked in.
        </b>{" "}
        {/* Sam, 11 Nov 2026: "new blacksburg favorites are joining, when
            they do your price doesn't go up. Bars, gyms, clubs,
            barbershops, etc." */}
        New Blacksburg favorites are joining: bars, gyms, clubs, barbershops and more. When they do, {they ? "their" : "your"} price
        doesn’t go&nbsp;up.
      </p>
    </div>
  );
}

/* ══ LOCKED IN, THREE TAKES WITH THE KINDS OF PLACES JOINING (Sam, 11 Nov
   2026: "redesign 3 variations of this please, I think we need icons for the
   different types of spots joining") ═════════════════════════════════════
   Preview only: ?lockv=a|b|c; the band above stays until Sam picks. Each
   names the same four kinds Sam listed (bars, gyms, clubs, barbershops) and
   "more", each with its icon, and says the price doesn't go up.

   A · Chips: the promise first, then the four kinds as white chips, each
       with its icon, and the "when they do" line under.
   B · What's coming: the kinds lead, as icon tiles in a row with their
       names, then the lock and the price under a hairline.
   C · Same price: two rows, now and joining, the price beside each, so the
       eye sees $7.99 twice and the lock on the second. */
type LockV = "a" | "b" | "c";
const lockVersion = (): LockV | "0" => {
  if (typeof window === "undefined") return "b";
  const v = new URLSearchParams(window.location.search).get("lockv");
  return v === "a" || v === "c" || v === "0" ? v : "b";
};

const Ico = ({ d, children }: { d?: string; children?: ReactNode }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : null}
    {children}
  </svg>
);
const LockIco = () => (
  <Ico>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </Ico>
);
/** The four kinds Sam named, then more. */
const KINDS: Array<{ key: string; name: string; Icon: () => JSX.Element }> = [
  { key: "bars", name: "Bars", Icon: () => <Ico d="M5 5h14l-7 8zM12 13v6M8.5 19h7M8 8h8" /> },
  { key: "gyms", name: "Gyms", Icon: () => <Ico d="M6.5 7.5v9M17.5 7.5v9M4 10v4M20 10v4M6.5 12h11" /> },
  {
    key: "clubs",
    name: "Clubs",
    Icon: () => (
      <Ico d="M9 17.5V6.5l10-2v11">
        <circle cx="7" cy="17.5" r="2" />
        <circle cx="17" cy="15.5" r="2" />
      </Ico>
    ),
  },
  {
    key: "barbers",
    name: "Barbershops",
    Icon: () => (
      <Ico d="M8.2 7.6 20 16M8.2 16.4 20 8">
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
      </Ico>
    ),
  },
];
const MoreIco = () => <Ico d="M12 6v12M6 12h12" />;
const FoodIco = () => <Ico d="M5 9h11v4.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 13.5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M9 3.5v2.5M12 3.5v2.5" />;

function LockedInVersion({ v, monthly, they }: { v: LockV; monthly: string; they: boolean }) {
  const Your = they ? "Their" : "Your";
  const your = they ? "their" : "your";
  if (v === "a")
    return (
      <div className="ov-lk ov-lk-a">
        <p className="ov-lk-head tnum">
          <LockIco />
          <b>
            {Your} {monthly} a month is locked in.
          </b>
        </p>
        <p className="ov-lk-sub">New Blacksburg favorites are joining:</p>
        <ul className="ov-lk-chips">
          {KINDS.map(({ key, name, Icon }) => (
            <li key={key}>
              <Icon />
              {name}
            </li>
          ))}
          <li className="ov-lk-more">
            <MoreIco />
            More
          </li>
        </ul>
        <p className="ov-lk-sub">When they do, {your} price doesn’t go&nbsp;up.</p>
      </div>
    );
  if (v === "b")
    return (
      <div className="ov-lk ov-lk-b">
        <p className="ov-lk-title">New Blacksburg favorites are joining</p>
        <ul className="ov-lk-tiles">
          {KINDS.map(({ key, name, Icon }) => (
            <li key={key}>
              <span>
                <Icon />
              </span>
              {key === "barbers" ? "Barbers" : name}
            </li>
          ))}
          <li className="ov-lk-more">
            <span>
              <MoreIco />
            </span>
            More
          </li>
        </ul>
        {/* One sentence, no lock glyph (Sam, 11 Nov 2026, circling it:
            "still too crowded"). "However many places join" also drops the
            two different "they"s the parents' line had. */}
        <p className="ov-lk-foot tnum">
          <b>
            {Your} {monthly} a month is locked in,
          </b>{" "}
          however many places&nbsp;join.
        </p>
      </div>
    );
  return (
    <div className="ov-lk ov-lk-c">
      <ul className="ov-lk-rows tnum">
        <li>
          <span className="ov-lk-icons">
            <i>
              <FoodIco />
            </i>
          </span>
          <span className="ov-lk-what">
            <b>Now</b>
            Food and coffee spots
          </span>
          <b className="ov-lk-price">{monthly}</b>
        </li>
        <li>
          <span className="ov-lk-icons">
            {KINDS.map(({ key, Icon }) => (
              <i key={key}>
                <Icon />
              </i>
            ))}
          </span>
          <span className="ov-lk-what">
            <b>Joining</b>
            Bars, gyms, clubs, barbershops and&nbsp;more
          </span>
          <b className="ov-lk-price ov-lk-locked">
            <LockIco />
            {monthly}
          </b>
        </li>
      </ul>
      <p className="ov-lk-sub">{Your} price is locked in. It doesn’t go up as new places&nbsp;join.</p>
    </div>
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

const Coin = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M14.6 9.2c-.5-.8-1.5-1.2-2.6-1.2-1.5 0-2.6.8-2.6 1.9 0 2.6 5.4 1.4 5.4 4.1 0 1.1-1.2 2-2.8 2-1.2 0-2.2-.5-2.7-1.3M12 6.5v1.5m0 8v1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const Logos = ({ size = 28 }: { size?: number }) => (
  <span className="ov-logos" aria-hidden="true">
    {PLACES.map((p) => (
      <img key={p.id} src={p.logo} alt="" width={size} height={size} decoding="async" loading="lazy" />
    ))}
  </span>
);

export function OfferVersion({
  v,
  first,
  monthly,
  term,
  spots,
  noEnds = false,
  forever = false,
}: {
  v: OfferV;
  first: string;
  monthly: string;
  term?: string;
  spots?: ReactNode;
  /** A group's page: its offer is counted in spots, not to November 30. */
  noEnds?: boolean;
  /** A group's for-life price: it is the one locked in, with no "then". */
  forever?: boolean;
}) {
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
      <PayGet first={first} monthly={monthly} term={term} forever={forever} />
      <LockedIn monthly={forever ? first : monthly} />
      {/* A promo link's own price (a group's year at $3.99) has no end
          date: the November 30 clock is the welcome offer's. */}
      {term || noEnds ? null : <Ends />}
      {/* A group's own spots (shell/GroupBits.tsx) in place of the $7.99
          ones, which lead to $14.99. */}
      {spots ?? <Spots monthly={monthly} />}
    </div>
  );
}
