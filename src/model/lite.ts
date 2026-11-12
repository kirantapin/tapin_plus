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
    perks: [{ key: "percent", b: "10% off your order", when: "Once a day" }],
  },
];

export const litePlace = (id: string) => LITE_PLACES.find((p) => p.id === id);
