import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { useAuth } from "../context/auth_context";
import { useEventTracking } from "../context/event_tracking_context";
import { CLAIM_HOURS, claimPreview, readInvite, type ClaimPreview, type SeatInvite } from "../model/claim";
import { useEndsAt } from "../model/deadline";
import { firstFigure, usd, usePlusPriceLoad } from "../model/plus";
import { onWaitlist } from "../model/waitlist";
import { liveSoon } from "../shell/LiveSoon";
import { useTicker } from "../shell/useTicker";
import { LiteMark } from "../shell/LiteMark";
import PlacePopup, { type PlacePopupPlace } from "../shell/PlacePopup";
import { openPlusCheckout, openPlusSignIn } from "../shell/PlusCheckout";
import { FlatMark } from "./parents_kit";
import { Benefits, Foot, GetApp, Pass, useFour } from "./MembersPass";
import { PHOTO_POS, allRailCards, faqFor, refundFaq } from "./PlusHome";
import { CheckoutPhone } from "./parents_sections";
import { DeskGrid, DeskReels, DeskRows, DeskSonar, DeskSonarV } from "./ClaimDesk";
import { useMedia } from "../shell/useMedia";

/* ══ /claim: THE TEXTED LINK FOR AN OPEN SEAT (Sam, 19 Nov 2026) ═══════════
   Sam picked two of ten takes: signed out, 1D "You're up" (a line of
   seats, theirs lit, then sign in); signed in, 2D "Pay / get" (the time
   left as a bar, what you pay beside what you get), with the main page's
   places row and benefits, the FAQ, the refund and what it's worth under
   it. Past the 48 hours (model/claim.ts): back of the line. No seat yet:
   on the list, or a way to join it. A member has nothing to claim: /in. */

const HOUR = 3_600_000;

type State = { kind: "loading" } | { kind: "out" } | { kind: "member" } | { kind: "claimed" } | { kind: "open"; invite: SeatInvite } | { kind: "ended" } | { kind: "listed"; since?: number } | { kind: "none" };

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

  if (preview) {
    if (preview === "open") return [endedNow ? { kind: "ended" } : { kind: "open", invite: { openedMs: PREVIEW_ENDS - CLAIM_HOURS * HOUR, endsMs: PREVIEW_ENDS } }, onEnd];
    if (preview === "listed") return [{ kind: "listed", since: Date.now() }, onEnd];
    return [{ kind: preview } as State, onEnd];
  }
  if (userSession === undefined) return [{ kind: "loading" }, onEnd];
  if (!userSession) return [{ kind: "out" }, onEnd];
  if (subscribed === null || !fresh) return [{ kind: "loading" }, onEnd];
  const invite = readInvite(fresh.app);
  /* A member who came by a seat has just claimed it (or claimed it before):
     the moment, then the way to the app. Any other member: their pass. */
  if (subscribed === true) return [invite ? { kind: "claimed" } : { kind: "member" }, onEnd];
  if (invite && invite.endsMs > Date.now() && !endedNow) return [{ kind: "open", invite }, onEnd];
  if (invite) return [{ kind: "ended" }, onEnd];
  if (onWaitlist(fresh.user)) {
    const since = Date.parse(String(fresh.user?.waitlist_at ?? ""));
    return [{ kind: "listed", since: Number.isFinite(since) ? since : undefined }, onEnd];
  }
  return [{ kind: "none" }, onEnd];
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
      <g className="cs-line-behind">
        {[-46, -6, 34, 74, 114, 154, 194, 234, 274, 314].filter((x) => Math.abs(x - you) > 30 && (state !== "up" || x < you)).map((x) => (
          <circle key={x} cx={x} cy="86" r="11" className="cs-line-seat" />
        ))}
      </g>
      <g className="cs-line-me">
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
      </g>
      {state === "up" ? (
        <g className="cs-line-doorg">
          <rect x="300" y="58" width="56" height="56" rx="16" className="cs-line-door" />
          <svg x="312" y="70" width="32" height="32" className="cs-line-mark">
            <FlatMark />
          </svg>
        </g>
      ) : null}
    </svg>
  );
}

/** The arrow at the foot of the first screen (Sam, 19 Nov 2026: "a centered
 *  arrow at the bottom of the page that someone can click on that scrolls
 *  down to see all the benefits of being a blacksburg plus member"). It
 *  bobs gently until the page moves, then steps aside. */
function MoreArrow() {
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chev = el.querySelector("i");
    const bob = !stillMotion() && chev && typeof chev.animate === "function"
      ? chev.animate([{ transform: "translateY(0)" }, { transform: "translateY(5px)" }, { transform: "translateY(0)" }], { duration: 1600, iterations: Infinity, easing: "ease-in-out", delay: 1200 })
      : null;
    const onScroll = () => {
      const gone = window.scrollY > 48;
      if (gone) el.dataset.gone = "";
      else delete el.dataset.gone;
      if (bob) (gone ? bob.pause() : bob.play());
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      bob?.cancel();
    };
  }, []);
  return (
    <button
      ref={ref}
      type="button"
      className="cs-down"
      onClick={() => document.getElementById("cs-more")?.scrollIntoView({ behavior: stillMotion() ? "auto" : "smooth", block: "start" })}
    >
      <span>See everything Plus gets you</span>
      <i aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 5v13M6 12.5l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </i>
    </button>
  );
}

/** The "You're up" page and its siblings (in line, ran out, not in line):
 *  the line and the words on the first screen, the arrow at its foot, and
 *  everything a Blacksburg Plus member gets below it. `act` is the page's
 *  one action, said again at the end and on a place's pop-up. */
function Up({ state, children, act }: { state: State["kind"]; children: ReactNode; act?: { label: string; go: () => void } }) {
  const [placeOpen, setPlaceOpen] = useState<PlacePopupPlace | null>(null);
  /* A computer gets its own take of each part (routes/ClaimDesk.tsx). */
  const desk = useMedia("(min-width: 1024px)");
  const { track } = useEventTracking();
  return (
    <Page title="Claim your seat · Tapin Plus" className="tpa tpa-home tps cs cs-up">
      <div className="cs-first">
        <div className="cs-top">
          <BackPill />
        </div>
        {desk ? <DeskSonar up={state === "out"} /> : <Line state={state === "out" ? "up" : state === "ended" ? "back" : "wait"} />}
        <div className="cs-up-body">{children}</div>
        <MoreArrow />
      </div>
      <div id="cs-more" className="cs-more">
        <div className="cs-col">
          <h2 className="cs-h">What you get as a Blacksburg Plus member</h2>
          {desk ? <DeskRows onOpen={setPlaceOpen} /> : <ClaimRail onOpen={setPlaceOpen} />}
          <Value desk={desk} />
        </div>
        <Questions />
        {act ? (
          <div className="cs-col cs-again">
            <button type="button" className="mv-cta mv-cta-dark" onClick={act.go}>
              {act.label}
            </button>
          </div>
        ) : null}
        <div className="mv cs-foot">
          <Foot promise={false} onMail={() => track("plus_claim_email")} />
        </div>
      </div>
      {placeOpen ? (
        <PlacePopup
          place={placeOpen}
          cta={act?.label ?? "Got it"}
          onClose={() => setPlaceOpen(null)}
          onJoin={() => {
            setPlaceOpen(null);
            act?.go();
          }}
        />
      ) : null}
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
const WORTH_NOTE = "*Our estimate for about $100 a month of orders at Plus spots.";

/* The places row, at the top of the offer (Sam, 19 Nov 2026: "we should
   have the list of merchants at the top I think, that carousel"): the main
   page's cards, drifting as its ticker does (shell/useTicker.ts), drawn
   twice so the drift wraps, with a pause. */
function ClaimRail({ onOpen }: { onOpen: (p: PlacePopupPlace) => void }) {
  const cards = allRailCards();
  const railRef = useRef<HTMLUListElement | null>(null);
  const [paused, setPaused] = useState(false);
  useTicker(railRef, true, paused, "claim");
  return (
    <section className="tpa-places tpw tpw-b cs-rail" aria-label="Where you can use Plus">
      <div className="tpa-rail-bar cs-rail-bar">
        <p className="tpa-places-sub">8 Blacksburg spots. Open a card to see what Plus covers&nbsp;there.</p>
        <div className="tpa-rail-arrows">
          <button type="button" className="tpa-rail-arrow tpa-rail-pause" aria-label={paused ? "Play the places" : "Pause the places"} aria-pressed={paused} onClick={() => setPaused((v) => !v)}>
            {paused ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.5 6v12M15.5 6v12" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <ul className="tpa-rail" ref={railRef} data-ticker="">
        {[false, true].map((copy) =>
          cards.map((v) => (
            <li key={`${copy ? "copy-" : ""}${v.id}`} className="tpa-place" data-ticker-copy={copy ? "" : undefined} aria-hidden={copy || undefined}>
              <button
                type="button"
                className="tpa-place-open"
                tabIndex={copy ? -1 : undefined}
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
          )),
        )}
      </ul>
    </section>
  );
}

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
        <div className="cv-c-pair" style={price ? undefined : { visibility: "hidden" }}>
          <div>
            <small>You pay</small>
            <b>{same ? monthly : first}</b>
            <span>{same ? "a month" : `first month, then ${monthly}`}</span>
          </div>
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
function Questions({ member = false }: { member?: boolean } = {}) {
  const { price } = usePlusPriceLoad();
  const monthly = usd(price?.monthly);
  const faq = [
    /* A member has claimed already: nothing to explain about claiming. */
    ...(member ? [] : [{
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

function Offer({ invite, onEnd, onPreviewClaim }: { invite: SeatInvite; onEnd: () => void; onPreviewClaim?: () => void }) {
  const { track } = useEventTracking();
  const desk = useMedia("(min-width: 1024px)");
  const [placeOpen, setPlaceOpen] = useState<PlacePopupPlace | null>(null);
  const claim = (where: string, el?: HTMLElement | null) => {
    /* A preview never reaches the checkout (model/claim.ts). */
    if (onPreviewClaim) {
      onPreviewClaim();
      return;
    }
    track("plus_claim_clicked", { where });
    openPlusCheckout("claim", el ?? null);
  };
  return (
    <Page title="Claim your seat · Tapin Plus" className="tpa tpa-home tps cs cs-offer">
      <div className="cs-col">
        <div className="cs-top">
          <BackPill />
        </div>
        <Held endsMs={invite.endsMs} onEnd={onEnd} />
        <h1 className="cs-h">Claim your seat</h1>
        {desk ? <DeskRows onOpen={setPlaceOpen} /> : <ClaimRail onOpen={setPlaceOpen} />}
        <Value desk={desk} />
      </div>


      <Questions />

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
   from selling to using: three steps to the first $5, the places, what's
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
const FIRST_STEPS = [
  { h: "Get the Tapin app", p: "Sign in with the number you used here. Your credit is waiting." },
  { h: "Pick a Plus spot", p: "Order in the app, or show your phone at the counter." },
  { h: "Your $5 comes off", p: "At each Plus spot, every month. On other orders, 15% off once a day." },
];

function Claimed({ preview }: { preview: boolean }) {
  const four = useFour();
  const { userSession } = useAuth();
  const { track } = useEventTracking();
  const desk = useMedia("(min-width: 1024px)");
  /* The line stands up beside the words only where there is room for both. */
  const wide = useMedia("(min-width: 1280px)");
  const root = useRef<HTMLDivElement | null>(null);
  const [round, setRound] = useState(0);
  const [placeOpen, setPlaceOpen] = useState<PlacePopupPlace | null>(null);
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
        <main className="sp-right">
          <section className="sp-sec" aria-labelledby="cl-start">
            <span className="sp-kick">Start here</span>
            <h2 id="cl-start" className="sp-h2">
              Your first $5, in three steps
            </h2>
            <ol className="cl-steps">
              {FIRST_STEPS.map((s) => (
                <li key={s.h}>
                  <b>{s.h}</b>
                  <span>{s.p}</span>
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
            <Foot onMail={() => track("plus_claim_email")} />
          </div>
        </main>
      </div>
      {placeOpen ? <PlacePopup place={placeOpen} cta="Got it" onClose={() => setPlaceOpen(null)} onJoin={() => setPlaceOpen(null)} /> : null}
    </Page>
  );
}

/** The preview's way between the states (?claimv=, model/claim.ts). */
function PreviewBar({ at, go }: { at: ClaimPreview; go: (v: ClaimPreview) => void }) {
  const steps: ReadonlyArray<[ClaimPreview, string]> = [
    ["out", "Signed out"],
    ["listed", "Not open yet"],
    ["none", "Not in line"],
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

/* ══ SPLIT, ON A COMPUTER (Sam, 19 Nov 2026: "I love split! let's do that
   one") ═════════════════════════════════════════════════════════════════════
   Every state of /claim from 1024px: the status in a dark panel on the left
   that stays while the page scrolls (the line standing up beside the words,
   the one action in white), and on the right the places, what you get, what
   $5 looks like and the questions. The claimed moment keeps its own page. */
type SplitCopy = { title: string; lede: string; since?: string; fine?: string; up: boolean; act?: { label: string; go: (el?: HTMLElement | null) => void }; held?: ReactNode; popupCta: string };

function Split({ copy }: { copy: SplitCopy }) {
  const [placeOpen, setPlaceOpen] = useState<PlacePopupPlace | null>(null);
  const { track } = useEventTracking();
  return (
    <Page title="Claim your seat · Tapin Plus" className="tpa tpa-home tps cs cs-split">
      <div className="sp">
        <aside className="sp-left">
          <Link className="sp-brand" to="/">
            <FlatMark className="sp-mark" />
            Tapin Plus Blacksburg
          </Link>
          <div className="sp-mid">
            <DeskSonarV up={copy.up} />
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
                <button type="button" className="sp-cta" onClick={(e) => copy.act?.go(e.currentTarget)}>
                  {copy.act.label}
                </button>
              ) : null}
              {copy.fine ? <p className="sp-fine">{copy.fine}</p> : null}
            </div>
          </div>
          <p className="sp-hint">Scroll for everything Plus gets you</p>
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
            <Value desk />
          </section>
          <Questions />
          <div className="mv cs-foot">
            <Foot promise={false} onMail={() => track("plus_claim_email")} />
          </div>
        </main>
      </div>
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
  const desk = useMedia("(min-width: 1024px)");
  const kind = state.kind;
  useEffect(() => {
    if (kind !== "loading" && !pv) track("plus_claim_viewed", { state: kind });
  }, [kind, pv, track]);
  const bar = pv ? <PreviewBar at={pv} go={setPv} /> : null;

  if (state.kind === "member") return <Navigate to="/in" replace />;
  if (state.kind === "claimed")
    return (
      <>
        {bar}
        <Claimed preview={!!pv} />
      </>
    );
  if (state.kind === "open" && desk) {
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
          }}
        />
      </>
    );
  }
  if (state.kind === "open")
    return (
      <>
        {bar}
        <Offer invite={state.invite} onEnd={onEnd} onPreviewClaim={pv ? () => setPv("claimed") : undefined} />
      </>
    );
  if (state.kind === "loading") return <Page title="Claim your seat · Tapin Plus" className="tpa cs cs-up" children={null} />;
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

  if (desk) {
    const copy: SplitCopy =
      state.kind === "out"
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
            : { title: "You’re not in line yet.", lede: "Tapin Plus is invite only. Join the waitlist and we’ll text you when your seat opens.", up: false, act, popupCta: "Join the waitlist" };
    return (
      <>
        {bar}
        <Split copy={copy} />
      </>
    );
  }

  return (
    <>
    {bar}
    <Up state={state.kind} act={act}>
      {state.kind === "out" ? (
        <>
          <h1 className="cs-up-h">You’re up.</h1>
          <p className="cs-lede">A Tapin Plus seat just opened for you. Sign in with the number you joined the waitlist with to claim&nbsp;it.</p>
          <button
            type="button"
            className="mv-cta mv-cta-dark"
            onClick={signIn}
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
          {/* When they joined, from their own account (model/waitlist.ts). */}
          {state.since ? (
            <p className="cs-since tnum">
              <i aria-hidden="true" />
              On the list since {new Date(state.since).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            </p>
          ) : null}
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
    </>
  );
}
