/* ══ THE PLUS CHECKOUT, AGAINST THE REAL BUNDLE (3 Nov 2026) ══════════════════
   The app's own steps, as plain calls (it has a cart class; this needs one
   item): tapin_verify_order builds and signs a cart holding Plus, a promo link's
   offer or the welcome offer applied if this user can have it; create_intent makes the payment
   for exactly that cart; the wallet confirms it; submit_order records the
   purchase and the subscription. What's charged is the signed cart's total,
   never a figure on the page. Mirrors the app's use_plus_checkout.ts and
   utils/purchase.ts. */

import { supabase } from "../supabase";
import { TAPIN_ID, fetchPlusBundle, welcomeOfferId, type DiscountDuration } from "./plus";
import { loadPlusLink } from "./link";

const GENERIC_ERROR = "Something went wrong. Please try again.";

/** A cart the backend built and signed. Its fields go back to it verbatim. */
export interface PlusCart {
  cart: unknown[];
  dealEffect: unknown;
  cartResults: { totalPrice: number } & Record<string, unknown>;
  token: string;
  /** What the cart costs today, in cents: the first invoice. */
  dueTodayCents: number;
  /** TapIn's Stripe account (the platform's own). */
  accountId: string;
  /** The promo link whose offer the cart holds, for the order's attribution. */
  linkId: string | null;
  /** How long the cart's deal lasts (its added item's), so the terms shown
   *  are the ones charged: renewals at today's price until it ends. */
  discountDuration: DiscountDuration;
}

/** The backend's own message where it gave one (already a member, an offer
 *  used before), else ours. */
export async function messageOf(error: unknown): Promise<string> {
  const res = (error as { context?: Response } | null)?.context;
  if (!res?.clone) return GENERIC_ERROR;
  try {
    const body = await res.clone().json();
    if (typeof body?.error === "string" && body.error) return body.error;
  } catch {
    /* Not JSON. */
  }
  return GENERIC_ERROR;
}

type VerifyRequest =
  | { type: "add_policy"; content: { policy_id: string; bundle_id: null; userPreferences: null; link_id: string | null } }
  | { type: "add_item"; content: { id: string } };

/** One tapin_verify_order call on an empty cart: the signed cart, or the
 *  reason it was refused. */
async function verify(
  accessToken: string,
  request: VerifyRequest,
): Promise<
  { cart: Omit<PlusCart, "dueTodayCents" | "accountId" | "linkId" | "discountDuration"> } | { error: string }
> {
  const { data, error } = await supabase.functions.invoke("tapin_verify_order", {
    body: {
      cart: [],
      userDealEffect: { addedItems: [], modifiedItems: [], wholeCartModification: [] },
      restaurant_id: TAPIN_ID,
      cartResults: null,
      userAccessToken: accessToken,
      request,
      jwtToken: null,
    },
  });
  if (error) return { error: await messageOf(error) };
  if (data?.error) return { error: data.error };
  const signed = data?.data;
  if (!signed?.jwtToken || !signed.payload?.cart?.length) return { error: GENERIC_ERROR };
  return {
    cart: {
      cart: signed.payload.cart,
      dealEffect: signed.payload.dealEffectPayload,
      cartResults: signed.payload.cartResultsPayload,
      token: signed.jwtToken,
    },
  };
}

/** A signed cart holding Plus for whoever `accessToken` belongs to: with a
 *  promo link's offer (model/link.ts), else the welcome offer, else at full
 *  price when each is refused (used before, ended, or not in this
 *  environment). Throws with a message to show. */
export async function buildPlusCart(accessToken: string): Promise<PlusCart> {
  const [plus, link, tapIn] = await Promise.all([
    fetchPlusBundle(),
    loadPlusLink(),
    supabase
      .from("restaurants")
      .select("payment_account_id")
      .eq("id", TAPIN_ID)
      .single<{ payment_account_id: string }>()
      .then(({ data, error }) => {
        if (error || !data?.payment_account_id) throw error ?? new Error("TapIn has no payment account");
        return data;
      }),
  ]);
  const offer = (policyId: string, linkId: string | null) =>
    verify(accessToken, {
      type: "add_policy",
      content: { policy_id: policyId, bundle_id: null, userPreferences: null, link_id: linkId },
    });
  const linked = link ? await offer(link.policyId, link.linkId) : null;
  const offered =
    linked && "cart" in linked ? linked : welcomeOfferId ? await offer(welcomeOfferId, null) : null;
  const built =
    offered && "cart" in offered
      ? offered
      : await verify(accessToken, { type: "add_item", content: { id: plus.bundle_id } });
  if ("error" in built) throw new Error(built.error);
  return {
    ...built.cart,
    dueTodayCents: Math.round(built.cart.cartResults.totalPrice * 100),
    accountId: tapIn.payment_account_id,
    linkId: built === linked ? link!.linkId : null,
    discountDuration:
      (built.cart.dealEffect as { addedItems?: { details?: { discountDuration?: DiscountDuration } }[] })
        ?.addedItems?.[0]?.details?.discountDuration ?? null,
  };
}

/** The payment for the cart: a PaymentIntent's secret to confirm, or for a
 *  free first period a SetupIntent's, which saves the card. Throws with a
 *  message to show. */
export async function createPlusIntent(
  cart: PlusCart,
  accessToken: string,
): Promise<{ clientSecret: string; intent: "payment" | "setup" }> {
  const { data, error } = await supabase.functions.invoke("create_intent", {
    body: {
      amount: cart.dueTodayCents,
      currency: "usd",
      accountId: cart.accountId,
      userCartResults: cart.cartResults,
      restaurant_id: TAPIN_ID,
      cart: cart.cart,
      userDealEffect: cart.dealEffect,
      token: cart.token,
      userAccessToken: accessToken,
    },
  });
  if (error || !data?.client_secret) {
    console.error("create_intent failed", error);
    throw new Error(await messageOf(error));
  }
  return { clientSecret: data.client_secret, intent: data.intent === "setup" ? "setup" : "payment" };
}

/** Records the confirmed purchase: the order, and the membership with it.
 *  Verified by the intent's id, the client secret's part before "_secret_".
 *  Throws once the charge is through but recording failed. */
export async function submitPlusOrder(
  cart: PlusCart,
  accessToken: string,
  clientSecret: string,
  sessionVars: Record<string, unknown> = {},
): Promise<{ orderId: string }> {
  const id = clientSecret.split("_secret_")[0];
  const { data, error } = await supabase.functions.invoke("submit_order", {
    body: {
      userAccessToken: accessToken,
      restaurant_id: TAPIN_ID,
      totalWithTip: cart.dueTodayCents,
      cart: cart.cart,
      userDealEffect: cart.dealEffect,
      userCartResults: cart.cartResults,
      token: cart.token,
      paymentData: {
        accountId: cart.accountId,
        ...(id.startsWith("seti_") ? { setupIntentId: id } : { paymentIntentId: id }),
        additionalOrderData: {},
      },
      sendToKitchen: false,
      // The link whose offer was bought, as the app's link_id.
      sessionVars: { ...sessionVars, ...(cart.linkId && { link_id: cart.linkId }) },
    },
  });
  if (error || !data || data.error || !data.order_id) {
    console.error("submit_order failed", error ?? data?.error);
    throw new Error("Your payment went through, but we couldn't finish setting up your membership.");
  }
  return { orderId: data.order_id };
}
