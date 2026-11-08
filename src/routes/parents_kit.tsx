import type { ReactNode } from "react";
import { asset } from "../asset";
import { venues } from "../model/content";
import { itemNamed } from "../model/menu";

/* The parents page's shared figures, places and small pieces, so the page
   (ParentsHome.tsx) and its design variations (parents_variants.tsx) read
   the same facts. Moved here as they were, 5 Nov 2026. */

export const CREDIT = 5;
export const MIN_ORDER = 10;
export const PERCENT = 15;
/* The parent offer's figures, fixed: they must match what ParentCheckout
   charges (its OFFER, 399 / 799 cents in shell/ParentCheckout.tsx). Not the
   student offer (usePlusPrice): a promo link (?l=) can change that one, and
   the page would then quote a price the parent isn't charged. */
export const FIRST = "$3.99";
export const MONTHLY = "$7.99";

/* ══ WHAT A LUNCH COSTS (COPY.md v2) ═════════════════════════════════════════
   One meal priced four ways, never a plan. The door rate is VT Dining's
   posted lunch and dinner price at D2 and Owens (footnote 1); the $12 lunch
   is Coffeeholics' California Club, the order card's first example. */
export const DOOR = 17.95;
export const LUNCH = 12;

/* ══ THE PLACES, IN THE COPY'S ORDER ═════════════════════════════════════════
   Coffeeholics and Sweetopia lead (HANDOFF.md). Each one's photograph is one
   of its own dishes (the merchants' item photos), and each order is real food
   at its menu price, $10 or more, so it earns the $5. No drinks, no bar
   items, no line skip or cover. */
export type Pick = { name: string; qty?: number };
export const PLACE_DEFS: ReadonlyArray<{ id: string; what: string; photo: string; order: Pick[] }> = [
  /* The order is the California Club ($12). (The French Onion Steak Melt is
     $13 but the menu data pairs it with the pesto panini's photo, so it isn't
     used.) The rail's photograph is the spread, a breakfast sandwich with a
     coffee and a matcha (Sam, 6 Nov 2026: "not a big fan of this image"; the
     club's own photo is only 162px wide). */
  { id: "coffeeholicsva", what: "Coffee and breakfast sandwiches", photo: "/shots/coffeeholicsva-spread.jpg", order: [{ name: "California Club" }] },
  /* Sweetopia sells nothing over $10 alone: two rolled ice creams. */
  { id: "sweetopia", what: "Ice cream and desserts", photo: "/items/sweetopia_cookies_and_cream.jpg", order: [{ name: "Cookies & Cream" }, { name: "Brookie" }] },
  { id: "olaika", what: "Pizza and burgers", photo: "/items/olaika_classic_pepperoni.jpg", order: [{ name: "Classic Burger" }] },
  { id: "theburg", what: "Tacos and Latin plates", photo: "/items/theburg_pastor.jpg", order: [{ name: "Pastor", qty: 3 }] },
  { id: "themilkparlor", what: "Baskets and sandwiches", photo: "/items/themilkparlor_chicken_tender_basket.jpg", order: [{ name: "Chicken Tender Basket" }] },
];

export interface Place {
  id: string;
  name: string;
  logo: string;
  what: string;
  photo: string;
  order: { label: string; price: number; img: string };
  /** The order's own lines, before they are collapsed into `order.label`
      (Sweetopia's two ice creams, The Burg's three tacos): the unit price,
      the item's photograph and how many. */
  lines: OrderLine[];
}
export interface OrderLine {
  name: string;
  price: number;
  img: string;
  qty: number;
}
/** A line as the order says it: "3 Pastor tacos", or the item's name. */
export const lineLabel = (l: { name: string; qty: number }) => (l.qty > 1 ? `${l.qty} ${l.name} tacos` : l.name);

export const PLACES: Place[] = PLACE_DEFS.map((d): Place | null => {
  const v = venues.find((x) => x.id === d.id);
  if (!v) return null;
  const items = d.order.map((p) => ({ item: itemNamed(d.id, p.name), qty: p.qty ?? 1 }));
  const price = Math.round(items.reduce((s, { item, qty }) => s + item.price * qty, 0) * 100) / 100;
  if (price < MIN_ORDER) return null;
  const lines = items.map(({ item, qty }) => ({ name: item.name, price: item.price, img: item.img ?? asset(d.photo), qty }));
  const label = lines.map(lineLabel).join(" + ");
  return {
    id: d.id,
    name: v.name,
    logo: v.logo,
    what: d.what,
    photo: asset(d.photo),
    order: { label, price, img: items[0]?.item.img ?? asset(d.photo) },
    lines,
  };
}).filter((p): p is Place => p !== null);

export const money = (n: number) => `$${n.toFixed(2)}`;
/** Whole dollars, for prose ("a $12 lunch"). */
export const money0 = (n: number) => `$${Math.round(n)}`;
export const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const Chevron = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* The page's glyphs: one family, a 1.8 line with round caps and joins, drawn
   in the ink of whatever holds them. */
export const Glyph = ({ d, className = "tpp-glyph" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const GLYPHS = {
  /* A price tag. */
  tag: "M3.5 12.6V5a1.5 1.5 0 0 1 1.5-1.5h7.6a1.5 1.5 0 0 1 1.06.44l6.9 6.9a1.5 1.5 0 0 1 0 2.12l-7.6 7.6a1.5 1.5 0 0 1-2.12 0l-6.9-6.9a1.5 1.5 0 0 1-.44-1.06ZM8.5 8.5h.01",
  /* A percent sign. */
  percent: "M19 5 5 19M7 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17 19.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  /* A map pin. */
  pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11ZM12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z",
  /* A star. */
  star: "m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z",
  /* A phone. */
  phone: "M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5ZM11 18h2",
  /* A plate with a fork and a knife. */
  meal: "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM2.5 4v5a1.5 1.5 0 0 0 1.5 1.5V20M4 4v4M21.5 4c-1.4 0-2 1.6-2 4v3h2V20",
  /* A card. */
  card: "M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-9ZM3 10.5h18M7 14.5h3",
  /* A text message. */
  text: "M20 11.5c0 4-3.6 7-8 7-1.1 0-2.2-.2-3.1-.5L4 19.5l1.4-3.6C4.5 14.7 4 13.2 4 11.5c0-4 3.6-7 8-7s8 3 8 7ZM8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01",
  /* A calendar. */
  calendar: "M5 5.5h14A1.5 1.5 0 0 1 20.5 7v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5ZM3.5 10h17M8 3.5v4M16 3.5v4",
  /* Money coming back: an arrow turning back on itself. */
  refund: "M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v3.5H8",
  /* A bell: a reminder (the email before each bill). */
  bell: "M18 15.5V11a6 6 0 0 0-12 0v4.5L4.5 17.5h15L18 15.5ZM10 20.5h4",
  /* An envelope. */
  mail: "M4.5 5.5h15A1.5 1.5 0 0 1 21 7v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17V7a1.5 1.5 0 0 1 1.5-1.5ZM3.5 7.5l8.5 6 8.5-6",
  /* A shield with a tick. */
  shield: "M12 3 5 5.8v5.4c0 4.3 3 8 7 9.3 4-1.3 7-5 7-9.3V5.8L12 3ZM9 12l2 2 4-4.2",
  /* An arrow, left to right. */
  arrow: "M4 12h15M13 6l6 6-6 6",
  /* A padlock: a price held (the student page's "locked in"). */
  lock: "M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5M6 10.5h12a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19v-7A1.5 1.5 0 0 1 6 10.5Z",
  /* A circle with a cross: cancel. */
  cancel: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6",
} as const;

/** Who a shared piece is speaking to: the parent page ("they", "your
 *  student") or the student page ("you"). The parents' words are the
 *  default, so /parents is unchanged. */
export type Audience = "parent" | "student";

/* The $60, an estimate, always with its asterisk and SAVES_NOTE in view. */
export const SAVES = 60;
export const SAVES_NOTE = "*Estimated: about $100 a month of $10+ orders at Plus places earning the $5 credit, plus points.";

/** A tap-to-open tile or row: the picture and short label stay, the
    approved sentence opens under them. */
export function Fold({
  className,
  lead,
  label,
  children,
}: {
  className: string;
  lead: ReactNode;
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className={className}>
      <summary>
        <span className="tpp-fold-lead">
          {lead}
        </span>
        <b className="tpp-fold-label">{label}</b>
        <Chevron />
      </summary>
      <p>{children}</p>
    </details>
  );
}

/** The flat four-piece Plus mark (the app's TapInGlyph). */
export function FlatMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="-0.4790 -1.7502 11.9749 11.9749"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M5.96461 0H8.01572L7.42303 1.69488H5.37196L4.77927 3.38981H2.7282L3.32085 1.69488L3.32891 1.6719L3.32938 1.67159C3.66805 0.746268 4.84127 0 5.96461 0Z"
      />
      <path
        fill="currentColor"
        d="M10.9325 3.38981L10.3398 5.08473H8.28874L8.88144 3.38981H6.83033L7.42303 1.69488H9.50194L9.50217 1.69519C10.6176 1.70766 11.2571 2.46151 10.9325 3.38981Z"
      />
      <path
        fill="currentColor"
        d="M5.05231 8.47458H3.0012L3.5939 6.77966H5.64496L6.23766 5.08477H8.28872L7.69607 6.77966L7.68801 6.80268L7.68755 6.80299C7.34889 7.72827 6.17567 8.47458 5.05231 8.47458Z"
      />
      <path
        fill="currentColor"
        d="M0.0844383 5.08473L0.677134 3.38981H2.7282L2.1355 5.08473H4.18661L3.59392 6.77961H1.51501L1.51478 6.77935C0.399363 6.76688 -0.240155 6.01303 0.0844603 5.08473Z"
      />
    </svg>
  );
}
