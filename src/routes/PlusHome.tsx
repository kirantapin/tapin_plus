import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import { venues } from "../model/content";
import { itemsFor } from "../model/menu";
import { MEMBERS_LINE } from "../model/proof";
import { PLUS_NEXT_PRICE, plusSeatLine } from "../model/seats";
import { useMedia } from "../shell/useMedia";
import { CheckoutPhone, HowPhone, ProofTurn, UnderOffer, Voices } from "./parents_sections";
import { PLACES as KIT_PLACES, VISITS, placeMonth, placeOrders } from "./parents_kit";
import { PlusSeats, usePlusSeats } from "../shell/PlusSeats";
import { OfferVersion, offerVersion } from "../shell/OfferVersions";
import { Founders } from "../shell/Founders";
import { firstFigure, firstMonthLine, usd, usePlusPriceLoad } from "../model/plus";
import { inviteExpected, inviteFor, type Invite } from "../model/invite";
import InviteHero from "../shell/InviteHero";
import { WW_HEROES, wwHeroProps, wwHeroVariant } from "../model/wwHeroTest";
import HowSheet from "../shell/HowSheet";
import { openPlusCheckout, usePlusCheckoutOpen } from "../shell/PlusCheckout";
import { useDockPulse } from "../shell/dockPulse";
import { DockArrow } from "../shell/DockArrow";
import AccountLine from "../shell/AccountLine";
import MemberDot from "../shell/MemberDot";
import PlacePopup, { type PlacePopupPlace } from "../shell/PlacePopup";
import { HERO_LINES, HERO_SUBS, heroVariant } from "../model/heroTest";
import { AppCard, appHref, device } from "../shell/GetTheApp";
import { useAuth } from "../context/auth_context";
import TrialModal from "../shell/TrialModal";
import { InviteClock, LinkBar, WelcomeChip, WelcomeEnds, WelcomeLine, useWelcomeLead } from "../shell/WelcomeOffer";
import { useTrialLink } from "../shell/useTrialLink";
import { WelcomeCallout } from "../shell/WelcomeCallout";
import { BonusSpots } from "../shell/BonusSpots";

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

const money = (n: number) => `$${n.toFixed(2)}`;

/* THE LIVE MARK (Sam, 10 Nov 2026: "can we have the perpetual animation on
   the tapin logo, the same one that [the app] used"): the app's PlusBoltLive
   lap, as is. Every 4.2 s a light goes round the mark: each piece in turn,
   clockwise from the top, dips to 30% and comes back, 120 ms behind the one
   before, so it reads as one thing turning over. WAAPI on its own pieces;
   paused off screen or in a hidden tab; still under Reduce Motion. */
const LAP_MS = 4200;
const STEP_MS = 120;
function LiveMark({ className }: { className?: string }) {
  const svg = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const el = svg.current;
    const pieces = Array.from(el?.querySelectorAll<SVGPathElement>("path") ?? []);
    if (!el || !pieces.length || typeof pieces[0]!.animate !== "function" || reducedMotion()) return;
    const laps = pieces.map((piece, i) =>
      piece.animate(
        [{ opacity: 1 }, { opacity: 0.3, offset: 0.06, easing: "cubic-bezier(.2,0,0,1)" }, { opacity: 1, offset: 0.16 }, { opacity: 1 }],
        { duration: LAP_MS, delay: 900 + i * STEP_MS, iterations: Infinity },
      ),
    );
    let seen = true;
    const sync = () => laps.forEach((a) => (seen && !document.hidden ? a.play() : a.pause()));
    const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([e]) => ((seen = !!e?.isIntersecting), sync()));
    io?.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      laps.forEach((a) => a.cancel());
    };
  }, []);
  return <FlatMark className={className} svgRef={svg} />;
}
const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The flat four-piece mark, for small places on photographs (the app's
 *  TapInGlyph, white on the glass). The paper mark is for the big moments. */
function FlatMark({ className, svgRef }: { className?: string; svgRef?: React.Ref<SVGSVGElement> }) {
  return (
    <svg ref={svgRef} className={className} viewBox="-0.4790 -1.7502 11.9749 11.9749" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M5.96461 0H8.01572L7.42303 1.69488H5.37196L4.77927 3.38981H2.7282L3.32085 1.69488L3.32891 1.6719L3.32938 1.67159C3.66805 0.746268 4.84127 0 5.96461 0Z" />
      <path fill="currentColor" d="M10.9325 3.38981L10.3398 5.08473H8.28874L8.88144 3.38981H6.83033L7.42303 1.69488H9.50194L9.50217 1.69519C10.6176 1.70766 11.2571 2.46151 10.9325 3.38981Z" />
      <path fill="currentColor" d="M5.05231 8.47458H3.0012L3.5939 6.77966H5.64496L6.23766 5.08477H8.28872L7.69607 6.77966L7.68801 6.80268L7.68755 6.80299C7.34889 7.72827 6.17567 8.47458 5.05231 8.47458Z" />
      <path fill="currentColor" d="M0.0844383 5.08473L0.677134 3.38981H2.7282L2.1355 5.08473H4.18661L3.59392 6.77961H1.51501L1.51478 6.77935C0.399363 6.76688 -0.240155 6.01303 0.0844603 5.08473Z" />
    </svg>
  );
}

const PAPER_MARK = asset("/brand/plus-paper-mark.svg");
const COLLAGE = asset("/collage/blacksburg.webp");

const Play = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="tpa-play">
    <path d="M8 5.6v12.8c0 .8.9 1.3 1.6.8l9.4-6.4c.6-.4.6-1.3 0-1.7L9.6 4.8C8.9 4.3 8 4.8 8 5.6Z" fill="currentColor" />
  </svg>
);

/* Counter is the offer (Sam, 3 Nov 2026, picked from the three). Sticker
   and Poster stay previewable at ?offer=1|3, the plain price at ?offer=0. */
type OfferLook = "shipped" | "1" | "2" | "3";
const offerLook = (): OfferLook => {
  if (typeof window === "undefined") return "2";
  const v = new URLSearchParams(window.location.search).get("offer");
  return v === "0" ? "shipped" : v === "1" || v === "3" ? v : "2";
};
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

/* A place's own page (/coffeeholics, Sam, 10 Nov 2026: "scoped specifically
   to the Coffeeholics brand"): the same questions about that place alone. The
   bars question goes; it isn't about this place. */
const placeFaq = (MONTHLY: string, name: string): ReadonlyArray<{ q: string; a: string }> => [
  {
    q: "What’s the catch?",
    a: `There isn’t one. ${name} is in it for the exposure: every Plus member gets $${CREDIT} to spend there every month. That’s how they win new regulars, so there’s no minimum spend and no marked-up menu. Cancel anytime.`,
  },
  {
    q: "How do I cancel and get a refund?",
    a: "Cancel anytime in the Tapin app. For a refund, email support@tapin.app. If Plus saved you less than you paid that month, your refund is auto-approved.",
  },
  {
    q: "When do I get my credit?",
    a: `Right away. The moment you join, $${CREDIT} credit is added at ${name}, ready to use in the Tapin app. It comes back every month you’re a member.`,
  },
  {
    q: "Does my credit roll over? Can I use it with the 15%?",
    a: `No to both. Your $${CREDIT} at ${name} resets every month, so use it that month. And it’s one per order: your credit on one, then ${PERCENT}% off the others.`,
  },
  {
    q: "How often can I use it?",
    a: `$${CREDIT} credit at ${name} every month, with no minimum spend, there from the moment you join. Then ${PERCENT}% off your other orders, once a day.`,
  },
  {
    q: "What does it work on?",
    a: `Use your credit and the ${PERCENT}% on food and non-alcoholic drinks at ${name}.`,
  },
  {
    q: "Will my price go up?",
    a: `No. Your ${MONTHLY} a month is locked in for as long as you’re a member, even as more places join. For new members it goes up as places join, and to ${PLUS_NEXT_PRICE} once these 100 spots are gone. It pays to get in early.`,
  },
];

const faqFor = (MONTHLY: string): ReadonlyArray<{ q: string; a: string }> => [
  /* What customers actually asked, most asked first (Sam, 4 Nov 2026, from
     support: cancelling and refunds 5 of 6; The Burg 2, both of whom later
     cancelled; stacking 1). Cancel is in the app, refunds by email (Sam,
     same day). */
  {
    /* Why the places are on board (Sam, 9 Nov 2026: "we need a what's the
       catch section. Like why are the merchants on board with this. To that,
       it's for exclusive exposure"). First: it's the question under all the
       others. */
    q: "What’s the catch?",
    a: `There isn’t one. The places are in it for the exposure: Plus is an exclusive group of Blacksburg spots, and every member gets $${CREDIT} to try each one, every month. That’s how they win new regulars, so there’s no minimum spend and no marked-up menu. Cancel anytime.`,
  },
  {
    q: "How do I cancel and get a refund?",
    a: "Cancel anytime in the Tapin app. For a refund, email support@tapin.app. If Plus saved you less than you paid that month, your refund is auto-approved.",
  },
  {
    /* The welcome credit is there at once (Sam, 9 Nov 2026: "the FAQ needs
       to reflect that the $5 credit is added to someones account
       immediately"). */
    q: "When do I get my credit?",
    a: `Right away. The moment you join, $${CREDIT} credit is added at each of the ${PLACES.length} places, $${PLACES.length * CREDIT} in all, ready to use in the Tapin app. It comes back every month you’re a member.`,
  },
  {
    /* The rule is the same at every bar, not just The Burg (Sam, 4 Nov 2026). */
    q: "Are the bars included? How does credit work there?",
    a: `Yes. At The Burg, The Milk Parlor and Olaika, order on Tapin and show your phone. Your $${CREDIT} credit and the ${PERCENT}% go on anything but alcohol. Everything you order earns points, which you can trade for rewards.`,
  },
  {
    /* The monthly credit (Sam, 9 Nov 2026): "they don't stack, and credit
       doesn't roll over". */
    q: "Does my credit roll over? Can I use it with the 15%?",
    a: `No to both. Your $${CREDIT} at each place resets every month, so use it that month. And it’s one per order: your credit on one, then ${PERCENT}% off the others.`,
  },
  {
    q: "How often can I use it?",
    a: `$${CREDIT} credit at each of the ${PLACES.length} places every month, with no minimum spend, there from the moment you join. Then ${PERCENT}% off your other orders, once a day.`,
  },
  {
    q: "What does it work on?",
    /* Names what the credit buys besides food (Sam, 4 Nov 2026: "shouldn't
       we update this to include events, cover, lineskips"). Earning stays
       food and non-alcoholic drinks (the 3 Nov rule). */
    a: `Use your credit and the ${PERCENT}% on food, non-alcoholic drinks and event tickets at every Plus place, plus cover and line skips at select places. Not on alcohol.`,
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

/* ══ WHAT A MONTH AT ONE PLACE SAVES (Sam, 10 Nov 2026: "we should still
   show what someone can save") ═════════════════════════════════════════════
   The offer card's math on a place's own page: how often you go (one tap),
   then the first month's price against what that month saves there, the $5
   credit on one visit and 15% off the rest (parents_kit placeMonth). The
   figure eases in on a new answer; still with reduced motion. */
function PlaceMath({ placeId, name, first, monthly }: { placeId: string; name: string; first: string; monthly: string }) {
  const m = placeMonth(placeId);
  const { track } = useEventTracking();
  const [at, setAt] = useState(1);
  const fig = useRef<HTMLElement | null>(null);
  const shown = useRef(at);
  useLayoutEffect(() => {
    if (shown.current === at) return;
    shown.current = at;
    if (reducedMotion()) return;
    fig.current?.animate?.([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" });
  }, [at]);
  if (!m) return null;
  const v = VISITS[at] ?? VISITS[1];
  const save = m.save(v.visits);
  return (
    <>
      <h2 className="tpa-h2 tpa-math-h">What you’d save at {name}</h2>
      <div className="tpa-freq" role="radiogroup" aria-label={`How often you go to ${name}`}>
        {VISITS.map((x, i) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={i === at}
            onClick={() => {
              setAt(i);
              track("plus_place_visits_picked", { place: placeId, visits: x.visits });
            }}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="tpa-math" data-ph-show="">
        <p>
          <b className="tnum">{first}</b>
          <span>your first month</span>
        </p>
        <svg className="tpa-math-arrow" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12h15m-5.5-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="tpa-math-get" aria-live="polite">
          <b className="tnum" ref={fig}>
            {money(save)}
          </b>
          <span>saved a month</span>
        </p>
      </div>
      <p className="tpa-math-then tnum">
        {v.visits} visits a month for {m.what} ({money(m.price)}): your ${CREDIT} credit on one, {PERCENT}% off the other {v.visits - 1}. After the first month, {monthly} a month.
      </p>
    </>
  );
}

/* ══ ONE PLACE'S PAGE (Sam, 3 Nov 2026: "redirect + rebuild") ════════════════
   /coffeeholics is the same page about one place: its own photograph in the
   band, its name in the headline and the try-it-once window (which already
   leads with Coffeeholics). Since 10 Nov 2026 it is scoped to that place
   alone (Sam: "needs to be scoped specifically to the Coffeeholics brand"):
   its $5 card, its own orders on the phone, what a month there saves, How it
   works, the questions and the fine print; the five-spot rail, the $25 and
   the Blacksburg-wide walkthrough stay on the home page. */
export default function PlusHome({ placeId, bandSrc }: { placeId?: string; bandSrc?: string }) {
  const place = placeId ? PLACES.find((p) => p.id === placeId) : undefined;
  const startAt = place ? Math.max(0, KIT_PLACES.findIndex((p) => p.id === place.id)) : 0;
  /* Its own orders on the phone, the $5 credit then the 15% (parents_kit). */
  const kitPlace = place ? KIT_PLACES.find((p) => p.id === place.id) : undefined;
  const placeOrderList = kitPlace ? placeOrders(kitPlace.id) : [];
  const { track } = useEventTracking();
  /* /how lands here with ?how and the walkthrough open. */
  const [how, setHow] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("how"));
  /* "Try it once for free" (Sam, 3 Nov 2026: "we should have the Try it once
     for free option"). The ads' /try links land here with the window open. */
  const [trial, setTrial] = useTrialLink();
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
  /* The dock's first lines (Sam, 10 Nov 2026, urgency and scarcity): when
     the $3.99 first month ends, then the $7.99 spots left. Not for members,
     a promo link or an invitation, whose offers are their own. */
  const welcomeLead = useWelcomeLead(FIRST_MONTH);
  const seatsLeft = usePlusSeats();
  const dockLead =
    member || linked || invite || free
      ? []
      : [
          ...(welcomeLead ? [{ key: "ends", body: welcomeLead }] : []),
          {
            key: "spots",
            body: (
              <>
                <span className="tpp-pt-dot" aria-hidden="true" />
                <span className="tnum">{plusSeatLine(seatsLeft, MONTHLY)}</span>
              </>
            ),
          },
        ];
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
  /* The offer card's new takes, preview only (?offv=a|b|c, 10 Nov 2026). */
  const [offv] = useState(offerVersion);
  /* THE MAIN PAGE, WITH WHAT THE PARENTS PAGE TAUGHT US (Sam, 8 Nov 2026:
     "push the round 2 changes, they look good, for the main plus.tapin.app
     page"; previews in tapin-staging-work/main-from-parents). The two Plus
     Promise cards went: the promise is now the list under the offer, the
     proof line and What if I don't save?, lower down where reassurance
     belongs. The "locked in" fold is a line of that list too.
     Under Join, the wallet, said before the tap (the checkout is a number,
     a code, then Apple Pay or Google Pay, with no card form). */
  const wallet = member ? null : (
    <p className="tpp-under tps-wallet">
      Your number, then one tap with <b>Apple Pay</b> or <b>Google Pay</b>
    </p>
  );
  /* The proof line at the foot of the held offer card (a computer; on a
     phone it rides on the dock). It starts on the places: the band already
     says the 500+. Still while a pop-up is over the page. */
  const covered = checkoutOpen || trial || how || !!placeOpen;
  const proofCard = <ProofTurn className="tpp-pt-card" start={place ? "refund" : "places"} paused={covered} audience="student" noPlaces={!!place} />;
  /* On a computer the voices sit three across under the places, so the
     held column stays shorter than the window; on a phone, a rail under
     the list. */
  const desk = useMedia("(min-width: 1024px)");
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
    <div className="tpa tpa-home tps">
      {/* The welcome offer's clock (Sam, 3 Nov 2026: "do the welcome offer
          countdown, ends at end of month"), pinned so it stays on screen. */}
      {/* Members get the same bar, with their own line, so the header above
          is the same card signed in or out (Sam, 10 Nov 2026: "the page
          header looks different when signed in??"). */}
      {linked && !member ? (
        <LinkBar line={free ? (invite?.ends ? "Free first month offer" : "First month free") : firstMonthLine(price)} invite={invite} ends={price?.linkEnds ?? invite?.ends ?? null} />
      ) : (
        /* The bar carries the students line now (Sam, 9 Nov 2026: "for the
           main landing page, we can remove the current announcement bar and
           replace it with this"); the countdown went. */
        <aside className="tpa-wbar tpa-pbar" aria-label="Tapin Plus members">
          <i className="tpa-pbar-dot" aria-hidden="true" />
          {/* A phone gets the short line, so it stays one line even with the
              text made larger (Sam, 9 Nov 2026: "this looks a bit strange on
              this shorter screen"). */}
          <span className="tpa-pbar-long">{member ? "You’re one of 500+ Virginia Tech students on Tapin Plus" : MEMBERS_LINE}</span>
          <span className="tpa-pbar-short">{member ? "You’re one of 500+ VT students on Plus" : "Join 500+ Virginia Tech students on Plus"}</span>
        </aside>
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
              <LiveMark className="tpa-badge-mark" />
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
                h1={wwHero?.h1 ?? `$${CREDIT} credit every month at ${PLACES.length} Blacksburg spots`}
                strip={wwHero?.strip ?? "First month free"}
              />
            ) : place || hero === "0" ? (
              <h1>
                {place
                  ? `$${CREDIT} credit every month at ${place.name}`
                  : `$${CREDIT} credit at every place you already go in Blacksburg`}
              </h1>
            ) : HERO_LINES[hero] ? (
              /* Round 3 of the hero test (model/heroTest.ts). */
              <>
                <h1>{HERO_LINES[hero]}</h1>
                {/* The welcome offer, in the header (Sam, 9 Nov 2026: "wouldn't
                    it go on the header of both?"): the $25 now, then the
                    weekly $5 under it. Not for members. */}
                {member ? null : <WelcomeCallout />}
                {/* The real deadline, quietly, under the $25 (Sam, 10 Nov
                    2026: "there's really no urgency or scarcity here"). Not
                    on a promo link, whose bar says its own offer. */}
                {member || linked || free ? null : <WelcomeLine first={FIRST_MONTH} />}
                {/* No line under the callout on Rob's headline (Sam, 9 Nov
                    2026: "just remove the sub text"); other headlines
                    previewed with ?hero= keep theirs. */}
                {HERO_SUBS[hero] && hero !== "r" ? <p className="tpa-hero-sub">{HERO_SUBS[hero]}</p> : null}
              </>
            ) : hero === "a" ? (
              <>
                {/* The headline alone (Sam, 4 Nov 2026: "there's so much text
                    now"; "still busy, maybe it belongs in it's own container
                    above 'how it works'"). The Promise is that container. */}
                <h1>${CREDIT} credit every month at {PLACES.length} Blacksburg spots</h1>
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
            {/* In the bar above when it shows (not for members, not on a
                promo link), so it isn't said twice. */}
            {(invite && !place) || member || !linked ? null : <SocialProof text={MEMBERS_LINE} />}
          </div>
        </div>
      </header>

      <main ref={sheetRef} className="tpa-sheet">
        {/* $5 UNLOCKED AT EACH SPOT (Sam, 9 Nov 2026: "a small section right
            under the header for the main tapin callout for the $5 credit
            unlocked at each spot"): the welcome bonus, place by place. Not
            for members. */}
        {/* $5 bonus credit at each spot (shell/BonusSpots.tsx, shared with
            /parents). */}
        {member ? null : <BonusSpots only={place?.id} />}

        {/* WHAT $5 BACK LOOKS LIKE, ON YOUR PHONE (round 2, Sam, 8 Nov 2026):
            the parents page's checkout phone, in "you", in place of the old
            order card (the same $12 to $7 idea, so only one survives). It
            stays right under the band, as the order card was (Sam, 3 Nov
            2026: "this interactive animation should show up at the top"),
            with Step through it and View FAQ under it. Every hero gets it;
            the Promise card that sat above it on heroes m, s and p went. */}
        <section className="tpa-module tps-fb" aria-labelledby="tpa-how">
          <h2 id="tpa-how" className="tpa-h2">
            {place ? `What Plus looks like at ${place.name}` : `What $${CREDIT} credit looks like`}
          </h2>
          {kitPlace && placeOrderList.length ? (
            <CheckoutPhone audience="student" orders={placeOrderList} place={kitPlace} />
          ) : (
            <CheckoutPhone audience="student" start={startAt} />
          )}
          {/* Step through it walks through a month's spend across
              Blacksburg, so a place's own page goes without it. */}
          {place ? null : (
            <button type="button" className="tpa-step-wide" onClick={openHow}>
              <Play />
              Step through it
            </button>
          )}
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
        {place ? null : (
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
        )}

        {/* Students' own words (round 1, Sam, 8 Nov 2026): nothing shows until
            model/voices.ts STUDENT_VOICES has real ones; local dev shows the
            marked slots. On a computer, three across here. */}
        {desk ? <Voices audience="student" className="tps-voices-desk" /> : null}

        {/* The offer card and, under it (not in it), one quiet list and the
            voices, as the parents page has them: on a computer the held
            right-hand column; on a phone the wrapper steps aside
            (display: contents). */}
        <div className="tpp-offer-col tps-offer-col">
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
                <span className="tpa-s1-sticker" aria-label={`$${CREDIT} credit`}>
                  <b className="tnum">+${CREDIT}</b>
                  <small>credit</small>
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
            {wallet}
            {tryCta}
            {proofCard}
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
            <AppCard where="home_member" line="Your $5 credit, 15% off and points are in the app. Sign in with the number you joined with." />
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
            {/* $3.99 TURNS INTO $25 (Sam, 9 Nov 2026, reworking the offer:
                "we can remove the calculator, and just show that $3.99 turns
                into $25 every month"). The calculator was built on the old
                weekly $5-on-$10, so it went with it. */}
            {place && placeMonth(place.id) ? (
              <PlaceMath placeId={place.id} name={place.name} first={FIRST_MONTH} monthly={MONTHLY} />
            ) : offv && !place && !invite && !free ? (
              <OfferVersion v={offv} first={FIRST_MONTH} monthly={MONTHLY} />
            ) : (
            <>
                {/* Both halves of what it turns into (Sam, 10 Nov 2026: "it's
                    not just the $3.99 turning into $25 but also the 15% off
                    every single day at each spot"): the $25 a month, then the
                    15% every day, stacked beside the price. */}
                <h2 className="tpa-h2 tpa-math-h">
                  {free ? (
                    <>A free month, with ${PLACES.length * CREDIT} and {PERCENT}%&nbsp;off</>
                  ) : (
                    <>
                      {FIRST_MONTH} turns into ${PLACES.length * CREDIT} and {PERCENT}%&nbsp;off
                    </>
                  )}
                </h2>
                <div className="tpa-math" data-stack="" data-ph-show="">
                  <p>
                    <b className="tnum">{FIRST_MONTH}</b>
                    <span>your first month</span>
                  </p>
                  <svg className="tpa-math-arrow" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 12h15m-5.5-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="tpa-math-gets">
                    <p className="tpa-math-get">
                      <b className="tnum">${PLACES.length * CREDIT}</b>
                      <span>every month</span>
                    </p>
                    <p className="tpa-math-get">
                      <b className="tnum">{PERCENT}% off</b>
                      <span>every day</span>
                    </p>
                  </div>
                </div>
                <p className="tpa-math-then tnum">
                  ${CREDIT} at each of the {PLACES.length} spots every month, no minimum spend, then {PERCENT}% off your other orders there, once a day. After the first month, {MONTHLY} a&nbsp;month.
                </p>
            </>
            )}
            {/* ONE PRICE, ONE BAR, ONE ACTION (Sam, 3 Nov 2026: "a lot is going
                on here"). The price on one line, big figure first; the spots
                bar thin, its words small under it; Join; Try as a quiet
                second. The "offer ends" line went: the black bar pinned to
                the top of the page already counts down to November 30. */}
            <div className="tpa-buy" data-math="" hidden={!!(offv && !place && !invite && !free)}>
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
              ) : null}
              {/* The welcome bonus by the price (Sam, 9 Nov 2026: "here we
                  should show $25 credit added to account immediately after
                  purchase"): the header's green chip, as a line of the
                  offer. Not on an invitation, whose offer is its own. */}
              {/* The +$25 row went into the math above (9 Nov 2026). */}
              {/* The next 100 at $7.99, then $9.99 (Sam, 3 Nov 2026); an
                  invitation with an end counts down to it instead (Sam,
                  5 Nov 2026: "a countdown until sunday"). */}
              {invite?.ends ? (
                <InviteClock invite={invite} className="tpa-buy-seats" />
              ) : (
                <PlusSeats monthly={MONTHLY} className="tpa-buy-seats" />
              )}
            </div>
            {/* Less on the card (Sam, 9 Nov 2026: "there's just way too much
                going on here"): Join and Try alone under the price; the
                wallet line (the checkout says it) and the turning proof line
                (the band says the 500+) went. */}
            {joinCta("hero")}
            {tryCta}
          </section>
        ) : offer === "3" ? (
          <section className="tpa-s3" aria-label="Tapin Plus">
            <div className="tpa-s3-art">
              <img className="tpa-s3-collage" src={COLLAGE} alt="" decoding="async" />
              <img className="tpa-s3-mark" src={PAPER_MARK} alt="" width="72" height="57" decoding="async" />
              <h2 className="tpa-s3-h">Your first ${MIN_ORDER} order covers the&nbsp;month.</h2>
            </div>
            <div className="tpa-s3-body">
              <p className="tpa-s3-sum" aria-label={`$${CREDIT} credit on your first order is more than ${FIRST_MONTH} for your first month`}>
                <span aria-hidden="true">
                  <b className="tnum">${CREDIT} credit</b>
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
              {wallet}
              {tryCta}
              {proofCard}
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
              Your first ${MIN_ORDER} order earns ${CREDIT} credit. That’s more than your first month.
            </span>
          </p>
          {linked ? null : <WelcomeChip />}
          {joinCta("hero")}
          {wallet}
          {tryCta}
          {proofCard}
        </section>
        )}

        {/* Under the offer: the other benefits, then the promise (round 1
            and 2, Sam, 8 Nov 2026), in place of the "locked in" fold. */}
        <UnderOffer audience="student" monthly={MONTHLY} />
        {desk ? null : <Voices audience="student" />}
        </div>

        {/* HOW IT WORKS, FOUR STEPS ON A PHONE (round 2, Sam, 8 Nov 2026):
            the parents page's maroon phone panel, in "you", in place of What
            you get. Its four facts live on: the $5 in What $5 back looks
            like and step 3, the 15% in step 3 and the list, points and new
            places in the list, and in the proof line. */}
        <section className="tpa-module" aria-labelledby="tpa-steps">
          <h2 id="tpa-steps" className="tpa-h2">
            How it works
          </h2>
          <HowPhone audience="student" first={FIRST_MONTH} monthly={MONTHLY} free={free} only={place?.id} />
        </section>

        {/* What if I don't save? went (Sam, 9 Nov 2026: "get rid of this too
            please"); the refund is a row under the offer and in the FAQ. */}

        {/* Rob and Sam, and why Plus is in Blacksburg (Sam, 10 Nov 2026). */}
        <Founders />

        <section ref={faqRef} className="tpa-module" aria-labelledby="tpa-faq" tabIndex={-1}>
          <h2 id="tpa-faq" className="tpa-h2">
            Questions
          </h2>
          {[...(invite ? inviteFaq(invite, MONTHLY) : []), ...(place ? placeFaq(MONTHLY, place.name) : faqFor(MONTHLY))].map((f) => (
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
            ${CREDIT} credit every month {place ? `at ${place.name}` : "at each place"}, no minimum spend; it resets each month and doesn’t roll over. Then {PERCENT}% off
            your other orders, once a day. One per order: credit or {PERCENT}% off, not both. Credit and {PERCENT}% off don’t go toward alcohol. Cancel
            anytime.
          </p>
          <AccountLine where="home_foot" app />
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
        {/* The proof line, on the dock (round 1, Sam, 8 Nov 2026). */}
        {/* The deadline and the spots lead the turn (Sam, 10 Nov 2026), so
            on a phone they're on screen the whole way down. */}
        <ProofTurn
          className="tpp-pt-dock"
          start={dockLead.length ? dockLead[0]!.key : place ? "refund" : "places"}
          paused={covered}
          audience="student"
          noPlaces={!!place}
          lead={dockLead}
        />
        {member ? (
          getApp("dock", false, " tpa-dock-cta")
        ) : (
          <button type="button" className="tpa-cta tpa-dock-cta" onClick={(e) => join("dock", e.currentTarget)}>
            {joinLabel}
            <DockArrow />
          </button>
        )}
      </div>
    </div>
  );
}
