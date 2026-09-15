import { useMemo, useState } from "react";
import {
  Elements,
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

/**
 * Apple Pay / Google Pay buttons wired to the `create_simple_intent` endpoint.
 * Sam's component, dropped in as given. Two things changed and nothing else:
 * the Tailwind class names became this project's own (there is no Tailwind
 * here, so `flex w-full flex-col gap-3` and `text-sm text-red-600` were inert,
 * and red-600 is not in the palette), and this header.
 *
 * ============================================================================
 * MOUNTED ON /reserve AS OF 13 Sep 2026 — AND WHAT HAD TO CHANGE FIRST.
 *
 * IT CHARGES ONCE. `create_simple_intent` builds a PaymentIntent, Elements runs
 * in `mode: "payment"`, and `stripe.confirmPayment` settles it. That is a single
 * charge with no mandate saved and no schedule attached.
 *
 * The extraction's consent sentence promised a recurring one — "then $4.99 a
 * month automatically until you cancel" — and wiring a wallet to that would
 * have made the sentence false at the moment of consent, under Virginia's
 * automatic-renewal statute and ROSCA, on the page whose §4 exists to satisfy
 * them. Sam chose the deposit model instead: one charge today to hold the seat,
 * membership billing authorized separately at launch. THE OFFER NOW MATCHES THE
 * MECHANIC — see the deposit block in src/model/content.ts. Do not restore the
 * recurring sentence without also building the recurring path.
 *
 * STILL TRUE, AND STILL SAM'S TO SUPPLY (src/shell/checkoutEnv.ts):
 *   VITE_STRIPE_PUBLISHABLE_KEY — the PLATFORM's pk_…, not the account's
 *   VITE_STRIPE_ACCOUNT_ID      — the connected account the charge lands on
 * With either missing the checkout keeps its honest disabled state.
 *
 * WALLETS ONLY. There is no card field, so a browser with neither Apple Pay nor
 * Google Pay renders nothing — `onUnavailable` is why /reserve can say so
 * instead of showing an empty gap. And wallets appear only on a domain
 * REGISTERED WITH STRIPE for that connected account: staging.tapin.app has to
 * be added there or the buttons will not draw in production either.
 * ============================================================================
 */
const DEFAULT_PROJECT_REF = "mymygrxcjxauexlvyloh";

const createSimpleIntentUrl = (projectRef: string) =>
  `https://${projectRef}.supabase.co/functions/v1/create_simple_intent`;

/** The endpoint builds every intent in USD, so there is nothing to choose. */
const CURRENCY = "usd";

export interface SimplePayButtonProps {
  /** Amount in cents. Must be a positive integer — the endpoint rejects anything else. */
  amount: number;
  /** The Stripe connected account the charge lands on (`acct_…`). */
  accountId: string;
  /** The platform's publishable key. Stripe.js is scoped to `accountId` below. */
  publishableKey: string;
  /** Supabase project ref that hosts `create_simple_intent` — the subdomain of
   *  its functions URL. Defaults to Tap In's. */
  projectRef?: string;
  /** Runs once the charge has succeeded, with the PaymentIntent id. Awaited —
   *  the wallet stays in its processing state until it resolves. */
  postPurchase: (paymentIntentId: string) => void | Promise<void>;
  /** Called with a human-readable message on any failure. Optional — the
   *  component shows the same message inline either way. */
  onError?: (message: string) => void;
  /** Called when this device offers no wallet at all, so the host app can show
   *  a card form or a different path instead. */
  onUnavailable?: () => void;
  /** Where Stripe sends the user back if a wallet demands a redirect.
   *  Defaults to the current URL. */
  returnUrl?: string;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

/** The inner half — it needs to be under `<Elements>` to use the Stripe hooks. */
const SimplePayForm = ({
  amount,
  accountId,
  projectRef = DEFAULT_PROJECT_REF,
  postPurchase,
  onError,
  onUnavailable,
  returnUrl,
}: Omit<SimplePayButtonProps, "publishableKey">) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);

  const fail = (message: string) => {
    setError(message);
    onError?.(message);
  };

  // Fires once the user has authorized in the wallet sheet. Stripe keeps its
  // own spinner up until this resolves, so there is no busy state to track.
  const onConfirm = async () => {
    if (!stripe || !elements) return;

    setError(null);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        fail(submitError.message || GENERIC_ERROR);
        return;
      }

      const response = await fetch(createSimpleIntentUrl(projectRef), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, accountId }),
      });

      // The endpoint answers 201 with the secret, and 400/500 with `{ error }`.
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.client_secret) {
        console.error("create_simple_intent failed", response.status, data);
        fail(GENERIC_ERROR);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: data.client_secret,
        confirmParams: {
          return_url: returnUrl || window.location.href,
        },
        // Keep the user here for wallets; only redirect-only methods leave.
        redirect: "if_required",
      });

      if (confirmError) {
        fail(confirmError.message || GENERIC_ERROR);
        return;
      }
      if (!paymentIntent) {
        console.error("No payment intent returned from confirmPayment");
        fail(GENERIC_ERROR);
        return;
      }

      // The money has moved by this point. If the host app's follow-up work
      // throws, say so — but never call it a failed payment.
      try {
        await postPurchase(paymentIntent.id);
      } catch (err) {
        console.error("postPurchase failed after a successful charge", err);
        fail("Your payment went through, but we could not finish the order.");
      }
    } catch (err) {
      console.error("Unexpected payment error", err);
      fail(GENERIC_ERROR);
    }
  };

  return (
    <div className="pay">
      <ExpressCheckoutElement
        options={{
          // Wallets only. Everything else Stripe might offer here is a
          // different flow than the one this component promises.
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
        }}
        onReady={({ availablePaymentMethods }) => {
          if (!availablePaymentMethods) onUnavailable?.();
        }}
        onConfirm={onConfirm}
      />

      {error && <p className="t-compact pay-error">{error}</p>}
    </div>
  );
};

const SimplePayButton = ({ publishableKey, amount, ...rest }: SimplePayButtonProps) => {
  // Stripe.js has to be scoped to the same connected account the intent is
  // created on, or confirmation fails with "No such payment_intent".
  const stripePromise = useMemo(
    () =>
      loadStripe(publishableKey, { stripeAccount: rest.accountId }).catch((err) => {
        /* Stripe.js refused to load — a CSP that does not name js.stripe.com,
           an ad blocker, no network. Elements would otherwise sit silent with
           no button and no message (pre-deploy review, 14 Sep 2026), so the
           sheet is told the same thing it is told when no wallet exists. */
        console.error("Stripe.js failed to load", err);
        rest.onUnavailable?.();
        return null;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [publishableKey, rest.accountId],
  );

  // Catch the bad amount here rather than inside the wallet sheet.
  if (!Number.isInteger(amount) || amount <= 0) {
    console.error("SimplePayButton: amount must be a positive integer (cents)");
    return null;
  }

  return (
    <Elements
      // A changed amount needs a fresh Elements instance, not an updated one.
      key={amount}
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount,
        currency: CURRENCY,
        appearance: { theme: "stripe", variables: { borderRadius: "12px" } },
      }}
    >
      <SimplePayForm amount={amount} {...rest} />
    </Elements>
  );
};

export default SimplePayButton;
