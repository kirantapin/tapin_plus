import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { STRIPE_PUBLISHABLE_KEY } from "../constants";
import { useAuth } from "../context/auth_context";
import { useEventTracking } from "../context/event_tracking_context";
import { buildPlusCart, createPlusIntent, submitPlusOrder, type PlusCart } from "../model/checkout";
import { nextBillingDate, usd, usePlusPrice, type PlusPrice } from "../model/plus";
import { sendCode, verifyCode } from "./authEnv";

/* ══ THE PLUS CHECKOUT (3 Nov 2026) ═════════════════════════════════════════
   Join on any page opens this: openPlusCheckout("where"). It's mounted once
   (<PlusCheckoutMount /> in App), so a page only calls the function.

   Sign in with a phone number, then the charge: what's due today (the signed
   cart's total, model/checkout.ts), what it renews at and when, the consent,
   and the wallet, all on one screen with nothing between them (the
   auto-renewal rules want the terms beside the control that takes money).
   Then done. In the app's look, as the home page is (plus-app.css). */

/* ── The one open sheet, as a tiny store ─────────────────────────────────── */
let openFrom: string | null = null;
const listeners = new Set<() => void>();
const set = (next: string | null) => {
  openFrom = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Opens the checkout. `where` is which Join was tapped, for tracking. */
export const openPlusCheckout = (where: string) => set(where);

/** Mounted once near the root. */
export function PlusCheckoutMount() {
  const where = useSyncExternalStore(subscribe, () => openFrom);
  return where ? <PlusCheckoutSheet key={where} where={where} onClose={() => set(null)} /> : null;
}

/* ── The sheet ───────────────────────────────────────────────────────────── */
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TERMS_URL = "https://go.tapin.app/terms-and-conditions";
const PRIVACY_URL = "https://go.tapin.app/privacy-policy";

function PlusCheckoutSheet({ where, onClose }: { where: string; onClose: () => void }) {
  const { userSession, accessToken, subscribed } = useAuth();
  const { track } = useEventTracking();
  const price = usePlusPrice();
  const [paid, setPaid] = useState<string | null>(null);
  const sheet = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    track("checkout_opened", { where });
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.focus();
    if (!still()) sheet.current?.animate?.([{ transform: "translateY(40px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
    // Once, when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const body =
    userSession === undefined ? null : paid ? (
      <Done title="You’re in." line="Your Tapin Plus membership is active. Use it in the Tapin app at every Plus place." />
    ) : !userSession || !accessToken ? (
      <SignIn />
    ) : subscribed === true ? (
      <Done title="You’re already a member." line="There’s nothing to pay. Your membership is active." />
    ) : (
      <Review accessToken={accessToken} price={price} onPaid={setPaid} />
    );

  return createPortal(
    <div className="pck-layer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pck-sheet" ref={sheet} role="dialog" aria-modal="true" aria-labelledby="pck-title" tabIndex={-1}>
        <div className="pck-top">
          <h2 id="pck-title" className="pck-title">Join Tapin Plus</h2>
          <button type="button" className="pck-x" aria-label="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {body}
      </div>
    </div>,
    document.body,
  );
}

/* ── Sign in: the number, then the code ──────────────────────────────────── */
function SignIn() {
  const [digits, setDigits] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone = `+1${digits}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    if (stage === "phone") {
      const err = await sendCode(phone);
      setBusy(false);
      if (err) return setError(err);
      setStage("code");
      return;
    }
    // On success the session lands in auth_context and the sheet moves on.
    const err = await verifyCode(phone, code, undefined, optIn);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <form className="pck-body" onSubmit={submit}>
      {stage === "phone" ? (
        <>
          <p className="pck-lede">Sign in with your phone number. Your membership goes on your Tapin account.</p>
          <label className="pck-label" htmlFor="pck-phone">Phone number</label>
          <div className="pck-field">
            <span className="pck-cc">+1</span>
            <input
              id="pck-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="(540) 555-0123"
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").replace(/^1/, "").slice(0, 10))}
              autoFocus
            />
          </div>
          {/* Marketing texts are optional and unticked: consent to them can't
              be a condition of buying (TCPA). */}
          <label className="pck-check">
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
            <span>Text me Tapin offers and news (optional).</span>
          </label>
          <p className="pck-fine">
            We’ll text you a code to sign in, and messages about your membership. Message and data rates may apply.
          </p>
          <button type="submit" className="pck-cta" disabled={digits.length !== 10 || busy}>
            {busy ? "Sending…" : "Send code"}
          </button>
        </>
      ) : (
        <>
          <p className="pck-lede">Enter the 6-digit code we sent to +1 {digits}.</p>
          <label className="pck-label" htmlFor="pck-code">Code</label>
          <div className="pck-field">
            <input
              id="pck-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
            />
          </div>
          <button type="submit" className="pck-cta" disabled={code.length < 6 || busy}>
            {busy ? "Checking…" : "Continue"}
          </button>
          <button
            type="button"
            className="pck-link"
            onClick={() => {
              setStage("phone");
              setCode("");
              setError(null);
            }}
          >
            Use a different number
          </button>
        </>
      )}
      {error ? <p className="pck-error" role="alert">{error}</p> : null}
    </form>
  );
}

/* ── The charge ──────────────────────────────────────────────────────────── */

/** "December 3": when a period from now renews. */
const renewsOn = (price: PlusPrice) =>
  nextBillingDate(price.billing).toLocaleDateString("en-US", { month: "long", day: "numeric" });

function Review({
  accessToken,
  price,
  onPaid,
}: {
  accessToken: string;
  price: PlusPrice | null;
  onPaid: (orderId: string) => void;
}) {
  const [cart, setCart] = useState<PlusCart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setCart(null);
    setError(null);
    buildPlusCart(accessToken)
      .then((c) => live && setCart(c))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [accessToken, attempt]);

  if (error)
    return (
      <div className="pck-body">
        <p className="pck-error" role="alert">{error}</p>
        <button type="button" className="pck-cta" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
      </div>
    );
  if (!cart || !price) return <div className="pck-body pck-wait" aria-busy="true" />;

  const today = cart.dueTodayCents / 100;
  return (
    <div className="pck-body">
      <ul className="pck-rows">
        <li>
          <b>Due today</b>
          <span className="tnum">{usd(today)}</span>
        </li>
        <li>
          <b>Then</b>
          <span className="tnum">{`${usd(price.monthly)} every ${price.period}, from ${renewsOn(price)}`}</span>
        </li>
      </ul>
      <p className="pck-consent">
        {`By joining, you agree to pay ${usd(today)} today for your first ${price.period}, then ${usd(price.monthly)} every ${price.period} automatically until you cancel. Cancel anytime in the Tapin app, before ${renewsOn(price)} to avoid the next charge. `}
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">Terms</a>
        {" · "}
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Privacy</a>
      </p>
      <Elements
        key={cart.dueTodayCents}
        stripe={stripePromise}
        options={{
          // The first invoice, or for a free first period only saving the card.
          ...(cart.dueTodayCents > 0
            ? { mode: "subscription" as const, amount: cart.dueTodayCents }
            : { mode: "setup" as const }),
          currency: "usd",
          appearance: { theme: "stripe", variables: { borderRadius: "14px" } },
        }}
      >
        <Wallet cart={cart} accessToken={accessToken} onPaid={onPaid} />
      </Elements>
    </div>
  );
}

function Wallet({ cart, accessToken, onPaid }: { cart: PlusCart; accessToken: string; onPaid: (orderId: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { refreshSubscription } = useAuth();
  const { track } = useEventTracking();
  const [error, setError] = useState<string | null>(null);
  const [noWallet, setNoWallet] = useState(false);
  const busy = useRef(false);

  const onConfirm = useCallback(async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements || busy.current) return;
    busy.current = true;
    setError(null);
    // Until the confirm call, the wallet sheet is ours to dismiss on failure;
    // after it, Stripe's.
    let confirming = false;
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message);
      // A fresh signed cart, so an expired one or a changed price can't be
      // charged; the wallet was shown the old total, so a change stops here.
      const fresh = await buildPlusCart(accessToken);
      if (fresh.dueTodayCents !== cart.dueTodayCents) throw new Error("The price changed. Close this and try again.");
      const { clientSecret, intent } = await createPlusIntent(fresh, accessToken);
      const confirmOptions = {
        elements,
        clientSecret,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required" as const,
      };
      confirming = true;
      const { error: confirmError } =
        intent === "setup" ? await stripe.confirmSetup(confirmOptions) : await stripe.confirmPayment(confirmOptions);
      if (confirmError) throw new Error(confirmError.message);
      const { orderId } = await submitPlusOrder(fresh, accessToken, clientSecret);
      const props = { order_id: orderId, amount_cents: fresh.dueTodayCents };
      track("purchase", props);
      track("subscription_purchase", props);
      // Paid first, so the sheet says "You're in", not "already a member".
      onPaid(orderId);
      void refreshSubscription();
    } catch (e) {
      console.error("Plus checkout failed", e);
      if (!confirming) event.paymentFailed({ reason: "fail" });
      setError((e as Error).message || "Something went wrong. Please try again.");
    } finally {
      busy.current = false;
    }
  }, [stripe, elements, accessToken, cart.dueTodayCents, track, refreshSubscription, onPaid]);

  return (
    <div className="pck-pay">
      <ExpressCheckoutElement
        options={{
          paymentMethods: { applePay: "always", googlePay: "always", link: "never", amazonPay: "never", klarna: "never", paypal: "never" },
          layout: { maxColumns: 1, maxRows: 2 },
          buttonHeight: 48,
          buttonTheme: { applePay: "black", googlePay: "black" },
        }}
        // No wallet on this device: the element renders nothing, so say why.
        onReady={({ availablePaymentMethods }) => setNoWallet(!availablePaymentMethods)}
        onClick={(event) => event.resolve()}
        onConfirm={onConfirm}
      />
      {noWallet ? <p className="pck-fine">Joining needs Apple Pay or Google Pay. Open this page on your phone to join.</p> : null}
      {error ? <p className="pck-error" role="alert">{error}</p> : null}
    </div>
  );
}

/* ── After ───────────────────────────────────────────────────────────────── */
/* Where the membership is used: the app (/in is Early Access's page). */
const TAPIN_APP = "https://www.tapin.app/discovery?zone=blacksburg";

function Done({ title, line }: { title: string; line: string }) {
  return (
    <div className="pck-body" role="status">
      <p className="pck-done">{title}</p>
      <p className="pck-lede">{line}</p>
      <a className="pck-cta" href={TAPIN_APP}>
        Open Tapin
      </a>
    </div>
  );
}
