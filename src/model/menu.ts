import { asset } from "../asset";
import menusJson from "../../docs/data/menus.json";

/**
 * The menus, from the frozen production extraction.
 *
 * Every name and every price in here belongs to a real business on Draper Road.
 * Nothing in this module invents, rounds, renames or reprices an item — a made-up
 * sandwich at a real cafe is a claim about that cafe (TRUTH.md §10), and so is a
 * wrong price on a real one.
 *
 * ONE ITEM IN THE EXTRACTION HAS NO PRICE. Coffeeholics' "Fajita Chicken Bagel"
 * carries price 0, which is an artifact of the scrape rather than a free
 * sandwich. Until now no surface rendered a menu, so it was harmless; a merchant
 * page renders all twelve, and "$0.00" beside a real sandwich at a real cafe
 * says that cafe gives it away. `sectionsFor` drops it. It is dropped rather
 * than shown as "—" because a priced list with one unpriced row reads as a
 * rendering fault, and because an item we cannot price is an item we cannot put
 * in a basket and total honestly.
 */

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  /**
   * The merchant's own description. 31 of the 57 items carry one, so a row must
   * read correctly without it — it is texture, not structure.
   */
  desc?: string;
  /**
   * The merchant's own photograph of the dish.
   *
   * These very nearly did not exist. menus.json referenced 57 paths under
   * /items/ and this repo's public/ held only fonts, heroes and logos, so every
   * one was a dead link — which would have meant either 57 broken images or
   * typographic rows. The files were sitting in the same frozen production
   * extraction that produced this data (~/tapin-student-blacksburg/public/items)
   * and had simply not been copied across with the logos and the heroes. All 57
   * matched by exact filename, none missing. They are the merchant's own
   * photography, the same provenance and the same permission as the logos.
   *
   * Optional on the type anyway: a row must survive a missing file, and stock
   * or generated food photography is never a substitute — a picture of a dish
   * a real kitchen does not serve is a claim about that kitchen.
   */
  img?: string;
}

export interface MenuSection {
  label: string;
  items: MenuItem[];
}

interface MenuRecord {
  venue: string;
  sections: MenuSection[];
}

const menus = menusJson as unknown as Record<string, MenuRecord>;

/**
 * A venue's menu, priced items only.
 *
 * Returns [] for a venue with no menu at all. That is a real state, not an
 * error: Sweetopia is a live Plus venue whose menu was never extracted, and the
 * honest answer on its page is to say so rather than to borrow someone else's
 * list. Callers must handle the empty case.
 */
export function sectionsFor(venueId: string): MenuSection[] {
  const record = menus[venueId];
  if (!record) return [];
  return record.sections
    .map((s) => ({
      label: s.label,
      // Narrowed at the boundary to exactly the fields a row may render.
      items: s.items
        .filter((i) => i.price > 0)
        .map(({ id, name, price, desc, img }) => ({ id, name, price, desc, img: img ? asset(img) : undefined })),
    }))
    .filter((s) => s.items.length > 0);
}

export const hasMenu = (venueId: string): boolean => sectionsFor(venueId).length > 0;

/** Every priced item at a venue, flattened. */
export const itemsFor = (venueId: string): MenuItem[] =>
  sectionsFor(venueId).flatMap((s) => s.items);

/**
 * One item by name, for demonstration data that must reference a real dish.
 * Throws rather than returning undefined: a preview that silently renders a
 * missing item is worse than one that fails to build.
 */
export function itemNamed(venueId: string, name: string): MenuItem {
  const found = itemsFor(venueId).find((i) => i.name === name);
  if (!found) throw new Error(`menu: no priced item "${name}" at ${venueId}`);
  return found;
}
