import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Panel } from "../shell/Panel";
import { Drill } from "../shell/Drill";
import TapInCard from "../shell/TapInCard";
import VenueMosaic from "../shell/VenueMosaic";
import SiteFoot from "../shell/SiteFoot";
import AppliesTo from "../shell/AppliesTo";
import { readablePhone } from "../shell/PhoneStep";
import { useAuth } from "../context/auth_context";
import {
  PLANS,
  type PlanId,
  type Term,
  launchWindow,
  guarantee,
  GUARANTEE_CONTACT,
  lockedRateLines,
  founderSaving,
  reserveCta,
} from "../model/content";

/**
 * /in — your membership, after you have paid for it.
 *
 * Sam, 13 Sep 2026: "we'd need to build a post purchase page by the way so
 * someone can view their membership when they've purchased."
 *
 * ══ THE RESERVATION LIVES IN THIS BROWSER AND NOWHERE ELSE ═════════════════
 * There is no account, no session and no orders table in this project — the
 * charge creates a Stripe PaymentIntent and nothing writes the reservation down
 * on a server. `/reserve` stores `{id, plan, cents, at}` in localStorage and
 * that record is the only one that exists.
 *
 * THAT IS SAID ON THE PAGE RATHER THAN DESIGNED AROUND. A membership page that
 * silently depends on one browser's storage, and shows an empty state to the
 * same person on their laptop, is a page that looks broken to someone who has
 * just paid. So the limitation is stated in plain words and the recovery path
 * is a human being — the same address the refund runs through.
 *
 * THE REFERENCE BLOCK IS GONE (15 Sep 2026, Sam). It printed `seat.id` at full
 * size on the argument that it was the only proof of the charge outside
 * Stripe. That stopped being true when the checkout became a subscription: the
 * customer hangs off the Supabase user now, `subscription_status` answers for
 * them on any device, and the branch below catches the member whose browser
 * has no record. The id is still stored and still what the refer link is
 * derived from — it is just no longer something the member has to keep.
 *
 * PHONE SIGN-IN HAS LANDED, AND IT IS HALF OF WHAT THIS PAGE NEEDS. Every
 * reservation now carries the number it was bought with, so the record finally
 * names a person — which is what makes a launch text possible and what a
 * membership is handed to in Spring 2027.
 *
 * WHAT IT DOES NOT YET DO IS LOOK ANYTHING UP. There is no session and no
 * server, so this page still reads the local record; a member on a second
 * device still sees the empty state. Turning that into a lookup is one request
 * against whatever stores the reservations, keyed by the verified number, and
 * the shape of this page does not change when it arrives — only where `seat`
 * comes from.
 */

interface Reservation {
  id: string;
  plan: PlanId;
  cents: number;
  at: string;
  /* ══ WHAT SHE BOUGHT, NOT WHAT IT COSTS TODAY ═════════════════════════════
     Pre-deploy review, 14 Sep 2026: this page rendered today's PLANS, so from
     the 27 Sep flip every $4.99 founder would have read "$14.99 a month,
     locked", lost her saved row, and been shown a term saying the founding
     seats were gone. The six fields below are written by the checkout with the
     charge (Reserve.tsx) and read back here; the site's live prices never
     touch a receipt again. Older records without them fall back to what the
     cents paid imply. */
  founding: boolean;
  price: string;
  per: string;
  saving: { amount: string; after: string; per: string } | null;
  locked: string;
  terms: Term[];
  /** As she typed it at the sheet. Null for a reservation made before the
   *  name field existed, in which case the card keeps its placeholder. */
  name: string | null;
  /** E.164. Null for a reservation made before the phone step existed. */
  phone: string | null;
  phoneVerified: boolean;
  marketingOptIn: boolean;
}

const STORE_KEY = "tapin.blacksburg.reservation";

/** Read once, defensively: private mode throws, and a hand-edited value is a
 *  string we have no reason to trust into a render. */
function readReservation(): Reservation | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Reservation>;
    if (!parsed || typeof parsed.id !== "string") return null;
    const plan: PlanId =
      parsed.plan === "pass" ? "pass" : parsed.plan === "year" ? "year" : "monthly";
    const cents = typeof parsed.cents === "number" ? parsed.cents : 0;
    /* A record from before these fields existed can only have been written
       while the founding round was open, and the founding charges are the
       only amounts it could hold — so the cents paid are the proof. */
    const founding =
      parsed.founding === true ||
      (parsed.founding === undefined && [499, 699, 999, 1199, 1699, 1799, 2299, 2499, 4796, 5499, 6796, 7999].includes(cents));
    const isTerm = (t: unknown): t is Term =>
      !!t && typeof (t as Term).id === "string" && typeof (t as Term).term === "string";
    const s = parsed.saving;
    const savedShape =
      !!s && typeof s.amount === "string" && typeof s.after === "string" && typeof s.per === "string";
    return {
      id: parsed.id,
      plan,
      cents,
      at: typeof parsed.at === "string" ? parsed.at : "",
      founding,
      price: typeof parsed.price === "string" ? parsed.price : `$${(cents / 100).toFixed(2)}`,
      per: typeof parsed.per === "string" ? parsed.per : PLANS[plan].per,
      saving: savedShape ? s : founding ? founderSaving[plan] : null,
      locked:
        typeof parsed.locked === "string"
          ? parsed.locked
          : founding
            ? lockedRateLines.founding
            : lockedRateLines.standard,
      terms:
        Array.isArray(parsed.terms) && parsed.terms.every(isTerm) ? parsed.terms : PLANS[plan].terms,
      name:
        typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : null,
      phone: typeof parsed.phone === "string" ? parsed.phone : null,
      phoneVerified: parsed.phoneVerified === true,
      marketingOptIn: parsed.marketingOptIn === true,
    };
  } catch {
    return null;
  }
}

/* DEV seam: `/in?demo` renders a sample TEST reservation so the page can be
   inspected headless without walking the checkout. Nothing in production. */
function demoReservation(): Reservation | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  if (!new URLSearchParams(window.location.search).has("demo")) return null;
  return {
    id: "test_demo1",
    plan: "monthly",
    cents: 999,
    at: new Date().toISOString(),
    founding: true,
    price: PLANS.monthly.price,
    per: PLANS.monthly.per,
    saving: founderSaving.monthly,
    locked: lockedRateLines.founding,
    terms: PLANS.monthly.terms,
    name: "Sam",
    phone: "+15405550123",
    phoneVerified: false,
    marketingOptIn: false,
  };
}

const heldOn = (iso: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

export default function Membership() {
  /* Where the app window opens over, on a desktop (AppLayer). */
  const location = useLocation();
  /* Stripe's answer, for the reader whose record is on another device. */
  const { subscribed } = useAuth();
  /**
   * Read in an effect, not during render. This page is rendered on a server
   * nowhere today, but reading `window` in a component body is the kind of
   * thing that only breaks once — and the one-frame null is invisible because
   * the first paint is the band above the fold either way.
   */
  const [seat, setSeat] = useState<Reservation | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setSeat(demoReservation() ?? readReservation());
    setReady(true);
  }, []);

  const plan = seat ? PLANS[seat.plan] : null;

  return (
    <>
      <VenueMosaic compact>
        <Link className="how-back reserve-back" to="/" aria-label="Back to the pitch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="m14.5 5.5-7 6.5 7 6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        {/* The card is the subject of this page, which is the one surface where
            that is literally true — everywhere else it illustrates a membership
            being offered, and here it is one that has been bought. */}
        {/* THE CARD CARRIES HER NAME NOW. "Your name" was the placeholder for
            as long as nothing collected one; a reservation from before the
            field existed still gets it, rather than an empty line. */}
        <TapInCard
          /* The name on the reservation, else the signed-in one, else the
             placeholder — a record written before the field existed still
             gets a name now if we hold one. */
          name={seat?.name ?? undefined}
          /* The plan she bought, from her record — never the site's live
             default, which follows the flip. */
          plan={seat ? (seat.founding ? "Early Bird" : "Standard") : undefined}
          className="reserve-card"
        />
      </VenueMosaic>

      {/* ══ ONE WRAPPER, FOR THE DESKTOP GRID ══════════════════════════════
          `display:contents` below 1024px (reserve.css), so the phone keeps the
          identical column it shipped with. From 1024 the card's photo tile
          takes the left track and everything in here reads down the right —
          the same object-beside-its-details composition the checkout uses,
          because this page is that checkout's receipt. */}
      <div className="ms-body">
      {!ready ? null : seat && plan ? (
        <>
          <Panel className="ms-head">
            <p className="t-caption ms-state">
              {`Your ${seat.founding ? "Early Bird Special" : "seat"} is held`}
            </p>
            <h1 className="ms-title">
              Opening in Blacksburg, {launchWindow}
            </h1>
            <p className="t-compact ms-sub">
              Nothing more is charged until we open. Your membership then renews
              automatically until you cancel.
            </p>
          </Panel>

          <Panel label="What you hold">
            <ul className="ms-facts">
              <li>
                <b>{plan.label}</b>
                <span>
                  {seat.price} {seat.per}, locked
                </span>
              </li>
              {/* Only a founding member has a saving to be told about. A seat
                  bought at the standard rate shows the plan and the date and
                  says nothing about a discount it never had. From the record:
                  a founder's saving is hers whatever the site charges today. */}
              {seat.saving ? (
                <li>
                  <b>
                    {seat.saving.amount} saved {seat.saving.per}
                  </b>
                  <span>
                    Members joining later pay {seat.saving.after} {seat.per}
                  </span>
                </li>
              ) : null}
              {seat.at ? (
                <li>
                  <b>Held {heldOn(seat.at)}</b>
                  <span>Full refund any time before we open</span>
                </li>
              ) : null}
              {/* THE NUMBER IS THE ACCOUNT, so it belongs in what you hold
                  rather than in a settings screen that does not exist. Its
                  second line says what this number will be used for. The
                  seat texts — held, refunded, we're open — go to everyone,
                  because they are about the seat; only the offers line
                  depends on the box, because only that needed consent. The
                  earlier copy made "when we open" conditional on the tick,
                  which was wrong on both counts. */}
              {seat.phone ? (
                <li>
                  <b className="tnum">{readablePhone(seat.phone)}</b>
                  <span>
                    We&rsquo;ll text this number about your seat and when we open
                    {seat.marketingOptIn ? ", plus offers from TapIn places" : ""}
                    {seat.phoneVerified ? "" : " · not yet verified"}
                  </span>
                </li>
              ) : null}
            </ul>
            <p className="t-compact ms-locked">{seat.locked}</p>
          </Panel>

          <Panel label="What you get when we open">
            <AppliesTo />
            <p className="t-compact ms-note">
              15% off, a $5 weekly credit and points at the TapIn Plus places. The
              15% skips alcohol. Points land on everything.
            </p>
            <div className="ms-drill">
              <Drill summary="The full terms">
                <ol className="terms">
                  {/* The terms she agreed to, from the record — not today's. */}
                  {seat.terms.map((t) => (
                    <li key={t.id}>{t.term}</li>
                  ))}
                </ol>
              </Drill>
            </div>
          </Panel>

          <Panel className="closing">
            <p className="guarantee">{guarantee}</p>
            <p className="t-compact guarantee-contact">
              <a href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>
            </p>
          </Panel>

          <Link className="applink ms-see" to="/app" state={{ background: location }}>
            <b>See inside the app</b>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="applink-go">
              <path d="m10 7 5 5-5 5" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </>
      ) : subscribed ? (
        /* ══ PAID, BUT NOT ON THIS DEVICE ══════════════════════════════════
           Stripe says this person holds a subscription and `localStorage`
           does not — a second device, a cleared cache, a different browser.
           Before `subscription_status` existed this fell through to "no seat
           on this device", which told a paying member we had no idea who they
           were. WHAT IS MISSING HERE IS THE DETAIL, NOT THE FACT: the status
           endpoint answers a boolean, so there is no plan, price, date or
           reference to print. It says what is true and no more. */
        <>
          <Panel className="ms-head">
            <p className="t-caption ms-state">Your seat is held</p>
            <h1 className="ms-title">
              Opening in Blacksburg, {launchWindow}
            </h1>
            <p className="t-compact ms-sub">
              Nothing more is charged until we open. Your membership then renews
              automatically until you cancel.
            </p>
          </Panel>
          <Panel label="The details are on the device you reserved from">
            <p className="t-compact">
              Your plan, what you paid and your reference are saved in that
              browser. Open this page there to see them, or email{" "}
              <a href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>{" "}
              and we will send them to you.
            </p>
          </Panel>
        </>
      ) : (
        /* ══ NOT AN ERROR, AND IT MUST NOT LOOK LIKE ONE ═══════════════════
           The overwhelmingly likely reader here has not bought anything — /in
           is a route someone can simply type. The second, much rarer and much
           more upsetting reader HAS paid and is on a different device. One
           screen has to serve both without accusing either of anything, so it
           leads with the ordinary case and puts the recovery underneath.

           A member who is SIGNED IN no longer lands here at all — the branch
           above catches them from `subscription_status`. This is for the
           signed-out one, where the browser is still all we have. */
        <>
          <Panel className="ms-head">
            <h1 className="ms-title">No seat on this device</h1>
            <p className="t-compact ms-sub">
              Reservations are saved on the device they were made on for now.
            </p>
          </Panel>
          <Panel label="If you have reserved">
            <p className="t-compact">
              Open this page in the browser you reserved from, or email{" "}
              <a href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>{" "}
              with the reference from your receipt and we will find it.
            </p>
          </Panel>
          <div className="ms-cta">
            <Link className="action" to="/reserve">
              {reserveCta}
            </Link>
          </div>
        </>
      )}
      </div>
      <SiteFoot />
    </>
  );
}
