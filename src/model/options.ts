import type { MenuItem } from "./menu";

/**
 * A dish's options, and a line of an order.
 *
 * ══ THE OPTIONS ARE EXAMPLES, AND SAY SO ═══════════════════════════════════
 * The frozen menu extraction carries names, prices, descriptions and
 * photographs — and no modifier groups. The real storefront asks for choices
 * before a dish goes in ("1. Choose Bagel", "Extra Add On +$0.50"), and Sam
 * approved a preview that shows that gesture (mockups, 15 Sep 2026). So the
 * espresso drinks carry three groups shaped like the storefront's own — size,
 * milk, extras — labelled in the sheet as examples, and every other dish
 * opens with just the note field and a quantity. Nothing here is a claim
 * about what Coffeeholics sells: the sheet prints the sentence, and the
 * groups vanish the moment a real extraction supplies them.
 *
 * ══ WHY THE DELTAS ARE IN CENTS ════════════════════════════════════════════
 * Same reason order.ts totals in cents: 4.25 + 0.75 + 1.00 is 6.000000000000001
 * in floating point and $6.00 on a ticket.
 */
export interface Option {
  id: string;
  label: string;
  /** Added to the dish's price, in cents. 0 renders as "Included". */
  deltaCents: number;
}

export interface OptionGroup {
  id: string;
  label: string;
  select: "single" | "multiple";
  /** Single-select groups with `required` always carry exactly one pick. */
  required?: boolean;
  /** Multiple-select cap; undefined is unlimited. */
  max?: number;
  options: Option[];
  /** Option ids picked when the sheet opens fresh. */
  defaults: string[];
}

export interface OrderLine {
  /** Stable per line, so two of the same dish with different milks stay two lines. */
  key: string;
  itemId: string;
  qty: number;
  /** group id → option ids. */
  picks: Record<string, string[]>;
  note: string;
}

const COFFEE: OptionGroup[] = [
  {
    id: "size",
    label: "Size",
    select: "single",
    required: true,
    defaults: ["s"],
    options: [
      { id: "s", label: "Small · 12 oz", deltaCents: 0 },
      { id: "m", label: "Regular · 16 oz", deltaCents: 75 },
      { id: "l", label: "Large · 20 oz", deltaCents: 125 },
    ],
  },
  {
    id: "milk",
    label: "Milk",
    select: "single",
    required: true,
    defaults: ["whole"],
    options: [
      { id: "whole", label: "Whole", deltaCents: 0 },
      { id: "oat", label: "Oat", deltaCents: 75 },
      { id: "almond", label: "Almond", deltaCents: 75 },
      { id: "skim", label: "Skim", deltaCents: 0 },
    ],
  },
  {
    id: "extras",
    label: "Extras",
    select: "multiple",
    max: 3,
    defaults: [],
    options: [
      { id: "shot", label: "Extra shot", deltaCents: 100 },
      { id: "vanilla", label: "Vanilla", deltaCents: 50 },
      { id: "caramel", label: "Caramel", deltaCents: 50 },
      { id: "whip", label: "Whipped cream", deltaCents: 50 },
    ],
  },
];

/** Which dishes carry the example groups: the espresso section, by its label. */
export const optionsFor = (sectionLabel: string | undefined): OptionGroup[] =>
  sectionLabel && /espresso|coffee|latte/i.test(sectionLabel) ? COFFEE : [];

export const defaultPicks = (groups: OptionGroup[]): Record<string, string[]> =>
  Object.fromEntries(groups.map((g) => [g.id, [...g.defaults]]));

const toCents = (usd: number): number => Math.round(usd * 100);

/** One unit of the dish with its picks, in cents. */
export const unitCents = (item: MenuItem, groups: OptionGroup[], picks: Record<string, string[]>): number =>
  groups.reduce(
    (n, g) =>
      n +
      (picks[g.id] ?? []).reduce(
        (m, id) => m + (g.options.find((o) => o.id === id)?.deltaCents ?? 0),
        0,
      ),
    toCents(item.price),
  );

export const lineTotalCents = (item: MenuItem, groups: OptionGroup[], line: OrderLine): number =>
  unitCents(item, groups, line.picks) * line.qty;

/**
 * "Regular · Oat · Extra shot" — the picks a reader would want to see on the
 * row: every single-select pick that is not the group's default, and every
 * multiple pick. The default size and the default milk are not news.
 */
export const pickSummary = (groups: OptionGroup[], picks: Record<string, string[]>): string =>
  groups
    .flatMap((g) => {
      const ids = picks[g.id] ?? [];
      const chosen = g.select === "single" ? ids.filter((id) => !g.defaults.includes(id)) : ids;
      return chosen
        .map((id) => g.options.find((o) => o.id === id)?.label ?? "")
        .filter(Boolean)
        .map((l) => l.replace(/ · .*$/, ""));
    })
    .join(" · ");

let seq = 0;
export const newLine = (item: MenuItem, groups: OptionGroup[]): OrderLine => ({
  key: `${item.id}-${++seq}`,
  itemId: item.id,
  qty: 1,
  picks: defaultPicks(groups),
  note: "",
});
