import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
const GIFT_KEY = "tp_gift_v1";
const SAMPLE_PHOTO_SRC = asset(SAMPLE_PHOTO);

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
    if (!load.sample) return <Letter gift={load.gift} sample={false} />;
    return (
      <>
        <Letter key={`${load.gift.scene}-${!!load.gift.photo}`} gift={load.gift} sample />
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
function Next({ gift, sample }: { gift: Gift; sample: boolean }) {
  const { track } = useEventTracking();
  return (
    <div className="gft-next">
      <p className="gft-sign tnum">
        Get the app and sign in with your number, <b>{gift.masked}</b>. Plus is already on it.
      </p>
      <a className="gft-thanks" href={thanksHref(gift.from)} onClick={() => track("gift_thanks", { sample })}>
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
function Letter({ gift, sample }: { gift: Gift; sample: boolean }) {
  const { track } = useEventTracking();
  const [state, setState] = useState<"sealed" | "opening" | "open">("sealed");
  const seal = useRef<HTMLSpanElement | null>(null);
  const flap = useRef<HTMLSpanElement | null>(null);
  const extra = useRef<HTMLSpanElement | null>(null);
  const letter = useRef<HTMLDivElement | null>(null);
  const shell = useRef<HTMLDivElement | null>(null);
  const title = useRef<HTMLHeadingElement | null>(null);
  const after = useRef<HTMLElement | null>(null);
  const runs = useRef<Animation[]>([]);
  useEffect(() => () => runs.current.forEach((a) => a.cancel()), []);
  useRiseIn(after, state === "open", 120);
  const [still] = useState(reducedMotion);

  /* ── The letter is a whole card from the start (Sam, 6 Nov 2026: "the
     process of the envelope opening and the card coming out of the
     envelope feels off"). It sits in the envelope at its full length; the
     pocket hides it, and a clip hides whatever of it hangs below the
     envelope's foot. So it never grows or unrolls: it only moves, and the
     clip's line always stays on the envelope's bottom edge. */
  const ENV_H = 226; /* .gft-a-shell */
  const TOP = 12; /* the letter's top inside the envelope */
  const below = (h: number, up: number, down: number) => Math.max(0, h - (ENV_H - TOP) - up - down);
  useLayoutEffect(() => {
    const el = letter.current;
    if (!el || state !== "sealed") return;
    el.style.clipPath = `inset(0 0 ${below(el.offsetHeight, 0, 0)}px 0)`;
  }, [state, gift]);

  const go = (el: Element | null | undefined, kf: Keyframe[], o: KeyframeAnimationOptions) => {
    const a = el?.animate?.(kf, { fill: "both", easing: EASE, ...o });
    if (a) runs.current.push(a);
    return a;
  };

  /* Focus follows the gift: to the new heading once it's open. */
  const settle = () => title.current?.focus({ preventScroll: true });
  const open = async () => {
    if (state !== "sealed") return;
    track("gift_opened", { sample, has_note: !!gift.note });
    const el = letter.current;
    if (still || !el) {
      if (el) el.style.clipPath = "";
      flushSync(() => setState("open"));
      settle();
      return;
    }
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
    const drop = Math.round(ENV_H * 0.8);
    const twineH = extra.current?.querySelector<HTMLElement>(".gft-a-twine-h");
    const twineV = extra.current?.querySelector<HTMLElement>(".gft-a-twine-v");
    if (twineH) twineH.style.transformOrigin = "50% 50%";
    if (twineV) twineV.style.transformOrigin = "50% 62%";

    go(button.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "linear" });
    const titleOut = go(title.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "linear" });
    go(twineH, [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: 420, easing: "cubic-bezier(.6,0,.2,1)" });
    go(twineV, [{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: 420, easing: "cubic-bezier(.6,0,.2,1)" });
    go(seal.current, [
      { transform: "none", opacity: 1 },
      { transform: "translateY(5px) scale(.96)", opacity: 1, offset: 0.16 },
      { transform: "translateY(-150px) rotate(-10deg)", opacity: 0 },
    ], { duration: 580, delay: 380, easing: "cubic-bezier(.45,0,.3,1)" });
    go(flap.current, [
      { transform: "rotateX(0deg)", zIndex: 4, backgroundColor: "var(--env-flap)" },
      { transform: "rotateX(90deg)", zIndex: 4, backgroundColor: "var(--env-edge)", offset: 0.5 },
      { transform: "rotateX(90deg)", zIndex: 1, backgroundColor: "var(--env-edge)", offset: 0.501 },
      { transform: "rotateX(180deg)", zIndex: 1, backgroundColor: "var(--env-inside)" },
    ], { duration: 500, delay: 460, easing: "cubic-bezier(.4,0,.2,1)" });
    /* The card: up, and the clip's line held on the envelope's foot. */
    const RISE = { duration: 700, delay: 880 };
    const DROP = { duration: 600, delay: 1600 };
    go(el, [{ transform: "translateY(0)" }, { transform: `translateY(${-up}px)` }], RISE);
    const total = DROP.delay + DROP.duration - RISE.delay;
    const dropAt = (DROP.delay - RISE.delay) / total;
    const clip = go(el, [
      { clipPath: `inset(0 0 ${below(H, 0, 0)}px 0)`, easing: EASE },
      { clipPath: `inset(0 0 ${below(H, up, 0)}px 0)`, offset: RISE.duration / total },
      { clipPath: `inset(0 0 ${below(H, up, 0)}px 0)`, offset: dropAt, easing: "cubic-bezier(.5,0,.75,0)" },
      { clipPath: `inset(0 0 ${below(H, up, drop)}px 0)` },
    ], { duration: total, delay: RISE.delay, easing: "linear" });
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
    el.style.clipPath = "";
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
          <div ref={letter} className="gft-a-letter" aria-hidden={state === "sealed" ? true : undefined}>
            <div className="gft-a-head">
              <span>For {to ?? "you"}</span>
              {/* The flat Plus mark in ink (Sam, 6 Nov 2026: "I think we can
                  just use the black tapin plus icon here"). */}
              <FlatMark />
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
          <Next gift={gift} sample={sample} />
        </main>
      ) : null}
      {state === "open" ? (
        <div ref={dock} className="gft-dock">
          <a className="gft-dock-cta tpa-dock-cta" href={appHref()} onClick={() => track("gift_claim", { sample })}>
            Claim my gift
          </a>
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
