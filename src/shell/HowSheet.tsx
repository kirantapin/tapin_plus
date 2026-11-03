import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SCENES } from "./Scenes";
import { TYPICAL_ORDER_USD, monthlyBack } from "../model/savings";
import { buildSlides } from "../routes/How";
import { asset } from "../asset";
import { WelcomeEnds } from "./WelcomeOffer";

/* ══ HOW IT WORKS, THE OLD WALKTHROUGH IN THE APP'S LOOK (Sam, 3 Nov 2026) ══
   "I like the new 'how it works' modal - but i feel like it got rid of a lot
   of what the old one had." So this is the old /how deck's own steps and art
   (routes/How.tsx buildSlides, shell/Scenes.tsx), not a summary of them:
   what you spend, what that's worth, an order with 15% off or the $5
   credit, catching a deal, special offers, cover and line skips, points, how
   you get it, and the close. The art renders on the light ramp ([data-lit])
   inside the app-look sheet; the bars fill over each step's own dwell and
   move on by themselves, except the spend question, which waits for an
   answer. Back stops the autoplay, as it did. "Skip to the price" jumps to
   the close, which ends on Join.

   Three lines are re-said for the 3 Nov facts: the $5 is earned on food and
   non-alcoholic drinks, the 15% once a day, and the close's price is the
   app's. Portalled to <body>; Escape closes; arrows step. */

const ease = "cubic-bezier(.22,1,.36,1)";
const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

/** The spend question is asked by the week now (Sam, 3 Nov 2026). */
const HEADS: Record<string, string> = {
  spend: "What do you spend in a month on food and drinks?",
};

/** One short line a slide, by slide id (Sam, 3 Nov 2026: "there's just
 *  too much text on some of these slides"). The rules in full live in the
 *  page's What you get, questions and fine print. */
const LINES: Record<string, string> = {
  spend: "Coffee, lunch, dinner.",
  order: "Or pay full price on $10+ and get $5 back.",
  myspot: "Order now, pick it up later.",
  offers: "From each place, for members.",
  entry: "Points, and 15% off once a day.",
  points: "Spend them where you earned them.",
  redeem: "Show your phone, or it goes to the kitchen.",
};

export default function HowSheet({
  onClose,
  joinHref,
  onJoin,
}: {
  onClose: () => void;
  joinHref: string;
  onJoin: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  /* A month's spend, and a month back (Sam, 3 Nov 2026: "a month and a
     month"), worked order by order (savings.ts monthlyBack). */
  const [spend, setSpend] = useState(200);
  const slides = useMemo(() => buildSlides(spend), [spend]);
  const s = monthlyBack(spend);
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(!still());
  const dir = useRef(1);
  const sheet = useRef<HTMLDivElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const bars = useRef<Array<HTMLSpanElement | null>>([]);
  const slide = slides[i];
  const last = i === slides.length - 1;
  const Scene = SCENES[slide.id];

  const go = useCallback(
    (n: number) =>
      setI((cur) => {
        const next = Math.max(0, Math.min(slides.length - 1, n));
        dir.current = next >= cur ? 1 : -1;
        return next;
      }),
    [slides.length],
  );

  const close = useCallback(() => {
    const el = sheet.current;
    if (!el || still() || typeof el.animate !== "function") return onClose();
    const run = el.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(24px)", opacity: 0 }], { duration: 200, easing: "ease-in" });
    run.onfinish = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.focus();
    if (!still()) sheet.current?.animate?.([{ transform: "translateY(40px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 380, easing: ease });
    return () => {
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") {
        setAuto(false);
        go(i - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, go, i]);

  /* Each step slides in from the side it came from. */
  useEffect(() => {
    if (still()) return;
    body.current?.animate?.([{ transform: `translateX(${dir.current * 28}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 340, easing: ease });
  }, [i]);

  /* The current bar fills over the step's dwell; when it is full the deck
     moves on. The spend question holds, and so does the close. */
  useEffect(() => {
    const bar = bars.current[i];
    if (!bar || !auto || slide.hold || last || !slide.dwellMs || typeof bar.animate !== "function") return;
    const run = bar.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: slide.dwellMs, easing: "linear", fill: "forwards" });
    run.onfinish = () => go(i + 1);
    return () => {
      run.onfinish = null;
      run.cancel();
    };
  }, [i, auto, slide.hold, slide.dwellMs, last, go]);

  const toSpend = () => {
    setAuto(false);
    go(slides.findIndex((x) => x.id === "spend"));
  };
  const isFigure = slide.id === "value" || last;
  const nextLabel = ("next" in slide && slide.next) || "Next";

  return createPortal(
    <div className="hs-layer" onClick={(e) => e.target === e.currentTarget && close()}>
      <div ref={sheet} className="hs-sheet" role="dialog" aria-modal="true" aria-label="How Tapin Plus works" tabIndex={-1}>
        <div className="hs-top">
          <ol className="hs-bars" aria-label={`Step ${i + 1} of ${slides.length}`}>
            {slides.map((x, n) => (
              <li key={x.id} data-done={n < i ? "" : undefined}>
                <span
                  ref={(el) => {
                    bars.current[n] = el;
                  }}
                  data-on={n === i && (!auto || slide.hold || last) ? "" : undefined}
                />
              </li>
            ))}
          </ol>
          <span className="hs-count tnum" aria-hidden="true">
            {i + 1} / {slides.length}
          </span>
          <button type="button" className="hs-x" aria-label="Close" onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div ref={body} className="hs-body" key={slide.id} aria-live="polite">
          {/* The close's art was the presale membership card ("Early-ish
              Bird", "Halloween 2026"); it is the collage and the paper
              Plus mark now, as on the page. */}
          {last ? (
            <div className="hs-scene hs-close-art">
              <img className="hs-collage" src={asset("/collage/blacksburg.webp")} alt="" decoding="async" />
              <img className="hs-paper" src={asset("/brand/plus-paper-mark.svg")} alt="" decoding="async" />
            </div>
          ) : (
          <div className="hs-scene" data-lit="">
            {Scene ? (
              <Scene
                spend={spend}
                setSpend={(n: number) => {
                  setSpend(n);
                }}
              />
            ) : null}
          </div>
          )}
          {isFigure ? (
            <>
              <h2 className="hs-head">
                {slide.id === "value" ? (
                  <>
                    Spend{" "}
                    <button type="button" className="hs-spend tnum" onClick={toSpend} aria-label={`$${spend} a month, change what you spend`}>
                      ${spend}
                      {spend >= 300 ? "+" : ""}
                    </button>{" "}
                    a month, get about {money(s.monthlyUsd)} back
                  </>
                ) : (
                  `About ${money(s.monthlyUsd)} back a month`
                )}
              </h2>
              <p className="hs-line">At Plus places, about ${TYPICAL_ORDER_USD} an order. An estimate.</p>
            </>
          ) : (
            <>
              <h2 className="hs-head">
                {HEADS[slide.id] ?? slide.headline}
                {slide.tag ? <span className="hs-tag">{slide.tag}</span> : null}
              </h2>
              <p className="hs-line">{LINES[slide.id] ?? slide.line}</p>
            </>
          )}
        </div>

        <div className="hs-foot">
          {last ? (
            <div>
              <p className="hs-price">$3.99 your first month, then $7.99.</p>
              <WelcomeEnds className="hs-ends" />
            </div>
          ) : null}
          <div className="hs-nav">
            {i > 0 ? (
              <button
                type="button"
                className="hs-back"
                aria-label="Back"
                onClick={() => {
                  setAuto(false);
                  go(i - 1);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : null}
            {last ? (
              <a className="hs-next" href={joinHref} onClick={onJoin}>
                Join Tapin Plus
              </a>
            ) : (
              <button type="button" className="hs-next" onClick={() => go(i + 1)}>
                {nextLabel}
              </button>
            )}
          </div>
          {/* Under the button, not over it (Sam, 3 Nov 2026). */}
          {last ? null : (
            <p className="hs-when">
              <button type="button" className="hs-skip" onClick={() => go(slides.length - 1)}>
                Skip to the price
              </button>
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
