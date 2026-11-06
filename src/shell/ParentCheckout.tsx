import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import { STRIPE_PUBLISHABLE_KEY } from "../constants";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import {
  confirmParentCheckout,
  keptUtm,
  parentMock,
  startParentCheckout,
  toE164,
  type ParentCheckoutStarted,
  type ParentConfirmed,
} from "../model/parents";
import { lockScroll } from "./scrollLock";
import { islandAvoidKeyboard, islandClose, islandOpen, islandOrigin, islandTrackHeight, settle, type IslandOrigin, type IslandParts } from "./island";

/* ══ THE PARENT CHECKOUT (Sam, 5 Nov 2026; docs/parents/API.md) ═════════════
   A parent signs their student up and pays, in one sheet over /parents: a
   bottom sheet on a phone, a card in the middle on a computer.

     1. The form: the student's first name and number (typed twice, Sam:
        "we can have them type the number twice yeah"), then the parent's
        name, email and, if they like, their mobile. From an Ask a parent
        link the student is already known, so it shows who's covered.
     2. The charge: the parent is charged now ($3.99 the first month, then
        $7.99/month), with the terms right by the button that takes the
        money (Virginia's auto-renewal rule). Stripe's Payment Element, so a
        card always works and Apple Pay or Google Pay shows where it can.
     3. Done: their Plus is on, and the text has gone.

   Every backend call goes through model/parents.ts. With ?parentmock (local
   dev only) there is no PaymentIntent, so a stand-in card panel takes the
   Payment Element's place and Pay goes straight to the confirm. Copy is
   docs/parents/COPY.md, with its "As built: charge at checkout" lines. */

type Ask = { token: string; student_first_name: string; masked_phone: string };

/* The expanding container (Sam, 6 Nov 2026: "would we not be able to use the
   same expanding and collapsing parent container animation we use here on
   the main tapin plus.tapin.app? I liked the way this expanded and
   collapsed"): the sheet grows out of the white plate that holds "Sign up my
   student" (the dock on a phone, marked data-island-origin; else the button
   that was tapped) and shrinks back into it, with shell/island.ts doing
   exactly what it does for Join on the student page. `from` is the button
   that was tapped. */
export default function ParentCheckout({
  open,
  onClose,
  ask,
  from = null,
}: {
  open: boolean;
  onClose: () => void;
  ask: Ask | null;
  from?: HTMLElement | null;
}) {
  /* Mounted while open and while it leaves; each opening starts clean. */
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [session, setSession] = useState(0);
  useEffect(() => {
    if (open) {
      setClosing(false);
      setMounted((was) => {
        if (!was) setSession((n) => n + 1);
        return true;
      });
    } else if (mounted) setClosing(true);
    // On open changing only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!mounted) return null;
  return (
    <Sheet
      key={session}
      ask={ask}
      from={from}
      closing={closing}
      onGone={() => {
        setMounted(false);
        setClosing(false);
      }}
      onClose={onClose}
    />
  );
}

/* ── Prices, until the server says ───────────────────────────────────────── */
/* The welcome offer (API.md): shown in the header before the start call;
   the terms and the button use what parent_checkout_start returns. */
const OFFER = { first_cents: 399, monthly_cents: 799 };
const usd = (cents: number) => (cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`);

const TERMS_URL = "https://go.tapin.app/terms-and-conditions";
const PRIVACY_URL = "https://go.tapin.app/privacy-policy";

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const wide = () => typeof window !== "undefined" && !!window.matchMedia?.("(min-width: 640px)").matches;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/* Stripe.js loads when a real pay step first needs it, not with the page. */
let stripeOnce: Promise<Stripe | null> | null = null;
const getStripe = () => (stripeOnce ??= loadStripe(STRIPE_PUBLISHABLE_KEY));

/** "(540) 555-0123", built up as the digits arrive. */
const formatPhone = (d: string) =>
  d.length < 4 ? d : d.length < 7 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
/** Up to 10 digits from what was typed or pasted (a leading 1 dropped). */
const digitsOf = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  return (d.length === 11 && d.startsWith("1") ? d.slice(1) : d).slice(0, 10);
};
const maskDigits = (d: string) => `•••${d.slice(-4)}`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const possessive = (name: string) => `${name}’s`;

/* The student, then you, then the card, one at a time (Sam, 5 Nov 2026:
   "we should have these two at separate steps of the checkout process"). An
   ask link already knows the student, so it starts at "you". */
type Step = "student" | "you" | "pay" | "done";

/* Once a card has been charged, that checkout is kept for the page's life,
   so closing and reopening the sheet picks it up again (it only needs
   confirming) instead of starting a new one that would charge again. */
let charged: { started: ParentCheckoutStarted; paymentIntent: string; who: string; masked: string } | null = null;
type Field = "student" | "phone" | "confirm" | "name" | "email" | "mobile";

function Sheet({
  ask,
  from,
  closing,
  onGone,
  onClose,
}: {
  ask: Ask | null;
  from: HTMLElement | null;
  closing: boolean;
  onGone: () => void;
  onClose: () => void;
}) {
  const { track } = useEventTracking();
  const source = ask ? "ask_link" : "parent_page";
  const mock = parentMock();

  const [step, setStep] = useState<Step>(() => (charged ? "pay" : ask ? "you" : "student"));
  const [student, setStudent] = useState("");
  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [started, setStarted] = useState<ParentCheckoutStarted | null>(() => charged?.started ?? null);
  /* The card went through: no going back to change details. */
  const [paid, setPaid] = useState(() => !!charged);
  const [done, setDone] = useState<ParentConfirmed | null>(null);
  /* While money is moving, the sheet can't be closed. */
  const paying = useRef(false);

  const layer = useRef<HTMLDivElement | null>(null);
  const scrim = useRef<HTMLDivElement | null>(null);
  const sheet = useRef<HTMLDivElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const label = useRef<HTMLSpanElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const leaving = useRef(false);
  const parts = (): IslandParts | null =>
    sheet.current && inner.current && label.current && scrim.current
      ? { island: sheet.current, inner: inner.current, label: label.current, scrim: scrim.current }
      : null;
  /* What it grew out of, picked once as it opens, so it closes back into the
     same place. */
  const origin = useRef<IslandOrigin | null>(null);
  const stopTracking = useRef<(() => void) | null>(null);
  const keyboard = useRef<{ stop: () => void; clear: () => void } | null>(null);

  /* The plate's own white, and the sheet's light ground: the island leaves
     the plate white and settles to the ground as its contents arrive, and
     turns white again as it goes back in, so the first and last frames are
     the plate exactly. */
  const PLATE = "#ffffff";
  const GROUND = "#f0f0f0";

  const leave = (then: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    keyboard.current?.stop();
    const a = document.activeElement as HTMLElement | null;
    if (a && sheet.current?.contains(a)) a.blur();
    const p = parts();
    if (!p) return then();
    /* The plate comes back under the container just before it lands, its
       shadow fading in, so the swap itself changes nothing on screen. */
    /* The colour on screen now, before the close stops the open (a close
       mid-open would otherwise flash the ground for a frame). */
    const fromBg = getComputedStyle(p.island).backgroundColor || GROUND;
    let shown = false;
    const reveal = () => {
      const plate = origin.current?.plate;
      if (!plate || shown) return;
      shown = true;
      plate.getAnimations().forEach((x) => x.cancel());
      plate.style.visibility = "";
      const to = getComputedStyle(plate).boxShadow;
      const layers = (to.match(/rgba?\(/g) ?? []).length;
      if (to && to !== "none" && layers && !still())
        plate.animate?.([{ boxShadow: Array(layers).fill("rgba(20, 22, 24, 0) 0px 0px 0px 0px").join(", ") }, { boxShadow: to }], {
          duration: 220,
          easing: "ease-out",
        });
    };
    islandClose(
      p,
      origin.current,
      () => {
        reveal();
        then();
      },
      reveal,
    );
    if (!still() && origin.current) p.island.animate?.([{ backgroundColor: fromBg }, { backgroundColor: PLATE }], { duration: 140, easing: "ease-out", fill: "forwards" });
    stopTracking.current?.();
  };
  const close = () => {
    if (paying.current) return;
    leave(() => {
      onGone();
      onClose();
    });
  };
  /* The page closed it (open went false). */
  useEffect(() => {
    if (closing) leave(onGone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  /* Before the first paint, so nothing flashes: lock the page (first, so a
     scrollbar going away can't move anything after it's measured), pick the
     origin, grow out of it, and hide the plate while open. Reduced motion:
     there at once (island.ts). */
  useLayoutEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const unlock = lockScroll();
    const o = islandOrigin(from);
    origin.current = o;
    const p = parts();
    if (p) {
      islandOpen(p, o);
      if (!still() && o) p.island.animate?.([{ backgroundColor: PLATE }, { backgroundColor: GROUND }], { duration: 300, delay: 120, easing: "ease-in-out", fill: "backwards" });
      stopTracking.current = islandTrackHeight(p);
    }
    keyboard.current = layer.current ? islandAvoidKeyboard(layer.current) : null;
    /* The plate steps aside: its shadow fades first (the island has none),
       then it hides under the island. */
    if (o) {
      const shadow = getComputedStyle(o.plate).boxShadow;
      const layers = (shadow.match(/rgba?\(/g) ?? []).length;
      if (!still() && shadow !== "none" && layers && o.plate.animate) {
        const off = Array(layers).fill("rgba(20, 22, 24, 0) 0px 0px 0px 0px").join(", ");
        o.plate.animate([{ boxShadow: shadow }, { boxShadow: off }], { duration: 160, easing: "ease-out", fill: "forwards" }).onfinish = () => {
          o.plate.style.visibility = "hidden";
        };
      } else o.plate.style.visibility = "hidden";
    }
    return () => {
      /* Leaves things as they were however it ends (and lets React's dev
         double mount start again from rest). */
      stopTracking.current?.();
      keyboard.current?.stop();
      keyboard.current?.clear();
      if (p) settle(p);
      if (o) {
        o.plate.getAnimations().forEach((x) => x.cancel());
        o.plate.style.visibility = "";
      }
      unlock();
      const back = [opener.current, from, o?.button].find((el) => el && el.isConnected && el !== document.body);
      back?.focus({ preventScroll: true });
    };
    // Once, when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Focus: the first field on a computer; the dialog on a phone, so the
     keyboard doesn't cover the sheet as it rises. Escape closes; Tab stays
     inside (the iframes are Stripe's fields). */
  useEffect(() => {
    const node = sheet.current;
    if (!node) return;
    const first = wide() ? node.querySelector<HTMLElement>("input") : null;
    (first ?? node).focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        return close();
      }
      if (e.key !== "Tab") return;
      const els = Array.from(node.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), iframe, [tabindex='0']")).filter(
        (el) => el.getClientRects().length > 0,
      );
      if (!els.length) return;
      const a = els[0];
      const z = els[els.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === a || at === node)) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && (at === z || !node.contains(at))) {
        e.preventDefault();
        a.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Each step comes in with a short lift; its heading takes focus so a
     screen reader says where it is. */
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    inner.current?.scrollTo?.({ top: 0 });
    document.getElementById("prc-title")?.focus({ preventScroll: true });
    const b = body.current;
    if (b && !still() && typeof b.animate === "function")
      b.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: EASE });
  }, [step]);

  /* ── The form ── */
  const phoneD = digitsOf(phone);
  const confirmD = digitsOf(confirm);
  const errors: Partial<Record<Field, string>> = {};
  if (!ask) {
    if (!student.trim()) errors.student = "Add your student’s first name.";
    if (!toE164(phoneD)) errors.phone = "Enter a 10-digit US mobile number.";
    if (!confirmD) errors.confirm = "Type their number again.";
    else if (confirmD !== phoneD) errors.confirm = "These numbers don’t match.";
  }
  if (!name.trim()) errors.name = "Add your name.";
  if (!EMAIL.test(email.trim())) errors.email = "Enter an email we can send your receipt to.";
  if (mobile.trim() && !toE164(digitsOf(mobile))) errors.mobile = "Enter a 10-digit US number, or leave this empty.";
  const shown = (f: Field) => (tried ? errors[f] : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setTried(true);
    setFormError(null);
    const order: Field[] = step === "student" ? ["student", "phone", "confirm"] : ["name", "email", "mobile"];
    const bad = order.find((f) => errors[f]);
    if (bad) {
      document.getElementById(`prc-${bad}`)?.focus();
      return;
    }
    if (step === "student") {
      /* On to you; your fields start fresh, without errors showing. */
      setTried(false);
      setStep("you");
      return;
    }
    setBusy(true);
    track("parent_checkout_started", { source });
    try {
      const res = await startParentCheckout({
        student_first_name: ask ? ask.student_first_name : student.trim(),
        student_phone: ask ? "" : (toE164(phoneD) as string),
        parent_name: name.trim(),
        parent_email: email.trim(),
        parent_phone: mobile.trim() ? toE164(digitsOf(mobile)) : null,
        ask_token: ask?.token ?? null,
        utm: keptUtm(),
      });
      setStarted(res);
      setStep("pay");
    } catch (err) {
      setFormError((err as Error).message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onCharged = (paymentIntent: string) => {
    if (started) charged = { started, paymentIntent, who: ask ? ask.student_first_name : student.trim(), masked: ask ? ask.masked_phone : maskDigits(phoneD) };
    setPaid(true);
  };
  const onPaid = (res: ParentConfirmed) => {
    const first = started?.first_cents ?? OFFER.first_cents;
    charged = null;
    track("parent_purchase", { value: first / 100, currency: "USD", source, checkout_id: started?.checkout_id });
    if (ask) track("ask_paid", { source });
    setDone(res);
    setStep("done");
  };

  const who = charged?.who ?? (ask ? ask.student_first_name : student.trim());
  const masked = charged?.masked ?? (ask ? ask.masked_phone : maskDigits(phoneD));
  const first = started?.first_cents ?? OFFER.first_cents;
  const monthly = started?.monthly_cents ?? OFFER.monthly_cents;

  /* An ask link's student isn't texted (they asked), so its button doesn't
     say so. */
  const payLabel = ask ? `Pay ${usd(first)}` : `Pay ${usd(first)} and send their text`;

  /* ── Header ── */
  const title =
    step === "done" ? `${possessive(done?.student_first_name || who)} Tapin Plus is on.` : step === "pay" ? (ask ? "Pay and turn on their Plus" : "Pay and send their text") : ask ? `Cover ${possessive(ask.student_first_name)} Tapin Plus` : "Sign up my student";
  /* The pay step's rows and terms say the price, so its header doesn't. */
  const sub = step === "student" || step === "you" ? `${usd(first)} the first month, then ${usd(monthly)}/month. Cancel anytime.` : null;

  return createPortal(
    <div className="prc-layer" ref={layer}>
      <div ref={scrim} className="prc-scrim" aria-hidden="true" onClick={close} />
      <div className="prc-sheet prc-island" ref={sheet} role="dialog" aria-modal="true" aria-labelledby="prc-title" tabIndex={-1}>
        {/* A stand-in for the tapped button, carried as it grows and back as it shrinks. */}
        <span ref={label} className="prc-island-label" aria-hidden="true" />
        <div ref={inner} className="prc-island-inner">
        <div className="prc-top">
          {step === "done" ? <Tick /> : null}
          <div className="prc-head">
            <h2 id="prc-title" className="prc-title" tabIndex={-1}>
              {title}
            </h2>
            {sub ? <p className="prc-sub tnum">{sub}</p> : null}
          </div>
          {step !== "done" ? (
            <button type="button" className="prc-x" aria-label="Close" onClick={close} disabled={busy}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>

        <div ref={body}>
          {step === "student" || step === "you" ? (
            <form className="prc-body" onSubmit={submit} noValidate>
              <ol className="prc-steps" aria-label={`Step ${ask ? 1 : step === "student" ? 1 : 2} of ${ask ? 2 : 3}`}>
                {(ask ? ["you", "pay"] : ["student", "you", "pay"]).map((k, i, all) => (
                  <li key={k} data-on={i <= all.indexOf(step) ? "" : undefined} />
                ))}
              </ol>
              {step === "student" ? (

                <fieldset className="prc-module">
                  <legend className="prc-legend">Your student</legend>
                  <div className="prc-fields">
                  <Input id="student" label="Your student’s first name" value={student} onChange={setStudent} error={shown("student")} autoComplete="off" autoCapitalize="words" maxLength={40} />
                  <Input
                    id="phone"
                    label="Your student’s mobile number"
                    value={formatPhone(phoneD)}
                    onChange={(v) => setPhone(digitsOf(v))}
                    error={shown("phone")}
                    tel
                    help="We’ll text this number once to let them know. Their Plus is tied to it, so double-check it. By continuing you confirm it’s your student’s number and they’re OK getting texts from Tapin about it."
                  />
                  <Input
                    id="confirm"
                    label="Confirm their number"
                    value={formatPhone(confirmD)}
                    onChange={(v) => setConfirm(digitsOf(v))}
                    error={shown("confirm")}
                    tel
                    ok={confirmD.length === 10 && confirmD === phoneD}
                  />
                  </div>
                </fieldset>
              ) : (
                <>
                  {ask ? (
                    <div className="prc-module prc-covering">
                      <span className="prc-covering-dot" aria-hidden="true">
                        {ask.student_first_name.slice(0, 1).toUpperCase()}
                      </span>
                      <p>
                        Covering <b>{ask.student_first_name}</b> <span className="tnum">· {ask.masked_phone}</span>
                      </p>
                    </div>
                  ) : (
                    <button type="button" className="prc-edit prc-back" onClick={() => setStep("student")} disabled={busy}>
                      ← {student.trim() || "Your student"} · {maskDigits(phoneD)}
                    </button>
                  )}
              <fieldset className="prc-module">
                <legend className="prc-legend">You</legend>
                <div className="prc-fields">
                <Input id="name" label="Your name" value={name} onChange={setName} error={shown("name")} autoComplete="name" autoCapitalize="words" maxLength={80} />
                <Input id="email" label="Your email" value={email} onChange={setEmail} error={shown("email")} autoComplete="email" type="email" inputMode="email" />
                <Input id="mobile" label="Your mobile (optional)" value={mobile.trim() ? formatPhone(digitsOf(mobile)) : mobile} onChange={(v) => setMobile(digitsOf(v))} error={shown("mobile")} tel autoComplete="tel-national" />
                </div>
              </fieldset>
                </>
              )}
              {formError ? (
                <p className="prc-error" role="alert">
                  {formError}
                </p>
              ) : null}
              <button type="submit" className="prc-cta" data-island-cta="" disabled={busy}>
                {busy ? "One moment…" : formError ? "Try again" : step === "student" ? "Continue" : "Continue to payment"}
              </button>
            </form>
          ) : step === "pay" && started ? (
            <div className="prc-body">
              <ol className="prc-steps" aria-label={`Step ${ask ? 2 : 3} of ${ask ? 2 : 3}`}>
                {(ask ? ["you", "pay"] : ["student", "you", "pay"]).map((k) => (
                  <li key={k} data-on="" />
                ))}
              </ol>
              <div className="prc-module prc-rows">
                <div className="prc-row">
                  <span>For</span>
                  <b className="tnum">
                    {who} · {masked}
                  </b>
                </div>
                <div className="prc-row">
                  <span>Due today</span>
                  <b className="tnum">{usd(first)}</b>
                </div>
                <div className="prc-row">
                  <span>Then</span>
                  <b className="tnum">{`${usd(monthly)} every month`}</b>
                </div>
                {paid ? null : (
                  <button type="button" className="prc-edit" onClick={() => setStep(ask ? "you" : "student")} disabled={busy}>
                    Change details
                  </button>
                )}
              </div>
              {mock ? (
                <MockPay first={first} monthly={monthly} paying={paying} onBusy={setBusy} onPaid={onPaid} onDone={close} label={payLabel} />
              ) : (
                <Elements stripe={getStripe()} options={{ clientSecret: started.client_secret, appearance: APPEARANCE, fonts: FONTS }}>
                  <StripePay started={started} paying={paying} onBusy={setBusy} onPaid={onPaid} onCharged={onCharged} onDone={close} label={payLabel} resumeIntent={charged?.paymentIntent ?? null} />
                </Elements>
              )}
            </div>
          ) : step === "done" && done ? (
            <div className="prc-body" role="status">
              <div className="prc-module prc-done">
                <p>
                  {ask ? (
                    /* An ask link's student is already signed in, and isn't texted (API.md). */
                    <>
                      It’s on {done.student_first_name || who}’s account (<span className="tnum">{done.masked_phone || masked}</span>) now. Your receipt and a manage or cancel link are in your email.
                    </>
                  ) : (
                    <>
                      We’ve texted <span className="tnum">{done.masked_phone || masked}</span>. They sign in to Tapin with that number and it’s there. Your receipt and a manage or cancel link are in your email. If they haven’t signed in within 14 days, we’ll cancel and refund you in full.
                    </>
                  )}
                </p>
              </div>
              <button type="button" className="prc-cta" onClick={close}>
                Done
              </button>
            </div>
          ) : null}
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── A field ─────────────────────────────────────────────────────────────── */
function Input({
  id,
  label,
  value,
  onChange,
  error,
  help,
  tel = false,
  ok = false,
  type = "text",
  inputMode,
  autoComplete,
  autoCapitalize,
  maxLength,
}: {
  id: Field;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  help?: string;
  tel?: boolean;
  ok?: boolean;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  autoCapitalize?: string;
  maxLength?: number;
}) {
  const fid = `prc-${id}`;
  const described = [help ? `${fid}-help` : null, error ? `${fid}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="prc-field" data-bad={error ? "" : undefined}>
      <label className="prc-label" htmlFor={fid}>
        {label}
      </label>
      <div className="prc-box">
        <input
          id={fid}
          type={tel ? "tel" : type}
          inputMode={tel ? "numeric" : inputMode}
          autoComplete={tel ? (autoComplete ?? "off") : autoComplete}
          autoCapitalize={autoCapitalize}
          autoCorrect="off"
          spellCheck={false}
          placeholder={tel ? "(540) 555-0123" : undefined}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          className={tel ? "tnum" : undefined}
        />
        {ok ? (
          <span className="prc-ok" aria-label="Numbers match">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="m6.5 12.5 3.6 3.6 7.4-7.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${fid}-error`} className="prc-field-error">
          {error}
        </p>
      ) : null}
      {help ? (
        <p id={`${fid}-help`} className="prc-help">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/* ── The terms, right by the button that charges ─────────────────────────── */
function Terms({ first, monthly }: { first: number; monthly: number }) {
  return (
    <p className="prc-terms tnum">
      {`${usd(first)} today for the first month, then ${usd(monthly)}/month until you cancel. Cancel anytime from the link we email you. `}
      <span className="prc-legal">
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
          Terms
        </a>
        {" · "}
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          Privacy
        </a>
      </span>
    </p>
  );
}

/* ── Stripe: the Payment Element on the first invoice's PaymentIntent ───── */
const APPEARANCE: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#141618",
    colorText: "#141618",
    colorTextSecondary: "rgba(20, 22, 24, 0.62)",
    colorBackground: "#ffffff",
    colorDanger: "#c0392b",
    fontFamily: "Gilroy, Arial, sans-serif",
    fontWeightNormal: "500",
    borderRadius: "14px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { boxShadow: "none", border: "1px solid rgba(20, 22, 24, 0.12)", backgroundColor: "#f0f0f0" },
    ".Input:focus": { boxShadow: "0 0 0 1px #141618", border: "1px solid #141618" },
    ".Label": { fontWeight: "600" },
    ".Tab": { boxShadow: "none", border: "1px solid rgba(20, 22, 24, 0.12)" },
    ".Tab--selected": { border: "1px solid #141618", boxShadow: "0 0 0 1px #141618" },
  },
};
const FONTS =
  typeof window !== "undefined"
    ? [
        { family: "Gilroy", src: `url(${new URL(asset("/fonts/Gilroy-Medium.woff"), window.location.origin).href})`, weight: "500" },
        { family: "Gilroy", src: `url(${new URL(asset("/fonts/Gilroy-SemiBold.woff"), window.location.origin).href})`, weight: "600" },
      ]
    : [];

type PayProps = {
  paying: React.MutableRefObject<boolean>;
  onBusy: (b: boolean) => void;
  onPaid: (res: ParentConfirmed) => void;
  /** Closes the sheet (after a refusal that's final). */
  onDone: () => void;
  label: string;
};

/* The backend refused after taking the money and refunded it (someone else
   already covers this number): nothing to retry. */
const isFinalRefusal = (msg: string) => /refunded you/i.test(msg);

function StripePay({
  started,
  paying,
  onBusy,
  onPaid,
  onCharged,
  onDone,
  label,
  resumeIntent,
}: PayProps & { started: ParentCheckoutStarted; onCharged: (paymentIntent: string) => void; resumeIntent: string | null }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Once the card has been charged, a retry only confirms: never pay twice. */
  const paidIntent = useRef<string | null>(resumeIntent);

  const pay = async () => {
    if (!stripe || !elements || paying.current) return;
    paying.current = true;
    setBusy(true);
    onBusy(true);
    setError(null);
    try {
      if (!paidIntent.current) {
        const { error: payError, paymentIntent } = await stripe.confirmPayment({
          elements,
          redirect: "if_required",
          confirmParams: { return_url: window.location.href },
        });
        if (payError) throw new Error(payError.message || "Your payment didn’t go through. Please try again.");
        if (!paymentIntent || (paymentIntent.status !== "succeeded" && paymentIntent.status !== "processing"))
          throw new Error("Your payment didn’t go through. Please try again.");
        paidIntent.current = paymentIntent.id;
        onCharged(paymentIntent.id);
      }
      const res = await confirmParentCheckout(started.checkout_id, paidIntent.current);
      onPaid(res);
    } catch (e) {
      console.error("Parent checkout failed", e);
      setError((e as Error).message || "Something went wrong. Please try again.");
    } finally {
      paying.current = false;
      setBusy(false);
      onBusy(false);
    }
  };

  return (
    <>
      <div className="prc-module prc-pay">
        <PaymentElement
          options={{ wallets: { applePay: "auto", googlePay: "auto" }, layout: "tabs" }}
          onReady={() => setReady(true)}
          onLoadError={() => setError("The payment form didn’t load. Close this and try again.")}
        />
        {!ready && !error ? <div className="prc-pay-wait" aria-busy="true" /> : null}
      </div>
      <Terms first={started.first_cents} monthly={started.monthly_cents} />
      {error ? (
        <p className="prc-error" role="alert">
          {error}
        </p>
      ) : null}
      {error && isFinalRefusal(error) ? (
        <button type="button" className="prc-cta" onClick={onDone}>
          Done
        </button>
      ) : (
        <button type="button" className="prc-cta" data-island-cta="" onClick={pay} disabled={busy || (!paidIntent.current && (!ready || !stripe))}>
          {busy ? "Paying…" : paidIntent.current ? "Finish" : label}
        </button>
      )}
    </>
  );
}

/* ── ?parentmock: a card panel's look in the Payment Element's place ────── */
function MockPay({ first, monthly, paying, onBusy, onPaid, onDone, label }: PayProps & { first: number; monthly: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pay = async () => {
    if (paying.current) return;
    paying.current = true;
    setBusy(true);
    onBusy(true);
    setError(null);
    try {
      onPaid(await confirmParentCheckout("mock", "pi_mock"));
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Please try again.");
    } finally {
      paying.current = false;
      setBusy(false);
      onBusy(false);
    }
  };
  return (
    <>
      <div className="prc-module prc-pay prc-mock" aria-label="Payment (preview, nothing is charged)">
        <p className="prc-mock-tag">Preview: no card is charged</p>
        <span className="prc-label">Card number</span>
        <div className="prc-mock-field tnum">1234 1234 1234 1234</div>
        <div className="prc-mock-pair">
          <div>
            <span className="prc-label">Expiration</span>
            <div className="prc-mock-field tnum">MM / YY</div>
          </div>
          <div>
            <span className="prc-label">CVC</span>
            <div className="prc-mock-field tnum">CVC</div>
          </div>
        </div>
      </div>
      <Terms first={first} monthly={monthly} />
      {error ? (
        <p className="prc-error" role="alert">
          {error}
        </p>
      ) : null}
      {error && isFinalRefusal(error) ? (
        <button type="button" className="prc-cta" onClick={onDone}>
          Done
        </button>
      ) : (
        <button type="button" className="prc-cta" data-island-cta="" onClick={pay} disabled={busy}>
          {busy ? "Paying…" : error ? "Try again" : label}
        </button>
      )}
    </>
  );
}

/* ── The tick that draws itself on the done step ─────────────────────────── */
function Tick() {
  const path = useRef<SVGPathElement | null>(null);
  const ring = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const p = path.current;
    if (!p || still() || typeof p.animate !== "function") return;
    ring.current?.animate?.([{ transform: "scale(0.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 360, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" });
    p.animate([{ strokeDashoffset: 20 }, { strokeDashoffset: 0 }], { duration: 420, delay: 120, easing: EASE, fill: "backwards" });
  }, []);
  return (
    <span ref={ring} className="prc-tick" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path ref={path} d="m6.5 12.5 3.6 3.6 7.4-7.6" pathLength={20} strokeDasharray={20} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
