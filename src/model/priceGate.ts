/* ══ THE PRICE AFTER THE NUMBER (Sam, 16 Nov 2026: "Maybe we don't show the
   price until after someone signs in ... that way we capture more phone
   numbers", then "for parents too, we hide the price until the very end")
   ════════════════════════════════════════════════════════════════════════
   On the main students page and /parents the price isn't said until the
   checkout's pay step, after the number is in. Pages that exist to sell a
   price keep saying it (a group's, a place's for-life, an invitation's).
   The page sets this as it renders; the checkout reads it so its own steps
   before the number stay quiet too. */
let hidden = false;
export const setPriceHidden = (on: boolean) => {
  hidden = on;
};
export const priceHidden = () => hidden;

/** The texts rate's teaser, where the price would be (Sam, 16 Nov 2026:
 *  "say yes to tapin texts to unlock an exclusive rate, if they click it,
 *  they see the rate and the compare at rate"; first "37% off for life"). */
export const TEXTS_TEASER = "an exclusive rate";
