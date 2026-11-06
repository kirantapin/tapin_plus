import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import { BAR_IDS, covers, logoField, venueCovers, venues } from "../model/content";
import { itemsFor } from "../model/menu";
import { POINTS_PER_DOLLAR } from "../model/order";
import { monthlyBack } from "../model/savings";
import { MEMBERS_LINE } from "../model/proof";
import { PLUS_NEXT_PRICE } from "../model/seats";
import { PlusSeats } from "../shell/PlusSeats";
import { firstFigure, firstMonthLine, usd, usePlusPriceLoad } from "../model/plus";
import { inviteExpected, inviteFor, type Invite } from "../model/invite";
import InviteHero from "../shell/InviteHero";
import { WW_HEROES, wwHeroProps, wwHeroVariant } from "../model/wwHeroTest";
import HowSheet from "../shell/HowSheet";
import { openPlusCheckout, usePlusCheckoutOpen } from "../shell/PlusCheckout";
import { useDockPulse } from "../shell/dockPulse";
import AccountLine from "../shell/AccountLine";
import MemberDot from "../shell/MemberDot";
import PlacePopup, { type PlacePopupPlace } from "../shell/PlacePopup";
import { ComingTiles } from "../shell/Coming";
import { HERO_LINES, heroVariant } from "../model/heroTest";
import { AppCard, appHref, device } from "../shell/GetTheApp";
import { useAuth } from "../context/auth_context";
import TrialModal from "../shell/TrialModal";
import { InviteClock, LinkBar, WelcomeBar, WelcomeChip, WelcomeEnds } from "../shell/WelcomeOffer";
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
   you get, the questions, Join again. Join opens the checkout here
   (shell/PlusCheckout.tsx), and the prices are the Plus bundle's
   (model/plus.ts). Every figure is the app's. */

const CREDIT = 5;
const MIN_ORDER = 10;
const PERCENT = 15;

/** The five places Plus covers in the app (PLUS_STANDING_LIST), coffee and
 *  dessert first (2 Nov ad rule: never lead with The Burg or The Milk Parlor). */
/* Coffeeholics and The Burg first, wherever the places are listed (Sam,
   4 Nov 2026: "since those are the two biggest"). */
const ORDER = ["coffeeholicsva", "theburg", "themilkparlor", "olaika", "sweetopia"] as const;
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

/** The Burg's own hero is two people holding bottles: in its place, the
 *  same photo with their empanadas and flautas in their hands instead, made
 *  with GPT Image (4 Nov 2026; Sam, 5 Nov: the ceviche "looks really ugly").
 *  No alcohol in the imagery. */
const BURG_PHOTO = asset("/places/theburg-food.webp");
const photoFor = (v: Place) => (v.id === "theburg" ? BURG_PHOTO : v.hero);

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
/* At The Milk Parlor the example is a line skip with the credit on it (Sam,
   4 Nov 2026: "at the milk parlor, maybe we show a line skip in the cart
   discounted with the credit someone has"). $10, confirmed by Sam the same
   day. */
const SKIP: Record<string, { label: string; price: number }> = {
  themilkparlor: { label: "Line skip", price: 10 },
};
const EXAMPLES: Example[] = PLACES.map((venue): Example | null => {
  const names = ORDERS[venue.id];
  if (!names) return null;
  const items = names.map((n) => itemAt(venue.id, n));
  if (items.some((i) => !i)) return null;
  const price = items.reduce((s, i) => s + (i?.price ?? 0), 0);
  if (price < MIN_ORDER) return null;
  const skip = SKIP[venue.id];
  if (skip) return { venue, label: skip.label, price: skip.price, img: venue.hero };
  return { venue, label: names.join(" + "), price, img: items[0]?.img ?? venue.hero };
}).filter((e): e is Example => e !== null);

/** The Sticker's first order: the first place's example, a real dish. */
const FIRST_ORDER = EXAMPLES[0];

/* WHAT YOU SPEND, WHAT COMES BACK, AS ONE SENTENCE (Sam, 3 Nov 2026: "a mad
   lib style, when i select the amount i spend in a month i think it should
   populate in the sentence", and "a month and a month, not a week and a
   month"). Pick a month's spend; it drops into the sentence, and the back a
   month beside it comes from the same order-by-order sum as the
   walkthrough (savings.ts monthlyBack). */
const SPEND_BANDS = [50, 100, 200, 300] as const;

/** A figure that rolls when it changes, like an odometer: the old value
 *  lifts out of a clipped slot as the new one rises in, and the slot eases
 *  to the new width so the words beside it glide rather than jump. Nothing
 *  else in the sentence moves. Reduced motion: the new value, at once. */
function RollFigure({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const slot = useRef<HTMLSpanElement | null>(null);
  const prev = useRef(text);
  useLayoutEffect(() => {
    const el = slot.current;
    const was = prev.current;
    prev.current = text;
    if (!el || was === text || reducedMotion() || typeof el.animate !== "function") return;
    const ease = "cubic-bezier(.22,1,.36,1)";
    const next = el.querySelector<HTMLElement>(".tpa-roll-now");
    const ghost = document.createElement("span");
    ghost.className = "tpa-roll-was";
    ghost.setAttribute("aria-hidden", "true");
    ghost.textContent = was;
    el.appendChild(ghost);
    const to = el.getBoundingClientRect().width;
    const from = ghost.getBoundingClientRect().width;
    el.animate([{ width: `${from}px` }, { width: `${to}px` }], { duration: 360, delay, easing: ease, fill: "backwards" });
    next?.animate([{ transform: "translateY(85%)", opacity: 0 }, { transform: "none", opacity: 1 }], {
      duration: 360,
      delay,
      easing: ease,
      fill: "backwards",
    });
    const out = ghost.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-85%)", opacity: 0 }], {
      duration: 300,
      delay,
      easing: ease,
      fill: "forwards",
    });
    out.onfinish = () => ghost.remove();
    return () => ghost.remove();
  }, [text, delay]);
  return (
    <b ref={slot} className={`tpa-roll tnum ${className ?? ""}`}>
      <span className="tpa-roll-now">{text}</span>
    </b>
  );
}

/** The social-proof line, with a little life (Sam, 3 Nov 2026: "slight
 *  animate for this"): it rises in just after the headline, and its green
 *  dot breathes, a ring easing out from it every couple of seconds, the way
 *  a live indicator does. Reduced motion: still, the dot steady. */
function SocialProof({ text }: { text: string }) {
  const line = useRef<HTMLParagraphElement | null>(null);
  const ring = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (reducedMotion()) return;
    const ease = "cubic-bezier(.22,1,.36,1)";
    line.current?.animate?.([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], {
      duration: 520,
      delay: 260,
      easing: ease,
      fill: "backwards",
    });
    const pulse = ring.current?.animate?.([{ transform: "scale(1)", opacity: 0.55 }, { transform: "scale(2.6)", opacity: 0 }], {
      duration: 1800,
      delay: 900,
      easing: "cubic-bezier(.2,.6,.3,1)",
      iterations: Infinity,
    });
    return () => pulse?.cancel();
  }, []);
  return (
    <p ref={line} className="tpa-proof">
      <span className="tpa-proof-dot" aria-hidden="true">
        <i ref={ring} />
      </span>
      {text}
    </p>
  );
}

function PaybackCounter() {
  const [m, setM] = useState<number>(200);
  const back = monthlyBack(m);
  const top = m === SPEND_BANDS[SPEND_BANDS.length - 1];
  /* Only the two figures move when the spend changes, the words around them
     stay put (Sam, 3 Nov 2026: "only the numbers that change based on my
     selection should actually animate"). They roll (RollFigure), the amount
     back a beat after the spend it comes from. */
  const pick = (k: number) => setM(k);
  return (
    <div className="tpa-s2-calc">
      <div className="tpa-s2-picks" role="radiogroup" aria-label="What you spend a month on food and drinks">
        {SPEND_BANDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={m === k} data-on={m === k ? "" : undefined} onClick={() => pick(k)}>
            <span className="tnum">
              ${k}
              {k === SPEND_BANDS[SPEND_BANDS.length - 1] ? "+" : ""}
            </span>
          </button>
        ))}
      </div>
      {/* Short, with the working folded away (Sam, 3 Nov 2026: "a lot of
          text ... a little accordion ... that would show you what that number
          is coming from"). */}
      <p className="tpa-s2-lib" aria-live="polite">
        <span>
          Spend about <RollFigure className="tpa-s2-blank" text={`$${m}${top ? "+" : ""}`} /> a month at these places, get
          about <RollFigure className="tpa-s2-back" text={`$${back.monthlyUsd}`} delay={90} /> back.
        </span>
      </p>
      <details className="tpa-more tpa-s2-how">
        <summary>
          How we got ${back.monthlyUsd}
          <Chevron />
        </summary>
        <ul className="tpa-s2-rows">
          <li>
            <span>
              {back.ordersPerMonth} {back.ordersPerMonth === 1 ? "order" : "orders"} a month, about ${back.orderUsd} each
            </span>
          </li>
          <li>
            <span>
              ${CREDIT} back on {back.creditOrders === back.ordersPerMonth && back.creditOrders > 1 ? `all ${back.creditOrders}` : back.creditOrders}
            </span>
            <b className="tnum">${back.creditUsdMonth}</b>
          </li>
          {back.percentOrders > 0 ? (
            <li>
              <span>15% off the other {back.percentOrders}</span>
              <b className="tnum">${back.percentUsdMonth}</b>
            </li>
          ) : null}
          {/* Points count in what you get back (Sam, 5 Nov 2026). */}
          {back.pointsMonth > 0 ? (
            <li>
              <span>{back.pointsMonth.toLocaleString("en-US")} points in rewards</span>
              <b className="tnum">${back.pointsUsdMonth}</b>
            </li>
          ) : null}
          <li className="tpa-s2-sum">
            <span>A month, about</span>
            <b className="tnum">${back.monthlyUsd}</b>
          </li>
        </ul>
        <p className="tpa-s2-fine">At Plus places. $5 back and 15% off on food and non-alcoholic drinks, $5 once a week at each place. 10 points for every dollar, about $1 per 100. An estimate.</p>
      </details>
    </div>
  );
}

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

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m8.8 12.2 2.2 2.2 4.4-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
/** How long a tapped place stays put before the cycle carries on (Sam, 3 Nov 2026). */
const TAP_HOLD_MS = 5000;
const RING = 2 * Math.PI * 22;
/** The places' tabs and the next place's. */
const TABS = EXAMPLES.length + 1;

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
/* Counter is the offer (Sam, 3 Nov 2026, picked from the three). Sticker
   and Poster stay previewable at ?offer=1|3, the plain price at ?offer=0. */
type OfferLook = "shipped" | "1" | "2" | "3";
const offerLook = (): OfferLook => {
  if (typeof window === "undefined") return "2";
  const v = new URLSearchParams(window.location.search).get("offer");
  return v === "0" ? "shipped" : v === "1" || v === "3" ? v : "2";
};
type OrderLook = "tabs" | "plate" | "colour" | "tag" | "grey";
const orderLook = (): OrderLook => {
  if (typeof window === "undefined") return "grey";
  const v = new URLSearchParams(window.location.search).get("hiw");
  return v === "0" ? "tabs" : v === "1" ? "plate" : v === "2" ? "colour" : v === "3" ? "tag" : "grey";
};
/* THE PLACE TABS, THREE VERSIONS (Sam, 3 Nov 2026: "now it looks too tight.
   I think we need to revisit the how it works section - specifically the
   tabs"). Preview with ?tabs=a|b|c; without it the tabs are as shipped.
   A · Segmented: the logos sit in one grey track, and the playing one rides
     a white pill that slides, iOS-style; the order card sits apart below.
   B · Open row: no plate at all, the logos spaced out with room to breathe,
     the countdown ring alone marks the playing one; the card sits apart.
   C · Roomy tabs: today's tab joined to the card, at full size again (56px
     tabs, 36px logos), with more air above and below.
   A is the default (Sam, 3 Nov 2026: "I like option A"); the others, and the
   old joined tab (?tabs=0), stay previewable. */
type TabsLook = "shipped" | "a" | "b" | "c";
const tabsLook = (): TabsLook => {
  if (typeof window === "undefined") return "a";
  const v = new URLSearchParams(window.location.search).get("tabs");
  return v === "0" ? "shipped" : v === "b" || v === "c" ? v : "a";
};

function OrderCard({ start = 0, look = "tabs", monthly }: { start?: number; look?: OrderLook; monthly: string }) {
  const card = useRef<HTMLDivElement | null>(null);
  const rings = useRef<Array<SVGCircleElement | null>>([]);
  const [inView, setInView] = useState(false);
  const [which, setWhich] = useState(start);
  /* The cycle never stops on its own: hovering or touching the card does
     nothing to it (Sam, 3 Nov 2026: "the auto cycle shouldn't stop until I
     click on one of these, and then when I click it stops for 5 seconds and
     then resumes if I don't click on it again"). A tap shows that place and
     holds it TAP_HOLD_MS; another tap starts the hold again. */
  const [held, setHeld] = useState(false);
  const [taps, setTaps] = useState(0);
  const pick = (n: number) => {
    setWhich(n);
    setHeld(true);
    setTaps((t) => t + 1);
  };
  useEffect(() => {
    if (!held) return;
    const t = window.setTimeout(() => setHeld(false), TAP_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [held, taps]);
  const still = reducedMotion();
  /* Paused behind the checkout: its ring repainted the page every frame
     under the scrim and made the checkout's close stutter. */
  const covered = usePlusCheckoutOpen();
  useEffect(() => {
    const el = card.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  /* The playing tab's ring fills over HOLD_MS, and its end moves the card
     on: one clock for what you see and what happens. A pointer or focus on
     the card does nothing to it; tapping a tab shows that place, its ring
     empty and still for TAP_HOLD_MS, then filling as usual. Reduced motion: a full ring, no
     advance, the tabs still switch. */
  useEffect(() => {
    const ring = rings.current[which];
    if (!ring || still || EXAMPLES.length < 2 || typeof ring.animate !== "function") return;
    const run = ring.animate([{ strokeDashoffset: RING }, { strokeDashoffset: 0 }], { duration: HOLD_MS, easing: "linear", fill: "forwards" });
    if (!inView || held || covered) run.pause();
    run.onfinish = () => setWhich((n) => (n + 1) % TABS);
    return () => {
      run.onfinish = null;
      run.cancel();
    };
  }, [which, inView, held, still, covered]);
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
    /* The credit drops in from above, onto the order it comes off (Sam,
       3 Nov 2026: "the your credit should animate in downward"). */
    q(".tpa-order-off")?.animate?.([{ opacity: 0, transform: "translateY(-12px)" }, { opacity: 1, transform: "none" }], { duration: 380, delay: 500, easing: ease, fill: "backwards" });
    q(".tpa-swap .was")?.animate?.([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-7px)" }], { duration: 300, delay: 820, easing: ease, fill: "both" });
    q(".tpa-swap .now")?.animate?.([{ opacity: 0, transform: "translateY(9px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: 820, easing: ease, fill: "both" });
    q(".tpa-order-earn")?.animate?.([{ opacity: 0, transform: "translateX(-10px)" }, { opacity: 1, transform: "none" }], { duration: 340, delay: 1250, easing: ease, fill: "backwards" });
  }, [which, still]);
  /* The last tab is the next place to join (Sam, 3 Nov 2026: "a mystery
     logo on the far right to show that as we add new spots the plus member
     rates are locked in"). */
  const mystery = which === EXAMPLES.length;
  const ex = EXAMPLES[mystery ? 0 : which] ?? EXAMPLES[0];
  if (!ex) return null;
  const points = Math.floor((Math.round(ex.price * 100) * POINTS_PER_DOLLAR) / 100);
  return (
    <div
      ref={card}
      className="tpa-carousel"
      data-tabs={tabsLook()}
      data-look={look === "grey" ? "colour" : look}
      data-grey={look === "grey" ? "" : undefined}
      role="group"
      aria-label="Example orders"
      style={
        look === "grey"
          ? { ["--brand" as string]: "var(--well)", ["--brand-ink" as string]: "var(--ink)" }
          : { ["--brand" as string]: ex.venue.brandColor, ["--brand-ink" as string]: inkOn(ex.venue.brandColor) }
      }
    >
      {/* The places first, then their order (Sam, 3 Nov 2026: "these should
          show up above the carousel"). */}
      {EXAMPLES.length > 1 ? (
        <div
          className="tpa-tabs"
          style={{ ["--i" as string]: which, ["--n" as string]: TABS }}
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
              onClick={() => pick(i)}
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
              {/* The name beside the logo, on a computer only (the tabs
                  stand as a list there). */}
              <span className="tpa-tab-name" aria-hidden="true">
                {e.venue.name}
              </span>
            </button>
          ))}
          <button
            type="button"
            aria-label="The next place to join Plus"
            aria-pressed={mystery}
            data-on={mystery ? "" : undefined}
            onClick={() => pick(EXAMPLES.length)}
          >
            <svg className="tpa-tab-ring" viewBox="0 0 48 48" aria-hidden="true">
              <circle className="tpa-tab-ring-track" cx="24" cy="24" r="22" />
              <circle
                ref={(n) => {
                  rings.current[EXAMPLES.length] = n;
                }}
                className="tpa-tab-ring-run"
                cx="24"
                cy="24"
                r="22"
                strokeDasharray={RING}
                strokeDashoffset={mystery && still ? 0 : RING}
              />
            </svg>
            <span className="tpa-tab-logo tpa-mystery" aria-hidden="true">
              ?
            </span>
            <span className="tpa-tab-name" aria-hidden="true">
              More joining
            </span>
          </button>
        </div>
      ) : null}
      <div
        className="tpa-order"
        data-edge={which === 0 ? "first" : which === TABS - 1 ? "last" : undefined}
      >
        {mystery ? (
          <div className="tpa-order-in tpa-next" key="next">
            {/* The kinds of place joining next, and the lock-in (Sam, 4 Nov
                2026). */}
            <p className="tpa-next-h">More places are joining</p>
            <ComingTiles />
            <p className="tpa-next-p">
              Plus costs more for new members as they join. Join now and yours stays {monthly}.
            </p>
          </div>
        ) : null}
        {mystery || look === "tag" ? null : (
          /* The name only: the tab above already shows the logo (Sam, 3 Nov
             2026: "showing the logos twice is a bit unnecessary"). */
          <p className="tpa-order-band">
            <b>{ex.venue.name}</b>
          </p>
        )}
        {/* Grey keeps the dish beside its name, not a strip across the card
            (Sam, 3 Nov 2026: "this image takes up a lot of real estate"). */}
        {!mystery && (look === "plate" || look === "colour") ? (
          <div className="tpa-order-plate" key={`plate-${which}`}>
            <img src={ex.img} alt="" decoding="async" />
          </div>
        ) : null}
        {mystery ? null : look === "tag" ? (
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
              {look === "plate" || look === "colour" ? null : (
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
            {/* The points it earns, last, a beat after the price drops (Sam,
                5 Nov 2026: points "should be included in the carousel"; the
                "+$5 back for next week" half stays out, as clutter, 3 Nov). */}
            <p className="tpa-order-earn tpa-order-pts">
              <span>Points earned</span>
              <b className="tnum">+{points}</b>
            </p>
          </div>
        )}
        {/* What else it works on at this place (Sam, 4 Nov 2026: "a simple
            design showing what else this works on at the currently selected
            location"). One quiet row of words. */}
        {mystery ? null : (
          <p className="tpa-order-also" key={`also-${which}`}>
            {/* "Works on", not "Also here" (Sam, 4 Nov 2026). */}
            <span>Works on</span>
            {covers
              .filter((c) => (venueCovers[ex.venue.id] ?? []).includes(c.id))
              .map((c) => (
                <b key={c.id}>{c.label}</b>
              ))}
          </p>
        )}
        {/* At a bar, say what its drinks get (Sam, 4 Nov 2026: "People
            probably thought they could earn credit from alcohol", then
            "maybe not just the burg right?"). */}
        {BAR_IDS.has(ex.venue.id) ? (
          <p className="tpa-order-note" key={`note-${which}`}>
            At {ex.venue.name}, your $5 and 15% go on anything but alcohol.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* A free month's own questions, first (5 Nov 2026): whether the free month
   charges anything, and who it's for. Said from the checkout's terms. */
const inviteFaq = (invite: Invite, MONTHLY: string): ReadonlyArray<{ q: string; a: string }> => [
  {
    q: "Will I be charged for the free month?",
    a: `No. Your first month is free, so nothing is charged when you join. A month later, Plus renews at ${MONTHLY} a month, unless you cancel in the Tapin app before then.`,
  },
  {
    /* How it was given out, not a limit: the link works for whoever holds
       it (model/link.ts checks the link, not the person). */
    q: "Who gets the free month?",
    a: `It came with the link we sent students from ${invite.who}. Join through this link${invite.ends ? ` by ${invite.endsLabel}` : ""} and your first month is free.`,
  },
];

const faqFor = (MONTHLY: string): ReadonlyArray<{ q: string; a: string }> => [
  /* What customers actually asked, most asked first (Sam, 4 Nov 2026, from
     support: cancelling and refunds 5 of 6; The Burg 2, both of whom later
     cancelled; stacking 1). Cancel is in the app, refunds by email (Sam,
     same day). */
  {
    q: "How do I cancel and get a refund?",
    a: "Cancel anytime in the Tapin app. For a refund, email support@tapin.app. If Plus saved you less than you paid that month, your refund is auto-approved.",
  },
  {
    /* The rule is the same at every bar, not just The Burg (Sam, 4 Nov 2026). */
    q: "Are the bars included? How does credit work there?",
    a: `Yes. At The Burg, The Milk Parlor and Olaika, order on Tapin and show your phone. A $${MIN_ORDER}+ order of food or non-alcoholic drinks earns your $${CREDIT} back, and your credit and the ${PERCENT}% go on anything but alcohol. Everything you order earns points, which you can trade for rewards.`,
  },
  {
    q: "Does credit stack? Can I earn credit on an order where I use it?",
    a: `Yes to both. Credit you haven’t spent adds up, and an order where you use credit still earns new $${CREDIT} back, as long as it’s $${MIN_ORDER} or more.`,
  },
  {
    q: "How often can I use it?",
    a: `$${CREDIT} back at each of the ${PLACES.length} places on an order of $${MIN_ORDER} or more. Once you’ve used it at a place, it’s ready there again 7 days later. Or take ${PERCENT}% off your order instead, once a day.`,
  },
  {
    q: "What does it work on?",
    /* Names what the credit buys besides food (Sam, 4 Nov 2026: "shouldn't
       we update this to include events, cover, lineskips"). Earning stays
       food and non-alcoholic drinks (the 3 Nov rule). */
    a: `Use your credit and the ${PERCENT}% on food, non-alcoholic drinks and event tickets at every Plus place, plus cover and line skips at select places. Not on alcohol. You earn the $${CREDIT} back on food and non-alcoholic drinks.`,
  },
  {
    q: "Will my price go up?",
    /* Places joining is the other reason the price rises, and only for people
       who join later (Sam, 4 Nov 2026: "pays to get in early"). */
    a: `No. Your ${MONTHLY} a month is locked in for as long as you’re a member, even as more places join. For new members it goes up as places join, and to ${PLUS_NEXT_PRICE} once these 100 spots are gone. It pays to get in early.`,
  },
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
  const [placeOpen, setPlaceOpen] = useState<PlacePopupPlace | null>(null);
  /* The hero A/B test (model/heroTest.ts). */
  const [hero] = useState(heroVariant);
  const { price, failed: priceFailed } = usePlusPriceLoad();
  const FIRST_MONTH = firstFigure(price);
  const MONTHLY = usd(price?.monthly);
  /* `from` is the button tapped, which grows into the checkout. */
  /* `from` is the button tapped; `over`, a Join inside another pop-up. */
  const join = (where: string, from?: HTMLElement | null, over = false) => {
    track("plus_join_clicked", { where });
    openPlusCheckout(where, from, { over });
  };
  /* Signed in and already a member (Sam, 3 Nov 2026: "If someone is already
     signed in on this page, and they have the membership, the CTA should be
     to download the app"): every Join becomes Get the app, the offer becomes
     the app card, and the welcome clock goes, as there is nothing to buy. */
  const { subscribed } = useAuth();
  /* ?member previews this on local dev only (stripped from builds). */
  const member = subscribed === true || (import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("member"));
  /* A PROMO LINK'S PAGE (5 Nov 2026). Kiran's ?l=<link id> (model/link.ts)
     prices the first month; a link with an audience also dresses the page
     for it (model/invite.ts): the Welcome Week link's free month wears the
     Welcome Week mark beside the offer. From the address until the price is
     in, so the first paint has it; then only if that link's offer is the one
     that applied, so an ended link shows the ordinary page. */
  /* The guess from the address holds only while the price is loading: if
     it fails, nothing says free (the checkout couldn't give it either). */
  const [guess] = useState(inviteExpected);
  const expected = priceFailed ? null : guess;
  /* Members see their own page, never an offer to join. */
  const invite = member ? null : price ? inviteFor(price) : expected;
  const free = price ? price.first === 0 : !!expected;
  /* Any link's offer, with or without a look: the November 30 clock is the
     welcome offer's, not the link's. */
  const linked = price ? !!price.linkId : !!expected;
  /* View FAQ: a smooth scroll to the questions, landing them a little below
     the countdown bar, and focus there so a keyboard follows. */
  const faqRef = useRef<HTMLElement | null>(null);
  /* The docked Join pulses gently while the checkout is closed (shell/dockPulse.ts). */
  const dockRef = useRef<HTMLDivElement | null>(null);
  const checkoutOpen = usePlusCheckoutOpen();
  useDockPulse(dockRef, !checkoutOpen, member);
  const toFaq = () => {
    const el = faqRef.current;
    if (!el) return;
    track("plus_faq_jump", {});
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  };
  const getApp = (where: string, white = false, extra = "") => (
    <a
      className={`tpa-cta${white ? " tpa-cta-white" : ""}${extra}`}
      href={appHref()}
      target={device() === "desktop" ? "_blank" : undefined}
      rel="noopener noreferrer"
      onClick={() => track("plus_get_app_clicked", { where, device: device() })}
    >
      Get the Tapin app
    </a>
  );
  const joinLabel = invite && free ? "Try Plus for free" : "Join Tapin Plus";
  /* The Welcome Week headline test (model/wwHeroTest.ts): drawn only once
     the invitation applies, so nobody else is put in it, and every event of
     the session carries the variant from then on. */
  const wwHero = invite ? WW_HEROES[wwHeroVariant()] : null;
  const { registerForSession } = useEventTracking();
  useEffect(() => {
    if (invite) registerForSession(wwHeroProps());
  }, [invite, registerForSession]);
  const joinCta = (where: string, white = false) =>
    member ? (
      getApp(where, white)
    ) : (
      <button type="button" className={`tpa-cta${white ? " tpa-cta-white" : ""}`} onClick={(e) => join(where, e.currentTarget)}>
        {joinLabel}
      </button>
    );
  const tryCta = invite ? null : (
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
  const [offer] = useState(offerLook);
  /* THE PLUS PROMISE (Sam, 3 Nov 2026: "we probably also want to show the
     plus promise guarantee - every month is refundable"). The app's own line
     and the month-by-month check the presale terms carried. A refund is asked
     for and auto-approved, never automatic. */
  const promise = (
    <section className="tpa-module tpa-promise" aria-labelledby="tpa-promise">
      <span className="tpa-well tpa-promise-icon" aria-hidden="true">
        <ShieldIcon />
      </span>
      <details className="tpa-more tpa-promise-more-d">
        <summary>
          <span>
            <b id="tpa-promise" className="tpa-promise-h">
              The Plus Promise
            </b>
            <span className="tpa-promise-line">Save more than Plus costs, or get your money back.</span>
          </span>
          <Chevron />
        </summary>
        <p>
          Every month counts on its own. If Plus saved you less than you paid that month, ask for a refund and it’s
          auto-approved.
        </p>
      </details>
    </section>
  );
  /* The same promise as hero A's first card (Sam, 4 Nov 2026: "save more
     than the membership, or your money back automatically - it'd be auto
     approved"). Said as "auto-approved": the refund is asked for, then
     approved without a review, so "automatically" alone would promise
     money nobody asked for. One line and a quieter one; the month-by-month
     rule folds away. */
  const promiseTop = (
    <section className="tpa-module tpa-promise tpa-promise-top" aria-labelledby="tpa-promise-top">
      <span className="tpa-promise-seal" aria-hidden="true">
        <ShieldIcon />
      </span>
      {/* No fold: the two lines are the whole of it, and the column keeps the
          width the chevron took, so the promise sits on two lines. */}
      <p className="tpa-promise-copy">
        <b id="tpa-promise-top" className="tpa-promise-h">
          Save more than the membership, or your money back
        </b>
        <span className="tpa-promise-line">Refunds are auto-approved.</span>
      </p>
    </section>
  );
  const lockMore = (
    <details className="tpa-more">
      <summary>
        Your {MONTHLY} is locked in
        <Chevron />
      </summary>
      <p>
        It goes up for new members as more places join, and to {PLUS_NEXT_PRICE} once these 100 spots are gone. Yours never
        does while you’re a member, so it pays to get in early.
      </p>
    </details>
  );
  /* To Members and back, a fade with a very slight zoom (Sam, 3 Nov 2026:
     "a smooth fade. And like a zoom out / zoom in very subtle"): this page
     eases back a touch as it fades, Members arrives a touch large and
     settles (routes/Members.tsx), and coming back reverses it. The band and
     the sheet move, not the page's root, so the pinned bar and the dock are
     never held inside a transform. */
  const navigate = useNavigate();
  const location = useLocation();
  const bandRef = useRef<HTMLElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const settle = (to: boolean, duration: number, easing: string, onDone?: () => void) => {
    const parts = [bandRef.current, sheetRef.current].filter((n): n is HTMLElement => !!n);
    const frames = [
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: "scale(0.98)" },
    ];
    let left = parts.length;
    parts.forEach((el) => {
      const run = el.animate(to ? frames : [...frames].reverse(), { duration, easing, fill: to ? "forwards" : "none" });
      run.onfinish = () => {
        left -= 1;
        if (left === 0) onDone?.();
      };
    });
  };
  const toMembers = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (reducedMotion() || e.metaKey || e.ctrlKey || typeof bandRef.current?.animate !== "function") return;
    e.preventDefault();
    settle(true, 200, "ease-in", () => navigate("/in"));
  };
  useLayoutEffect(() => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from === "members" && !reducedMotion() && typeof bandRef.current?.animate === "function") {
      settle(false, 340, "cubic-bezier(.22,1,.36,1)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  return (
    <div className="tpa tpa-home">
      {/* The welcome offer's clock (Sam, 3 Nov 2026: "do the welcome offer
          countdown, ends at end of month"), pinned so it stays on screen. */}
      {member ? null : linked ? (
        <LinkBar line={free ? (invite?.ends ? "Free first month offer" : "First month free") : firstMonthLine(price)} invite={invite} ends={price?.linkEnds ?? invite?.ends ?? null} />
      ) : (
        <WelcomeBar price={FIRST_MONTH} />
      )}
      <header
        ref={bandRef}
        className="tpa-band"
        data-hero={place || invite || hero === "0" ? undefined : hero}
        data-invite={invite && !place ? "" : undefined}
      >
        <img className="tpa-band-art" src={bandSrc ?? COLLAGE} alt="" decoding="async" />
        {/* A Welcome Week student is here for the offer: no town badge, no
            Members (Sam, 5 Nov 2026: "not sure if for the welcome week kids it
            makes sense"). Sign in stays in the foot for anyone who needs it. */}
        {invite ? null : (
          <div className="tpa-band-top">
            <span className="tpa-glass tpa-badge">
              <FlatMark className="tpa-badge-mark" />
              {/* The app's pill (Sam, 3 Nov 2026: "plus blacksburg"). */}
              Plus Blacksburg
            </span>
            <Link className="tpa-glass tpa-signin" to="/in" onClick={toMembers}>
              Members
            </Link>
          </div>
        )}
        <div className={`tpa-band-title${invite && !place ? " tpa-ww" : ""}`}>
          {/* Sam, 3 Nov 2026: "header copy should be something like '$5 back
              at every place you already go in blacksburg'". */}
          <div>
            {/* The hero test (model/heroTest.ts): "0" is the hero as it was;
                "a" names the places and says the price and the Promise
                (Grok's audit, 3 Nov 2026); "b" leads with the payoff. A
                place's own page keeps its own. */}
            {invite && !place ? (
              /* The invitation, then what it gets you (Sam, 5 Nov 2026:
                 "the welcome week logo somewhere, tied to the offer"), as a
                 sticker and a paper strip (shell/InviteHero.tsx). */
              <InviteHero
                invite={invite}
                free={free}
                line={`${firstMonthLine(price)} of Tapin Plus`}
                h1={wwHero?.h1 ?? `$${CREDIT} back every week at ${PLACES.length} Blacksburg spots`}
                strip={wwHero?.strip ?? "First month free"}
              />
            ) : place || hero === "0" ? (
              <h1>
                {place
                  ? `$${CREDIT} back every week at ${place.name}`
                  : `$${CREDIT} back at every place you already go in Blacksburg`}
              </h1>
            ) : HERO_LINES[hero] ? (
              /* Round 3 of the hero test (model/heroTest.ts). */
              <h1>{HERO_LINES[hero]}</h1>
            ) : hero === "a" ? (
              <>
                {/* The headline alone (Sam, 4 Nov 2026: "there's so much text
                    now"; "still busy, maybe it belongs in it's own container
                    above 'how it works'"). The Promise is that container. */}
                <h1>${CREDIT} back every week at {PLACES.length} Blacksburg spots</h1>
              </>
            ) : (
              <>
                {/* Pays for itself (Sam, 4 Nov 2026): the first month is
                    $3.99 and the first $10 order gives $5 back. One short line
                    under it, as hero "a" learned; the Promise is its own card
                    below, as for "a". */}
                <h1>Your first ${MIN_ORDER} order pays for your first month</h1>
                {/* No sub-line (Sam, 4 Nov 2026: "okay maybe we just remove
                    it", after a plain line and a chip both read as too much).
                    How it works, right below, shows the $5 back. */}
              </>
            )}
            {/* Social proof, at the top (Sam, 3 Nov 2026); the count lives in
                model/proof.ts. */}
            {/* Not under the invitation's header: one thing fewer there
                (Sam, 5 Nov 2026: "still a bit too busy"). */}
            {invite && !place ? null : <SocialProof text={MEMBERS_LINE} />}
          </div>
        </div>
      </header>

      <main ref={sheetRef} className="tpa-sheet">
        {/* Hero A's guarantee, in its own card above How it works (Sam,
            4 Nov 2026). The control keeps it further down, as it was. */}
        {hero !== "0" && !place && !invite ? promiseTop : null}
        {/* The order earning its $5 comes first, right under the band (Sam,
            3 Nov 2026: "I feel like this interactive animation should show
            up at the top"); the offer and Join follow, and the dock keeps
            Join on screen the whole way down. */}
        <section className="tpa-module" aria-labelledby="tpa-how">
          <h2 id="tpa-how" className="tpa-h2">
            How it works
          </h2>
          <OrderCard start={startAt} look={look} monthly={MONTHLY} />
          <button type="button" className="tpa-step-wide" onClick={openHow}>
            <Play />
            Step through it
          </button>
          {/* Straight to the questions (Sam, 4 Nov 2026: "there should be a
              view FAQ button right below the 'step through it' button"). A
              quiet text button, so Step through it stays the one action here. */}
          <button type="button" className="tpa-faq-jump" onClick={toFaq}>
            View FAQ
          </button>
        </section>

        {/* The places' photos straight after How it works (Sam, 4 Nov 2026:
            "should we have the every plus place higher?"): on a phone they
            top the second screen, under the example order. Not above the
            Promise card, which would push How it works off the first. */}
        <section className="tpa-places" aria-labelledby="tpa-every">
          <h2 id="tpa-every" className="tpa-h2 tpa-h2-out">
            Every Plus place
          </h2>
          <ul className="tpa-rail">
            {PLACES.map((v) => (
              <li key={v.id} className="tpa-place">
                {/* A tap opens what Plus does there (Sam, 4 Nov 2026). */}
                <button
                  type="button"
                  className="tpa-place-open"
                  aria-label={`What Plus gets you at ${v.name}`}
                  onClick={(e) => {
                    /* Where the card is, so the photo can fly from it into
                       the pop-up (shell/PlacePopup.tsx). */
                    const r = e.currentTarget.getBoundingClientRect();
                    setPlaceOpen({
                      id: v.id,
                      name: v.name,
                      kind: KIND[v.id] ?? v.category,
                      photo: photoFor(v),
                      from: { x: r.left, y: r.top, w: r.width, h: r.height },
                    });
                    track("plus_place_opened", { place: v.id });
                  }}
                >
                  <img className="tpa-place-photo" src={photoFor(v)} alt="" decoding="async" loading="lazy" />
                  <span className="tpa-glass tpa-tag">
                    <FlatMark className="tpa-tag-mark" />
                    Plus
                  </span>
                  {/* Says the card opens (Sam, 4 Nov 2026: "a small icon in
                      the top right of these to indicate they can be
                      pressed"). */}
                  <span className="tpa-glass tpa-place-more" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M8 16 16 8M9.5 8H16v6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="tpa-place-name">
                    <b>{v.name}</b>
                    <small>{KIND[v.id] ?? v.category}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* THE OFFER, SIMPLE (Sam, 3 Nov 2026: "there's far too much text
            here. Make it way simpler, and if you have to nest that's fine"):
            the price, the clock, Join and Try. Where it works is the tabs
            above; the price lock folds away under one line. */}
        {/* THE PAYBACK, A NEW DESIGN, THREE VERSIONS (Sam, 3 Nov 2026: "I
            think we need a new design entirely"). Each one leads with
            something to look at, not a stack of sentences. Preview with
            ?offer=1|2|3; without it the offer is as shipped. The $5 is credit
            toward the next order, so each says it is earned "back", and the
            payback is claimed of the first month only.
            1 · Sticker: the first order, a real dish at its menu price, with a
              +$5 paper sticker on it beside the $3.99 month it covers.
            2 · Counter: tap how many $10+ orders this month and see what you
              are ahead after the $3.99; one $5 per place each week, so 20 is
              the most a month holds.
            3 · Poster: the collage band with the line set over it, the way
              the page's own header is, and the offer under it. */}
        {offer === "1" ? (
          <section className="tpa-module tpa-offer tpa-s1" aria-label="Tapin Plus">
            <h2 className="tpa-s1-h">Your first ${MIN_ORDER} order covers&nbsp;it.</h2>
            <div className="tpa-s1-art">
              <figure className="tpa-s1-order">
                <img src={FIRST_ORDER.img} alt="" decoding="async" />
                <figcaption>
                  <span>{FIRST_ORDER.label}</span>
                  <span className="tnum">{money(FIRST_ORDER.price)}</span>
                </figcaption>
                <span className="tpa-s1-sticker" aria-label={`$${CREDIT} back`}>
                  <b className="tnum">+${CREDIT}</b>
                  <small>back</small>
                </span>
              </figure>
              <p className="tpa-s1-tag">
                <span>covers</span>
                <b className="tnum">{FIRST_MONTH}</b>
                <span>your first month</span>
              </p>
            </div>
            <p className="tpa-offer-then">Then {MONTHLY}/month.</p>
            {linked ? null : <WelcomeChip />}
            {joinCta("hero")}
            {tryCta}
            {lockMore}
          </section>
        ) : member ? (
          <section className="tpa-module tpa-offer tpa-member" aria-label="Tapin Plus">
            <p className="tpa-member-kicker">
              <MemberDot />
              Plus is on
            </p>
            <h2 className="tpa-h2">
              You’re a Plus member
            </h2>
            <AppCard where="home_member" line="Your $5 back, 15% off and points are in the app. Sign in with the number you joined with." />
          </section>
        ) : offer === "2" ? (
          <section className="tpa-module tpa-offer tpa-s2" aria-label="Tapin Plus">
            {/* WHAT YOU'D GET BACK, AGAINST WHAT IT COSTS (Sam, 3 Nov 2026:
                "I don't really quite get it ... I think it's kind of neat to
                have that be flexible"). One question, then the two numbers
                side by side: back a month against the first month's price.
                The countdown is a quiet line, not the black pill ("I also
                don't like the way the countdown looks specifically on this
                card"). */}
            <h2 className="tpa-h2">See what you’d get back</h2>
            <PaybackCounter />
            {/* ONE PRICE, ONE BAR, ONE ACTION (Sam, 3 Nov 2026: "a lot is going
                on here"). The price on one line, big figure first; the spots
                bar thin, its words small under it; Join; Try as a quiet
                second. The "offer ends" line went: the black bar pinned to
                the top of the page already counts down to November 30. */}
            <div className="tpa-buy">
              {invite ? (
                /* The mark beside the price it unlocks: the offer is the
                   invitation's, so they sit as one line, not a badge stuck
                   on the page. */
                <div className="tpa-invite-offer">
                  <img className="tpa-invite-logo" src={invite.logo} alt={invite.alt} width="64" height="64" decoding="async" />
                  <p>
                    <small>{invite.who} exclusive</small>
                    <b>{free ? "First month free" : firstMonthLine(price)}</b>
                    <span className="tnum">Then {MONTHLY}/mo. Cancel anytime in the app.</span>
                  </p>
                </div>
              ) : (
              <p className="tpa-buy-price">
                <span>
                  <b className="tnum">{FIRST_MONTH}</b> first month
                </span>
                <span className="tpa-buy-then tnum">then {MONTHLY}/mo</span>
              </p>
              )}
              {/* The next 100 at $7.99, then $9.99 (Sam, 3 Nov 2026); an
                  invitation with an end counts down to it instead (Sam,
                  5 Nov 2026: "a countdown until sunday"). */}
              {invite?.ends ? (
                <InviteClock invite={invite} className="tpa-buy-seats" />
              ) : (
                <PlusSeats monthly={MONTHLY} className="tpa-buy-seats" />
              )}
            </div>
            {joinCta("hero")}
            {tryCta}
            {lockMore}
          </section>
        ) : offer === "3" ? (
          <section className="tpa-s3" aria-label="Tapin Plus">
            <div className="tpa-s3-art">
              <img className="tpa-s3-collage" src={COLLAGE} alt="" decoding="async" />
              <img className="tpa-s3-mark" src={PAPER_MARK} alt="" width="72" height="57" decoding="async" />
              <h2 className="tpa-s3-h">Your first ${MIN_ORDER} order covers the&nbsp;month.</h2>
            </div>
            <div className="tpa-s3-body">
              <p className="tpa-s3-sum" aria-label={`$${CREDIT} back on your first order is more than ${FIRST_MONTH} for your first month`}>
                <span aria-hidden="true">
                  <b className="tnum">${CREDIT} back</b>
                  <small>on your first order</small>
                </span>
                <span className="tpa-s3-gt" aria-hidden="true">
                  &gt;
                </span>
                <span aria-hidden="true">
                  <b className="tnum">{FIRST_MONTH}</b>
                  <small>your first month</small>
                </span>
              </p>
              <p className="tpa-offer-then">Then {MONTHLY}/month.</p>
              {linked ? null : <WelcomeChip />}
              {joinCta("hero")}
              {tryCta}
              {lockMore}
            </div>
          </section>
        ) : (
        <section className="tpa-module tpa-offer" aria-label="Tapin Plus">
          <img className="tpa-offer-mark" src={PAPER_MARK} alt="" width="76" height="60" decoding="async" />
          <p className="tpa-offer-price">
            <b className="tnum">{FIRST_MONTH}</b>
            <span>{free ? "first month" : "your first month"}</span>
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
          {linked ? null : <WelcomeChip />}
          {joinCta("hero")}
          {tryCta}
          {lockMore}
        </section>
        )}

        {hero === "a" && !invite ? null : promise}


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

        <section ref={faqRef} className="tpa-module" aria-labelledby="tpa-faq" tabIndex={-1}>
          <h2 id="tpa-faq" className="tpa-h2">
            Questions
          </h2>
          {[...(invite ? inviteFaq(invite, MONTHLY) : []), ...faqFor(MONTHLY)].map((f) => (
            <details key={f.q} className="tpa-qa">
              <summary>
                <span>{f.q}</span>
                <Chevron />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section className="tpa-close" aria-label={joinLabel}>
          <img className="tpa-close-paper" src={PAPER_MARK} alt="" width="96" height="76" decoding="async" loading="lazy" />
          {member ? (
            <>
              <h2 className="tpa-close-h">Your Plus is in the app</h2>
              <p className="tpa-close-line">Order, see your credit and manage your membership there.</p>
            </>
          ) : (
            <>
              <h2 className="tpa-close-h">{free ? "Your first month free" : `${FIRST_MONTH} your first month`}</h2>
              <p className="tpa-close-line">
                {invite ? `For ${invite.who}. ` : ""}Then {MONTHLY}/month, locked in for as long as you’re a member.
              </p>
              {invite?.ends ? <p className="tpa-close-ends">Free first month ends {invite.endsLabel}.</p> : null}
              {linked ? null : <WelcomeEnds className="tpa-close-ends" />}
            </>
          )}
          {joinCta("close", true)}
        </section>

        <footer className="tpa-foot">
          <p>
            $5 back is credit, once a week at each place, earned on food and non-alcoholic drinks. Or 15% off once a day.
            15% off or $5 credit, one per order; credit you’ve earned works with the 15%. Credit and 15% off don’t go toward
            alcohol. Cancel anytime.
          </p>
          <AccountLine where="home_foot" />
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
      {placeOpen ? (
        <PlacePopup
          place={placeOpen}
          onClose={() => setPlaceOpen(null)}
          onJoin={() => {
            setPlaceOpen(null);
            join("place_popup", null, true);
          }}
        />
      ) : null}
      {how ? (
        <HowSheet
          onClose={() => setHow(false)}
          onJoin={() => {
            setHow(false);
            join("how_sheet", null, true);
          }}
        />
      ) : null}

      {/* The docked Join is always on screen (Sam, 3 Nov 2026: "the sticky
          CTA should always show"). */}
      {/* Join alone again. See how much I'd save sat under it for a few
          hours on 3 Nov 2026; real visitors from the ads never tapped it (they
          used Step through it, and Join), so it went (Sam: "if the see how
          much I save button isn't getting click throughs maybe we hide it"). */}
      <div ref={dockRef} className="tpa-dock" data-shown="" data-island-origin="">
        {member ? (
          getApp("dock", false, " tpa-dock-cta")
        ) : (
          <button type="button" className="tpa-cta tpa-dock-cta" onClick={(e) => join("dock", e.currentTarget)}>
            {joinLabel}
          </button>
        )}
      </div>
    </div>
  );
}
