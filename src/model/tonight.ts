import type { MenuItem } from "./menu";

/**
 * Tonight — what is on at the places, as the app would show it.
 *
 * Sam, 15 Sep 2026: "I'd like for fake event tickets or cover charges to
 * surface so that people can see what's happening in their town that night.
 * If they wanted to purchase cover, line skip, or purchase food or drink,
 * they can do all of that through the app."
 *
 * ══ EVERY LISTING HERE IS AN EXAMPLE, AND SAYS SO ══════════════════════════
 * No venue has told us what is on tonight, and a night at a real bar with a
 * real price on it is a claim about that bar (TRUTH §10). So each listing
 * carries the deck's own "Example" tag on the card, and the strip's head says
 * real listings come from the places. The venues are chosen by what the
 * record already says about them: The Milk Parlor is the cover venue (its
 * own room; The Burg's cover is sold through LineLeap and is never ours),
 * Olaika is the tickets venue (Sam, 14 Sep), and the members-only nights are
 * TapIn's own, from ways-to-use.json, still Coming.
 *
 * ══ DOOR ITEMS ARE NOT FOOD ════════════════════════════════════════════════
 * Cover, a line skip and a ticket ride the same ticket as a coffee, but the
 * 15% and the credit are food-and-drink benefits (§5). AppPlace prices door
 * lines beside quote(), never inside it: they are paid at their price, they
 * earn points ("points on everything"), and they are shown at the door.
 */
export type TonightKind = "cover" | "lineskip" | "tickets" | "night";

export interface TonightListing {
  id: string;
  /** null for TapIn's own night. */
  venueId: string | null;
  kind: TonightKind;
  title: string;
  when: string;
  /** What is for sale at the door, as menu-shaped items (see DOOR). */
  door: string[];
  tag: "Example" | "Coming";
  line: string;
}

/** Door items, menu-shaped so the sheet and the ticket can carry them. */
export const DOOR: Record<string, MenuItem & { kind: TonightKind; venueId: string }> = {
  "door-themilkparlor-cover": {
    id: "door-themilkparlor-cover",
    venueId: "themilkparlor",
    kind: "cover",
    name: "Cover · tonight",
    price: 5,
    desc: "Live music · doors 9pm",
  },
  "door-themilkparlor-lineskip": {
    id: "door-themilkparlor-lineskip",
    venueId: "themilkparlor",
    kind: "lineskip",
    name: "Line skip · tonight",
    price: 5,
    desc: "Walk past the queue",
  },
  "door-olaika-tickets": {
    id: "door-olaika-tickets",
    venueId: "olaika",
    kind: "tickets",
    name: "Ticket · Live DJ",
    price: 8,
    desc: "Member price · 10pm",
  },
};

export const tonight: TonightListing[] = [
  {
    id: "t-milkparlor",
    venueId: "themilkparlor",
    kind: "cover",
    title: "Live music",
    when: "Doors 9pm",
    door: ["door-themilkparlor-cover", "door-themilkparlor-lineskip"],
    tag: "Example",
    line: "Cover and a line skip, paid from your phone",
  },
  {
    id: "t-olaika",
    venueId: "olaika",
    kind: "tickets",
    title: "Live DJ",
    when: "10pm",
    door: ["door-olaika-tickets"],
    tag: "Example",
    line: "Tickets at the member price",
  },
  {
    id: "t-tapin",
    venueId: null,
    kind: "night",
    title: "Members-only night",
    when: "Announced in the app",
    door: [],
    tag: "Coming",
    line: "TapIn throws them, from local bands to touring headliners. You bring someone.",
  },
];

export const isDoorItem = (id: string): boolean => id.startsWith("door-");
export const doorItemsFor = (venueId: string): MenuItem[] =>
  Object.values(DOOR).filter((d) => d.venueId === venueId);
export const doorKind = (id: string): TonightKind | undefined => DOOR[id]?.kind;

/** A pass she already holds, for My Spot. Example, like the rest. */
export interface Pass {
  id: string;
  venueId: string;
  kind: TonightKind;
  title: string;
  qty: number;
  code: string;
}
export const passes: Pass[] = [
  { id: "pass-1", venueId: "themilkparlor", kind: "cover", title: "Cover · tonight", qty: 1, code: "MP 4821" },
  { id: "pass-2", venueId: "themilkparlor", kind: "lineskip", title: "Line skip · tonight", qty: 2, code: "MP 4822" },
  { id: "pass-3", venueId: "olaika", kind: "tickets", title: "Ticket · Live DJ", qty: 1, code: "OL 1177" },
];

/** An order at the kitchen right now — the "we ping you" half of the story.
 *  Example, like the rest; the dish is real. */
export interface KitchenOrder {
  id: string;
  venueId: string;
  itemName: string;
  picks: string;
  /** 0 received · 1 preparing · 2 ready */
  step: 0 | 1 | 2;
}
export const kitchenOrders: KitchenOrder[] = [
  { id: "live-1", venueId: "coffeeholicsva", itemName: "Cappuccino", picks: "Oat · extra shot", step: 1 },
];
