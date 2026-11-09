/* ══ GIFTS, AGAINST THE REAL BACKEND (Kiran, 8 Nov 2026) ═════════════════════
   The edge functions repo's gift_plan.md. The parent signs in and builds a
   normal Plus cart (buildPlusCart, model/checkout.ts); create_intent with
   gift: true saves their card (a SetupIntent: nothing is charged); a photo
   goes into the gift-photos bucket, in their own folder; create_gift stores
   the gift and texts the student a link to /gift/{id}.

   The student's page reads the gift with gift_lookup, no sign-in needed.
   They sign in with the number it was sent to, and claim_gift charges the
   parent's saved card and starts their Plus. A gift nobody claims expires
   after 30 days with nothing charged. Every card detail (the note, who it's
   from, the background, the effect, the photo) lives in the gift's metadata. */

import { supabase } from "../supabase";
import { TAPIN_ID } from "./plus";
import { messageOf, type PlusCart } from "./checkout";
import { isDelight, isScene, type Delight, type Gift, type SceneId } from "./gift";

/** What the gift's card shows, stored as the gift's metadata. */
export interface GiftMetadata {
  v: 1;
  /** How it's signed ("Mom"), already resolved (giftWho). */
  from: string;
  /** Null: no note. */
  note: string | null;
  scene: SceneId;
  effect: Delight | null;
  /** The photo's path in the gift-photos bucket, or null. */
  photo: { path: string } | null;
}

/** The gift as its page reads it. */
export interface GiftLookup {
  giftId: string;
  to: string;
  masked: string;
  metadata: Partial<GiftMetadata>;
  /** A link to the photo that works for an hour, or null. */
  photoUrl: string | null;
  state: "open" | "claimed" | "cancelled" | "expired";
  expiresAt: string;
}

/** Saves the payer's card for a gift of the cart: a SetupIntent's secret to
 *  confirm. Nothing is charged until the gift is claimed. Throws with a
 *  message to show. */
export async function saveGiftCard(cart: PlusCart, accessToken: string): Promise<string> {
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
      gift: true,
    },
  });
  if (error || !data?.client_secret) {
    console.error("create_intent (gift) failed", error);
    throw new Error(await messageOf(error));
  }
  return data.client_secret;
}

/** Uploads the gift's photo (a JPEG data URL, made small by giftPhoto.ts)
 *  into the payer's own folder: its path, for the metadata. */
export async function uploadGiftPhoto(userId: string, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("gift-photos")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) {
    console.error("Gift photo upload failed", error);
    throw new Error("Your photo couldn't be uploaded. Please try again.");
  }
  return path;
}

/** Stores the gift once its card is saved, and texts the student. A retry
 *  with the same SetupIntent returns the same gift. Throws with a message
 *  to show. */
export async function createGift(input: {
  cart: PlusCart;
  accessToken: string;
  setupIntentId: string;
  recipientPhone: string;
  recipientFirstName: string;
  metadata: GiftMetadata;
}): Promise<{ giftId: string; expiresAt: string }> {
  const { cart } = input;
  const { data, error } = await supabase.functions.invoke("create_gift", {
    body: {
      restaurant_id: TAPIN_ID,
      cart: cart.cart,
      userDealEffect: cart.dealEffect,
      userCartResults: cart.cartResults,
      token: cart.token,
      userAccessToken: input.accessToken,
      setup_intent_id: input.setupIntentId,
      recipient_phone: input.recipientPhone,
      recipient_first_name: input.recipientFirstName,
      metadata: input.metadata,
    },
  });
  if (error || !data?.gift_id) {
    console.error("create_gift failed", error);
    throw new Error(await messageOf(error));
  }
  return { giftId: data.gift_id, expiresAt: data.expires_at };
}

/** The gift for its page, or null when there's no such gift. Throws when it
 *  couldn't be read (worth a retry). */
export async function lookupGift(giftId: string): Promise<GiftLookup | null> {
  const { data, error } = await supabase.functions.invoke("gift_lookup", {
    body: { gift_id: giftId },
  });
  if (error) {
    const status = (error as { context?: Response }).context?.status;
    if (status === 404) return null;
    throw new Error(await messageOf(error));
  }
  return {
    giftId: data.gift_id,
    to: data.recipient_first_name,
    masked: data.masked_phone,
    metadata: data.metadata ?? {},
    photoUrl: data.photo_url ?? null,
    state: data.state,
    expiresAt: data.expires_at,
  };
}

/** The card the page draws, from a lookup: unknown backgrounds fall back to
 *  maroon, an unknown effect to none. */
export function giftOf(lookup: GiftLookup): Gift {
  const { metadata } = lookup;
  return {
    to: lookup.to,
    from: metadata.from || "Your parent",
    note: metadata.note ?? null,
    masked: lookup.masked,
    scene: isScene(metadata.scene) ? metadata.scene : "maroon",
    photo: lookup.photoUrl,
    effect: isDelight(metadata.effect) ? metadata.effect : null,
  };
}

/** The payer takes back a gift nobody has claimed: nothing was charged.
 *  Throws with the backend's message (claimed, expired). */
export async function revokeGift(giftId: string, accessToken: string): Promise<void> {
  const { error } = await supabase.functions.invoke("revoke_gift", {
    body: { gift_id: giftId, userAccessToken: accessToken },
  });
  if (error) {
    console.error("revoke_gift failed", error);
    throw new Error(await messageOf(error));
  }
}

/** The payer cancels a gifted membership: it ends at the end of the period
 *  they've paid for, and the student is texted. Throws with a message. */
export async function cancelGiftedPlus(ownershipId: string, accessToken: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("manage_subscription", {
    body: { action: "cancel", ownership_id: ownershipId, userAccessToken: accessToken },
  });
  if (error || !data?.success) {
    console.error("Cancelling the gifted membership failed", error ?? data);
    const res = (error as { context?: Response } | null)?.context;
    const body = res?.clone ? await res.clone().json().catch(() => null) : null;
    throw new Error(body?.message || "It couldn’t be cancelled. Please try again.");
  }
}

/** The student claims the gift, signed in with the number it was sent to:
 *  the parent's card is charged and their Plus starts. Throws with the
 *  backend's message (sent to another number, already claimed, expired,
 *  no longer valid, payment didn't go through). */
export async function claimGift(giftId: string, accessToken: string): Promise<{ orderId: string }> {
  const { data, error } = await supabase.functions.invoke("claim_gift", {
    body: { gift_id: giftId, userAccessToken: accessToken },
  });
  if (error || !data?.order_id) {
    console.error("claim_gift failed", error);
    throw new Error(await messageOf(error));
  }
  return { orderId: data.order_id };
}
