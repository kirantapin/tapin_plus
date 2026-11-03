import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { asset } from "../asset";
import { logoField, venues } from "../model/content";

/* ══ HOW IT WORKS, AS THE APP WOULD SHOW IT (Sam, 3 Nov 2026) ═══════════════
   "I liked the 'how this works' pop up can you bring something like that
   back. We'd /impeccable redesign for this new direction I think."

   The old /how walkthrough, re-said in the app's look: a sheet over the page
   that steps through how Plus works, one idea a step, with the story bars at
   the top, Back and Next at the foot, and Join on the last. The spend picker
   and its savings estimate are not carried over: every figure here is one
   the app states. Portalled to <body> so no filtered ancestor can trap the
   fixed layer. Escape closes; arrows step; focus returns to the opener. */

const PLUS_IDS = ["coffeeholicsva", "sweetopia", "olaika", "themilkparlor", "theburg"];
const PLACES = PLUS_IDS.map((id) => venues.find((v) => v.id === id)).filter(
  (v): v is (typeof venues)[number] => v !== undefined,
);
const PAPER_MARK = asset("/brand/plus-paper-mark.svg");
const COLLAGE = asset("/collage/blacksburg.webp");

interface Step {
  id: string;
  head: string;
  line: string;
  art: () => JSX.Element;
}

const Logos = () => (
  <ul className="hs-logos">
    {PLACES.map((v) => (
      <li key={v.id} className="collar" data-field={logoField(v.id)}>
        <img src={v.logo} alt="" decoding="async" />
      </li>
    ))}
  </ul>
);

const STEPS: Step[] = [
  {
    id: "order",
    head: "Order $10 or more at a Plus place",
    line: `Food or non-alcoholic drinks, at any of the ${PLACES.length} places in Blacksburg.`,
    art: () => (
      <div className="hs-art hs-art-order">
        <b className="hs-big tnum">$10+</b>
        <Logos />
      </div>
    ),
  },
  {
    id: "back",
    head: "$5 comes back, every week, at each place",
    line: "It lands as credit for your next order there. Once a week at each of the five.",
    art: () => (
      <div className="hs-art">
        <div className="hs-chip">
          <span>California Club</span>
          <b className="tnum">$12.00</b>
        </div>
        <div className="hs-chip hs-chip-gain">
          <span>$5 back for next time</span>
          <b className="tnum">+$5.00</b>
        </div>
      </div>
    ),
  },
  {
    id: "spend",
    head: "Spend it next time",
    line: "Your credit comes off your next order, on anything but alcohol.",
    art: () => (
      <div className="hs-art">
        <div className="hs-chip">
          <span>Your $5 credit</span>
          <b className="tnum hs-green">&minus;$5.00</b>
        </div>
        <div className="hs-chip hs-chip-total">
          <span>You pay</span>
          <b className="tnum">$7.00</b>
        </div>
      </div>
    ),
  },
  {
    id: "percent",
    head: "Or take 15% off, once a day",
    line: "On anything but alcohol. One per order: 15% off or your $5 credit.",
    art: () => (
      <div className="hs-art hs-art-percent">
        <b className="hs-big tnum">15%</b>
        <span>off your order</span>
      </div>
    ),
  },
  {
    id: "promise",
    head: "The Plus Promise",
    line: "Save what you spend on Plus, or your money back. Every month counts on its own: ask for a refund and it’s auto-approved.",
    art: () => (
      <div className="hs-art">
        <span className="hs-shield" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="m8.8 12.2 2.2 2.2 4.4-4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    ),
  },
  {
    id: "join",
    head: "$3.99 your first month",
    line: "Then $7.99/month, locked in for as long as you’re a member. The price goes up for new members as more places join.",
    art: () => (
      <div className="hs-art hs-art-join">
        <img className="hs-collage" src={COLLAGE} alt="" decoding="async" />
        <img className="hs-paper" src={PAPER_MARK} alt="" decoding="async" />
      </div>
    ),
  },
];

const ease = "cubic-bezier(.22,1,.36,1)";
const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function HowSheet({
  onClose,
  joinHref,
  onJoin,
}: {
  onClose: () => void;
  joinHref: string;
  onJoin: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const [i, setI] = useState(0);
  const dir = useRef(1);
  const sheet = useRef<HTMLDivElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const last = i === STEPS.length - 1;
  const step = STEPS[i];

  const go = useCallback((n: number) => {
    setI((cur) => {
      const next = Math.max(0, Math.min(STEPS.length - 1, n));
      dir.current = next >= cur ? 1 : -1;
      return next;
    });
  }, []);

  const close = useCallback(() => {
    const el = sheet.current;
    if (!el || still() || typeof el.animate !== "function") return onClose();
    const run = el.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(24px)", opacity: 0 }], { duration: 200, easing: "ease-in" });
    run.onfinish = onClose;
  }, [onClose]);

  /* In: the sheet rises; the page underneath stops scrolling. */
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
      else if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, go, i]);

  /* Each step slides in from the side it came from. */
  useEffect(() => {
    if (still()) return;
    body.current?.animate?.([{ transform: `translateX(${dir.current * 28}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 340, easing: ease });
  }, [i]);

  return createPortal(
    <div className="hs-layer" onClick={(e) => e.target === e.currentTarget && close()}>
      <div ref={sheet} className="hs-sheet" role="dialog" aria-modal="true" aria-label="How Tapin Plus works" tabIndex={-1}>
        <div className="hs-top">
          <ol className="hs-bars" aria-label={`Step ${i + 1} of ${STEPS.length}`}>
            {STEPS.map((s, n) => (
              <li key={s.id} data-done={n < i ? "" : undefined} data-on={n === i ? "" : undefined} />
            ))}
          </ol>
          <button type="button" className="hs-x" aria-label="Close" onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div ref={body} className="hs-body" key={step.id} aria-live="polite">
          {step.art()}
          <h2 className="hs-head">{step.head}</h2>
          <p className="hs-line">{step.line}</p>
        </div>
        <div className="hs-foot">
          {i > 0 ? (
            <button type="button" className="hs-back" onClick={() => go(i - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          {last ? (
            <a className="hs-next" href={joinHref} onClick={onJoin}>
              Join Tapin Plus
            </a>
          ) : (
            <button type="button" className="hs-next" onClick={() => go(i + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
