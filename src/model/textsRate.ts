import { supabase } from "../supabase";

/* ══ $4.99 FOR LIFE FOR TAPIN TEXTS (first $5.99) (Sam, 16 Nov 2026: "when someone clicks
   on the 'receive marketing from tapin' they do so for an exclusive rate",
   "that exclusive rate would be $5.99 for life - I'll create the policy,
   locked and will never go up") ═════════════════════════════════════════════
   Ticking the checkout's texts box chooses it: the price (model/plus.ts) and
   the checkout (model/checkout.ts) then try this policy ahead of the page's
   and the welcome offer, as they do a page policy. Buying never needs it:
   unticked, the ordinary price applies (TCPA: consent to marketing texts
   can't be a condition of purchase).

   Off until Sam's policy exists: with no id, the box keeps its old words and
   nothing here applies, so the page never promises a rate it can't charge.
   Local dev previews it with ?textspreview. */
/* Sam, 16 Nov 2026: "okay actually let's just do $4.99 for the special offer
   instead: 2220e5ff-12b4-422b-9c18-36be156d4021". */
export const TEXTS_RATE_POLICY: string | null = "2220e5ff-12b4-422b-9c18-36be156d4021";
export const TEXTS_RATE = "$4.99";

const KEY = "tp_plus_texts_rate_v1";

const preview = () =>
  import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("textspreview");

/** Whether the texts rate is on offer at all. */
export const textsRateOn = (): boolean => !!TEXTS_RATE_POLICY || preview();

/** Whether this visitor ticked the box (kept for the tab, past sign-in). */
export function textsRateChosen(): boolean {
  if (!textsRateOn()) return false;
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function chooseTextsRate(on: boolean) {
  try {
    if (on) window.sessionStorage.setItem(KEY, "1");
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* Storage blocked: the box still says it, the price can't follow. */
  }
}

/** The policy to try first, or null. */
export const textsRatePolicy = (): string | null => (TEXTS_RATE_POLICY && textsRateChosen() ? TEXTS_RATE_POLICY : null);

/** Local preview only: the price as the policy would set it. */
export const textsRatePreview = (): boolean => preview() && textsRateChosen();

/** Record the texts consent on the account (shell/authEnv.ts writes it at
 *  sign-in; this is the pay step's box, Sam, 16 Nov 2026: "also show at
 *  checkout where someone can provide those permissions at checkout to get
 *  the cheaper rate"). Unticking withdraws it. Not fatal: the box is the
 *  record of intent and the next sign-in can fill a gap. */
export async function setTextsConsent(on: boolean) {
  try {
    const { error } = await supabase.auth.updateUser({
      data: { marketing_opt_in: on, marketing_opt_in_at: new Date().toISOString() },
    });
    if (error) console.error("Could not save the texts consent", error);
  } catch (e) {
    console.error("Could not save the texts consent", e);
  }
}

/** The texts rate on a parent's gift (Sam, 16 Nov 2026: "add the texts deal to
 *  the parents checkout too"). Built, and OFF until Kiran confirms claim_gift
 *  charges the gift's own cart, forever discount and all: the comment in
 *  ParentCheckout says "the claim rebuilds it for the student", and if it
 *  rebuilds with the welcome offer a parent shown $4.99 for life would pay
 *  $3.99 then $7.99. Flip to true once he does. */
export const GIFT_TEXTS_RATE = false;
