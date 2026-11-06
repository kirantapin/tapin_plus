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
  /* While the envelope falls away the letter stays behind its pocket, so
     the letter is uncovered by the envelope leaving, not all at once. */
  const [leaving, setLeaving] = useState(false);
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
    if (still) {
      flushSync(() => setState("open"));
      settle();
      return;
    }
    setState("opening");
    /* ── The care package opening (Sam, 6 Nov 2026: "I think it's a bit busy
       right now"), as four beats, one thing moving at a time:
         1. untie (0–380ms): the heading and the button step aside, and the
            wax seal comes off with the twine, one gesture, the way you'd
            pull the bow: everything string-like leaves to the right;
         2. fold back (340–860ms): the flap folds over on a flat perspective,
            so it doesn't loom over the page;
         3. rise (820–1500ms): the letter comes up, slow out;
         4. settle: the envelope sinks away and the letter takes its place.
       Linear-ish ease-ins for things leaving, long ease-outs for things
       arriving; no pops, no overshoot. */
    const away = "cubic-bezier(.5,0,.75,0)";
    go(button.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "linear" });
    const titleOut = go(title.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "linear" });
    go(seal.current, [
      { transform: "none", opacity: 1 },
      { transform: "translate(18px, -6px) rotate(14deg)", opacity: 0 },
    ], { duration: 340, easing: away });
    go(extra.current?.querySelector(".gft-a-twine-h"), [
      { transform: "none", opacity: 1 },
      { transform: "translateX(36%)", opacity: 0 },
    ], { duration: 360, delay: 20, easing: away });
    go(extra.current?.querySelector(".gft-a-twine-v"), [
      { transform: "none", opacity: 1 },
      { transform: "translateX(48px)", opacity: 0 },
    ], { duration: 360, delay: 20, easing: away });
    go(flap.current, [
      { transform: "rotateX(0deg)", zIndex: 4 },
      { transform: "rotateX(90deg)", zIndex: 4, offset: 0.5 },
      { transform: "rotateX(90deg)", zIndex: 1, offset: 0.501 },
      { transform: "rotateX(180deg)", zIndex: 1 },
    ], { duration: 520, delay: 340, easing: "cubic-bezier(.55,0,.25,1)" });
    const rise = go(letter.current, [
      { transform: "translateY(0)" },
      { transform: "translateY(-62%)" },
    ], { duration: 680, delay: 820, easing: EASE });
    if (rise) await rise.finished.then(() => undefined, () => undefined);
    const el = letter.current;
    if (!el) return;
    const first = el.getBoundingClientRect();
    const shellFirst = shell.current?.getBoundingClientRect();
    rise?.cancel();
    flushSync(() => {
      setLeaving(true);
      setState("open");
    });
    const last = el.getBoundingClientRect();
    const shellLast = shell.current?.getBoundingClientRect();
    /* The band and stage change layout here; the envelope starts its fall
       from where it was, not from where the new layout puts it. */
    const dy = shellFirst && shellLast ? shellFirst.top - shellLast.top : 0;
    go(el, [
      { transform: `translateY(${first.top - last.top}px)`, height: `${first.height}px` },
      { transform: "none", height: `${last.height}px` },
    ], { duration: 720, fill: "none" });
    const fall = go(shell.current, [
      { transform: `translateY(${dy}px)`, opacity: 1 },
      { transform: `translateY(${dy + 44}px)`, opacity: 0 },
    ], { duration: 440, easing: "cubic-bezier(.5,0,.75,0)" });
    settle();
    void (fall ? fall.finished.then(() => undefined, () => undefined) : Promise.resolve()).then(() => setLeaving(false));
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
      data-leaving={leaving ? "" : undefined}
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
