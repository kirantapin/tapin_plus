import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { STRIPE_PUBLISHABLE_KEY } from "../constants";
import { useAuth } from "../context/auth_context";
/* The parents flow (5 Nov 2026): "Ask a parent to cover it" on the pay step. */
import { AppCard, appHref } from "./GetTheApp";
import { useEventTracking } from "../context/event_tracking_context";
import { buildPlusCart, createPlusIntent, submitPlusOrder, type PlusCart } from "../model/checkout";
import { firstMonthLine, nextBillingDate, usd, usePlusPrice, type PlusPrice } from "../model/plus";
import { inviteFor } from "../model/invite";
import { sendCode, verifyCode } from "./authEnv";
import { PlusSeats } from "./PlusSeats";
import { InviteClock } from "./WelcomeOffer";
import { islandAvoidKeyboard, islandClose, islandOpen, islandOrigin, islandTrackHeight, reducedMotion, settle, type IslandOrigin, type IslandParts } from "./island";
import { lockScroll } from "./scrollLock";

/* ══ THE PLUS CHECKOUT (3 Nov 2026) ═════════════════════════════════════════
   Join on any page opens this: openPlusCheckout("where"). It's mounted once
   (<PlusCheckoutMount /> in App), so a page only calls the function.

   Sign in with a phone number, then the charge: what's due today (the signed
   cart's total, model/checkout.ts), what it renews at and when, the consent,
   and the wallet, all on one screen with nothing between them (the
   auto-renewal rules want the terms beside the control that takes money).
   Then done. In the app's look, as the home page is (plus-app.css). */

/* ── The one open sheet, as a tiny store ─────────────────────────────────── */
/* `from`: the Join that was tapped. `opener`: what had focus, to go back to.
   `over`: another pop-up's backdrop is up and hands over to this one. */
type Open = { where: string; mode: "join" | "signin"; from?: HTMLElement | null; opener?: HTMLElement | null; over?: boolean };
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

const focused = () => (typeof document !== "undefined" && document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);

/* A pop-up that hands over to the checkout (a place, the walkthrough) gives
   it the element its own focus would have gone back to, so closing the
   checkout lands there on a computer, where there's no bottom bar. */
let handedOver: HTMLElement | null = null;

/* Whether the last thing the person did was tap or click (not type), so
   focus that goes back after a close can skip the keyboard ring. */
let pointerLast = false;
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", () => (pointerLast = true), true);
  document.addEventListener("keydown", () => (pointerLast = false), true);
}
const quietFocus = (el: HTMLElement) => {
  el.setAttribute("data-quiet-focus", "");
  const off = () => {
    el.removeAttribute("data-quiet-focus");
    el.removeEventListener("blur", off);
    document.removeEventListener("keydown", off, true);
  };
  el.addEventListener("blur", off);
  document.addEventListener("keydown", off, true);
};
export const handOverFocus = (el: HTMLElement | null) => {
  handedOver = el;
};

/** Whether the checkout is open, so things behind it can stop moving (the
 *  How it works carousel repainted the page every frame under the scrim). */
export const usePlusCheckoutOpen = () => useSyncExternalStore(subscribe, () => openFrom) !== null;

/** Opens the checkout. `where` is which Join was tapped, for tracking; `from`
 *  is the button itself (the island grows out of the bar that holds it, or
 *  out of it; shell/island.ts). `over`: called from inside another pop-up. */
export const openPlusCheckout = (where: string, from?: HTMLElement | null, opts?: { over?: boolean }) =>
  set({ where, mode: "join", from, opener: focused() ?? from ?? null, over: !!opts?.over });

/** Opens the same sheet to sign in only: the number, the code, then it
 *  closes (Sam, 4 Nov 2026: "there needs to be a sign in and sign out option
 *  on this page"). A member's page then shows Get the app. */
export const openPlusSignIn = (where: string) => set({ where, mode: "signin", opener: focused() });

/** Mounted once near the root. */
export function PlusCheckoutMount() {
  const open = useSyncExternalStore(subscribe, () => openFrom);
  return open ? (
    <PlusCheckoutSheet
      key={`${open.mode}-${open.where}`}
      where={open.where}
      from={open.from}
      opener={open.opener}
      over={open.over}
      signInOnly={open.mode === "signin"}
      onClose={() => set(null)}
    />
  ) : null;
}

/* ── The sheet ───────────────────────────────────────────────────────────── */
/* Stripe off the first load (PageSpeed, 9 Nov 2026: js.stripe.com was
   fetched on every page view, before anyone tapped Join). It starts a
   couple of seconds after the page has loaded, or the moment the checkout
   asks for it, whichever comes first, so the wallet button is still ready
   when the sheet opens. */
let stripeOnce: ReturnType<typeof loadStripe> | null = null;
const getStripe = () => (stripeOnce ??= loadStripe(STRIPE_PUBLISHABLE_KEY));
if (typeof window !== "undefined") {
  const warm = () => window.setTimeout(() => void getStripe(), 2500);
  if (document.readyState === "complete") warm();
  else window.addEventListener("load", warm, { once: true });
}
const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TERMS_URL = "https://go.tapin.app/terms-and-conditions";
const PRIVACY_URL = "https://go.tapin.app/privacy-policy";

function PlusCheckoutSheet({
  where,
  from,
  opener,
  over = false,
  signInOnly = false,
  onClose,
}: {
  where: string;
  from?: HTMLElement | null;
  opener?: HTMLElement | null;
  over?: boolean;
  signInOnly?: boolean;
  onClose: () => void;
}) {
  const { userSession, accessToken, subscribed } = useAuth();
  const { track } = useEventTracking();
  const price = usePlusPrice();
  const invite = inviteFor(price);
  const [paid, setPaid] = useState<string | null>(null);
  /* What the server says is due today, once the pay step has asked. Someone
     who has had Plus before pays the full month, with no welcome price, so
     the header follows the server and stops promising the first month (Sam,
     3 Nov 2026: "if im trying to purchase this again, after having cancelled,
     it shouldn't say $3.99 for first month"). */
  const [dueCents, setDueCents] = useState<number | null>(null);
  const [signInStage, setSignInStage] = useState<"phone" | "code">("phone");
  /* The island (shell/island.ts): one black container that grows out of the
     Join button that was tapped and shrinks back into it. */
  const sheet = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const label = useRef<HTMLSpanElement | null>(null);
  const scrim = useRef<HTMLDivElement | null>(null);
  const layer = useRef<HTMLDivElement | null>(null);
  const parts = (): IslandParts | null =>
    sheet.current && inner.current && label.current && scrim.current
      ? { island: sheet.current, inner: inner.current, label: label.current, scrim: scrim.current }
      : null;
  const stopTracking = useRef<(() => void) | null>(null);
  /* What it grows out of, picked once as it opens (the bar on a phone), so
     it closes back into the same place even if the page changes meanwhile
     (after paying, Join becomes Get the app). */
  const origin = useRef<IslandOrigin | null>(null);
  const keyboard = useRef<{ stop: () => void; clear: () => void } | null>(null);
  const leaving = useRef(false);
  const close = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    const p = parts();
    if (!p) return onClose();
    /* Hold the layer where it is and let the keyboard go now, so it drops
       while the island travels to the bar instead of moving it mid-flight. */
    keyboard.current?.stop();
    const a = document.activeElement as HTMLElement | null;
    if (a && sheet.current?.contains(a)) a.blur();
    /* The bar comes back under the container just before it lands, its
       shadow fading in, so the swap itself changes nothing on screen. */
    let shown = false;
    const reveal = () => {
      const plate = origin.current?.plate;
      if (!plate || shown) return;
      shown = true;
      plate.getAnimations().forEach((x) => x.cancel());
      plate.style.visibility = "";
      const to = getComputedStyle(plate).boxShadow;
      const layers = (to.match(/rgba?\(/g) ?? []).length;
      if (to && to !== "none" && layers && !reducedMotion())
        plate.animate?.([{ boxShadow: Array(layers).fill("rgba(20, 22, 24, 0) 0px 0px 0px 0px").join(", ") }, { boxShadow: to }], { duration: 220, easing: "ease-out" });
    };
    /* Close first, from the height on screen; then stop watching it. */
    islandClose(
      p,
      origin.current,
      () => {
        reveal();
        onClose();
      },
      reveal,
    );
    stopTracking.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  /* Before the first paint, so nothing flashes: lock the page (first, so a
     scrollbar going away can't move anything after it's measured), pick the
     origin, grow out of it, and hide it while open. */
  useLayoutEffect(() => {
    const unlock = lockScroll();
    const o = islandOrigin(from);
    origin.current = o;
    const p = parts();
    if (p) {
      islandOpen(p, o, over);
      stopTracking.current = islandTrackHeight(p);
    }
    keyboard.current = layer.current ? islandAvoidKeyboard(layer.current) : null;
    /* The plate steps aside: its shadow fades first (the island has none,
       so it would vanish in one frame), then it hides under the island. */
    if (o) {
      const shadow = getComputedStyle(o.plate).boxShadow;
      const layers = (shadow.match(/rgba?\(/g) ?? []).length;
      if (!reducedMotion() && shadow !== "none" && layers && o.plate.animate) {
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
    };
    // Once, when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    track(signInOnly ? "plus_signin_opened" : "checkout_opened", { where });
    /* The field first (it also autofocuses), else the dialog. */
    const node = sheet.current;
    if (node && !node.contains(document.activeElement))
      (node.querySelector<HTMLElement>("#pck-phone, #pck-code") ?? node).focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      const box = sheet.current;
      if (e.key !== "Tab" || !box) return;
      /* Tab stays inside the dialog (the iframe is the wallet button). */
      const els = Array.from(box.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), iframe")).filter(
        (el) => el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"]'),
      );
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === box)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (at === last || !box.contains(at))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      /* React's dev double mount runs this with the sheet still on the page:
         leave the field's focus alone then. */
      if (node?.isConnected) return;
      /* Back to what opened it, if it's still there (Safari doesn't focus a
         tapped button, so the Join itself is the fallback; a pop-up that
         handed over says where its own focus would have gone). */
      const o = origin.current;
      const back = [opener, from, o?.button, o?.plate.querySelector<HTMLElement>("a, button"), handedOver].find((el) => el && el.isConnected && el !== document.body);
      handedOver = null;
      back?.focus?.({ preventScroll: true });
      /* Closed by a tap or click: focus goes back, but without the keyboard
         ring popping onto Join as it lands. */
      if (back && pointerLast) quietFocus(back);
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
    preview === "done" || (preview === "pay" && paid) ? (
      <Done texted />
    ) : preview === "pay" ? (
      /* The stand-in Pay goes on to the done screen, so the preview walks
         through (nothing is charged: no cart, no wallet). */
      <Review accessToken="" price={price ?? PREVIEW_PRICE} onPaid={setPaid} preview />
    ) : userSession === undefined ? null : paid ? (
      <Done texted />
    ) : !signedIn || signInOnly ? (
      /* Signing in only stays on this screen while it closes itself. */
      <SignIn onStage={setSignInStage} plain={signInOnly} />
    ) : subscribed === true ? (
      <Done />
    ) : (
      <Review accessToken={accessToken} price={price} onPaid={setPaid} onDue={setDueCents} />
    );
  /* Three short steps, shown as three bars, so the way to the end is in
     view from the first screen (Sam, 3 Nov 2026: polish it up to the page's
     design). */
  /* Signing in only never turns into the member screen as it closes. */
  const done = !signInOnly && (preview === "done" || !!paid || subscribed === true);
  const step = done ? 4 : preview === "pay" ? 3 : !signedIn ? (signInStage === "phone" ? 1 : 2) : 3;
  /* Once joined, the header is the moment: a tick that draws itself and
     "You're in" (or, for someone who already was, "You're a member"), in
     place of "Join Tapin Plus" and a price that no longer applies (Sam, 3 Nov
     2026: polish the post-purchase screen). */
  const doneTitle = paid || preview === "done" ? "You’re in" : "You’re a member";
  const tick = useRef<SVGPathElement | null>(null);
  /* "You're in" gets focus, so a screen reader says it. */
  useEffect(() => {
    if (done) document.getElementById("pck-title")?.focus({ preventScroll: true });
  }, [done]);
  useEffect(() => {
    const p = tick.current;
    if (!done || !p || still() || typeof p.animate !== "function") return;
    p.animate([{ strokeDashoffset: 20 }, { strokeDashoffset: 0 }], { duration: 420, delay: 120, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
    (p.closest(".pck-tick") as HTMLElement | null)?.animate([{ transform: "scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 380, easing: "cubic-bezier(.34,1.56,.64,1)" });
  }, [done]);

  return createPortal(
    <div className="pck-layer" ref={layer}>
      {/* Darker once the island is open (Sam, 4 Nov 2026). A tap here closes. */}
      <div ref={scrim} className="pck-scrim" aria-hidden="true" onClick={close} />
      <div className="pck-sheet pck-island" ref={sheet} role="dialog" aria-modal="true" aria-labelledby="pck-title" tabIndex={-1}>
        {/* A stand-in for the Join button, carried as it grows and back as it shrinks. */}
        <span ref={label} className="pck-island-label" aria-hidden="true" />
        <div ref={inner} className="pck-island-inner">
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
                <h2 id="pck-title" className="pck-title" tabIndex={-1}>
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
                {/* A promo link's audience mark beside its price (model/invite.ts),
                    while that price is the one due. */}
                {invite && (dueCents === null || dueCents / 100 === price?.first) ? (
                  <img className="pck-invite" src={invite.logo} alt={invite.alt} width="20" height="20" />
                ) : null}
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
  /* Continue (or Verify) tapped before the number (or code) is complete:
     the field glows red for a second and takes the cursor (Sam, 4 Nov 2026:
     "the phone number form field should have outer red glow for just a
     second"). So the button stays tappable when incomplete, only looking
     dimmed (aria-disabled), and is truly disabled only while sending. */
  const phoneBox = useRef<HTMLDivElement | null>(null);
  const codeBox = useRef<HTMLDivElement | null>(null);
  const nudge = (box: HTMLElement | null) => {
    if (!box) return;
    box.querySelector("input")?.focus({ preventScroll: true });
    /* On a short screen the field can sit under the pinned button; bring it
       up (scroll-padding-bottom keeps it clear of the button). */
    box.scrollIntoView?.({ block: "nearest" });
    const targets = box.classList.contains("pck-otp") ? Array.from(box.querySelectorAll<HTMLElement>(".pck-otp-box")) : [box];
    const ring = "inset 0 0 0 2px rgba(209, 66, 69, 1)";
    /* Six boxes 8px apart: a 3px halo each keeps the gaps open. */
    const halo = targets.length > 1 ? 3 : 5;
    const off = "inset 0 0 0 2px rgba(209, 66, 69, 0), 0 0 0 0 rgba(209, 66, 69, 0)";
    targets.forEach((el) => {
      el.getAnimations().forEach((a) => a.cancel());
      el.animate?.(
        reducedMotion()
          ? [{ boxShadow: `${ring}, 0 0 0 ${Math.min(halo, 4)}px rgba(209, 66, 69, 0.22)` }, { boxShadow: `${ring}, 0 0 0 ${Math.min(halo, 4)}px rgba(209, 66, 69, 0.22)` }]
          : [
              { boxShadow: off, offset: 0 },
              { boxShadow: `${ring}, 0 0 0 ${halo}px rgba(209, 66, 69, 0.26)`, offset: 0.15 },
              { boxShadow: `${ring}, 0 0 0 ${halo}px rgba(209, 66, 69, 0.26)`, offset: 0.65 },
              { boxShadow: off, offset: 1 },
            ],
        { duration: 1000, easing: "ease-out" },
      );
    });
  };
  const [error, setError] = useState<string | null>(null);
  /* An error shows between the field and the button; on a short screen that
     can be under the pinned button, so bring it into view. */
  const errorLine = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => {
    if (error) errorLine.current?.scrollIntoView?.({ block: "nearest" });
  }, [error]);
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
      /* Start the next try clean, and show it on the boxes. */
      setCode("");
      nudge(codeBox.current);
    } else track("plus_code_verified", { auto: better });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (stage === "phone") {
      if (digits.length !== 10) return nudge(phoneBox.current);
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
    if (code.length < 6) return nudge(codeBox.current);
    await verify(code);
  };

  const onCode = (raw: string) => {
    const next = raw.replace(/\D/g, "").slice(0, 6);
    setCode(next);
    if (error) setError(null);
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
      {/* The welcome offer (Sam, 9 Nov 2026: "include something in
          checkout on how their credit is added to the phone number they pay
          with and they can cancel anytime"): first, and cancel stays below. */}
      <li>
        <span className="pck-ico pck-ico-money pck-ico-wide tnum" aria-hidden="true">$25</span>
        {/* The offer itself now (Sam, 9 Nov 2026): $5 at each of five
            places, every month, from the moment you join. */}
        <b>{look === "c" ? "$25 credit every month" : "$25 in credit every month, $5 at each spot"}</b>
      </li>
      <li>
        <span className="pck-ico pck-ico-money pck-ico-wide tnum" aria-hidden="true">15%</span>
        <b>{look === "c" ? "Or 15% off daily" : "Or 15% off, once a day"}</b>
      </li>
      {/* Sam, 5 Nov 2026: "red icon with 'X' for easy one tap cancel
          anytime", moved here from the page ("it'd be one of these"), right under
          the $5 ("cancel anytime should be right below $5 back"). */}
      <li>
        <span className="pck-ico pck-ico-cancel" aria-hidden="true">
          <XGlyph />
        </span>
        <b>{look === "c" ? "Cancel anytime" : "Cancel anytime in one tap"}</b>
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
      {/* Sam, 4 Nov 2026: "as we add more places the price doesn't go up for
          existing subscribers, but it does for new members. Pays to get in
          early". */}
      <li>
        <span className="pck-ico" aria-hidden="true">
          <LockGlyph />
        </span>
        <b>{look === "c" ? "Price locked" : "Your price stays as more places join"}</b>
      </li>
    </ul>
  );
  /* An invitation with an end counts down to it in the spots bar's place
     (Sam, 5 Nov 2026: "we should show a countdown for this offer right? on
     the checkout modal"). */
  const invite = inviteFor(price);
  const seats = invite?.ends ? (
    <InviteClock invite={invite} className="pck-seats" />
  ) : (
    <PlusSeats monthly={usd(price?.monthly)} className="pck-seats" />
  );
  const field = (
    <>
      <label className="pck-sr" htmlFor="pck-phone">Phone number</label>
      <div ref={phoneBox} className={`pck-field${look === "c" ? " pck-field-big" : ""}`}>
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
    <button type="submit" className="pck-cta" disabled={busy} aria-disabled={digits.length !== 10 || undefined}>
      {busy ? "Sending…" : better ? "Continue" : "Send code"}
    </button>
  );

  return (
    <form className={`pck-body pck-look-${look}`} onSubmit={submit}>
      {stage === "phone" ? (
        plain ? (
          <>
            {/* The number right above the button, as on the join step. */}
            {consent}
            {field}
            {sendBtn}
          </>
        ) : look === "b" ? (
          <>
            {/* B, in the island (Sam, 4 Nov 2026: "the button can stay in the
                same place, the copy just changes" and "put the phone number
                entry right above it"): what you get first, then the opt-in,
                then the number, and Continue last, where Join was. */}
            <div className="pck-why">
              {offer}
              {seats}
            </div>
            {consent}
            {field}
            {sendBtn}
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
          {/* The code boxes sit right above Verify, where Join was (Sam, 4 Nov
              2026: "same with the 2FA"); resend and change number above them. */}
          {look === "c" || look === "b" ? (
            /* Six boxes over one real field, so Messages can still fill it. */
            <div ref={codeBox} className="pck-otp">
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
              <div ref={codeBox} className="pck-field">
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
          <button type="submit" className="pck-cta" disabled={busy} aria-disabled={code.length < 6 || undefined}>
            {busy ? "Checking…" : better ? "Verify" : "Continue"}
          </button>
        </>
      )}
      {error ? (
        <p ref={errorLine} className="pck-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/* ── The charge ──────────────────────────────────────────────────────────── */

/** "December 3": when a period from now renews. */
const renewsOn = (price: PlusPrice) =>
  nextBillingDate(price.billing).toLocaleDateString("en-US", { month: "long", day: "numeric" }).replace(" ", "\u00a0");

/** The header's price: the welcome line, unless the server says today's
 *  charge is something else (a returning member pays the full month). */
function priceLine(price: PlusPrice | null, dueCents: number | null) {
  /* It says it renews, from the first step (the UX audit's one failed
     journey, 4 Nov 2026: "never says the membership renews"). */
  /* "renews at" says it renews in two words, where "then $7.99/mo until you
     cancel" took a second line and left "cancel" alone on it (Sam, 4 Nov
     2026: "/impeccable polish"). The pay step keeps the full terms. */
  /* An offer that lasts (a promo link's): its price for its months, or for
     good. Otherwise the first month's line. */
  const welcome =
    price?.firstFor === "forever"
      ? `${usd(price.first)}/mo, renews monthly`
      : price?.firstFor && price.firstFor.periods > 1
        ? `${usd(price.first)}/mo for ${price.firstFor.periods} months, then ${usd(price.monthly)}/mo`
        : `${firstMonthLine(price)}, renews at ${usd(price?.monthly)}/mo`;
  if (!price || dueCents === null) return welcome;
  const today = dueCents / 100;
  if (today === price.first) return welcome;
  if (today === price.monthly) return `${usd(price.monthly)}/mo, renews monthly`;
  return `${usd(today)} today, renews at ${usd(price.monthly)}/mo`;
}

/* Local dev only (?pckpreview=pay): the pay step with sample numbers and a
   stand-in for the wallet button, without signing in or building a cart. */
const PREVIEW_PRICE: PlusPrice = { monthly: 7.99, first: 3.99, firstFor: null, period: "month", billing: { interval: "month", interval_count: 1 } as PlusPrice["billing"], linkId: null, linkEnds: null };
const PREVIEW_CART: PlusCart = { cart: [], dealEffect: null, cartResults: { totalPrice: 3.99 }, token: "", dueTodayCents: 399, accountId: "", linkId: null, discountDuration: null };

function Review({
  accessToken,
  price,
  onPaid,
  onDue,
  preview = false,
}: {
  accessToken: string;
  price: PlusPrice | null;
  onPaid: (orderId: string) => void;
  onDue?: (cents: number) => void;
  preview?: boolean;
}) {
  const [built, setCart] = useState<PlusCart | null>(null);
  /* The preview's cart follows the preview price, so ?wwpreview shows $0. */
  const cart = preview ? { ...PREVIEW_CART, dueTodayCents: Math.round((price?.first ?? 3.99) * 100) } : built;
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { track } = useEventTracking();
  /* The pay step on screen with its price: InitiateCheckout for Meta
     (context/meta_pixel.ts). Once per price. */
  const shownFor = useRef<number | null>(null);
  useEffect(() => {
    if (preview || !cart || !price || shownFor.current === cart.dueTodayCents) return;
    shownFor.current = cart.dueTodayCents;
    track("plus_pay_shown", { amount_cents: cart.dueTodayCents });
  }, [cart, price, track]);
  useEffect(() => {
    if (preview) return;
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
  /* The cart's deal decides what renews at: today's price for its months
     (or for good), then the full one. A first-month deal renews at full. */
  const lasts = cart.discountDuration;
  const months = lasts && lasts !== "forever" ? lasts.periods : 1;
  const lasting = lasts === "forever" || months > 1;
  const { period } = price;
  const thenRow =
    lasts === "forever"
      ? `${usd(today)} every ${period}, from ${renewsOn(price)}`
      : months > 1
        ? `${usd(today)} a ${period} for ${months - 1} more, then ${usd(price.monthly)}`
        : `${usd(price.monthly)} every ${period}, from ${renewsOn(price)}`;
  /* The invitation's clock under the charge rows, while its free month is
     the one being given. */
  const invite = inviteFor(price);
  return (
    <div className="pck-body">
      <ul className="pck-rows">
        <li>
          <b>Due today</b>
          <span className="tnum">{usd(today)}</span>
        </li>
        <li>
          <b>Then</b>
          <span className="tnum">{thenRow}</span>
        </li>
      </ul>
      {invite?.ends && today === price.first ? <InviteClock invite={invite} className="pck-seats pck-pay-clock" /> : null}
      {/* Sam, 3 Nov 2026: "The pay flow should say they get a text to
          download the tapin app after they subscribe". One line each, above
          the consent, so the terms stay right by the button that charges. */}
      <ul className="pck-offer pck-offer-tight">
        <li>
          <span className="pck-ico pck-ico-cancel" aria-hidden="true">
            <XGlyph />
          </span>
          <b>Cancel anytime in one tap</b>
        </li>
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
        {/* Sam, 5 Nov 2026: "should also show in the bullets, rate is locked
            for life, even as more spots join". */}
        <li>
          <span className="pck-ico" aria-hidden="true">
            <LockGlyph />
          </span>
          <b>{`${usd(price.monthly)} locked for life, even as places join`}</b>
        </li>
      </ul>
      <p className="pck-consent">
        {lasting
          ? /* A deal that lasts: today's price for its months (or for good),
               then the full one. */
            `By joining, you agree to ${
              lasts === "forever"
                ? `pay ${usd(today)} today, then ${usd(today)} every ${period}`
                : `pay ${usd(today)} today and each ${period} for your first ${months} ${period}s, then ${usd(price.monthly)} every ${period}`
            } automatically until you cancel. Cancel anytime in the Tapin app, before ${renewsOn(price)} to avoid the next charge. `
          : today === 0
            ? /* A free first period (a promo link's, 5 Nov 2026): nothing is
                 charged today, so the terms say when the first charge comes and
                 how to stop it before then, beside the button that starts it. */
              `By joining, you agree that your first ${price.period} is free and nothing is charged today, then ${usd(price.monthly)} every ${price.period} automatically from ${renewsOn(price)} until you cancel. Cancel anytime in the Tapin app before ${renewsOn(price)} and you won’t be charged. `
            : `By joining, you agree to pay ${usd(today)} today for your first ${price.period}, then ${usd(price.monthly)} every ${price.period} automatically until you cancel. Cancel anytime in the Tapin app, before ${renewsOn(price)} to avoid the next charge. `}
        <span className="pck-legal">
          <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">Terms</a>
          {" · "}
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Privacy</a>
        </span>
      </p>
      {preview ? (
        /* A block, not a <button>, so it stretches the way the real wallet
           does (the island's negative margins widen it to where Join was). */
        <div
          className="pck-wallet-preview"
          role="button"
          tabIndex={0}
          onClick={() => onPaid("preview")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPaid("preview")}
        >
           Pay
        </div>
      ) : (
      <Elements
        key={cart.dueTodayCents}
        stripe={getStripe()}
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
      )}
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
          buttonHeight: 52,
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

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M7.5 7.5l9 9M16.5 7.5l-9 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="5.5" y="10.5" width="13" height="10" rx="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

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
        line={"Sign in with this same number. Your $5\u00a0back and 15%\u00a0off are waiting."}
        note={texted ? "We’ve also texted you the link." : undefined}
        enter
      />
      <a className="pck-manage" href={appHref()} target="_blank" rel="noopener noreferrer">
        Manage your membership in the app
      </a>
    </div>
  );
}
