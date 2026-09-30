import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Drill } from "../shell/Drill";
import TapInCard from "../shell/TapInCard";
import VenueMosaic from "../shell/VenueMosaic";
import SiteFoot from "../shell/SiteFoot";
import IncludedPanel from "../shell/IncludedPanel";
import Timeline, { type Stop } from "../shell/Timeline";
import { readablePhone } from "../shell/PhoneStep";
import TrialModal from "../shell/TrialModal";
import { useMedia } from "../shell/useMedia";
import { useAuth } from "../context/auth_context";
import {
  PLANS,
  type PlanId,
  type Term,
  launchWindow,
  GUARANTEE_CONTACT,
  lockedRateLines,
  founderSaving,
  foundingTierName,
  reserveCta,
} from "../model/content";

/**
 * /in — your membership, after you have paid for it.
 *
 * Sam, 13 Sep 2026: "we'd need to build a post purchase page by the way so
 * someone can view their membership when they've purchased."
 *
 * ══ THE RESERVATION LIVES IN THIS BROWSER AND NOWHERE ELSE ═════════════════
 * The checkout stores `{id, plan, cents, at, …}` in localStorage and nothing
 * writes it to a server, so this page reads that record. THAT IS SAID ON THE
 * PAGE RATHER THAN DESIGNED AROUND: a member on another device is told so in
 * plain words, and the recovery path is a human — the refund's own address.
 * `subscription_status` answers WHETHER someone paid on any device; only the
 * local record says what they hold. When a server lookup keyed by the verified
 * number arrives, only where `seat` comes from changes.
 *
 * ══ THE CHECKOUT'S LANGUAGE (Sam, 25 Sep 2026: "can you bring the membership
 * page up to date?") ═══════════════════════════════════════════════════════════
 * The band stays in the dark world; everything under it is the checkout's
 * light sheet: white cards, the order card's timeline, the included panel.
 */

interface Reservation {
  id: string;
  plan: PlanId;
  cents: number;
  at: string;
  /* ══ WHAT SHE BOUGHT, NOT WHAT IT COSTS TODAY ═════════════════════════════
     Pre-deploy review, 14 Sep 2026: this page rendered today's PLANS, so from
     the flip every founder would have read the standard rate, lost her saved
     row, and been shown a term saying the founding seats were gone. The
     fields below are written by the checkout with the charge
     (ReserveLayer.tsx) and read back here; the site's live prices never touch
     a receipt again. Older records fall back to what the cents paid imply. */
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
      parsed.plan === "pass"
        ? "pass"
        : parsed.plan === "year"
          ? "year"
          : "monthly";
    const cents = typeof parsed.cents === "number" ? parsed.cents : 0;
    /* A record from before these fields existed can only have been written
       while the founding round was open, and the founding charges are the
       only amounts it could hold — so the cents paid are the proof. */
    const founding =
      parsed.founding === true ||
      (parsed.founding === undefined &&
        [
          499, 599, 699, 999, 1199, 1699, 1799, 2299, 2499, 4796, 5499, 6796, 7999,
        ].includes(cents));
    const isTerm = (t: unknown): t is Term =>
      !!t &&
      typeof (t as Term).id === "string" &&
      typeof (t as Term).term === "string";
    const s = parsed.saving;
    const savedShape =
      !!s &&
      typeof s.amount === "string" &&
      typeof s.after === "string" &&
      typeof s.per === "string";
    return {
      id: parsed.id,
      plan,
      cents,
      at: typeof parsed.at === "string" ? parsed.at : "",
      founding,
      price:
        typeof parsed.price === "string"
          ? parsed.price
          : `$${(cents / 100).toFixed(2)}`,
      per: typeof parsed.per === "string" ? parsed.per : PLANS[plan].per,
      saving: savedShape ? s : founding ? founderSaving[plan] : null,
      locked:
        typeof parsed.locked === "string"
          ? parsed.locked
          : founding
            ? lockedRateLines.founding
            : lockedRateLines.standard,
      terms:
        Array.isArray(parsed.terms) && parsed.terms.every(isTerm)
          ? parsed.terms
          : PLANS[plan].terms,
      name:
        typeof parsed.name === "string" && parsed.name.trim()
          ? parsed.name.trim()
          : null,
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

/* FOR LIFE, FOR EVERY FOUNDER (§64; Sam, 25 Sep 2026: "we can just update the
   terms to for life … it's a better benefit anyways"). A founding record from
   before §63 says its rate is locked for its first year; it now reads as the
   promise every founder has, in the record's own figures. Nothing else moves. */
const LIFETIME = "never goes up, for as long as you stay a member.";
const forLife = (t: Term): Term => {
  if (t.id !== "rate") return t;
  const firstYear = /^(.+?) is locked for your first year\./;
  const wholeYear = /^(\$[\d,.]+) is your whole first year\./;
  if (firstYear.test(t.term)) return { ...t, term: t.term.replace(firstYear, (_, price) => `${price} ${LIFETIME}`) };
  if (wholeYear.test(t.term)) return { ...t, term: t.term.replace(wholeYear, (_, price) => `${price} a year ${LIFETIME}`) };
  return t;
};

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

/* ══ WHAT HAPPENS NEXT, FROM HER RECORD ONLY ═════════════════════════════════
   The checkout's schedule, rebuilt from the fields she bought under: when she
   held the seat and what she paid, the opening at her rate, and her lock. The
   saving rides on "Always", because that is what the lock is worth.

   THE PAYMENT WAS HER FIRST PERIOD, NOT A HOLD FEE (Sam's 14 Sep ruling, in
   content.ts subscribise): both clauses say so, in the checkout's words, with
   the plan's own period ("month", "3 months", "year"). */
function nextStops(r: Reservation, tier: string | null): Stop[] {
  const held = heldOn(r.at);
  const period = PLANS[r.plan].period;
  /* ReserveLayer writes the monthly lock line into every record, so a pass
     reads "$5.99 a month"; a line naming a figure she did not pay is rebuilt
     from her own price, in lockedRateFor's sentence. */
  const lockIsHers = !/\$\d/.test(r.locked) || r.locked.includes(`${r.price} ${r.per}`);
  const locked = lockIsHers
    ? r.locked
    : `Your ${tier ? `${tier} ` : ""}rate never goes up: ${r.price} ${r.per} from the day we open, for as long as you stay a member.`;
  return [
    ...(held
      ? [{ id: "held", when: held, figure: r.price, clause: `Your first ${period}, and it holds your seat until we open` }]
      : []),
    {
      id: "opens",
      when: launchWindow,
      figure: `${r.price} ${r.per}`,
      clause: `Then automatically, your first ${period} already paid`,
    },
    {
      id: "always",
      when: "Always",
      figure: r.saving ? `${r.saving.amount} saved ${r.saving.per}` : undefined,
      clause: r.saving
        ? `${locked} Members joining later pay ${r.saving.after} ${r.saving.per}.`
        : locked,
    },
  ];
}

/* The refund promise only while her own terms still carry the refund term. */
const cancelLine = (r: Reservation): string =>
  r.terms.some((t) => t.id === "refund")
    ? "Cancel any time, with a full refund before we open, no reason needed."
    : "Cancel any time, no reason needed.";

export default function Membership() {
  const location = useLocation();
  /* Stripe's answer, for the reader whose record is on another device. */
  const { userSession, subscribed, displayName, logout } = useAuth();
  const [trial, setTrial] = useState(false);
  /* From 1024 the join sits on the light page, not the dark band (§65). */
  const desk = useMedia("(min-width: 1024px)");
  const navigate = useNavigate();
  /* Read in an effect, not during render: reading `window` in a component
     body only breaks once, and the one-frame null is invisible. */
  const [seat, setSeat] = useState<Reservation | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setSeat(demoReservation() ?? readReservation());
    setReady(true);
  }, []);

  /* The round she bought in, from her record: a founding seat at the live
     tier's price FOR HER PLAN is an Early-ish Bird; any other founding price
     predates it. */
  const tier = seat?.founding
    ? seat.price === founderSaving[seat.plan].now
      ? foundingTierName
      : "Early Bird"
    : null;

  /* ══ NOT A MEMBER? SHOW LESS, DO NOT BOUNCE ═══════════════════════════════
     Kiran, 15 Sep 2026: "I don't know if we should navigate away — let's keep
     the existing display except we don't show the what you hold section."
     The only part that asserts a purchase — the schedule and the number it
     was bought with — is withheld from a non-member, and a way in is offered.

     BOTH FLAGS ARE THREE-STATE AND NEITHER MAY BE READ EARLY. `userSession` is
     `undefined` until the first auth event lands, `subscribed` is `null` until
     the status call returns; treating either as "no" would flash the join
     button at a member reloading their own page. So the join CTA appears only
     once both have answered. The dev seam (`/in?demo`) stands in for a
     member, or the page could not be inspected without a real purchase. */
  const authKnown = userSession !== undefined;
  const statusKnown = !userSession || subscribed !== null;
  const memberKnown = authKnown && statusKnown;
  const isMember = subscribed === true;
  const demo =
    seat !== null &&
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("demo");
  const showHoldings = isMember || demo;
  const showJoin = memberKnown && !isMember && !demo;

  return (
    <>
      {/* ══ ONE STICKY LEFT TRACK ══════════════════════════════════════════
          The band and the join CTA travel together on a desktop: the wrapper
          is what sticks, so the CTA holds still with the card without sitting
          on the photography. `display:contents` below 1024. */}
      <div className="ms-left">
        <VenueMosaic compact>
          <Link
            className="how-back reserve-back"
            to="/"
            aria-label="Back to the pitch"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                d="m14.5 5.5-7 6.5 7 6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          {/* The card is the subject of this page: here it is a membership
              that has been bought. The name on the reservation, else the
              signed-in one, else the placeholder; the plan from her record,
              never the site's live default, which follows the flip. Paid with
              no record here, Stripe's boolean names no tier, so it says only
              "Member". */}
          <TapInCard
            name={seat?.name ?? displayName ?? undefined}
            plan={seat ? (tier ?? "Standard") : subscribed ? "Member" : undefined}
            className="reserve-card"
          />
        </VenueMosaic>

        {/* ══ THE WAY IN, WITH THE CARD ══════════════════════════════════════
          For a reader who has not bought: under the card it offers, so on a
          desktop it holds still with it. One button — the old second copy at
          the foot of the signed-out state is gone. */}
        {showJoin ? (
          <div className="ms-join" data-lit={desk ? "" : undefined}>
            {userSession ? (
              /* Signed in, this page is theirs, not a sales page (§65; Sam, 25
                 Sep 2026: "the get early access button doesn't make sense to
                 include here either, maybe the 'try it once free' and the 'how
                 it works' link"). Signed out, the way in stays. */
              <>
                <button type="button" className="action" onClick={() => setTrial(true)}>
                  Try it once for free
                </button>
                <Link className="hero-how ms-how" to="/how">
                  How it works
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="m9 5 7 7-7 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </>
            ) : (
              <Link className="action" to="/reserve">
                {reserveCta}
              </Link>
            )}
          </div>
        ) : null}
      </div>

      {/* The light sheet: `data-lit` inverts the nine tokens under it
          (styles/light.css), as it does on the checkout. */}
      <div className="ms-body" data-lit="">
        {!ready ? null : seat ? (
          <>
            <div className="ms-head">
              <h1 className="ms-title">
                {`Your ${tier ? `${tier} seat` : "seat"} is held`}
              </h1>
              <p className="ms-sub">
                Opening in Blacksburg, {launchWindow}. Nothing more is charged
                until we open.
              </p>
            </div>

            {showHoldings ? (
              <>
                {/* The order card's form (Reserve.tsx), from the record. */}
                <section className="rs-order ms-next" aria-labelledby="ms-next-head">
                  <h2 className="t-title rs-order-head" id="ms-next-head">
                    What happens next
                  </h2>
                  <Timeline stops={nextStops(seat, tier)} foot={cancelLine(seat)} />
                </section>
                {/* THE NUMBER IS THE ACCOUNT. The seat texts — held, refunded,
                    we're open — go to everyone; only the offers line depends
                    on the box, because only that needed consent. */}
                {seat.phone ? (
                  <div className="ms-phone">
                    <span className="rs-promise-mark" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5.5 5h13A1.5 1.5 0 0 1 20 6.5v8.5a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3.5v-3.5h-1A1.5 1.5 0 0 1 4 15V6.5A1.5 1.5 0 0 1 5.5 5Z" />
                      </svg>
                    </span>
                    <p className="ms-phone-line">
                      <b className="tnum">{readablePhone(seat.phone)}</b>
                      <span>
                        We&rsquo;ll text this number about your seat and when we
                        open
                        {seat.marketingOptIn
                          ? ", plus offers from TapIn places"
                          : ""}
                        {seat.phoneVerified ? "" : " · not yet verified"}
                      </span>
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}

            <IncludedPanel headId="ms-inc-head" />

            <div className="ms-terms">
              <Drill summary="The full terms">
                <ol className="terms">
                  {/* The terms she agreed to, from the record — not today's —
                      with the rate raised to for life for a founder (§64). */}
                  {(seat.founding ? seat.terms.map(forLife) : seat.terms).map((t) => (
                    <li key={t.id}>{t.term}</li>
                  ))}
                </ol>
              </Drill>
            </div>
          </>
        ) : subscribed ? (
          /* ══ PAID, BUT NOT ON THIS DEVICE ══════════════════════════════════
             Stripe says this person holds a subscription and `localStorage`
             does not. WHAT IS MISSING IS THE DETAIL, NOT THE FACT: the status
             endpoint answers a boolean, so there is no plan, price, date or
             reference to print. It says what is true and no more. */
          <>
            <div className="ms-head">
              <h1 className="ms-title">Your seat is held</h1>
              <p className="ms-sub">
                Opening in Blacksburg, {launchWindow}. Nothing more is charged
                until we open, and your membership renews automatically until
                you cancel.
              </p>
            </div>
            <section className="ms-card" aria-labelledby="ms-away-head">
              <h2 className="t-title ms-card-head" id="ms-away-head">
                The details are on the device you reserved from
              </h2>
              <p>
                Your plan, what you paid and your reference are saved in that
                browser. Open this page there to see them, or email{" "}
                <a href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>{" "}
                and we will send them to you.
              </p>
            </section>
            <IncludedPanel headId="ms-inc-head" />
          </>
        ) : userSession && subscribed === null ? null : userSession ? (
          /* ══ SIGNED IN, NOT YET A MEMBER (§61) ══════════════════════════════
             Sam, 25 Sep 2026: "once im signed in it should be a different
             experience." Who they are, what the card gets them, and the join
             button under the card — not "No seat on this device", which is
             about browsers. Nothing shows while `subscribed` resolves. */
          <>
            <div className="ms-head">
              <h1 className="ms-title">Your membership starts when you join</h1>
              <p className="ms-sub">
                {displayName ? `Signed in as ${displayName}.` : "You are signed in."}{" "}
                Hold a seat and it opens with us in Blacksburg, {launchWindow}.
              </p>
            </div>
            <IncludedPanel headId="ms-inc-head" />
          </>
        ) : (
          /* ══ NOT AN ERROR, AND IT MUST NOT LOOK LIKE ONE ═══════════════════
             The likely reader here has bought nothing — /in can simply be
             typed. The rarer one HAS paid, on another device and signed out.
             It leads with the ordinary case and puts the recovery under it. */
          <>
            <div className="ms-head">
              <h1 className="ms-title">No seat on this device</h1>
              <p className="ms-sub">
                Reservations are saved on the device they were made on for now.
              </p>
            </div>
            <section className="ms-card" aria-labelledby="ms-recover-head">
              <h2 className="t-title ms-card-head" id="ms-recover-head">
                If you have reserved
              </h2>
              <p>
                Open this page in the browser you reserved from, or email{" "}
                <a href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>{" "}
                with the reference from your receipt and we will find it.
              </p>
            </section>
          </>
        )}
        {/* SIGNING OUT LIVES HERE TOO (§61): on a phone the pitch's bar has
            room for one control, and signed in it is "Your membership". */}
        {userSession ? (
          <p className="ms-session">
            <button
              type="button"
              className="ms-signout"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
            >
              Sign out
            </button>
          </p>
        ) : null}
        <SiteFoot />
      {trial ? <TrialModal lit onClose={() => setTrial(false)} /> : null}
      </div>
    </>
  );
}
