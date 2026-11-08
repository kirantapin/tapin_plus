import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { asset } from "../asset";
import { logoField } from "../model/content";
import { SAMPLE_GIFT } from "../model/gift";
import { POINTS_PER_DOLLAR } from "../model/order";
import { parentMock } from "../model/parents";
import { PREVIEW_VOICES, VOICES } from "../model/voices";
import { CREDIT, Chevron, DOOR, FIRST, FlatMark, GLYPHS, Glyph, LUNCH, MIN_ORDER, MONTHLY, PERCENT, PLACES, SAVES, lineLabel, money, money0, reducedMotion } from "./parents_kit";

/* ══ FOUR SECTIONS OF /parents, AS SAM PICKED THEM (6 Nov 2026) ══════════════
   From three design variations each ("build these and push"):
     the offer card's price    · Without / with
     What they get             · Swipe cards
     What a lunch costs        · Columns
     How it works for you      · Timeline
   Same facts and approved words as before (docs/parents/COPY.md); only the
   drawing changed. Motion is the Web Animations API, once, when the piece
   is first in view; with reduced motion everything is simply there. */

/** True once the element has been 40% in view (or `threshold` of it; at once
    without an observer). */
function useSeen<T extends Element>(threshold = 0.4): [RefObject<T>, boolean] {
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
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
    // Once, at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, seen];
}

/** Plays `frames` on each match of `sel` inside `root`, staggered, once
 *  seen. The animations are made paused at mount, so what is waiting below
 *  sits at its first frame and never shows drawn first, then replays; with
 *  reduced motion (or no animation support) everything is simply there. */
function useStagger(
  root: RefObject<Element>,
  seen: boolean,
  sel: string,
  frames: Keyframe[],
  step: number,
  duration: number,
  delay = 60,
  easing = "cubic-bezier(.16,1,.3,1)",
) {
  const runs = useRef<Array<Animation | undefined>>([]);
  /* Before the first paint, so nothing is ever drawn finished first. */
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    runs.current = Array.from(el.querySelectorAll<HTMLElement>(sel)).map((n, i) => {
      const a = n.animate?.(frames, { duration, delay: delay + i * step, easing, fill: "backwards" });
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

/* ══ THE OTHER TWO BENEFITS (Sam, 6 Nov 2026: "maybe we visualize the other
   two benefits right under this section", then "maybe [they] belong outside
   of this container and below it instead in between this container and the
   care package preview"): 15% off instead of the $5, once a day; points on
   everything. Always under the offer card, never in it (ParentsHome
   .tpp-offer-col): between the card and the gift band on a phone, under the
   card in the held right-hand column on a computer. */
/* ══ THE GUARANTEE, UNDER THE OFFER (Sam, 6 Nov 2026: "don't we need to
   highlight the guarantee as well underneath, like refund if they don't use
   it, easy cancel anytime"). Only what we do today: a month that didn't
   save them what you spent, refunded on asking (support, by hand; Sam, 7 Nov
   2026), and cancel by email. No refund for never signing in (Sam, 7 Nov
   2026: "if someone doesn't claim it they don't claim it ... We still bill
   them"), so the line is the same on an ask link. (Not
   "manage it from your account": that page explains how to cancel, it
   isn't self-serve; Hormozi audit, 6 Nov 2026.) */
export function Guarantee() {
  return (
    <ul className="tpp-promise" aria-label="Our promise">
      <li>
        <Glyph d={GLYPHS.refund} />
        <span>
          <b>Full refund</b> if they don’t save what you spent
        </span>
      </li>
      <li>
        <Glyph d={GLYPHS.mail} />
        <span>
          <b>Cancel anytime</b> by emailing support@tapin.app
        </span>
      </li>
    </ul>
  );
}

export function MoreBenefits({ className }: { className: string }) {
  return (
    <ul className={className} aria-label="Also with Plus">
      <li>
        <b className="tpp-more-fig">{PERCENT}%</b>
        <span>
          off instead,
          <br />
          once a day
        </span>
      </li>
      <li>
        <b className="tpp-more-fig" data-pts="">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" fill="currentColor" />
          </svg>
        </b>
        <span>
          points on
          <br />
          everything
        </span>
      </li>
    </ul>
  );
}

/* ══ THE OFFER CARD'S PRICE: WITHOUT / WITH ═════════════════════════════════
   The same lunch side by side, the $5 on the seam, and what it is. The $60
   and the price rows are gone from here (Sam, 6 Nov 2026: "it's far too
   busy"): the $60 lives in What they get with its footnote, the price once
   under the button. */
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
      /* A credit, not money off (Sam, 6 Nov 2026: "this needs to be a $5
         credit on every meal instead of $5 off - it's $5 off after the
         credit has been earned"). */
      label: "In credit on a meal, every week, at each place",
      line: `Earned on a ${money0(MIN_ORDER)}+ meal, then ${money0(CREDIT)} off their next.`,
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
    /* What it costs against what it saves (Sam, 6 Nov 2026: "$7.99 saves an
       average of $60 a month for your kiddo"), not how many lunches cover it. */
    { key: "first", art: <b className="tpp-card-fig">{MONTHLY}</b>, label: `A month, and it saves your student about $${SAVES} a month*`, line: `The first month is ${FIRST}.` },
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

/* ══ WHAT A LUNCH COSTS: TOWN COLOURS, TONED DOWN (Sam's pick A, 7 Nov 2026) ═
   One meal priced four ways to one scale (the door price is the full
   height), each price inside its own bar, and the Plus bar the $12 lunch's
   height with its $5 lifted off the top: it stands there as a solid piece
   of the bar first, then rises away to a dashed outline, so the drop to $7
   happens in front of them. Sam: "a little too much color ... instead of
   the beige background, we just do white ... the orange here and there and
   the maroon here and there": the module stays white, the dining hall's bar
   is a grey well, the lunch downtown is the one orange bar, Plus is money
   green, and maroon is only "Keep their dining plan." Never a plan. */
const OFF = Math.round(LUNCH * (100 - PERCENT)) / 100;
const EASE_OUT = "cubic-bezier(.22,1,.36,1)";
export function LunchBars() {
  const [list, seen] = useSeen<HTMLUListElement>();
  useStagger(list, seen, ".tpp-lc-stack", [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], 90, 760, 0, EASE_OUT);
  useStagger(list, seen, ".tpp-lc-bar > b", [{ opacity: 0 }, { opacity: 1 }], 90, 300, 500);
  /* The $5: a solid piece of the bar, then lifted off as an outline. */
  useStagger(
    list,
    seen,
    ".tpp-lc-cap",
    [
      { transform: "translateY(6px)", backgroundColor: "#0b7a53", color: "transparent", borderStyle: "solid", offset: 0 },
      { transform: "translateY(6px)", backgroundColor: "#0b7a53", color: "transparent", borderStyle: "solid", offset: 0.55 },
      { transform: "translateY(-4px)", backgroundColor: "rgba(11,122,83,0)", color: "#0b7a53", borderStyle: "solid", offset: 0.85 },
      { transform: "none", backgroundColor: "rgba(11,122,83,0)", color: "#0b7a53", borderStyle: "dashed", offset: 1 },
    ],
    0,
    1700,
    450,
    EASE_OUT,
  );
  const bars: Array<{ key: string; label: ReactNode; value: number; cap?: number }> = [
    {
      key: "door",
      label: (
        <>
          Dining hall, paid at the door<sup>1</sup>
        </>
      ),
      value: DOOR,
    },
    { key: "down", label: "A lunch downtown", value: LUNCH },
    {
      key: "plus",
      label: (
        <>
          With Plus, using the week’s {money0(CREDIT)}
          <sup>2</sup>
        </>
      ),
      value: LUNCH - CREDIT,
      cap: CREDIT,
    },
    {
      key: "off",
      label: (
        <>
          Other orders, {PERCENT}% off<sup>2</sup>
        </>
      ),
      value: OFF,
    },
  ];
  return (
    <div className="tpp-lc">
      <ul ref={list} className="tpp-lc-chart tnum" aria-label="One lunch, priced four ways">
        {bars.map((b) => (
          <li key={b.key} data-k={b.key}>
            <span className="tpp-lc-area">
              <span
                className="tpp-lc-stack"
                style={{
                  ["--h" as string]: ((b.value + (b.cap ?? 0)) / DOOR).toFixed(4),
                  ["--c" as string]: ((b.cap ?? 0) / DOOR).toFixed(4),
                }}
              >
                {b.cap ? (
                  <span className="tpp-lc-cap" aria-hidden="true">
                    &minus;{money0(b.cap)}
                  </span>
                ) : null}
                <span className="tpp-lc-bar">
                  <b>{money(b.value)}</b>
                </span>
              </span>
            </span>
            <span className="tpp-lc-label">{b.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ══ HOW IT WORKS FOR YOU: THE PHONE (Sam's pick B, 7 Nov 2026) ══════════════
   What happens, shown on a phone: their number goes in, the student gets
   the text with your note, then the $5 waits at every place. The three
   steps sit beside it (under it on a phone) and the open one says its
   approved line. Once in view it plays itself through, a thin bar timing
   each step, and stops on the last; a tap takes over. With reduced motion
   it simply rests on the first step and taps still move it. The phone
   stands on maroon again, as the lab's pick did (Sam, 7 Nov 2026: "for this
   card, we can have the background color"; the one coloured ground on the
   page), with the orange sun and a cream ridge; maroon also on the open
   step's glyph, its timer and the gift's small marks, money green on the
   savings. Four steps since 7 Nov: the last is how to skip, cancel or get a
   refund, on the reminder text the parent gets before each bill. */
/* One month from today, as a text says it ("Dec 7"): the reminder's example.
   The 31st of a month with no 31st next month lands on that month's last day. */
function inAMonth(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(now.getDate(), last));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
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
    /* One $5 a place a week, not "every time" (Sam, 7 Nov 2026). */
    line: (
      <>
        {money0(CREDIT)} in credit every week at each Plus place, earned on a {money0(MIN_ORDER)}+ order of food. Or {PERCENT}% off,
        once a day.
      </>
    ),
  },
  {
    glyph: GLYPHS.mail,
    when: "Anytime",
    title: "Cancel, skip or get a refund",
    line: (
      <>
        We text you before each monthly bill. To skip a month, cancel, or get a full refund if they didn’t save what you spent, email
        support@tapin.app.
      </>
    ),
  },
];
/* A made-up number (555-01xx is the range kept for fiction). */
const SAMPLE_NUMBER = "(540) 555-0142";
const STEP_MS = 3600;
/* The week's screen (Sam's pick E, "the savings meter", 7 Nov 2026): what
   Plus saved in one week, as one figure split by where it came from. The
   week behind it: Monday's lunch at the first place is paid in full and
   earns its credit; Wednesday the second place takes the percentage off;
   Thursday the first place's credit comes off. Not five identical $5s,
   which read as $25 free; the other four places' credit is still to earn.
   Points on what was paid, per order, never more than they'd earn. Real
   places, real menu prices; every number from the constants. */
const WEEK = (() => {
  const [a, b] = PLACES;
  if (!a || !b) return null;
  const pctOff = Math.round(b.order.price * PERCENT) / 100;
  const paid = [a.order.price, b.order.price - pctOff, a.order.price - CREDIT];
  const points = paid.reduce((n, d) => n + Math.floor((Math.round(d * 100) * POINTS_PER_DOLLAR) / 100), 0);
  const pctC = Math.round(pctOff * 100);
  const creditC = Math.round(CREDIT * 100);
  return { a, b, pctOff, pctC, creditC, savedC: pctC + creditC, points, toEarn: PLACES.filter((p) => p.id !== a.id) };
})();
/* The saved figure as the screen draws it: a small "$", the dollars large,
   the cents small. */
function setSaved(root: HTMLElement, c: number) {
  const whole = root.querySelector("[data-whole]");
  const cents = root.querySelector("[data-cents]");
  if (whole) whole.textContent = String(Math.floor(c / 100));
  if (cents) cents.textContent = String(c % 100).padStart(2, "0");
}
/* Hold the steps at their tallest open state, so the page under them never
   moves as they play (Sam, 7 Nov 2026: 22–44px of shift on a phone): every
   step's head, the gaps, and the longest line. Independent of what is open
   or mid-transition, so it can run at any time. */
function holdTallest(list: HTMLOListElement) {
  const steps = Array.from(list.children) as HTMLElement[];
  let heads = 0;
  let body = 0;
  for (const li of steps) {
    const more = li.querySelector<HTMLElement>(".tpp-hw-more");
    const p = more?.firstElementChild as HTMLElement | null;
    heads += li.offsetHeight - (more?.offsetHeight ?? 0);
    if (p) body = Math.max(body, p.scrollHeight - parseFloat(getComputedStyle(p).paddingTop || "0") + 6);
  }
  const gap = parseFloat(getComputedStyle(list).rowGap || "0") || 0;
  list.style.minHeight = `${Math.ceil(heads + body + gap * Math.max(0, steps.length - 1))}px`;
}
const APP_ICON = asset("/brand/tapin-app-icon.png");
const HUG = asset("/parents/hero-hug.webp");
export function HowPhone() {
  const [root, seen] = useSeen<HTMLDivElement>();
  const [cur, setCur] = useState(0);
  const [timed, setTimed] = useState<number | null>(null);
  const auto = useRef(true);
  const timer = useRef<number | undefined>(undefined);
  const typing = useRef<number | undefined>(undefined);
  const bar = useRef<Animation | undefined>(undefined);
  const num = useRef<HTMLSpanElement | null>(null);
  const wk = useRef<Animation[]>([]);
  const count = useRef<number | undefined>(undefined);
  const list = useRef<HTMLOListElement | null>(null);
  const renews = inAMonth();
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    holdTallest(el);
    const again = () => holdTallest(el);
    window.addEventListener("resize", again);
    document.fonts?.ready.then(again).catch(() => undefined);
    return () => window.removeEventListener("resize", again);
  }, []);
  /* Before the first paint: the number waits empty for its typing. */
  useLayoutEffect(() => {
    if (!reducedMotion() && num.current && typeof IntersectionObserver !== "undefined") num.current.textContent = "";
  }, []);
  const enter = (i: number) => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    if (i === 0 && num.current) {
      const n0 = num.current;
      window.clearInterval(typing.current);
      let n = 0;
      n0.textContent = "";
      typing.current = window.setInterval(() => {
        n0.textContent = SAMPLE_NUMBER.slice(0, ++n);
        if (n >= SAMPLE_NUMBER.length) window.clearInterval(typing.current);
      }, 85);
    } else if (num.current) {
      window.clearInterval(typing.current);
      num.current.textContent = SAMPLE_NUMBER;
    }
    if (i === 1)
      el.querySelector(".tpp-hw-bub")?.animate?.(
        [
          { opacity: 0, transform: "translateY(14px) scale(.94)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 520, delay: 180, easing: EASE_OUT, fill: "backwards" },
      );
    if (i === 2) {
      /* The meter fills as the week happened: Wednesday's percentage first,
         then Thursday's credit, the figure counting with it in the same two
         steps; the tiles last, the points counting up. Settled well inside
         the step's time, so it can be read before the next one. */
      const scr = el.querySelector<HTMLElement>(".tpp-e");
      if (!scr || !WEEK) return;
      wk.current.forEach((a) => a.cancel());
      window.cancelAnimationFrame(count.current ?? 0);
      const T1 = 300;
      const D1 = 560;
      const T2 = T1 + D1 + 160;
      const D2 = 700;
      const T3 = T2 + D2 + 160;
      const run: Animation[] = [];
      const add = (a: Animation | undefined) => a && run.push(a);
      const rise = (m: Element, delay: number, d = 460) =>
        add(
          m.animate?.(
            [
              { opacity: 0, transform: "translateY(6px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: d, delay, easing: EASE_OUT, fill: "backwards" },
          ),
        );
      const segs = scr.querySelectorAll(".tpp-e-meter b");
      const parts = scr.querySelectorAll(".tpp-e-part");
      [T1, T2].forEach((t, k) => {
        const seg = segs[k];
        if (seg)
          add(
            seg.animate?.([{ clipPath: "inset(0 100% 0 0 round 11px)" }, { clipPath: "inset(0 0 0 0 round 11px)" }], {
              duration: k ? D2 : D1,
              delay: t,
              easing: EASE_OUT,
              fill: "backwards",
            }),
          );
        const part = parts[k];
        if (part) rise(part, t + (k ? 380 : 300));
      });
      scr.querySelectorAll(".tpp-e-tile").forEach((m, k) => rise(m, T3 + k * 100, 480));
      scr.querySelectorAll(".tpp-e-logos img").forEach((m, k) =>
        add(
          m.animate?.(
            [
              { opacity: 0, transform: "scale(.7)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 340, delay: T3 + 180 + k * 60, easing: EASE_OUT, fill: "backwards" },
          ),
        ),
      );
      wk.current = run;
      const out = scr.querySelector<HTMLElement>(".tpp-e-pts");
      const ease = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
      const { pctC, creditC, points } = WEEK;
      const P0 = T3 + 150;
      const PD = 650;
      const t0 = performance.now();
      setSaved(scr, 0);
      if (out) out.textContent = "0";
      const tick = (now: number) => {
        const t = now - t0;
        setSaved(scr, Math.round(pctC * ease((t - T1) / D1) + creditC * ease((t - T2) / D2)));
        if (out) out.textContent = String(Math.round(points * ease((t - P0) / PD)));
        if (t < P0 + PD) count.current = window.requestAnimationFrame(tick);
      };
      count.current = window.requestAnimationFrame(tick);
    }
    if (i === 3) {
      el.querySelector(".tpp-hw-bill")?.animate?.(
        [
          { opacity: 0, transform: "translateY(14px) scale(.94)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 520, delay: 180, easing: EASE_OUT, fill: "backwards" },
      );
      el.querySelector(".tpp-hw-mail")?.animate?.([{ opacity: 0 }, { opacity: 1 }], {
        duration: 360,
        delay: 700,
        easing: EASE_OUT,
        fill: "backwards",
      });
    }
  };
  const go = (i: number, play: boolean) => {
    setCur(i);
    enter(i);
    bar.current?.cancel();
    window.clearTimeout(timer.current);
    setTimed(null);
    if (play && auto.current && i < STEPS.length - 1) {
      setTimed(i);
      const fill = root.current?.querySelectorAll<HTMLElement>(".tpp-hw-timer i")[i];
      bar.current = fill?.animate?.([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
        duration: STEP_MS,
        easing: "linear",
        fill: "forwards",
      });
      timer.current = window.setTimeout(() => go(i + 1, true), STEP_MS);
    }
  };
  useEffect(() => {
    if (seen && auto.current && !reducedMotion()) go(0, true);
    // Once, when first seen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearInterval(typing.current);
      window.cancelAnimationFrame(count.current ?? 0);
      wk.current.forEach((a) => a.cancel());
      bar.current?.cancel();
    },
    [],
  );
  const tap = (i: number) => {
    auto.current = false;
    go(i, false);
  };
  return (
    <div ref={root} className="tpp-hw tnum">
      <div className="tpp-hw-grid">
        <div className="tpp-hw-stage" aria-hidden="true">
          <span className="tpp-hw-sun" />
          <span className="tpp-hw-band" />
          <div className="tpp-hw-phone">
            <div className="tpp-hw-screen">
              <span className="tpp-hw-island" />
              <div className="tpp-hw-s" data-on={cur === 0 ? "" : undefined}>
                <div className="tpp-hw-app">
                  <img src={APP_ICON} alt="" decoding="async" loading="lazy" />
                  Tapin Plus
                </div>
                <span className="tpp-hw-lbl">Their mobile number</span>
                <div className="tpp-hw-field">
                  <span ref={num}>{SAMPLE_NUMBER}</span>
                  <span className="tpp-hw-caret" />
                </div>
                <div className="tpp-hw-row">
                  <span>First month</span>
                  <b>{FIRST}</b>
                </div>
                <div className="tpp-hw-pay">Pay {FIRST}</div>
              </div>
              <div className="tpp-hw-s" data-on={cur === 1 ? "" : undefined}>
                <div className="tpp-hw-msg">
                  <img src={APP_ICON} alt="" decoding="async" loading="lazy" />
                  <b>Tapin</b>
                </div>
                <div className="tpp-hw-bub">
                  <div className="tpp-hw-gift">
                    <img src={HUG} alt="" decoding="async" loading="lazy" />
                    <div>
                      <small>For {SAMPLE_GIFT.to}</small>
                      <span>Thinking of you, my love! Here’s a little treat.</span>
                    </div>
                  </div>
                </div>
                <span className="tpp-hw-open">Open your gift</span>
              </div>
              <div className="tpp-hw-s tpp-e" data-on={cur === 2 ? "" : undefined}>
                <div className="tpp-hw-app">
                  <img src={APP_ICON} alt="" decoding="async" loading="lazy" />
                  {SAMPLE_GIFT.to}’s week
                </div>
                {WEEK ? (
                  <>
                    <p className="tpp-e-lead">Saved this week</p>
                    <p className="tpp-e-sum">
                      <span className="tpp-e-d">$</span>
                      <span data-whole="">{Math.floor(WEEK.savedC / 100)}</span>
                      <span className="tpp-e-c">
                        .<span data-cents="">{String(WEEK.savedC % 100).padStart(2, "0")}</span>
                      </span>
                    </p>
                    {/* The meter is the saved figure itself, split by where it
                        came from: no ceiling, so nothing reads as a target. */}
                    <div className="tpp-e-meter" style={{ gridTemplateColumns: `${WEEK.pctC}fr ${WEEK.creditC}fr` }}>
                      <i>
                        <b>
                          <img src={WEEK.b.logo} alt="" decoding="async" loading="lazy" />
                        </b>
                      </i>
                      <i>
                        <b>
                          <img src={WEEK.a.logo} alt="" decoding="async" loading="lazy" />
                        </b>
                      </i>
                    </div>
                    <div className="tpp-e-legend" style={{ gridTemplateColumns: `${WEEK.pctC}fr ${WEEK.creditC}fr` }}>
                      <div className="tpp-e-part">
                        <b>{money(WEEK.pctOff)}</b>
                        <span>
                          <em>{PERCENT}% off</em>
                          <br />
                          Wed
                        </span>
                      </div>
                      <div className="tpp-e-part">
                        <b>{money(CREDIT)}</b>
                        <span>
                          <em>{money0(CREDIT)} credit</em>
                          <br />
                          Thu, earned Mon
                        </span>
                      </div>
                    </div>
                    <div className="tpp-e-tiles">
                      <div className="tpp-e-tile">
                        <b>{money0(CREDIT)} still to earn at</b>
                        <span className="tpp-e-logos">
                          {WEEK.toEarn.map((p) => (
                            <img key={p.id} src={p.logo} alt="" decoding="async" loading="lazy" />
                          ))}
                        </span>
                        <small>on a {money0(MIN_ORDER)}+ meal</small>
                      </div>
                      <div className="tpp-e-tile">
                        <b>Points</b>
                        <span className="tpp-e-pts">{WEEK.points}</span>
                        <small>{POINTS_PER_DOLLAR} per $1</small>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
              <div className="tpp-hw-s" data-on={cur === 3 ? "" : undefined}>
                <div className="tpp-hw-msg">
                  <img src={APP_ICON} alt="" decoding="async" loading="lazy" />
                  <b>Tapin</b>
                </div>
                <div className="tpp-hw-bill">
                  Tapin: {SAMPLE_GIFT.to}’s Tapin Plus renews {renews} for {MONTHLY}. To skip a month or cancel, email
                  support@tapin.app. Reply STOP to opt out
                </div>
                <span className="tpp-hw-mail">
                  <Glyph d={GLYPHS.mail} />
                  support@tapin.app
                </span>
              </div>
            </div>
          </div>
        </div>
        <ol ref={list} className="tpp-hw-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="tpp-hw-step" data-on={cur === i ? "" : undefined} data-timed={timed === i ? "" : undefined}>
              <button type="button" aria-expanded={cur === i} aria-controls={`tpp-hw-more-${i}`} onClick={() => tap(i)}>
                <span className="tpp-hw-ic">
                  <Glyph d={s.glyph} />
                </span>
                <span className="tpp-hw-head">
                  <small>{s.when}</small>
                  <b>{s.title}</b>
                </span>
              </button>
              <div id={`tpp-hw-more-${i}`} className="tpp-hw-more" aria-hidden={cur !== i}>
                <p>{s.line}</p>
              </div>
              <span className="tpp-hw-timer" aria-hidden="true">
                <i />
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ══ WHAT $5 BACK LOOKS LIKE: THEIR PHONE (Sam's pick D, 7 Nov 2026) ═════════
   Over their shoulder at the moment they pay: the phone leans out of the
   page's maroon panel, an orange sun low behind it, and the place's checkout
   sheet sits over the dish they tapped, dimmed the way the app dims. One
   real food order at its menu price (Sweetopia's two ice creams as two
   lines), the Plus credit line, what they pay. The five places switch it:
   discs under the panel on a phone, a list beside it on a computer (the
   phone on the left, mirroring How it works). The beat, once, when the
   panel is half in view: the sheet rises, the credit line slots into the
   order as the Plus mark's four pieces close, the -$5.00 lands, then the
   total and the button roll to what they pay (about 1s). A tap crossfades
   the order and plays the same beat, quicker. The beat's first frame is
   held from mount, so the finished sheet never shows first and then drops.
   Reduced motion: the finished sheet. */
const POP = "cubic-bezier(.34,1.56,.64,1)";
const MARK_FROM: ReadonlyArray<[number, number]> = [
  [-3, -2],
  [3, -1.5],
  [2, 3],
  [-3, 2],
];
export function CheckoutPhone() {
  const [stage, seen] = useSeen<HTMLDivElement>(0.5);
  const [which, setWhich] = useState(0);
  const runs = useRef<Animation[]>([]);
  const played = useRef(false);
  const tapped = useRef(false);
  const stop = () => {
    runs.current.forEach((a) => a.cancel());
    runs.current = [];
  };
  const beat = (first: boolean) => {
    stop();
    const el = stage.current;
    if (!el || reducedMotion()) return;
    const q = (sel: string) => el.querySelector<HTMLElement>(sel);
    const add = (n: Element | null | undefined, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      const a = n?.animate?.(frames, opts);
      if (a) runs.current.push(a);
    };
    /* A tap skips the rise, so everything after it comes 380ms sooner. */
    const t = first ? 0 : -380;
    if (first)
      add(q(".tpp-fb-sheet"), [{ transform: "translateY(100%)" }, { transform: "none" }], {
        duration: 620,
        easing: EASE_OUT,
        fill: "backwards",
      });
    else {
      add(q(".tpp-fb-behind img"), [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: EASE_OUT });
      el.querySelectorAll(".tpp-fb-head, .tpp-fb-items").forEach((n) =>
        add(
          n,
          [
            { opacity: 0, transform: "translateY(6px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 300, easing: EASE_OUT },
        ),
      );
    }
    const credit = q(".tpp-fb-credit");
    add(
      credit,
      [
        { height: "0px", opacity: 0 },
        { height: `${credit?.scrollHeight ?? 0}px`, opacity: 1 },
      ],
      { duration: 420, delay: 560 + t, easing: EASE_OUT, fill: "backwards" },
    );
    credit?.querySelectorAll("svg path").forEach((p, k) => {
      const [x, y] = MARK_FROM[k] ?? [0, 0];
      add(
        p,
        [
          { transform: `translate(${x}px,${y}px)`, opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 520, delay: 620 + t + k * 40, easing: EASE_OUT, fill: "backwards" },
      );
    });
    add(
      q(".tpp-fb-off"),
      [
        { transform: "scale(.6)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 420, delay: 760 + t, easing: POP, fill: "backwards" },
    );
    el.querySelectorAll(".tpp-fb-swap").forEach((sw, k) => {
      const opts: KeyframeAnimationOptions = { duration: 340, delay: 1000 + t + k * 50, easing: EASE_OUT, fill: "both" };
      add(
        sw.querySelector(".was"),
        [
          { transform: "none", opacity: 1 },
          { transform: "translateY(-70%)", opacity: 0 },
        ],
        opts,
      );
      add(
        sw.querySelector(".now"),
        [
          { transform: "translateY(70%)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        opts,
      );
    });
  };
  /* Before the first paint: the beat's first frame, held until it is seen. */
  useLayoutEffect(() => {
    if (!reducedMotion() && typeof IntersectionObserver !== "undefined") {
      beat(true);
      runs.current.forEach((a) => a.pause());
    }
    return stop;
    // Once, at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!seen || played.current) return;
    played.current = true;
    beat(true);
    // Once, when first seen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);
  /* A tap: the new order is in the DOM, not yet painted. */
  useLayoutEffect(() => {
    if (!tapped.current) return;
    tapped.current = false;
    played.current = true;
    beat(false);
    // On each tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [which]);
  const pick = (i: number) => {
    if (i === which) return;
    tapped.current = true;
    setWhich(i);
  };
  const p = PLACES[which] ?? PLACES[0];
  if (!p) return null;
  const now = Math.max(0, p.order.price - CREDIT);
  return (
    <div className="tpp-fb tnum">
      <div className="tpp-fb-grid">
        <div
          ref={stage}
          className="tpp-fb-stage"
          role="img"
          aria-label={`Their phone at checkout at ${p.name}: ${p.order.label}, ${money(p.order.price)}. Plus credit, minus ${money(CREDIT)}. Total ${money(now)}.`}
        >
          <span className="tpp-fb-sun" />
          <div className="tpp-fb-phone">
            <div className="tpp-fb-screen">
              <div className="tpp-fb-behind">
                <img src={p.order.img} alt="" decoding="async" />
              </div>
              <div className="tpp-fb-sheet">
                <span className="tpp-fb-grab" />
                <p className="tpp-fb-head">
                  <span className="collar" data-field={logoField(p.id)}>
                    <img src={p.logo} alt="" decoding="async" />
                  </span>
                  {p.name}
                </p>
                <div className="tpp-fb-items">
                  {p.lines.map((l) => (
                    <p key={l.name} className="tpp-fb-item">
                      <img src={l.img} alt="" decoding="async" />
                      <span>{lineLabel(l)}</span>
                      <b>{money(Math.round(l.price * l.qty * 100) / 100)}</b>
                    </p>
                  ))}
                </div>
                <div className="tpp-fb-credit">
                  <p>
                    <FlatMark />
                    <span>Plus credit</span>
                    <b className="tpp-fb-off">&minus;{money(CREDIT)}</b>
                  </p>
                </div>
                <p className="tpp-fb-total">
                  <span>Total</span>
                  <span className="tpp-fb-swap">
                    <b className="was">{money(p.order.price)}</b>
                    <b className="now">{money(now)}</b>
                  </span>
                </p>
                <p className="tpp-fb-pay">
                  <span className="tpp-fb-swap">
                    <b className="was">Pay {money(p.order.price)}</b>
                    <b className="now">Pay {money(now)}</b>
                  </span>
                </p>
                <span className="tpp-fb-home" />
              </div>
            </div>
          </div>
        </div>
        <div className="tpp-fb-side">
          <div className="tpp-fb-picks" role="group" aria-label="Example orders">
            {PLACES.map((x, i) => (
              <button
                key={x.id}
                type="button"
                className="tpp-fb-pick"
                aria-label={`Show an order at ${x.name}`}
                aria-pressed={i === which}
                onClick={() => pick(i)}
              >
                <span className="collar" data-field={logoField(x.id)}>
                  <img src={x.logo} alt="" decoding="async" />
                </span>
                <span className="tpp-fb-pick-text" aria-hidden="true">
                  <b>{x.name}</b>
                  <small>{x.order.label}</small>
                </span>
              </button>
            ))}
          </div>
          <p className="tpp-math">
            They earn the ${CREDIT} on a ${MIN_ORDER}+ meal, and it comes off their next order there. Two credits a month
            cover the {MONTHLY}. Alcohol is never discounted.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══ BELIEF IT WILL WORK (Sam's picks B, C and E, 7 Nov 2026) ══════════════
   The parent's fear is "will they actually use it?". Previews and notes:
   tapin-staging-work/lever-lab/likelihood (A was not picked; D is in
   shell/ParentCheckout.tsx). Motion is the Web Animations API, cancelled on
   unmount; with reduced motion each piece is simply there, still. */
const EASE_IN_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/* ── B · "What if they don't use it?" as a picture ─────────────────────────
   After the gift band: the parent's own question, answered first in two
   words ("Full refund.", the exact terms one tap down, as the promise under
   the offer says them), then two $5 credits running past the $7.99 line.
   The track is $12 wide, so each credit is 5/12 of it and the line sits at
   7.99/12. When the bar is on screen the credits fill one after the other
   and the line nods as the second passes it. */
const B_TRACK = 12;
const MONTHLY_N = Number(MONTHLY.replace(/[^\d.]/g, ""));
export function WhatIfUnused() {
  const [meter, seen] = useSeen<HTMLDivElement>(0.6);
  useStagger(meter, seen, ".tpp-b-seg", [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], 520, 700, 120, EASE_IN_OUT);
  useStagger(meter, seen, ".tpp-b-mark", [{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], 0, 360, 1060, "ease-out");
  const [open, setOpen] = useState(false);
  const fine = useRef<HTMLParagraphElement>(null);
  const chev = useRef<HTMLSpanElement>(null);
  const was = useRef(open);
  useEffect(() => {
    if (was.current === open) return;
    was.current = open;
    if (reducedMotion()) return;
    const turn = chev.current?.animate?.(
      [{ transform: open ? "none" : "rotate(180deg)" }, { transform: open ? "rotate(180deg)" : "none" }],
      { duration: 240, easing: EASE_IN_OUT },
    );
    const show = open
      ? fine.current?.animate?.([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], {
          duration: 280,
          easing: EASE_IN_OUT,
        })
      : undefined;
    return () => {
      turn?.cancel();
      show?.cancel();
    };
  }, [open]);
  const seg = `${((CREDIT / B_TRACK) * 100).toFixed(3)}%`;
  return (
    <section className="tpa-module tpp-b" aria-labelledby="tpp-b-h">
      <h2 id="tpp-b-h" className="tpa-h2">
        What if they don’t use it?
      </h2>
      <button type="button" className="tpp-b-row" aria-expanded={open} aria-controls="tpp-b-fine" onClick={() => setOpen((o) => !o)}>
        <Glyph d={GLYPHS.refund} className="tpp-b-ico" />
        <span>Full refund.</span>
        <span ref={chev} className="tpp-b-chev">
          <Chevron />
        </span>
      </button>
      {/* Word for word the promise under the offer (Guarantee). */}
      <p ref={fine} id="tpp-b-fine" className="tpp-b-fine" hidden={!open}>
        Full refund if they don’t save what you spent. Cancel anytime by emailing support@tapin.app.
      </p>
      <div
        ref={meter}
        className="tpp-b-meter tnum"
        role="img"
        aria-label={`Two ${money0(CREDIT)} credits make ${money0(CREDIT * 2)}, more than the ${MONTHLY} a month`}
        style={{ ["--seg" as string]: seg, ["--at" as string]: `${((MONTHLY_N / B_TRACK) * 100).toFixed(3)}%` }}
      >
        <div className="tpp-b-track">
          <span className="tpp-b-seg">{money0(CREDIT)}</span>
          <span className="tpp-b-seg">{money0(CREDIT)}</span>
        </div>
        <span className="tpp-b-mark" aria-hidden="true">
          <b>{MONTHLY} a month</b>
          <i />
        </span>
      </div>
      <p className="tpp-b-big">Two credits cover it.</p>
    </section>
  );
}

/* ── C · Two voices by the first button ────────────────────────────────────
   The split hero (the parent sends, the student opens) as two short quotes
   under the promise: between it and the gift band on a phone, in the held
   right column on a computer. Renders nothing until model/voices.ts VOICES
   has real, permissioned quotes (how to add them is there). Local dev with
   ?parentmock shows the marked placeholder slots instead, dashed. The two
   meet from either side once, when first in view. */
export function Voices() {
  const real = VOICES.length > 0;
  const list = real ? VOICES : parentMock() ? PREVIEW_VOICES : [];
  const [box, seen] = useSeen<HTMLUListElement>(0.5);
  const runs = useRef<Array<Animation | undefined>>([]);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || reducedMotion()) return;
    runs.current = Array.from(el.children).map((li, i) => {
      const a = li.animate?.([{ transform: `translateX(${i ? 10 : -10}px)`, opacity: 0.4 }, { transform: "none", opacity: 1 }], {
        duration: 600,
        easing: EASE_IN_OUT,
        fill: "backwards",
      });
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
  if (!list.length) return null;
  return (
    <ul ref={box} className="tpp-v" aria-label="From parents and students" data-placeholder={real ? undefined : ""}>
      {list.map((v, i) => (
        <li key={`${v.role}-${i}`}>
          <figure className="tpp-v-q" data-who={v.role === "Parent" ? "parent" : "student"}>
            <span className="tpp-v-mark" aria-hidden="true">
              “
            </span>
            <blockquote className="tpp-v-quote">{v.quote}</blockquote>
            <figcaption className="tpp-v-by">
              {v.photo ? (
                <img className="tpp-v-face" src={asset(v.photo)} alt="" decoding="async" loading="lazy" />
              ) : real ? null : (
                <span className="tpp-v-face" aria-hidden="true" />
              )}
              <span>
                {v.name}
                <small>{v.role}</small>
              </span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}

/* ── E · One proof line that turns over, by the button that follows you ───
   On a phone it rides on the docked button; on a computer, at the foot of
   the held offer card. Every 3.2s it turns over through three true lines
   (500+ students, the refund, the places); on a computer it starts on the
   places, since the hero's 500+ line shares that screen. It only turns
   while it's on screen, the page is showing and the builder is closed.
   Reduced motion: the first line, still. aria-hidden: the same facts are in
   the page's own text, and a turning line isn't read aloud. */
type ProofKey = "students" | "refund" | "places";
const TURN_MS = 3200;
export function ProofTurn({
  className,
  start,
  paused,
}: {
  className: string;
  start: ProofKey;
  paused: boolean;
}) {
  const lines: Array<{ key: ProofKey; body: ReactNode }> = [
    {
      key: "students",
      body: (
        <>
          <span className="tpp-pt-dot" aria-hidden="true" />
          Over 500 Blacksburg students on Plus
        </>
      ),
    },
    {
      key: "refund",
      body: (
        <>
          <Glyph d={GLYPHS.refund} className="tpp-pt-ico" />
          Didn’t save what you spent? Full refund.
        </>
      ),
    },
    {
      key: "places",
      body: (
        <>
          <span className="tpp-pt-logos" aria-hidden="true">
            {PLACES.slice(0, 3).map((p) => (
              <img key={p.id} src={p.logo} alt="" decoding="async" />
            ))}
          </span>
          Five Blacksburg spots
        </>
      ),
    },
  ];
  const [k, setK] = useState(() => Math.max(0, lines.findIndex((l) => l.key === start)));
  const box = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [pageOn, setPageOn] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(!!e?.isIntersecting));
    io.observe(el);
    const vis = () => setPageOn(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);
  const out = useRef<Animation | null>(null);
  const into = useRef<Animation | null>(null);
  const turning = !paused && onScreen && pageOn && !reducedMotion();
  useEffect(() => {
    if (!turning) return;
    const id = window.setInterval(() => {
      const next = () => setK((n) => (n + 1) % lines.length);
      const el = line.current;
      if (!el?.animate) return next();
      out.current?.cancel();
      out.current = el.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-10px)", opacity: 0 }], {
        duration: 200,
        easing: "ease-in",
        fill: "forwards",
      });
      out.current.onfinish = next;
    }, TURN_MS);
    return () => window.clearInterval(id);
  }, [turning, lines.length]);
  /* The new line rises in, before it's painted, as the old one's hold lets go. */
  const drawn = useRef(k);
  useLayoutEffect(() => {
    if (drawn.current === k) return;
    drawn.current = k;
    out.current?.cancel();
    out.current = null;
    into.current?.cancel();
    into.current = line.current?.animate?.([{ transform: "translateY(10px)", opacity: 0 }, { transform: "none", opacity: 1 }], {
      duration: 420,
      easing: EASE_IN_OUT,
    }) ?? null;
  }, [k]);
  useEffect(
    () => () => {
      out.current?.cancel();
      into.current?.cancel();
    },
    [],
  );
  return (
    <div ref={box} className={`tpp-pt ${className}`} aria-hidden="true">
      <span ref={line} className="tpp-pt-line">
        {lines[k % lines.length]?.body}
      </span>
    </div>
  );
}
