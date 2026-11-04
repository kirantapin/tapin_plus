import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { STRIPE_PUBLISHABLE_KEY } from "../constants";
import { useAuth } from "../context/auth_context";
import { AppCard, appHref } from "./GetTheApp";
import { useEventTracking } from "../context/event_tracking_context";
import { buildPlusCart, createPlusIntent, submitPlusOrder, type PlusCart } from "../model/checkout";
import { nextBillingDate, usd, usePlusPrice, type PlusPrice } from "../model/plus";
import { sendCode, verifyCode } from "./authEnv";
import { PlusSeats } from "./PlusSeats";
import { slideAway } from "./sheetMotion";

/* ══ THE PLUS CHECKOUT (3 Nov 2026) ═════════════════════════════════════════
   Join on any page opens this: openPlusCheckout("where"). It's mounted once
   (<PlusCheckoutMount /> in App), so a page only calls the function.

   Sign in with a phone number, then the charge: what's due today (the signed
   cart's total, model/checkout.ts), what it renews at and when, the consent,
   and the wallet, all on one screen with nothing between them (the
   auto-renewal rules want the terms beside the control that takes money).
   Then done. In the app's look, as the home page is (plus-app.css). */

/* ── The one open sheet, as a tiny store ─────────────────────────────────── */
type Open = { where: string; mode: "join" | "signin" };
let openFrom: Open | null = null;
const listeners = new Set<() => void>();
const set = (next: Open | null) => {
  openFrom = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Opens the checkout. `where` is which Join was tapped, for tracking. */
export const openPlusCheckout = (where: string) => set({ where, mode: "join" });

/** Opens the same sheet to sign in only: the number, the code, then it
 *  closes (Sam, 4 Nov 2026: "there needs to be a sign in and sign out option
 *  on this page"). A member's page then shows Get the app. */
export const openPlusSignIn = (where: string) => set({ where, mode: "signin" });

/** Mounted once near the root. */
export function PlusCheckoutMount() {
  const open = useSyncExternalStore(subscribe, () => openFrom);
  return open ? (
    <PlusCheckoutSheet key={`${open.mode}-${open.where}`} where={open.where} signInOnly={open.mode === "signin"} onClose={() => set(null)} />
  ) : null;
}

/* ── The sheet ───────────────────────────────────────────────────────────── */
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TERMS_URL = "https://go.tapin.app/terms-and-conditions";
const PRIVACY_URL = "https://go.tapin.app/privacy-policy";

function PlusCheckoutSheet({ where, signInOnly = false, onClose }: { where: string; signInOnly?: boolean; onClose: () => void }) {
  const { userSession, accessToken, subscribed } = useAuth();
  const { track } = useEventTracking();
  const price = usePlusPrice();
  const [paid, setPaid] = useState<string | null>(null);
  /* What the server says is due today, once the pay step has asked. Someone
     who has had Plus before pays the full month, with no welcome price, so
     the header follows the server and stops promising the first month (Sam,
     3 Nov 2026: "if im trying to purchase this again, after having cancelled,
     it shouldn't say $3.99 for first month"). */
  const [dueCents, setDueCents] = useState<number | null>(null);
  const [signInStage, setSignInStage] = useState<"phone" | "code">("phone");
  const sheet = useRef<HTMLDivElement | null>(null);
  const layer = useRef<HTMLDivElement | null>(null);
  /* Leaves the way it came: down off the screen on a phone (sheetMotion.ts). */
  const leaving = useRef(false);
  const close = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    slideAway(sheet.current, layer.current, onClose);
  }, [onClose]);

  useEffect(() => {
    track(signInOnly ? "plus_signin_opened" : "checkout_opened", { where });
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.focus();
    if (!still()) sheet.current?.animate?.([{ transform: "translateY(40px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
    // Once, when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signedIn = !!userSession && !!accessToken;
  /* Signing in only: once the code is right there's nothing more to do here. */
  useEffect(() => {
    if (signInOnly && signedIn) close();
  }, [signInOnly, signedIn, close]);
  /* Local dev only (stripped from builds): ?pckpreview=done shows the screen
     after paying, without signing in or paying. */
  const preview = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("pckpreview") : null;
  const body =
    preview === "done" ? (
      <Done texted />
    ) : userSession === undefined ? null : paid ? (
      <Done texted />
    ) : !signedIn ? (
      <SignIn onStage={setSignInStage} plain={signInOnly} />
    ) : subscribed === true ? (
      <Done />
    ) : (
      <Review accessToken={accessToken} price={price} onPaid={setPaid} onDue={setDueCents} />
    );
  /* Three short steps, shown as three bars, so the way to the end is in
     view from the first screen (Sam, 3 Nov 2026: polish it up to the page's
     design). */
  const done = preview === "done" || !!paid || subscribed === true;
  const step = done ? 4 : !signedIn ? (signInStage === "phone" ? 1 : 2) : 3;
  /* Once joined, the header is the moment: a tick that draws itself and
     "You're in" (or, for someone who already was, "You're a member"), in
     place of "Join Tapin Plus" and a price that no longer applies (Sam, 3 Nov
     2026: polish the post-purchase screen). */
  const doneTitle = paid || preview === "done" ? "You’re in" : "You’re a member";
  const tick = useRef<SVGPathElement | null>(null);
  useEffect(() => {
    const p = tick.current;
    if (!done || !p || still() || typeof p.animate !== "function") return;
    p.animate([{ strokeDashoffset: 20 }, { strokeDashoffset: 0 }], { duration: 420, delay: 120, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
    (p.closest(".pck-tick") as HTMLElement | null)?.animate([{ transform: "scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 380, easing: "cubic-bezier(.34,1.56,.64,1)" });
  }, [done]);

  return createPortal(
    <div ref={layer} className="pck-layer" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="pck-sheet" ref={sheet} role="dialog" aria-modal="true" aria-labelledby="pck-title" tabIndex={-1}>
        <div className="pck-top">
          {/* The title and the town as a chip, no mark (Sam, 3 Nov 2026: "remove
              the tapin logo here, and make it 'Join Tapin Plus' 'blacksburg' in
              a chip"). */}
          {done ? (
            <div className="pck-head pck-head-done">
              <span className="pck-tick" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path ref={tick} d="m6.5 12.5 3.6 3.6 7.4-7.6" pathLength={20} strokeDasharray={20} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <h2 id="pck-title" className="pck-title">
                  {doneTitle}
                </h2>
                <p className="pck-price">Your Tapin Plus membership is active.</p>
              </div>
            </div>
          ) : signInOnly ? (
            <div className="pck-head">
              <h2 id="pck-title" className="pck-title">
                Sign in
              </h2>
              <p className="pck-price">With the number you joined with.</p>
            </div>
          ) : (
            <div className="pck-head">
              <h2 id="pck-title" className="pck-title">
                Join Tapin Plus <span className="pck-town">Blacksburg</span>
              </h2>
              <p className="pck-price tnum">
                {priceLine(price, dueCents)}
              </p>
            </div>
          )}
          <button type="button" className="pck-x" aria-label="Close" onClick={close}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {step < 4 && !signInOnly ? (
          <ol className="pck-steps" aria-label={`Step ${step} of 3`}>
            {["Phone", "Code", "Pay"].map((label, k) => (
              <li key={label} data-on={k + 1 <= step ? "" : undefined} aria-current={k + 1 === step ? "step" : undefined}>
                <span className="pck-sr">{label}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {body}
      </div>
    </div>,
    document.body,
  );
}

/* ══ THE SIGN-UP STEP, THREE WAYS (Sam, 4 Nov 2026: "can you do 3
   /impeccable variations for this before publishing anything") ════════════
   ?pckv=a|b|c|0 picks one on localhost, ?pckstage=code opens on the code
   screen with a sample number (nothing is sent). Production is "b", the
   pick (below).
     a · Sharpened: today's layout, and the three things the best phone
         sign-ins do: the number formats as you type, the code goes in by
         itself at six digits (or when iOS fills it), and a resend unlocks
         after 30 seconds.
     b · Field first: the field and the button lead, so they sit above the
         keyboard; the promises follow as one quiet panel with the spots.
     c · One question: a big centred number, the promises as three chips,
         and the code as six boxes. */
type SignInLook = "0" | "a" | "b" | "c";
const devParam = (k: string) =>
  import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get(k) : null;
/* PICKED (Sam, 4 Nov 2026: "let's do these two"): B's phone step, the
   field and button first, with C's six code boxes. That is "b" now; the
   others stay previewable on localhost (?pckv=a|c, and 0 for the old step). */
const signInLook = (): SignInLook => {
  const v = devParam("pckv");
  return v === "a" || v === "c" || v === "0" ? v : "b";
};

/** "(540) 555-0123", built up as the digits arrive. */
const formatPhone = (d: string) =>
  d.length < 4 ? d : d.length < 7 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;

const RESEND_S = 30;

/* ── Sign in: the number, then the code ──────────────────────────────────── */
function SignIn({ onStage, plain = false }: { onStage: (stage: "phone" | "code") => void; plain?: boolean }) {
  const price = usePlusPrice();
  const { track } = useEventTracking();
  const look = signInLook();
  const better = look !== "0";
  const previewCode = devParam("pckstage") === "code";
  const [digits, setDigits] = useState(previewCode ? "5405550123" : "");
  const [optIn, setOptIn] = useState(false);
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">(previewCode ? "code" : "phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(previewCode ? RESEND_S : 0);
  const phone = `+1${digits}`;
  useEffect(() => onStage(stage), [stage, onStage]);

  /* The resend clock: counts down while the code screen is up. */
  useEffect(() => {
    if (stage !== "code" || wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [stage, wait]);

  const send = async () => {
    const err = await sendCode(phone);
    if (err) {
      track("plus_phone_failed", { error: err });
      setError(err);
      return false;
    }
    return true;
  };

  /* A ref, not the busy state: a typed sixth digit and a Messages fill can
     land in the same tick, and the state would let both through. */
  const verifying = useRef(false);
  const verify = async (value: string) => {
    if (verifying.current || previewCode) return;
    verifying.current = true;
    setBusy(true);
    setError(null);
    // On success the session lands in auth_context and the sheet moves on.
    const err = await verifyCode(phone, value, undefined, optIn);
    verifying.current = false;
    setBusy(false);
    if (err) {
      track("plus_code_failed", { error: err });
      setError(err);
    } else track("plus_code_verified", { auto: better });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (stage === "phone") {
      if (previewCode) return;
      setBusy(true);
      setError(null);
      const ok = await send();
      setBusy(false);
      if (!ok) return;
      /* Each step of the sheet, so a drop-off shows where it happened
         (Grok's audit, 3 Nov 2026). */
      track("plus_phone_submitted", { opt_in: optIn, sign_in_only: plain, look });
      setWait(RESEND_S);
      setStage("code");
      return;
    }
    await verify(code);
  };

  const onCode = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, 6);
    setCode(next);
    /* The sixth digit sends it, typed or filled from Messages. */
    if (better && next.length === 6) void verify(next);
  };

  const resend = async () => {
    if (wait > 0 || busy || previewCode) return;
    setBusy(true);
    setError(null);
    const ok = await send();
    setBusy(false);
    if (ok) {
      track("plus_code_resent", {});
      setWait(RESEND_S);
    }
  };

  const offer = (
    <ul className={`pck-offer${look === "b" ? " pck-offer-quiet" : ""}${look === "c" ? " pck-offer-chips" : ""}`}>
      <li>
        <span className="pck-ico pck-ico-money tnum" aria-hidden="true">$5</span>
        <b>{look === "c" ? "$5 back weekly" : "$5 back every week, every place"}</b>
      </li>
      <li>
        <span className="pck-ico" aria-hidden="true">
          <PhoneGlyph />
        </span>
        <b>{look === "c" ? "Use it today" : "Use it today: app link by text"}</b>
      </li>
      <li>
        <span className="pck-ico" aria-hidden="true">
          <ShieldGlyph />
        </span>
        <b>{look === "c" ? "Money back" : "Money back if you don’t save"}</b>
      </li>
    </ul>
  );
  const seats = <PlusSeats monthly={usd(price?.monthly)} className="pck-seats" />;
  const field = (
    <>
      <label className="pck-sr" htmlFor="pck-phone">Phone number</label>
      <div className={`pck-field${look === "c" ? " pck-field-big" : ""}`}>
        <span className="pck-cc">+1</span>
        <input
          id="pck-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="(540) 555-0123"
          value={better ? formatPhone(digits) : digits}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").replace(/^1/, "").slice(0, 10))}
          autoFocus
        />
      </div>
    </>
  );
  const consent = plain ? (
    <p className="pck-fine">We’ll text you a code. Msg &amp; data rates may apply.</p>
  ) : (
    <>
      {/* Marketing texts are optional and unticked: consent to them can't be
          a condition of buying (TCPA). */}
      <label className="pck-check">
        <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
        <span>Text me Tapin offers (optional)</span>
      </label>
      <p className="pck-fine">We text a code now and the app link after. Msg &amp; data rates may apply.</p>
    </>
  );
  const sendBtn = (
    <button type="submit" className="pck-cta" disabled={digits.length !== 10 || busy}>
      {busy ? "Sending…" : better ? "Continue" : "Send code"}
    </button>
  );

  return (
    <form className={`pck-body pck-look-${look}`} onSubmit={submit}>
      {stage === "phone" ? (
        plain ? (
          <>
            {field}
            {consent}
            {sendBtn}
          </>
        ) : look === "b" ? (
          <>
            {/* B · the ask first, so the field and button sit above the
                keyboard; what you get follows as one quiet panel. */}
            {field}
            {sendBtn}
            {consent}
            <div className="pck-why">
              {offer}
              {seats}
            </div>
          </>
        ) : look === "c" ? (
          <>
            {/* C · one question, asked big. */}
            {offer}
            <p className="pck-ask">What’s your number?</p>
            {field}
            {consent}
            {sendBtn}
            {seats}
          </>
        ) : (
          <>
            {/* THE OFFER, IN HORMOZI'S ORDER (Sam, 3 Nov 2026), one short line
                each; the proof line is the page's to say. */}
            {offer}
            {seats}
            {field}
            {consent}
            {sendBtn}
          </>
        )
      ) : (
        <>
          <p className="pck-lede">
            {better ? (
              <>
                Enter the code we texted to <b className="tnum">+1 {formatPhone(digits)}</b>
              </>
            ) : (
              <>
                We sent a 6-digit code to +1 {digits}.{plain ? "" : " Then it’s one tap with Apple Pay or Google Pay."}
              </>
            )}
          </p>
          {look === "c" || look === "b" ? (
            /* Six boxes over one real field, so Messages can still fill it. */
            <div className="pck-otp">
              <input
                id="pck-code"
                aria-label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => onCode(e.target.value)}
                autoFocus
              />
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="pck-otp-box tnum" data-on={i === code.length ? "" : undefined} aria-hidden="true">
                  {code[i] ?? ""}
                </span>
              ))}
            </div>
          ) : (
            <>
              <label className="pck-label" htmlFor="pck-code">Code</label>
              <div className="pck-field">
                <input
                  id="pck-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={better ? "6 digits" : undefined}
                  value={code}
                  onChange={(e) => onCode(e.target.value)}
                  autoFocus
                />
              </div>
            </>
          )}
          <button type="submit" className="pck-cta" disabled={code.length < 6 || busy}>
            {busy ? "Checking…" : better ? "Verify" : "Continue"}
          </button>
          {better ? (
            <p className="pck-code-links">
              <button type="button" className="pck-link" disabled={wait > 0 || busy} onClick={resend}>
                {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
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
                Change number
              </button>
            </p>
          ) : (
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
          )}
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

/** The header's price: the welcome line, unless the server says today's
 *  charge is something else (a returning member pays the full month). */
function priceLine(price: PlusPrice | null, dueCents: number | null) {
  /* It says it renews, from the first step (the UX audit's one failed
     journey, 4 Nov 2026: "never says the membership renews"). */
  /* "renews at" says it renews in two words, where "then $7.99/mo until you
     cancel" took a second line and left "cancel" alone on it (Sam, 4 Nov
     2026: "/impeccable polish"). The pay step keeps the full terms. */
  const welcome = `${usd(price?.first)} first month, renews at ${usd(price?.monthly)}/mo`;
  if (!price || dueCents === null) return welcome;
  const today = dueCents / 100;
  if (today === price.first) return welcome;
  if (today === price.monthly) return `${usd(price.monthly)}/mo, renews monthly`;
  return `${usd(today)} today, renews at ${usd(price.monthly)}/mo`;
}

function Review({
  accessToken,
  price,
  onPaid,
  onDue,
}: {
  accessToken: string;
  price: PlusPrice | null;
  onPaid: (orderId: string) => void;
  onDue?: (cents: number) => void;
}) {
  const [cart, setCart] = useState<PlusCart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { track } = useEventTracking();
  /* The pay step on screen with its price: InitiateCheckout for Meta
     (context/meta_pixel.ts). Once per price. */
  const shownFor = useRef<number | null>(null);
  useEffect(() => {
    if (!cart || !price || shownFor.current === cart.dueTodayCents) return;
    shownFor.current = cart.dueTodayCents;
    track("plus_pay_shown", { amount_cents: cart.dueTodayCents });
  }, [cart, price, track]);
  useEffect(() => {
    let live = true;
    setCart(null);
    setError(null);
    buildPlusCart(accessToken)
      .then((c) => {
        if (!live) return;
        setCart(c);
        onDue?.(c.dueTodayCents);
      })
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
      {/* Sam, 3 Nov 2026: "The pay flow should say they get a text to
          download the tapin app after they subscribe". One line each, above
          the consent, so the terms stay right by the button that charges. */}
      <ul className="pck-offer pck-offer-tight">
        <li>
          <span className="pck-ico" aria-hidden="true">
            <PhoneGlyph />
          </span>
          <b>Use it today: app link by text</b>
        </li>
        <li>
          <span className="pck-ico" aria-hidden="true">
            <ShieldGlyph />
          </span>
          <b>Money back if you don’t save</b>
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
      // PostHog keeps `purchase`; Meta gets only Subscribe (context/meta_pixel.ts).
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
        onReady={({ availablePaymentMethods }) => {
          setNoWallet(!availablePaymentMethods);
          /* Whether a wallet showed, and where (Grok's audit, 3 Nov 2026:
             Apple Pay is usually missing inside Instagram's browser). */
          track(availablePaymentMethods ? "plus_wallet_ready" : "plus_wallet_unavailable", {
            in_app_browser: typeof navigator !== "undefined" && /Instagram|FBAN|FBAV|FB_IAB/i.test(navigator.userAgent),
            ...(availablePaymentMethods ?? {}),
          });
        }}
        onClick={(event) => event.resolve()}
        onConfirm={onConfirm}
      />
      {noWallet ? <p className="pck-fine">Joining needs Apple Pay or Google Pay. Open this page on your phone to join.</p> : null}
      {error ? <p className="pck-error" role="alert">{error}</p> : null}
    </div>
  );
}

/* ── After ───────────────────────────────────────────────────────────────── */
/* Plus is used and managed in the Tapin app, so the end of the checkout is
   the app (shell/GetTheApp.tsx): the card to download it, and the same place
   for managing the membership (Sam, 3 Nov 2026: "a link to manage their
   membership on the tapin plus confirmation page"). */

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m8.8 12.2 2.2 2.2 4.4-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="7" y="3" width="10" height="18" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.5 17.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Done({ texted = false }: { texted?: boolean }) {
  return (
    <div className="pck-body pck-done-body" role="status">
      {/* The one thing left to do (Sam, 3 Nov 2026: "right after someone
          pays, the modal would have a card for them to download"). */}
      <AppCard
        where={texted ? "checkout_paid" : "checkout_member"}
        line="Sign in with this same number. Your $5 back and 15% off are waiting."
        note={texted ? "We’ve also texted you the link." : undefined}
        enter
      />
      <a className="pck-manage" href={appHref()} target="_blank" rel="noopener noreferrer">
        Manage your membership in the app
      </a>
    </div>
  );
}
