import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { Link, useLocation, useParams } from "react-router-dom";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import {
  isScene,
  previewGift,
  SAMPLE_PHOTO,
  SCENES,
  thanksHref,
  type Gift,
  type SceneId,
} from "../model/gift";
import { GIFT_NOT_FOUND, lookupGift, parentMock } from "../model/parents";
import { takeKey } from "../model/redact";
import { appHref } from "../shell/GetTheApp";
import { useDockPulse } from "../shell/dockPulse";
import { DockArrow } from "../shell/DockArrow";
import { CREDIT, FlatMark, MIN_ORDER, PERCENT, PLACES, reducedMotion } from "./parents_kit";

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

/* Each background's own drift (gift.css .gft-scene-pat): one tile's travel
   per loop, so it never seams; scenery breathes instead; the sunburst turns.
   Slow enough to notice only when you look. Maroon is a plain field: still. */
const SCENE_MOTION: Partial<Record<string, { kf: Keyframe[]; ms: number; alternate?: boolean }>> = {
  picnic: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-36px, -36px)" }], ms: 7000 },
  night: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-220px, 0)" }], ms: 60000 },
  confetti: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(0, 180px)" }], ms: 14000 },
  airmail: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-32px, 0)" }], ms: 4000 },
  sunrise: { kf: [{ transform: "scale(1)" }, { transform: "scale(1.04)" }], ms: 6000, alternate: true },
  ridge: { kf: [{ transform: "scale(1)" }, { transform: "scale(1.03)" }], ms: 7000, alternate: true },
  hearts: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(0, -160px)" }], ms: 16000 },
  flannel: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-64px, -64px)" }], ms: 18000 },
  lunch: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-220px, -220px)" }], ms: 44000 },
  sunburst: { kf: [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], ms: 120000 },
  leaves: { kf: [{ transform: "translate(0, 0)" }, { transform: "translate(-220px, 220px)" }], ms: 26000 },
};
const GIFT_KEY = "tp_gift_v1";
const SAMPLE_PHOTO_SRC = asset(SAMPLE_PHOTO);
const QR = asset("/brand/tapin-app-qr.svg");
export { SAMPLE_PHOTO_SRC };

type Load =
  | { state: "loading" }
  | { state: "ok"; gift: Gift; sample: boolean }
  | { state: "ended"; to: string | null; from: string }
  | { state: "missing" }
  /* The lookup failed for another reason (offline, busy): the link may be
     fine, so it's worth another try. */
  | { state: "retry" };

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
    /* Local dev with no key and no mock: the sample, so the page can be seen. */
    if (!token && import.meta.env.DEV && !parentMock()) return { state: "ok", gift: previewGift(search, SAMPLE_PHOTO_SRC), sample: true };
    return token ? { state: "loading" } : { state: "missing" };
  });

  useEffect(() => {
    if (!token || load.state !== "loading") return;
    let live = true;
    lookupGift(token).then(
      (g) => {
        if (!live) return;
        if (g.state === "ok") {
          setLoad({
            state: "ok",
            sample: false,
            gift: {
              to: g.to,
              from: g.from,
              note: g.note,
              masked: g.masked_phone,
              scene: isScene(g.scene) ? g.scene : "maroon",
              photo: g.photo_url ?? null,
            },
          });
        } else setLoad({ state: "ended", to: g.to, from: g.from });
      },
      (err: unknown) => {
        if (!live) return;
        setLoad({ state: err instanceof Error && err.message.replace(/’/g, "'") === GIFT_NOT_FOUND ? "missing" : "retry" });
      },
    );
    return () => {
      live = false;
    };
  }, [token, load.state]);

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

  useEffect(() => {
    const was = document.title;
    const from = load.state === "ok" ? load.gift.from : load.state === "ended" ? load.from : null;
    document.title = from ? `A gift from ${from} · Tapin Plus` : "Tapin Plus";
    return () => {
      document.title = was;
    };
  }, [load]);

  /* ph-no-capture: the note, the names and the masked number are a family's
     own words, so session replay and autocapture skip this page's content. */
  if (load.state === "ok") {
    if (!load.sample)
      return (
        <div className="gft-wrap">
          <Letter gift={load.gift} sample={false} />
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
                <Envelope />
              </div>
            </div>
          </>
        ) : load.state === "ended" ? (
          <div className="gft-plain">
            <h1 className="gft-h1">
              {load.from}’s gift <span className="gft-nowrap">has ended</span>
            </h1>
            <p className="gft-plain-line">
              Tapin Plus isn’t on {load.to ? `${load.to}’s` : "this"} number anymore. You can still join on your own.
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
            <p className="gft-plain-line">
              The link may be old. If someone signed you up for Tapin Plus, it’s on your number: sign in with it.
            </p>
            <a className="gft-open" href={appHref()} onClick={() => track("gift_get_app", { state: "missing" })}>
              Get the app
            </a>
            <Link className="gft-plain-link" to="/in">
              Sign in on the web
            </Link>
          </div>
        )}
      </header>
    </div>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

/** The care package: brown kraft (the inside, the pocket, the flap), twine
 *  tied round it, and a maroon wax seal with the flat Plus mark (Sam, 6 Nov
 *  2026: "I think we should just use the flat tapin plus icon"). */
function Envelope({
  flap,
  seal,
  extra,
}: {
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
      <span ref={seal} className="gft-a-seal">
        <FlatMark />
      </span>
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
export function EnvelopeDemo({ play, gift }: { play: boolean; gift: Pick<Gift, "to" | "from" | "note"> }) {
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
    const lift = Math.min(words + 12 + 10, el.offsetHeight - 140);
    /* It starts up as the flap passes upright (~710ms), so the opening
       never shows a still, blank card (Sam, 6 Nov 2026). The sleeve keeps
       its foot hidden under the envelope. */
    go(el, [{ transform: "translateY(0)" }, { transform: `translateY(${-lift}px)` }], { duration: 820, delay: 680 });
  }, [play]);
  return (
    <div className="gft gft-a gft-mini" data-state="sealed" aria-hidden="true">
      <div className="gft-a-stage">
        <div className="gft-a-shell">
          <Envelope flap={flap} seal={seal} extra={extra} />
        </div>
        <div className="gft-a-sleeve">
          <div ref={letter} className="gft-a-letter">
            <div className="gft-a-head">
              <span>For {gift.to ?? "you"}</span>
            </div>
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

/** What's in Plus: three things, in figures, and the five places. */
function WhatsIn() {
  return (
    <section className="gft-in" aria-labelledby="gft-in-h">
      <h2 id="gft-in-h" className="gft-h2">
        What’s in it
      </h2>
      <ul className="gft-perks">
        <li>
          <b className="tnum">${CREDIT} back</b>
          <span>every week at each place below, on a ${MIN_ORDER}+ food order</span>
        </li>
        <li>
          <b className="tnum">{PERCENT}% off</b>
          <span>instead, once a day, whenever that’s better</span>
        </li>
        <li>
          <b>Points</b>
          <span>on everything you order</span>
        </li>
      </ul>
      <ul className="gft-logos" aria-label="Where it works">
        {PLACES.map((p) => (
          <li key={p.id}>
            <img src={p.logo} alt={p.name} decoding="async" loading="lazy" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** How to claim it, and a thank-you home. The button itself is the dock's
 *  ("Claim my gift"), always in reach. */
function Next({ gift, sample, preview = false, cta }: { gift: Gift; sample: boolean; preview?: boolean; cta?: DockCta }) {
  const { track } = useEventTracking();
  return (
    <div className="gft-next">
      {/* On a wide screen there's no dock: the button sits here, with the
          QR code for the phone the app goes on (gift.css, @container). */}
      <div className="gft-next-wide">
        {cta ? (
          <button type="button" className="gft-cta-inline" onClick={(e) => cta.onClick(e.currentTarget)}>
            {cta.label}
          </button>
        ) : (
          <>
            <a
              className="gft-cta-inline"
              href={appHref()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (preview) e.preventDefault();
                else track("gift_claim", { sample, where: "inline" });
              }}
            >
              Claim my gift
            </a>
            <div className="gft-qr">
              <img src={QR} alt="" width="88" height="88" />
              <span>Plus is used in the Tapin app. Scan this with your phone to get it.</span>
            </div>
          </>
        )}
      </div>
      <p className="gft-sign tnum">
        Get the app and sign in with your number, <b>{gift.masked}</b>. Plus is already on it.
      </p>
      <a
        className="gft-thanks"
        href={thanksHref(gift.from)}
        onClick={(e) => {
          if (preview) e.preventDefault();
          else track("gift_thanks", { sample });
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M20 11.5c0 4-3.6 7-8 7-1.1 0-2.2-.2-3.1-.5L4 19.5l1.4-3.6C4.5 14.7 4 13.2 4 11.5c0-4 3.6-7 8-7s8 3 8 7Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        Text {gift.from} a thank-you
      </a>
    </div>
  );
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
}: {
  gift: Gift;
  sample: boolean;
  preview?: boolean;
  cta?: DockCta;
}) {
  const { track } = useEventTracking();
  const [state, setState] = useState<"sealed" | "opening" | "open">("sealed");
  const seal = useRef<HTMLSpanElement | null>(null);
  const flap = useRef<HTMLSpanElement | null>(null);
  const extra = useRef<HTMLSpanElement | null>(null);
  const letter = useRef<HTMLDivElement | null>(null);
  const shell = useRef<HTMLDivElement | null>(null);
  const sleeve = useRef<HTMLDivElement | null>(null);
  const title = useRef<HTMLHeadingElement | null>(null);
  const after = useRef<HTMLElement | null>(null);
  const runs = useRef<Animation[]>([]);
  useEffect(() => () => runs.current.forEach((a) => a.cancel()), []);
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
     paused while the page is hidden or the band is off screen, and a swell
     when the card comes out (the drift speeds up, then eases back). */
  const scene = useRef<HTMLDivElement | null>(null);
  const pat = useRef<HTMLDivElement | null>(null);
  const drift = useRef<Animation | null>(null);
  useEffect(() => {
    const m = SCENE_MOTION[gift.scene];
    const el = pat.current;
    if (!m || !el || still || typeof el.animate !== "function") return;
    const a = el.animate(m.kf, {
      duration: m.ms,
      iterations: Infinity,
      easing: m.alternate ? "ease-in-out" : "linear",
      direction: m.alternate ? "alternate" : "normal",
    });
    drift.current = a;
    let onScreen = true;
    const sync = () => (onScreen && !document.hidden ? a.play() : a.pause());
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
      a.cancel();
      drift.current = null;
      document.removeEventListener("visibilitychange", sync);
      io?.disconnect();
    };
  }, [gift.scene, still]);
  const bloom = () => {
    go(scene.current, [
      { transform: "scale(1)" },
      { transform: "scale(1.06)", offset: 0.4 },
      { transform: "scale(1)" },
    ], { duration: 1800, easing: "cubic-bezier(.3,0,.2,1)", fill: "none" });
    const a = drift.current;
    if (!a) return;
    [[0, 6], [500, 3], [1000, 1.6], [1500, 1]].forEach(([at, rate]) =>
      window.setTimeout(() => {
        if (drift.current === a) a.updatePlaybackRate(rate);
      }, at),
    );
  };

  /* Focus follows the gift: to the new heading once it's open. */
  const settle = () => title.current?.focus({ preventScroll: true });
  const started = useRef(false);
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
    /* The card: up, and the clip's line held on the envelope's foot. As it
       starts to come out, the background answers (bloom). */
    const RISE = { duration: 700, delay: 880 };
    window.setTimeout(bloom, RISE.delay - 120);
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
    el.getAnimations().forEach((a) => a.cancel());
    flushSync(() => setState("open"));
    const last = el.getBoundingClientRect();
    go(el, [
      { transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)`, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.12)" },
      { transform: "none", boxShadow: "0 20px 44px rgba(0, 0, 0, 0.32)" },
    ], { duration: 640, fill: "none" });
    settle();
    titleOut?.cancel();
    go(title.current, [
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "none" },
    ], { duration: 520, delay: 160, fill: "backwards" });
  };

  const to = gift.to;
  const button = useRef<HTMLButtonElement | null>(null);
  /* ── The dock (Sam, 6 Nov 2026: "we should have a sticky 'claim my gift'
     button at the bottom of the page"): once it's open, the one thing to do
     stays in reach, sliding up as the letter settles, and breathing gently
     like the Plus pages' dock (shell/dockPulse.ts). */
  const dock = useRef<HTMLDivElement | null>(null);
  useDockPulse(dock, state === "open");
  useLayoutEffect(() => {
    if (state !== "open" || still || !dock.current) return;
    const a = dock.current.animate(
      [
        { transform: "translateY(calc(100% + 24px))" },
        { transform: "none" },
      ],
      { duration: 560, delay: 520, easing: EASE, fill: "backwards" },
    );
    return () => a.cancel();
  }, [state, still]);
  return (
    <div
      className="gft gft-a ph-no-capture"
      data-state={state}
      data-scene={gift.scene}
    >
      <header className="gft-a-band">
        <div ref={scene} className="gft-scene" aria-hidden="true">
          <div ref={pat} className="gft-scene-pat" />
        </div>
        <h1 ref={title} className="gft-h1" tabIndex={-1}>
          {/* The inner span is the paper strip the busier backgrounds
              set the heading on. */}
          <span className="gft-h1-in">
            {state === "open" ? (
              <>
                {gift.from} got you <span className="gft-nowrap">Tapin Plus</span>
              </>
            ) : (
              <>
                {to ? `${to}, ` : ""}
                {gift.from} sent you <span className="gft-nowrap">something</span>
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
          {state === "open" && still ? null : (
            <div ref={shell} className="gft-a-shell" aria-hidden="true">
              <Envelope flap={flap} seal={seal} extra={extra} />
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
              <span>For {to ?? "you"}</span>
              {/* No mark on the card (Sam, 6 Nov 2026: "you can remove the
                  tapin plus icon from the card too"): it's their letter. */}
            </div>
            {/* The parent's photo, printed at the top of the letter: the
                first thing that rises out of the envelope. */}
            {gift.photo ? (
              <img className="gft-a-photo" src={gift.photo} alt={`A photo from ${gift.from}`} decoding="async" />
            ) : null}
            {gift.note ? (
              <>
                <p className="gft-a-note">{gift.note}</p>
                <p className="gft-a-sig">{gift.from}</p>
              </>
            ) : (
              <p className="gft-a-note">{gift.from} signed you up for Tapin Plus.</p>
            )}
          </div>
          </div>
        </div>
        {state !== "open" ? (
          <button
            ref={button}
            type="button"
            className="gft-open"
            onClick={open}
            disabled={state !== "sealed"}
            aria-hidden={state !== "sealed" ? true : undefined}
          >
            Open it
          </button>
        ) : null}
      </header>
      {state === "open" ? (
        <main ref={after} className="gft-after">
          <WhatsIn />
          <Next gift={gift} sample={sample} preview={preview} cta={cta} />
        </main>
      ) : null}
      {state === "open" ? (
        <div ref={dock} className="gft-dock">
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

/* ══ THE PARENT'S PREVIEW (Sam, 6 Nov 2026: "on the parent's page, can we
   have a preview of the card they're sending? if parents want to preview it
   first before sending") ═══════════════════════════════════════════════════
   The student's gift page, whole, over the checkout, made from what the
   parent has typed and picked: the same envelope, the same opening, their
   note, photo and background. Nothing in it does anything (no tracking, no
   links); "Back to checkout" or Escape closes it. */
export function GiftPreview({
  gift,
  onClose,
  cta,
  backLabel = "Back to checkout",
}: {
  gift: Gift;
  onClose: () => void;
  /** The dock's button in the preview (Sam, 6 Nov 2026: "the CTA would
   *  still be sign up my student or go back to checkout"). */
  cta: DockCta;
  backLabel?: string;
}) {
  const back = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const was = document.activeElement as HTMLElement | null;
    back.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      /* Tab stays inside the preview. */
      if (e.key !== "Tab") return;
      const box = document.querySelector<HTMLElement>(".gft-preview");
      if (!box) return;
      const els = Array.from(box.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex='0']")).filter(
        (el) => el.getClientRects().length > 0 && el.getAttribute("aria-hidden") !== "true",
      );
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
  /* A phone-sized pop-up on a computer, the whole screen on a phone; the
     student's page inside it is laid out as on a phone either way (its
     wide layout keys on its own width, @container, not the screen's). */
  return createPortal(
    <div className="gft-preview" role="dialog" aria-modal="true" aria-label="Preview of their gift">
      <div className="gft-preview-scrim" onClick={onClose} aria-hidden="true" />
      <div className="gft-preview-frame">
        <button ref={back} type="button" className="gft-preview-back" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel}
        </button>
        <div className="gft-preview-scroll gft-wrap">
          <Letter gift={gift} sample preview cta={cta} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
