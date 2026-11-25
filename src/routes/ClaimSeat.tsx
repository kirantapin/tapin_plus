import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { useAuth } from "../context/auth_context";
import { useEventTracking } from "../context/event_tracking_context";
import {
  CLAIM_HOURS,
  WAITLIST_SALE_ENDS,
  WAITLIST_SALE_POLICY,
  claimPreview,
  markSaleClaim,
  openSaleSeat,
  readInvite,
  saleSeatEnds,
  saleSeatStart,
  saleClaimHere,
  waitlistSaleOn,
  type ClaimPreview,
  type SeatInvite,
} from "../model/claim";
import { useEndsAt } from "../model/deadline";
import { firstFigure, refreshPlusPrice, usd, usePlusPriceLoad } from "../model/plus";
import { onWaitlist, setWaitlistPage } from "../model/waitlist";
import { pagePolicy, setPagePolicy } from "../model/pagePolicy";
import { priceHidden, setPriceHidden } from "../model/priceGate";
import PlacePopup, { type PlacePopupPlace } from "../shell/PlacePopup";
import { openPlusCheckout, openPlusSignIn } from "../shell/PlusCheckout";
import { FlatMark } from "./parents_kit";
import { Benefits, Foot, GetApp, Pass, useFour } from "./MembersPass";
import { faqFor, refundFaq } from "./PlusHome";
import { CheckoutPhone } from "./parents_sections";
import { DeskGrid, DeskReels, DeskSonarV } from "./ClaimDesk";
import { AppLink } from "../shell/GetTheApp";
import { useMedia } from "../shell/useMedia";

/* ══ /claim: THE TEXTED LINK FOR AN OPEN SEAT (Sam, 19 Nov 2026) ═══════════
   Sam picked two of ten takes: signed out, 1D "You're up" (a line of
   seats, theirs lit, then sign in); signed in, 2D "Pay / get" (the time
   left as a bar, what you pay beside what you get), with the main page's
   places row and benefits, the FAQ, the refund and what it's worth under
   it. Past the 48 hours (model/claim.ts): back of the line. No seat yet:
   on the list, or a way to join it. A member has nothing to claim: /in. */

const HOUR = 3_600_000;

type State = { kind: "loading" } | { kind: "out" } | { kind: "member" } | { kind: "claimed" } | { kind: "open"; invite: SeatInvite } | { kind: "sale"; endsMs: number } | { kind: "ended" } | { kind: "listed"; since?: number } | { kind: "none" };

const PREVIEW_ENDS = Date.now() + (CLAIM_HOURS * HOUR - 61_000);

function useClaimState(preview: ClaimPreview | null): [State, () => void] {
  const { userSession, subscribed } = useAuth();
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
  /* The Black Friday seat's start (model/claim.ts): kept, or opened now on
     the first signed-in visit by someone it's for. */
  const [seatStart, setSeatStart] = useState<number | null>(null);
  const saleFor =
    !preview && !!uid && !!fresh && subscribed === false && waitlistSaleOn() && !readInvite(fresh.app);
  useEffect(() => {
    if (!saleFor || !uid || seatStart !== null) return;
    setSeatStart(saleSeatStart(uid, fresh?.user) ?? openSaleSeat(uid));
  }, [saleFor, uid, seatStart, fresh]);

  if (preview) {
    if (preview === "open") return [endedNow ? { kind: "ended" } : { kind: "open", invite: { openedMs: PREVIEW_ENDS - CLAIM_HOURS * HOUR, endsMs: PREVIEW_ENDS } }, onEnd];
    if (preview === "listed") return [{ kind: "listed", since: Date.now() }, onEnd];
    if (preview === "sale") return [endedNow || !waitlistSaleOn() ? { kind: "ended" } : { kind: "sale", endsMs: saleSeatEnds(PREVIEW_ENDS - CLAIM_HOURS * HOUR) }, onEnd];
    return [{ kind: preview } as State, onEnd];
  }
  if (userSession === undefined) return [{ kind: "loading" }, onEnd];
  if (!userSession) return [{ kind: "out" }, onEnd];
  if (subscribed === null || !fresh) return [{ kind: "loading" }, onEnd];
  const invite = readInvite(fresh.app);
  /* A member who came by a seat has just claimed it (or claimed it before):
     the moment, then the way to the app. Any other member: their pass. */
  if (subscribed === true) return [invite || saleClaimHere() ? { kind: "claimed" } : { kind: "member" }, onEnd];
  if (invite && invite.endsMs > Date.now() && !endedNow) return [{ kind: "open", invite }, onEnd];
  if (invite) return [{ kind: "ended" }, onEnd];
  /* The Black Friday–Cyber Monday price (model/claim.ts): anyone with the
     link who isn't a member, for now (Sam, 25 Nov 2026: "Anyone with the
     link should be able to claim at the moment since the actual waitlist
     hasn't been fully set up yet"). */
  if (waitlistSaleOn()) {
    if (seatStart === null) return [{ kind: "loading" }, onEnd];
    const endsMs = saleSeatEnds(seatStart);
    return [endedNow || Date.now() >= endsMs ? { kind: "ended" } : { kind: "sale", endsMs }, onEnd];
  }
  if (onWaitlist(fresh.user)) {
    const parsed = Date.parse(String(fresh.user?.waitlist_at ?? ""));
    return [{ kind: "listed", since: Number.isFinite(parsed) ? parsed : undefined }, onEnd];
  }
  return [{ kind: "none" }, onEnd];
}

/** The page's ground and title, as the members' pages set them. */
export function Page({ title, className, children }: { title: string; className: string; children: ReactNode }) {
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
const WORTH_NOTE = "*Our estimate for about $100 a month of orders at Plus spots.";

const Chevron = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** What you pay beside what you get, the rest of it, what it's worth and
 *  the refund: the offer's middle, and the "You're up" page's below the fold. */
/* ══ THE VALUE STACK: C · DARK CARD (Sam, 19 Nov 2026: "i like C go with
   that. Also it's too text heavy. I like how our current page is a bit more
   interactive and has more displays of what a 5 credit means and what it
   can be used towards") ══════════════════════════════════════════════════
   One dark card: what you pay beside what you get, the rest as three ticked
   lines, about $60 at its foot with a one-line basis. The refund as one
   line under it. Then the main page's phone, playing a real $5 order at
   each place, and what the credit goes on. */
const TICK = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6.5 12.5 3.6 3.6 7.4-7.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Value({ desk = false }: { desk?: boolean }) {
  const { price } = usePlusPriceLoad();
  const first = firstFigure(price);
  const monthly = usd(price?.monthly);
  const same = !!price && price.first === price.monthly;
  /* The Black Friday price isn't said on the page; the checkout shows it at
     the pay step (model/priceGate.ts). */
  const hidePay = priceHidden();
  const extras = (
    <ul className="cv-c-more">
      <li>
        {TICK}
        <span>
          <b>$5 back</b> every week you spend $10
        </span>
      </li>
      <li>
        {TICK}
        <span>
          <b>15% off</b> your other orders, once a day
        </span>
      </li>
      <li>
        {TICK}
        <span>
          <b>Deals</b> at Crumbl, Italiano’s and Playa Bowls
        </span>
      </li>
    </ul>
  );
  return (
    <>
      {desk ? (
        <>
          <DeskReels note={WORTH_NOTE} />
          <div className="dk-extras">{extras}</div>
        </>
      ) : (
      <section className="cv cv-c tnum" aria-label="What you pay and what you get">
        <div className="cv-c-pair" data-solo={hidePay ? "" : undefined} style={price ? undefined : { visibility: "hidden" }}>
          {hidePay ? null : (
            <div>
              <small>You pay</small>
              <b>{same ? monthly : first}</b>
              <span>{same ? "a month" : price?.firstFor === "forever" ? "a month, for life" : `first month, then ${monthly}`}</span>
            </div>
          )}
          <div className="cv-c-get">
            <small>You get</small>
            <b>$25</b>
            <span>every month, $5 at each Plus spot</span>
          </div>
        </div>
        <ul className="cv-c-more">
          <li>
            {TICK}
            <span>
              <b>$5 back</b> every week you spend $10
            </span>
          </li>
          <li>
            {TICK}
            <span>
              <b>15% off</b> your other orders, once a day
            </span>
          </li>
          <li>
            {TICK}
            <span>
              <b>Deals</b> at Crumbl, Italiano’s and Playa Bowls
            </span>
          </li>
        </ul>
        <div className="cv-c-worth">
          <span>
            Save about<sup>*</sup>
          </span>
          <b>$60 a month</b>
          <small>{WORTH_NOTE}</small>
        </div>
      </section>
      )}
      {/* The refund in one line; the full rule is in the questions. */}
      <p className="cv-promise">
        {SHIELD}
        <span>
          <b>Save what you pay, or get the difference back.</b> Automatic, with one purchase a month.
        </span>
      </p>
      <section className="tpa-module tps-fb cs-credit" aria-labelledby="cs-credit-h">
        <h2 id="cs-credit-h" className="tpa-h2">
          What $5 credit looks like
        </h2>
        <CheckoutPhone audience="student" start={0} />
        <div className="cs-uses">
          <p>Use it on</p>
          <ul>
            <li>Food</li>
            <li>Non-alcoholic drinks</li>
            <li>Event tickets</li>
            <li>Cover and line skips at select places</li>
          </ul>
        </div>
      </section>
    </>
  );
}

/** The questions, the main page's with the claim's first. */
export function Questions({ member = false, sale = false }: { member?: boolean; sale?: boolean } = {}) {
  const { price } = usePlusPriceLoad();
  const monthly = usd(price?.monthly);
  const faq = [
    ...(sale
      ? [{
          q: "Who gets the Black Friday price?",
          a: `Everyone we sent this link to, until 11:59pm Eastern on Tuesday, December 1. Your seat is held for ${CLAIM_HOURS} hours from when you first open it signed in. Claim it in time and your price is locked in for as long as you’re a member, even as more places join. You’ll see it before you pay. Cancel anytime in the Tapin app.`,
        }]
      : []),
    /* A member has claimed already: nothing to explain about claiming. */
    ...(member || sale ? [] : [{
      q: "How does claiming my seat work?",
      a: `Your seat is held for ${CLAIM_HOURS} hours from our text. Claim it here and it’s yours. If the ${CLAIM_HOURS} hours run out, it goes to the next person in line and you go back on the waitlist.`,
    }]),
    ...faqFor(monthly).flatMap((f) =>
      f.q === "How do I cancel and get a refund?"
        ? refundFaq()
        : f.q === "Will my price go up?"
          ? [{ q: f.q, a: "No. Once you join, your price is locked in for as long as you’re a member, even as more places join." }]
          : [f],
    ),
  ];
  return (
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

  );
}

/* ══ CLAIMED: THE SEAT IS YOURS, IN THE SPLIT (Sam, 23 Nov 2026: "this page
   should also be updated, and the animation when I claim my seat should be
   updated") ═════════════════════════════════════════════════════════════════
   The same dark panel as every other state of /claim, now on a phone too
   (stacked: the panel, then the rest). The line you stood in ends at a door
   with the Plus mark on it. You step through it, the line behind you moves
   up one, and the door opens out into your pass. On a computer the line
   stands up beside the words and stays, the door lit; on a phone it runs
   across the card's place and clears once the pass is out. It waits for the
   checkout's "You're in" to close, plays once per account on this phone,
   and with reduced motion the pass is simply there. The right side turns
   from selling to using: four steps to the first $5, the places, what's
   theirs every month, the questions. */
const stillMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Calls `go` once no checkout sheet is open (the sheet portals to the body). */
function whenSheetGone(go: () => void): () => void {
  const open = () => !!document.querySelector(".pck-layer");
  let t = 0;
  if (!open()) {
    t = window.setTimeout(go, 300);
    return () => window.clearTimeout(t);
  }
  const mo = new MutationObserver(() => {
    if (open()) return;
    mo.disconnect();
    t = window.setTimeout(go, 350);
  });
  mo.observe(document.body, { childList: true, subtree: true });
  return () => {
    mo.disconnect();
    window.clearTimeout(t);
  };
}

/** The line, ending at the door: standing up on a computer (door on top),
 *  across on a phone (door on the right). */
function DoorLine({ dir }: { dir: "up" | "across" }) {
  return (
    <div className={`cl-line cl-${dir}`} aria-hidden="true">
      <span className="cl-door">
        <FlatMark />
      </span>
      <span className="cl-me">
        <svg viewBox="0 0 24 24">
          <path d="m6.5 12.5 3.6 3.6 7.4-7.6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="cl-behind">
        {Array.from({ length: dir === "up" ? 7 : 6 }, (_, i) => (
          <i key={i} style={{ animationDelay: `${(i * 0.12).toFixed(2)}s` }} />
        ))}
      </span>
    </div>
  );
}

const centre = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

function playClaimed(root: HTMLElement): Animation[] {
  const out: Animation[] = [];
  const run = (el: Element | null | undefined, kf: Keyframe[], o: KeyframeAnimationOptions) => {
    if (el && typeof (el as HTMLElement).animate === "function") out.push((el as HTMLElement).animate(kf, { fill: "both", ...o }));
  };
  const OUT = "cubic-bezier(.22,1,.36,1)";
  const me = root.querySelector<HTMLElement>(".cl-me");
  const door = root.querySelector<HTMLElement>(".cl-door");
  const behind = root.querySelector<HTMLElement>(".cl-behind");
  const pass = root.querySelector<HTMLElement>(".cl-stage .mv-pass");
  if (!me || !door || !pass) return out;
  const m = centre(me.getBoundingClientRect());
  const d = centre(door.getBoundingClientRect());
  /* You step through the door, shrinking into it. */
  run(me, [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { offset: 0.78, opacity: 1 }, { transform: `translate(${d.x - m.x}px,${d.y - m.y}px) scale(.3)`, opacity: 0 }], { duration: 640, delay: 120, easing: "cubic-bezier(.65,0,.35,1)" });
  /* The line behind you moves up one. */
  const first = behind?.firstElementChild;
  if (behind && first) {
    const f = centre(first.getBoundingClientRect());
    run(behind, [{ transform: "translate(0,0)" }, { transform: `translate(${m.x - f.x}px,${m.y - f.y}px)` }], { duration: 760, delay: 320, easing: OUT });
  }
  /* The door takes you in: a nudge, and the green ring going out from it. */
  run(door, [{ transform: "scale(1)" }, { transform: "scale(1.16)" }, { transform: "scale(1)" }], { duration: 340, delay: 640, easing: "ease-out" });
  run(door, [{ boxShadow: "0 0 0 0 rgba(58,208,138,.55)" }, { boxShadow: "0 0 0 22px rgba(58,208,138,0)" }], { duration: 720, delay: 700, easing: "ease-out", fill: "none" });
  /* And opens out into your pass: the card starts as the door, where the
     door is, and grows into its place. */
  const pr = pass.getBoundingClientRect();
  const dr = door.getBoundingClientRect();
  const s = dr.width / pr.width;
  const c = centre(pr);
  run(
    pass,
    [
      { transform: `translate(${d.x - c.x}px,${d.y - c.y}px) scale(${s})`, opacity: 0, borderRadius: `${16 / s}px` },
      { offset: 0.14, opacity: 1 },
      { transform: "translate(0,0) scale(1)", opacity: 1, borderRadius: "20px" },
    ],
    { duration: 760, delay: 860, easing: "cubic-bezier(.2,.9,.25,1)" },
  );
  run(pass.querySelector(".mv-pass-live"), [{ transform: "scale(.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 440, delay: 1520, easing: "cubic-bezier(.34,1.56,.64,1)" });
  /* Across a phone the line was standing in the card's place: it clears. */
  if (root.querySelector(".cl-across")) run(root.querySelector(".cl-across"), [{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: 900, easing: "linear" });
  root.querySelectorAll(".cl-after > *").forEach((el, i) =>
    run(el, [{ transform: "translateY(12px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 520, delay: 1480 + i * 90, easing: OUT }),
  );
  return out;
}

/** The first $5, from here: a real order of things to do. */
/* Downloading and signing in, each its own step (Sam, 25 Nov 2026: "the how
   to claim your first $5 should include downloading the tapin app and
   signing in"). */
const FIRST_STEPS = [
  { h: "Download the Tapin app", p: "Free on the App Store (on Android, use tapin.app). We texted you the link too.", app: true },
  { h: "Sign in", p: "With the same number you used here. Your $25 in credit is waiting." },
  { h: "Pick a Plus spot", p: "Order in the app, or show your phone at the counter." },
  { h: "Your $5 comes off", p: "At each Plus spot, every month. On other orders, 15% off once a day." },
];

/** A member's right side, on the claimed moment and on /in: four steps to
 *  the first $5, the places, what's theirs every month, the questions. */
export function MemberRight({ onMail }: { onMail: () => void }) {
  const [placeOpen, setPlaceOpen] = useState<PlacePopupPlace | null>(null);
  return (
    <>
      <main className="sp-right">
        <section className="sp-sec" aria-labelledby="cl-start">
          <span className="sp-kick">Start here</span>
          <h2 id="cl-start" className="sp-h2">
            Your first $5, in four steps
          </h2>
          <ol className="cl-steps">
            {FIRST_STEPS.map((s) => (
              <li key={s.h}>
                <b>{s.h}</b>
                <span>{s.p}</span>
                {/* The link itself, Apple logo and all (Sam, 25 Nov 2026: "we
                    should have the link to the tapin app, with the apple logo
                    here"); the web app on Android. */}
                {s.app ? <AppLink where="claim_steps" className="cl-step-app" glyph /> : null}
              </li>
            ))}
          </ol>
        </section>
        <section className="sp-sec" aria-labelledby="cl-places">
          <span className="sp-kick">8 Blacksburg spots</span>
          <h2 id="cl-places" className="sp-h2">
            Where your membership works
          </h2>
          <DeskGrid onOpen={setPlaceOpen} />
        </section>
        <section className="sp-sec" aria-labelledby="cl-month">
          <span className="sp-kick">Every month</span>
          <h2 id="cl-month" className="sp-h2">
            What’s yours now
          </h2>
          <Benefits className="cl-ben" />
        </section>
        <Questions member />
        <div className="mv cs-foot">
          <Foot onMail={onMail} />
        </div>
      </main>
      {placeOpen ? <PlacePopup place={placeOpen} cta="Got it" onClose={() => setPlaceOpen(null)} onJoin={() => setPlaceOpen(null)} /> : null}
    </>
  );
}

function Claimed({ preview }: { preview: boolean }) {
  const four = useFour();
  const { userSession } = useAuth();
  const { track } = useEventTracking();
  const desk = useMedia("(min-width: 1024px)");
  /* The line stands up beside the words only where there is room for both. */
  const wide = useMedia("(min-width: 1280px)");
  const root = useRef<HTMLDivElement | null>(null);
  const [round, setRound] = useState(0);
  const uid = userSession?.user?.id;
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    let seen = false;
    if (!preview) {
      try {
        const key = `tp_claimed_v1_${uid ?? "me"}`;
        seen = localStorage.getItem(key) === "1";
        localStorage.setItem(key, "1");
      } catch {
        /* Private mode: it plays again, which is fine. */
      }
    }
    if (seen || stillMotion()) return;
    /* Hidden only while it's about to play, so the page is whole without it. */
    el.dataset.play = "";
    let anims: Animation[] = [];
    const stop = whenSheetGone(() => {
      anims = playClaimed(el);
      const last = anims[anims.length - 1];
      if (last) last.onfinish = () => delete el.dataset.play;
      else delete el.dataset.play;
    });
    return () => {
      stop();
      anims.forEach((a) => a.cancel());
      delete el.dataset.play;
    };
  }, [round, preview, uid, wide]);
  useEffect(() => {
    if (!preview) track("plus_claim_claimed");
  }, [preview, track]);
  return (
    <Page title="You’re in · Tapin Plus" className="tpa tpa-home tps cs cs-split cs-claimed">
      <div className="sp" ref={root}>
        <aside className="sp-left">
          <Link className="sp-brand" to="/">
            <FlatMark className="sp-mark" />
            Tapin Plus Blacksburg
          </Link>
          <div className="sp-mid">
            {wide ? <DoorLine dir="up" /> : null}
            <div className="sp-txt cl-txt">
              <div className="cl-stage">
                <Pass active who={four ? `••• ${four}` : undefined} whoLabel="Member" />
                {wide ? null : <DoorLine dir="across" />}
              </div>
              <div className="cl-after">
                <h1 className="sp-h">The seat is yours.</h1>
                <p className="sp-lede">You’re a Tapin Plus member. Your $25 is ready to spend in the Tapin&nbsp;app.</p>
                <GetApp where="claim_done" tone="light" />
                <p className="cl-links">
                  <Link to="/in">Your account</Link>
                  {preview ? (
                    <button type="button" onClick={() => setRound((n) => n + 1)}>
                      Play it again
                    </button>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
          {desk ? <p className="sp-hint">Scroll for how to use it</p> : null}
        </aside>
        <MemberRight onMail={() => track("plus_claim_email")} />
      </div>
    </Page>
  );
}

/** The preview's way between the states (?claimv=, model/claim.ts). */
function PreviewBar({ at, go }: { at: ClaimPreview; go: (v: ClaimPreview) => void }) {
  const steps: ReadonlyArray<[ClaimPreview, string]> = [
    ["out", "Signed out"],
    ["listed", "Not open yet"],
    ["none", "Not in line"],
    ["sale", "Black Friday"],
    ["open", "Seat open"],
    ["claimed", "Claimed"],
    ["ended", "Ran out"],
  ];
  return (
    <nav className="cs-pv" aria-label="Preview the claim page">
      <b>Preview</b>
      {steps.map(([k, label]) => (
        <button
          key={k}
          type="button"
          aria-pressed={at === k}
          onClick={() => {
            go(k);
            window.history.replaceState(null, "", `?claimv=${k}`);
            window.scrollTo(0, 0);
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

/* ══ SPLIT (Sam, 19 Nov 2026: "I love split! let's do that one"; on phones
   too, 23 Nov 2026: "now do /claim on phones in the split style") ══════════
   Every state of /claim: the status in a dark panel, the one action in
   white, then the places, what you get, what $5 looks like and the
   questions. From 1024px the panel stays on the left while the right
   scrolls, the line standing up beside the words. On a phone the panel is
   the first screen's top, the line running across above the words, and the
   rest follows in one column; an open seat's "Claim my seat" docks at the
   bottom once the panel's button has scrolled away. The claimed moment
   keeps its own page. */
type SplitCopy = { proof?: boolean; sale?: boolean; title: string; lede: string; since?: string; fine?: string; up: boolean; act?: { label: string; go: (el?: HTMLElement | null) => void }; held?: ReactNode; popupCta: string; dock?: boolean };

/* ══ PROOF UNDER THE BUTTON (Sam, 25 Nov 2026: "Do we want to have some
   kind of social proof in there? Like 500 students on plus, saves an average
   of $60 a month, and $25 to spend each month?") ══════════════════════════
   Three figures where the decision is made. 500+ is Sam's member count
   (model/proof.ts, said site-wide). $25 is the monthly credit. $60 is our
   estimate, not a measured average (WORTH_NOTE), so it says "est." here;
   change it to an average only once there's real member data. */
function Proof() {
  return (
    <ul className="sp-proof tnum" aria-label="Tapin Plus in numbers">
      <li>
        <b>500+</b>
        <span>VT students on Plus</span>
      </li>
      <li>
        <b>$25</b>
        <span>to spend every month</span>
      </li>
      <li>
        <b>~$60</b>
        <span>saved a month (est.)</span>
      </li>
    </ul>
  );
}

/** True once `el` has scrolled up out of view (never true before it has
 *  been seen, so the dock doesn't flash in on load). */
function usePastTop(ref: { current: HTMLElement | null }, on: boolean): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!on || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, on]);
  return on && past;
}

function Split({ copy }: { copy: SplitCopy }) {
  const [placeOpen, setPlaceOpen] = useState<PlacePopupPlace | null>(null);
  const { track } = useEventTracking();
  const desk = useMedia("(min-width: 1024px)");
  const cta = useRef<HTMLButtonElement | null>(null);
  const docked = usePastTop(cta, !desk && !!copy.dock && !!copy.act);
  return (
    <Page title="Claim your seat · Tapin Plus" className={`tpa tpa-home tps cs cs-split${copy.dock ? " cs-docks" : ""}`}>
      <div className="sp">
        <aside className="sp-left">
          <Link className="sp-brand" to="/">
            <FlatMark className="sp-mark" />
            Tapin Plus Blacksburg
          </Link>
          <div className="sp-mid">
            <DeskSonarV up={copy.up} across={!desk} />
            <div className="sp-txt">
              {copy.held}
              <h1 className="sp-h">{copy.title}</h1>
              <p className="sp-lede">{copy.lede}</p>
              {copy.since ? (
                <p className="sp-since tnum">
                  <i aria-hidden="true" />
                  {copy.since}
                </p>
              ) : null}
              {copy.act ? (
                <button ref={cta} type="button" className="sp-cta" onClick={(e) => copy.act?.go(e.currentTarget)}>
                  {copy.act.label}
                </button>
              ) : null}
              {copy.proof ? <Proof /> : null}
              {copy.fine ? <p className="sp-fine">{copy.fine}</p> : null}
            </div>
          </div>
          {desk ? <p className="sp-hint">Scroll for everything Plus gets you</p> : null}
        </aside>
        <main className="sp-right">
          <section className="sp-sec" aria-labelledby="sp-places">
            <span className="sp-kick">8 Blacksburg spots</span>
            <h2 id="sp-places" className="sp-h2">
              Where your seat works
            </h2>
            <DeskGrid onOpen={setPlaceOpen} />
          </section>
          <section className="sp-sec" aria-labelledby="sp-get">
            <span className="sp-kick">What you get</span>
            <h2 id="sp-get" className="sp-h2">
              Pay a little. Get a lot.
            </h2>
            <Value desk={desk} />
          </section>
          <Questions sale={copy.sale} />
          {copy.act && !copy.dock && !desk ? (
            <button type="button" className="mv-cta mv-cta-dark sp-again" onClick={(e) => copy.act?.go(e.currentTarget)}>
              {copy.act.label}
            </button>
          ) : null}
          <div className="mv cs-foot">
            <Foot promise={false} onMail={() => track("plus_claim_email")} />
          </div>
        </main>
      </div>
      {copy.dock && copy.act && !desk ? (
        <div className="cs-dock sp-dock" data-on={docked ? "" : undefined} aria-hidden={docked ? undefined : true}>
          <button type="button" className="mv-cta mv-cta-dark" tabIndex={docked ? undefined : -1} onClick={(e) => copy.act?.go(e.currentTarget)}>
            {copy.act.label}
          </button>
        </div>
      ) : null}
      {placeOpen ? (
        <PlacePopup
          place={placeOpen}
          cta={copy.popupCta}
          onClose={() => setPlaceOpen(null)}
          onJoin={() => {
            setPlaceOpen(null);
            copy.act?.go(null);
          }}
        />
      ) : null}
    </Page>
  );
}

export default function ClaimSeat() {
  const [pv, setPv] = useState<ClaimPreview | null>(claimPreview);
  const [state, onEnd] = useClaimState(pv);
  const { track } = useEventTracking();
  const navigate = useNavigate();
  const kind = state.kind;
  useEffect(() => {
    if (kind !== "loading" && !pv) track("plus_claim_viewed", { state: kind });
  }, [kind, pv, track]);
  const bar = pv ? <PreviewBar at={pv} go={setPv} /> : null;
  /* Coming from a page that takes waitlist joins, the pop-ups would still
     say Join the waitlist: /claim sells its own seat. */
  setWaitlistPage(false);
  const sale = waitlistSaleOn();
  /* The Black Friday price isn't said on the page (Sam, 25 Nov 2026: "For
     the black friday sale, we shouldn't mention the price I don't think"):
     the checkout shows it at the pay step, after the number. */
  setPriceHidden(sale && kind !== "listed" && kind !== "ended" && kind !== "loading");
  /* The waitlist's price shows while it's theirs to take: a seat, signed
     out, or not on the list yet (joining opens their seat). A seat that ran
     out, or the list after the sale, sees the ordinary price; the page's
     policy goes (model/pagePolicy.ts). */
  useLayoutEffect(() => {
    if (kind === "loading" || kind === "member") return;
    const want = sale && kind !== "listed" && kind !== "ended";
    if (want === (pagePolicy() !== null)) return;
    setPagePolicy(WAITLIST_SALE_POLICY, want ? WAITLIST_SALE_ENDS : 0);
    refreshPlusPrice();
  }, [kind, sale]);

  if (state.kind === "member") return <Navigate to="/in" replace />;
  if (state.kind === "claimed")
    return (
      <>
        {bar}
        <Claimed preview={!!pv} />
      </>
    );
  if (state.kind === "open") {
    const claimNow = (el?: HTMLElement | null) => {
      if (pv) {
        setPv("claimed");
        return;
      }
      track("plus_claim_clicked", { where: "split" });
      openPlusCheckout("claim", el ?? null);
    };
    return (
      <>
        {bar}
        <Split
          copy={{
            title: "Claim your seat",
            lede: `It’s held for you for ${CLAIM_HOURS} hours. After that, it goes to the next person on the waitlist.`,
            up: true,
            held: <Held endsMs={state.invite.endsMs} onEnd={onEnd} />,
            act: { label: "Claim my seat", go: claimNow },
            popupCta: "Claim my seat",
            dock: true,
          }}
        />
      </>
    );
  }
  if (state.kind === "sale") {
    const claimNow = (el?: HTMLElement | null) => {
      if (pv) {
        setPv("claimed");
        return;
      }
      track("plus_claim_clicked", { where: "split", offer: "waitlist_bfcm" });
      markSaleClaim();
      openPlusCheckout("claim", el ?? null);
    };
    return (
      <>
        {bar}
        <Split
          copy={{
            sale: true,
            proof: true,
            title: "You’re off the waitlist.",
            lede: `Your Tapin Plus seat is held for ${CLAIM_HOURS} hours, at a Black Friday price that’s locked in for life. After that, it goes to the next person in line.`,
            fine: "Cancel anytime in the Tapin app.",
            up: true,
            held: <Held endsMs={state.endsMs} onEnd={onEnd} />,
            act: { label: "Claim my Black Friday offer", go: claimNow },
            popupCta: "Claim my Black Friday offer",
            dock: true,
          }}
        />
      </>
    );
  }
  /* The panel's ground while the account loads, so the page doesn't flash light. */
  if (state.kind === "loading")
    return (
      <Page title="Claim your seat · Tapin Plus" className="tpa cs cs-split">
        <div className="sp">
          <aside className="sp-left" />
        </div>
      </Page>
    );
  const signIn = () => {
    if (pv) {
      setPv("open");
      return;
    }
    track("plus_claim_signin");
    openPlusSignIn("claim");
  };
  const act =
    state.kind === "out"
      ? { label: "Sign in to claim", go: signIn }
      : state.kind === "none"
        ? {
            label: "Join the waitlist",
            go: () => {
              track("plus_claim_to_waitlist");
              navigate("/");
            },
          }
        : undefined;

  const copy: SplitCopy =
    state.kind === "out" && sale
      ? {
          sale: true,
          proof: true,
          title: "Your Black Friday offer is here.",
          lede: `You’re off the waitlist, with a Tapin Plus price locked in for life. Sign in with your mobile number. Your seat is held for ${CLAIM_HOURS} hours from then.`,
          up: true,
          act,
          popupCta: "Sign in to claim",
        }
      : state.kind === "out"
      ? { title: "You’re up.", lede: "A Tapin Plus seat just opened for you. Sign in with the number you joined the waitlist with to claim it.", fine: `You have ${CLAIM_HOURS} hours. After that, the seat goes to the next person in line and you go back on the waitlist.`, up: true, act, popupCta: "Sign in to claim" }
      : state.kind === "ended"
        ? { title: `Your ${CLAIM_HOURS} hours ran out.`, lede: "Your seat went to the next person in line. You’re back on the waitlist, and we’ll text you when another seat opens.", up: false, popupCta: "Got it" }
        : state.kind === "listed"
          ? {
              title: "You’re in line.",
              lede: `Your seat isn’t open yet. We’ll text you when it is, and you’ll have ${CLAIM_HOURS} hours to claim it.`,
              since: state.since ? `On the list since ${new Date(state.since).toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : undefined,
              up: false,
              popupCta: "Got it",
            }
          : sale
            ? { sale: true, title: "This offer is for the waitlist.", lede: `Join the waitlist by 11:59pm Tuesday, December 1, and your seat opens right away, held for ${CLAIM_HOURS} hours at the Black Friday price. Already joined with a different number? Sign in with that one.`, up: false, act, popupCta: "Join the waitlist" }
            : { title: "You’re not in line yet.", lede: "Tapin Plus is invite only. Join the waitlist and we’ll text you when your seat opens.", up: false, act, popupCta: "Join the waitlist" };
  return (
    <>
      {bar}
      <Split copy={copy} />
    </>
  );
}
