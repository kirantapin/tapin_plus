import { useState } from "react";
import {
  Elements,
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { supabase, environment } from "../supabase";
import { STRIPE_PUBLISHABLE_KEY } from "../constants";
import { useAuth } from "../context/auth_context";
import { useEventTracking } from "../context/event_tracking_context";

/**
 * Apple Pay / Google Pay wired to `create_simple_intent` in SUBSCRIPTION mode.
 * Ported from `~/tapin/src/temp_subscription_test/subscription_pay_button.tsx`.
 *
 * ══ WHAT CHANGED ON THE WAY OVER ═══════════════════════════════════════════
 * That app has a `useBottomSheet` toast and a sign-in modal; this one has
 * neither. So failures render inline under the wallet, and "signed out" is
 * handed back to the caller through `onNeedsSignIn` rather than opening a modal
 * this project does not own.
 *
 * ══ PLATFORM ACCOUNT, NOT A CONNECTED ONE ══════════════════════════════════
 * The subscription lives on TapIn's own Stripe account, so there is no
 * `stripeAccount` option here. The deposit flow this replaced charged a
 * CONNECTED account and needed `VITE_STRIPE_ACCOUNT_ID` for it; that file and
 * that variable are both gone. The key comes from `constants.ts`, which is the
 * only thing in this project that reads a Stripe key from the environment.
 *
 * ══ THE THREE OPTIONS BELOW ARE NOT COSMETIC ═══════════════════════════════
 * `mode: "payment"` with an explicit `amount` because no intent exists when the
 * sheet opens (deferred). `setupFutureUsage: "off_session"` because the
 * subscription keeps the card to bill later and the intent says so — Elements
 * has to agree or confirmation fails. `paymentMethodTypes: ["card"]` because a
 * subscription invoice cannot use automatic payment methods; Apple Pay and
 * Google Pay both confirm as a card.
 */

/**
 * Must match the first invoice total — the monthly price plus the early-access
 * invoice item, in cents. Keep in step with SUBSCRIPTION_PRICE_ID and
 * EARLY_ACCESS_PRICE_ID in the edge function.
 *
 * ⚠ 15 Sep 2026: 699 → 399 with `FOUNDING_MONTHLY` in content.ts. 18 Sep 2026:
 * 399 → 499, same way. 23 Sep 2026: 499 → 599. THIS NUMBER IS NOT THE PRICE — it is what Elements is
 * told the sheet will collect, and the real figure is the Stripe price id the
 * edge function charges. If they disagree the wallet shows one amount and the
 * invoice takes another. The Stripe prices must move too.
 *
 * The sandbox figure stays at 200: it is a test amount, not a copy of the
 * price, and nothing outside this file reads it.
 */
const FIRST_INVOICE_TOTAL_CENTS = environment !== "production" ? 200 : 599;

type IntentType = "payment" | "setup";

type SimpleIntentResponse = {
  subscription_id: string;
  client_secret: string;
  intent_type: IntentType;
};

export interface SubscriptionPayButtonProps {
  /** Runs once the first invoice is confirmed. Awaited — the wallet stays in
   *  its processing state until it resolves. */
  onSubscribed: (result: {
    subscriptionId: string;
    intentType: IntentType;
  }) => void | Promise<void>;
  /** Called when the wallet is tapped with no session. The endpoint answers 401
   *  without a token, so the caller must send them to sign in rather than open
   *  a sheet onto a request that cannot succeed. */
  onNeedsSignIn?: () => void;
  /** Called when this device offers no wallet at all. */
  onUnavailable?: () => void;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * Was the failure the endpoint's 409 — this customer already has one?
 *
 * `supabase.functions.invoke` does not surface the status or the body on the
 * error it returns; both hang off `context`, which is the raw `Response`. A
 * FunctionsHttpError with no readable body is treated as NOT a 409, because
 * guessing wrong here hides a real failure behind a reassuring message.
 */
async function isAlreadySubscribed(error: unknown): Promise<boolean> {
  const res = (error as { context?: Response } | null)?.context;
  if (!res || typeof res.status !== "number") return false;
  if (res.status !== 409) return false;
  try {
    const body = (await res.clone().json()) as { error?: string } | null;
    return typeof body?.error === "string"
      ? /already has a subscription/i.test(body.error)
      : true;
  } catch {
    /* A 409 from this endpoint has only one cause today. */
    return true;
  }
}

/** Loaded once — the subscription lives on the platform account. */
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const SubscriptionPayForm = ({
  onSubscribed,
  onNeedsSignIn,
  onUnavailable,
}: SubscriptionPayButtonProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { accessToken, refreshSubscription } = useAuth();
  const { track } = useEventTracking();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Fires once the user has authorized in the wallet sheet, which stays up and
  // spinning until this resolves.
  const onConfirm = async () => {
    if (!stripe || !elements || busy) return;

    setBusy(true);
    setError(null);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || GENERIC_ERROR);
        return;
      }

      const response = await supabase.functions.invoke("create_simple_intent", {
        // The whole request. The customer comes from the token, and everything
        // else about the plan is server-side.
        body: { mode: "subscription", userAccessToken: accessToken },
      });

      if (response.error || !response.data?.client_secret) {
        console.error("create_simple_intent failed", response.error);
        /* ══ ALREADY BOUGHT IS NOT AN ERROR ═══════════════════════════════
           The endpoint answers 409 when this customer already holds a
           subscription. "Something went wrong, try again" is the worst thing
           to say to someone who has in fact paid — they retry, it fails
           identically. Tell them, refresh the flag, and let the caller show
           them the membership instead. `functions.invoke` puts the body on
           `error.context`, so it has to be read back out. */
        if (await isAlreadySubscribed(response.error)) {
          await refreshSubscription();
          return;
        }
        setError(GENERIC_ERROR);
        return;
      }

      const subscription = response.data as SimpleIntentResponse;

      // A SetupIntent has no amount, so it cannot be confirmed against Elements
      // mounted in payment mode. It means the first invoice came to nothing —
      // which contradicts FIRST_INVOICE_TOTAL_CENTS.
      if (subscription.intent_type !== "payment") {
        console.error(
          "Expected a payment intent but the subscription owes nothing now;",
          "FIRST_INVOICE_TOTAL_CENTS disagrees with the server's prices.",
        );
        setError(GENERIC_ERROR);
        return;
      }

      const { paymentIntent, error: confirmError } =
        await stripe.confirmPayment({
          elements,
          clientSecret: subscription.client_secret,
          confirmParams: { return_url: window.location.href },
          redirect: "if_required",
        });

      if (confirmError) {
        setError(confirmError.message || GENERIC_ERROR);
        return;
      }
      if (!paymentIntent) {
        console.error("No payment intent returned from confirmPayment");
        setError(GENERIC_ERROR);
        return;
      }

      track("purchase", {
        subscription_id: subscription.subscription_id,
        payment_intent_id: paymentIntent.id,
        amount_cents: FIRST_INVOICE_TOTAL_CENTS,
        intent_type: subscription.intent_type,
      });

      void supabase.functions
        .invoke("create_simple_intent", {
          body: { mode: "subscription_welcome", userAccessToken: accessToken },
        })
        .then((res) => {
          if (res.error || res.data?.sent === false) {
            console.error("Welcome text was not sent", res.error ?? res.data);
          }
        })
        .catch((err) => console.error("Welcome text threw", err));

      /* The subscription exists now, so the flag the checkout reads is stale.
         Refreshed before the caller's follow-up so a re-render lands on the
         membership rather than back on the wallet. */
      await refreshSubscription();

      // The charge is done. Anything that fails past here is the caller's
      // follow-up, not a failed payment — say so rather than implying a retry.
      try {
        await onSubscribed({
          subscriptionId: subscription.subscription_id,
          intentType: subscription.intent_type,
        });
      } catch (err) {
        console.error("onSubscribed failed after confirmation", err);
        setError("Your subscription went through, but we could not finish up.");
      }
    } catch (err) {
      console.error("Unexpected error confirming the subscription", err);
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ExpressCheckoutElement
        options={{
          paymentMethods: {
            applePay: "always",
            googlePay: "always",
            link: "never",
            amazonPay: "never",
            klarna: "never",
            paypal: "never",
          },
          layout: { maxColumns: 1, maxRows: 2 },
          buttonHeight: 48,
          buttonTheme: { applePay: "black", googlePay: "black" },
        }}
        /* No wallet on this device: the element renders nothing at all, so the
           caller has to be told or the sheet shows a gap where the control
           should be. */
        onReady={({ availablePaymentMethods }) => {
          if (!availablePaymentMethods) onUnavailable?.();
        }}
        onConfirm={onConfirm}
        onClick={async (event) => {
          // No resolve() — Stripe dismisses the sheet (the 1s click rule).
          if (!accessToken) {
            onNeedsSignIn?.();
            return;
          }
          event.resolve();
        }}
      />
      {error ? <p className="t-compact not-live">{error}</p> : null}
    </>
  );
};

const SubscriptionPayButton = (props: SubscriptionPayButtonProps) => (
  <Elements
    stripe={stripePromise}
    options={{
      mode: "payment",
      amount: FIRST_INVOICE_TOTAL_CENTS,
      currency: "usd",
      setupFutureUsage: "off_session",
      paymentMethodTypes: ["card"],
      appearance: { theme: "night", variables: { borderRadius: "12px" } },
    }}
  >
    <SubscriptionPayForm {...props} />
  </Elements>
);

export default SubscriptionPayButton;
