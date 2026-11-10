import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { Link, useLocation, useParams } from "react-router-dom";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import {
  DELIGHTS,
  FROM_MAX,
  giftWho,
  NOTE_MAX,
  previewGift,
  SAMPLE_GIFT,
  SAMPLE_PHOTO,
  SCENE_GROUPS,
  SCENE_ORDER,
  SCENES,
  type Delight,
  type Gift,
  type SceneId, DEFAULT_NOTE } from "../model/gift";
import { clearGiftDraft, defaultGiftScene, setGiftDraft, startGiftOver, useGiftDraft } from "../model/giftDraft";
import { keepQuick, keepStep, keptQuick, keptSomething, type ResumeStep } from "../model/checkoutResume";
import { ResumeContext, ResumeLine, type Resume } from "../shell/ResumeLine";
import { PhotoError, shrinkPhoto } from "../model/giftPhoto";
import { playDelight } from "./giftDelight";
import { GiftAfter } from "./giftAfter";
import { claimGift, giftOf, lookupGift } from "../model/giftApi";
import { useAuth } from "../context/auth_context";
import { supabase } from "../supabase";
import { openPlusSignIn } from "../shell/PlusCheckout";
import { takeKey } from "../model/redact";
import { appHref } from "../shell/GetTheApp";
import { useDockPulse } from "../shell/dockPulse";
import { lockScroll } from "../shell/scrollLock";
import { DockArrow } from "../shell/DockArrow";
import { StepBars, resetStepBars } from "../shell/StepBars";
import { BackArrow } from "../shell/BackArrow";
import { reducedMotion } from "./parents_kit";
import { SealFace } from "./giftSeals";
import { GiftSentContext, type GiftSent, type GiftSentHost } from "../shell/giftSent";

/* ══ THE GIFT PAGE (Sam, 6 Nov 2026; picked: A · Letter) ════════════════════
   What a student opens from their text when a parent has bought them Tapin
   Plus (/gift/{token}, the key in the text; gift_lookup in
   docs/parents/API.md). A maroon field and a cream envelope sealed with the
   Plus mark on orange. Their tap opens it: the seal pops, the flap swings up
   and over (passing behind the letter halfway), the letter rises out, the
   envelope drops away and the letter settles into the page to be read. Then
   what's in Plus, and the one thing left to do: get the app and sign in with
   their number (Plus is already on it), or text a thank-you home.

   /gift/sample is the sample (SAMPLE_GIFT), for "See what they'll see" on
   /parents. The key leaves the address bar as the page opens (takeKey), so
   it's never in a screenshot or sent to PostHog (redactUrl).

   The town palette (no gold on new Plus surfaces): maroon #861F41, burnt
   orange #E5751F, the collage's cream paper #ECE5D5, ink. Motion is the Web
   Animations API only (no CSS keyframes); with reduced motion the tap opens
   it straight to the letter. */

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** The letter's words when a gift came with no note (older gifts; new ones
    save DEFAULT_NOTE). */
const NO_NOTE = DEFAULT_NOTE;
/** Family words read as "your mom" in the heading; a name stays a name. */
const FAMILY = /^(mom|mum|mommy|mama|mother|dad|daddy|papa|father|grandma|grandpa|granny|nana|grandmother|grandfather|your parent|parents|mom and dad|mom & dad|dad and mom)$/i;
function whoInHeading(from: string, afterName: boolean): string {
  const f = from.trim();
  if (!FAMILY.test(f)) return f;
  const w = /^your /i.test(f) ? f.slice(5).toLowerCase() : f.toLowerCase();
  return `${afterName ? "your" : "Your"} ${w}`;
}

/* Each background's own drift (gift.css .gft-scene-pat): one tile's travel
   per loop, so it never seams; scenery breathes instead; the sunburst turns.
   Slow enough to notice only when you look. Maroon is a plain field: still.
   The icons inside each tile move on their own clocks as well (gift.css
   GENERATED, tools/patterns/animate.py). Picnic and flannel drift by their
   live tile (4 and 3 checks); airmail's stripes and the snow of Christmas
   and Snow travel inside the tile, so their layers stay put. */
/* Where each background's drift had got to, so a replay (the builder seals
   the card and opens it again on every pick of "When they open it") picks
   the drift up where it was instead of jolting back to the start (Sam, 6 Nov
   2026: "the animation in the background does this weird jolt thing, it
   resets"). */
const driftAt = new Map<string, number>();
const SCENE_MOTION: Partial<Record<string, { kf: Keyframe[]; ms: number; alternate?: boolean }>> = {
  picnic: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-144px, -144px)" }], ms: 28000 },
  night: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-220px, 0)" }], ms: 60000 },
  confetti: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(0, 180px)" }], ms: 14000 },
  sunrise: { kf: [{ transform: "scale(1)" }, { transform: "scale(1.04)" }], ms: 6000, alternate: true },
  ridge: { kf: [{ transform: "scale(1)" }, { transform: "scale(1.03)" }], ms: 7000, alternate: true },
  hearts: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(0, -160px)" }], ms: 16000 },
  /* The cute four (6 Nov 2026): sprinkles fall, daisies and smileys float,
     the kisses slide along. */
  sprinkles: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(0, 120px)" }], ms: 12000 },
  daisies: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-180px, -180px)" }], ms: 40000 },
  xoxo: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-96px, 0)" }], ms: 9000 },
  smileys: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(0, -160px)" }], ms: 22000 },
  /* Seasonal: the stars rise; the snowflakes and presents fall. */
  hanukkah: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(0, -160px)" }], ms: 26000 },
  holiday: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(0, 160px)" }], ms: 16000 },
  thanksgiving: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-170px, 170px)" }], ms: 30000 },
  newyear: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(0, -170px)" }], ms: 24000 },
  flannel: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-192px, -192px)" }], ms: 54000 },
  lunch: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-220px, -220px)" }], ms: 44000 },
  sunburst: { kf: [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], ms: 120000 },
  leaves: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-220px, 220px)" }], ms: 26000 },
};
const GIFT_KEY = "tp_gift_v1";
const SAMPLE_PHOTO_SRC = asset(SAMPLE_PHOTO);
export { SAMPLE_PHOTO_SRC };

type Load =
  | { state: "loading" }
  | { state: "ok"; gift: Gift; sample: boolean }
  /* Claimed, cancelled by the parent, or expired unclaimed (gift_lookup). */
  | { state: "ended"; to: string | null; from: string; why: "claimed" | "cancelled" | "expired" }
  | { state: "missing" }
  /* The lookup failed for another reason (offline, busy): the link may be
     fine, so it's worth another try. */
  | { state: "retry" };

/* Claiming (claim_gift): signed in with the number it was sent to, the
   parent's card is charged and their Plus starts. */
type Claim = { state: "idle" } | { state: "signing_in" } | { state: "working" } | { state: "done" } | { state: "error"; message: string };

export default function GiftPage() {
  const { token: fromPath } = useParams();
  const { search } = useLocation();
  const { track } = useEventTracking();
  const isSample = fromPath === "sample";
  /* The design picker over the sample: local dev, or ?pick anywhere. */
  const [showPicker] = useState(
    () => import.meta.env.DEV || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("pick")),
  );
  const [token] = useState(() =>
    isSample ? null : takeKey(GIFT_KEY, fromPath ?? null, `/gift${typeof window !== "undefined" ? window.location.search : ""}`),
  );
  const [load, setLoad] = useState<Load>(() => {
    if (isSample) return { state: "ok", gift: previewGift(search, SAMPLE_PHOTO_SRC), sample: true };
    /* Local dev with no key: the sample, so the page can be seen. */
    if (!token && import.meta.env.DEV) return { state: "ok", gift: previewGift(search, SAMPLE_PHOTO_SRC), sample: true };
    return token ? { state: "loading" } : { state: "missing" };
  });

  useEffect(() => {
    if (!token || load.state !== "loading") return;
    let live = true;
    lookupGift(token).then(
      (found) => {
        if (!live) return;
        if (!found) return setLoad({ state: "missing" });
        const gift = giftOf(found);
        setLoad(found.state === "open" ? { state: "ok", sample: false, gift } : { state: "ended", to: gift.to, from: gift.from, why: found.state });
      },
      () => {
        if (live) setLoad({ state: "retry" });
      },
    );
    return () => {
      live = false;
    };
  }, [token, load.state]);

  /* Claim my gift: signed out, the Plus sign-in sheet first (it closes once
     signed in), then the claim. */
  const { accessToken } = useAuth();
  const [claim, setClaim] = useState<Claim>({ state: "idle" });
  const runClaim = async (giftToken: string, access: string) => {
    setClaim({ state: "working" });
    try {
      await claimGift(giftToken, access);
      track("gift_claimed", {});
      setClaim({ state: "done" });
    } catch (err) {
      track("gift_claim_failed", { error: (err as Error).message });
      setClaim({ state: "error", message: (err as Error).message });
    }
  };
  const startClaim = () => {
    if (!token) return;
    track("gift_claim", { sample: false });
    if (accessToken) return void runClaim(token, accessToken);
    setClaim({ state: "signing_in" });
    openPlusSignIn("gift_claim");
  };
  useEffect(() => {
    if (claim.state === "signing_in" && accessToken && token) void runClaim(token, accessToken);
    // On signing in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, claim.state]);

  /* One view per page, with what it showed (never the key or the note). */
  const viewed = useRef(false);
  useEffect(() => {
    if (load.state === "loading" || viewed.current) return;
    viewed.current = true;
    track("gift_page_view", {
      state: load.state,
      sample: load.state === "ok" ? load.sample : false,
      has_note: load.state === "ok" ? !!load.gift.note : false,
    });
  }, [load, track]);

  /* A fixed title, never the sign-off (Sam, 9 Nov 2026): document.title is
     recorded by session replay and sent with $pageview, so a family's own
     words ("A gift from Mom Sarah") must not be in it. */
  useEffect(() => {
    const was = document.title;
    document.title = load.state === "ok" || load.state === "ended" ? "A gift for you · Tapin Plus" : "Tapin Plus";
    return () => {
      document.title = was;
    };
  }, [load]);

  /* ph-no-capture: the note, the names and the masked number are a family's
     own words, so session replay and autocapture skip this page's content. */
  if (load.state === "ok" && !load.sample && (claim.state === "done" || claim.state === "error"))
    return <ClaimResult claim={claim} gift={load.gift} onBack={() => setClaim({ state: "idle" })} />;
  if (load.state === "ok") {
    if (!load.sample)
      return (
        <div className="gft-wrap">
          <Letter
            gift={load.gift}
            sample={false}
            cta={{ label: claim.state === "working" ? "Claiming…" : "Claim my gift", onClick: () => claim.state !== "working" && startClaim() }}
          />
        </div>
      );
    return (
      <>
        <div className="gft-wrap">
          <Letter key={`${load.gift.scene}-${!!load.gift.photo}`} gift={load.gift} sample />
        </div>
        {showPicker ? (
          <Picker
            gift={load.gift}
            onChange={(next) => {
              setLoad({ ...load, gift: { ...load.gift, ...next } });
              const q = new URLSearchParams(window.location.search);
              q.set("bg", next.scene ?? load.gift.scene);
              const photo = next.photo !== undefined ? next.photo : load.gift.photo;
              if (photo) q.set("photo", "1");
              else q.delete("photo");
              window.history.replaceState(window.history.state, "", `${window.location.pathname}?${q.toString()}`);
            }}
          />
        ) : null}
      </>
    );
  }
  return (
    <div className="gft gft-a ph-no-capture" data-state="plain">
      <header className="gft-a-band" aria-busy={load.state === "loading" ? true : undefined}>
        {load.state === "loading" ? (
          <>
            <span className="gft-sr">Opening your gift</span>
            <div className="gft-a-stage" aria-hidden="true">
              <div className="gft-a-shell">
                {/* No seal until the gift (and so its background's seal) is
                    known: the brand seal swapping for the gift's own flickered. */}
                <Envelope scene={null} />
              </div>
            </div>
          </>
        ) : load.state === "ended" && load.why === "claimed" ? (
          <div className="gft-plain">
            <h1 className="gft-h1">
              {load.from}’s gift <span className="gft-nowrap">is claimed</span>
            </h1>
            <p className="gft-plain-line">Tapin Plus is on. Sign in to the Tapin app with the number it was sent to.</p>
            <a className="gft-open" href={appHref()} onClick={() => track("gift_get_app", { state: "claimed" })}>
              Get the app
            </a>
          </div>
        ) : load.state === "ended" ? (
          <div className="gft-plain">
            <h1 className="gft-h1">
              {load.from}’s gift <span className="gft-nowrap">{load.why === "expired" ? "has expired" : "was cancelled"}</span>
            </h1>
            <p className="gft-plain-line">
              {load.why === "expired" ? "It wasn’t claimed in time." : "It can’t be claimed anymore."} You can still join on your own.
            </p>
            <Link className="gft-open" to="/">
              See Tapin Plus
            </Link>
          </div>
        ) : load.state === "retry" ? (
          <div className="gft-plain">
            <h1 className="gft-h1">
              Your gift didn’t <span className="gft-nowrap">load</span>
            </h1>
            <p className="gft-plain-line">Check your connection and try again.</p>
            <button type="button" className="gft-open" onClick={() => setLoad({ state: "loading" })}>
              Try again
            </button>
          </div>
        ) : (
          <div className="gft-plain">
            <h1 className="gft-h1">
              We couldn’t open <span className="gft-nowrap">this gift</span>
            </h1>
            <p className="gft-plain-line">Check the link in your text. If it still doesn’t open, ask whoever sent it.</p>
            <Link className="gft-open" to="/">
              See Tapin Plus
            </Link>
          </div>
        )}
      </header>
    </div>
  );
}

/* ── After Claim my gift ─────────────────────────────────────────────────────
   Claimed: Plus is on, so the app. Refused: what happened, in the backend's
   words, and the way on from there. A different number signs out, to sign
   in again with the one it was sent to. */
function ClaimResult({ claim, gift, onBack }: { claim: Claim; gift: Gift; onBack: () => void }) {
  const { track } = useEventTracking();
  const from = gift.from === "Your parent" ? "your parent" : gift.from;
  let title: React.ReactNode;
  let line: string;
  let action: React.ReactNode;
  const back = (
    <button type="button" className="gft-plain-link" onClick={onBack}>
      Back to your gift
    </button>
  );
  if (claim.state === "done") {
    title = (
      <>
        Your Tapin Plus <span className="gft-nowrap">is on</span>
      </>
    );
    line = `A gift from ${gift.from}. Sign in to the Tapin app with ${gift.masked} to use it.`;
    action = (
      <a className="gft-open" href={appHref()} onClick={() => track("gift_get_app", { state: "claimed_now" })}>
        Get the app
      </a>
    );
  } else {
    const message = claim.state === "error" ? claim.message : "";
    if (/different number/i.test(message)) {
      title = (
        <>
          This gift is for <span className="gft-nowrap">{gift.masked}</span>
        </>
      );
      line = `You’re signed in with another number. Sign out, then claim it signed in with ${gift.masked}.`;
      action = (
        <button
          type="button"
          className="gft-open"
          onClick={() => {
            void supabase.auth.signOut();
            onBack();
          }}
        >
          Sign out
        </button>
      );
    } else if (/payment/i.test(message)) {
      title = (
        <>
          The gift’s payment <span className="gft-nowrap">didn’t go through</span>
        </>
      );
      line = `Let ${from} know, so they can check their card. Then try again.`;
      action = (
        <button type="button" className="gft-open" onClick={onBack}>
          Try again
        </button>
      );
    } else if (/no longer valid/i.test(message)) {
      title = (
        <>
          This gift can’t <span className="gft-nowrap">be claimed</span>
        </>
      );
      line = `You may already have Tapin Plus, or its offer may have ended or be one you’ve had before. Let ${from} know.`;
      action = (
        <Link className="gft-open" to="/">
          See Tapin Plus
        </Link>
      );
    } else {
      title = message || "Something went wrong";
      line = "Try again in a moment.";
      action = (
        <button type="button" className="gft-open" onClick={onBack}>
          Try again
        </button>
      );
    }
  }
  return (
    <div className="gft gft-a ph-no-capture" data-state="plain">
      <header className="gft-a-band">
        <div className="gft-plain" role="status">
          <h1 className="gft-h1">{title}</h1>
          <p className="gft-plain-line tnum">{line}</p>
          {action}
          {claim.state === "done" ? null : back}
        </div>
      </header>
    </div>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

/** The care package: brown kraft (the inside, the pocket, the flap), twine
 *  tied round it, and a wax seal that matches the background (giftSeals.tsx;
 *  Sam, 6 Nov 2026: "I think it'd be fun if we had a seal that matched the
 *  background theme and color a bit more"). Maroon keeps the flat Plus mark. */
function Envelope({
  scene,
  flap,
  seal,
  extra,
}: {
  /** Its seal's background; null draws no seal (still loading). */
  scene: SceneId | null;
  flap?: React.Ref<HTMLSpanElement>;
  seal?: React.Ref<HTMLSpanElement>;
  extra?: React.Ref<HTMLSpanElement>;
}) {
  return (
    <>
      <span className="gft-a-back" />
      <span className="gft-a-pocket" />
      <span ref={flap} className="gft-a-flap" />
      <span ref={extra} className="gft-a-extra">
        <i className="gft-a-twine-h" />
        <i className="gft-a-twine-v" />
      </span>
      {scene ? (
        <span ref={seal} className="gft-a-seal" data-seal={scene}>
          <SealFace scene={scene} />
        </span>
      ) : null}
    </>
  );
}

type Go = (el: Element | null | undefined, kf: Keyframe[], o: KeyframeAnimationOptions) => Animation | undefined;

/** The care package's first beats, shared by the gift page and the parents
 *  page's envelope so they open the same way: the twine draws in to the
 *  knot under the seal (0–420ms), the seal is pulled up and off (380–960ms),
 *  and the flap folds back, darkening as it turns edge-on to the light and
 *  showing its shaded inside (460–960ms). The card's rise follows at 880. */
function unwrap(go: Go, extra: HTMLElement | null, seal: HTMLElement | null, flap: HTMLElement | null) {
  const twineH = extra?.querySelector<HTMLElement>(".gft-a-twine-h");
  const twineV = extra?.querySelector<HTMLElement>(".gft-a-twine-v");
  if (twineH) twineH.style.transformOrigin = "50% 50%";
  if (twineV) twineV.style.transformOrigin = "50% 62%";
  go(twineH, [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: 420, easing: "cubic-bezier(.6,0,.2,1)" });
  go(twineV, [{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: 420, easing: "cubic-bezier(.6,0,.2,1)" });
  go(seal, [
    { transform: "none", opacity: 1 },
    { transform: "translateY(5px) scale(.96)", opacity: 1, offset: 0.16 },
    { transform: "translateY(-150px) rotate(-10deg)", opacity: 0 },
  ], { duration: 580, delay: 380, easing: "cubic-bezier(.45,0,.3,1)" });
  /* The perspective is the flap's own, not the stage's: a perspective on
     the stage put everything in it in a 3D context, where Chrome stopped
     honouring the clips that hide the card (its sleeve, the pocket's V). */
  go(flap, [
    { transform: "perspective(1800px) rotateX(0deg)", zIndex: 4, backgroundColor: "var(--env-flap)" },
    { transform: "perspective(1800px) rotateX(90deg)", zIndex: 4, backgroundColor: "var(--env-edge)", offset: 0.5 },
    { transform: "perspective(1800px) rotateX(90deg)", zIndex: 1, backgroundColor: "var(--env-edge)", offset: 0.501 },
    { transform: "perspective(1800px) rotateX(180deg)", zIndex: 1, backgroundColor: "var(--env-inside)" },
  ], { duration: 500, delay: 460, easing: "cubic-bezier(.4,0,.2,1)" });
}

/* ══ THE CARE PACKAGE, AS A PICTURE (the parents page's callout) ═══════════
   The gift page's own envelope and opening, played once when it scrolls
   into view (`play`), so a parent sees exactly what their student will. It
   stops with the card almost all the way out, its foot still tucked in the
   pocket, so the whole note reads. Reduced motion: shown already open. */
/* How much less the card peeks at rest on a computer, and how much more on
   hover. */
const HOVER_PEEK = 90;
/* At rest on a computer the card is tucked this far below its full peek
   (Sam, 6 Nov 2026: "have the card be tucked into the envelope a bit more
   unless it's hovered on, [its] current resting state [the] state when it's
   hovered on"): hover brings it HOVER_PEEK out, to where it used to rest. */
const REST_TUCK = 76 + HOVER_PEEK;
/* On hover only the card moves, and only a little (Sam, 6 Nov 2026: "the
   envelope shouldn't move, and the card itself should only animate
   slightly"). */
const HOVER_LIFT = 16;
/* How far the card rests tucked in on a phone (gift.css takes the same off
   the room above it). */
const PHONE_TUCK = 110;
const hoverPeek = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(min-width: 1024px) and (hover: hover)").matches;

export function EnvelopeDemo({
  play,
  scene = "maroon",
  gift,
  onPick,
}: {
  play: boolean;
  /** The background picked, so the seal matches it. */
  scene?: SceneId;
  gift: Pick<Gift, "to" | "from" | "note"> & { photo?: string | null };
  /** Clicking the envelope does what the band's button does. */
  onPick?: () => void;
}) {
  const seal = useRef<HTMLSpanElement | null>(null);
  const flap = useRef<HTMLSpanElement | null>(null);
  const extra = useRef<HTMLSpanElement | null>(null);
  const letter = useRef<HTMLDivElement | null>(null);
  const runs = useRef<Animation[]>([]);
  useEffect(() => () => runs.current.forEach((a) => a.cancel()), []);
  useEffect(() => {
    const el = letter.current;
    if (!play || !el) return;
    const quick = reducedMotion();
    const go: Go = (node, kf, o) => {
      const a = node?.animate?.(kf, { fill: "both", easing: EASE, ...o, ...(quick ? { duration: 0, delay: 0 } : {}) });
      if (a) runs.current.push(a);
      return a;
    };
    unwrap(go, extra.current, seal.current, flap.current);
    /* Peeking (Sam, 6 Nov 2026: "the card should be peeking out here"):
       up until the words clear the envelope's top edge, while the rest of
       the card (a letter longer than its words) stays in the pocket and
       fills the V, so the dark inside never shows. The clip's line rides
       with it, on the envelope's foot. */
    const sig = el.querySelector<HTMLElement>(".gft-a-sig");
    const words = sig ? sig.offsetTop + sig.offsetHeight : el.offsetHeight;
    const full = Math.min(words + 12 + 10, el.offsetHeight - 140);
    /* A computer (Sam, 6 Nov 2026: "still a bit too tall ... Maybe we
       don't have it peeking all the way out but when someone hovers on it
       on desktop it peeks out a bit more"): the card rests HOVER_PEEK lower,
       so the band is shorter, and on hover the envelope drops away by that
       much while the card holds still (gift.css: the band clips the
       envelope's foot). A phone tucks it PHONE_TUCK in too (Sam, 6 Nov
       2026: "maybe this isn't as tall on mobile?"): the photo and the
       note's first lines show, the rest stays in the pocket. */
    const lift = Math.max(0, full - (hoverPeek() ? REST_TUCK : PHONE_TUCK));
    /* It starts up as the flap passes upright (~710ms), so the opening
       never shows a still, blank card (Sam, 6 Nov 2026). The sleeve keeps
       its foot hidden under the envelope. */
    go(el, [{ transform: "translateY(0)" }, { transform: `translateY(${-lift}px)` }], { duration: 820, delay: 680 });
  }, [play]);
  const stage = useRef<HTMLDivElement | null>(null);
  /* The hover: the envelope stays put; the card rises a little out of it
     with the slightest tilt, its shadow a touch deeper. One animation made
     once and run forward on enter, backward on leave, so a quick in-and-out
     never stacks or jumps. `translate` and `rotate` compose with the
     opening's `transform`, so nothing fights it. */
  const hovered = useRef<Animation[] | null>(null);
  const peekMore = (on: boolean) => {
    if (!play || !hoverPeek() || reducedMotion()) return;
    const el = letter.current;
    if (!el) return;
    if (!hovered.current) {
      hovered.current = [
        el.animate(
          [
            { translate: "0 0", rotate: "0deg", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.14)" },
            { translate: `0 ${-HOVER_LIFT}px`, rotate: "-0.6deg", boxShadow: "0 10px 24px rgba(0, 0, 0, 0.2)" },
          ],
          { duration: 360, fill: "both", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        ),
      ];
      hovered.current.forEach((a) => a.pause());
    }
    hovered.current.forEach((a) => {
      a.updatePlaybackRate(on ? 1 : -1.2);
      a.play();
    });
  };
  return (
    <div className="gft gft-a gft-mini" data-state="sealed" aria-hidden="true">
      <div
        ref={stage}
        className="gft-a-stage"
        data-pickable={onPick ? "" : undefined}
        onMouseEnter={() => peekMore(true)}
        onMouseLeave={() => peekMore(false)}
        onClick={onPick}
      >
        <div className="gft-a-shell">
          <Envelope scene={scene} flap={flap} seal={seal} extra={extra} />
        </div>
        <div className="gft-a-sleeve">
          <div ref={letter} className="gft-a-letter">
            <div className="gft-a-head">
              <span>For {gift.to ?? "you"}</span>
            </div>
            {/* A photo, as the gift page prints it (Sam, 6 Nov 2026: "do we
                want to show here that it comes with an image?"). */}
            {gift.photo ? <img className="gft-a-photo" src={gift.photo} alt="" decoding="async" /> : null}
            {gift.note ? <p className="gft-a-note">{gift.note}</p> : null}
            <p className="gft-a-sig">{gift.from}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The children of `host` rise in one after another (visible by default;
 *  this only plays when motion is allowed). */
function useRiseIn(host: React.RefObject<HTMLElement | null>, on: boolean, delay = 0) {
  useLayoutEffect(() => {
    if (!on || reducedMotion() || !host.current) return;
    const runs = Array.from(host.current.children).map((el, i) =>
      el.animate(
        [
          { opacity: 0, transform: "translateY(14px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 560, delay: delay + i * 90, easing: EASE, fill: "backwards" },
      ),
    );
    return () => runs.forEach((r) => r.cancel());
  }, [host, on, delay]);
}

/* ══ THE LETTER ═════════════════════════════════════════════════════════════
   One element throughout: the letter is never swapped, only moved (measured
   before and after the envelope lets go of it). */
/** What the dock's button does instead of claiming (the parent's preview:
 *  "Back to checkout", or "Sign up my student" from the parents page). */
export type DockCta = { label: string; onClick: (el: HTMLElement) => void };

export function Letter({
  gift,
  sample,
  preview = false,
  cta,
  onReseal,
  autoOpen = false,
  onStateChange,
  onAddPhoto,
}: {
  gift: Gift;
  sample: boolean;
  preview?: boolean;
  cta?: DockCta;
  /** The builder's replay (Sam, 6 Nov 2026: "after I open a package, the
   *  "open" button would be "close it""): shown once it's open. */
  onReseal?: () => void;
  /** Opens by itself a moment after it appears (the builder, after a pick). */
  autoOpen?: boolean;
  /** Told when it's sealed, opening or open (the builder's replay icon). */
  onStateChange?: (s: "sealed" | "opening" | "open") => void;
  /** The builder: with no photo yet, a placeholder where it would print,
   *  and tapping it picks one (Sam, 9 Nov 2026: "there should be a place
   *  holder image maybe?"). Never on the gift that's sent. */
  onAddPhoto?: () => void;
}) {
  const { track } = useEventTracking();
  const [state, setState] = useState<"sealed" | "opening" | "open">("sealed");
  const onStateRef = useRef(onStateChange);
  onStateRef.current = onStateChange;
  useEffect(() => {
    onStateRef.current?.(state);
  }, [state]);
  const seal = useRef<HTMLSpanElement | null>(null);
  const flap = useRef<HTMLSpanElement | null>(null);
  const extra = useRef<HTMLSpanElement | null>(null);
  const letter = useRef<HTMLDivElement | null>(null);
  const shell = useRef<HTMLDivElement | null>(null);
  const sleeve = useRef<HTMLDivElement | null>(null);
  const title = useRef<HTMLHeadingElement | null>(null);
  const after = useRef<HTMLElement | null>(null);
  const runs = useRef<Animation[]>([]);
  const band = useRef<HTMLElement | null>(null);
  const stopDelight = useRef<(() => void) | null>(null);
  /* What's below the card waits for the opening and its celebration to
     finish (Sam, 7 Nov 2026: "before revealing this section we should allow
     the animation to finish for the card and the 'when they open it'"). */
  const [held, setHeld] = useState(false);
  useEffect(
    () => () => {
      runs.current.forEach((a) => a.cancel());
      stopDelight.current?.();
    },
    [],
  );
  useRiseIn(after, state === "open", 120);
  const [still] = useState(reducedMotion);

  /* ── The letter is a whole card from the start (Sam, 6 Nov 2026: "the
     process of the envelope opening and the card coming out of the
     envelope feels off"). It sits in the envelope at its full length, in a
     sleeve whose bottom edge is the envelope's (gift.css .gft-a-sleeve:
     "the envelope should be masking the card"), so it never grows or
     unrolls: it only moves, and the sleeve's edge follows the envelope
     down as it drops. */
  const ENV_H = 226; /* .gft-a-shell */
  const TOP = 12; /* the letter's top inside the envelope */

  const go = (el: Element | null | undefined, kf: Keyframe[], o: KeyframeAnimationOptions) => {
    const a = el?.animate?.(kf, { fill: "both", easing: EASE, ...o });
    if (a) runs.current.push(a);
    return a;
  };

  /* ── The background, alive (Sam, 6 Nov 2026): a slow drift of its own,
     and its icons moving inside the tile (data-live swaps in the animated
     tile, gift.css GENERATED), both only while the page is shown and the
     band is on screen. Reduced motion: neither, the still tile stays. */
  const scene = useRef<HTMLDivElement | null>(null);
  const pat = useRef<HTMLDivElement | null>(null);
  const drift = useRef<Animation | null>(null);
  useEffect(() => {
    const m = SCENE_MOTION[gift.scene];
    const el = pat.current;
    if (!el || still) return;
    const a =
      m && typeof el.animate === "function"
        ? el.animate(m.kf, {
            duration: m.ms,
            iterations: Infinity,
            easing: m.alternate ? "ease-in-out" : "linear",
            direction: m.alternate ? "alternate" : "normal",
          })
        : null;
    const at = driftAt.get(gift.scene);
    if (a && at != null) a.currentTime = at;
    drift.current = a;
    let onScreen = true;
    const sync = () => {
      const on = onScreen && !document.hidden;
      el.toggleAttribute("data-live", on);
      if (a) {
        if (on) a.play();
        else a.pause();
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    const io =
      typeof IntersectionObserver !== "undefined" && scene.current
        ? new IntersectionObserver(([e]) => {
            onScreen = e.isIntersecting;
            sync();
          })
        : null;
    if (io && scene.current) io.observe(scene.current);
    return () => {
      const t = a?.currentTime;
      if (typeof t === "number") driftAt.set(gift.scene, t);
      a?.cancel();
      el.removeAttribute("data-live");
      drift.current = null;
      document.removeEventListener("visibilitychange", sync);
      io?.disconnect();
    };
  }, [gift.scene, still]);
  /* (The background's swell as the card came out, "bloom", is gone: Sam,
     6 Nov 2026, "I think we can get rid of that ... doesn't make sense
     anymore". The parent's celebration plays there now.) */

  /* The builder's replay: it opens by itself shortly after it appears. */
  useEffect(() => {
    if (!autoOpen) return;
    const t = window.setTimeout(() => void openRef.current(), 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* Focus follows the gift: to the new heading once it's open. Not while
     the builder's panel holds it (a pick replays the opening by itself;
     the parent is still choosing there). */
  const settle = () => {
    if ((document.activeElement as HTMLElement | null)?.closest?.(".gft-preview-panel")) return;
    title.current?.focus({ preventScroll: true });
  };
  const started = useRef(false);
  const openRef = useRef<() => Promise<void>>(async () => {});
  const open = async () => {
    if (state !== "sealed" || started.current) return;
    started.current = true;
    if (!preview) track("gift_opened", { sample, has_note: !!gift.note });
    const el = letter.current;
    if (still || !el) {
      flushSync(() => setState("open"));
      settle();
      return;
    }
    /* Measure the card once its type has landed (Gilroy can arrive late and
       re-wrap the note): the clip's line is set from this height. */
    await Promise.race([document.fonts?.ready, new Promise((r) => window.setTimeout(r, 500))]);
    setState("opening");
    /* ── Opening the care package: B · Pull the string, rebuilt as paper.
         1. The heading and the button step aside (nothing crosses them).
         2. The twine draws in to the knot under the seal (0–420ms).
         3. The seal is pulled up and off and the flap follows it over,
            darkening as it turns edge-on to the light and showing its
            shaded inside once it's back (380–960ms).
         4. The card slides up out of the pocket, slow out (880–1580ms).
         5. The envelope drops away beneath it, the pocket uncovering the
            rest of the card as it goes (1600–2200ms).
         6. The card settles into the page: only a move, its size never
            changes.
       Ease-ins for what leaves, long ease-outs for what arrives. */
    const H = el.offsetHeight;
    const up = Math.round(Math.min(150, H * 0.5));
    /* Far enough that the pocket passes the card's foot, however long the
       note: the clip ends at nothing, so nothing pops in at the settle. */
    const drop = Math.max(Math.round(ENV_H * 0.8), H - (ENV_H - TOP) - up);
    go(button.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "linear" });
    const titleOut = go(title.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "linear" });
    unwrap(go, extra.current, seal.current, flap.current);
    /* The card: up, and the clip's line held on the envelope's foot. */
    const RISE = { duration: 700, delay: 880 };
    /* The parent's celebration, as the card comes out (giftDelight.ts). The
       page below waits for its peak. */
    let celebrated: Promise<void> = Promise.resolve();
    /* The page below is held until the opening has played out (Sam, 7 Nov
       2026: "the animation should finish, then the background moves up and
       the tapin plus call out pops up immediately"). */
    setHeld(true);
    if (gift.effect) {
      const fx = gift.effect;
      celebrated = new Promise<void>((resolve) => {
        window.setTimeout(() => {
          if (!band.current || !el.isConnected) return resolve();
          /* In the builder on a phone, the open drawer covers the screen's
             foot: things rise from its top edge instead. */
          const drawer = preview ? document.querySelector<HTMLElement>(".gft-preview-panel[data-drawer]:not([data-peek])") : null;
          const run = playDelight(fx, band.current, el.getBoundingClientRect(), drawer?.getBoundingClientRect().top);
          stopDelight.current = run;
          run.done.then(resolve, resolve);
        }, RISE.delay + 180);
      });
      /* Not the whole effect (Sam, 7 Nov 2026: "this comes in a bit too
         late, you can make it a bit quicker"): its peak, about a second
         after the card settles; its tail finishes in the band. */
      celebrated = Promise.race([celebrated, new Promise<void>((r) => window.setTimeout(r, RISE.delay + 180 + 2300))]);
    }
    const DROP = { duration: 600, delay: 1600 };
    go(el, [{ transform: "translateY(0)" }, { transform: `translateY(${-up}px)` }], RISE);
    /* The sleeve's edge goes down with the envelope's foot. */
    const clip = go(sleeve.current, [{ bottom: "6px" }, { bottom: `${6 - drop}px` }], { ...DROP, easing: "cubic-bezier(.5,0,.75,0)" });
    /* The envelope drops away: each paper by the same distance (the
       `translate` property, so the flap keeps its fold) and its own layer,
       so the pocket passes in front of the card as it goes. */
    const papers = shell.current ? Array.from(shell.current.querySelectorAll<HTMLElement>(".gft-a-back, .gft-a-pocket, .gft-a-flap")) : [];
    let fall: Animation | undefined;
    papers.forEach((paper, i) => {
      const a = go(paper, [
        { translate: "0 0", opacity: 1 },
        { translate: `0 ${Math.round(drop * 0.75)}px`, opacity: 1, offset: 0.75 },
        { translate: `0 ${drop}px`, opacity: 0 },
      ], { ...DROP, easing: "cubic-bezier(.5,0,.75,0)" });
      if (i === 0) fall = a;
    });
    const end = [fall, clip].filter(Boolean) as Animation[];
    await Promise.all(end.map((a) => a.finished.then(() => undefined, () => undefined)));

    /* The settle: the card is whole and the envelope gone, so this is a
       move only (no height, no unrolling). */
    const first = el.getBoundingClientRect();
    /* The band keeps its sealed height through the settle and the
       celebration, so nothing moves up yet. */
    const bandEl = band.current;
    const sealedH = bandEl?.offsetHeight ?? 0;
    el.getAnimations().forEach((a) => a.cancel());
    flushSync(() => setState("open"));
    if (bandEl && sealedH) bandEl.style.minHeight = `${sealedH}px`;
    const last = el.getBoundingClientRect();
    const settling = go(el, [
      { transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)`, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.12)" },
      { transform: "none", boxShadow: "0 20px 44px rgba(0, 0, 0, 0.32)" },
    ], { duration: 640, fill: "none" });
    settle();
    titleOut?.cancel();
    go(title.current, [
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "none" },
    ], { duration: 520, delay: 160, fill: "backwards" });
    /* Then, once the card has settled and the celebration has peaked: the
       band eases up to its open height (the background moving up) and
       what's below is simply there. */
    await Promise.all([celebrated, settling?.finished.then(() => undefined, () => undefined)]);
    if (!el.isConnected) return;
    const h0 = bandEl?.offsetHeight ?? 0;
    if (bandEl) bandEl.style.removeProperty("min-height");
    flushSync(() => setHeld(false));
    const h1 = bandEl?.offsetHeight ?? 0;
    if (bandEl && h0 && Math.abs(h0 - h1) > 2 && typeof bandEl.animate === "function") {
      bandEl.style.overflow = "hidden";
      const a = bandEl.animate([{ height: `${h0}px` }, { height: `${h1}px` }], { duration: 560, easing: EASE });
      const done = () => bandEl.style.removeProperty("overflow");
      a.onfinish = done;
      a.oncancel = done;
    }
  };
  openRef.current = open;

  const to = gift.to;
  const button = useRef<HTMLButtonElement | null>(null);
  const resealBtn = useRef<HTMLButtonElement | null>(null);
  useLayoutEffect(() => {
    if (state !== "open" || still || !resealBtn.current) return;
    const a = resealBtn.current.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], {
      duration: 420,
      delay: 300,
      easing: EASE,
      fill: "backwards",
    });
    return () => a.cancel();
  }, [state, still]);
  /* ── The dock (Sam, 6 Nov 2026: "we should have a sticky 'claim my gift'
     button at the bottom of the page"): once it's open, the one thing to do
     stays in reach, sliding up as the letter settles, and breathing gently
     like the Plus pages' dock (shell/dockPulse.ts). */
  const dock = useRef<HTMLDivElement | null>(null);
  useDockPulse(dock, state === "open" && !held);
  useLayoutEffect(() => {
    if (state !== "open" || held || still || !dock.current) return;
    const a = dock.current.animate(
      [
        { transform: "translateY(calc(100% + 24px))" },
        { transform: "none" },
      ],
      { duration: 560, delay: 520, easing: EASE, fill: "backwards" },
    );
    return () => a.cancel();
  }, [state, held, still]);
  return (
    <div
      className={preview ? "gft gft-a ph-no-autocapture ph-no-deadclick ph-no-rageclick" : "gft gft-a ph-no-capture"}
      data-state={state}
      data-scene={gift.scene}
    >
      <header ref={band} className="gft-a-band">
        <div ref={scene} className="gft-scene" aria-hidden="true">
          {/* Live from the first paint (not swapped in after it), so the
              icons' own loops carry on across a replay. */}
          <div ref={pat} className="gft-scene-pat" data-live={still ? undefined : ""} />
        </div>
        <h1 ref={title} className="gft-h1" tabIndex={-1}>
          {/* The inner span is the paper strip the busier backgrounds
              set the heading on. */}
          <span className="gft-h1-in">
            {/* Their name first, and a family word as "your mom" (Sam, 6 Nov
                2026: "maya, your mother got you tapin plus"). */}
            {to ? `${to}, ` : ""}
            {state === "open" ? (
              /* Opened: "name1, name2 got you a little surprise!" (Sam, 8 Nov
                 2026), the sign-off as they wrote it ("Mom"). */
              <>
                {gift.from.trim() || "Someone"} got you a <span className="gft-nowrap" data-ph-show="">little surprise!</span>
              </>
            ) : (
              <>
                {whoInHeading(gift.from, !!to)} sent you <span className="gft-nowrap" data-ph-show="">something</span>
              </>
            )}
          </span>
        </h1>
        <div
          className="gft-a-stage"
          onClick={open}
          role={state === "sealed" ? "button" : undefined}
          tabIndex={state === "sealed" ? 0 : undefined}
          aria-label={state === "sealed" ? `Open the gift from ${gift.from}` : undefined}
          onKeyDown={(e) => {
            if (state === "sealed" && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              void open();
            }
          }}
        >
          {/* Gone once it's open, with motion too: the dropped papers are
              held at opacity 0 below the card by their fill, still taking
              taps, and lay over "Close it" (Sam, 7 Nov 2026: "the close it
              button doesn't work"). "open" is set after they've fallen. */}
          {state === "open" ? null : (
            <div ref={shell} className="gft-a-shell" aria-hidden="true">
              <Envelope scene={gift.scene} flap={flap} seal={seal} extra={extra} />
            </div>
          )}
          {/* The sleeve: the envelope masks the card (Sam, 6 Nov 2026: "I
              think the envelope should be masking the card"). A box whose
              bottom edge is the envelope's, overflow hidden, so the card
              only ever shows above it; it follows the envelope down as it
              drops. Gone (display: contents) once the gift is open. */}
          <div ref={sleeve} className="gft-a-sleeve">
          <div ref={letter} className="gft-a-letter" aria-hidden={state === "sealed" ? true : undefined}>
            <div className="gft-a-head">
              <span data-ph-show="">For <span className="ph-mask">{to ?? "you"}</span></span>
              {/* No mark on the card (Sam, 6 Nov 2026: "you can remove the
                  tapin plus icon from the card too"): it's their letter. */}
            </div>
            {/* The parent's photo, printed at the top of the letter: the
                first thing that rises out of the envelope. */}
            {gift.photo ? (
              <img className="gft-a-photo ph-no-capture" src={gift.photo} alt={`A photo from ${gift.from}`} decoding="async" />
            ) : onAddPhoto ? (
              <button
                type="button"
                className="gft-a-photo gft-a-photo-add"
                onClick={onAddPhoto}
                tabIndex={state === "open" ? 0 : -1}
                data-ph-show=""
              >
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                  <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9ZM12 16a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                </svg>
                Add a photo
              </button>
            ) : null}
            {/* No note: a short warm line, signed, instead of "signed you up
                for Tapin Plus" (Sam, 6 Nov 2026: "more of a heartfelt short
                message"). The builder shows the same, so it's what's sent. */}
            <p className="gft-a-note">{gift.note || NO_NOTE}</p>
            <p className="gft-a-sig">{gift.from}</p>
          </div>
          </div>
        </div>
        {state !== "open" ? (
          <button
            key="open"
            ref={button}
            type="button"
            className="gft-open"
            onClick={open}
            disabled={state !== "sealed"}
            aria-hidden={state !== "sealed" ? true : undefined}
            data-ph-show=""
          >
            Open it
          </button>
        ) : onReseal ? (
          /* Its own element (key): React would otherwise reuse "Open it"'s,
             still faded out at opacity 0 from the opening (Sam, 7 Nov 2026:
             "the close it button isn't showing"). It fades in instead. */
          <button key="reseal" ref={resealBtn} type="button" className="gft-open gft-reseal" onClick={onReseal} data-ph-show="">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4.5v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Close it
          </button>
        ) : null}
      </header>
      {state === "open" ? (
        <main ref={after} className="gft-after" data-held={held ? "" : undefined} aria-hidden={held ? true : undefined}>
          <GiftAfter gift={gift} sample={sample} preview={preview} cta={cta} />
        </main>
      ) : null}
      {state === "open" ? (
        <div ref={dock} className="gft-dock" data-ph-show="">
          {cta ? (
            <button type="button" className="gft-dock-cta tpa-dock-cta" onClick={(e) => cta.onClick(e.currentTarget)}>
              {cta.label}
              <DockArrow />
            </button>
          ) : (
            <a
              className="gft-dock-cta tpa-dock-cta"
              href={appHref()}
              onClick={(e) => {
                if (preview) e.preventDefault();
                else track("gift_claim", { sample });
              }}
            >
              Claim my gift
              <DockArrow />
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ══ THE DESIGN PICKER (the sample only: local dev, or ?pick) ══════════════
   Every envelope on every background, with or without the photo, so Sam can
   see the set. Each change closes the envelope again. */
function Picker({ gift, onChange }: { gift: Gift; onChange: (next: Partial<Gift>) => void }) {
  return (
    <div className="gft-pick" role="group" aria-label="Try the designs">
      <div className="gft-pick-row">
        <span>Background</span>
        {SCENES.map((e) => (
          <button key={e.id} type="button" aria-pressed={gift.scene === e.id} onClick={() => onChange({ scene: e.id as SceneId })}>
            {e.name}
          </button>
        ))}
        <button type="button" aria-pressed={!!gift.photo} onClick={() => onChange({ photo: gift.photo ? null : SAMPLE_PHOTO_SRC })}>
          Photo
        </button>
      </div>
    </div>
  );
}

/* ══ THE PANEL'S PICKERS ═════════════════════════════════════════════════════
   The backgrounds (seasonal first) and what plays when they open it: one of
   each, used by the builder's stages and by the plain preview alike. */
function ScenePicker({ scene, onPick }: { scene: SceneId; onPick: (id: SceneId) => void }) {
  return (
    <>
      {SCENE_GROUPS.map((g) => (
        <div key={g.label} className="gft-pp-group">
          <h2 id={`gft-pp-${g.label}`} className="gft-pp-h">
            {g.label}
            {g.tag ? <span className="gft-pp-tag">{g.tag}</span> : null}
          </h2>
          <div className="gft-pp-grid" role="radiogroup" aria-labelledby={`gft-pp-${g.label}`}>
            {g.scenes.map((sc) => (
              <button
                key={sc.id}
                type="button"
                role="radio"
                aria-checked={scene === sc.id}
                className="gft-pp-swatch"
                onClick={() => onPick(sc.id as SceneId)}
              >
                <span className="scene-swatch" data-scene={sc.id} aria-hidden="true">
                  <i className="scene-swatch-env" />
                </span>
                <span className="gft-pp-name">{sc.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Each effect's chip icon: flat, in the chip's maroon, on a 24 grid. */
function FxIcon({ id }: { id: Delight | null }) {
  return (
    <svg className="gft-pp-fx-ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      {id === "confetti" ? (
        <g fill="currentColor">
          <rect x="4" y="5" width="3" height="6" rx="1" transform="rotate(-20 5.5 8)" />
          <rect x="16" y="3" width="3" height="6" rx="1" transform="rotate(25 17.5 6)" />
          <rect x="10" y="13" width="3" height="6" rx="1" transform="rotate(10 11.5 16)" />
          <circle cx="12" cy="6" r="1.6" />
          <circle cx="19" cy="15" r="1.6" />
          <circle cx="5" cy="17" r="1.6" />
        </g>
      ) : id === "hearts" ? (
        <path fill="currentColor" d="M12 20s-6.8-4.2-8.7-8.3C1.9 8.4 3.9 5 7.2 5c1.9 0 3.3 1.1 4.8 3 1.5-1.9 2.9-3 4.8-3 3.3 0 5.3 3.4 3.9 6.7C18.8 15.8 12 20 12 20Z" />
      ) : id === "sparkles" ? (
        <path fill="currentColor" d="M10 3c.7 5 3 7.3 8 8-5 .7-7.3 3-8 8-.7-5-3-7.3-8-8 5-.7 7.3-3 8-8Zm8.5 9.5c.3 2 1.2 2.9 3.2 3.2-2 .3-2.9 1.2-3.2 3.2-.3-2-1.2-2.9-3.2-3.2 2-.3 2.9-1.2 3.2-3.2Z" />
      ) : id === "balloons" ? (
        <>
          <path fill="currentColor" d="M12 2.5c-3.6 0-6.3 2.8-6.3 6.5 0 4 3 7.3 5.5 8l-.9 1.4h3.4l-.9-1.4c2.5-.7 5.5-4 5.5-8 0-3.7-2.7-6.5-6.3-6.5Z" />
          <path d="M12 18.6c-1.3 1.1 1.3 1.9 0 3.1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : id === "fireworks" ? (
        <>
          <path
            d="M12 2.5v3.5M12 18v3.5M2.5 12H6M18 12h3.5M5.3 5.3l2.5 2.5M16.2 16.2l2.5 2.5M5.3 18.7l2.5-2.5M16.2 7.8l2.5-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </>
      ) : id === "streamers" ? (
        <path
          d="M5 3c3 2.2 3 4.3 0 6.5s-3 4.3 0 6.5 3 4.3 0 6.5M12 2c3 2.2 3 4.3 0 6.5s-3 4.3 0 6.5M19 4c3 2.2 3 4.3 0 6.5s-3 4.3 0 6.5 3 4.3 0 6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : id === "petals" ? (
        <g fill="currentColor">
          <path d="M9 2.5c3 2.2 4 6.2 2 10-.7 1.2-1.3 2.3-2 3.5-.7-1.2-1.3-2.3-2-3.5-2-3.8-1-7.8 2-10Z" transform="rotate(-24 9 9)" />
          <path d="M17 9c2.3 1.7 3.1 4.8 1.5 7.7-.5.9-1 1.8-1.5 2.7-.5-.9-1-1.8-1.5-2.7-1.6-2.9-.8-6 1.5-7.7Z" transform="rotate(38 17 14)" />
          <path d="M6.5 16c1.6 1.2 2.2 3.4 1.1 5.4L6.5 23.3l-1.1-1.9c-1.1-2-.5-4.2 1.1-5.4Z" transform="rotate(64 6.5 19.5)" />
        </g>
      ) : (
        <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

const EFFECT_CHOICES: ReadonlyArray<{ id: Delight | null; name: string }> = [{ id: null, name: "None" }, ...DELIGHTS];

function EffectPicker({ effect, onPick, labelled = true }: { effect: Delight | null; onPick: (id: Delight | null) => void; labelled?: boolean }) {
  return (
    <div className="gft-pp-group">
      {labelled ? (
        <h2 id="gft-pp-fx" className="gft-pp-h">
          When they open it
        </h2>
      ) : null}
      <div
        className="gft-pp-fx"
        role="radiogroup"
        {...(labelled ? { "aria-labelledby": "gft-pp-fx" } : { "aria-label": "When they open it" })}
      >
        {EFFECT_CHOICES.map((fx) => (
          <button key={fx.name} type="button" role="radio" aria-checked={effect === fx.id} onClick={() => onPick(fx.id)}>
            <FxIcon id={fx.id} />
            {fx.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══ C · ONE LOOK SCREEN (Sam's pick, 7 Nov 2026: "these 4 look good") ══════
   The builder's first screen: the look, with few choices up front. Three
   looks (the page's own season first, then theirs if it's another, then
   everyday ones), no names under them (the picked one's name sits beside the
   heading), and "+19", which opens every look in place. What plays when they
   open it was on this screen too, until Sam, 9 Nov 2026: "we should have the
   'pick a look' and the 'when they open it' be separate steps in the flow,
   so that someone can preview the 'when they open it' thing, right now you
   can't see it when you select the look". It's the next step now, every
   opening on it, in a drawer short enough to watch each one play. (Preview
   and notes: tapin-staging-work/lever-lab/effort.) */
const LOOKS_UP_FRONT = 3;
/* The seasonal looks lead, labelled as seasonal (Sam, 8 Nov 2026: "we
   should still have the seasonal options, or have those listed or
   identified as seasonal"): today's season first, then the calendar's
   others; the religious holidays wait in the full list, as on the page's
   gift band. */
const SEASONAL: SceneId[] = (SCENE_GROUPS.find((g) => g.label === "Seasonal")?.scenes ?? []).map((s) => s.id as SceneId);
const EVERYDAY: SceneId[] = SCENE_ORDER.map((s) => s.id as SceneId).filter((id) => !SEASONAL.includes(id));
/** The three looks up front, worked out once as the builder opens (so a
 *  pick never reshuffles them). */
function frontLooks(): SceneId[] {
  const out: SceneId[] = [];
  for (const id of [defaultGiftScene(), "leaves", "thanksgiving", "newyear", "snow"] as SceneId[])
    if (!out.includes(id) && SEASONAL.includes(id)) out.push(id);
  return out.slice(0, LOOKS_UP_FRONT);
}

/** One labelled row of looks. */
function LookRow({ ids, scene, onPick, children }: { ids: SceneId[]; scene: SceneId; onPick: (id: SceneId) => void; children?: React.ReactNode }) {
  return (
    <div className="gft-pp-grid">
      <div role="radiogroup" aria-label="Looks" className="gft-pp-looks">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={scene === id}
            aria-label={SCENE_ORDER.find((s) => s.id === id)?.name}
            className="gft-pp-swatch"
            onClick={() => onPick(id)}
          >
            <span className="scene-swatch" data-scene={id} aria-hidden="true">
              <i className="scene-swatch-env" />
            </span>
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

function LookPicker({ scene, onPick }: { scene: SceneId; onPick: (id: SceneId) => void }) {
  const [front] = useState(frontLooks);
  /* A pick that isn't up front (a save from earlier, or "Change") opens the
     full list, so the pick is always in view. */
  const [all, setAll] = useState(() => !front.includes(scene));
  const group = useRef<HTMLDivElement | null>(null);
  const grid = useRef<HTMLDivElement | null>(null);
  const fromH = useRef<number | null>(null);
  const seasonal = all ? [...front, ...SEASONAL.filter((id) => !front.includes(id))] : front;
  const more = SCENE_ORDER.length - front.length;
  const named = SCENE_ORDER.find((s) => s.id === scene)?.name ?? "";
  /* The rest open in place: the group eases from its height to the new one,
     and focus goes to the first look that wasn't showing. */
  useLayoutEffect(() => {
    if (!all) return;
    /* No ring for a tap (focusVisible: false where the browser knows it);
       a keyboard's focus still lands on the first new look. */
    grid.current?.querySelectorAll<HTMLElement>("[role=radio]")[front.length]?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    const el = group.current;
    const was = fromH.current;
    fromH.current = null;
    if (!el || was == null || reducedMotion() || typeof el.animate !== "function") return;
    const now = el.getBoundingClientRect().height;
    const a = el.animate([{ height: `${was}px`, overflow: "hidden" }, { height: `${now}px`, overflow: "hidden" }], { duration: 380, easing: EASE });
    return () => a.cancel();
    // On opening the rest only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);
  return (
    <div ref={group} className="gft-pp-group">
        <h2 id="gft-pp-look" className="gft-pp-h gft-pp-look-h">
          Pick a look
          <span aria-live="polite">{named}</span>
        </h2>
        <div ref={grid} className="gft-pp-lookrows">
          <p className="gft-pp-season">
            Seasonal <span className="gft-pp-season-tag">Limited time</span>
          </p>
          <LookRow ids={seasonal} scene={scene} onPick={onPick}>
            {all ? null : (
              <button
                type="button"
                className="gft-pp-swatch gft-pp-lookmore"
                aria-expanded="false"
                aria-label={`${more} more looks`}
                onClick={() => {
                  fromH.current = group.current?.getBoundingClientRect().height ?? null;
                  setAll(true);
                }}
              >
                <span className="scene-swatch tnum" aria-hidden="true">
                  +{more}
                </span>
              </button>
            )}
          </LookRow>
          {all ? (
            <>
              <p className="gft-pp-season">More looks</p>
              <LookRow ids={EVERYDAY} scene={scene} onPick={onPick} />
            </>
          ) : null}
        </div>
    </div>
  );
}

/** The builder's hand-off to the checkout's steps in its panel (the parents
 *  page passes its ParentCheckout). */
export type NextSteps = {
  /** Back from who it's for: to the note, or with Send as is, to where it
   *  was chosen (the card on a phone, the look on a computer). */
  back: () => void;
  /** The whole builder shuts. */
  close: () => void;
  /** A phone: the drawer's × folds it down instead of leaving. */
  collapse?: () => void;
  /** They chose "Send as is" (Effort B): the note was skipped. */
  quick: boolean;
  /** "Change" on the card's row: back into the builder, on the look. */
  change: () => void;
};

/* ══ THE PARENT'S PREVIEW (Sam, 6 Nov 2026: "on the parent's page, can we
   have a preview of the card they're sending?"; then "the grid of background
   options would show up on the right in a control center", "we should still
   have desktop preview here as an option ... so the thing fills up the entire
   page", "the CTA ... would be at the bottom of the right column", and "allow
   someone to preview their own message, own photo, and sender name") ══════
   The student's gift page, whole, made from the gift draft (model/
   giftDraft.ts) that the checkout shares: on /parents the sample fills
   whatever they haven't written yet; in the checkout it's only theirs.

   A computer: the page fills the screen. The student's page on the left, as
   a phone or as a computer (the computer one laid out at 1280px and scaled
   to fit, so its wide layout shows on any screen); on the right a panel to
   make it theirs (their name, the note, the sign-off, a photo, the
   background) with the parent's button at its foot. The student's own
   button in the page does nothing here.

   A phone: the page is the whole screen, the background arrows over its
   top corner, the parent's button in the page's dock. (The fields are the
   checkout's own there.) Escape or Close shuts it. */
const DESK_W = 1280;

/** The builder's design stages, in order: the look, what plays when they
 *  open it (its own stage since 9 Nov 2026), then the note. */
type Part = "look" | "open" | "note";
const PARTS: readonly Part[] = ["look", "open", "note"];
/** The builder's five steps in order (the parent_builder_step event). */
const BUILDER_STEPS: readonly ResumeStep[] = ["look", "open", "note", "who", "pay"];


function useWide(query = "(min-width: 1024px)") {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const on = () => setWide(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, [query]);
  return wide;
}

export function GiftPreview({
  onClose,
  action,
  backLabel = "Close",
  sample = false,
  fixedTo = null,
  parentName = "",
  masked,
  builder = false,
  next,
  startNext = false,
  resumeAt = null,
  origin = null,
}: {
  onClose: () => void;
  /** The parent's button: "Send Tapin Plus" on /parents, "Back to checkout"
   *  in the checkout. At the foot of the panel on a computer, in the page's
   *  dock on a phone. */
  action: DockCta;
  backLabel?: string;
  /** /parents: the sample fills what they haven't written, and a sample
   *  photo can be shown. */
  sample?: boolean;
  /** An ask link's student, who isn't theirs to rename. */
  fixedTo?: string | null;
  /** For the sign-off rule (giftWho): their name as typed in the checkout. */
  parentName?: string;
  masked?: string;
  /** Step 1 of the purchase (Sam, 6 Nov 2026: "the preview we already have
   *  is the first step. that way we only have one purchase funnel", and
   *  "should also be configurable on mobile"): the panel says so and counts
   *  the steps, Continue needs the student's first name, and on a phone the
   *  panel is a drawer over the page. */
  builder?: boolean;
  /** Steps 2 to 4, in this same panel once Continue is pressed (Sam, 6 Nov
   *  2026: "it'd be one continuous flow"): the parents page passes its
   *  checkout, embedded. `back` returns to the care package; `close` shuts
   *  the whole thing. */
  next?: (steps: NextSteps) => React.ReactNode;
  /** Open on the next steps (a charged checkout that only needs confirming). */
  startNext?: boolean;
  /** The builder: the step a save from earlier comes back to
   *  (model/checkoutResume.ts; ParentCheckout resumeStep), or null for a
   *  fresh start. Read as it opens. */
  resumeAt?: ResumeStep | null;
  /** The container it grows out of and shrinks back into (Sam, 6 Nov 2026:
   *  "when I click on this CTA, the parent container should expand into the
   *  builder"): the dock's white plate, or the button that was tapped. */
  origin?: HTMLElement | null;
}) {
  const back = useRef<HTMLButtonElement | null>(null);
  const peekCta = useRef<HTMLButtonElement | null>(null);
  /* Back on the step they left (Sam, 7 Nov 2026: "if someone leaves
     checkout their information ... should be saved"): a save from earlier
     opens the builder where it was, the drawer up, not the card first. A
     card already charged goes to its pay step as it always did. */
  const [resumed] = useState<ResumeStep | null>(() => (builder && !startNext ? resumeAt : null));
  const resumeNext = !!next && (resumed === "who" || resumed === "pay");
  const [stage, setStage] = useState<"gift" | "next">((startNext && next) || resumeNext ? "next" : "gift");
  /* Once visited, the next steps stay mounted (hidden while they're back on
     the care package), so what they typed there is still there (review,
     6 Nov 2026). */
  const [visited, setVisited] = useState((startNext && !!next) || resumeNext);
  /* The care package in stages, so it isn't all at once (Sam, 6 Nov 2026:
     "the first is where they pick the background and 'when they open it'
     and photo - the next when they do the name message and sender name";
     then "for the second step, we have the 'when they open it' selection,
     the modal would get a bit shorter on that stage so that someone can
     preview what it actually looks like"): the look, the opening, the note.
     Back from the checkout lands on the note, the last of them. */
  /* B · Send as is (Sam's pick, 7 Nov 2026): the card they see first is
     already a finished gift, so they can send it without designing: straight
     to who it's for, which then asks their first name too and shows the card
     with a way back into the builder. Kept with the save, so a reload comes
     back on the same path. */
  const [quick, setQuickState] = useState(() => !!next && !!resumed && !startNext && keptQuick());
  const setQuick = (q: boolean) => {
    setQuickState(q);
    keepQuick(q);
  };
  const [part, setPart] = useState<Part>(() =>
    ((startNext && next) || resumeNext) && !quick ? "note" : (resumed === "note" || resumed === "open") && !quick ? resumed : "look",
  );
  const partFrom = useRef<number | null>(null);
  const toPart = (p: Part) => {
    partFrom.current = panelRef.current?.getBoundingClientRect().height ?? null;
    setPart(p);
  };
  /* A phone (Sam, 6 Nov 2026: "why do we have two separate buttons here?
     doesn't make sense", and "there should always be a button to preview the
     card ... to temporarily leave the checkout flow to preview the gift card
     I built"): the drawer opens with the fields and one button, Continue;
     Preview drops it away to show the gift whole, and "Back to ..." brings it
     back on the same step. */
  /* Collapsed, the drawer peeks up at the bottom instead of leaving (Sam,
     6 Nov 2026: "the modal shouldn't completely disappear it should just be
     peeking up at the bottom of the screen when it's collapsed"), and it
     starts collapsed: from the page's button they see the card first, then
     "Start designing" opens it ("when someone clicks on build my care
     package ... we'd want for them to see the card design first"). */
  const [peek, setPeek] = useState(
    () => builder && !(startNext && next) && !resumed && typeof window !== "undefined" && !window.matchMedia?.("(min-width: 1024px)").matches,
  );
  const [designed, setDesigned] = useState(!peek);
  /* Once the checkout has gone through (the sent block below). */
  const sentRef = useRef(false);
  /* The save follows the step they're on (model/checkoutResume.ts): the
     care package's stage, or the checkout's step as it tells us
     (shell/ResumeLine.tsx). Closing the builder keeps it: that's what it's
     for (only paying, or "Start over", clears it). */
  const stageNow = useRef(stage);
  stageNow.current = stage;
  const checkoutAt = useRef<ResumeStep | null>(null);
  /* Where parents stop (Sam, 9 Nov 2026, the Dara Denney audit's "add a
     parent_builder_step event"): one event each time the step changes,
     the care package's two and the checkout's two, so a PostHog funnel on
     step shows the drop-off. `back` is a return to an earlier step;
     `send_as_is` is the path that skips the note. */
  const { track: trackBuilder } = useEventTracking();
  const quickRef = useRef(quick);
  quickRef.current = quick;
  const stepWas = useRef<ResumeStep | null>(null);
  const stepFar = useRef(0);
  const stepTo = useRef<(step: ResumeStep) => void>(() => {});
  stepTo.current = (step) => {
    if (!builder || sentRef.current || stepWas.current === step) return;
    const n = BUILDER_STEPS.indexOf(step) + 1;
    trackBuilder("parent_builder_step", {
      source: "parent_page",
      step,
      step_number: n,
      back: n < stepFar.current,
      send_as_is: quickRef.current,
      resumed: !!resumed,
    });
    stepWas.current = step;
    stepFar.current = Math.max(stepFar.current, n);
  };
  useEffect(() => {
    if (!builder || sentRef.current) return;
    if (stage === "gift") {
      keepStep(part);
      stepTo.current(part);
    } else if (checkoutAt.current) {
      keepStep(checkoutAt.current);
      stepTo.current(checkoutAt.current);
    }
  }, [builder, stage, part]);
  /* "We kept your care package from earlier", on the step it came back to,
     when there's something of theirs in it. */
  const [kept, setKept] = useState(() => !!resumed && keptSomething());
  const startOver = useRef<() => void>(() => {});
  const resume = useMemo<Resume>(
    () => ({
      at: resumed,
      on: kept,
      startOver: () => startOver.current(),
      left: () => setKept(false),
      report: (step) => {
        checkoutAt.current = step;
        if (stageNow.current === "next" && !sentRef.current) {
          keepStep(step);
          stepTo.current(step);
        }
      },
    }),
    [resumed, kept],
  );
  const expand = () => {
    setDesigned(true);
    setPeek(false);
    /* Back to the done step from seeing it: the gift seals again under the
       strip. */
    if (sentRef.current) setReplay((r) => ({ n: r.n + 1, auto: false }));
  };
  const [nameErr, setNameErr] = useState(false);
  const nameInput = useRef<HTMLInputElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const wide = useWide();
  const d = useGiftDraft();
  /* The builder shows exactly what will be sent (review, 6 Nov 2026: a
     sample standing in for an empty field looked like their gift, and
     wasn't sent); the sample is only the fields' placeholders. */
  const showSample = sample && !builder;
  const [samplePhoto, setSamplePhoto] = useState(showSample);
  const scene = d.scene;
  /* Replay (Sam, 6 Nov 2026): "Close it" seals it again; picking what plays
     on opening seals it and opens it again by itself, so they see it. */
  const [replay, setReplay] = useState({ n: 0, auto: false });
  const reseal = () => setReplay((r) => ({ n: r.n + 1, auto: false }));
  const pickEffect = (effect: Delight | null) => {
    setGiftDraft({ effect });
    setReplay((r) => ({ n: r.n + 1, auto: true }));
    toPreviewTop();
  };
  /* The preview back at its top, where the envelope is, so the opening plays
     in view (a phone: above the drawer). */
  const toPreviewTop = () => {
    const sc = frame.current?.querySelector<HTMLElement>(".gft-preview-scroll");
    if (sc) sc.scrollTop = 0;
  };
  const gift: Gift = {
    /* Empty fields show the sample's name and sign-off, in the builder too
       (Sam, 6 Nov 2026: "the default message would be 'maya, your mother got
       you tapin plus'"); the note's empty state is the letter's own warm
       line, which is what's sent. */
    to: fixedTo ?? (d.to.trim() || (sample ? SAMPLE_GIFT.to : null)),
    from: d.from.trim() || !sample ? giftWho(d.from, parentName) : SAMPLE_GIFT.from,
    /* Blank, the card shows the note that will go (DEFAULT_NOTE). */
    note: d.note.trim() || DEFAULT_NOTE,
    masked: masked ?? SAMPLE_GIFT.masked,
    scene,
    photo: d.photo ?? (showSample && samplePhoto ? SAMPLE_PHOTO_SRC : null),
    effect: d.effect,
  };

  /* Every background, one after another: the arrows (a phone) or the grid
     (a computer), or the arrow keys. The letter stays as it is, open or
     closed; only the background changes, faded in. */
  const sceneAt = SCENE_ORDER.findIndex((e) => e.id === scene);
  /* A new background closes the card again (Sam, 6 Nov 2026: "when I select
     a new background I think it should close too"). */
  const [cardState, setCardState] = useState<"sealed" | "opening" | "open">("sealed");
  const pick = (next: SceneId) => {
    setGiftDraft({ scene: next });
    if (cardState !== "sealed") reseal();
  };
  const cycle = useRef<(step: number) => void>(() => {});
  cycle.current = (step: number) => pick(SCENE_ORDER[(sceneAt + step + SCENE_ORDER.length) % SCENE_ORDER.length].id as SceneId);
  const firstScene = useRef(true);
  useEffect(() => {
    if (firstScene.current) {
      firstScene.current = false;
      return;
    }
    if (reducedMotion()) return;
    document.querySelector<HTMLElement>(".gft-preview .gft-scene")?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: "ease-out" });
  }, [scene]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      /* Sent: the background is the one they paid for. */
      if (sentRef.current) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      cycle.current(e.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  /* Phone or computer. The computer view is the page laid out at 1280px
     and scaled to the frame, so its wide layout shows at any screen size;
     the frame eases between the two widths and the page fades back in. */
  const [device, setDevice] = useState<"phone" | "computer">("phone");
  const desk = wide && device === "computer";
  const frame = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<{ s: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el || !desk) {
      setFit(null);
      return;
    }
    const measure = () => setFit({ s: el.clientWidth / DESK_W, h: el.clientHeight });
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [desk]);
  const frameW = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const was = frameW.current;
    const now = el.getBoundingClientRect().width;
    frameW.current = now;
    if (was == null || Math.abs(now - was) < 2 || reducedMotion() || typeof el.animate !== "function") return;
    el.animate([{ width: `${was}px` }, { width: `${now}px` }], { duration: 460, easing: EASE });
    el.querySelector<HTMLElement>(".gft-preview-scroll")?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 280,
      delay: 260,
      easing: "ease-out",
      fill: "backwards",
    });
  }, [device]);

  /* Their own photo, made small on the device (model/giftPhoto.ts). */
  const photoInput = useRef<HTMLInputElement | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      setGiftDraft({ photo: await shrinkPhoto(file) });
    } catch (err) {
      setPhotoError(err instanceof PhotoError ? err.message : "We couldn’t open that photo. Try another one.");
    } finally {
      setPhotoBusy(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  };

  useEffect(() => {
    const unlock = lockScroll();
    return unlock;
  }, []);
  /* The step bars start fresh on the next open. */
  useEffect(() => () => resetStepBars(), []);

  /* ── Out of the container, and back into it ──
     The builder is laid out whole from the first frame; a clip that starts
     as exactly the origin's rectangle and corners opens to the screen, while
     a white veil (the plate's own white) fades as it grows, so it reads as
     the plate itself becoming the builder. The plate hides underneath while
     it's open. Closing runs it backwards into the plate, then unmounts.
     Reduced motion, or no origin on screen: it just appears and goes. */
  const root = useRef<HTMLDivElement | null>(null);
  const veil = useRef<HTMLDivElement | null>(null);
  const shutting = useRef(false);
  const originFrame = () => {
    const el = origin;
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.bottom <= 0 || r.top >= window.innerHeight) return null;
    const radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16, 28);
    return `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round ${radius}px)`;
  };
  const GROW = { duration: 520, easing: "cubic-bezier(0.32, 0.72, 0, 1)" };
  /* The veil wears the origin's own colour (the dock's white plate, a dark
     button), so the hand-off at either end has no flash. */
  const veilTint = () => {
    const bg = origin ? getComputedStyle(origin).backgroundColor : "";
    const alpha = /rgba\([^)]*,\s*([\d.]+)\)/.exec(bg);
    const solid = !!bg && bg !== "transparent" && (!alpha || parseFloat(alpha[1]) > 0.9);
    if (veil.current) veil.current.style.background = solid ? bg : "#ffffff";
  };
  /* No origin on screen (Sam, 6 Nov 2026: "there should be a smooth
     animation when I open and close the builder"): it rises and fades in,
     and sinks and fades out, instead of cutting. */
  const RISE = [
    { opacity: 0, transform: "translateY(28px) scale(0.985)" },
    { opacity: 1, transform: "none" },
  ];
  useLayoutEffect(() => {
    const from = originFrame();
    if (origin) origin.style.visibility = "hidden";
    veilTint();
    /* The veil's end state is its own style, set before any fade runs over
       it: session replay records styles, never Web Animations, and a veil
       held off by a fill alone replayed at full strength over the whole
       builder (Sam, 9 Nov 2026: the PostHog replay "completely cuts off"
       at "Build their care package"). The fade's keyframes give both ends,
       so what a parent sees is unchanged. */
    veil.current?.style.setProperty("opacity", "0");
    if (reducedMotion()) {
      /* No motion: the builder is simply there. */
    } else if (from) {
      root.current?.animate?.([{ clipPath: from }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], GROW);
      veil.current?.animate?.([{ opacity: 1 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: GROW.duration, easing: "ease-out" });
    } else {
      root.current?.animate?.(RISE, { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    }
    return () => {
      if (origin) origin.style.visibility = "";
    };
    // Once, as it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shut = () => {
    if (shutting.current) return;
    shutting.current = true;
    const to = originFrame();
    const el = root.current;
    if (!el || reducedMotion() || typeof el.animate !== "function") return onClose();
    el.style.pointerEvents = "none";
    if (!to) {
      const a = el.animate([...RISE].reverse(), { duration: 240, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" });
      a.onfinish = () => onClose();
      return;
    }
    /* Closing, polished (Sam, 6 Nov 2026): the real button comes back
       underneath at once, the clip closes onto it with an ease-in-out, the
       veil takes the button's colour as it narrows, and the whole builder
       fades over the last stretch, so it settles into the button instead of
       swapping for it (frames showed a blank plate, then the button
       popping in). */
    veilTint();
    if (origin) origin.style.visibility = "";
    const SHUT = { duration: 420, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" as const };
    veil.current?.animate?.([{ opacity: 0 }, { opacity: 0.9, offset: 0.6 }, { opacity: 0.9 }], { ...SHUT, easing: "ease-in" });
    el.animate([{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], { ...SHUT, easing: "linear" });
    const a = el.animate([{ clipPath: "inset(0px 0px 0px 0px round 0px)" }, { clipPath: to }], SHUT);
    a.onfinish = () => onClose();
  };
  const shutRef = useRef(shut);
  shutRef.current = shut;
  useEffect(() => {
    const was = document.activeElement as HTMLElement | null;
    /* Close, or on a phone's builder (no Close there) the collapsed bar's
       button. */
    const first = back.current?.getClientRects().length ? back.current : peekCta.current?.getClientRects().length ? peekCta.current : back.current;
    /* No ring on opening (focusVisible: false where the browser knows it):
       it's where focus starts, not something they tabbed to. */
    first?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        shutRef.current();
        return;
      }
      /* Tab stays inside the preview. */
      if (e.key !== "Tab") return;
      const box = document.querySelector<HTMLElement>(".gft-preview");
      if (!box) return;
      const els = Array.from(
        box.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([type=file]), textarea, [tabindex='0']"),
      ).filter((el) => el.getClientRects().length > 0 && el.getAttribute("aria-hidden") !== "true");
      if (!els.length) return;
      const at = document.activeElement as HTMLElement | null;
      const i = at ? els.indexOf(at) : -1;
      e.preventDefault();
      e.stopPropagation();
      const next = e.shiftKey ? (i <= 0 ? els.length - 1 : i - 1) : i === -1 || i === els.length - 1 ? 0 : i + 1;
      els[next].focus();
    };
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      was?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  /* On a computer the student's own button is inert (the parent's is in
     the panel); on a phone the page's dock is the parent's button. */
  const pageCta: DockCta = wide || builder ? { label: "Claim my gift", onClick: () => {} } : action;
  /* Continue: the student's first name is the one thing it needs. */
  const go = (el: HTMLElement) => {
    if (builder && part !== "note") {
      /* Making it theirs after all: the note asks their name again. */
      if (quick) setQuick(false);
      toPart(PARTS[PARTS.indexOf(part) + 1]);
      return;
    }
    if (builder && !fixedTo && !d.to.trim()) {
      setNameErr(true);
      setPeek(false);
      requestAnimationFrame(() => nameInput.current?.focus());
      return;
    }
    if (next) {
      partFrom.current = panelRef.current?.getBoundingClientRect().height ?? null;
      setVisited(true);
      setStage("next");
      return;
    }
    action.onClick(el);
  };
  /* B · Send as is: from the card (a phone's collapsed bar) or the look (a
     computer, or a phone back from Change), straight to who it's for. */
  const sendAsIs = () => {
    setQuick(true);
    setDesigned(true);
    setPeek(false);
    partFrom.current = panelRef.current?.getBoundingClientRect().height ?? null;
    setVisited(true);
    setStage("next");
  };
  /* Back from who it's for: to the note, or with Send as is to where it was
     chosen (a phone: the card, with its two buttons again; a computer: the
     look). */
  const toGift = () => {
    partFrom.current = panelRef.current?.getBoundingClientRect().height ?? null;
    if (quick) {
      setPart("look");
      if (!wide) {
        setDesigned(false);
        setPeek(true);
      }
    } else setPart("note");
    setStage("gift");
  };
  /* "Change" on who it's for: into the builder on the look, the drawer up. */
  const change = () => {
    partFrom.current = panelRef.current?.getBoundingClientRect().height ?? null;
    setPart("look");
    setPeek(false);
    setStage("gift");
  };
  /* "Start over": the save gone, the gift back to the page's own default,
     the checkout's fields with it (it mounts fresh), and the first stage. */
  startOver.current = () => {
    startGiftOver();
    setKept(false);
    setNameErr(false);
    checkoutAt.current = null;
    partFrom.current = panelRef.current?.getBoundingClientRect().height ?? null;
    setVisited(false);
    setQuick(false);
    setStage("gift");
    setPart("look");
  };
  /* Into the checkout and back: the same sideways slide as every other
     step (Sam, 7 Nov 2026: "the next slide animate[s] up, instead of sliding
     like the other slides ... make sure the transition animations across
     each step is consistent"): in from the right going on, from the left
     coming back, and the drawer eases to the new height. */
  const firstStage = useRef(true);
  useLayoutEffect(() => {
    if (firstStage.current) {
      firstStage.current = false;
      return;
    }
    const panel = panelRef.current;
    const was = partFrom.current;
    partFrom.current = null;
    /* Back on the note from the checkout: its title takes focus, as each
       stage's does. */
    if (stage === "gift") panel?.querySelector<HTMLElement>(".gft-pp-title")?.focus({ preventScroll: true });
    if (!panel || reducedMotion() || typeof panel.animate !== "function") return;
    const dir = stage === "next" ? 1 : -1;
    const parts =
      stage === "next"
        ? panel.querySelectorAll<HTMLElement>(".gft-pp-next")
        : panel.querySelectorAll<HTMLElement>(".gft-pp-head > :not(.gft-pp-steps):not(.gft-pp-x), .gft-pp-body, .gft-pp-foot");
    parts.forEach((el) =>
      el.animate([{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: "none" }], { duration: 360, easing: EASE }),
    );
    const now = panel.getBoundingClientRect().height;
    if (wide || was == null || Math.abs(now - was) < 2) return;
    panel.style.overflow = "hidden";
    const h = panel.animate([{ height: `${was}px` }, { height: `${now}px` }], { duration: 380, easing: EASE });
    h.onfinish = () => panel.style.removeProperty("overflow");
    h.oncancel = () => panel.style.removeProperty("overflow");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);
  /* Stage to stage: the drawer eases to the new stage's height (the opening
     is the shortest), the stage slides in from the side it comes from, the
     body starts at its top and the title takes focus, as the checkout's
     steps do. */
  const shownPart = useRef(part);
  useLayoutEffect(() => {
    if (shownPart.current === part) return;
    const dir = PARTS.indexOf(part) > PARTS.indexOf(shownPart.current) ? 1 : -1;
    shownPart.current = part;
    /* Every stage change seals the card again (Sam, 6 Nov 2026: "when I go
       back to the closed state, the card should reset so it's not open"),
       which also stops an effect still playing. The opening: at the top of
       its page, so the next pick plays where it can be seen, above the
       short drawer. */
    setReplay((r) => ({ n: r.n + 1, auto: false }));
    const panel = panelRef.current;
    const was = partFrom.current;
    partFrom.current = null;
    if (body.current) body.current.scrollTop = 0;
    panel?.querySelector<HTMLElement>(".gft-pp-title")?.focus({ preventScroll: true });
    if (!panel || reducedMotion() || typeof panel.animate !== "function") return;
    panel.querySelectorAll<HTMLElement>(".gft-pp-head > :not(.gft-pp-steps):not(.gft-pp-x), .gft-pp-body").forEach((el) =>
      el.animate([{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: "none" }], { duration: 360, easing: EASE }),
    );
    const now = panel.getBoundingClientRect().height;
    if (wide || was == null || Math.abs(now - was) < 2) return;
    panel.style.overflow = "hidden";
    const a = panel.animate([{ height: `${was}px` }, { height: `${now}px` }], { duration: 380, easing: EASE });
    const done = () => panel.style.removeProperty("overflow");
    a.onfinish = done;
    a.oncancel = done;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part]);
  /* ── Sent: A · It's on its way (Sam, 7 Nov 2026: "lets do A on its way for
     after they pay") ──
     The checkout's done step tells the preview (shell/giftSent.ts), and the
     gift the parent made is sent off in front of them: the seal pressed
     once more (0.8, 1.08, 1), a tilt back, then away up and to the right.
     A phone: the done drawer sits lower, leaving a band of the background
     above it; the envelope rises from behind the drawer's top edge at half
     size (through a layer clipped at that edge) and flies off the top. A
     computer: the preview's own envelope goes, after the heading and Open
     it fade. Then a paper strip, "On its way to {who}", and "See it as {who}
     will" land where it was. Reduced motion: straight to that. The panel's
     words never wait for any of it. */
  const [sent, setSent] = useState<GiftSent | null>(null);
  /* The flight is over (a computer hides the sealed gift underneath then). */
  const [landed, setLanded] = useState(false);
  /* "See it as {who} will" on a computer; a phone's is the collapsed drawer. */
  const [seen, setSeen] = useState(false);
  const seeing = !!sent && (wide ? seen : peek);
  const sentFrom = useRef<number | null>(null);
  const sentBand = useRef<HTMLDivElement | null>(null);
  const sentFrame = useRef<HTMLDivElement | null>(null);
  const flyer = useRef<HTMLDivElement | null>(null);
  const sentHost = useMemo<GiftSentHost>(
    () => ({
      sent: (s) => {
        sentRef.current = true;
        setKept(false);
        /* The drawer's height on the pay step, before anything moves. */
        sentFrom.current = panelRef.current?.getBoundingClientRect().height ?? null;
        setSent(s);
        if (reducedMotion()) {
          setLanded(true);
          return 0;
        }
        if (!s.texted) return 300;
        return window.matchMedia?.("(min-width: 1024px)").matches ? 1150 : 1760;
      },
    }),
    [],
  );
  useLayoutEffect(() => {
    if (!sent) return;
    toPreviewTop();
    if (reducedMotion()) return;
    const runs: Animation[] = [];
    const timers: number[] = [];
    const go = (el: Element | null | undefined, kf: Keyframe[], o: KeyframeAnimationOptions) => {
      const a = el?.animate?.(kf, { fill: "both", ...o });
      if (a) runs.push(a);
      return a;
    };
    const OUT = EASE;
    const AWAY = "cubic-bezier(0.55, 0, 0.85, 0.25)";
    /* The seal pressed once more: sealed. */
    const press = (seal: Element | null | undefined, at: number) =>
      go(seal, [{ transform: "none" }, { transform: "scale(0.8)", offset: 0.35 }, { transform: "scale(1.08)", offset: 0.7 }, { transform: "none" }], {
        duration: 340,
        delay: at,
        easing: "ease-in-out",
        fill: "none",
      });
    let landAt = 300;
    if (!wide) {
      /* The drawer eases down from the pay step's height to the done one. */
      const panel = panelRef.current;
      const was = sentFrom.current;
      if (panel && was != null && typeof panel.animate === "function") {
        const now = panel.getBoundingClientRect().height;
        if (Math.abs(now - was) > 2) {
          panel.style.overflow = "hidden";
          const a = panel.animate([{ height: `${was}px` }, { height: `${now}px` }], { duration: 520, easing: OUT });
          const end = () => panel.style.removeProperty("overflow");
          a.onfinish = end;
          a.oncancel = end;
          runs.push(a);
        }
      }
      const fly = flyer.current;
      if (sent.texted && fly) {
        /* Up from behind the drawer (260–900ms), a breath while the seal
           presses, then away (900–1980ms): one animation, so nothing
           fights over the transform. */
        const RISE = 640;
        const FLY = 1080;
        const T = RISE + FLY;
        const at = (ms: number) => ms / T;
        go(
          fly,
          [
            { transform: "translateY(200px) scale(0.5)", offset: 0, easing: OUT },
            { transform: "translateY(-6px) scale(0.5)", offset: at(RISE * 0.82), easing: OUT },
            { transform: "translateY(0) scale(0.5)", offset: at(RISE), easing: "linear" },
            { transform: "translateY(0) scale(0.5)", offset: at(RISE + FLY * 0.33), easing: "cubic-bezier(0.3, 0, 0.3, 1)" },
            { transform: "translate(-6px, -12px) scale(0.53) rotate(4deg)", offset: at(RISE + FLY * 0.52), easing: AWAY },
            { transform: "translate(300px, -330px) scale(0.3) rotate(-18deg)", offset: 1 },
          ],
          { duration: T, delay: 260, easing: "linear" },
        );
        press(fly.querySelector(".gft-a-seal"), 260 + RISE);
        landAt = 1840;
      }
    } else {
      const fr = frame.current;
      /* "{Who}, your mom sent you something" and Open it go first. */
      fr?.querySelectorAll(".gft-a-band > .gft-h1, .gft-a-band > .gft-open").forEach((el) =>
        go(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 120, easing: "ease-out", fill: "forwards" }),
      );
      const stage = fr?.querySelector<HTMLElement>(".gft-a-band > .gft-a-stage");
      if (sent.texted && stage) {
        press(stage.querySelector(".gft-a-seal"), 260);
        go(
          stage,
          [
            { transform: "none", offset: 0 },
            { transform: "none", offset: 0.33, easing: "cubic-bezier(0.3, 0, 0.3, 1)" },
            { transform: "translate(-8px, -18px) scale(1.04) rotate(4deg)", offset: 0.52, easing: AWAY },
            { transform: "translate(380px, -560px) scale(0.55) rotate(-18deg)", offset: 1 },
          ],
          { duration: 1080, delay: 260, fill: "forwards" },
        );
        landAt = 1260;
      } else if (stage) go(stage, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 120, easing: "ease-out", fill: "forwards" });
    }
    /* The strip lands with a little give; the way to see it follows. */
    const [line, see] = Array.from((wide ? sentFrame.current : sentBand.current)?.querySelectorAll(".gft-sent > *") ?? []);
    go(line, [{ opacity: 0, transform: "translateY(-14px) scale(1.05)" }, { opacity: 1, transform: "none" }], {
      duration: 520,
      delay: landAt,
      easing: "cubic-bezier(0.34, 1.4, 0.64, 1)",
      fill: "backwards",
    });
    go(see, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: landAt + 160, easing: OUT, fill: "backwards" });
    timers.push(window.setTimeout(() => setLanded(true), landAt + 600));
    return () => {
      runs.forEach((a) => a.cancel());
      timers.forEach((t) => window.clearTimeout(t));
    };
    // Once, as it's sent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sent]);
  /* "See it as {who} will": the gift whole again, sealed, as they'll get
     it. A phone collapses the drawer to its peek ("Back" brings the done
     step back); a computer shows it in the frame. */
  const seeIt = () => {
    reseal();
    if (wide) setSeen(true);
    else setPeek(true);
  };
  useLayoutEffect(() => {
    if (!seen || reducedMotion()) return;
    const runs = Array.from(frame.current?.querySelectorAll<HTMLElement>(".gft-a-band > :not(.gft-scene)") ?? []).map((el, i) =>
      el.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 480, delay: i * 60, easing: EASE, fill: "backwards" }),
    );
    return () => runs.forEach((a) => a.cancel());
  }, [seen]);
  /* Sent, the next gift starts fresh, once this closes (the parent's design
     stays on screen until then: 7 Nov 2026, it used to fall back to the
     sample's maroon the moment they paid). */
  useEffect(
    () => () => {
      if (sentRef.current) clearGiftDraft();
    },
    [],
  );
  const sentLine = sent ? (
    <div className="gft-sent ph-no-autocapture ph-no-deadclick ph-no-rageclick">
      <h2 className="gft-h1 gft-sent-h" data-ph-show="">
        <span className="gft-sent-strip">
          {sent.texted ? (
            <>
              On its way to <span className="ph-mask">{sent.who}</span>
            </>
          ) : (
            <>
              On <span className="ph-mask">{sent.who}</span>’s account now
            </>
          )}
        </span>
      </h2>
      {sent.texted ? (
        <button type="button" className="gft-open gft-sent-see" onClick={seeIt}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M3.5 12s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          See it as {sent.who} will
        </button>
      ) : null}
    </div>
  ) : null;

  /* Five bars in all, an ask link's too (its who step is just you): the
     look, the opening, the note, then the checkout's (ParentCheckout STEPS).
     Send as is counts only the checkout's two, there. */
  const stepsTotal = 5;
  const stepAt = PARTS.indexOf(part) + 1;
  const scaled: React.CSSProperties | undefined =
    desk && fit
      ? ({
          width: `${DESK_W}px`,
          height: `${fit.h / fit.s}px`,
          transform: `scale(${fit.s})`,
          transformOrigin: "0 0",
          "--frame-h": `${fit.h / fit.s}px`,
        } as React.CSSProperties)
      : undefined;

  /* Their note on the card as they write it (Sam, 9 Nov 2026, the UX
     audit's "the parent never sees their own note before paying"): arriving
     on the note step opens the card by itself, so what they type shows on
     the letter. Arriving on the opening does the same, so what's picked
     plays at once, and each pick there plays again (pickEffect). Only on the
     way in; closing it there again stays closed. */
  const notePartWas = useRef(part);
  useEffect(() => {
    const was = notePartWas.current;
    notePartWas.current = part;
    if (!builder || sent || stage !== "gift" || part === "look" || was === part) return;
    if (cardState !== "sealed") return;
    setReplay((r) => ({ n: r.n + 1, auto: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part, stage]);

  /* The photo: after the sign-off, on the builder's note and in the plain
     preview's fields alike. */
  const photoParts = (
    <>
      {d.photo ? (
        <div className="gft-pp-photo" data-ph-show="">
          <img className="ph-no-capture" src={d.photo} alt="Your photo" />
          <button type="button" onClick={() => photoInput.current?.click()} disabled={photoBusy}>
            Change
          </button>
          <button type="button" onClick={() => setGiftDraft({ photo: null })} disabled={photoBusy}>
            Remove
          </button>
        </div>
      ) : (
        <>
          <button type="button" className="gft-pp-add" onClick={() => photoInput.current?.click()} disabled={photoBusy} data-ph-show="">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9ZM12 16a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            {photoBusy ? "One moment…" : "Add your photo"}
          </button>
          {showSample ? (
            <div className="gft-pp-seg" role="radiogroup" aria-label="Until you add one" data-ph-show="">
              {[true, false].map((on) => (
                <button key={String(on)} type="button" role="radio" aria-checked={samplePhoto === on} onClick={() => setSamplePhoto(on)}>
                  {on ? "Sample photo" : "No photo"}
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
      {/* Blocked from replay: maskAllInputs skips file inputs, and the file's
          name ("maya-graduation.jpg") would be recorded as typed. */}
      <input
        ref={photoInput}
        className="ph-no-capture"
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void pickPhoto(e.target.files?.[0])}
      />
      {photoError ? (
        <p className="gft-pp-error" role="alert" data-ph-show="">
          {photoError}
        </p>
      ) : null}
    </>
  );

  /* Their name, the note and the sign-off: the builder's last stage, or the
     plain preview's "Make it theirs". */
  const noteFields = (
    <>
      {fixedTo ? null : (
        <label className="gft-pp-field" data-error={nameErr && !d.to.trim() ? "" : undefined}>
          <span data-ph-show="">Your student’s first name</span>
          <input
            ref={nameInput}
            value={d.to}
            aria-invalid={nameErr && !d.to.trim() ? true : undefined}
            aria-describedby={nameErr && !d.to.trim() ? "gft-pp-name-err" : undefined}
            onChange={(e) => setGiftDraft({ to: e.target.value })}
            data-ph-typed=""
            placeholder={sample ? SAMPLE_GIFT.to ?? "" : ""}
            maxLength={40}
            autoComplete="off"
            autoCapitalize="words"
          />
          {nameErr && !d.to.trim() ? (
            <small id="gft-pp-name-err" className="gft-pp-error" role="alert" data-ph-show="">
              Add your student’s first name.
            </small>
          ) : null}
        </label>
      )}
      <label className="gft-pp-field">
        <span className="gft-pp-count" data-ph-show="">
          Your note
          <small className="tnum" aria-hidden="true">
            {d.note.length}/{NOTE_MAX}
          </small>
        </span>
        <textarea
          rows={4}
          value={d.note}
          onChange={(e) => setGiftDraft({ note: e.target.value })}
          data-ph-typed=""
          placeholder={DEFAULT_NOTE}
          maxLength={NOTE_MAX}
          aria-describedby="gft-pp-note-hint"
        />
        {/* Not a step to get through: blank, this one goes. */}
        <small id="gft-pp-note-hint" className="gft-pp-hint" data-ph-show="">
          {d.note.trim() ? "Your words go on the card." : "Leave it blank and this note goes on the card."}
        </small>
      </label>
      <label className="gft-pp-field">
        <span data-ph-show="">Sign it</span>
        <input
          value={d.from}
          onChange={(e) => setGiftDraft({ from: e.target.value })}
          data-ph-typed=""
          placeholder="Mom"
          maxLength={FROM_MAX}
          autoComplete="off"
          autoCapitalize="words"
        />
      </label>
    </>
  );

  return createPortal(
    <div
      ref={root}
      className="gft-preview ph-mask"
      data-device={desk ? "computer" : "phone"}
      data-builder={builder ? "" : undefined}
      data-part={builder ? part : undefined}
      data-peek={!wide && builder && peek ? "" : undefined}
      data-designed={designed ? "" : undefined}
      data-sent={sent ? "" : undefined}
      data-landed={landed ? "" : undefined}
      data-seeing={seeing ? "" : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={builder ? "Build their care package" : "Preview of their gift"}
    >
      <div className="gft-preview-scrim" onClick={shut} aria-hidden="true" />
      {/* data-ph-show: fixed copy, readable in session replay (model/replayPrivacy.ts). */}
      <div className="gft-preview-bar" data-ph-show="">
        <div className="gft-preview-bg" role="group" aria-label="Background">
          <button type="button" aria-label="Previous background" onClick={() => cycle.current(-1)}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="gft-preview-bg-name" aria-live="polite">
            <span className="scene-swatch" data-scene={scene} aria-hidden="true">
              <i className="scene-swatch-env" />
            </span>
            {SCENE_ORDER[sceneAt]?.name}
          </span>
          <button type="button" aria-label="Next background" onClick={() => cycle.current(1)}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="gft-preview-left">
        {/* Close: the builder's own, at its top left (Sam, 6 Nov 2026), not
            part of the student's page; on a phone, the screen's top left. */}
        <button ref={back} type="button" className="gft-preview-back" onClick={shut} data-ph-show="">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {backLabel}
          </button>
        <div ref={frame} className="gft-preview-frame">
          
          <div
            className="gft-preview-scroll gft-wrap"
            style={scaled}
            {...(!wide && builder && !peek ? { inert: "" } : {})}
          >
            <Letter
              key={replay.n}
              gift={gift}
              sample
              preview
              cta={pageCta}
              onReseal={reseal}
              autoOpen={replay.auto}
              onStateChange={setCardState}
              onAddPhoto={builder && !sent ? () => photoInput.current?.click() : undefined}
            />
          </div>
          {/* Sent, on a computer: the strip where the envelope was. */}
          {sent && wide ? (
            <div ref={sentFrame} className="gft-sent-frame gft-a" data-scene={scene} hidden={seen}>
              {sentLine}
            </div>
          ) : null}
        </div>
        {/* Phone or computer, under the preview it changes (Sam, 6 Nov 2026:
            "the phone computer toggle should be on the bottom of the left
            column of the builder"). A computer only. */}
        {wide ? (
          <div className="gft-preview-tools" data-ph-show="">
            <div className="gft-preview-device gft-pp-seg" role="radiogroup" aria-label="See it on">
              {(["phone", "computer"] as const).map((dv) => (
                <button key={dv} type="button" role="radio" aria-checked={device === dv} onClick={() => setDevice(dv)}>
                  {dv === "phone" ? "Phone" : "Computer"}
                </button>
              ))}
            </div>
            {/* Close it again, once it's open (Sam, 6 Nov 2026: "maybe we have
                a replay arrow icon to close the gift if someone has already
                opened it"). */}
            <button
              type="button"
              className="gft-preview-replay"
              aria-label="Close the gift"
              title="Close the gift"
              data-on={cardState !== "sealed" ? "" : undefined}
              tabIndex={cardState !== "sealed" ? 0 : -1}
              aria-hidden={cardState !== "sealed" ? undefined : true}
              onClick={reseal}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4.5v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
      {wide || builder ? (
        <ResumeContext.Provider value={resume}>
        <aside
          ref={panelRef}
          className="gft-preview-panel"
          aria-label={stage === "next" ? "Checkout" : "Make it theirs"}
          data-drawer={wide ? undefined : ""}
          data-open=""
          data-peek={!wide && peek ? "" : undefined}
          data-stage={stage}
        >
          {wide ? null : (
            <div className="gft-pp-grab" data-ph-show="">
              {/* On a phone the drawer's own way out, on the care package
                  (the checkout steps carry theirs); the Close and background
                  pills over the page are gone (Sam, 6 Nov 2026: "on mobile
                  checkout I don't think we need these"). */}
              <button
                type="button"
                className="gft-pp-handle-hit"
                aria-label={sent ? (peek ? "Back" : "See the gift") : peek ? "Open the editor" : "Collapse the editor"}
                aria-expanded={!peek}
                onClick={() => (peek ? expand() : setPeek(true))}
              >
                <span className="gft-pp-handle" aria-hidden="true" />
              </button>
            </div>
          )}
          {/* Collapsed: the one button that opens it. */}
          {!wide ? (
            <div className="gft-pp-peekbar" hidden={!peek} data-ph-show="">
              {/* The way out on a phone (Sam, 6 Nov 2026): the back arrow
                  beside it leaves the builder, as Close did at the top
                  left, which is gone on a phone. */}
              <BackArrow className="gft-pp-backarrow" label="Close" onClick={shut} />
              {/* While previewing it's always "Back to editing" (Sam, 6 Nov
                  2026), on any step. The first time, before they've begun,
                  the gift whole and one button (Sam, 9 Nov 2026: "when
                  someone first opens the care package thing, the first thing
                  they see is this unless they've already been working on it.
                  The CTA would be build my carepackage"); Send as is waits
                  on the look, beside Continue, as on a computer. */}
              <button ref={peekCta} type="button" className="gft-pp-cta" onClick={expand}>
                {sent ? "Back" : designed ? "Back to editing" : next ? "Build my care package" : "Start designing"}
              </button>
            </div>
          ) : null}
          {visited && next ? (
            <div className="gft-pp-next" hidden={stage !== "next"} {...(!wide && peek ? { inert: "" } : {})}>
              <GiftSentContext.Provider value={sentHost}>
                {next({ back: toGift, close: shut, collapse: wide ? undefined : () => setPeek(true), quick, change })}
              </GiftSentContext.Provider>
            </div>
          ) : null}
          {stage === "next" ? null : (
          <>
          {builder ? (
            <div className="gft-pp-head" data-ph-show="" {...(!wide && peek ? { inert: "" } : {})}>
              {/* One head for every step, the checkout's too (Sam, 6 Nov
                  2026: "consistent across every single step of the modal"):
                  the title with the phone drawer's × at its right, the line
                  under it, then the bars (gift.css). */}
              <h2 className="gft-pp-title" tabIndex={-1}>
                {part === "note" ? (
                  fixedTo ? (
                    <>
                      Write <span className="ph-mask">{fixedTo}</span>’s note
                    </>
                  ) : (
                    "Write their note"
                  )
                ) : fixedTo ? (
                  <>
                    Build <span className="ph-mask">{fixedTo}</span>’s care package
                  </>
                ) : (
                  "Build their care package"
                )}
              </h2>
              {/* The drawer's button lowers it ("it should collapse the modal
                  not close out the designer page"): a down arrow, not an ×,
                  now the screen's top left has the × that closes (Sam, 8 Nov
                  2026: "Can we have the "X" here be a down arrow"). */}
              {wide ? null : (
                <button type="button" className="gft-pp-x" aria-label="Collapse" onClick={() => setPeek(true)}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="M6 9.5l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              {/* The photo is on the note now (Sam, 6 Nov 2026: "maybe we
                  have photo be on the write their note page?"). */}
              <p className="gft-pp-sub">
                {part === "note"
                  ? "The note and photo are optional."
                  : part === "open"
                    ? "Tap one to watch it play."
                    : "Pick how it looks."}
              </p>
              <ResumeLine step={part} />
              <StepBars className="gft-pp-steps" total={stepsTotal} lit={stepAt} label={`Step ${stepAt} of ${stepsTotal}`} />
            </div>
          ) : null}
          <div
            ref={body}
            className="gft-pp-body"
            data-part={builder ? part : undefined}
            data-ph-show={builder && part !== "note" ? "" : undefined}
            {...(!wide && peek ? { inert: "" } : {})}
          >
            {/* Stage 1, the look (C · One look screen, 7 Nov 2026). Stage
                2, what plays when they open it, every one (9 Nov 2026).
                Stage 3, the note: their name, the note, how it's signed,
                then the photo. Without the builder, all of it, in the order
                it always had. */}
            {builder ? (
              part === "look" ? (
                <LookPicker scene={scene} onPick={pick} />
              ) : part === "open" ? (
                <EffectPicker effect={d.effect ?? null} onPick={pickEffect} />
              ) : (
                <div className="gft-pp-group">
                  {noteFields}
                  <div className="gft-pp-field">
                    <span data-ph-show="">Photo</span>
                    {photoParts}
                  </div>
                </div>
              )
            ) : (
              <>
                <div className="gft-pp-group">
                  <h2 className="gft-pp-h" data-ph-show="">Make it theirs</h2>
                  {noteFields}
                  <div className="gft-pp-field">
                    <span data-ph-show="">Photo</span>
                    {photoParts}
                  </div>
                </div>
                <EffectPicker effect={d.effect ?? null} onPick={pickEffect} />
                <ScenePicker scene={scene} onPick={pick} />
              </>
            )}
          </div>
          <div className="gft-pp-foot" data-ph-show="" {...(!wide && peek ? { inert: "" } : {})}>
            {/* Back a stage, beside Continue, from the second stage on (Sam,
                6 Nov 2026: "a back arrow next to the 'continue' button ...
                its own container with the same corner radius"). */}
            {builder && part !== "look" ? <BackArrow className="gft-pp-backarrow" onClick={() => toPart(PARTS[PARTS.indexOf(part) - 1])} /> : null}
            {/* B · Send as is beside Continue on the look: always on a
                computer (its builder opens here, with no card first), and
                on a phone once they've chosen it and come back to Change. */}
            {builder && next && part === "look" ? (
              <button type="button" className="gft-pp-ghost gft-pp-ghost-fit" onClick={sendAsIs}>
                Send as is
              </button>
            ) : null}
            <button type="button" className="gft-pp-cta" onClick={(e) => go(e.currentTarget)} disabled={photoBusy}>
              {action.label}
            </button>
          </div>
          </>
          )}
        </aside>
        </ResumeContext.Provider>
      ) : null}
      {/* Tapping the page above the open drawer collapses it (Sam, 6 Nov
          2026: "when I click above the designing modal it should collapse
          the modal ... instead of being able to drag the modal"); the
          drawer no longer drags. */}
      {!wide && builder && !peek && !sent ? <div className="gft-pp-above" aria-hidden="true" onClick={() => setPeek(true)} /> : null}
      {/* An X at the screen's top left closes the builder on a phone (Sam,
          8 Nov 2026: "on mobile add an "X" to the top left of the care
          package preview builder to close that editor"), drawer up or down;
          the drawer's own x still only lowers it. A computer keeps Close. */}
      {!wide && builder ? (
        <button type="button" className="gft-preview-x" aria-label="Close" onClick={shut} data-ph-show="">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
      {/* Sent, on a phone: the band of background above the done drawer,
          clipped at its top edge, that the envelope rises through and the
          strip lands in. */}
      {sent && !wide ? (
        <div ref={sentBand} className="gft-sent-band gft-a" data-scene={scene} hidden={seeing}>
          {sentLine}
          {sent.texted ? (
            <div ref={flyer} className="gft-sent-flyer" aria-hidden="true">
              <div className="gft-a-shell">
                <Envelope scene={scene} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div ref={veil} className="gft-preview-veil" aria-hidden="true" />
      {/* No Preview button (Sam, 6 Nov 2026: "instead of having the preview
          button I think we should just let the X on the modal do the
          work"): the drawer's × collapses it to show the card. */}
    </div>,
    document.body,
  );
}
