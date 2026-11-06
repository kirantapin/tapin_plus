import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { logoField } from "../model/content";
import { Chevron, CREDIT, DOOR, FIRST, GLYPHS, Glyph, LUNCH, MIN_ORDER, MONTHLY, PERCENT, PLACES, SAVES, SAVES_NOTE, money, money0, reducedMotion } from "./parents_kit";

/* ══ FOUR SECTIONS OF /parents, AS SAM PICKED THEM (6 Nov 2026) ══════════════
   From three design variations each ("build these and push"):
     the offer card's price    · Without / with
     What they get             · Swipe cards
     What a lunch costs        · Columns
     How it works for you      · Timeline
   Same facts and approved words as before (docs/parents/COPY.md); only the
   drawing changed. Motion is the Web Animations API, once, when the piece
   is first in view; with reduced motion everything is simply there. */

/** True once the element has been 40% in view (or at once without an observer). */
function useSeen<T extends Element>(): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}

/** Plays `frames` on each match of `sel` inside `root`, staggered, once
 *  seen. The animations are made paused at mount, so what is waiting below
 *  sits at its first frame and never shows drawn first, then replays; with
 *  reduced motion (or no animation support) everything is simply there. */
function useStagger(root: RefObject<Element>, seen: boolean, sel: string, frames: Keyframe[], step: number, duration: number) {
  const runs = useRef<Array<Animation | undefined>>([]);
  /* Before the first paint, so nothing is ever drawn finished first. */
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    runs.current = Array.from(el.querySelectorAll<HTMLElement>(sel)).map((n, i) => {
      const a = n.animate?.(frames, { duration, delay: 60 + i * step, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
      a?.pause();
      return a;
    });
    const made = runs.current;
    return () => made.forEach((r) => r?.cancel());
    // Once, at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (seen) runs.current.forEach((r) => r?.play());
  }, [seen]);
}

/** The five logos side by side, not overlapped, so none is cropped. */
function LogoRow({ size }: { size: number }) {
  return (
    <span className="tpp-logorow" aria-hidden="true" style={{ ["--s" as string]: `${size}px` }}>
      {PLACES.map((p) => (
        <span key={p.id} className="collar" data-field={logoField(p.id)}>
          <img src={p.logo} alt="" decoding="async" />
        </span>
      ))}
    </span>
  );
}

/* ══ THE OFFER CARD'S PRICE: WITHOUT / WITH ═════════════════════════════════
   The same lunch side by side, the $5 on the seam, then the two facts. */
export function OfferPrice() {
  return (
    <div className="tpp-vs tnum">
      <div className="tpp-vs-pair" aria-hidden="true">
        <div className="tpp-vs-col">
          <span>Without Plus</span>
          <b>{money0(LUNCH)}</b>
        </div>
        <div className="tpp-vs-col" data-plus="">
          <span>With Plus</span>
          <b>{money0(LUNCH - CREDIT)}</b>
        </div>
        <span className="tpp-vs-chip">&minus;{money0(CREDIT)}</span>
      </div>
      <p className="tpp-vs-label">
        <span className="tpp-sr">
          With Tapin Plus, a {money0(LUNCH)} lunch downtown is {money0(LUNCH - CREDIT)}, every week, at each of five spots.
        </span>
        {/* The approved limit (COPY.md v2 final: "every week, at each of five
            spots"), so the $7 never reads as every lunch. */}
        <span aria-hidden="true">A {money0(LUNCH)} lunch downtown</span>
        <small aria-hidden="true">every week, at each of five spots</small>
      </p>
      <ul className="tpp-facts">
        <li>
          <b aria-hidden="true">${SAVES}</b>
          <span>
            <span className="tpp-sr">The average member saves an estimated ${SAVES} a month.</span>
            <span aria-hidden="true">saved a month by the average member*</span>
          </span>
        </li>
        <li>
          <b>{FIRST}</b>
          <span>First month, and one lunch covers it</span>
        </li>
      </ul>
      <p className="tpp-note">{SAVES_NOTE}</p>
    </div>
  );
}

/* ══ WHAT THEY GET: SWIPE CARDS ══════════════════════════════════════════════
   One benefit a card, swiped sideways (the $60 first, on ink); each card is
   short enough that its line shows without a tap. No total anywhere, no
   points value. The dots follow the swipe and jump to a card. */
export function BenefitCards() {
  const rail = useRef<HTMLUListElement | null>(null);
  const [at, setAt] = useState(0);
  const cards: Array<{ key: string; art: ReactNode; label: string; line?: string; ink?: boolean }> = [
    { key: "saves", art: <b className="tpp-card-fig">${SAVES}</b>, label: "saved a month by the average member*", ink: true },
    {
      key: "credit",
      art: (
        <b className="tpp-card-fig" data-money="">
          {money0(CREDIT)}
        </b>
      ),
      label: "Off a meal, every week, at each place",
      line: `A ${money0(LUNCH)} lunch is ${money0(LUNCH - CREDIT)}.`,
    },
    { key: "pct", art: <b className="tpp-card-fig">{PERCENT}%</b>, label: "Off their other orders, once a day", line: "Food and non-alcoholic drinks." },
    { key: "places", art: <LogoRow size={34} />, label: "Places they already go", line: "New Plus places are added at no extra cost." },
    { key: "points", art: <Glyph d={GLYPHS.star} className="tpp-card-glyph" />, label: "Points on every order", line: "Toward free food at each place." },
    {
      key: "phone",
      art: <Glyph d={GLYPHS.phone} className="tpp-card-glyph" />,
      label: "On their number right away",
      line: "You pay, they sign in with their number, and it’s there.",
    },
    { key: "first", art: <b className="tpp-card-fig">{FIRST}</b>, label: "One lunch covers the first month", line: `After that, two lunches a month cover ${MONTHLY}.` },
  ];
  /* One dot per place the rail can stop, not per card: on a computer three
     cards show at once, so the last few cards share the rail's end (review,
     6 Nov 2026). On a phone that is still one dot a card. */
  const [stops, setStops] = useState(cards.length);
  const stride = () => {
    const el = rail.current;
    const first = el?.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth + 10 : 1;
  };
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      setStops(max > 0 ? Math.min(cards.length, Math.ceil(max / stride() - 0.05) + 1) : 1);
    };
    const on = () => {
      const max = el.scrollWidth - el.clientWidth;
      const n = max > 0 ? Math.min(cards.length, Math.ceil(max / stride() - 0.05) + 1) : 1;
      const end = el.scrollLeft >= max - 4;
      setAt(end ? n - 1 : Math.min(n - 1, Math.max(0, Math.round(el.scrollLeft / stride()))));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      measure();
      on();
    }) : null;
    ro?.observe(el);
    el.addEventListener("scroll", on, { passive: true });
    return () => {
      ro?.disconnect();
      el.removeEventListener("scroll", on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const go = (i: number) => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: Math.min(i * stride(), max), behavior: reducedMotion() ? "auto" : "smooth" });
  };
  return (
    <div className="tpp-cards tnum">
      <ul ref={rail} className="tpp-cards-rail" aria-label="What they get">
        {cards.map((c) => (
          <li key={c.key} className="tpp-card" data-ink={c.ink ? "" : undefined}>
            <span className="tpp-card-art">{c.art}</span>
            <b className="tpp-card-label">{c.label}</b>
            {c.line ? <p>{c.line}</p> : null}
          </li>
        ))}
      </ul>
      <div className="tpp-cards-dots">
        {Array.from({ length: stops }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to card ${i + 1}`}
            aria-current={i === at ? "true" : undefined}
            data-on={i === at ? "" : undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}

/* ══ WHAT A LUNCH COSTS: COLUMNS ═════════════════════════════════════════════
   One meal priced four ways, standing side by side to one scale (the door
   price is the full height), the Plus column in money green. Never a plan. */
const OFF = Math.round(LUNCH * (100 - PERCENT)) / 100;
export function LunchColumns() {
  const [list, seen] = useSeen<HTMLUListElement>();
  useStagger(list, seen, ".tpp-col-fill", [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], 90, 760);
  useStagger(list, seen, ".tpp-col b", [{ opacity: 0 }, { opacity: 1 }], 90, 400);
  const cols: Array<{ label: ReactNode; value: number; kind?: "plus" | "off" }> = [
    {
      label: (
        <>
          Dining hall, paid at the door<sup>1</sup>
        </>
      ),
      value: DOOR,
    },
    { label: "A lunch downtown", value: LUNCH },
    {
      label: (
        <>
          With Plus, using the week’s {money0(CREDIT)}
          <sup>2</sup>
        </>
      ),
      value: LUNCH - CREDIT,
      kind: "plus",
    },
    {
      label: (
        <>
          Other orders, {PERCENT}% off<sup>2</sup>
        </>
      ),
      value: OFF,
      kind: "off",
    },
  ];
  return (
    <ul ref={list} className="tpp-cols tnum" aria-label="One lunch, priced four ways">
      {cols.map((c, i) => (
        <li key={i} data-kind={c.kind}>
          <span className="tpp-col" style={{ ["--f" as string]: (c.value / DOOR).toFixed(4) }}>
            <b>{money(c.value)}</b>
            <span className="tpp-col-fill" aria-hidden="true" />
          </span>
          <span className="tpp-col-label">{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

/* ══ HOW IT WORKS FOR YOU: TIMELINE ══════════════════════════════════════════
   Down the page, each step with when it happens; its approved line opens
   under it on a tap. */
const STEPS: Array<{ glyph: string; when: string; title: string; line: ReactNode }> = [
  {
    glyph: GLYPHS.card,
    when: "Today",
    title: "You add their number",
    line: <>Enter your student’s mobile number and pay {FIRST} for the first month.</>,
  },
  {
    glyph: GLYPHS.text,
    when: "Next",
    title: "They sign in",
    line: <>They get one text from Tapin with your gift. They open it and sign in with their own number. Their Plus is already there.</>,
  },
  {
    glyph: GLYPHS.tag,
    when: "After that",
    title: "They save every week",
    line: (
      <>
        ${CREDIT} back every week at each Plus place, every time they order ${MIN_ORDER} or more of food through Tapin. Or{" "}
        {PERCENT}% off, once a day. One per order.
      </>
    ),
  },
];
export function HowTimeline() {
  const [list, seen] = useSeen<HTMLOListElement>();
  useStagger(
    list,
    seen,
    ".tpp-line > li",
    [
      { opacity: 0, transform: "translateX(-8px)" },
      { opacity: 1, transform: "none" },
    ],
    140,
    560,
  );
  return (
    <ol ref={list} className="tpp-line tnum">
      {STEPS.map((s) => (
        <li key={s.title}>
          {/* The step's sentence one tap under it (Sam, 6 Nov 2026: "maybe some
              of this text is nested? there's a lot of it"). */}
          <details className="tpp-line-step">
            <summary>
              <span className="tpp-line-icon">
                <Glyph d={s.glyph} />
              </span>
              <span className="tpp-line-head">
                <small>{s.when}</small>
                <b>{s.title}</b>
              </span>
              <Chevron />
            </summary>
            <p>{s.line}</p>
          </details>
        </li>
      ))}
    </ol>
  );
}
