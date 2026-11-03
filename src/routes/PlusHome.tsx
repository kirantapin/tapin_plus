import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import { logoField, venues } from "../model/content";
import { itemsFor } from "../model/menu";
import { POINTS_PER_DOLLAR } from "../model/order";
import { tapinHref } from "../model/closed";
import HowSheet from "../shell/HowSheet";
import TrialModal from "../shell/TrialModal";
import { WelcomeBar, WelcomeChip, WelcomeEnds } from "../shell/WelcomeOffer";
import { useTrialLink } from "../shell/useTrialLink";

/* ══ THE HOME PAGE, IN THE APP'S OWN LOOK (Sam, 3 Nov 2026) ═════════════════
   "I think the design would be a lot more like the app. We don't want a ton
   of colors like we have on this page. And we should use the same tapin plus
   icon that we use and the magazine style imagery."

   So: the app's light ground (#F0F0F0), white modules with a hairline, ink
   type in Gilroy, black actions. Colour lives in two things only, the way it
   does in the app: the Burruss Hall collage band (Account's header art,
   src/assets/towns/blacksburg.webp in the app) and the paper Plus mark from
   the join moment (exported from the app's plus_join_collage.ts, not
   redrawn). Values from ~/tapin-plus-tools/app-ref/APP-LOOK.md.

   The order is the one that sold 46 memberships here between 16 Sep and 26
   Oct: the offer and Join first, an order earning its $5, the places, what
   you get, the questions, Join again. Join goes to www.tapin.app's Plus
   sign-up with the ad's tags (tapinHref). Every figure is the app's. */

const FIRST_MONTH = "$3.99";
const MONTHLY = "$7.99";
const CREDIT = 5;
const MIN_ORDER = 10;
const PERCENT = 15;

/** The five places Plus covers in the app (PLUS_STANDING_LIST), coffee and
 *  dessert first (2 Nov ad rule: never lead with The Burg or The Milk Parlor). */
const ORDER = ["coffeeholicsva", "sweetopia", "olaika", "themilkparlor", "theburg"] as const;
const PLACES = ORDER.map((id) => venues.find((v) => v.id === id)).filter(
  (v): v is (typeof venues)[number] => v !== undefined,
);
type Place = (typeof PLACES)[number];

/** What each place is, for the cards. The record calls the two bars "Drinks",
 *  which beside "$5 back" reads as earning it on bar drinks; the $5 is earned
 *  on food and non-alcoholic drinks (3 Nov 2026). */
const KIND: Record<string, string> = {
  sweetopia: "Dessert",
  themilkparlor: "Bar & kitchen",
  theburg: "Bar & kitchen",
};

const itemAt = (venueId: string, name: string) => itemsFor(venueId).find((i) => i.name === name);

/** The Burg's own hero is two people holding bottles; a dish of theirs
 *  stands in, as it does in the app (no alcohol in the imagery). */
const photoFor = (v: Place) => (v.id === "theburg" ? itemAt("theburg", "Ceviche — Peru")?.img ?? v.hero : v.hero);

/* ══ ORDERS THAT EARN IT, ONE AT EACH PLACE ═════════════════════════════════
   Real items at their menu prices, each at or over $10, all food (the $5 is
   earned on food and non-alcoholic drinks). Sweetopia sells nothing over $10
   alone, so its order is two of its rolled ice creams ("Coffee" there is a
   flavour, not a cup of coffee). One per place, in the page's place order,
   so the five logos can be the carousel's own indicators (Sam, 3 Nov 2026:
   "show the logos of each place as carousel indicators with a time
   countdown. When I click on each I can see the example for that location"). */
interface Example { venue: Place; label: string; price: number; img: string }
const ORDERS: Record<string, readonly string[]> = {
  coffeeholicsva: ["California Club"],
  sweetopia: ["Brookie", "Cookies & Cream"],
  olaika: ["Classic Pepperoni"],
  themilkparlor: ["Munchie Sampler"],
  theburg: ["Ceviche — Peru"],
};
const EXAMPLES: Example[] = PLACES.map((venue): Example | null => {
  const names = ORDERS[venue.id];
  if (!names) return null;
  const items = names.map((n) => itemAt(venue.id, n));
  if (items.some((i) => !i)) return null;
  const price = items.reduce((s, i) => s + (i?.price ?? 0), 0);
  if (price < MIN_ORDER) return null;
  return { venue, label: names.join(" + "), price, img: items[0]?.img ?? venue.hero };
}).filter((e): e is Example => e !== null);

/** Ink that reads on a place's brand colour (WCAG relative luminance). White
 *  wherever it holds about 2:1, as the app's sheets do (Sam, 3 Nov 2026:
 *  "should be white text on merchant color"); ink only on a pale colour. */
function inkOn(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const l = 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
  return l > 0.42 ? "#141618" : "#FFFFFF";
}

const money = (n: number) => `$${n.toFixed(2)}`;
const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The flat four-piece mark, for small places on photographs (the app's
 *  TapInGlyph, white on the glass). The paper mark is for the big moments. */
function FlatMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-0.4790 -1.7502 11.9749 11.9749" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M5.96461 0H8.01572L7.42303 1.69488H5.37196L4.77927 3.38981H2.7282L3.32085 1.69488L3.32891 1.6719L3.32938 1.67159C3.66805 0.746268 4.84127 0 5.96461 0Z" />
      <path fill="currentColor" d="M10.9325 3.38981L10.3398 5.08473H8.28874L8.88144 3.38981H6.83033L7.42303 1.69488H9.50194L9.50217 1.69519C10.6176 1.70766 11.2571 2.46151 10.9325 3.38981Z" />
      <path fill="currentColor" d="M5.05231 8.47458H3.0012L3.5939 6.77966H5.64496L6.23766 5.08477H8.28872L7.69607 6.77966L7.68801 6.80268L7.68755 6.80299C7.34889 7.72827 6.17567 8.47458 5.05231 8.47458Z" />
      <path fill="currentColor" d="M0.0844383 5.08473L0.677134 3.38981H2.7282L2.1355 5.08473H4.18661L3.59392 6.77961H1.51501L1.51478 6.77935C0.399363 6.76688 -0.240155 6.01303 0.0844603 5.08473Z" />
    </svg>
  );
}

const PAPER_MARK = asset("/brand/plus-paper-mark.svg");
const COLLAGE = asset("/collage/blacksburg.webp");

/** Each place's order holds this long; a ring round its logo counts it down. */
const HOLD_MS = 4500;
const RING = 2 * Math.PI * 22;

const Play = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="tpa-play">
    <path d="M8 5.6v12.8c0 .8.9 1.3 1.6.8l9.4-6.4c.6-.4.6-1.3 0-1.7L9.6 4.8C8.9 4.3 8 4.8 8 5.6Z" fill="currentColor" />
  </svg>
);

/* ══ THE PLACES AS TABS ON THE ORDER (Sam, 3 Nov 2026, from three versions:
   "let's try this one") ═════════════════════════════════════════════════════
   The five logos are tabs on the order card, at full colour. The playing tab
   wears the place's colour and runs into the card's band, and a ring round
   its logo counts its order down (Sam, 3 Nov 2026: a line on the tab's top
   edge read as a notch). */
/* THREE VARIATIONS ON THE TABS (Sam, 3 Nov 2026: "3 /impeccable redesign
   variations of this section"). Preview with ?hiw=1|2|3; without it the card
   is the Tabs version as picked.
   1 · Plate: the dish leads. The place's colour panel holds a big photo of
     the order, the way the app's item sheet opens on its picture.
   2 · Colour: Plate's photo, and the whole order card wears the place's
     colour, tab to total (Sam, 3 Nov 2026: "not the whole card, i meant
     like the child container").
   3 · Price tag: quiet grey tab and card, no band; what you pay is the
     big number, the menu price struck beside it, the $5 and the next $5 as
     two chips. */
/* Grey (Sam, 3 Nov 2026: "i changed my mind about the color here, maybe
   it's just the same gray background that the 'step through it' button
   has"): Colour's layout, tab to total, in the button's grey with ink. The
   default; the coloured version stays at ?hiw=2. */
type OrderLook = "tabs" | "plate" | "colour" | "tag" | "grey";
const orderLook = (): OrderLook => {
  if (typeof window === "undefined") return "grey";
  const v = new URLSearchParams(window.location.search).get("hiw");
  return v === "0" ? "tabs" : v === "1" ? "plate" : v === "2" ? "colour" : v === "3" ? "tag" : "grey";
};

function OrderCard({ start = 0, look = "tabs" }: { start?: number; look?: OrderLook }) {
  const card = useRef<HTMLDivElement | null>(null);
  const rings = useRef<Array<SVGCircleElement | null>>([]);
  const [inView, setInView] = useState(false);
  const [which, setWhich] = useState(start);
  const [paused, setPaused] = useState(false);
  const still = reducedMotion();
  useEffect(() => {
    const el = card.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  /* The playing tab's ring fills over HOLD_MS, and its end moves the card
     on: one clock for what you see and what happens. A pointer or focus on
     the card holds it (the ring stops where it is); tapping a tab shows that
     place and starts its ring from empty. Reduced motion: a full ring, no
     advance, the tabs still switch. */
  useEffect(() => {
    const ring = rings.current[which];
    if (!ring || still || EXAMPLES.length < 2 || typeof ring.animate !== "function") return;
    const run = ring.animate([{ strokeDashoffset: RING }, { strokeDashoffset: 0 }], { duration: HOLD_MS, easing: "linear", fill: "forwards" });
    if (!inView || paused) run.pause();
    run.onfinish = () => setWhich((n) => (n + 1) % EXAMPLES.length);
    return () => {
      run.onfinish = null;
      run.cancel();
    };
  }, [which, inView, paused, still]);
  /* THE ORIGINAL PAGE'S BEAT (Sam, 3 Nov 2026: "I like the old way the
     numbers animated here on the original plus.tapin.app page"), its timings
     from how.css: the order lands; at 500ms the credit row comes in; at
     820ms the total swaps, the menu price lifting out as what you pay rises
     in; at 1250ms the new $5 and the points arrive. The credit spent here is
     one you already have, and this order earns the next one, so every row
     is true. Reduced motion: the finished card, no movement. */
  useEffect(() => {
    const body = card.current;
    if (!body || still) return;
    const ease = "cubic-bezier(.22,1,.36,1)";
    const q = (sel: string) => body.querySelector<HTMLElement>(sel);
    q(".tpa-order-in")?.animate?.([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: ease });
    q(".tpa-order-off")?.animate?.([{ opacity: 0, transform: "translateX(-10px)" }, { opacity: 1, transform: "none" }], { duration: 340, delay: 500, easing: ease, fill: "backwards" });
    q(".tpa-swap .was")?.animate?.([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-7px)" }], { duration: 300, delay: 820, easing: ease, fill: "both" });
    q(".tpa-swap .now")?.animate?.([{ opacity: 0, transform: "translateY(9px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: 820, easing: ease, fill: "both" });
    q(".tpa-order-earn")?.animate?.([{ opacity: 0, transform: "translateX(-10px)" }, { opacity: 1, transform: "none" }], { duration: 340, delay: 1250, easing: ease, fill: "backwards" });
  }, [which, still]);
  const ex = EXAMPLES[which] ?? EXAMPLES[0];
  if (!ex) return null;
  const points = Math.floor((Math.round(ex.price * 100) * POINTS_PER_DOLLAR) / 100);
  return (
    <div
      ref={card}
      className="tpa-carousel"
      data-look={look === "grey" ? "colour" : look}
      data-grey={look === "grey" ? "" : undefined}
      role="group"
      aria-label="Example orders"
      style={
        look === "grey"
          ? { ["--brand" as string]: "var(--well)", ["--brand-ink" as string]: "var(--ink)" }
          : { ["--brand" as string]: ex.venue.brandColor, ["--brand-ink" as string]: inkOn(ex.venue.brandColor) }
      }
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* The places first, then their order (Sam, 3 Nov 2026: "these should
          show up above the carousel"). */}
      {EXAMPLES.length > 1 ? (
        <div
          className="tpa-tabs"
          style={{ ["--i" as string]: which, ["--n" as string]: EXAMPLES.length }}
        >
          {/* One tab plate that slides to the playing place, rather than each
              tab lighting up in place (Sam, 3 Nov 2026: "the tab selector
              should slide"). */}
          <span className="tpa-tab-plate" aria-hidden="true" />
          {EXAMPLES.map((e, i) => (
            <button
              key={e.venue.id}
              type="button"
              aria-label={`Show an order at ${e.venue.name}`}
              aria-pressed={i === which}
              data-on={i === which ? "" : undefined}
              onClick={() => setWhich(i)}
            >
              <svg className="tpa-tab-ring" viewBox="0 0 48 48" aria-hidden="true">
                <circle className="tpa-tab-ring-track" cx="24" cy="24" r="22" />
                <circle
                  ref={(n) => {
                    rings.current[i] = n;
                  }}
                  className="tpa-tab-ring-run"
                  cx="24"
                  cy="24"
                  r="22"
                  strokeDasharray={RING}
                  strokeDashoffset={i === which && still ? 0 : RING}
                />
              </svg>
              <span className="collar tpa-tab-logo" data-field={logoField(e.venue.id)}>
                <img src={e.venue.logo} alt="" decoding="async" />
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <div
        className="tpa-order"
        data-edge={which === 0 ? "first" : which === EXAMPLES.length - 1 ? "last" : undefined}
      >
        {look === "tag" ? null : (
          /* The name only: the tab above already shows the logo (Sam, 3 Nov
             2026: "showing the logos twice is a bit unnecessary"). */
          <p className="tpa-order-band">
            <b>{ex.venue.name}</b>
          </p>
        )}
        {look === "plate" || look === "colour" || look === "grey" ? (
          <div className="tpa-order-plate" key={`plate-${which}`}>
            <img src={ex.img} alt="" decoding="async" />
          </div>
        ) : null}
        {look === "tag" ? (
          <div className="tpa-order-in tpa-ptag" key={which}>
            <p className="tpa-ptag-item">
              <img src={ex.img} alt="" decoding="async" />
              <span>
                <b>{ex.label}</b>
                <span>{ex.venue.name}</span>
              </span>
            </p>
            <p className="tpa-ptag-pay">
              <span className="tpa-swap">
                <b className="was tnum">{money(ex.price)}</b>
                <b className="now tnum">{money(ex.price - CREDIT)}</b>
              </span>
              <s className="tpa-order-off tnum" aria-label={`instead of ${money(ex.price)}`}>
                {money(ex.price)}
              </s>
            </p>
            <p className="tpa-order-earn tpa-ptag-chips">
              <span className="tpa-ptag-chip tpa-ptag-off">&minus;${CREDIT} credit</span>
              <span className="tpa-ptag-chip">+${CREDIT} back for next week</span>
              <span className="tpa-ptag-pts">+{points} points</span>
            </p>
          </div>
        ) : (
          <div className="tpa-order-in" key={which}>
            <p className="tpa-order-item">
              {look === "plate" || look === "colour" || look === "grey" ? null : (
                <img src={ex.img} alt="" decoding="async" />
              )}
              <span>{ex.label}</span>
              <b className="tnum">{money(ex.price)}</b>
            </p>
            <p className="tpa-order-off">
              <span>Your ${CREDIT} credit</span>
              <b className="tnum">&minus;{money(CREDIT)}</b>
            </p>
            <p className="tpa-order-total">
              <span>You pay</span>
              <span className="tpa-swap">
                <b className="was tnum">{money(ex.price)}</b>
                <b className="now tnum">{money(ex.price - CREDIT)}</b>
              </span>
            </p>
            <p className="tpa-order-earn">
              <b>+${CREDIT} back for next week</b> · +{points} points
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "What if I barely go out?",
    a: "Ask for a refund. Every month counts on its own: if Plus saved you less than you paid that month, your refund is auto-approved.",
  },
  {
    q: "How often can I use it?",
    a: `$${CREDIT} back at each of the ${PLACES.length} places on an order of $${MIN_ORDER} or more. Once you’ve used it at a place, it’s ready there again 7 days later. Or take ${PERCENT}% off your order instead, once a day.`,
  },
  {
    q: "What does it work on?",
    a: `The $${CREDIT} back is earned on food and non-alcoholic drinks. Your credit and the ${PERCENT}% go toward anything but alcohol.`,
  },
  {
    q: "Will my price go up?",
    a: `No. Your ${MONTHLY} a month is locked in for as long as you’re a member. The price goes up for new members as more places join.`,
  },
  { q: "Can I cancel?", a: "Anytime." },
];

const LEGAL = [
  { label: "Terms", href: "https://go.tapin.app/terms-and-conditions" },
  { label: "Privacy", href: "https://go.tapin.app/privacy-policy" },
  { label: "Cookies", href: "https://go.tapin.app/cookie-policy" },
];

const Chevron = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ══ ONE PLACE'S PAGE (Sam, 3 Nov 2026: "redirect + rebuild") ════════════════
   /coffeeholics is the same page about one place: its own photograph in the
   band, its name in the headline, its order first in the carousel, and the
   try-it-once window (which already leads with Coffeeholics). Everything
   else, the offer, the promise, the places and Join, is the home page's. */
export default function PlusHome({ placeId, bandSrc }: { placeId?: string; bandSrc?: string }) {
  const place = placeId ? PLACES.find((p) => p.id === placeId) : undefined;
  const startAt = place ? Math.max(0, EXAMPLES.findIndex((e) => e.venue.id === place.id)) : 0;
  const { track } = useEventTracking();
  /* /how lands here with ?how and the walkthrough open. */
  const [how, setHow] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("how"));
  /* "Try it once for free" (Sam, 3 Nov 2026: "we should have the Try it once
     for free option"). The ads' /try links land here with the window open. */
  const [trial, setTrial] = useTrialLink();
  const [look] = useState(orderLook);
  const joinCta = (where: string, white = false) => (
    <a className={`tpa-cta${white ? " tpa-cta-white" : ""}`} href={tapinHref()} onClick={go(where)}>
      Join Tapin Plus
    </a>
  );
  const tryCta = (
    <button
      type="button"
      className="tpa-try"
      onClick={() => {
        setTrial(true);
        track("plus_try_opened", { where: "offer" });
      }}
    >
      Try it once for free
    </button>
  );
  const openHow = () => {
    setHow(true);
    track("plus_how_opened", { where: "how" });
  };

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = "tpa";
    return () => {
      delete root.dataset.surface;
    };
  }, []);

  /* Read at click time so the ad's tags on this visit go with it. */
  const go = (where: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    const href = tapinHref();
    e.currentTarget.href = href;
    track("plus_join_clicked", { where, destination: href.split("?")[0] });
  };

  return (
    <div className="tpa">
      {/* The welcome offer's clock (Sam, 3 Nov 2026: "do the welcome offer
          countdown, ends at end of month"), pinned so it stays on screen. */}
      <WelcomeBar price={FIRST_MONTH} />
      <header className="tpa-band">
        <img className="tpa-band-art" src={bandSrc ?? COLLAGE} alt="" decoding="async" />
        <div className="tpa-band-top">
          <span className="tpa-glass tpa-badge">
            <FlatMark className="tpa-badge-mark" />
            {/* The app's pill (Sam, 3 Nov 2026: "plus blacksburg"). */}
            Plus Blacksburg
          </span>
          <Link className="tpa-glass tpa-signin" to="/in">
            Members
          </Link>
        </div>
        <div className="tpa-band-title">
          {/* Sam, 3 Nov 2026: "header copy should be something like '$5 back
              at every place you already go in blacksburg'". */}
          <h1>
            {place
              ? `$${CREDIT} back every week at ${place.name}`
              : `$${CREDIT} back at every place you already go in Blacksburg`}
          </h1>
        </div>
      </header>

      <main className="tpa-sheet">
        {/* The order earning its $5 comes first, right under the band (Sam,
            3 Nov 2026: "I feel like this interactive animation should show
            up at the top"); the offer and Join follow, and the dock keeps
            Join on screen the whole way down. */}
        <section className="tpa-module" aria-labelledby="tpa-how">
          <h2 id="tpa-how" className="tpa-h2">
            How it works
          </h2>
          <OrderCard start={startAt} look={look} />
          <button type="button" className="tpa-step-wide" onClick={openHow}>
            <Play />
            Step through it
          </button>
        </section>

        {/* THE OFFER, SIMPLE (Sam, 3 Nov 2026: "there's far too much text
            here. Make it way simpler, and if you have to nest that's fine"):
            the price, the clock, Join and Try. Where it works is the tabs
            above; the price lock folds away under one line. */}
        <section className="tpa-module tpa-offer" aria-label="Tapin Plus">
          <img className="tpa-offer-mark" src={PAPER_MARK} alt="" width="76" height="60" decoding="async" />
          <p className="tpa-offer-price">
            <b className="tnum">{FIRST_MONTH}</b>
            <span>your first month</span>
          </p>
          <p className="tpa-offer-then">Then {MONTHLY}/month</p>
          {/* The payback, in one order (Sam, 3 Nov 2026, from "your first $10
              order covers the month"). The $5 is credit toward the next order,
              so it "earns $5 back" rather than paying for anything, and it is
              said of the first month only: at $7.99 it takes two orders. */}
          <p className="tpa-payback">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="currentColor" />
              <path d="m7.6 12.3 3 3 5.8-6.1" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>
              Your first ${MIN_ORDER} order earns ${CREDIT} back. That’s more than your first month.
            </span>
          </p>
          <WelcomeChip />
          {joinCta("hero")}
          {tryCta}
          <details className="tpa-more">
            <summary>
              Your {MONTHLY} is locked in
              <Chevron />
            </summary>
            <p>The price goes up for new members as more places join. Yours never does while you’re a member.</p>
          </details>
        </section>

        {/* THE PLUS PROMISE (Sam, 3 Nov 2026: "we probably also want to show
            the plus promise guarantee - every month is refundable"). The
            app's own line (plus_facts.ts PLUS_PROMISE), and the month-by-month
            check the presale terms carried. A refund is asked for and
            auto-approved, never automatic. */}
        <section className="tpa-module tpa-promise" aria-labelledby="tpa-promise">
          <span className="tpa-well tpa-promise-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="m8.8 12.2 2.2 2.2 4.4-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <details className="tpa-more tpa-promise-more-d">
            <summary>
              <span>
                <b id="tpa-promise" className="tpa-promise-h">
                  The Plus Promise
                </b>
                <span className="tpa-promise-line">Save what you spend, or your money back.</span>
              </span>
              <Chevron />
            </summary>
            <p>
              Every month counts on its own. If Plus saved you less than you paid that month, ask for a refund and it’s
              auto-approved.
            </p>
          </details>
        </section>

        <section className="tpa-places" aria-labelledby="tpa-every">
          <h2 id="tpa-every" className="tpa-h2 tpa-h2-out">
            Every Plus place
          </h2>
          <ul className="tpa-rail">
            {PLACES.map((v) => (
              <li key={v.id} className="tpa-place">
                <img className="tpa-place-photo" src={photoFor(v)} alt="" decoding="async" loading="lazy" />
                <span className="tpa-glass tpa-tag">
                  <FlatMark className="tpa-tag-mark" />
                  Plus
                </span>
                <span className="tpa-place-name">
                  <b>{v.name}</b>
                  <small>{KIND[v.id] ?? v.category}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="tpa-module" aria-labelledby="tpa-get">
          <h2 id="tpa-get" className="tpa-h2">
            What you get
          </h2>
          <ul className="tpa-rows">
            <li>
              <span className="tpa-well tnum">$5</span>
              <span>
                <b>${CREDIT} back every week at each place</b>
                <span>On orders of ${MIN_ORDER} or more of food or non-alcoholic drinks.</span>
              </span>
            </li>
            <li>
              <span className="tpa-well tnum">%</span>
              <span>
                <b>Or {PERCENT}% off, once a day</b>
                <span>On anything but alcohol. One per order.</span>
              </span>
            </li>
            {/* Sam, 3 Nov 2026: "should we have 'points on everything'". The
                app's rule (credit-alcohol, 3 Nov): the $5 is earned on food
                and non-alcoholic drinks, points on every order. */}
            <li>
              <span className="tpa-well" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.5l-5.1 2.7 1-5.6-4.1-4 5.7-.8L12 3.6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                <b>Points on everything</b>
                <span>{POINTS_PER_DOLLAR} points for every dollar, on every order, toward rewards.</span>
              </span>
            </li>
            <li>
              <span className="tpa-well">
                <FlatMark className="tpa-well-mark" />
              </span>
              <span>
                <b>New places, no extra cost</b>
                <span>Every place that joins Plus is yours too.</span>
              </span>
            </li>
          </ul>
        </section>

        <section className="tpa-module" aria-labelledby="tpa-faq">
          <h2 id="tpa-faq" className="tpa-h2">
            Questions
          </h2>
          {FAQ.map((f) => (
            <details key={f.q} className="tpa-qa">
              <summary>
                <span>{f.q}</span>
                <Chevron />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section className="tpa-close" aria-label="Join Tapin Plus">
          <img className="tpa-close-paper" src={PAPER_MARK} alt="" width="96" height="76" decoding="async" loading="lazy" />
          <h2 className="tpa-close-h">{FIRST_MONTH} your first month</h2>
          <p className="tpa-close-line">Then {MONTHLY}/month, locked in for as long as you’re a member.</p>
          <WelcomeEnds className="tpa-close-ends" />
          <a className="tpa-cta tpa-cta-white" href={tapinHref()} onClick={go("close")}>
            Join Tapin Plus
          </a>
        </section>

        <footer className="tpa-foot">
          <p>
            $5 back is credit, once a week at each place, earned on food and non-alcoholic drinks. Or 15% off once a day.
            15% off or $5 credit, one per order; credit you’ve earned works with the 15%. Credit and 15% off don’t go toward
            alcohol. Cancel anytime.
          </p>
          <p className="tpa-links">
            {LEGAL.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            ))}
            <a href="mailto:support@tapin.app">support@tapin.app</a>
          </p>
        </footer>
      </main>

      {trial ? <TrialModal lit onClose={() => setTrial(false)} /> : null}
      {how ? <HowSheet onClose={() => setHow(false)} joinHref={tapinHref()} onJoin={go("how_sheet")} /> : null}

      {/* The docked Join is always on screen (Sam, 3 Nov 2026: "the sticky
          CTA should always show"). */}
      {/* One full-width button, nothing to read first (Sam, 3 Nov 2026:
          "we should have a full width button here - college students have an
          impossibly short attention span"). */}
      <div className="tpa-dock" data-shown="">
        <a className="tpa-cta tpa-dock-cta" href={tapinHref()} onClick={go("dock")}>
          <span>Join Tapin Plus</span>
          <span className="tpa-dock-price tnum">{FIRST_MONTH} first month</span>
        </a>
      </div>
    </div>
  );
}
