import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { PayGet, LockedIn } from "../shell/OfferVersions";
import { Clock } from "../shell/WelcomeOffer";
import { asset } from "../asset";
import { logoField, venues } from "../model/content";
import { SAMPLE_GIFT } from "../model/gift";
import { POINTS_PER_DOLLAR } from "../model/order";
import { parentMock } from "../model/parents";
import { PREVIEW_STUDENT_VOICES, PREVIEW_VOICES, STUDENT_VOICES, VOICES } from "../model/voices";
import { AppLink } from "../shell/GetTheApp";
import { CREDIT, Chevron, DOOR, FlatMark, GLYPHS, Glyph, LUNCH, PERCENT, PLACES, lineLabel, money, money0, reducedMotion, useParentPrice, type Audience, type PhoneOrder } from "./parents_kit";

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

/* ══ UNDER THE OFFER: THE OTHER TWO BENEFITS AND THE PROMISE, ONE LIST ══════
   Always under the offer card, never in it (Sam, 6 Nov 2026: "the callouts
   are underneath this parent container, not within it"): between the card
   and the gift band on a phone, under the card in the held right-hand
   column on a computer.
   Polish, 7 Nov 2026 (Sam: "isn't this kind of busy?"): the two white chips
   and the two promise lines were four objects in two styles; now they are
   one quiet list on the ground, one row style (a glyph, the fact in ink, the
   rest muted), in two groups: what else Plus gives, then what we promise.
   The facts are the same:
     · 15% off after the $5, once a day (Sam, 10 Nov 2026: then, not
       instead); points on everything;
     · a month that didn't save them what you spent, refunded on asking
       (support, by hand; Sam, 7 Nov 2026), and cancel by email. No refund
       for never signing in (Sam, 7 Nov 2026: "if someone doesn't claim it
       they don't claim it ... We still bill them"), so the line is the same
       on an ask link. (Not "manage it from your account": that page explains
       how to cancel, it isn't self-serve; Hormozi audit, 6 Nov 2026.) */
/* The student page (plus.tapin.app, Sam, 8 Nov 2026) has the same list in
   its own words: a third benefit, New places, so What you get's last fact
   isn't lost; and its own promise: a refund asked for and auto-approved, the
   price held, cancel in the app. No renewal email line: it isn't confirmed
   that students get one. `monthly` is the price the student page shows. */
export function UnderOffer({ audience = "parent" }: { audience?: Audience; monthly?: string }) {
  /* One even list under the card (Sam, 10 Nov 2026: "/impeccable polish
     this"). The 15% row went: the card right above now says "Then 15% off,
     every day". Points first, then the promise. The parents' way out is a
     reply to that text, so it wears the text bubble, not the envelope. */
  const rows =
    audience === "student"
      ? [
          { key: "points", d: GLYPHS.star, b: "Points", rest: " on everything" },
          { key: "refund", d: GLYPHS.refund, b: "Refund auto-approved", rest: " if Plus saved you less than you paid" },
          { key: "cancel", d: GLYPHS.phone, b: "Cancel anytime", rest: " in the Tapin app" },
        ]
      : [
          { key: "points", d: GLYPHS.star, b: "Points", rest: " on everything" },
          /* A text before each bill, and cancel by replying (Sam, 9 Nov
             2026: "we text them before every billing, and they can cancel
             via text"). */
          { key: "text", d: GLYPHS.bell, b: "A text before every bill", rest: "" },
          { key: "cancel", d: GLYPHS.text, b: "Cancel anytime", rest: ", right from that text" },
        ];
  /* Parents: one sentence, no glyphs (Sam, 11 Nov 2026: "should be less
     busy"). */
  if (audience !== "student")
    return (
      <div className="tpp-notes">
        <p className="tpp-notes-line">
          <b>Points</b> on everything. <b>A text before every bill</b>, and you can cancel right from&nbsp;it.
        </p>
      </div>
    );
  return (
    <div className="tpp-notes">
      <ul aria-label={audience === "student" ? "Also with Plus" : "Also with Plus, and our promise"}>
        {rows.map((r) => (
          <li key={r.key}>
            <Glyph d={r.d} />
            <span>
              <b>{r.b}</b>
              {r.rest}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
          With Tapin Plus, a {money0(LUNCH)} lunch downtown is {money0(LUNCH - CREDIT)}, once a month, at each of five spots.
        </span>
        {/* The approved limit (COPY.md v2 final: "every week, at each of five
            spots"), so the $7 never reads as every lunch. */}
        <span aria-hidden="true">A {money0(LUNCH)} lunch downtown</span>
        <small aria-hidden="true">once a month, at each of five spots</small>
      </p>
    </div>
  );
}

/* ══ THE PRICE CARD (Sam, 9 Nov 2026: "a holiday countdown ... the price
   at the end of this year jumps up to $14.99 a month, $7.99 is locked in",
   then "there are a lot of numbers here" and /impeccable redesign, picking
   "the price leads", the countdown in the card) ═══════════════════════════════
   The monthly price leads, set large; under it the holiday tag with the days
   left, and one line on what locked in means. $14.99 is a future price, so
   it is said, never struck through as if it were the old one. The monthly
   comes from the cart (a promo link's stays its own). After the year turns
   the tag and the line go and the price stands alone. */
export const HOLIDAY_ENDS = Date.parse("2027-01-01T00:00:00-05:00");

/* ══ THE PRICE CARD, PAY / GET (Sam, 10 Nov 2026, of the student page's C:
   "this is great, for both the moms and regular page") ═══════════════════════
   What you pay and what they get as two rows (shell/OfferVersions.tsx), then
   the holiday price the old card carried: $MONTHLY locked in, $14.99 for new
   gifts from January 1, the days left. After the year turns, the two rows
   alone. */
export function PayGetLead({ lower = false }: { lower?: boolean }) {
  const { FIRST, MONTHLY } = useParentPrice();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const left = HOLIDAY_ENDS - now;
  const days = Math.floor(left / 86_400_000);
  const when = left <= 0 ? null : days < 1 ? "ends tonight" : days === 1 ? "1 day left" : `${days} days left`;
  return (
    <div className="ov ov-c" data-ph-show="">
      <PayGet first={FIRST} monthly={MONTHLY} they />
      {/* With Count under it (ParentsCount), pay/get alone here. */}
      {lower ? null : <LockedIn monthly={MONTHLY} they />}
      {when && !lower ? (
        <>
          {/* One line (Sam, 11 Nov 2026: "there's a bit too much going on
              here"). The lock band above already says their price is theirs
              for as long as they're on it; this says only what changes, and
              when. */}
          <p className="ov-ends">
            <Clock />
            <span className="tnum">
              {when} <i>· {money(AFTER_HOLIDAY)} for new gifts from January&nbsp;1</i>
            </span>
          </p>
        </>
      ) : null}
    </div>
  );
}
export const AFTER_HOLIDAY = 14.99;

/* ══ COUNT, IN THE PARENTS' TERMS (Sam, 12 Nov 2026: "port the count layout
   to the parents page too") ═══════════════════════════════════════════════
   The students card's lower half (shell/LowerVersions.tsx, 3 · Count): one
   big number with its bar, the button, then one line that opens on the
   price lock, the refund and cancelling. The parents' price has no spots:
   what runs out for them is the holiday price, so the big number is the
   days left before new gifts cost $14.99 (January 1). The bar runs from 9
   November, when that countdown started. The list under the card (points,
   the text before each bill) folds into the line. ?lowv=0 shows the old
   card, as on the students page. */
const HOLIDAY_FROM = Date.parse("2026-11-09T00:00:00-05:00");
export function ParentsCount({ join }: { join: ReactNode }) {
  const { MONTHLY } = useParentPrice();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const left = HOLIDAY_ENDS - now;
  const days = Math.floor(left / 86_400_000);
  const share = Math.max(0, Math.min(1, left / (HOLIDAY_ENDS - HOLIDAY_FROM)));
  return (
    <div className="lw lw-3 tpp-lw">
      {left > 0 ? (
        <>
          <div className="lw-3-count tnum">
            {days >= 1 ? <b>{days}</b> : null}
            <p>
              <span>
                {days >= 1 ? (days === 1 ? "day" : "days") + " left" : "Ends tonight"} at {MONTHLY}&nbsp;a&nbsp;month
              </span>
              <small>then {money(AFTER_HOLIDAY)} for new gifts from January&nbsp;1</small>
            </p>
          </div>
          <span className="lw-bar" aria-hidden="true">
            <i style={{ transform: `scaleX(${share})` }} />
          </span>
        </>
      ) : null}
      {join}
      <details className="lw-3-more">
        <summary>
          <span>Price lock, refunds and cancelling</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 10 5 5 5-5" />
          </svg>
        </summary>
        <ul className="tnum">
          <li>
            <b>{MONTHLY} a month, locked in</b> as more places join: bars, coffee shops, salons, gyms, barbershops and&nbsp;more.
          </li>
          {/* On request, so never "auto" (the parents' guarantee, 9 Nov). */}
          <li>
            <b>Full refund</b> if they don’t save what you&nbsp;spent.
          </li>
          <li>
            <b>A text before every bill</b>, and you can cancel right from&nbsp;it.
          </li>
          <li>
            <b>Points</b> on everything.
          </li>
        </ul>
      </details>
    </div>
  );
}
export function PriceLead() {
  const { FIRST, MONTHLY } = useParentPrice();
  /* Checked each minute so the days turn over at midnight. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const left = HOLIDAY_ENDS - now;
  const days = Math.floor(left / 86_400_000);
  const when = left <= 0 ? null : days < 1 ? "Ends tonight" : days === 1 ? "1 day left" : `${days} days left`;
  return (
    <div className="tpp-price" data-ph-show="">
      {/* The price after Jan 1 struck beside it, as a compare-at price
          (Sam, 9 Nov 2026: "we should just have a compare at price, strike
          through price next to the $7.99"); true because new gifts go to it
          on Jan 1, which the tag says. The first month under it ("aren't we
          still doing the $3.99/month to start?"). */}
      {/* The first month leads (Sam, 9 Nov 2026: "let's have the $3.99 be
          the big one here, and the $7.99 be below"). */}
      <p className="tpp-price-fig tnum">
        <b>{FIRST}</b>
        <span>first month</span>
      </p>
      {/* The monthly whole ("$7.99/month"), the compare-at price after it
          (9 Nov 2026 polish). */}
      <p className="tpp-price-then tnum">
        Then <b>{MONTHLY}/month</b>
        {when ? (
          <s>
            <span className="tpp-sr">was </span>
            {money(AFTER_HOLIDAY)}
          </s>
        ) : null}
      </p>
      {when ? (
        <p className="tpp-price-tag tnum">
          Holiday price, locked in <i aria-hidden="true" /> <b>{when}</b>
        </p>
      ) : null}
      <p className="tpp-price-what">
        <b>${CREDIT} credit</b> every month at each of five{"\u00a0"}spots.
      </p>
    </div>
  );
}

/* ══ WHAT'S IN THEIR CARE PACKAGE: SWIPE CARDS ══════════════════════════════
   One thing in the box a card, swiped sideways, in the order a parent asks:
   what's inside, where, how it gets to them, what it saves, what it costs
   (Sam, 8 Nov 2026: "more abundantly clear what's actually in it and how this
   acts like a care package"; his mom liked the cards, not that she couldn't
   tell what they were). Drafted by three writers, judged for a parent who has
   never heard of Tapin, every line held to the offer. Each card is short
   enough that its line shows without a tap. No total, no points value. The
   dots follow the swipe and jump to a card. */
export function BenefitCards() {
  const { FIRST, MONTHLY } = useParentPrice();
  const rail = useRef<HTMLUListElement | null>(null);
  const [at, setAt] = useState(0);
  const cards: Array<{ key: string; art: ReactNode; label: string; line?: string; ink?: boolean; green?: boolean }> = [
    /* The $25 a month first, the offer itself (Sam, 9 Nov 2026, reworking
       the offer: "$5 monthly credit at each spot on tapin plus with no
       minimum spend ... Credit doesn't roll over"). */
    {
      key: "welcome",
      art: (
        <b className="tpp-card-fig" data-money="">
          {money0(CREDIT * PLACES.length)}
        </b>
      ),
      /* "$5 to spend" (Sam, 11 Nov 2026). */
      label: "To spend every month",
      line: `${money0(CREDIT)} at each of five spots, no minimum spend. It resets each month, so they use it.`,
      /* On money green (Sam, 9 Nov 2026: "I think we give this a green
         background"). */
      green: true,
    },
    /* The weekly $5 is marketed again (Sam, 10 Nov 2026: Get $5 · Earn
       $5 · Save 15%), so its card is back, second. */
    {
      key: "earn",
      art: <b className="tpp-card-fig">{money0(CREDIT)}</b>,
      label: "Back every week",
      line: "When they spend $10 on food and non-alcoholic drinks.",
    },
    {
      key: "places",
      art: <LogoRow size={32} />,
      label: "These five places, with more joining",
      line: "Coffee and breakfast, ice cream, pizza and burgers, tacos and sandwiches.",
    },
    {
      key: "pct",
      art: <b className="tpp-card-fig">{PERCENT}%</b>,
      label: `Off their other orders, every day`,
      line: "One benefit per order. Alcohol excluded.",
    },
    {
      key: "note",
      /* The care package's own envelope, as the look picker draws it. */
      art: (
        <span className="scene-swatch tpp-card-env" data-scene="maroon" aria-hidden="true">
          <i className="scene-swatch-env" />
        </span>
      ),
      label: "Your note and photo, on top",
      line: "They open it like a present, from a text on their phone.",
    },
    {
      key: "phone",
      art: <Glyph d={GLYPHS.phone} className="tpp-card-glyph" />,
      label: "You send it. They claim it. It’s on.",
      line: "In the Tapin app, with their phone number.",
    },
    /* What it costs, last (Sam, 6 Nov 2026: "$7.99 saves an average of $60 a
       month for your kiddo"), with the parents' refund, as it is everywhere. */
    {
      key: "price",
      art: <b className="tpp-card-fig">{FIRST}</b>,
      label: `First month, then ${MONTHLY} a month`,
      line: "A text before every bill. Cancel anytime. If they don’t save what you spent, ask for a full refund.",
    },
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
          <li key={c.key} className="tpp-card" data-ink={c.ink ? "" : undefined} data-green={c.green ? "" : undefined}>
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
   savings. Four steps since 7 Nov: the last is how to cancel, and that an
   unclaimed gift expires uncharged (the gift backend, 8 Nov 2026). */
const parentSteps = (first: string): Array<{ glyph: string; when: string; title: string; line: ReactNode }> => [
  {
    glyph: GLYPHS.card,
    when: "Today",
    title: "You add their number",
    line: <>Enter your student’s mobile number and add your card: {first} for the first month.</>,
  },
  {
    glyph: GLYPHS.text,
    when: "Next",
    title: "They claim it",
    line: <>They get one text from Tapin with your gift. They open it and sign in with their own number, and their Plus starts.</>,
  },
  {
    glyph: GLYPHS.tag,
    when: "After that",
    title: "They save every month",
    /* The monthly credit (Sam, 9 Nov 2026). */
    line: (
      <>
        {money0(CREDIT)} in credit every month at each Plus place, no minimum spend. Then {PERCENT}% off, once a day.
      </>
    ),
  },
  {
    glyph: GLYPHS.bell,
    when: "Anytime",
    title: "A text before every bill",
    line: <>We text you before each monthly bill. Cancel right from that text, or email support@tapin.app and we’ll do it for you.</>,
  },
];
/* A made-up number (555-01xx is the range kept for fiction). */
const SAMPLE_NUMBER = "(540) 555-0142";
const STEP_MS = 3600;
/* The week's screen (Sam's pick A, "In the app", 8 Nov 2026: "this is
   perfect"): the real Tapin app at a size a parent can read. Home's photo
   card for the first place, whose smoked strip carries the credit earned
   there and the points from that order; then the place's checkout sheet
   rises on the next order with that credit taken off ("Credit applied", as
   checkout_summary.tsx says it) and the pay pill in the merchant's colour
   ("Pay now", as the app labels it). The card's Plus pill is dropped (it
   carries the Plus mark). Real place, real menu price; points on the price
   paid, 10 per $1. */
const INAPP = (() => {
  const a = PLACES[0];
  const v = a && venues.find((x) => x.id === a.id);
  if (!a || !v) return null;
  const points = Math.floor((Math.round(a.order.price * 100) * POINTS_PER_DOLLAR) / 100);
  return { a, hero: v.hero, brand: v.brandColor, points };
})();
/* Lucide's wallet and award, as the app's strip draws them. */
const InAppIcon = ({ kind }: { kind: "wallet" | "award" }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {kind === "wallet" ? (
      <>
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      </>
    ) : (
      <>
        <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
        <circle cx="12" cy="8" r="6" />
      </>
    )}
  </svg>
);
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
/* ── The student page's four steps (plus.tapin.app, round 2, Sam, 8 Nov
   2026): the same player and phone, in "you". Join with your number, get the
   app (sign in with the same number: the checkout signs you in by phone, and
   the membership is kept on that account, which the app reads), save at each
   place, cancel in the app. Step 3's screen is the five places alone, not a
   week of saving: "$5 comes off" is What $5 back looks like's picture, and
   the shorter screen lets the panel be shorter (data-audience in
   parents.css). The refund is the module right under this one. `first` and
   `monthly` are the prices the page shows; `free` a promo link's free first
   month. */
function studentSteps(first: string, free: boolean, appTab: number, place?: string): Array<{ glyph: string; when: string; title: string; line: ReactNode }> {
  return [
    {
      glyph: GLYPHS.card,
      when: "Today",
      title: "Join with your number",
      line: free ? <>Enter your mobile number. Your first month is free.</> : <>Enter your mobile number and pay {first} for your first month.</>,
    },
    {
      glyph: GLYPHS.phone,
      when: "Next",
      title: "Get the Tapin app",
      line: (
        <>
          Sign in with the number you joined with. Your Plus is already there.{" "}
          <AppLink where="home_how" className="tpp-hw-link" glyph tabIndex={appTab} />
        </>
      ),
    },
    {
      glyph: GLYPHS.tag,
      when: "Every month",
      title: place ? `Save at ${place}` : "Save at each place",
      line: place ? (
        <>
          {money0(CREDIT)} credit every month, no minimum spend. Then {PERCENT}% off, once a day.
        </>
      ) : (
        <>
          {money0(CREDIT)} credit every month at each place, no minimum spend. Then {PERCENT}% off, once a day.
        </>
      ),
    },
    { glyph: GLYPHS.cancel, when: "Anytime", title: "Cancel anytime", line: <>In the Tapin app, whenever you want.</> },
  ];
}
export function HowPhone({
  audience = "parent",
  first: firstProp,
  firstLabel = "First month",
  monthly: monthlyProp,
  free = false,
  only,
}: {
  audience?: Audience;
  first?: string;
  /** The price row's words ("Every month" for a for-life price). */
  firstLabel?: string;
  monthly?: string;
  free?: boolean;
  /** A place's own page (/coffeeholics): its name in step 3 and its logo
   *  alone on that step's screen. */
  only?: string;
} = {}) {
  const prices = useParentPrice();
  const onlyPlace = only ? PLACES.find((p) => p.id === only) : undefined;
  const shownPlaces = onlyPlace ? [onlyPlace] : PLACES;
  const first = firstProp ?? prices.FIRST;
  const monthly = monthlyProp ?? prices.MONTHLY;
  const MONTHLY = prices.MONTHLY;
  const student = audience === "student";
  const [root, seen] = useSeen<HTMLDivElement>();
  const [cur, setCur] = useState(0);
  const [timed, setTimed] = useState<number | null>(null);
  const auto = useRef(true);
  const timer = useRef<number | undefined>(undefined);
  const typing = useRef<number | undefined>(undefined);
  const bar = useRef<Animation | undefined>(undefined);
  const num = useRef<HTMLSpanElement | null>(null);
  const wk = useRef<Animation[]>([]);
  const list = useRef<HTMLOListElement | null>(null);
  /* The student's app link only takes focus while its step is open. */
  const steps = student ? studentSteps(first, free, cur === 1 ? 0 : -1, onlyPlace?.name) : parentSteps(first);
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
  /* The student's screens: the app icon settles and "Plus is on" rises; the
     five places pop in turn; the cancel button rises. */
  const enterStudent = (el: HTMLElement, i: number) => {
    const rise = (m: Element | null, delay: number): Animation | undefined =>
      m?.animate?.(
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 460, delay, easing: EASE_OUT, fill: "backwards" },
      );
    if (i === 1) {
      el.querySelector(".tpp-hw-store img")?.animate?.(
        [
          { opacity: 0, transform: "scale(.82)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 520, delay: 160, easing: EASE_OUT, fill: "backwards" },
      );
      rise(el.querySelector(".tpp-hw-on"), 900);
    }
    if (i === 2) {
      wk.current.forEach((a) => a.cancel());
      wk.current = Array.from(el.querySelectorAll(".tpp-hw-places > span"))
        .map((m, k) =>
          m.animate?.(
            [
              { opacity: 0, transform: "scale(.7)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 380, delay: 220 + k * 70, easing: POP, fill: "backwards" },
          ),
        )
        .filter((a): a is Animation => !!a);
    }
    if (i === 3) rise(el.querySelector(".tpp-hw-cancel"), 300);
  };
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
    if (student) {
      enterStudent(el, i);
      return;
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
      /* The credit lands on the place's strip, the points beside it; then,
         next time there, the checkout sheet rises and the credit comes off
         on a pale green wash that fades. Done in about 2.8s. */
      const scr = el.querySelector<HTMLElement>(".tpp-e");
      wk.current.forEach((a) => a.cancel());
      wk.current = [];
      if (!scr) return;
      const run: Animation[] = [];
      const add = (m: Element | null, k: Keyframe[], o: KeyframeAnimationOptions) => {
        const a = m?.animate?.(k, { easing: EASE_OUT, fill: "backwards", ...o });
        if (a) run.push(a);
      };
      const up = (y: number): Keyframe[] => [
        { opacity: 0, transform: `translateY(${y}px)` },
        { opacity: 1, transform: "none" },
      ];
      add(
        scr.querySelector(".tpp-e-cr"),
        [
          { opacity: 0, transform: "translateY(6px) scale(.9)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 460, delay: 250 },
      );
      add(scr.querySelector(".tpp-e-pt"), [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 420 });
      add(scr.querySelector(".tpp-e-sheet"), [{ transform: "translateY(160px)" }, { transform: "none" }], { duration: 620, delay: 800 });
      const row = scr.querySelector(".tpp-e-credit");
      add(row, up(8), { duration: 460, delay: 1300 });
      add(
        row,
        [
          { backgroundColor: "rgba(11, 122, 83, .12)" },
          { backgroundColor: "rgba(11, 122, 83, .12)", offset: 0.45 },
          { backgroundColor: "rgba(11, 122, 83, 0)" },
        ],
        { duration: 1300, delay: 1450, easing: "ease-out" },
      );
      wk.current = run;
    }
    if (i === 3) {
      /* The email opens: subject, sender and body rise in turn, then the
         address fades in. */
      el.querySelectorAll(".tpp-hw-em-subj, .tpp-hw-em-from, .tpp-hw-em-body").forEach((m, k) =>
        m.animate?.(
          [
            { opacity: 0, transform: "translateY(10px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 460, delay: 160 + k * 110, easing: EASE_OUT, fill: "backwards" },
        ),
      );
      el.querySelector(".tpp-hw-em .tpp-hw-mail")?.animate?.([{ opacity: 0 }, { opacity: 1 }], {
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
    if (play && auto.current && i < steps.length - 1) {
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
      wk.current.forEach((a) => a.cancel());
      bar.current?.cancel();
    },
    [],
  );
  /* Step 3's motion stops when another step opens. */
  useEffect(() => {
    if (cur === 2) return;
    wk.current.forEach((a) => a.cancel());
    wk.current = [];
  }, [cur]);
  const tap = (i: number) => {
    auto.current = false;
    go(i, false);
  };
  return (
    <div ref={root} className="tpp-hw tnum" data-audience={student ? "student" : undefined}>
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
                <span className="tpp-hw-lbl">{student ? "Your mobile number" : "Their mobile number"}</span>
                <div className="tpp-hw-field">
                  <span ref={num}>{SAMPLE_NUMBER}</span>
                  <span className="tpp-hw-caret" />
                </div>
                <div className="tpp-hw-row">
                  {/* "Due today $0" went (Sam, 9 Nov 2026: "its $3.99 today"). */}
                  <span>{firstLabel}</span>
                  <b>{first}</b>
                </div>
                <div className="tpp-hw-pay">{student ? (free ? "Join Tapin Plus" : `Pay ${first}`) : "Send the gift"}</div>
              </div>
              {student ? (
                <>
                  {/* Get the app, then sign in with the same number: Plus is on. */}
                  <div className="tpp-hw-s" data-on={cur === 1 ? "" : undefined}>
                    <div className="tpp-hw-store">
                      <img src={APP_ICON} alt="" decoding="async" loading="lazy" />
                      <span>
                        <b>Tapin</b>
                        <small>Free on the App Store</small>
                      </span>
                    </div>
                    <span className="tpp-hw-get">Get</span>
                    <span className="tpp-hw-hr" />
                    <span className="tpp-hw-lbl">Sign in with your number</span>
                    <div className="tpp-hw-field">
                      <span>{SAMPLE_NUMBER}</span>
                    </div>
                    <div className="tpp-hw-on">
                      <i />
                      Plus is on
                    </div>
                  </div>
                  {/* The five places, nothing else: $5 back at each. */}
                  <div className="tpp-hw-s" data-on={cur === 2 ? "" : undefined}>
                    <div className="tpp-hw-app">
                      <img src={APP_ICON} alt="" decoding="async" loading="lazy" />
                      Tapin Plus
                    </div>
                    <span className="tpp-hw-lbl tpp-hw-every">
                      <b>{money0(CREDIT)} credit</b> every month at
                    </span>
                    <div className="tpp-hw-places" data-one={onlyPlace ? "" : undefined}>
                      {shownPlaces.map((p) => (
                        <span key={p.id}>
                          <img src={p.logo} alt="" decoding="async" loading="lazy" />
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Your Plus in the app, and the way out. */}
                  <div className="tpp-hw-s" data-on={cur === 3 ? "" : undefined}>
                    <div className="tpp-hw-app">
                      <img src={APP_ICON} alt="" decoding="async" loading="lazy" />
                      Your Plus
                    </div>
                    <div className="tpp-hw-plan">
                      <b>
                        <i />
                        Plus is on
                      </b>
                      <span>{monthly}/month, locked in</span>
                    </div>
                    <span className="tpp-hw-cancel">Cancel Plus</span>
                  </div>
                </>
              ) : (
                <>
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
                {INAPP ? (
                  <>
                    <div className="tpp-e-card">
                      <img className="tpp-e-photo" src={INAPP.hero} alt="" decoding="async" loading="lazy" />
                      <span className="tpp-e-shade" />
                      <div className="tpp-e-id">
                        <img src={INAPP.a.logo} alt="" decoding="async" loading="lazy" />
                        <b>{INAPP.a.name}</b>
                      </div>
                      <div className="tpp-e-strip">
                        <span className="tpp-e-cr">
                          <InAppIcon kind="wallet" />
                          {money0(CREDIT)} credit
                        </span>
                        <i />
                        <span className="tpp-e-pt">
                          <InAppIcon kind="award" />
                          {INAPP.points} pts
                        </span>
                      </div>
                    </div>
                    <div className="tpp-e-sheet">
                      <span className="tpp-e-grab" />
                      <div className="tpp-e-item">
                        <img src={INAPP.a.order.img} alt="" decoding="async" loading="lazy" />
                        <span>
                          <b>{INAPP.a.order.label}</b>
                          <span>{money(INAPP.a.order.price)}</span>
                        </span>
                      </div>
                      <span className="tpp-e-rule" />
                      <div className="tpp-e-credit">
                        <span>Credit applied</span>
                        <b>&minus;{money(CREDIT)}</b>
                      </div>
                      <div className="tpp-e-pay" style={{ background: INAPP.brand }}>
                        Pay now
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
              {/* The reminder before each bill, as the text it is again
                  (Sam, 9 Nov 2026: "we text them before every billing, and
                  they can cancel via text"): from Tapin, the price, and
                  cancelling by replying. */}
              <div className="tpp-hw-s tpp-hw-em tpp-hw-sms" data-on={cur === 3 ? "" : undefined}>
                <span className="tpp-hw-em-bar">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                  Messages
                </span>
                <div className="tpp-hw-em-from">
                  <img src={APP_ICON} alt="" decoding="async" loading="lazy" />
                  <b>Tapin</b>
                </div>
                <p className="tpp-hw-em-body tpp-hw-bubble tnum">
                  {SAMPLE_GIFT.to}’s Tapin Plus renews soon at {MONTHLY}. Want to cancel? Just reply to this text.
                </p>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
        <ol ref={list} className="tpp-hw-steps">
          {steps.map((s, i) => (
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
/* The student page (plus.tapin.app, Sam, 8 Nov 2026) shows it as "your
   phone", in place of its old order card, with its own caption; `start` is
   the place to show first (/coffeeholics opens on Coffeeholics). */
export function CheckoutPhone({
  audience = "parent",
  start = 0,
  orders: ordersProp,
  place,
}: {
  audience?: Audience;
  start?: number;
  /** One place's own orders (parents_kit placeOrders), switched by order
   *  rather than by place; the five places' examples without it. */
  orders?: PhoneOrder[];
  place?: { name: string; logo: string; id: string };
} = {}) {
  const student = audience === "student";
  const one = !!ordersProp?.length && !!place;
  const orders: Array<PhoneOrder & { name: string; logo: string; placeId: string }> = one
    ? ordersProp!.map((o) => ({ ...o, name: place!.name, logo: place!.logo, placeId: place!.id }))
    : PLACES.map((x) => ({
        id: x.id,
        title: x.name,
        sub: x.order.label,
        img: x.logo,
        lines: x.lines,
        price: x.order.price,
        off: CREDIT,
        offLabel: "Plus credit",
        name: x.name,
        logo: x.logo,
        placeId: x.id,
      }));
  const [stage, seen] = useSeen<HTMLDivElement>(0.5);
  const [which, setWhich] = useState(start);
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
  const p = orders[which] ?? orders[0];
  if (!p) return null;
  const now = Math.max(0, Math.round((p.price - p.off) * 100) / 100);
  return (
    <div className="tpp-fb tnum">
      <div className="tpp-fb-grid">
        <div
          ref={stage}
          className="tpp-fb-stage"
          role="img"
          aria-label={`${student ? "Your" : "Their"} phone at checkout at ${p.name}: ${p.sub}, ${money(p.price)}. ${p.offLabel}, minus ${money(p.off)}. Total ${money(now)}.`}
        >
          <span className="tpp-fb-sun" />
          <div className="tpp-fb-phone">
            <div className="tpp-fb-screen">
              {/* Blank behind the sheet (Sam, 7 Nov 2026: the dish photo
                  there was "a bit busy"). */}
              <div className="tpp-fb-behind" />
              <div className="tpp-fb-sheet">
                <span className="tpp-fb-grab" />
                <p className="tpp-fb-head">
                  <span className="collar" data-field={logoField(p.placeId)}>
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
                    <span>{p.offLabel}</span>
                    <b className="tpp-fb-off">&minus;{money(p.off)}</b>
                  </p>
                </div>
                <p className="tpp-fb-total">
                  <span>Total</span>
                  <span className="tpp-fb-swap">
                    <b className="was">{money(p.price)}</b>
                    <b className="now">{money(now)}</b>
                  </span>
                </p>
                {/* Points on every order (Sam, 12 Nov 2026: "Maybe we show
                    points for all of them as well"); one place's page. */}
                {one && p.points ? (
                  <p className="tpp-fb-points">
                    <Glyph d={GLYPHS.star} />
                    <span>You earn</span>
                    <b>{p.points} points</b>
                  </p>
                ) : null}
                <p className="tpp-fb-pay">
                  <span className="tpp-fb-swap">
                    <b className="was">Pay {money(p.price)}</b>
                    <b className="now">Pay {money(now)}</b>
                  </span>
                </p>
                <span className="tpp-fb-home" />
              </div>
            </div>
          </div>
        </div>
        <div className="tpp-fb-side">
          <div className="tpp-fb-picks" role="group" aria-label="Example orders" style={{ ["--n" as string]: orders.length }}>
            {orders.map((x, i) => (
              <button
                key={x.id}
                type="button"
                className="tpp-fb-pick"
                aria-label={one ? `${x.title}: ${x.sub}` : `Show an order at ${x.name}`}
                aria-pressed={i === which}
                onClick={() => pick(i)}
              >
                <span className="collar" data-field={one ? undefined : logoField(x.placeId)}>
                  <img src={x.img} alt="" decoding="async" />
                </span>
                <span className="tpp-fb-pick-text" aria-hidden="true">
                  <b>{x.title}</b>
                  <small>{x.sub}</small>
                </span>
              </button>
            ))}
          </div>
          {one ? (
            <p className="tpp-math">
              <b>{money0(CREDIT)}</b> credit at {place!.name} every month, no minimum, and <b>{money0(CREDIT)} back</b> every week you spend $10. Then {PERCENT}% off your other orders, once a day. Points on every order.
            </p>
          ) : student ? (
            <p className="tpp-math">
              <b>{money0(CREDIT)}</b> at each place every month, on any order. It resets each month, so use it.
            </p>
          ) : (
            <p className="tpp-math">
              ${CREDIT} at each place every month, on any order, no minimum. Alcohol is never discounted.
            </p>
          )}
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
/* The student page (plus.tapin.app, Sam, 8 Nov 2026) asks it of itself,
   "What if I don't save?", and answers with its own promise: the refund is
   asked for and auto-approved (never "full"), the month-by-month rule one tap
   down, word for word as that page has always said it. `monthly` is the price
   it shows; until that price is in, or if it were ever $10 or more (two
   credits would no longer cover it), the module stays out. */
const WHAT_IF: Record<Audience, { h: string; row: string; fine: string }> = {
  parent: {
    h: "What if they don\u2019t use it?",
    row: "Full refund.",
    fine: "Full refund if they don\u2019t save what you spent. Cancel anytime, right from the text we send before every bill.",
  },
  student: {
    h: "What if I don\u2019t save?",
    row: "Refund, auto-approved.",
    fine: "Every month counts on its own. If Plus saved you less than you paid that month, ask for a refund and it\u2019s auto-approved.",
  },
};
export function WhatIfUnused({ audience = "parent", monthly: monthlyProp }: { audience?: Audience; monthly?: string } = {}) {
  const prices = useParentPrice();
  const monthly = monthlyProp ?? prices.MONTHLY;
  const words = WHAT_IF[audience];
  const MONTHLY_N = Number(monthly.replace(/[^\d.]/g, ""));
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
  if (!(MONTHLY_N > 0 && MONTHLY_N < CREDIT * 2)) return null;
  const seg = `${((CREDIT / B_TRACK) * 100).toFixed(3)}%`;
  return (
    <section className="tpa-module tpp-b" aria-labelledby="tpp-b-h">
      <h2 id="tpp-b-h" className="tpa-h2">
        {words.h}
      </h2>
      <button type="button" className="tpp-b-row" aria-expanded={open} aria-controls="tpp-b-fine" onClick={() => setOpen((o) => !o)}>
        <Glyph d={GLYPHS.refund} className="tpp-b-ico" />
        <span>{words.row}</span>
        <span ref={chev} className="tpp-b-chev">
          <Chevron />
        </span>
      </button>
      {/* Word for word the promise under the offer (UnderOffer). */}
      <p ref={fine} id="tpp-b-fine" className="tpp-b-fine" hidden={!open}>
        {words.fine}
      </p>
      <div
        ref={meter}
        className="tpp-b-meter tnum"
        role="img"
        aria-label={`Two ${money0(CREDIT)} credits make ${money0(CREDIT * 2)}, more than the ${monthly} a month`}
        style={{ ["--seg" as string]: seg, ["--at" as string]: `${((MONTHLY_N / B_TRACK) * 100).toFixed(3)}%` }}
      >
        <div className="tpp-b-track">
          <span className="tpp-b-seg">{money0(CREDIT)}</span>
          <span className="tpp-b-seg">{money0(CREDIT)}</span>
        </div>
        <span className="tpp-b-mark" aria-hidden="true">
          <b>{monthly} a month</b>
          <i />
        </span>
      </div>
      <p className="tpp-b-big">Two credits cover it.</p>
    </section>
  );
}

/* ── C · Parents' voices by the first button ───────────────────────────────
   Three parents' own words under the promise: between it and the gift band
   on a phone, in the held right column on a computer. Renders nothing until
   model/voices.ts VOICES has real, permissioned quotes (how to add them is
   there). Local dev with ?parentmock shows the marked placeholder slots
   instead, dashed. The cards meet from either side once, when first in view.
   Polish, 7 Nov 2026 (Sam: "isn't this kind of busy?"): a compact rail. Who
   said it leads, on one line (the photo, the name, "VT parent") with a small
   maroon mark at its end instead of a big one on a line of its own; the short
   quote follows with "Read more" running on after its last word, so a card
   is about two-thirds of its old height. The words are model/voices.ts's,
   untouched: `quote` at first glance, `full` one tap down. */
/* The student page (plus.tapin.app, Sam, 8 Nov 2026) has its own list,
   model/voices.ts STUDENT_VOICES, empty until real students' words are in;
   local dev shows its three marked slots without a flag. `className` places
   the rail (on a computer, three across under the places). */
export function Voices({ audience = "parent", className }: { audience?: Audience; className?: string } = {}) {
  const student = audience === "student";
  const own = student ? STUDENT_VOICES : VOICES;
  const real = own.length > 0;
  const list = real ? own : student ? PREVIEW_STUDENT_VOICES : parentMock() ? PREVIEW_VOICES : [];
  const [box, seen] = useSeen<HTMLUListElement>(0.5);
  const runs = useRef<Array<Animation | undefined>>([]);
  /* One card's whole quote at a time (Sam: little text at first touch). */
  const [open, setOpen] = useState<number | null>(null);
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
    <ul
      ref={box}
      className={className ? `tpp-v ${className}` : "tpp-v"}
      aria-label={student ? "From students" : "From parents"}
      data-placeholder={real ? undefined : ""}
    >
      {list.map((v, i) => (
        <li key={`${v.role}-${i}`}>
          <figure className="tpp-v-q" data-who={v.role === "Parent" ? "parent" : "student"}>
            <figcaption className="tpp-v-by">
              {v.photo ? (
                <img className="tpp-v-face" src={asset(v.photo)} alt="" width={28} height={28} decoding="async" loading="lazy" />
              ) : real ? null : (
                <span className="tpp-v-face" aria-hidden="true" />
              )}
              <span className="tpp-v-name">{v.name}</span>
              <small>{v.label ?? v.role}</small>
              <span className="tpp-v-mark" aria-hidden="true">
                “
              </span>
            </figcaption>
            <div className="tpp-v-body">
              <blockquote id={`tpp-v-${i}`} className="tpp-v-quote">
                {open === i && v.full ? v.full : v.quote}
              </blockquote>
              {v.full ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="tpp-v-more"
                    aria-expanded={open === i}
                    aria-controls={`tpp-v-${i}`}
                    onClick={() => setOpen(open === i ? null : i)}
                  >
                    {open === i ? "Less" : "Read more"}
                  </button>
                </>
              ) : null}
            </div>
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
   the page's own text, and a turning line isn't read aloud.
   7 Nov 2026: it used to fade the old line right out (200ms) and only then
   bring the new one in, so for a beat at every turn the strip under the
   card's divider stood empty. Now it rolls: the old line rises out as the
   new one rises in under it, together, so a line is always there. */
type ProofKey = "students" | "refund" | "places";
const TURN_MS = 3200;
const ROLL_MS = 520;
/* The student page (plus.tapin.app, Sam, 8 Nov 2026) turns through the
   same three, in its own words: the members line as its band says it, and
   its own promise (a refund asked for and auto-approved), asked the way its
   What if I don't save? asks it. "Saved less than you paid? Refund
   auto-approved." was 351px, wider than the dock on a 390 phone. */
export function ProofTurn({
  className,
  start,
  paused,
  audience = "parent",
  noPlaces = false,
  lead = [],
}: {
  className: string;
  start: ProofKey | string;
  paused: boolean;
  audience?: Audience;
  /** A place's own page: not the five spots. */
  noPlaces?: boolean;
  /** Lines that go first, before the usual three (the student dock's
   *  deadline and spots, 10 Nov 2026). */
  lead?: ReadonlyArray<{ key: string; body: ReactNode }>;
}) {
  const student = audience === "student";
  const allLines: Array<{ key: string; body: ReactNode }> = [
    ...lead,
    {
      key: "students",
      body: (
        <>
          <span className="tpp-pt-dot" aria-hidden="true" />
          Over 500 Virginia Tech students on Plus
        </>
      ),
    },
    {
      key: "refund",
      body: (
        <>
          <Glyph d={GLYPHS.refund} className="tpp-pt-ico" />
          {student ? "Didn\u2019t save? Refund auto-approved." : "Didn\u2019t save what you spent? Full refund."}
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
          {/* Sam, 8 Nov 2026: "we should mention as well that more are on
              the way". Short enough for the dock at 360. */}
          Five spots, more on the way
        </>
      ),
    },
  ];
  const lines = noPlaces ? allLines.filter((l) => l.key !== "places") : allLines;
  const [k, setK] = useState(() => Math.max(0, lines.findIndex((l) => l.key === start)));
  /* The line on its way out, drawn over the new one while they roll. */
  const [leaving, setLeaving] = useState<number | null>(null);
  const kNow = useRef(k);
  kNow.current = k;
  const box = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const old = useRef<HTMLSpanElement>(null);
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
  const turning = !paused && onScreen && pageOn && !reducedMotion();
  useEffect(() => {
    if (!turning) return;
    const id = window.setInterval(() => {
      const was = kNow.current;
      setLeaving(was);
      setK((was + 1) % lines.length);
    }, TURN_MS);
    return () => window.clearInterval(id);
  }, [turning, lines.length]);
  /* Both lines move in the same frame, before the new one is painted. */
  const drawn = useRef(k);
  const runs = useRef<Array<Animation | undefined>>([]);
  useLayoutEffect(() => {
    if (drawn.current === k) return;
    drawn.current = k;
    runs.current.forEach((r) => r?.cancel());
    const opts = { duration: ROLL_MS, easing: EASE_IN_OUT };
    const into = line.current?.animate?.([{ transform: "translateY(100%)", opacity: 0 }, { transform: "none", opacity: 1 }], opts);
    const away = old.current?.animate?.([{ transform: "none", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0 }], {
      ...opts,
      fill: "forwards",
    });
    runs.current = [into, away];
    if (away) away.onfinish = () => setLeaving(null);
    else setLeaving(null);
  }, [k]);
  useEffect(() => () => runs.current.forEach((r) => r?.cancel()), []);
  return (
    <div ref={box} className={`tpp-pt ${className}`} aria-hidden="true">
      <span ref={line} className="tpp-pt-line">
        {lines[k % lines.length]?.body}
      </span>
      {leaving !== null && leaving !== k ? (
        <span ref={old} className="tpp-pt-line">
          {lines[leaving % lines.length]?.body}
        </span>
      ) : null}
    </div>
  );
}
