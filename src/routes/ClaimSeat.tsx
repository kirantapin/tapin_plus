import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../supabase";
import { asset } from "../asset";
import { useAuth } from "../context/auth_context";
import { useEventTracking } from "../context/event_tracking_context";
import { CLAIM_HOURS, claimPreview, readInvite, type SeatInvite } from "../model/claim";
import { useEndsAt } from "../model/deadline";
import { firstFigure, usd, usePlusPriceLoad } from "../model/plus";
import { refundAnswer } from "../model/refundWords";
import { onWaitlist } from "../model/waitlist";
import { liveSoon } from "../shell/LiveSoon";
import { LiteMark } from "../shell/LiteMark";
import { BonusSpots } from "../shell/BonusSpots";
import PlacePopup, { type PlacePopupPlace } from "../shell/PlacePopup";
import { openPlusCheckout, openPlusSignIn } from "../shell/PlusCheckout";
import { FlatMark } from "./parents_kit";
import { Foot } from "./MembersPass";
import { PHOTO_POS, allRailCards, faqFor, refundFaq } from "./PlusHome";

/* ══ /claim: THE TEXTED LINK FOR AN OPEN SEAT (Sam, 19 Nov 2026) ═══════════
   Sam picked two of ten takes: signed out, 1D "You're up" (a line of
   seats, theirs lit, then sign in); signed in, 2D "Pay / get" (the time
   left as a bar, what you pay beside what you get), with the main page's
   places row and benefits, the FAQ, the refund and what it's worth under
   it. Past the 48 hours (model/claim.ts): back of the line. No seat yet:
   on the list, or a way to join it. A member has nothing to claim: /in. */

const PAPER_MARK = asset("/brand/plus-paper-mark.svg");
const HOUR = 3_600_000;

type State = { kind: "loading" } | { kind: "out" } | { kind: "member" } | { kind: "open"; invite: SeatInvite } | { kind: "ended" } | { kind: "listed" } | { kind: "none" };

const PREVIEW_ENDS = Date.now() + (CLAIM_HOURS * HOUR - 61_000);

function useClaimState(): [State, () => void] {
  const { userSession, subscribed } = useAuth();
  const preview = claimPreview();
  /* app_metadata as it is now, not as the session token had it: the seat
     can open after they signed in. */
  const [fresh, setFresh] = useState<{ app?: Record<string, unknown>; user?: Record<string, unknown> } | null>(null);
  const [endedNow, setEndedNow] = useState(false);
  const uid = userSession?.user?.id;
  useEffect(() => {
    if (!uid) return;
    let live = true;
    supabase.auth.getUser().then(
      ({ data }) => live && setFresh({ app: data.user?.app_metadata, user: data.user?.user_metadata }),
      () => live && setFresh({ app: userSession?.user?.app_metadata, user: userSession?.user?.user_metadata }),
    );
    return () => {
      live = false;
    };
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps
  const onEnd = useCallback(() => setEndedNow(true), []);

  if (preview) {
    if (preview === "open") return [endedNow ? { kind: "ended" } : { kind: "open", invite: { openedMs: PREVIEW_ENDS - CLAIM_HOURS * HOUR, endsMs: PREVIEW_ENDS } }, onEnd];
    return [{ kind: preview } as State, onEnd];
  }
  if (userSession === undefined) return [{ kind: "loading" }, onEnd];
  if (!userSession) return [{ kind: "out" }, onEnd];
  if (subscribed === true) return [{ kind: "member" }, onEnd];
  if (subscribed === null || !fresh) return [{ kind: "loading" }, onEnd];
  const invite = readInvite(fresh.app);
  if (invite && invite.endsMs > Date.now() && !endedNow) return [{ kind: "open", invite }, onEnd];
  if (invite) return [{ kind: "ended" }, onEnd];
  return [{ kind: onWaitlist(fresh.user) ? "listed" : "none" }, onEnd];
}

/** The page's ground and title, as the members' pages set them. */
function Page({ title, className, children }: { title: string; className: string; children: ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = "tpa";
    window.scrollTo(0, 0);
    const t = document.title;
    document.title = title;
    return () => {
      delete root.dataset.surface;
      document.title = t;
    };
  }, [title]);
  return <div className={className}>{children}</div>;
}

function BackPill() {
  return (
    <Link className="tpa-glass tpa-signin mv-back cs-back" to="/">
      <svg className="tpa-back" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Tapin Plus
    </Link>
  );
}

/* ── 1D · You're up: the line of seats, theirs lit. The seats are a
   picture of the line, not a count. ── */
function Line({ state }: { state: "up" | "back" | "wait" }) {
  const you = state === "up" ? 236 : state === "back" ? 340 : 196;
  return (
    <svg className="cs-line" viewBox="0 0 390 132" aria-hidden="true">
      <line x1="0" y1="86" x2="390" y2="86" className="cs-line-track" />
      {[-6, 34, 74, 114, 154, 194, 234, 274, 314].filter((x) => Math.abs(x - you) > 30 && (state !== "up" || x < you)).map((x) => (
        <circle key={x} cx={x} cy="86" r="11" className="cs-line-seat" />
      ))}
      {state === "up" ? <circle cx={you} cy="86" r="30" className="cs-line-glow" /> : null}
      <circle cx={you} cy="86" r="20" className="cs-line-you" />
      {state === "up" ? (
        <path d={`m${you - 8} 86 6 6 11-12`} className="cs-line-tick" />
      ) : (
        <circle cx={you} cy="86" r="5" className="cs-line-dot" />
      )}
      <g transform={`translate(${you - 30} 16)`}>
        <rect width="60" height="30" rx="8" className="cs-line-tag" />
        <text x="30" y="20" textAnchor="middle" className="cs-line-tag-t">
          You
        </text>
        <path d="M24 30h12l-6 7z" className="cs-line-tag" />
      </g>
      {state === "up" ? (
        <>
          <rect x="300" y="58" width="56" height="56" rx="16" className="cs-line-door" />
          <image href={PAPER_MARK} x="309" y="71" width="38" height="30" />
        </>
      ) : null}
    </svg>
  );
}

function Up({ state, children }: { state: State["kind"]; children: ReactNode }) {
  return (
    <Page title="Claim your seat · Tapin Plus" className="tpa cs cs-up">
      <div className="cs-top">
        <BackPill />
      </div>
      <Line state={state === "out" ? "up" : state === "ended" ? "back" : "wait"} />
      <div className="cs-up-body">{children}</div>
    </Page>
  );
}

/* ── 2D · Pay / get ── */
const two = (n: number) => String(n).padStart(2, "0");

function Held({ endsMs, onEnd }: { endsMs: number; onEnd: () => void }) {
  const r = useEndsAt(endsMs);
  useEffect(() => {
    if (r === null) onEnd();
  }, [r === null, onEnd]); // eslint-disable-line react-hooks/exhaustive-deps
  const left = r ? (r.days * 24 + r.hours) * HOUR + r.minutes * 60_000 + r.seconds * 1000 : 0;
  const h = r ? r.days * 24 + r.hours : 0;
  return (
    <div className="cs-held" role="timer" aria-label={r ? `${h} hours and ${r.minutes} minutes left to claim your seat` : "Your time has ended"}>
      <p className="cs-held-t tnum">
        <span>Your seat is held</span>
        <b>{r ? `${h}h ${two(r.minutes)}m ${two(r.seconds)}s left` : "Time’s up"}</b>
      </p>
      <span className="cs-held-track">
        <i style={{ transform: `scaleX(${Math.max(0, Math.min(1, left / (CLAIM_HOURS * HOUR)))})` }} />
      </span>
    </div>
  );
}

const SHIELD = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.2 5 5.9v5.6c0 4.3 2.9 8 7 9.1 4.1-1.1 7-4.8 7-9.1V5.9L12 3.2Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    <path d="m8.9 12.2 2.2 2.2 4.1-4.3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* "The average student saves $60 a month at places they already go" (Sam,
   19 Nov 2026). Said as "about", with its basis, as the checkout says it:
   it's our estimate, not a measured member average (Plus is weeks old).
   Swap in the real average once there are months of members. */
const WORTH_NOTE = "*Our estimate for about $100 a month of orders at Plus spots: the $25 monthly credit, $5 back each week, 15% off and points.";

function ClaimRail({ onOpen }: { onOpen: (p: PlacePopupPlace) => void }) {
  const cards = allRailCards();
  return (
    <div className="tpa-places tpw tpw-b cs-rail">
      <ul className="tpa-rail">
        {cards.map((v) => (
          <li key={v.id} className="tpa-place">
            <button
              type="button"
              className="tpa-place-open"
              aria-label={v.lite ? `What you get at ${v.name}` : `What Plus gets you at ${v.name}`}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                onOpen({ id: v.id, name: v.name, kind: v.kind, photo: v.photo, lite: v.lite || undefined, liveSoon: liveSoon(v.id) || undefined, from: { x: r.left, y: r.top, w: r.width, h: r.height } });
              }}
            >
              <span className="tpa-place-shot">
                <img className="tpa-place-photo" src={v.photo} alt="" decoding="async" loading="lazy" style={PHOTO_POS[v.id] ? { objectPosition: PHOTO_POS[v.id] } : undefined} />
              </span>
              <span className="tpa-glass tpa-tag">
                {v.lite ? <LiteMark className="tpa-tag-mark" /> : <FlatMark className="tpa-tag-mark" />}
                {v.lite ? "Lite" : "Plus"}
              </span>
              <span className="tpa-glass tpa-place-more" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M8 16 16 8M9.5 8H16v6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="tpa-place-name">
                <img className="tpa-place-logo" src={v.logo} alt="" decoding="async" loading="lazy" />
                <span className="tpa-place-words">
                  <b>{v.name}</b>
                  <small>{v.kind}</small>
                  <small className="tpa-place-perk">{v.perk}</small>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Offer({ invite, onEnd }: { invite: SeatInvite; onEnd: () => void }) {
  const { track } = useEventTracking();
  const { price } = usePlusPriceLoad();
  const [placeOpen, setPlaceOpen] = useState<PlacePopupPlace | null>(null);
  const first = firstFigure(price);
  const monthly = usd(price?.monthly);
  const same = !!price && price.first === price.monthly;
  const claim = (where: string, el?: HTMLElement | null) => {
    track("plus_claim_clicked", { where });
    openPlusCheckout("claim", el ?? null);
  };
  const faq = [
    {
      q: "How does claiming my seat work?",
      a: `Your seat is held for ${CLAIM_HOURS} hours from our text. Claim it here and it’s yours. If the ${CLAIM_HOURS} hours run out, it goes to the next person in line and you go back on the waitlist.`,
    },
    ...faqFor(monthly).flatMap((f) =>
      f.q === "How do I cancel and get a refund?"
        ? refundFaq()
        : f.q === "Will my price go up?"
          ? [{ q: f.q, a: "No. Once you join, your price is locked in for as long as you’re a member, even as more places join." }]
          : [f],
    ),
  ];
  return (
    <Page title="Claim your seat · Tapin Plus" className="tpa tpa-home tps cs cs-offer">
      <div className="cs-col">
        <div className="cs-top">
          <BackPill />
        </div>
        <Held endsMs={invite.endsMs} onEnd={onEnd} />
        <h1 className="cs-h">Claim your seat</h1>
        <div className="cs-vs tnum">
          <div className="cs-tile cs-pay" style={price ? undefined : { visibility: "hidden" }}>
            <small>You pay</small>
            <div>
              <b>{same ? monthly : first}</b>
              <span>{same ? "a month" : `first month, then ${monthly}`}</span>
            </div>
          </div>
          <div className="cs-tile cs-get">
            <small>You get</small>
            <div>
              <b>$25</b>
              <span>to spend every month, $5 at each Plus spot</span>
            </div>
          </div>
        </div>
        <ul className="cs-also">
          <li>
            <b>Earn $5 back</b> every week when you spend $10
          </li>
          <li>
            <b>Save 15%</b> on your other orders, once a day
          </li>
          <li>
            <b>Deals</b> at Crumbl, Italiano’s and Playa Bowls
          </li>
        </ul>
        <section className="cs-worth" aria-label="What Plus is worth">
          <p className="tnum">
            <span>Save about</span>
            <b>$60 a month</b>
            <span>
              at places you already&nbsp;go<sup>*</sup>
            </span>
          </p>
          <small>{WORTH_NOTE}</small>
        </section>
        <section className="cs-promise" aria-label="The Plus Promise">
          {SHIELD}
          {/* Sam, 19 Nov 2026: "save what you pay or your money back"; the
              difference, as every page says it (model/refundWords.ts). */}
          <p>
            <b>Save what you pay, or get the difference back.</b> {refundAnswer("student")}
          </p>
        </section>
      </div>

      <BonusSpots title="What and where can I use it?" rail={<ClaimRail onOpen={setPlaceOpen} />} />

      <section className="tpa-module cs-faq" aria-labelledby="cs-faq-h">
        <h2 id="cs-faq-h" className="tpa-h2">
          Questions
        </h2>
        {faq.map((f) => (
          <details key={f.q} className="tpa-qa">
            <summary>
              <span>{f.q}</span>
              <Chevron />
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>

      <div className="mv cs-foot">
        {/* The promise is its own card above; the foot keeps help and terms. */}
        <Foot promise={false} onMail={() => track("plus_claim_email")} />
      </div>

      <div className="cs-dock">
        <button type="button" className="mv-cta mv-cta-dark" onClick={(e) => claim("dock", e.currentTarget)}>
          Claim my seat
        </button>
      </div>

      {placeOpen ? (
        <PlacePopup
          place={placeOpen}
          cta="Claim my seat"
          onClose={() => setPlaceOpen(null)}
          onJoin={() => {
            setPlaceOpen(null);
            claim("place_popup");
          }}
        />
      ) : null}
    </Page>
  );
}

export default function ClaimSeat() {
  const [state, onEnd] = useClaimState();
  const { track } = useEventTracking();
  const kind = state.kind;
  useEffect(() => {
    if (kind !== "loading") track("plus_claim_viewed", { state: kind });
  }, [kind, track]);

  if (state.kind === "member") return <Navigate to="/in" replace />;
  if (state.kind === "open") return <Offer invite={state.invite} onEnd={onEnd} />;
  if (state.kind === "loading") return <Page title="Claim your seat · Tapin Plus" className="tpa cs cs-up" children={null} />;

  return (
    <Up state={state.kind}>
      {state.kind === "out" ? (
        <>
          <h1 className="cs-up-h">You’re up.</h1>
          <p className="cs-lede">A Tapin Plus seat just opened for you. Sign in with the number you joined the waitlist with to claim&nbsp;it.</p>
          <button
            type="button"
            className="mv-cta mv-cta-dark"
            onClick={() => {
              track("plus_claim_signin");
              openPlusSignIn("claim");
            }}
          >
            Sign in to claim
          </button>
          <p className="cs-fine">You have {CLAIM_HOURS} hours. After that, the seat goes to the next person in line and you go back on the&nbsp;waitlist.</p>
        </>
      ) : state.kind === "ended" ? (
        <>
          <h1 className="cs-up-h">Your {CLAIM_HOURS} hours ran out.</h1>
          <p className="cs-lede">Your seat went to the next person in line. You’re back on the waitlist, and we’ll text you when another seat&nbsp;opens.</p>
        </>
      ) : state.kind === "listed" ? (
        <>
          <h1 className="cs-up-h">You’re in line.</h1>
          <p className="cs-lede">Your seat isn’t open yet. We’ll text you when it is, and you’ll have {CLAIM_HOURS} hours to claim&nbsp;it.</p>
        </>
      ) : (
        <>
          <h1 className="cs-up-h">You’re not in line yet.</h1>
          <p className="cs-lede">Tapin Plus is invite only. Join the waitlist and we’ll text you when your seat&nbsp;opens.</p>
          <Link className="mv-cta mv-cta-dark" to="/" onClick={() => track("plus_claim_to_waitlist")}>
            Join the waitlist
          </Link>
        </>
      )}
    </Up>
  );
}
