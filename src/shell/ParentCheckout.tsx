import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StepBars } from "./StepBars";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type Stripe, type StripeExpressCheckoutElementConfirmEvent, type StripeExpressCheckoutElementOptions } from "@stripe/stripe-js";
import { STRIPE_PUBLISHABLE_KEY } from "../constants";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import {
  confirmParentCheckout,
  keptUtm,
  PARENT_CONSENT_VERSION,
  parentMock,
  startParentCheckout,
  toE164,
  type ParentCheckoutStarted,
  type ParentConfirmed,
} from "../model/parents";
import { clearGiftDraft, getGiftDraft, setGiftDraft, useGiftDraft } from "../model/giftDraft";
import { dropResume, keepFields, keptFields, keptStep, type ResumeStep } from "../model/checkoutResume";
import { ResumeContext, ResumeLine } from "./ResumeLine";
import { BackArrow } from "./BackArrow";
import { GiftSentContext } from "./giftSent";
import { nextBillingDate } from "../model/plus";
import { GLYPHS, Glyph } from "../routes/parents_kit";
import { lockScroll } from "./scrollLock";
import { islandAvoidKeyboard, islandClose, islandOpen, islandOrigin, islandTrackHeight, settle, type IslandOrigin, type IslandParts } from "./island";

/* ══ THE PARENT CHECKOUT (Sam, 5 Nov 2026; docs/parents/API.md) ═════════════
   A parent signs their student up and pays, in one sheet over /parents: a
   bottom sheet on a phone, a card in the middle on a computer.

     1. The form: the student's first name and number (typed twice, Sam:
        "we can have them type the number twice yeah"), then the parent's
        name and mobile (no email for now, Sam, 6 Nov 2026: "let's not
        capture parent emails and just do phone number for now since we
        don't have automated emails hooked up yet"; the email is asked for
        again since), and two marketing boxes, texts and email, unticked
        until ticked (6 Nov 2026). From an Ask a parent link the student is
        already known, so it shows who's covered.
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
  onEditGift,
  embedded = false,
  onCollapse,
}: {
  open: boolean;
  onClose: () => void;
  ask: Ask | null;
  from?: HTMLElement | null;
  /** Back to the care package (the builder on /parents, on its note). */
  onEditGift: () => void;
  /** Steps 2 to 4 inside the builder's panel (Sam, 6 Nov 2026: "it'd be one
   *  continuous flow ... I hit continue and then the next screens in this
   *  modal that overlays the care package view"): no island, no scrim, no
   *  scroll lock or focus trap of its own; the builder owns those. */
  embedded?: boolean;
  /** Inside the phone builder's drawer: its × collapses the drawer instead
   *  of leaving (Sam, 6 Nov 2026). */
  onCollapse?: () => void;
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
      onEditGift={onEditGift}
      embedded={embedded}
      onCollapse={onCollapse}
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
/** A name starting a sentence ("maya" as typed: "Maya opens it"). */
const cap = (name: string) => (name ? name.charAt(0).toUpperCase() + name.slice(1) : name);
/** "Nov 21": `n` days from today. */
const inDays = (n: number) =>
  new Date(Date.now() + n * 864e5).toLocaleDateString("en-US", { month: "short", day: "numeric" }).replace(" ", " ");

/* The done step's glyphs, in the page's family (parents_kit Glyph): an open
   eye, a bell, a speech bubble. */
const EYE = "M3.5 12s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z";
const BELL = "M18 15.5V11a6 6 0 0 0-12 0v4.5L4.5 17.5h15L18 15.5ZM10 20.5h4";
const TEXT_BUBBLE = "M20 11.5c0 4-3.6 7-8 7-1.1 0-2.2-.2-3.1-.5L4 19.5l1.4-3.6C4.5 14.7 4 13.2 4 11.5c0-4 3.6-7 8-7s8 3 8 7Z";

/* The student, then you, then the card, one at a time (Sam, 5 Nov 2026:
   "we should have these two at separate steps of the checkout process"). An
   ask link already knows the student, so it starts at "you". */
/* The gift first (Sam, 6 Nov 2026: "we're not asking for them to add phone
   number and payment until the end after the sunk cost of building their
   note first"; then "the preview we already have is the first step. that
   way we only have one purchase funnel"). Step 1, the care package, is the
   builder on /parents (routes/GiftPage.tsx GiftPreview), in three stages
   (Sam, 6 Nov 2026): the look, the opening, the note. This sheet is steps 4
   to 6: their number, you, the charge. An ask link knows the student, so
   it's the look, the opening, the note, you, the charge. */
type Step = "look" | "open" | "note" | "student" | "you" | "pay" | "done";

/* Once a card has been charged, that checkout is kept for the page's life,
   so closing and reopening the sheet picks it up again (it only needs
   confirming) instead of starting a new one that would charge again. */
let charged: { started: ParentCheckoutStarted; paymentIntent: string; who: string; masked: string; phone: string | null; hasNote: boolean } | null = null;
/** A card already charged whose checkout still needs confirming: the
 *  builder goes straight to it (its gift went with the charge). */
export const hasChargedParentCheckout = () => charged !== null;
type Field = "student" | "phone" | "confirm" | "name" | "email" | "mobile" | "note" | "from";

/** Where a save from earlier (model/checkoutResume.ts) comes back to: the
 *  step they left, or the furthest one before it that has what it needs
 *  (their number needs the student's name; you needs their number, or an ask
 *  link; the charge needs you). Null with no save. An ask link's student is
 *  theirs, so its own flow decides (it has no number step). */
export function resumeStep(ask: boolean): ResumeStep | null {
  /* Never back onto pay itself: that would start a checkout on load, and
     with the consent boxes unticked again. "You" comes back filled, with
     the boxes in view, one tap from pay. */
  const kept = keptStep();
  if (!kept) return null;
  const at: ResumeStep = kept === "pay" ? "you" : kept;
  const f = keptFields();
  const to = getGiftDraft().to.trim();
  const order: ResumeStep[] = ["look", "open", "note", "student", "you", "pay"];
  const ok = (s: ResumeStep): boolean =>
    s === "student"
      ? !ask && !!to
      : s === "you"
        ? ask || (!!to && !!toE164(f.phone) && f.confirm === f.phone)
        : s === "pay"
          ? ok("you") && !!f.name.trim() && EMAIL.test(f.email.trim()) && !!toE164(f.mobile)
          : true;
  for (let i = order.indexOf(at); i >= 0; i--) if (ok(order[i])) return order[i];
  return "look";
}

function Sheet({
  ask,
  from,
  onEditGift,
  embedded,
  onCollapse,
  closing,
  onGone,
  onClose,
}: {
  ask: Ask | null;
  from: HTMLElement | null;
  onEditGift: () => void;
  embedded: boolean;
  onCollapse?: () => void;
  closing: boolean;
  onGone: () => void;
  onClose: () => void;
}) {
  const { track } = useEventTracking();
  const source = ask ? "ask_link" : "parent_page";
  const mock = parentMock();

  /* A save from earlier (resumeStep): back on its step. The charge makes
     its checkout again the normal way (start, below, as Continue to payment
     does), so it opens on you while that runs. */
  const [plan] = useState<ResumeStep | null>(() => (charged ? null : resumeStep(!!ask)));
  const [step, setStep] = useState<Step>(() =>
    charged ? "pay" : plan === "student" || plan === "you" ? plan : plan === "pay" ? "you" : ask ? "you" : "student",
  );
  const resume = useContext(ResumeContext);
  /* The student's name, note, sign-off, background and photo are the gift
     draft (model/giftDraft.ts), shared with the preview on /parents, so what
     a parent typed there is here already (Sam, 6 Nov 2026: "so they don't
     have to do it twice"). */
  const draft = useGiftDraft();
  const student = draft.to;
  const setStudent = (to: string) => setGiftDraft({ to });
  /* What they typed here before, kept in this browser for a day
     (model/checkoutResume.ts). An ask link's student number is the link's,
     so a saved one isn't put back. */
  const [saved] = useState(keptFields);
  const [phone, setPhone] = useState(ask ? "" : saved.phone);
  const [confirm, setConfirm] = useState(ask ? "" : saved.confirm);
  const [name, setName] = useState(saved.name);
  /* Kept, never emailed for now (Sam, 6 Nov 2026: "No email at all right
     now. Although I think it'd make sense to capture their emails
     regardless"); the parent is texted. */
  const [email, setEmail] = useState(saved.email);
  const [mobile, setMobile] = useState(saved.mobile);
  useEffect(() => {
    keepFields(ask ? { name, email, mobile } : { phone, confirm, name, email, mobile });
  }, [ask, phone, confirm, name, email, mobile]);
  /* Marketing, texts and email, each unticked until ticked (Sam, 6 Nov
     2026); kept while they go back and forth between the steps, never kept
     for later: consent is given fresh. */
  const [mktSms, setMktSms] = useState(false);
  const [mktEmail, setMktEmail] = useState(false);
  /* The care package as the builder left it (step 1): the note and how it's
     signed, the background and the photo, all optional; whatever is filled
     in goes with the checkout. */
  const noteOpen = true;
  const giftNote = draft.note;
  const giftFrom = draft.from;
  const giftScene = draft.scene;
  const giftPhoto = draft.photo;
  /* The photo is picked in the builder; nothing here is still loading it. */
  const photoBusy = false;
  /* Whether a note went to parent_checkout_start: what the done screen says,
     kept across a resumed payment (the fields start empty again then). */
  const [sentNote, setSentNote] = useState(() => charged?.hasNote ?? false);

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
  /* The step's body; embedded, it's also what scrolls (the panel's body). */
  const setBody = useCallback(
    (el: HTMLDivElement | null) => {
      body.current = el;
      if (embedded) inner.current = el;
    },
    [embedded],
  );
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
    if (embedded) return then();
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
    if (embedded) return;
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
    if (embedded) {
      node.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
      return;
    }
    const first = wide() ? node.querySelector<HTMLElement>("input") : null;
    (first ?? node).focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      /* The gift preview over the sheet owns the keys while it's open. */
      if (document.querySelector(".gft-preview")) return;
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

  /* The width between steps (Sam, 6 Nov 2026: "on desktop this step in
     checkout can morph to be wider"). On a computer the you step is wider
     than the others (data-wide, parent-checkout.css). The new width is laid
     out before the paint, then the sheet eases there from the width it had,
     so the header and the step bars stretch with it while the step's own
     contents fade in (below). Its height follows as it always does
     (islandTrackHeight). On a phone every step is the same width, so
     nothing runs. */
  const sheetWidth = useRef<number | null>(null);
  /* Set when the width eases, so the step's contents wait a beat for it. */
  const morphed = useRef(false);
  useLayoutEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const was = sheetWidth.current;
    const now = el.getBoundingClientRect().width;
    sheetWidth.current = now;
    morphed.current = false;
    if (embedded) return;
    if (was == null || Math.abs(now - was) < 2 || still() || typeof el.animate !== "function") return;
    morphed.current = true;
    /* max-width off while it eases: the narrower step's cap would clamp the
       wider width it starts from, and it would jump. */
    el.animate([{ width: `${was}px`, maxWidth: "none" }, { width: `${now}px`, maxWidth: "none" }], { duration: 420, easing: EASE });
  }, [step]);

  /* Step to step. Embedded, as the builder's stages move (GiftPage): the
     title, its line and the body slide in from the side they come from, and
     on a phone the drawer eases to the new step's height. On its own, each
     step comes in with a short lift. Either way the heading takes focus so
     a screen reader says where it is, and the body starts at its top. */
  const ORDER: Step[] = ["student", "you", "pay", "done"];
  const shownStep = useRef(step);
  const heightFrom = useRef<number | null>(null);
  const toStep = (next: Step) => {
    const panel = embedded ? sheet.current?.closest<HTMLElement>(".gft-preview-panel") : null;
    heightFrom.current = panel ? panel.getBoundingClientRect().height : null;
    setStep(next);
  };
  useLayoutEffect(() => {
    if (shownStep.current === step) return;
    const dir = ORDER.indexOf(step) >= ORDER.indexOf(shownStep.current) ? 1 : -1;
    shownStep.current = step;
    inner.current?.scrollTo?.({ top: 0 });
    document.getElementById("prc-title")?.focus({ preventScroll: true });
    const was = heightFrom.current;
    heightFrom.current = null;
    if (still()) return;
    if (embedded) {
      const root = sheet.current;
      if (step === "done") {
        /* Done settles in place, row by row, while the preview sends the
           envelope off: every word on screen within about 400ms, never held
           back for the flight (A · It's on its way). */
        root
          ?.querySelectorAll<HTMLElement>(".gft-pp-head > :not(.gft-pp-x), .prc-tl > li, .prc-done-promise, .gft-pp-foot")
          .forEach((el, i) =>
            el.animate?.([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], {
              duration: 420,
              delay: 60 + i * 40,
              easing: EASE,
              fill: "backwards",
            }),
          );
        /* The preview moves the drawer itself (GiftPreview). */
        if (host) return;
      } else
        root?.querySelectorAll<HTMLElement>(".gft-pp-head > :not(.gft-pp-steps):not(.gft-pp-x), .gft-pp-body").forEach((el) =>
          el.animate?.([{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: "none" }], { duration: 360, easing: EASE }),
        );
      const panel = root?.closest<HTMLElement>(".gft-preview-panel");
      if (!panel || was == null || typeof panel.animate !== "function") return;
      const now = panel.getBoundingClientRect().height;
      if (Math.abs(now - was) < 2) return;
      panel.style.overflow = "hidden";
      const a = panel.animate([{ height: `${was}px` }, { height: `${now}px` }], { duration: 380, easing: EASE });
      const end = () => panel.style.removeProperty("overflow");
      a.onfinish = end;
      a.oncancel = end;
      return;
    }
    const b = body.current;
    if (b && typeof b.animate === "function")
      b.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], {
        duration: 260,
        /* While the width eases, the contents (laid out at the new width)
           arrive as it lands rather than stretching with it. */
        delay: morphed.current ? 160 : 0,
        easing: EASE,
        fill: "backwards",
      });
    // On the step changing only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  if (!EMAIL.test(email.trim())) errors.email = "Enter your email.";
  if (!toE164(digitsOf(mobile))) errors.mobile = "Enter your 10-digit US mobile number.";
  const shown = (f: Field) => (tried ? errors[f] : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || photoBusy) return;
    setTried(true);
    setFormError(null);
    const order: Field[] = step === "student" ? ["student", "phone", "confirm"] : ["name", "mobile", "email"];
    const bad = order.find((f) => errors[f]);
    if (bad) {
      document.getElementById(`prc-${bad}`)?.focus();
      return;
    }
    if (step === "student") {
      /* On to you; your fields start fresh, without errors showing. */
      setTried(false);
      toStep("you");
      return;
    }
    await start();
  };

  /* The checkout, made: Continue to payment, or a save from earlier coming
     back to the charge (the same call, so nothing about a payment is ever
     kept). */
  const start = async () => {
    setBusy(true);
    const giftNoteSent = noteOpen && giftNote.trim() ? giftNote.trim() : null;
    const giftFromSent = noteOpen && giftFrom.trim() ? giftFrom.trim().replace(/\s+/g, " ") : null;
    track("parent_checkout_started", {
      source,
      has_note: !!giftNoteSent,
      has_photo: noteOpen && !!giftPhoto,
      gift_scene: noteOpen ? giftScene : null,
      marketing_sms: mktSms,
      marketing_email: mktEmail,
    });
    try {
      const res = await startParentCheckout({
        student_first_name: ask ? ask.student_first_name : student.trim(),
        student_phone: ask ? "" : (toE164(phoneD) as string),
        parent_name: name.trim(),
        parent_phone: toE164(digitsOf(mobile)) as string,
        parent_email: email.trim(),
        ask_token: ask?.token ?? null,
        gift_note: giftNoteSent,
        gift_from: giftFromSent,
        gift_scene: noteOpen ? giftScene : null,
        gift_photo: noteOpen ? giftPhoto : null,
        gift_effect: draft.effect,
        marketing_sms: mktSms,
        marketing_email: mktEmail,
        consent_text_version: PARENT_CONSENT_VERSION,
        utm: keptUtm(),
      });
      setStarted(res);
      /* A gift goes out with a note or a photo (API.md: an ask link's
         student is texted their gift link when there is either). */
      setSentNote(!!giftNoteSent || (noteOpen && !!giftPhoto));
      toStep("pay");
    } catch (err) {
      setFormError((err as Error).message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  /* Back on the charge: made again once, as it opens (a ref, so React's
     dev double mount doesn't make two). */
  const autoStart = useRef(plan === "pay");
  const [resuming, setResuming] = useState(plan === "pay");
  useEffect(() => {
    if (!autoStart.current) return;
    autoStart.current = false;
    void start().finally(() => setResuming(false));
    // Once, as it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* The builder keeps the step for the save. A card taken but not yet
     confirmed comes back no further than you, so a reload never makes a
     second charge by itself. */
  useEffect(() => {
    if (step === "done" || step === "look" || step === "open" || step === "note") return;
    resume?.report(step === "pay" && paid ? "you" : step);
    // On the step changing, and the card being taken.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, paid]);

  const onCharged = (paymentIntent: string) => {
    if (started)
      charged = {
        started,
        paymentIntent,
        who: ask ? ask.student_first_name : student.trim(),
        masked: ask ? ask.masked_phone : maskDigits(phoneD),
        phone: ask ? null : toE164(phoneD) || null,
        hasNote: sentNote,
      };
    setPaid(true);
  };
  /* The gift preview this sits in (GiftPreview), which sends the envelope
     off as this step arrives; null on its own. */
  const host = useContext(GiftSentContext);
  /* When the first moment ("We texted …") fills in: as the envelope leaves. */
  const tickAt = useRef<number | null>(null);
  /* Who it went to, kept as the charge cleared (a resumed payment's fields
     are empty). The student's number is only known when the parent typed it:
     an ask link's is masked. */
  const [sentTo, setSentTo] = useState<{ who: string; masked: string; phone: string | null; texted: boolean } | null>(null);
  const finished = useRef(false);
  const onPaid = (res: ParentConfirmed) => {
    /* Paid: the save from this browser goes now (not just as the builder
       closes), and nothing is kept again until the next gift. */
    dropResume({ hold: true });
    const first = started?.first_cents ?? OFFER.first_cents;
    const to = {
      who: res.student_first_name || who,
      masked: res.masked_phone || masked,
      phone: ask ? null : charged?.phone ?? (toE164(phoneD) || null),
      /* An ask link's student is texted only for a note or a photo (API.md). */
      texted: !ask || sentNote,
    };
    charged = null;
    track("parent_purchase", { value: first / 100, currency: "USD", source, checkout_id: started?.checkout_id });
    if (ask) track("ask_paid", { source });
    finished.current = true;
    /* The preview measures the drawer before it moves, so first. */
    tickAt.current = host ? host.sent({ who: cap(to.who), texted: to.texted }) : null;
    setSentTo(to);
    setDone(res);
    toStep("done");
  };
  /* Sent: the next gift starts fresh. Not as it's paid (the parent's design
     stays on screen for the done step, 7 Nov 2026), but once it's closed:
     the preview clears it as it goes (GiftPreview), or this does on its own. */
  useEffect(
    () => () => {
      if (finished.current && !host) clearGiftDraft();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const who = charged?.who ?? (ask ? ask.student_first_name : student.trim());
  const masked = charged?.masked ?? (ask ? ask.masked_phone : maskDigits(phoneD));
  const first = started?.first_cents ?? OFFER.first_cents;
  const monthly = started?.monthly_cents ?? OFFER.monthly_cents;

  /* An ask link's student isn't texted (they asked), so its button doesn't
     say so. */
  const payLabel = ask ? `Pay ${usd(first)}` : `Pay ${usd(first)} and send their text`;

  /* ── Header ── */
  const title =
    step === "done"
      ? `${possessive(done?.student_first_name || who)} Tapin Plus is on.`
      : step === "pay"
        ? ask
          ? "Pay and turn on their Plus"
          : "Pay and send their text"
        : step === "student"
            ? `Where ${student.trim() ? possessive(student.trim()) : "their"} gift goes`
            : "Last, you";
  /* Every step has its line under the title, as the builder's stages do
     (Sam, 6 Nov 2026: "consistent across every single step of the modal"):
     the price on the details steps, who it's for on the charge (its rows
     and terms say the money), the receipt once it's done. */
  const sub =
    step === "student" || step === "you"
      ? `${usd(first)} the first month, then ${usd(monthly)}/month. Cancel anytime.`
      : step === "pay"
        ? `For ${who}, ${masked}.`
        : step === "done"
          ? `${usd(first)} paid today. We’ll text you a receipt.`
          : null;
  /* The builder's three stages count as the first three bars (GiftPreview's
     stepsTotal), so the count is the same across the whole flow. */
  const STEPS: Step[] = ask ? ["look", "open", "note", "you", "pay"] : ["look", "open", "note", "student", "you", "pay"];
  const barsOn = step === "done" ? STEPS.length : STEPS.indexOf(step) + 1;
  const bars = (className: string) => (
    <StepBars
      className={className}
      total={STEPS.length}
      lit={Math.min(barsOn, STEPS.length)}
      label={`Step ${Math.min(barsOn, STEPS.length)} of ${STEPS.length}`}
    />
  );

  /* Embedded, every step wears the builder's own system (Sam, 6 Nov 2026):
     the white panel, its head (title and ×, the line, the bars), the fields
     straight on white, the foot with Continue and the back arrow, all in
     the builder's classes (gift.css gft-pp-*), so nothing changes between
     the care package's stages and these. The sheet on its own keeps its
     grey ground and white modules (parent-checkout.css). */
  const flat = embedded;
  const cta = flat ? "gft-pp-cta" : "prc-cta";
  const arrowClass = flat ? "gft-pp-backarrow" : "prc-backarrow";
  const group = (legend: string, kids: React.ReactNode) =>
    flat ? (
      <div className="gft-pp-group">{kids}</div>
    ) : (
      <fieldset className="prc-module">
        <legend className="prc-legend">{legend}</legend>
        <div className="prc-fields">{kids}</div>
      </fieldset>
    );
  const errorLine = (msg: string | null) =>
    msg ? (
      <p className={flat ? "gft-pp-error" : "prc-error"} role="alert">
        {msg}
      </p>
    ) : null;
  /* The step's body and its foot: embedded, the panel's scrolling body and
     its foot under it (the head stays put above); on its own, one column
     in the sheet's scroller with the bars on top. */
  const frame: Frame = (kids, foot) =>
    flat ? (
      <>
        <div ref={setBody} className="gft-pp-body prc-e-body">
          {kids}
        </div>
        <div className="gft-pp-foot">{foot}</div>
      </>
    ) : (
      <div ref={setBody}>
        <div className="prc-body">
          {step === "done" ? null : bars("prc-steps")}
          {kids}
          <div className="prc-foot">{foot}</div>
        </div>
      </div>
    );

  const head = flat ? (
    <div className="gft-pp-head">
      <h2 id="prc-title" className="gft-pp-title" tabIndex={-1}>
        {title}
      </h2>
      {/* The phone drawer's ×, collapsing it, as on the care package's
          stages; a computer's way out is Close in the left card. */}
      {onCollapse && step !== "done" ? (
        <button type="button" className="gft-pp-x" aria-label="Collapse" onClick={onCollapse} disabled={busy}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
      {sub ? <p className="gft-pp-sub tnum">{sub}</p> : null}
      <ResumeLine step={resuming ? "pay" : step} />
      {/* Done needs no count (A · It's on its way, 7 Nov 2026). */}
      {step === "done" ? null : bars("gft-pp-steps")}
    </div>
  ) : (
    <div className="prc-top">
      <div className="prc-head">
        <h2 id="prc-title" className="prc-title" tabIndex={-1}>
          {title}
        </h2>
        {sub ? <p className="prc-sub tnum">{sub}</p> : null}
      </div>
      {step !== "done" ? (
        <button type="button" className="prc-x" aria-label={onCollapse ? "Collapse" : "Close"} onClick={onCollapse ?? close} disabled={busy}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );

  let view: React.ReactNode = null;
  if (step === "student" || step === "you") {
    const fields =
      step === "student" ? (
        group(
          "Their number",
          <>
            {/* Named in the builder; asked here only if it isn't. */}
            {student.trim() && !shown("student") ? null : (
              <Input id="student" label="Your student’s first name" value={student} onChange={setStudent} error={shown("student")} autoComplete="off" autoCapitalize="words" maxLength={40} />
            )}
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
          </>,
        )
      ) : (
        <>
          {/* The mobile above the email, so the texts box under them can say
              "the number above" and mean it. */}
          {group(
            "You",
            <>
              <Input id="name" label="Your name" value={name} onChange={setName} error={shown("name")} autoComplete="name" autoCapitalize="words" maxLength={80} />
              <Input id="mobile" label="Your mobile" value={mobile.trim() ? formatPhone(digitsOf(mobile)) : mobile} onChange={(v) => setMobile(digitsOf(v))} error={shown("mobile")} tel autoComplete="tel-national" />
              <Input id="email" label="Your email" value={email} onChange={setEmail} error={shown("email")} autoComplete="email" type="email" inputMode="email" />
            </>,
          )}
          {/* Marketing, each its own box, both unticked until they tick
              them (Sam, 6 Nov 2026), with the texts' disclosure under its
              box. Sent with the checkout (PARENT_CONSENT_VERSION). */}
          <div className="prc-consents">
            <Consent id="mkt-sms" checked={mktSms} onChange={setMktSms} label="Text me about free gifts and offers for my student">
              By checking this, you agree to get recurring automated marketing texts from Tapin at the number above. Consent isn’t a condition of purchase. Msg frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.{" "}
              <Legal />
            </Consent>
            <Consent id="mkt-email" checked={mktEmail} onChange={setMktEmail} label="Email me about free gifts and offers for my student" />
          </div>
        </>
      );
    view = (
      <form className="prc-form" onSubmit={submit} noValidate>
        {frame(
          <>
            {fields}
            {errorLine(formError)}
          </>,
          <>
            {/* Back a step beside Continue, as the builder's stages have it
                (Sam, 6 Nov 2026): their number goes back to the note; you,
                to their number (an ask link's, to the note). */}
            <BackArrow className={arrowClass} onClick={step === "you" && !ask ? () => toStep("student") : onEditGift} disabled={busy} />
            <button type="submit" className={cta} data-island-cta="" disabled={busy || photoBusy}>
              {busy ? "One moment…" : formError ? "Try again" : step === "you" ? "Continue to payment" : "Continue"}
            </button>
          </>,
        )}
      </form>
    );
  } else if (step === "pay" && started) {
    /* The charge: what's due, straight on the panel. Back to you beside Pay
       (Sam, 6 Nov 2026: "wouldn't we want a back button here?"), with
       everything kept; once the card is charged there's no going back. */
    const rows = (
      <div className={flat ? "prc-e-rows" : "prc-module prc-rows"}>
        <div className="prc-row">
          <span>Due today</span>
          <b className="tnum">{usd(first)}</b>
        </div>
        <div className="prc-row">
          <span>Then</span>
          {/* The date the next charge comes (Sam, 7 Nov 2026). */}
          <b className="tnum">{`${usd(monthly)} a month from ${renewsOn()}`}</b>
        </div>
      </div>
    );
    /* The promise, right above Pay (Sam, 7 Nov 2026: "go for it"): what a
       hesitating parent needs at the button. The 14-day refund isn't on an
       ask link (their student is signed in already), so that line drops its first half there. */
    const promise = (
      <ul className="prc-promise" aria-label="Our promise">
        <li>
          <Glyph d={GLYPHS.refund} />
          <span className="tnum">
            <b>Full refund</b> if they don’t {ask ? "" : "sign in within 14 days or don’t "}save what you spent
          </span>
        </li>
        <li>
          <Glyph d={GLYPHS.mail} />
          <span>
            <b>Cancel or skip anytime</b> by emailing support@tapin.app
          </span>
        </li>
        <li>
          <Glyph d={GLYPHS.text} />
          <span>We’ll text you a few days before each renewal</span>
        </li>
      </ul>
    );
    const pay = { paying, onBusy: setBusy, onPaid, onDone: close, label: payLabel, frame, rows, promise, onBack: () => toStep("you"), backDisabled: paid || busy };
    view = mock ? (
      <MockPay first={first} monthly={monthly} {...pay} />
    ) : (
      <Elements stripe={getStripe()} options={{ clientSecret: started.client_secret, appearance: APPEARANCE, fonts: FONTS }}>
        <StripePay started={started} onCharged={onCharged} resumeIntent={charged?.paymentIntent ?? null} {...pay} />
      </Elements>
    );
  } else if (step === "done" && done) {
    /* A · It's on its way (Sam, 7 Nov 2026: "lets do A on its way for after
       they pay"): what happens next, three moments on one line, then the
       pay step's promise on paper, then a quiet way to give them a heads-up
       beside Done. Never she or he for the student: their name, or they. */
    const to = sentTo ?? { who: done.student_first_name || who, masked: done.masked_phone || masked, phone: null, texted: !ask || sentNote };
    const Who = cap(to.who);
    /* The student is texted their gift link at checkout; an ask link's only
       for a note or a photo (API.md step 4), and an ask link's student has
       signed in to Tapin already (they asked from the app). */
    const first = to.texted ? (
      <>
        <b>We texted {Who}</b>
        <p className="tnum">A link to your gift, sent to {to.masked} just now.</p>
      </>
    ) : (
      <>
        <b>It’s on their account now</b>
        <p className="tnum">
          Plus is on {possessive(Who)} number, {to.masked}. They asked for it, so there’s no text.
        </p>
      </>
    );
    const second = ask ? (
      to.texted ? (
        <>
          <b>{Who} opens it</b>
          <p>Plus is already on their Tapin account.</p>
        </>
      ) : (
        <>
          <b>{Who} opens Tapin</b>
          <p>Plus is there the next time they do.</p>
        </>
      )
    ) : (
      <>
        <b>{Who} opens it</b>
        <p>They sign in to Tapin, and Plus is there.</p>
      </>
    );
    const timeline = (
      <ol className="prc-tl" aria-label="What happens next">
        <li data-now="">
          <RingTick at={tickAt.current} />
          <div>{first}</div>
        </li>
        <li>
          <span className="prc-tl-mk" aria-hidden="true">
            <Glyph d={EYE} />
          </span>
          <div>{second}</div>
        </li>
        <li>
          <span className="prc-tl-mk" aria-hidden="true">
            <Glyph d={BELL} />
          </span>
          <div>
            <b>Before each bill</b>
            <p className="tnum">
              We text you a few days before each {usd(monthly)} renewal. The first is {renewsOn()}.
            </p>
          </div>
        </li>
      </ol>
    );
    /* The pay step's promise rows, on paper; the 14-day refund isn't on an
       ask link, as there. */
    const promise = (
      <ul className="prc-promise prc-done-promise" aria-label="Our promise">
        <li>
          <Glyph d={GLYPHS.refund} />
          <span className="tnum">
            <b>Full refund</b> if they don’t {ask ? "" : `sign in by ${inDays(14)} or don’t `}save what you spent
          </span>
        </li>
        <li>
          <Glyph d={GLYPHS.mail} />
          <span>
            <b>Cancel or skip anytime</b> by emailing <a href="mailto:support@tapin.app">support@tapin.app</a>
          </span>
        </li>
        <li className="prc-done-how-row">
          <Link className="prc-done-how" to="/parents/account">
            How to change or cancel
            <Glyph d={GLYPHS.arrow} />
          </Link>
        </li>
      </ul>
    );
    /* A heads-up from them, in their own messages app; it needs the number
       they typed, so an ask link (masked) has none. `?&body=` reads on iOS
       and Android alike. */
    const sms = to.phone ? `sms:${to.phone}?&body=${encodeURIComponent(`${Who}, I sent you something! Look for a text from Tapin.`)}` : null;
    view = frame(
      <div className={flat ? "prc-e-done" : "prc-module prc-done"} role="status">
        {timeline}
        {promise}
      </div>,
      <>
        {sms ? (
          <a className="prc-e-text" href={sms}>
            <Glyph d={TEXT_BUBBLE} />
            Text {Who}
          </a>
        ) : null}
        <button type="button" className={cta} onClick={close}>
          Done
        </button>
      </>,
    );
  }

  if (embedded)
    return (
      <FlatLook.Provider value>
        <div className="prc-embedded ph-no-capture" ref={sheet} aria-labelledby="prc-title" role="group" tabIndex={-1}>
          {head}
          {view}
        </div>
      </FlatLook.Provider>
    );
  return createPortal(
    <div className="prc-layer" ref={layer}>
      <div ref={scrim} className="prc-scrim" aria-hidden="true" onClick={close} />
      {/* ph-no-capture: the names, the note and the photo are a family's
          own, so session replay and autocapture skip the whole sheet. */}
      {/* data-wide: the you step, widest of the steps on a computer (Sam,
          6 Nov 2026: "on desktop this step in checkout can morph to be
          wider"); the width eases between steps (the effect above). */}
      <div className="prc-sheet prc-island ph-no-capture" ref={sheet} data-wide={step === "you" ? "" : undefined} role="dialog" aria-modal="true" aria-labelledby="prc-title" tabIndex={-1}>
        {/* A stand-in for the tapped button, carried as it grows and back as it shrinks. */}
        <span ref={label} className="prc-island-label" aria-hidden="true" />
        <div ref={inner} className="prc-island-inner">
          {head}
          {view}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Embedded: the builder's look (gift.css gft-pp-*) ───────────────────── */
/** Inside the builder's panel: fields, boxes and the pay form wear the
 *  builder's classes instead of the sheet's own modules. */
const FlatLook = createContext(false);
/** A step's body and foot, laid out for where the sheet is (Sheet frame). */
type Frame = (kids: React.ReactNode, foot: React.ReactNode) => React.ReactNode;

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
  placeholder,
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
  placeholder?: string;
}) {
  const flat = useContext(FlatLook);
  const fid = `prc-${id}`;
  const described = [help ? `${fid}-help` : null, error ? `${fid}-error` : null].filter(Boolean).join(" ") || undefined;
  const input = (
    <input
      id={fid}
      type={tel ? "tel" : type}
      inputMode={tel ? "numeric" : inputMode}
      autoComplete={tel ? (autoComplete ?? "off") : autoComplete}
      autoCapitalize={autoCapitalize}
      autoCorrect="off"
      spellCheck={false}
      placeholder={tel ? "(540) 555-0123" : placeholder}
      maxLength={maxLength}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={described}
      className={tel ? "tnum" : undefined}
    />
  );
  const tick = ok ? (
    <span className="prc-ok" aria-label="Numbers match">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="m6.5 12.5 3.6 3.6 7.4-7.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : null;
  /* The builder's field: its label line, its grey box, its red ring and
     line for an error (GiftPage noteFields). */
  if (flat)
    return (
      <div className="gft-pp-field" data-error={error ? "" : undefined}>
        <label htmlFor={fid}>{label}</label>
        <div className="prc-e-box">
          {input}
          {tick}
        </div>
        {error ? (
          <small id={`${fid}-error`} className="gft-pp-error">
            {error}
          </small>
        ) : null}
        {help ? (
          <p id={`${fid}-help`} className="prc-e-help">
            {help}
          </p>
        ) : null}
      </div>
    );
  return (
    <div className="prc-field" data-bad={error ? "" : undefined}>
      <label className="prc-label" htmlFor={fid}>
        {label}
      </label>
      <div className="prc-box">
        {input}
        {tick}
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

/* ── A consent box (Sam, 6 Nov 2026): unticked until ticked ─────────────── */
function Consent({
  id,
  checked,
  onChange,
  label,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
  /** What ticking it agrees to, under it. */
  children?: React.ReactNode;
}) {
  const fid = `prc-${id}`;
  return (
    <div className="prc-consent">
      <label className="prc-check" htmlFor={fid}>
        <input id={fid} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={children ? `${fid}-fine` : undefined} />
        <span className="prc-check-box" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="m6.5 12.5 3.6 3.6 7.4-7.6" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="prc-check-text">{label}</span>
      </label>
      {children ? (
        <p id={`${fid}-fine`} className="prc-fine">
          {children}
        </p>
      ) : null}
    </div>
  );
}

/* ── Terms and Privacy, linked the same way everywhere ───────────────────── */
function Legal() {
  return (
    <span className="prc-legal">
      <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
        Terms
      </a>
      {" · "}
      <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
        Privacy
      </a>
    </span>
  );
}

/* ── The terms, right by the button that charges ─────────────────────────── */
/** "Dec 7": a month from today, placed as Stripe places it. */
const renewsOn = () =>
  nextBillingDate({ interval: "month", interval_count: 1 } as Parameters<typeof nextBillingDate>[0])
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .replace(" ", "\u00a0");

function Terms({ first, monthly }: { first: number; monthly: number }) {
  const flat = useContext(FlatLook);
  return (
    <p className={flat ? "prc-fine prc-e-terms tnum" : "prc-terms tnum"}>
      {/* Short: the promise above Pay carries cancelling (Sam, 7 Nov 2026);
          this keeps the price, the renewal and the links. */}
      {`${usd(first)} today, then ${usd(monthly)}/month until you cancel. `}
      <Legal />
    </p>
  );
}

/* ── Stripe: the Payment Element on the first invoice's PaymentIntent ───── */
/* Its fields as the builder's are (gift.css .gft-pp-field): the grey box
   with a hairline, 12px corners, 16px type, the label line muted. */
const APPEARANCE: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#141618",
    colorText: "#141618",
    colorTextSecondary: "rgba(20, 22, 24, 0.62)",
    colorBackground: "#ffffff",
    colorDanger: "#b42318",
    fontFamily: "Gilroy, Arial, sans-serif",
    fontWeightNormal: "500",
    fontSizeBase: "16px",
    /* 14px: the wallet buttons take Elements' borderRadius, to match the
       builder's Pay (gift.css .gft-pp-cta); the card fields keep 12px below. */
    borderRadius: "14px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { boxShadow: "none", border: "1px solid rgba(20, 22, 24, 0.06)", backgroundColor: "#f0f0f0", borderRadius: "12px" },
    ".Input:focus": { boxShadow: "0 0 0 1px #141618", border: "1px solid #141618" },
    ".Input--invalid": { boxShadow: "0 0 0 1px #b42318", border: "1px solid #b42318" },
    ".Label": { fontWeight: "500", fontSize: "13px", color: "rgba(20, 22, 24, 0.62)" },
    ".Error": { fontSize: "13px" },
    ".Tab": { boxShadow: "none", border: "1px solid rgba(20, 22, 24, 0.06)", backgroundColor: "#f0f0f0" },
    ".Tab--selected": { border: "1px solid #141618", boxShadow: "0 0 0 1px #141618", backgroundColor: "#ffffff" },
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
  /** Lays the body and the foot out for where the sheet is. */
  frame: Frame;
  /** What's due, above the card. */
  rows: React.ReactNode;
  /** The promise, just above Pay. */
  promise: React.ReactNode;
  /** Back to you, beside Pay (Sam, 6 Nov 2026). */
  onBack: () => void;
  backDisabled: boolean;
};

/* The backend refused after taking the money and refunded it (someone else
   already covers this number): nothing to retry. */
const isFinalRefusal = (msg: string) => /refunded you/i.test(msg);

/* The pay step's foot: the back arrow, then Pay filling the rest, as every
   other step's Continue; Done alone once a refusal is final. */
function PayFoot({ error, busy, disabled, label, onPay, onDone, onBack, backDisabled }: { error: string | null; busy: boolean; disabled: boolean; label: string; onPay: () => void; onDone: () => void; onBack: () => void; backDisabled: boolean }) {
  const flat = useContext(FlatLook);
  const cta = flat ? "gft-pp-cta" : "prc-cta";
  if (error && isFinalRefusal(error))
    return (
      <button type="button" className={cta} onClick={onDone}>
        Done
      </button>
    );
  return (
    <>
      <BackArrow className={flat ? "gft-pp-backarrow" : "prc-backarrow"} onClick={onBack} disabled={backDisabled || busy} />
      <button type="button" className={cta} data-island-cta="" onClick={onPay} disabled={disabled}>
        {label}
      </button>
    </>
  );
}

/* ── The wallet row: Apple Pay and Google Pay above the card (Sam, 7 Nov) ──
   Three ways to pay on one step: a wallet button at the top, which pays at
   once, or the card fields under it, which the foot's Pay submits. */
const WALLET_OPTIONS: StripeExpressCheckoutElementOptions = {
  paymentMethods: { applePay: "auto", googlePay: "auto", link: "never", amazonPay: "never", paypal: "never", klarna: "never" },
  buttonType: { applePay: "plain", googlePay: "plain" },
  buttonTheme: { applePay: "black", googlePay: "white" },
  buttonHeight: 52,
  layout: { maxColumns: 2, overflow: "never" },
};

/** "or pay with card": between the wallet row and the card fields. */
function OrCard() {
  return (
    <p className="prc-or" aria-hidden="true">
      <span>or pay with card</span>
    </p>
  );
}

/* NOTE FOR KIRAN (Sam, 7 Nov 2026; docs/parents/API.md, "Paying: wallets and
   card"): the wallet row is Stripe's Express Checkout Element on the same
   Elements (the same first-invoice PaymentIntent) as the card fields. Its
   confirm runs `confirm()` below, the same stripe.confirmPayment + onCharged
   + parent_checkout_confirm as the card's Pay, under the same guards.
   For the buttons to show in production:
   - Apple Pay: register plus.tapin.app (and every staging/preview host) in
     Stripe, Settings → Payment methods → Payment method domains (Apple Pay
     domains). Unregistered hosts simply show no Apple Pay button.
   - Turn Apple Pay and Google Pay on in the Stripe account's payment method
     settings; the PaymentIntent must allow `card` (both wallets ride on it).
     To keep the card form to card fields only, the intent shouldn't offer
     other methods (Link, Cash App, Klarna…): `payment_method_types: ["card"]`
     on the subscription's payment_settings, or turn them off in the
     Dashboard's payment method configuration.
   - HTTPS only (localhost is exempt for Google Pay, not for Apple Pay), and
     Apple Pay needs Safari with a card in Wallet.
   - Optional: pass `applePay.recurringPaymentRequest` (monthly amount, label,
     managementURL) in WALLET_OPTIONS so Apple's sheet shows the renewal. */
function StripePay({
  started,
  paying,
  onBusy,
  onPaid,
  onCharged,
  onDone,
  label,
  resumeIntent,
  frame,
  rows,
  promise,
  onBack,
  backDisabled,
}: PayProps & { started: ParentCheckoutStarted; onCharged: (paymentIntent: string) => void; resumeIntent: string | null }) {
  const flat = useContext(FlatLook);
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  /* The wallet row: hidden until Stripe says a wallet can show, and gone if
     none can (no Apple Pay or Google Pay on this device or browser). */
  const [wallets, setWallets] = useState<"pending" | "shown" | "none">("pending");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Once the card has been charged, a retry only confirms: never pay twice. */
  const paidIntent = useRef<string | null>(resumeIntent);

  /* One path for both ways to pay: the card's Pay (no event) and a wallet's
     confirm (its event, told when we can't go on so its sheet closes). */
  const confirm = async (wallet?: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements || paying.current) {
      wallet?.paymentFailed({ reason: "fail" });
      return;
    }
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
  const pay = () => confirm();

  /* Charged already (a retry after the backend failed): Finish only confirms,
     so the wallets go. */
  const walletRow =
    wallets !== "none" && !paidIntent.current ? (
      <div className="prc-wallets" data-pending={wallets === "pending" ? "" : undefined}>
        <ExpressCheckoutElement
          options={WALLET_OPTIONS}
          onReady={({ availablePaymentMethods: m }) => setWallets(m && (m.applePay || m.googlePay) ? "shown" : "none")}
          onLoadError={() => setWallets("none")}
          onClick={(e) => (paying.current || busy ? e.reject() : e.resolve())}
          onConfirm={(e) => confirm(e)}
        />
      </div>
    ) : null;
  const element = (
    <div className={flat ? "prc-e-pay" : "prc-module prc-pay"}>
      <PaymentElement
        options={{ wallets: { applePay: "never", googlePay: "never", link: "never" }, layout: "tabs" }}
        onReady={() => setReady(true)}
        onLoadError={() => setError("The payment form didn’t load. Close this and try again.")}
      />
      {!ready && !error ? <div className="prc-pay-wait" aria-busy="true" /> : null}
    </div>
  );
  const methods = (
    <>
      {walletRow}
      {wallets === "shown" && walletRow ? <OrCard /> : null}
      {element}
    </>
  );
  const terms = <Terms first={started.first_cents} monthly={started.monthly_cents} />;
  const errorLine = error ? (
    <p className={flat ? "gft-pp-error" : "prc-error"} role="alert">
      {error}
    </p>
  ) : null;
  return (
    <>
      {frame(
        <>
          {rows}
          {flat ? (
            <div className="gft-pp-group">
              {methods}
              {terms}
            </div>
          ) : (
            <>
              {methods}
              {terms}
            </>
          )}
          {promise}
          {errorLine}
        </>,
        <PayFoot
          error={error}
          busy={busy}
          disabled={busy || (!paidIntent.current && (!ready || !stripe))}
          label={busy ? "Paying…" : paidIntent.current ? "Finish" : label}
          onPay={pay}
          onDone={onDone}
          onBack={onBack}
          backDisabled={backDisabled || !!paidIntent.current}
        />,
      )}
    </>
  );
}

/* ── ?parentmock: the wallet row and a card panel's look, as stand-ins ──── */
const APPLE_D =
  "M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z";
const GOOGLE_D =
  "M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z";

function MockWallets({ onPay, disabled }: { onPay: () => void; disabled: boolean }) {
  return (
    <div className="prc-wallets prc-wallet-mock">
      <button type="button" className="prc-wallet prc-wallet-apple" onClick={onPay} disabled={disabled} aria-label="Pay with Apple Pay (preview)">
        <svg viewBox="0 0 384 512" width="17" height="21" aria-hidden="true">
          <path d={APPLE_D} fill="currentColor" />
        </svg>
        <span>Pay</span>
      </button>
      <button type="button" className="prc-wallet prc-wallet-google" onClick={onPay} disabled={disabled} aria-label="Pay with Google Pay (preview)">
        <svg viewBox="0 0 488 512" width="18" height="19" aria-hidden="true">
          <path d={GOOGLE_D} fill="currentColor" />
        </svg>
        <span>Pay</span>
      </button>
    </div>
  );
}

function MockPay({ first, monthly, paying, onBusy, onPaid, onDone, label, frame, rows, promise, onBack, backDisabled }: PayProps & { first: number; monthly: number }) {
  const flat = useContext(FlatLook);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* The wallet stand-ins and Pay share it, as confirm() is shared above. */
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
  const tag = <p className="prc-mock-tag">Preview: no card is charged</p>;
  const wallets = <MockWallets onPay={pay} disabled={busy} />;
  const card = flat ? (
    <div className="prc-e-mock" aria-label="Card (preview, nothing is charged)">
      <div className="gft-pp-field">
        <span>Card number</span>
        <div className="prc-e-fake tnum">1234 1234 1234 1234</div>
      </div>
      <div className="prc-e-pair">
        <div className="gft-pp-field">
          <span>Expiration</span>
          <div className="prc-e-fake tnum">MM / YY</div>
        </div>
        <div className="gft-pp-field">
          <span>CVC</span>
          <div className="prc-e-fake tnum">CVC</div>
        </div>
      </div>
    </div>
  ) : (
    <div className="prc-module prc-pay prc-mock" aria-label="Card (preview, nothing is charged)">
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
  );
  const methods = (
    <>
      {tag}
      {wallets}
      <OrCard />
      {card}
    </>
  );
  const terms = <Terms first={first} monthly={monthly} />;
  return (
    <>
      {frame(
        <>
          {rows}
          {flat ? (
            <div className="gft-pp-group">
              {methods}
              {terms}
            </div>
          ) : (
            <>
              {methods}
              {terms}
            </>
          )}
          {promise}
          {error ? (
            <p className={flat ? "gft-pp-error" : "prc-error"} role="alert">
              {error}
            </p>
          ) : null}
        </>,
        <PayFoot error={error} busy={busy} disabled={busy} label={busy ? "Paying…" : error ? "Try again" : label} onPay={pay} onDone={onDone} onBack={onBack} backDisabled={backDisabled} />,
      )}
    </>
  );
}

/* ── The tick that draws itself on the done step ─────────────────────────── */
/** The first moment's marker: it waits as an empty ring, like the moments
 *  still to come, and fills green with its tick as the envelope leaves
 *  (`at` ms from now; a beat in when nothing flies). Its resting state is
 *  the filled tick, so reduced motion shows it done. */
function RingTick({ at }: { at: number | null }) {
  const path = useRef<SVGPathElement | null>(null);
  const ring = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const p = path.current;
    const r = ring.current;
    if (!p || !r || still() || typeof r.animate !== "function") return;
    const delay = at ?? 240;
    const fillIn = r.animate(
      [
        { transform: "none", backgroundColor: "#ffffff", boxShadow: "inset 0 0 0 2px rgba(20, 22, 24, 0.16)" },
        { transform: "scale(1.14)", backgroundColor: "#0b7a53", boxShadow: "inset 0 0 0 2px rgba(11, 122, 83, 0)", offset: 0.55 },
        { transform: "none", backgroundColor: "#0b7a53", boxShadow: "inset 0 0 0 2px rgba(11, 122, 83, 0)" },
      ],
      { duration: 480, delay, easing: EASE, fill: "backwards" },
    );
    const draw = p.animate([{ strokeDashoffset: 20 }, { strokeDashoffset: 0 }], { duration: 380, delay: delay + 140, easing: EASE, fill: "backwards" });
    return () => {
      fillIn.cancel();
      draw.cancel();
    };
    // Once, as the step arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span ref={ring} className="prc-tl-mk prc-tl-now" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path ref={path} d="m6.5 12.5 3.6 3.6 7.4-7.6" pathLength={20} strokeDasharray={20} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
