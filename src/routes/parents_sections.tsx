import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { asset } from "../asset";
import { logoField } from "../model/content";
import { SAMPLE_GIFT } from "../model/gift";
import { POINTS_PER_DOLLAR } from "../model/order";
import { CREDIT, DOOR, FIRST, GLYPHS, Glyph, LUNCH, MIN_ORDER, MONTHLY, PERCENT, PLACES, SAVES, money, money0, reducedMotion } from "./parents_kit";

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
   it, easy cancel anytime"). Only what the backend does today: the 14-day
   refund if their student never signs in (parent_unclaimed; not on an ask
   link, where the student is signed in already), a month they didn't use
   refunded on asking (support, by hand; Sam, 7 Nov 2026) and cancel by email. (Not
   "manage it from your account": that page explains how to cancel, it
   isn't self-serve; Hormozi audit, 6 Nov 2026.) */
export function Guarantee({ asked }: { asked: boolean }) {
  return (
    <ul className="tpp-promise" aria-label="Our promise">
      {asked ? null : (
        <li>
          <Glyph d={GLYPHS.refund} />
          <span>
            <b>Full refund</b> if they don’t sign in within 14 days
          </span>
        </li>
      )}
      {/* Sam, 7 Nov 2026: a month they didn't use is refunded on asking,
          by support (by hand; the backend's docs/PARENTS_FLOW.md). On every
          flow, the ask link's included. */}
      <li>
        <Glyph d={GLYPHS.refund} />
        <span>
          <b>Not used that month?</b> Ask for a refund
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
        We text you before each monthly bill. To skip a month, cancel, or get a refund for a month they didn’t use, email
        support@tapin.app.
      </>
    ),
  },
];
/* A made-up number (555-01xx is the range kept for fiction). */
const SAMPLE_NUMBER = "(540) 555-0142";
const STEP_MS = 3600;
/* The last screen's week (Sam, 7 Nov 2026: "redesign this last slide"): not
   five identical $5s, which read as $25 free, but what a week of Plus is.
   Monday's $12 lunch at the first place earns its $5 (paid in full);
   Wednesday the second place takes 15% off instead; Thursday the first
   place's $5 comes off. The other four places' $5 is still to earn this week.
   Points on what was paid (never more than they'd earn). Real places, real
   menu prices. */
const WEEK = (() => {
  const [a, b] = PLACES;
  if (!a || !b) return null;
  const pctOff = Math.round(b.order.price * PERCENT) / 100;
  const rows = [
    { day: "Mon", place: a, fig: `+${money0(CREDIT)}`, what: "earned", paid: a.order.price },
    { day: "Wed", place: b, fig: `−${money(pctOff)}`, what: `${PERCENT}% off`, paid: b.order.price - pctOff },
    { day: "Thu", place: a, fig: `−${money0(CREDIT)}`, what: "credit used", paid: a.order.price - CREDIT },
  ];
  const points = rows.reduce((n, r) => n + Math.floor(Math.round(r.paid * 100) * POINTS_PER_DOLLAR / 100), 0);
  return { rows, points, toEarn: PLACES.filter((p) => p.id !== a.id) };
})();
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
  const pts = useRef<HTMLElement | null>(null);
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
      /* The week fills in as it happened: each order and what Plus did on
         it, the points counting up, the places still to earn last. */
      el.querySelectorAll(".tpp-wk-feed li").forEach((r, k) =>
        r.animate?.(
          [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 460, delay: 160 + k * 260, easing: EASE_OUT, fill: "backwards" },
        ),
      );
      el.querySelectorAll(".tpp-wk-feed em").forEach((m, k) =>
        m.animate?.(
          [
            { opacity: 0, transform: "scale(.6)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 380, delay: 360 + k * 260, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "backwards" },
        ),
      );
      el.querySelectorAll(".tpp-wk-earn .collar").forEach((m, k) =>
        m.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: 1150 + k * 70, easing: EASE_OUT, fill: "backwards" }),
      );
      const out = pts.current;
      if (out && WEEK) {
        window.cancelAnimationFrame(count.current ?? 0);
        const t0 = performance.now() + 900;
        const total = WEEK.points;
        out.textContent = "0";
        const tick = (t: number) => {
          const k = Math.min(1, Math.max(0, (t - t0) / 700));
          out.textContent = String(Math.round(total * (1 - Math.pow(1 - k, 3))));
          if (k < 1) count.current = window.requestAnimationFrame(tick);
        };
        count.current = window.requestAnimationFrame(tick);
      }
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
              <div className="tpp-hw-s tpp-wk" data-on={cur === 2 ? "" : undefined}>
                <div className="tpp-hw-wk">
                  <b>{SAMPLE_GIFT.to}’s week</b>
                </div>
                {WEEK ? (
                  <>
                    <ul className="tpp-wk-feed">
                      {WEEK.rows.map((r) => (
                        <li key={r.day}>
                          <span className="collar" data-field={logoField(r.place.id)}>
                            <img src={r.place.logo} alt="" decoding="async" loading="lazy" />
                          </span>
                          <span className="tpp-wk-what">
                            <b>{r.place.name}</b>
                            <small>
                              {r.day} · {money(r.place.order.price)}
                            </small>
                          </span>
                          <span className="tpp-wk-fig">
                            <em>{r.fig}</em>
                            <small>{r.what}</small>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="tpp-wk-pts">
                      <Glyph d={GLYPHS.star} />
                      <span>Points</span>
                      <b ref={pts}>{WEEK.points}</b>
                    </div>
                    <div className="tpp-wk-earn">
                      <span>{money0(CREDIT)} still to earn at</span>
                      <span className="tpp-wk-logos">
                        {WEEK.toEarn.map((p) => (
                          <span key={p.id} className="collar" data-field={logoField(p.id)}>
                            <img src={p.logo} alt="" decoding="async" loading="lazy" />
                          </span>
                        ))}
                      </span>
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
