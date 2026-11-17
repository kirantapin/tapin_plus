import type { ReactNode } from "react";
import { YouGet } from "../shell/OfferVersions";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import { BAR_IDS, venueCovers, venues } from "../model/content";
import { itemsFor } from "../model/menu";
import { MEMBERS_LINE } from "../model/proof";
import { PLUS_NEXT_PRICE, PLUS_SEAT_CAP, placeSeatCap, plusSeatLine } from "../model/seats";
import { useMedia } from "../shell/useMedia";
import { CheckoutPhone, HowPhone, ProofTurn, UnderOffer, Voices } from "./parents_sections";
import { PLACES as KIT_PLACES, VISITS, placeMonth, placeOrders } from "./parents_kit";
import { PlusSeats, usePlaceSeats, usePlusSeats } from "../shell/PlusSeats";
import { OfferVersion, offerVersion } from "../shell/OfferVersions";
import { UgcRow, ugcOn } from "../shell/UgcRow";
import { HokieLine } from "../shell/HokieLine";
import { setPriceHidden } from "../model/priceGate";
import { textsRateChosen } from "../model/textsRate";
import { LowerAfter, LowerVersion, lowerVersion } from "../shell/LowerVersions";
import { Founders } from "../shell/Founders";
import { refreshPlusPrice, firstFigure, firstForever, firstLasts, firstMonthLine, firstTerm, usd, usePlusPriceLoad } from "../model/plus";
import { inviteExpected, inviteFor, type Invite } from "../model/invite";
import InviteHero from "../shell/InviteHero";
import { WW_HEROES, wwHeroProps, wwHeroVariant } from "../model/wwHeroTest";
import HowSheet from "../shell/HowSheet";
import { openPlusCheckout, openPlusWaitlist, usePlusCheckoutOpen } from "../shell/PlusCheckout";
import { WAITLIST_CTA, joinedThisVisit, onWaitlist, setWaitlistPage, waitlistOn } from "../model/waitlist";
import { useDockPulse } from "../shell/dockPulse";
import { DockArrow } from "../shell/DockArrow";
import AccountLine from "../shell/AccountLine";
import MemberDot from "../shell/MemberDot";
import PlacePopup, { type PlacePopupPlace } from "../shell/PlacePopup";
import { HERO_LINES, HERO_SUBS, heroVariant } from "../model/heroTest";
import { AppCard, AppleGlyph, appHref, device } from "../shell/GetTheApp";
import { useAuth } from "../context/auth_context";
import TrialModal from "../shell/TrialModal";
import { ForeverLeft, InviteClock, LinkBar, SpotsLine, WelcomeChip, WelcomeEnds, WelcomeLine, useWelcomeLead } from "../shell/WelcomeOffer";
import { useTrialLink } from "../shell/useTrialLink";
import { WelcomeCallout } from "../shell/WelcomeCallout";
import { BonusSpots, LadderLead, LadderSay } from "../shell/BonusSpots";
import { LiteStory } from "../shell/LiteStory";
import { LiteMark } from "../shell/LiteMark";
import { rememberPlusPage } from "../model/backTo";
import { pagePolicy } from "../model/pagePolicy";
import { LiveCountdown, LiveLine, LiveOnPhoto, liveSoon, liveVersion } from "../shell/LiveSoon";
import { PLACE_FOREVER_ENDS, PLACE_FOREVER_ENDS_LABEL } from "../model/campaign";
import { useTicker } from "../shell/useTicker";
import { LITE_PLACES } from "../model/lite";
import type { Group } from "../model/groups";
import { GroupBar, GroupClock, GroupEnded, GroupHeadline, GroupLeftLine, GroupOffer, GroupSpots, groupTerm, useGroupSeats, useSaleEnded } from "../shell/GroupBits";

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
/* The places row's card (?railv=, 12 Nov 2026): C3 · Framed by default. */
type RailV = "a" | "b" | "c" | "c1" | "c2" | "c3";
const railVersion = (): RailV | null => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("railv");
  /* C3 · Framed is the card (Sam, 12 Nov 2026: "C3 is best, use that
     one"); ?railv=0 shows the old photo card, the others still preview. */
  if (v === "0") return null;
  return v === "a" || v === "b" || v === "c" || v === "c1" || v === "c2" || v === "c3" ? v : "c3";
};

type WhereV = "a" | "b" | "c";
const whereVersion = (): WhereV | null => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("wherev");
  /* B · One card is the section (Sam, 15 Nov 2026: "I like this most, but I
     think the ticker should go right above"); ?wherev=0 shows the page as it
     was, a and c still preview. */
  if (v === "0") return null;
  return v === "a" || v === "c" ? v : "b";
};

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
/* Coffeeholics' card wears its own page's banner, the two iced coffees
   (Sam, 12 Nov 2026: "can we use the coffeeholics page banner for their
   plus page background"). */
/* Coffeeholics' own photo is the mural, the owl and four cups (Sam, 12 Nov
   2026: "here's the image to use for coffeeholics background, it's a bit
   off center btw"): its card and its page's band both wear it, framed on
   the cups (they sit right of centre in the photo). */
const photoFor = (v: Place) => (v.id === "theburg" ? BURG_PHOTO : v.hero);
/** Where a place's photo is framed when it's cropped. */
const PHOTO_POS: Record<string, string> = { coffeeholicsva: "56% 50%" };

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
const placeFaq = (MONTHLY: string, name: string, placeId: string): ReadonlyArray<{ q: string; a: string }> => [
  {
    q: "What’s the catch?",
    a: `There isn’t one. ${name} is one of a handpicked group of Blacksburg places that don’t compete for the same spend but share the same customers. They fund the perks to reach more people, and Tapin puts the membership fee into promoting them. We don’t let everyone in, or it wouldn’t work. There’s no minimum spend and no marked-up menu. Cancel anytime.`,
  },
  {
    q: "How do I cancel and get a refund?",
    a: "Cancel anytime in the Tapin app. Use at least one Tapin benefit each month, and if Plus saves you less than you paid that month, we refund the difference automatically. You don’t have to ask.",
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
    /* Events too where Plus covers tickets (Sam, 12 Nov 2026, of The Burg:
       "also this would include events"; model/content.ts venueCovers). */
    a: `Use your credit and the ${PERCENT}% on food, non-alcoholic drinks${venueCovers[placeId]?.includes("tickets") ? " and event tickets" : ""} at ${name}.`,
  },
  {
    q: "Will my price go up?",
    a: `No. Your ${MONTHLY} a month is locked in for as long as you’re a member, even as more places join. For new members it goes up as places join, and to ${PLUS_NEXT_PRICE} once these 100 spots are gone. It pays to get in early.`,
  },
];

/* Where Try lives on the audit take (?audit=1): the FAQ only. Says what the
   pop-up offers (shell/TrialModal.tsx, model/campaign.ts). */
const TRY_FAQ = {
  q: "Can I try it before I join?",
  a: `Yes, once, without joining. Spend $${MIN_ORDER} at Coffeeholics or The Burg and get $${CREDIT} credit, or take ${PERCENT}% off an order at Coffeeholics. One time each.`,
};

/* The refund on the audit take, in Sam's words (15 Nov 2026): "use one tapin
   benefit every month, and if you don't save what you pay for the membership
   we'll refund the difference automatically, you don't have to request
   anything". Replaces "How do I cancel and get a refund?" there, which said
   to email support; cancelling keeps its own answer. No worked example
   (Sam, same day). */
const refundFaq = (): ReadonlyArray<{ q: string; a: string }> => [
  {
    q: "How does the auto refund work?",
    a: "Use at least one Tapin benefit each month. If Plus saves you less than you paid for the membership that month, we refund the difference automatically. You don’t have to ask.",
  },
  { q: "How do I cancel?", a: "Cancel anytime in the Tapin app." },
];

/* The waitlist's questions (model/waitlist.ts), first while Plus is invite
   only. Only what's true of the list: no wait times promised. */
const WAITLIST_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Why is Plus invite only?",
    a: "Plus comes with real discounts at every place, so we can’t let everyone in at once. We’re letting students in a few at a time to give the places time to adjust. Join the waitlist and you’re in line.",
  },
  {
    q: "How does the waitlist work?",
    a: "Add your number and you’re in line. When a spot opens, we text you a link to join. You have 48 hours to claim it, then it goes to the next person.",
  },
];

const faqFor = (MONTHLY: string, held = false): ReadonlyArray<{ q: string; a: string }> => [
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
    a: `There isn’t one. Tapin is a handpicked group of Blacksburg places that don’t compete for the same spend but share the same customers. The places fund the perks to reach more people, and Tapin puts the membership fee into promoting them. We don’t let everyone in, or it wouldn’t work. There’s no minimum spend and no marked-up menu. Cancel anytime.`,
  },
  {
    q: "How do I cancel and get a refund?",
    a: "Cancel anytime in the Tapin app. Use at least one Tapin benefit each month, and if Plus saves you less than you paid that month, we refund the difference automatically. You don’t have to ask.",
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
    a: `No to both. Your $${CREDIT} at each place resets every month, so use it that month. And it’s one per order: credit on one, ${PERCENT}% off on another.`,
  },
  {
    /* Get $5 · Earn $5 · Save 15% (Sam, 10 Nov 2026). */
    q: "How does it work?",
    a: `Get $${CREDIT} to spend at each of the ${PLACES.length} places every month, with no minimum spend, there from the moment you join. Earn $${CREDIT} back every week when you spend $10 on food and non-alcoholic drinks. Save ${PERCENT}% on your other orders, every day.`,
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
    a: held
      ? `No. Once you join, your price is locked in for as long as you’re a member, even as more places join. For new members it goes up as places join, and again once these 100 spots are gone. It pays to get in early.`
      : `No. Your ${MONTHLY} a month is locked in for as long as you’re a member, even as more places join. For new members it goes up as places join, and to ${PLUS_NEXT_PRICE} once these 100 spots are gone. It pays to get in early.`,
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
/* ══ THE FOR-LIFE CARD, THREE TAKES (?cfv=1|2|3, Sam, 12 Nov 2026: "can we
   /impeccable design 3 versions of this? I think we should cap the number of
   seats we're allowing for coffeeholics special rate to 50") ══════════════════
   Each holds the same true things: the price for life (the policy's), the spots left of
   50 (model/seats.ts), when the offer ends, how often you'd go and what that
   saves. 1 · Count leads with the savings and ends on the spots as one big
   number; 2 · Dots shows the 50 spots as 50 dots, open ones green; 3 · Ink
   puts the price and the spots in one dark tile at the top. */
type CfV = "1" | "2" | "3";
/* The Burg's page shows 3 · Ink with no ?cfv (Sam, 12 Nov 2026, asked which
   card: "Ink (cfv=3) default"); ?cfv=0 there shows the plain card. */
/* Ink (3) is the card on both places' pages (Sam, 12 Nov 2026: "I thought
   we had changed this for coffeeholics right?"); ?cfv=0 shows the old one. */
const CFV_DEFAULT: Record<string, CfV> = { theburg: "3", coffeeholicsva: "3" };
const cfVersion = (placeId?: string): CfV | null => {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("cfv");
  if (v === "1" || v === "2" || v === "3") return v;
  if (v === "0") return null;
  return (placeId && CFV_DEFAULT[placeId]) || null;
};
const endsLabel = (placeId: string) => PLACE_FOREVER_ENDS_LABEL[placeId] ?? "";

function CfCount({ placeId, first }: { placeId: string; first: string }) {
  const left = usePlaceSeats(placeId);
  const cap = placeSeatCap(placeId);
  return (
    <div className="cfv-count">
      <div className="cfv-count-row tnum">
        <b>{left}</b>
        <p>
          <span>spots left at {first} for life</span>
          <small>
            of {cap} · {endsLabel(placeId)}
          </small>
        </p>
      </div>
      <span className="cfv-bar" aria-hidden="true">
        <i style={{ transform: `scaleX(${left / cap})` }} />
      </span>
    </div>
  );
}

function CfDots({ placeId }: { placeId: string }) {
  const left = usePlaceSeats(placeId);
  const cap = placeSeatCap(placeId);
  return (
    <div className="cfv-dots">
      <ol className="cfv-dots-grid" aria-label={`${left} of ${cap} spots left`}>
        {Array.from({ length: cap }, (_, i) => (
          <li key={i} data-open={i < left ? "" : undefined} />
        ))}
      </ol>
      <p className="tnum">
        <b>
          {left} of {cap} spots left
        </b>{" "}
        · {endsLabel(placeId)}
      </p>
    </div>
  );
}

function CfInk({ placeId, first }: { placeId: string; first: string }) {
  const left = usePlaceSeats(placeId);
  const cap = placeSeatCap(placeId);
  return (
    <div className="cfv-ink tnum">
      <p className="cfv-ink-price">
        <b>{first}</b>
        <span>a month, for life</span>
      </p>
      <p className="cfv-ink-left">
        <b>{left}</b>
        <span>of {cap} spots left</span>
      </p>
      <p className="cfv-ink-ends">Offer {endsLabel(placeId)}</p>
    </div>
  );
}

/* The Ink tile on the standard offer, once a place's for-life offer is over:
   the first month, the spots left at the monthly price, what follows. */
function CfFirst({ first, monthly }: { first: string; monthly: string }) {
  const left = usePlusSeats();
  return (
    <div className="cfv-ink tnum">
      <p className="cfv-ink-price">
        <b>{first}</b>
        <span>your first month</span>
      </p>
      <p className="cfv-ink-left">
        <b>{left}</b>
        <span>of {PLUS_SEAT_CAP} spots left</span>
      </p>
      <p className="cfv-ink-ends">
        Then {monthly} a month, {PLUS_NEXT_PRICE} when the spots are gone
      </p>
    </div>
  );
}

/* ══ WHAT YOU'D SAVE, BY WHAT YOU SPEND (Sam, 12 Nov 2026: "based on how much
   you spend at coffeeholics every month how much you'd save. Like if you
   spend $25 $50 $75 $100 - also would want to have the $5 back weekly
   considered savings, the points valued at $1 for 100 points on average (10pts
   per dollar spent), and 15% off everything else. Assume the $5 is maximized,
   along with the $5 they get every month automatically"; then "a simple
   /impeccable design visualization of how we got here") ═══════════════════════
   For a month's spend S at the place, every credit used:
     · the month's $5 credit;
     · $5 back for each week you spend $10, at most four weeks (S / 10);
     · 15% off what the credits don't cover;
     · points, 10 a dollar on what you pay after those, 100 points ≈ $1.
   The picture is one bar of the month's savings in its four parts, with a
   mark where Plus's price falls, so you see how far past it the month goes. */
/* $30 at the low end, not $25 (Sam, 12 Nov 2026: "assume the $5 credit is
   used for all orders to maximize the savings calculation. Maybe $30 makes
   more sense?"): three weeks of $10 earn three $5s, where $25 earned two. */
const SPENDS = [30, 50, 75, 100] as const;
const POINTS_PER_DOLLAR_PAID = 10;
const POINTS_PER_DOLLAR_VALUE = 100;
const cents = (n: number) => Math.round(n * 100) / 100;
function spendSaves(spend: number) {
  const credit = Math.min(CREDIT, spend);
  const weeks = Math.min(4, Math.floor(spend / 10));
  const back = Math.min(weeks * CREDIT, Math.max(0, spend - credit));
  const rest = Math.max(0, spend - credit - back);
  const pct = cents((rest * PERCENT) / 100);
  const paid = cents(rest - pct);
  const points = Math.floor(paid * POINTS_PER_DOLLAR_PAID);
  const pointsValue = cents(points / POINTS_PER_DOLLAR_VALUE);
  return { credit, weeks, back, rest, pct, paid, points, pointsValue, total: cents(credit + back + pct + pointsValue) };
}

function SpendSaves({ placeId, name }: { placeId: string; name: string }) {
  /* At a bar the spend is food and non-alcoholic drinks: the $5s and the 15%
     never go on alcohol, so the math never counts it (3 Nov 2026). */
  const bar = BAR_IDS.has(placeId);
  const { track } = useEventTracking();
  const [spend, setSpend] = useState<number>(50);
  const fig = useRef<HTMLElement | null>(null);
  const shown = useRef(spend);
  useLayoutEffect(() => {
    if (shown.current === spend) return;
    shown.current = spend;
    if (reducedMotion()) return;
    fig.current?.animate?.([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" });
  }, [spend]);
  const s = spendSaves(spend);
  const parts = [
    { key: "credit", amount: s.credit, label: `$${CREDIT} credit, every month` },
    { key: "back", amount: s.back, label: `$${CREDIT} back, ${s.weeks} ${s.weeks === 1 ? "week" : "weeks"} you spend $10` },
    { key: "pct", amount: s.pct, label: `${PERCENT}% off the other ${money(s.rest)}` },
    { key: "pts", amount: s.pointsValue, label: `${s.points} points (100 ≈ $1)` },
  ].filter((p) => p.amount > 0);
  const at = (n: number) => `${Math.min(100, (n / s.total) * 100)}%`;
  return (
    <div className="ss">
      <h3 className="cfv-sub">What you’d save at {name}</h3>
      <p className="ss-ask">{bar ? "If you spend this a month there, on anything but alcohol" : "If you spend this a month there"}</p>
      <div className="tpa-freq ss-pick" role="radiogroup" aria-label={`What you spend at ${name} a month`}>
        {SPENDS.map((x) => (
          <button
            key={x}
            type="button"
            role="radio"
            aria-checked={x === spend}
            className="tnum"
            onClick={() => {
              setSpend(x);
              track("plus_place_spend_picked", { place: placeId, spend: x });
            }}
          >
            ${x}
          </button>
        ))}
      </div>
      <div className="tpa-math cfv-math-one" data-ph-show="">
        <p className="tpa-math-get" aria-live="polite">
          <b className="tnum" ref={fig}>
            {money(s.total)}
          </b>
          <span>saved a month</span>
        </p>
      </div>
      {/* How it adds up, folded under one line that opens (Sam, 12 Nov 2026:
          "the 'how we got there' should be nested, when someone clicks it'd
          expand"): one bar in four parts, Plus's price marked on it, the
          parts listed, the note. */}
      <details
        className="ss-how"
        onToggle={(e) => {
          if ((e.currentTarget as HTMLDetailsElement).open) track("plus_place_savings_opened", { place: placeId, spend });
        }}
      >
        <summary>
          <span>How it adds up</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 10 5 5 5-5" />
          </svg>
        </summary>
      <div className="ss-viz" aria-hidden="true">
        <div className="ss-bar">
          {parts.map((p) => (
            <i key={p.key} data-k={p.key} style={{ width: at(p.amount) }} />
          ))}
        </div>
      </div>
      <ul className="ss-parts tnum">
        {parts.map((p) => (
          <li key={p.key}>
            <i data-k={p.key} aria-hidden="true" />
            <span>{p.label}</span>
            <b>{money(p.amount)}</b>
          </li>
        ))}
      </ul>
      {/* What they save, not net of Plus (Sam, 12 Nov 2026: "we should just
          show what they saved, not what they saved after plus"): no price
          mark on the bar, no "ahead". */}
      <p className="ss-note">With every credit used.</p>
      </details>
    </div>
  );
}

function PlaceMath({
  placeId,
  name,
  first,
  monthly,
  forever = false,
  cfv = null,
}: {
  placeId: string;
  name: string;
  first: string;
  monthly: string;
  forever?: boolean;
  cfv?: CfV | null;
}) {
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
  /* 3 · Ink counts by what you spend, so it needs no everyday order (The
     Burg has none: a bar's everyday order isn't one to model). */
  if (cfv === "3")
    return (
      <div className="cfv cfv-3">
        {forever ? <CfInk placeId={placeId} first={first} /> : <CfFirst first={first} monthly={monthly} />}
        <SpendSaves placeId={placeId} name={name} />
      </div>
    );
  if (!m) return null;
  const v = VISITS[at] ?? VISITS[1];
  const save = m.save(v.visits);
  const freq = (
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
  );
  const how = (
    <p className="tpa-math-then tnum">
      {v.visits} visits a month for {m.what} ({money(m.price)}): your ${CREDIT} credit on one, {PERCENT}% off the other {v.visits - 1}.
    </p>
  );
  const saved = (
    <p className="tpa-math-get" aria-live="polite">
      <b className="tnum" ref={fig}>
        {money(save)}
      </b>
      <span>saved a month</span>
    </p>
  );
  if (forever && cfv === "1")
    return (
      <div className="cfv cfv-1">
        <h2 className="tpa-h2 tpa-math-h">What you’d save at {name}</h2>
        {freq}
        <div className="tpa-math" data-ph-show="">
          <p>
            <b className="tnum">{first}</b>
            <span>a month, for life</span>
          </p>
          <svg className="tpa-math-arrow" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12h15m-5.5-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {saved}
        </div>
        {how}
        <CfCount placeId={placeId} first={first} />
      </div>
    );
  if (forever && cfv === "2")
    return (
      <div className="cfv cfv-2">
        <h2 className="tpa-h2 tpa-math-h tnum">{first} a month, for life</h2>
        <CfDots placeId={placeId} />
        <h3 className="cfv-sub">What you’d save at {name}</h3>
        {freq}
        <div className="tpa-math cfv-math-one" data-ph-show="">
          {saved}
        </div>
        {how}
      </div>
    );
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
          <span>{forever ? "a month, for life" : "your first month"}</span>
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
        {v.visits} visits a month for {m.what} ({money(m.price)}): your ${CREDIT} credit on one, {PERCENT}% off the other {v.visits - 1}. {forever ? `${first} a month for as long as you stay a member.` : `After the first month, ${monthly} a month.`}
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
/* A GROUP'S PAGE (/smiths-landing, Sam, 10 Nov 2026): the home page said to
   the people at one address (model/groups.ts). Its own header words, the
   group's own price; the offer, checkout, dock, founders and questions are
   the home page's. */
/* Said only while the group's own price is the one that applies (its link),
   so the page never promises a price the checkout won't give. Smith's
   Landing and Brexx are both $3.99 a month for life (Sam, 11 Nov 2026);
   the year wording stays for a group whose rate lasts 12 months. */
const groupPriceFaq = (g: Group, first: string, monthly: string, on: boolean): { q: string; a: string } => ({
  q: "Will my price go up?",
  a: !on
    ? `No. Your ${monthly} a month is locked in for as long as you’re a member, even as more places join.`
    : g.term === "forever"
      ? `No. Your ${first} a month is locked in for as long as you’re a member, even as more places join.`
      : `Not for your first full year: ${first} a month for 12 months. Then it’s ${monthly} a month, locked in for as long as you’re a member, even as more places join.`,
});
/* Brexx (Sam, 11 Nov 2026): $3.99 a month for life, a partnership rate. */
const groupFaq = (g: Group, first: string, monthly: string): { q: string; a: string } =>
  g.faq ? g.faq(first, monthly) :
  /* Welcome Week's flash sale (Sam, 11 Nov 2026): today only, for life. */
  g.endsMs
    ? {
        q: `Why is it ${first}?`,
        a: `It’s our ${g.name} price, and it’s today only. Join before midnight tonight and you pay ${first} a month for as long as you’re a member, even as more places join. Everyone else pays ${monthly} a month after their first. Everything else is the same Tapin Plus. Cancel anytime in the Tapin app.`,
      }
    : ({
  q: `Why is it ${first} for ${g.name}?`,
  a:
    g.term === "forever"
      ? `It’s an exclusive we set up with ${g.name} for the people who live there: ${first} a month for as long as you’re a member, where everyone else pays ${monthly}. Everything else is the same Tapin Plus. Cancel anytime in the Tapin app.`
      : `It’s an exclusive we set up with ${g.name} for the people who live there: ${first} a month for your first 12 months, then ${monthly} a month. Everything else is the same Tapin Plus. Cancel anytime in the Tapin app.`,
});

/* The refund line, said where the price is (the audit's take, ?audit=1):
   in the header on a phone, under Join in the price card on a computer. */
function AuditPromise({ className }: { className?: string }) {
  return (
    <p className={`tpu-promise${className ? ` ${className}` : ""}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.2 5 5.9v5.6c0 4.3 2.9 8 7 9.1 4.1-1.1 7-4.8 7-9.1V5.9L12 3.2Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="m8.9 12.2 2.2 2.2 4.1-4.3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>
        <b>Auto refund</b> if you don't save what you&nbsp;pay
      </span>
    </p>
  );
}

export default function PlusHome({ placeId, bandSrc, bandPos, group }: { placeId?: string; bandSrc?: string; bandPos?: string; group?: Group }) {
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
  /* The places row's filter and the row itself, for the arrows on a
     computer (Sam, 12 Nov 2026: "more like a scrollable ticker I think with
     filters for Tapin plus and Tapin lite"). */
  const [railKind] = useState<"all" | "plus" | "lite">("all");
  /* Three takes on the cards, preview only (?railv=a|b|c, Sam, 12 Nov 2026:
     "the merchant cards feel a bit lopsided now, like large cards and small
     components within the cards feels weird"). */
  const [railv] = useState(railVersion);
  /* What and where can I use it?, under the header and blended with the
     ladder, three takes (Sam, 15 Nov 2026: "we need to have the 'what and
     where can I use it' section be right below the header ... somehow
     blended with the current section"). ?wherev=a|b|c, main page only.
     A · Lead card: the ladder is the row's first card, the places follow.
     B · One card: the ladder with the places row in place of the logos.
     C · Said over the row: the ladder as three plain lines, then the row. */
  const [wherevQ] = useState(whereVersion);
  const wherev = placeId ? null : wherevQ;
  const railRef = useRef<HTMLUListElement | null>(null);
  /* The cards in the row, Plus then Lite, as the filter has them; a
     place's own page leaves itself out. */
  const railCards = [
    ...(railKind === "lite" ? [] : PLACES.filter((v) => v.id !== placeId)).map((v) => ({
      id: v.id,
      name: v.name,
      kind: KIND[v.id] ?? v.category,
      photo: photoFor(v),
      logo: v.logo,
      lite: false,
      /* The three verbs (#302), true at every Plus place. */
      perk: "Get $5 · Earn $5 · Save 15%",
    })),
    ...(railKind === "plus" ? [] : LITE_PLACES).map((v) => ({
      id: v.id,
      name: v.name,
      kind: v.kind,
      photo: v.photo,
      logo: v.logo,
      lite: true,
      perk: v.short,
    })),
  ];
  /* A ticker when there are enough cards to fill a row (Sam, 12 Nov 2026:
     "not a carousel but rather a ticker - scrolling on its own but also
     still horizontally scrollable"); the pause button stops it. */
  const tickerOn = railCards.length >= 4;
  const [tickerPaused, setTickerPaused] = useState(false);
  useTicker(railRef, tickerOn, tickerPaused, railKind);
  const railBy = (dir: 1 | -1) => {
    const r = railRef.current;
    if (!r) return;
    r.scrollBy({ left: dir * Math.max(240, r.clientWidth * 0.8), behavior: reducedMotion() ? "auto" : "smooth" });
  };
  /* The hero A/B test (model/heroTest.ts). */
  const [hero] = useState(heroVariant);
  /* THE AUDIT'S TAKE (preview only, ?audit=1, 15 Nov 2026, not shipped):
     one concrete headline, the refund line by the price, Join beside Try,
     and how it works on the first screen. Main page only. */
  /* Shipped to every page, no flag any more (Sam, 16 Nov 2026: "make sure
     to update all the pages with the updates you made here"). */
  const { price, failed: priceFailed } = usePlusPriceLoad();
  const FIRST_MONTH = firstFigure(price);
  /* A place's own page selling Plus for life (/coffeeholics, 12 Nov 2026,
     model/campaign.ts): its price, said as for life everywhere it shows. */
  const placeForever = !!placeId && firstForever(price);
  /* When that page's offer ends (model/campaign.ts PLACE_FOREVER_ENDS). */
  const placeEnds = placeForever && placeId ? (PLACE_FOREVER_ENDS[placeId] ?? null) : null;
  /* The for-life card's three takes, preview only (?cfv=1|2|3). */
  const [cfv] = useState(() => cfVersion(placeId));
  /* The live badge's five takes, preview only (?livev=1..5). */
  const [livev] = useState(liveVersion);
  const MONTHLY = usd(price?.monthly);
  /* `from` is the button tapped, which grows into the checkout. */
  /* `from` is the button tapped; `over`, a Join inside another pop-up. */
  const join = (where: string, from?: HTMLElement | null, over = false) => {
    /* Invite only (model/waitlist.ts): every Join puts them on the list. */
    if (wait) {
      track("plus_waitlist_clicked", { where });
      openPlusWaitlist(where, from, { over });
      return;
    }
    track("plus_join_clicked", { where });
    openPlusCheckout(where, from, { over });
  };
  /* Signed in and already a member (Sam, 3 Nov 2026: "If someone is already
     signed in on this page, and they have the membership, the CTA should be
     to download the app"): every Join becomes Get the app, the offer becomes
     the app card, and the welcome clock goes, as there is nothing to buy. */
  const { subscribed, userSession } = useAuth();
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
  /* A group's year at $3.99 (model/groups.ts): on only when its link's
     price is the one that applied, so without the link the page is the
     ordinary offer. */
  /* Or its own public policy (Welcome Week), while its sale is on: past
     its end the page is the ordinary offer and says the price ended. */
  const saleEnded = useSaleEnded(group);
  const groupPriced = !!price?.linkId || (!!group?.policyId && price?.policyId === group.policyId);
  const groupOffer =
    !!group && !member && !saleEnded && groupPriced && (group.term === "forever" ? firstForever(price) : firstLasts(price));
  /* The sale ended with the page open: read the price again, without it. */
  useEffect(() => {
    if (saleEnded && price?.policyId) refreshPlusPrice();
  }, [saleEnded, price?.policyId]);
  /* INVITE ONLY (Sam, 17 Nov 2026, model/waitlist.ts): every student page
     takes waitlist joins instead of selling, except for an invite, a promo
     link texted to someone on the list. A group page puts its own link in
     the address, so its own link isn't an invite. */
  const invitedVisit = price ? !!price.linkId && !(group?.linkId && price.linkId === group.linkId) : !!expected && !group?.linkId;
  /* /vip keeps selling until its texted deadline, 11:59pm ET Tue 1 Dec
     (Sam, 17 Nov 2026: "keep vip open until dec 1"), then waits too. */
  const vipOpen = group?.id === "vip" && !saleEnded;
  const wait = waitlistOn() && !member && !invitedVisit && !vipOpen;
  setWaitlistPage(wait);
  const listed = wait && (onWaitlist(userSession?.user?.user_metadata as Record<string, unknown> | undefined) || joinedThisVisit());
  const groupSeats = useGroupSeats(group);
  const gTerm = group ? groupTerm(group) : null;
  const TERM = firstTerm(price);
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
  const dockLead = wait
    ? []
    : groupOffer && group
    ? [
        {
          key: "group",
          body: (
            <>
              <span className="tpp-pt-dot" aria-hidden="true" />
              <span className="tnum">
                {group.label ?? `${group.name} exclusive`} · {FIRST_MONTH}
                {gTerm?.short}
              </span>
            </>
          ),
        },
        /* A sale's time left (Welcome Week). */
        ...(group.endsMs
          ? [
              {
                key: "ends",
                body: (
                  <>
                    <span className="tpp-pt-dot" aria-hidden="true" />
                    <GroupLeftLine group={group} />
                  </>
                ),
              },
            ]
          : []),
        /* Its spots only if it counts them (Brexx doesn't). */
        ...(group.seats
          ? [
              {
                key: "spots",
                body: (
                  <>
                    <span className="tpp-pt-dot" aria-hidden="true" />
                    <span className="tnum">
                      {groupSeats} of {group.seats.cap} spots left at {FIRST_MONTH}/mo
                    </span>
                  </>
                ),
              },
            ]
          : []),
      ]
    : member || linked || invite || free
      ? []
      : placeForever && placeEnds
        ? [
            /* The for-life price and its time left, in place of the $7.99
               spots (/coffeeholics, 12 Nov 2026). */
            {
              key: "forever",
              body: (
                <>
                  <span className="tpp-pt-dot" aria-hidden="true" />
                  <ForeverLeft first={FIRST_MONTH} endsMs={placeEnds} />
                </>
              ),
            },
          ]
        : [
          ...(welcomeLead && !group ? [{ key: "ends", body: welcomeLead }] : []),
          /* Not on a group's page: its own spots replace these (Sam, 10
             Nov 2026), and show only with its own price. */
          ...(group
            ? []
            : [
                {
                  key: "spots",
                  body: (
                    <>
                      <span className="tpp-pt-dot" aria-hidden="true" />
                      <span className="tnum">{plusSeatLine(seatsLeft, MONTHLY)}</span>
                    </>
                  ),
                },
              ]),
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
      {/* The App Store's mark (Sam, 16 Nov 2026: "can we add the apple icon
          next to get the app?"); not on Android, where it opens the web app. */}
      {device() === "android" ? null : <AppleGlyph />}
      Get the Tapin app
    </a>
  );
  const joinLabel = wait ? (listed ? "You’re on the list" : WAITLIST_CTA) : invite && free ? "Try Plus for free" : "Join Tapin Plus";
  /* The Welcome Week headline test (model/wwHeroTest.ts): drawn only once
     the invitation applies, so nobody else is put in it, and every event of
     the session carries the variant from then on. */
  const wwHero = invite ? WW_HEROES[wwHeroVariant()] : null;
  const { registerForSession } = useEventTracking();
  useEffect(() => {
    if (invite) registerForSession(wwHeroProps());
  }, [invite, registerForSession]);
  /* Every event on a group's page says which group. */
  useEffect(() => {
    if (group) registerForSession({ landing_group: group.id });
  }, [group, registerForSession]);
  const joinCta = (where: string, white = false) =>
    member ? (
      getApp(where, white)
    ) : (
      <button type="button" className={`tpa-cta${white ? " tpa-cta-white" : ""}`} onClick={(e) => join(where, e.currentTarget)}>
        {joinLabel}
      </button>
    );
  /* Not on a place's own page (Sam, 12 Nov 2026: "remove the 'try it once
     for free' for both burg and coffeeholics pages"). */
  /* `audit`: the take everywhere a non-member lands (the main page, a
     place's page, a group's, /vip): the refund line, no Try outside the FAQ,
     the auto-refund FAQ. `auditHome`: the main page's own header. */
  const auditOn = !member;
  const auditHome = auditOn && !place && !invite && !group;
  /* A member's main page wears the same header and sections (Sam, 16 Nov
     2026: "can we update this page when I'm signed in? not sure why it
     changed so much after I signed in"), with nothing to buy. */
  const memberHome = member && !place && !invite && !group;
  /* The audit take keeps Try only in the FAQ (Sam, 15 Nov 2026: "remove the
     try it once for free everywhere other than the FAQ section"). */
  const tryCta = invite || place || auditOn ? null : (
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
  const audit = auditOn;
  const openTry = (where: string) => {
    setTrial(true);
    track("plus_try_opened", { where });
  };
  const [offer] = useState(offerLook);
  /* The offer card's new takes, preview only (?offv=a|b|c, 10 Nov 2026). */
  const [offv] = useState(offerVersion);
  /* The card's lower half, five layouts, preview only (?lowv=1..5, Sam,
     11 Nov 2026: "it's all so clustered still"); the plain students page
     only. */
  const [lowv] = useState(lowerVersion);
  const lowOn = !!(lowv && offv && !place && !invite && !free && !group && !member);
  /* The price after the number (model/priceGate.ts, Sam, 16 Nov 2026): the
     main page's ordinary offer only; pages that sell a price keep it. */
  const hidePrice = auditHome && !linked && !free && !placeForever && !userSession;
  /* The texts rate, chosen (model/textsRate.ts): $4.99 for life against the
     monthly, struck. */
  const textsOn = auditHome && !linked && textsRateChosen() && firstForever(price);
  setPriceHidden(hidePrice || wait);
  /* Real students on video under the header, preview only (?ugc). */
  const [ugc] = useState(ugcOn);
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
  /* The price is read once a tab and shared; a page's own offer is that
     page's alone (model/pagePolicy.ts). Arriving from a page that had its
     own (or arriving at one), read it again once so this page never shows
     the other page's price. */
  const priceChecked = useRef<string | null>(null);
  useEffect(() => {
    if (!price || priceChecked.current === location.pathname) return;
    priceChecked.current = location.pathname;
    if ((price.policyId ?? null) !== pagePolicy()) refreshPlusPrice();
  }, [price, location.pathname]);
  /* The account page's back comes here (model/backTo.ts). */
  useEffect(() => {
    rememberPlusPage(location.pathname + location.search);
  }, [location.pathname, location.search]);
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

  /* The places row (What and where can I use it?), placed by the page: where
     it always was, or, on the main page's ?wherev= takes (Sam, 15 Nov 2026),
     right under the header with the ladder. In a card it is a div with no
     heading of its own. */
  const placesRail = ({ cls, head = true, sub = true, inCard = false, lead }: { cls?: string; head?: boolean; sub?: boolean; inCard?: boolean; lead?: ReactNode } = {}) => {
    const leadOn = !!lead && railKind !== "lite";
    const Tag = inCard ? "div" : "section";
    return (
          <Tag className={`tpa-places${cls ? ` ${cls}` : ""}`} aria-labelledby={head ? "tpa-every" : undefined} data-railv={railv === "c1" ? "c c1" : railv ?? undefined}>
            {/* Sam, 11 Nov 2026: "for the 'Every plus place' section we have
                it be called 'what and where can I use it, click on a card to
                see'". The pop-up lists what Plus covers at that place. */}
            {head ? (
              <h2 id="tpa-every" className="tpa-h2 tpa-h2-out">
                {place ? "Also included with Plus" : "What and where can I use it?"}
              </h2>
            ) : null}
            {/* All, Plus or Lite, and on a computer two arrows to move the
                row. Lite comes with Plus, so All is the default. */}
            <div className="tpa-rail-bar">
              {/* The line under the heading shares a row with the pause and
                  arrows now the filters are gone. */}
              {sub ? <p className="tpa-places-sub">Open a card to see what Plus covers there.</p> : <span />}
              {/* No All / Tapin Plus / Tapin Lite filters (Sam, 15 Nov 2026:
                "let's just remove tapin lite and tapin plus filters"); every
                place shows, each card saying Plus or Lite. */}
            <div className="tpa-rail-arrows">
                {tickerOn ? (
                  <button
                    type="button"
                    className="tpa-rail-arrow tpa-rail-pause"
                    aria-label={tickerPaused ? "Play the places" : "Pause the places"}
                    aria-pressed={tickerPaused}
                    onClick={() => setTickerPaused((v) => !v)}
                  >
                    {tickerPaused ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8.5 6v12M15.5 6v12" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                ) : null}
                <button type="button" className="tpa-rail-arrow" aria-label="Earlier places" onClick={() => railBy(-1)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m14.5 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button type="button" className="tpa-rail-arrow" aria-label="More places" onClick={() => railBy(1)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            {/* The row's cards, Plus places then Lite, filtered. As a ticker
                (shell/useTicker.ts) it is drawn twice so the drift wraps; the
                copy is hidden from screen readers and the keyboard. */}
            <ul className="tpa-rail" ref={railRef} data-ticker={tickerOn ? "" : undefined}>
              {[false, true].map((copy) =>
                copy && !tickerOn
                  ? null
                  : [
                    leadOn ? (
                      <li key={`${copy ? "copy-" : ""}lead`} className="tpa-place tpw-lead" data-ticker-copy={copy ? "" : undefined} aria-hidden={copy || undefined}>
                        {lead}
                      </li>
                    ) : null,
                    ...railCards.map((v) => (
                      <li key={`${copy ? "copy-" : ""}${v.id}`} className="tpa-place" data-ticker-copy={copy ? "" : undefined} aria-hidden={copy || undefined}>
                        <button
                          type="button"
                          className="tpa-place-open"
                          tabIndex={copy ? -1 : undefined}
                          aria-label={v.lite ? `What you get at ${v.name}` : `What Plus gets you at ${v.name}`}
                          onClick={(e) => {
                            /* Where the card is, so the photo can fly from it
                               into the pop-up (shell/PlacePopup.tsx). */
                            const r = e.currentTarget.getBoundingClientRect();
                            setPlaceOpen({
                              id: v.id,
                              name: v.name,
                              kind: v.kind,
                              photo: v.photo,
                              lite: v.lite || undefined,
                              liveSoon: liveSoon(v.id) || undefined,
                              from: { x: r.left, y: r.top, w: r.width, h: r.height },
                            });
                            track("plus_place_opened", v.lite ? { place: v.id, lite: true } : { place: v.id });
                          }}
                        >
                          {/* The photo and what sits on it (the live badge's
                              takes need its box; display: contents otherwise). */}
                          <span className="tpa-place-shot" data-soon={liveSoon(v.id) && livev === "4" ? "" : undefined}>
                            <img
                              className="tpa-place-photo"
                              src={v.photo}
                              alt=""
                              decoding="async"
                              loading="lazy"
                              style={PHOTO_POS[v.id] ? { objectPosition: PHOTO_POS[v.id] } : undefined}
                            />
                            {/* Not live yet (Sam, 12 Nov 2026: "show 'live on
                                plus' next Friday with a small countdown so it's
                                clear"): a pill on the photo until the day, or
                                one of its five takes (?livev=). */}
                            {liveSoon(v.id) ? livev ? <LiveOnPhoto v={livev} id={v.id} /> : <LiveCountdown className="tpa-live" id={v.id} /> : null}
                          </span>
                          <span className="tpa-glass tpa-tag">
                            {v.lite ? <LiteMark className="tpa-tag-mark" /> : <FlatMark className="tpa-tag-mark" />}
                            {v.lite ? "Lite" : "Plus"}
                          </span>
                          {/* Says the card opens (Sam, 4 Nov 2026). */}
                          <span className="tpa-glass tpa-place-more" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                              <path d="M8 16 16 8M9.5 8H16v6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <span className="tpa-place-name">
                            <img className="tpa-place-logo" src={v.logo} alt="" decoding="async" loading="lazy" />
                            <span className="tpa-place-words">
                              <b>{v.name}</b>
                              {liveSoon(v.id) && livev === "1" ? <LiveLine id={v.id} /> : <small>{v.kind}</small>}
                              <small className="tpa-place-perk">{v.perk}</small>
                            </span>
                          </span>
                        </button>
                      </li>
                    )),
                  ]
              )}
            </ul>
          </Tag>
    );
  };

  return (
    <div className="tpa tpa-home tps">
      {/* The welcome offer's clock (Sam, 3 Nov 2026: "do the welcome offer
          countdown, ends at end of month"), pinned so it stays on screen. */}
      {/* Members get the same bar, with their own line, so the header above
          is the same card signed in or out (Sam, 10 Nov 2026: "the page
          header looks different when signed in??"). */}
      {wait ? (
        /* Invite only, said first (model/waitlist.ts). */
        <aside className="tpa-wbar tpa-pbar" aria-label="Tapin Plus is invite only">
          <i className="tpa-pbar-dot" aria-hidden="true" />
          <span className="tpa-pbar-long">Tapin Plus is invite only. 500+ Virginia Tech students are in.</span>
          <span className="tpa-pbar-short">Plus is invite only now</span>
        </aside>
      ) : groupOffer && group ? (
        <GroupBar group={group} line={`${FIRST_MONTH} ${gTerm?.long}`} short={`${FIRST_MONTH}${gTerm?.short}`} />
      ) : linked && !member ? (
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
        className={`tpa-band${auditHome || memberHome || (wait && !place && !group) ? " tpu-band" : ""}`}
        data-group={group?.id}
        data-hero={place ? "place" : invite || hero === "0" ? undefined : hero}
        data-invite={invite && !place && !wait ? "" : undefined}
      >
        {/* The group's own crop is for its own photo, not the collage. */}
        <img
          className={`tpa-band-art${group && bandSrc ? " tpg-band-art" : ""}`}
          src={bandSrc ?? COLLAGE}
          alt=""
          decoding="async"
          style={bandPos ? { objectPosition: bandPos } : undefined}
        />
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
            {wait ? (
              /* INVITE ONLY (model/waitlist.ts): the news as the headline,
                 what Plus is under it, then the one way in. The same
                 header on every student page. */
              <>
                <h1 className="tpu-h1">Tapin Plus is invite only&nbsp;now</h1>
                <p className="tpu-sub">
                  {place ? (
                    <>${CREDIT} credit every month at {place.name} and {PLACES.length - 1} more Blacksburg spots, plus {PERCENT}% off. Join the waitlist to get&nbsp;in.</>
                  ) : (
                    <>${CREDIT} credit at {PLACES.length} Blacksburg spots, every week. Join the waitlist to get&nbsp;in.</>
                  )}
                </p>
                <HokieLine dark />
                {/* The waitlist line as the member's status plate (Sam, 17
                    Nov 2026: "i like the second screenshot container, let's
                    do smth similar for the first"): the header's glass, the
                    dot, Invite only over how the list works. On a phone the
                    whole plate opens the waitlist; on a computer it sits by
                    Join the waitlist. */}
                <div className="tpu-act tpu-act-member tpu-act-wl">
                  {desk ? (
                    <button type="button" className="tpa-cta tpa-cta-white" onClick={(e) => join("band", e.currentTarget)}>
                      {joinLabel}
                    </button>
                  ) : null}
                  {(() => {
                    const inner = (
                      <>
                        <i className="tpu-plate-dot" aria-hidden="true" />
                        <span className="tpu-plate-words">
                          <b>{listed ? "You’re on the list" : "Invite only"}</b>
                          <small>{listed ? "We’ll text you when your spot opens." : "Spots open a few at a time. We text you when yours\u00a0does."}</small>
                        </span>
                        {desk ? null : (
                          <svg className="tpu-plate-go" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </>
                    );
                    return desk ? (
                      <div className="tpu-plate">{inner}</div>
                    ) : (
                      <button type="button" className="tpu-plate" onClick={(e) => join("band_plate", e.currentTarget)}>
                        {inner}
                      </button>
                    );
                  })()}
                </div>
              </>
            ) : invite && !place ? (
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
            ) : group && !place ? (
              <>
                <GroupHeadline group={group} />
                {member ? null : <WelcomeCallout />}
                {groupOffer ? <GroupOffer group={group} first={FIRST_MONTH} /> : saleEnded && !member ? <GroupEnded group={group} /> : null}
                {/* No November 30 clock: the residents' offer is its own,
                    counted in spots (Sam, 10 Nov 2026). */}
              </>
            ) : place ? (
              /* A place's own header, the main page's in its terms (Sam, 12
                 Nov 2026: "the header should be updated too I think"): the
                 headline, the green figure for that place, the price line.
                 The card below says how the $5 works, so the header no
                 longer repeats it. */
              <>
                <h1>Make every dollar you spend at {place.name} go further.</h1>
                {/* $25 a month at the place (Sam, 12 Nov 2026: "we should
                    show $25 in credit every month, since it's true. The first
                    $5 is theirs, the other $20 is from spending $40 but we
                    don't have to say that"): the month's $5 and four weeks'
                    $5 back. The opening card under it says how. */}
                {member ? null : (
                  <p className="wc" data-wc="1" data-ph-show="">
                    <b className="tnum">${CREDIT * 5}</b>
                    <span>in credit every month</span>
                  </p>
                )}
                {member || linked || free ? null : <WelcomeLine first={FIRST_MONTH} forever={placeForever} endsMs={placeEnds} />}
              </>
            ) : auditHome || memberHome ? (
              <>
                {/* Sam, 16 Nov 2026: "$5 credit at 5 Blacksburg spots, every
                    week. And then $25 added to your account for signing up":
                    the weekly $5 back, then the month's $5 at each spot. */}
                <h1 className="tpu-h1">
                  {/* A member's own line (Sam, 16 Nov 2026, of the member
                      header: "what's good with this header??"): what they
                      have, not the pitch. The monthly $5 at each place. */}
                  {memberHome ? (
                    <>Your ${CREDIT} credit is waiting at {PLACES.length} Blacksburg&nbsp;spots</>
                  ) : (
                    <>${CREDIT} credit at {PLACES.length} Blacksburg spots, every&nbsp;week</>
                  )}
                </h1>
                {/* Sam, 16 Nov 2026: "+$25 added to your account to spend
                    every month" ($5 at each of the five, every month). The
                    logos in the header (#391–#394) were rolled back at his
                    ask; this line stays. */}
                {/* Rob's line in its place (Sam, 16 Nov 2026: "you can have rob's
                    thing replace the $25 to spend every month in the header"). */}
                <HokieLine dark />
                {/* The act: on a computer, Join with the terms beside it (the
                    held price card's Join sits under the first screen there);
                    on a phone, the terms alone, the dock carries Join. */}
                {/* A member's act: the app, where the credit is, and that
                    Plus is on (in the visitor's Join row's place). */}
                {memberHome ? (
                  <div className="tpu-act tpu-act-member">
                    {/* On a phone the dock carries the app button. */}
                    {desk ? getApp("member_band", true) : null}
                    {/* The status as its own plate (Sam, 17 Nov 2026: "I don't
                        love the way this looks ... maybe it's in its own full
                        width parent container"): the header's glass, the dot,
                        "Plus is on" over how to get in. On a phone the whole
                        plate opens the app; on a computer it sits by the
                        button, which does. */}
                    {(() => {
                      const inner = (
                        <>
                          <i className="tpu-plate-dot" aria-hidden="true" />
                          <span className="tpu-plate-words">
                            <b>Plus is on</b>
                            <small>Sign in to the app with the number you joined&nbsp;with</small>
                          </span>
                          {desk ? null : (
                            <svg className="tpu-plate-go" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </>
                      );
                      return desk ? (
                        <div className="tpu-plate">{inner}</div>
                      ) : (
                        <a className="tpu-plate" href={appHref()} rel="noopener noreferrer" onClick={() => track("plus_get_app_clicked", { where: "member_plate", device: device() })}>
                          {inner}
                        </a>
                      );
                    })()}
                  </div>
                ) : null}
                {memberHome ? null : (
                <div className="tpu-act">
                  {desk ? (
                    <button type="button" className="tpa-cta tpa-cta-white" onClick={(e) => join("band", e.currentTarget)}>
                      {joinLabel}
                    </button>
                  ) : null}
                  {/* The terms, as one set: the price, then the refund. */}
                  <div className="tpu-terms">
                    {/* Nothing until the price is in: "$–" read as "$0" and "$1" in
                        the recordings (PostHog, 16 Nov 2026). The space is held. */}
                    {linked || free ? null : (
                      <div style={price ? undefined : { visibility: "hidden" }}>
                        {hidePrice && !textsOn ? <SpotsLine /> : <WelcomeLine first={FIRST_MONTH} forever={placeForever || firstForever(price)} endsMs={placeEnds} strong was={textsOn ? MONTHLY : undefined} />}
                      </div>
                    )}
                    <AuditPromise />
                  </div>
                </div>
                )}
              </>
            ) : hero === "0" ? (
              <h1>${CREDIT} credit at every place you already go in Blacksburg</h1>
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
                {member || linked || free ? null : <WelcomeLine first={FIRST_MONTH} forever={placeForever} endsMs={placeEnds} />}
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
            {/* Not on a group's page: its bar and header already carry its offer,
                and one line fewer there. */}
            {wait || (invite && !place) || member || !linked || groupOffer ? null : <SocialProof text={MEMBERS_LINE} />}
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
        {ugc ? <UgcRow place={place?.id} /> : null}
        {wherev === "a" ? (
          placesRail({ cls: "tpw tpw-a", lead: member ? undefined : <LadderLead /> })
        ) : wherev === "b" ? (
          <BonusSpots title="What and where can I use it?" rail={placesRail({ cls: "tpw tpw-b", head: false, inCard: true })} />
        ) : wherev === "c" ? (
          <section className="tpw tpw-c" aria-labelledby="tpw-c-h">
            <h2 id="tpw-c-h" className="tpa-h2 tpa-h2-out">
              What and where can I use it?
            </h2>
            {member ? null : <LadderSay />}
            {placesRail({ head: false, inCard: true })}
          </section>
        ) : member ? null : (
          <BonusSpots only={place?.id} />
        )}
        {/* "What can I use it on?" went from here (Sam, 11 Nov 2026: "move
            the what can I use it on a bit further down. I don't think it
            should be as big as it is"): the places rail below answers it,
            each card opening what Plus covers there. */}

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
        {/* A place's own page shows the others too (Sam, 12 Nov 2026: "for
            the coffeeholics page, we should show the other spots that are
            included in the plus membership"): the same rail without that
            place, Lite places included, since Lite comes with Plus. */}
        {wherev ? null : placesRail()}

        {/* Students' own words (round 1, Sam, 8 Nov 2026): nothing shows until
            model/voices.ts STUDENT_VOICES has real ones; local dev shows the
            marked slots. On a computer, three across here. */}

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
        {wait ? (
          /* INVITE ONLY (model/waitlist.ts): in the offer card's place, how
             to get in. No price: there's nothing to buy here. */
          <section className="tpa-module tpa-offer tpu-wl-card" aria-labelledby="tpu-wl-h">
            <img className="tpa-offer-mark" src={PAPER_MARK} alt="" width="76" height="60" decoding="async" />
            <p className="tpa-member-kicker">Invite only</p>
            <h2 id="tpu-wl-h" className="tpa-h2">
              {listed ? "You’re on the list" : "All Tapin Plus seats are gone"}
            </h2>
            {/* Sam, 17 Nov 2026: "all tapin seats are gone now, thank you all
                for the overwhelming support. We'll text you when more seats
                become available". */}
            <p className="tpu-wl-copy">
              {listed
                ? "Thank you for the support. We’ll text you when more seats become available."
                : "Thank you all for the overwhelming support. Join the waitlist and we’ll text you when more seats become available."}
            </p>
            {/* What Plus gets you, as the price card had it (Sam, 17 Nov
                2026: "this card should still show the tapin plus benefits I
                think? similar to the last one"): its You get row, no price. */}
            <div className="ov ov-c tpu-wl-get" data-ph-show="">
              <YouGet />
            </div>
            {joinCta("hero")}
          </section>
        ) : offer === "1" ? (
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
            {/* A place page keeps its spend-buttons card after its for-life
                offer ends (Sam, 14 Nov 2026: "the one with the spend buttons
                and how it adds up"), its tile showing the standard offer. */}
            {place && cfv === "3" ? (
              <PlaceMath placeId={place.id} name={place.name} first={FIRST_MONTH} monthly={MONTHLY} forever={placeForever} cfv={cfv} />
            ) : offv && !place && !invite && !free ? (
              <OfferVersion
                v={offv}
                first={FIRST_MONTH}
                monthly={MONTHLY}
                term={groupOffer ? TERM : undefined}
                noEnds={!!group}
                forever={groupOffer && group?.term === "forever"}
                lower={lowOn}
                hidden={hidePrice && !textsOn}
                was={textsOn ? MONTHLY : undefined}
                spots={
                  group ? (
                    groupOffer ? (
                      <>
                        <GroupSpots group={group} left={groupSeats} first={FIRST_MONTH} />
                        <GroupClock group={group} />
                      </>
                    ) : (
                      <></>
                    )
                  ) : undefined
                }
              />
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
              ) : placeForever && cfv ? null : place && cfv === "3" ? null : placeForever ? (
                /* The spots are the $7.99 rate's; this price is its own. */
                <p className="tpa-buy-seats tnum">Locked in for as long as you stay. Cancel anytime in the Tapin app.</p>
              ) : (
                <PlusSeats monthly={MONTHLY} className="tpa-buy-seats" />
              )}
            </div>
            {/* Less on the card (Sam, 9 Nov 2026: "there's just way too much
                going on here"): Join and Try alone under the price; the
                wallet line (the checkout says it) and the turning proof line
                (the band says the 500+) went. */}
            {lowOn && lowv ? (
              <LowerVersion v={lowv} monthly={MONTHLY} join={joinCta("hero")} tryCta={audit ? <AuditPromise className="tpu-promise-card" /> : tryCta} autoRefund={audit} hidden={hidePrice} />
            ) : (
              <>
                {joinCta("hero")}
                {tryCta}
                {audit ? <AuditPromise className="tpu-promise-card" /> : null}
              </>
            )}
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
        {lowOn && lowv ? <LowerAfter v={lowv} monthly={MONTHLY} /> : <UnderOffer audience="student" monthly={MONTHLY} />}
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
          <HowPhone audience="student" held={hidePrice || wait} first={FIRST_MONTH} firstLabel={placeForever || (groupOffer && group?.term === "forever") ? "Every month" : undefined} monthly={MONTHLY} free={free} only={place?.id} />
        </section>

        {/* Crumbl and Italiano's just joined (Sam, 12 Nov 2026), Tapin Lite
            places, which come with Plus. Under How it works (Sam, 13 Nov
            2026: "they're too high up right now"), as a story, one frame a
            place (take 1 of five, "this is perfect"; shell/LiteStory.tsx).
            Not on a place's own page or for members. */}
        {member || place ? null : <LiteStory places={LITE_PLACES} />}

        {/* What if I don't save? went (Sam, 9 Nov 2026: "get rid of this too
            please"); the refund is a row under the offer and in the FAQ. */}

        {/* Rob and Sam, and why Plus is in Blacksburg (Sam, 10 Nov 2026). */}
        <Founders />


        <section ref={faqRef} className="tpa-module" aria-labelledby="tpa-faq" tabIndex={-1}>
          <h2 id="tpa-faq" className="tpa-h2">
            Questions
          </h2>
          {(wait
            ? [...WAITLIST_FAQ, ...faqFor(MONTHLY, true)]
            : [
            ...(invite ? inviteFaq(invite, MONTHLY) : []),
            ...(group && groupOffer ? [groupFaq(group, FIRST_MONTH, MONTHLY)] : []),
            ...(place ? placeFaq(MONTHLY, place.name, place.id) : faqFor(MONTHLY, hidePrice))
              .flatMap((f): ReadonlyArray<{ q: string; a: string }> =>
                !audit ? [f] : f.q === "What’s the catch?" && !place ? [f, TRY_FAQ] : f.q === "How do I cancel and get a refund?" ? refundFaq() : [f],
              )
              .map((f) =>
              /* A group's price doesn't climb to $14.99 with the 100 spots. */
              group && f.q === "Will my price go up?"
                ? groupPriceFaq(group, FIRST_MONTH, MONTHLY, groupOffer)
                : placeForever && f.q === "Will my price go up?"
                  ? { q: f.q, a: `No. Join here and you pay ${FIRST_MONTH} a month for as long as you stay a member, even as more places join. Cancel anytime in the Tapin app.` }
                  : f,
            ),
          ]).map((f) => (
            <details key={f.q} className="tpa-qa">
              <summary>
                <span>{f.q}</span>
                <Chevron />
              </summary>
              <p>{f.a}</p>
              {f === TRY_FAQ ? (
                <button type="button" className="tpa-try tpu-faq-try" onClick={() => openTry("faq")}>
                  Try it once for free
                </button>
              ) : null}
            </details>
          ))}
        </section>

        {/* The students' words, right under the questions (Sam, 17 Nov
            2026: "let's have these below the FAQ"; they sat above it from
            16 Nov); three across on a computer. */}
        <Voices audience="student" className={desk ? "tps-voices-desk" : undefined} lead={place?.id} />

        <section className="tpa-close" aria-label={joinLabel}>
          <img className="tpa-close-paper" src={PAPER_MARK} alt="" width="96" height="76" decoding="async" loading="lazy" />
          {member ? (
            <>
              <h2 className="tpa-close-h">Your Plus is in the app</h2>
              <p className="tpa-close-line">Order, see your credit and manage your membership there.</p>
            </>
          ) : wait ? (
            <>
              <h2 className="tpa-close-h">{listed ? "You’re on the list" : "Get on the list"}</h2>
              <p className="tpa-close-line">Tapin Plus is invite only. Spots open a few at a time, and we text you when yours does.</p>
            </>
          ) : (
            <>
              <h2 className="tpa-close-h">{hidePrice ? "Lock in this round’s price" : free ? "Your first month free" : groupOffer ? `${FIRST_MONTH} ${gTerm?.long}` : placeForever ? `${FIRST_MONTH} a month for life` : `${FIRST_MONTH} your first month`}</h2>
              <p className="tpa-close-line">
                {hidePrice
                  ? `See it when you add your number, then it’s locked in for as long as you’re a member. Say yes to Tapin texts for an exclusive rate.`
                  : (groupOffer && group?.term === "forever") || placeForever
                  ? `Locked in for as long as you’re a member, even as more places join.`
                  : `${invite ? `For ${invite.who}. ` : ""}Then ${MONTHLY}/month, locked in for as long as you’re a member.`}
              </p>
              {invite?.ends ? <p className="tpa-close-ends">Free first month ends {invite.endsLabel}.</p> : null}
              {linked || group || placeForever ? null : <WelcomeEnds className="tpa-close-ends" />}
              {groupOffer && group?.endsMs ? <p className="tpa-close-ends">{group.endsLine ?? "Ends at midnight tonight"}.</p> : null}
            </>
          )}
          {joinCta("close", true)}
        </section>

        <footer className="tpa-foot">
          <p>
            {place ? (
              <>
                ${CREDIT} credit every month at {place.name}, no minimum spend; it resets each month and doesn’t roll over. Then {PERCENT}% off your other
                orders, once a day.
              </>
            ) : (
              <>
                Get ${CREDIT} credit every month at each place, no minimum spend; it resets each month and doesn’t roll over. Earn ${CREDIT} back every week
                when you spend $10 on food and non-alcoholic drinks. Save {PERCENT}% on your other orders, every day.
              </>
            )}{" "}
            One per order: credit or {PERCENT}% off, not both. Credit and {PERCENT}% off don’t go toward alcohol. Cancel anytime.
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

      {trial && !wait ? <TrialModal lit onClose={() => setTrial(false)} /> : null}
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
        {/* The audit take: the refund, said plainly, in place of the turn
            (Sam, 15 Nov 2026: "what we have here should just be the 'auto
            refund if you don't save what you pay'"). */}
        {/* A group's own lead line (a sale's clock) keeps the turn. */}
        {wait ? (
          <p className="tpu-promise tpu-promise-dock tpu-wl-dock">
            <i className="tpa-pbar-dot" aria-hidden="true" />
            <span>{listed ? "You’re on the list" : "Invite only · spots open a few at a time"}</span>
          </p>
        ) : audit && !(group && dockLead.length) ? <AuditPromise className="tpu-promise-dock" /> : <ProofTurn
          /* Starts again on the lead once it arrives with the price, so a
             group's own line (a sale's clock) is the one on screen. */
          key={dockLead[0]?.key ?? "none"}
          className="tpp-pt-dock"
          start={dockLead.length ? dockLead[0]!.key : place ? "refund" : "places"}
          paused={covered}
          audience="student"
          noPlaces={!!place}
          lead={dockLead}
        />}
        {member ? (
          getApp("dock", false, " tpa-dock-cta")
        ) : audit && !place ? (
          /* The audit take: Join, and under it the quiet way to see how it
             works first, the Step through it sheet (Sam, 16 Nov 2026). */
          <div className="tpu-dock-stack">
            <button type="button" className="tpa-cta tpa-dock-cta" onClick={(e) => join("dock", e.currentTarget)}>
              {joinLabel}
              <DockArrow />
            </button>
            <button
              type="button"
              className="tpu-dock-how"
              onClick={() => {
                setHow(true);
                track("plus_how_opened", { where: "dock" });
              }}
            >
              See how it works
            </button>
          </div>
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
