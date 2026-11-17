import { asset } from "../asset";

/* ══ TAPIN LITE PLACES (Sam, 12 Nov 2026: "Crumbl cookies just signed,
   they're going to be on Tapin Lite, not tapin plus, which has worse
   benefits. Lite's benefits are separate from plus, and they're not
   consistent") ═══════════════════════════════════════════════════════════════
   Lite isn't sold on its own: "when you pay for Tapin plus, it comes with
   Tapin lite". Each Lite place has its own perks, so they're listed per place
   and never borrowed from Plus (no $5, no 15%, no points unless a place has
   them). Not in docs/data/venues.json, which is the frozen extraction.
   Italiano's joined Lite the same day (Sam, 12 Nov 2026: "Crumbl and
   Italianos would both be on Tapin lite"), with 10% off once a day. */
export type LitePerk = { key: string; b: string; when: string };
export type LitePlace = {
  id: string;
  name: string;
  kind: string;
  logo: string;
  photo: string;
  /** A real item from the place's own photo, for the free-item perk. */
  item?: string;
  /** A round mark (a badge), seated as a circle rather than a tile. */
  round?: boolean;
  /** The perks in one short line, for a card (12 Nov 2026). */
  short: string;
  perks: LitePerk[];
};

export const LITE_PLACES: LitePlace[] = [
  {
    id: "crumbl",
    name: "Crumbl",
    kind: "Cookies",
    logo: asset("logos/crumbl.png"),
    photo: asset("places/crumbl.jpg"),
    item: asset("places/crumbl-choc-chip.jpg"),
    short: "10% off · free cookie with any item",
    /* "10% off every day + Free chocolate chip cookie (one use a day for
       each)". */
    perks: [
      /* "with purchase of any other item" (Sam, 12 Nov 2026). */
      { key: "free", b: "A free chocolate chip cookie", when: "With any other item, once a day" },
      { key: "percent", b: "10% off your order", when: "Once a day" },
    ],
  },
  {
    /* The id venues.json already uses, so its tracking lines up. The new
       "Italiano's of Blacksburg" badge and spread Sam sent (12 Nov 2026),
       not the old "Italiano's Pizza" icon in logos/italianospizza.jpeg. */
    id: "italianospizza",
    name: "Italiano's",
    kind: "Pizza and pasta",
    logo: asset("logos/italianos-ib.png"),
    photo: asset("places/italianos.jpg"),
    round: true,
    short: "10% off, once a day",
    perks: [{ key: "percent", b: "10% off your order", when: "Once a day" }],
  },
  {
    /* Sam, 16 Nov 2026: "playabowls just joined tapin ... free cold brew
       with any purchase. Tapin lite partner", live on Wednesday 25 November
       (shell/LiveSoon.tsx). The round "NJ's original acai shop" badge and
       the bowls spread are the ones Sam sent. No cold brew photo yet, so the
       free perk shows the word in place of the item. */
    id: "playabowls",
    name: "Playa Bowls",
    kind: "Acai bowls and smoothies",
    logo: asset("logos/playabowls.png"),
    photo: asset("places/playabowls.jpg"),
    round: true,
    short: "Free cold brew with any purchase",
    perks: [{ key: "free", b: "A free cold brew", when: "With any purchase" }],
  },
];

export const litePlace = (id: string) => LITE_PLACES.find((p) => p.id === id);
