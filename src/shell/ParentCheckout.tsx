import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StepBars } from "./StepBars";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
/* /pure: Stripe.js loads only when loadStripe is called, not on import
   (PageSpeed, 9 Nov 2026). The types come from the main entry, type-only,
   so nothing of it is bundled. */
import { loadStripe } from "@stripe/stripe-js/pure";
import type {
  Appearance,
  Stripe,
  StripeElements,
  StripeElementsOptions,
  ClickResolveDetails,
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementOptions,
} from "@stripe/stripe-js";
import { STRIPE_PUBLISHABLE_KEY } from "../constants";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import { useAuth } from "../context/auth_context";
import { supabase } from "../supabase";
import { toE164 } from "../model/parents";
import { buildPlusCart, type PlusCart } from "../model/checkout";
import { createGift, saveGiftCard, uploadGiftPhoto, type GiftMetadata } from "../model/giftApi";
import { sendCode, verifyCode } from "./authEnv";
import { clearGiftDraft, getGiftDraft, setGiftDraft, useGiftDraft } from "../model/giftDraft";
import { dropResume, keepFields, keptFields, keptQuick, keptStep, type ResumeStep } from "../model/checkoutResume";
import { DEFAULT_NOTE, SCENE_ORDER, giftWho } from "../model/gift";
import { usePlusPrice } from "../model/plus";
import { ResumeContext, ResumeLine } from "./ResumeLine";
import { BackArrow } from "./BackArrow";
import { GiftSentContext } from "./giftSent";
import { nextBillingDate } from "../model/plus";
import { GLYPHS, Glyph } from "../routes/parents_kit";
import { lockScroll } from "./scrollLock";
import { islandAvoidKeyboard, islandClose, islandOpen, islandOrigin, islandTrackHeight, settle, type IslandOrigin, type IslandParts } from "./island";

/* ══ THE PARENT CHECKOUT (Sam, 5 Nov 2026; wired to the real gift backend by
   Kiran, 8 Nov 2026: model/giftApi.ts) ═══════════════════════════════════════
   A parent sends their student Plus as a gift, in one sheet over /parents: a
   bottom sheet on a phone, a card in the middle on a computer.

     1. Who: the student's first name and number, then the parent signs in
        with their own mobile (a code by text, shell/authEnv.ts), since a
        gift is bought by a TapIn user.
     2. The card: saved, not charged. The parent's normal Plus cart
        (buildPlusCart, the welcome offer as usual) and a SetupIntent from
        create_intent with gift: true; Stripe's Payment Element for a card,
        Apple Pay or Google Pay on who it's for once signed in.
     3. Done: create_gift stores the gift (the card's look in its metadata,
        the photo uploaded first) and texts the student a link. Nothing is
        charged until they claim it; unclaimed, it expires and costs nothing.

   THE EFFORT PICKS (Sam, 7 Nov 2026: "these 4 look good"; previews and
   notes in tapin-staging-work/lever-lab/effort):
     B · Send as is: the builder's card can go as it is, straight to who
         it's for (GiftPage sendAsIs), which then shows the card with a
         Change button and asks their first name.
     C · One look screen: the builder's look and opening are one screen.
     D · One "who" step: their number, typed once, and yours on one step
         (it was "Where {name}'s gift goes" and "Last, you").
     E · Wallet first: Apple Pay and Google Pay at the foot of that step,
         saving the card at once (Stripe's deferred intent: the SetupIntent
         is made inside the wallet's confirm), with "Use a card instead"
         going on to the card step. */


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
  from = null,
  onEditGift,
  onChangeLook,
  quick = false,
  embedded = false,
  onCollapse,
}: {
  open: boolean;
  onClose: () => void;
  from?: HTMLElement | null;
  /** Back to the care package (the builder on /parents, on its note; with
   *  Send as is, where that was chosen). */
  onEditGift: () => void;
  /** "Change" on the card's row (Send as is): into the builder on its look. */
  onChangeLook?: () => void;
  /** B · Send as is: the note was skipped, so who it's for asks their first
   *  name and shows the card. */
  quick?: boolean;
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
      from={from}
      onEditGift={onEditGift}
      onChangeLook={onChangeLook ?? onEditGift}
      quick={quick}
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

/* ── Prices ──────────────────────────────────────────────────────────────── */
/* Plus's price as the page shows it (usePlusPrice) until the parent's cart is
   built; then the cart's own first charge, which is what the claim charges. */
const usd = (cents: number) => (cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`);
const cents = (dollars: number | undefined) => (dollars === undefined ? 0 : Math.round(dollars * 100));

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
/** A number a US phone can have (NANP): the area code and the exchange each
 *  start 2 to 9. With the number typed once (Effort D), this and the
 *  read-back under it (OnTheirNumber) stand in for the confirm field. */
const usNumber = (d: string) => /^[2-9]\d{2}[2-9]\d{6}$/.test(d);
const possessive = (name: string) => `${name}’s`;
/** A name starting a sentence ("maya" as typed: "Maya opens it"). */
const cap = (name: string) => (name ? name.charAt(0).toUpperCase() + name.slice(1) : name);

/* The done step's glyphs, in the page's family (parents_kit Glyph): an open
   eye, a bell, a speech bubble. */
const EYE = "M3.5 12s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z";
const BELL = GLYPHS.bell;
const TEXT_BUBBLE = "M20 11.5c0 4-3.6 7-8 7-1.1 0-2.2-.2-3.1-.5L4 19.5l1.4-3.6C4.5 14.7 4 13.2 4 11.5c0-4 3.6-7 8-7s8 3 8 7Z";

/* The gift first (Sam, 6 Nov 2026: "we're not asking for them to add phone
   number and payment until the end after the sunk cost of building their
   note first"; then "the preview we already have is the first step. that
   way we only have one purchase funnel"). The care package is the builder
   on /parents (routes/GiftPage.tsx GiftPreview): the look (with what plays,
   Effort C), then the note. This sheet is the rest: who (their number, typed
   once, and you signing in, one step since Effort D), then the card, which a
   wallet skips (Effort E). With Send as is (Effort B) it's who and the card
   alone. */
type Step = "who" | "pay" | "done";

/* Once the card is saved, that gift is kept for the page's life, so closing
   and reopening the sheet picks it up again (it only needs sending) instead
   of asking for the card again. */
let saved: { cart: PlusCart; setupIntentId: string; who: string; masked: string; phone: string; hasNote: boolean } | null = null;
/** A card already saved whose gift still needs sending: the builder goes
 *  straight to it. */
export const hasSavedGiftCard = () => saved !== null;
type Field = "student" | "phone" | "mobile" | "code";
/** The who step's fields, in the order they're on screen. */
const WHO_FIELDS: Field[] = ["student", "phone", "mobile", "code"];

/** Where a save from earlier (model/checkoutResume.ts) comes back to: the
 *  step they left, or the note when who it's for would have no name (it
 *  asks for one itself only with Send as is). Null with no save. */
export function resumeStep(): ResumeStep | null {
  /* Never back onto the card itself: that would ask for a SetupIntent on
     load. Who comes back filled, one tap from the card. */
  const kept = keptStep();
  if (!kept) return null;
  const at: ResumeStep = kept === "pay" ? "who" : kept;
  if (at !== "who") return at;
  return keptQuick() || getGiftDraft().to.trim() ? "who" : "note";
}

function Sheet({
  from,
  onEditGift,
  onChangeLook,
  quick,
  embedded,
  onCollapse,
  closing,
  onGone,
  onClose,
}: {
  from: HTMLElement | null;
  onEditGift: () => void;
  onChangeLook: () => void;
  quick: boolean;
  embedded: boolean;
  onCollapse?: () => void;
  closing: boolean;
  onGone: () => void;
  onClose: () => void;
}) {
  const { track } = useEventTracking();
  const source = "parent_page";
  /* The parent's TapIn account: a gift is bought signed in. */
  const { accessToken, userSession, displayName } = useAuth();
  const signedIn = !!accessToken;

  /* It opens on who (a save from earlier comes back there too, never on
     the card: resumeStep), or on the card when one was saved and the gift
     only needs sending. */
  const [step, setStep] = useState<Step>(() => (saved ? "pay" : "who"));
  const resume = useContext(ResumeContext);
  /* The student's name, note, sign-off, background and photo are the gift
     draft (model/giftDraft.ts), shared with the preview on /parents, so what
     a parent typed there is here already (Sam, 6 Nov 2026: "so they don't
     have to do it twice"). */
  const draft = useGiftDraft();
  const student = draft.to;
  const setStudent = (to: string) => setGiftDraft({ to });
  /* What they typed here before, kept in this browser for a day
     (model/checkoutResume.ts). */
  const [kept] = useState(keptFields);
  const [phone, setPhone] = useState(kept.phone);
  /* The parent's mobile, for their sign-in, and the code texted to it. */
  const [mobile, setMobile] = useState(kept.mobile);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  useEffect(() => {
    keepFields({ phone, mobile });
  }, [phone, mobile]);
  /* The care package as the builder left it (step 1): the note and how it's
     signed, the background, the effect and the photo, all optional; they go
     in the gift's metadata. */
  const giftNote = draft.note;
  const giftFrom = draft.from;
  const giftScene = draft.scene;
  const giftPhoto = draft.photo;
  /* Whether the gift has a note or a photo: what the done screen says, kept
     across a resumed gift (the fields start empty again then). */
  const [sentNote, setSentNote] = useState(() => saved?.hasNote ?? false);
  /* Their first name on who it's for: with Send as is (the note, where it's
     asked, was skipped), or if it's missing however they got here. Once
     shown it stays while they type. */
  const [nameAsked] = useState(() => !getGiftDraft().to.trim());

  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /* The parent's cart (built once they're signed in) and, for the card step,
     the SetupIntent that saves the card for it. */
  const [cart, setCart] = useState<PlusCart | null>(() => saved?.cart ?? null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  /* The card is saved: no going back to change details. */
  const [cardSaved, setCardSaved] = useState(() => !!saved);
  /* E · Wallet first: whether Apple Pay or Google Pay can show on this
     device. Until Stripe says, and if neither can, the foot is "Continue"
     as before. Only once signed in: a wallet can't sign the parent in. */
  const [wallets, setWallets] = useState<"pending" | "shown" | "none">("pending");
  const walletsShown = signedIn && wallets === "shown";
  /* The card was saved on a wallet but the gift wasn't sent: the card step
     carries on from there, only sending (Finish). */
  const [payError, setPayError] = useState<string | null>(null);
  const [done, setDone] = useState<{ giftId: string; expiresAt: string } | null>(null);
  /* While the card is being saved or the gift sent, the sheet can't be
     closed. */
  const paying = useRef(false);
  const price = usePlusPrice();

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
  const ORDER: Step[] = ["who", "pay", "done"];
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
  const mobileD = digitsOf(mobile);
  /* The signed-in parent's own number (Supabase keeps it as digits). */
  const ownD = digitsOf(userSession?.user?.phone ?? "");
  const codeD = code.replace(/\D/g, "").slice(0, 6);
  /* Their first name is asked here with Send as is (the note was skipped),
     or if it's missing. */
  const showName = quick || nameAsked;
  const Name = cap(student.trim());
  const errors: Partial<Record<Field, React.ReactNode>> = {};
  if (!student.trim()) errors.student = "Add your student’s first name.";
  /* Typed once (Effort D): a full US number, not one no phone can have,
     and not the parent's own (a gift to yourself is refused anyway). */
  if (phoneD.length < 10) errors.phone = "Enter a 10-digit US mobile number.";
  else if (!usNumber(phoneD)) errors.phone = "That isn’t a US mobile number. Check the area code.";
  else if (phoneD === (signedIn ? ownD : mobileD))
    errors.phone = <>That’s your number. Enter {Name ? <span className="ph-mask">{possessive(Name)}</span> : "theirs"}.</>;
  /* Signed out: their mobile, then the code texted to it. */
  if (!signedIn) {
    if (mobileD.length < 10 || !usNumber(mobileD)) errors.mobile = "Enter your 10-digit US mobile number.";
    else if (codeSentTo && codeD.length < 6) errors.code = "Enter the 6-digit code we texted you.";
  }
  const shown = (f: Field) => (tried ? errors[f] : undefined);
  /* Their number is a real one: the "on their number" card under it, with
     the number read back. */
  const numberOk = !errors.phone;
  /* The first field that still needs something, shown and focused; null
     when the step is ready. Their name only counts where it's asked. */
  const firstBad = (): Field | null => WHO_FIELDS.find((f) => errors[f] && (f !== "student" || showName)) ?? null;
  const showErrors = (bad: Field) => {
    setTried(true);
    setFormError(null);
    document.getElementById(`prc-${bad}`)?.focus();
  };

  /* Someone else signs in ("Not you?"): the cart was signed for the last
     one, so it's built again for them. A saved card's gift stays as it is. */
  const signedInId = userSession?.user?.id ?? null;
  const cartFor = useRef(signedInId);
  useEffect(() => {
    if (cartFor.current === signedInId) return;
    cartFor.current = signedInId;
    if (cardSaved) return;
    setCart(null);
    setClientSecret(null);
  }, [signedInId, cardSaved]);

  /* The code goes to their mobile: its field comes up, ready to type. */
  useEffect(() => {
    if (codeSentTo) document.getElementById("prc-code")?.focus();
  }, [codeSentTo]);

  /* Signed in, or on the way: the parent's access token, or null right
     after a code was texted (Continue again with the code checks it). */
  const signIn = async (): Promise<string | null> => {
    if (accessToken) return accessToken;
    const to = toE164(mobileD) as string;
    if (codeSentTo !== to) {
      const err = await sendCode(to);
      if (err) throw new Error(err);
      setCode("");
      setCodeSentTo(to);
      track("parent_code_sent", { source });
      return null;
    }
    const err = await verifyCode(to, codeD);
    if (err) throw new Error(err);
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("We couldn’t sign you in. Please try again.");
    track("parent_signed_in", { source });
    return data.session.access_token;
  };

  /* Another code to the same mobile. */
  const resendCode = async () => {
    if (busy || !codeSentTo) return;
    setBusy(true);
    setFormError(null);
    try {
      const err = await sendCode(codeSentTo);
      if (err) throw new Error(err);
      setCode("");
      document.getElementById("prc-code")?.focus();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /* Their Plus cart, built once for the signed-in parent (the welcome offer
     as usual); the claim rebuilds it for the student. */
  const ensureCart = async (token: string): Promise<PlusCart> => {
    if (cart) return cart;
    const built = await buildPlusCart(token);
    setCart(built);
    return built;
  };

  const startTracking = (path: "card" | "wallet") =>
    track("parent_checkout_started", {
      source,
      has_note: !!giftNote.trim(),
      has_photo: !!giftPhoto,
      gift_scene: giftScene,
      pay_path: path,
      send_as_is: quick,
    });

  /* Continue (or "Use a card instead"): signs the parent in if they aren't
     (a code first, then Continue again with it), then on to the card step
     with the SetupIntent that saves their card. */
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy || paying.current) return;
    setFormError(null);
    const bad = firstBad();
    if (bad) return showErrors(bad);
    setBusy(true);
    try {
      const token = await signIn();
      if (!token) return;
      const built = await ensureCart(token);
      startTracking("card");
      setClientSecret(await saveGiftCard(built, token));
      setPayError(null);
      toStep("pay");
    } catch (err) {
      setFormError((err as Error).message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /* ── E · Wallet first ──
     A wallet tapped before the step is ready shows what's missing and opens
     nothing (the Express Checkout Element's click, rejected). */
  const walletReady = () => {
    if (paying.current || busy) return false;
    const bad = firstBad();
    if (bad) {
      showErrors(bad);
      return false;
    }
    setFormError(null);
    return true;
  };
  /* The wallet's sheet was confirmed: Stripe's deferred intent (the Elements
     on this step have no SetupIntent yet). Check the wallet's details
     (elements.submit), get the SetupIntent as Continue does, save the card
     on it, then send the gift, under the same guards (paying; once saved,
     only sending). Wallets only show signed in. */
  const payByWallet = async (ev: StripeExpressCheckoutElementConfirmEvent, stripe: Stripe | null, elements: StripeElements | null) => {
    let confirming = false;
    let cardIsSaved = false;
    const failSheet = () => {
      if (!confirming) ev.paymentFailed({ reason: "fail" });
    };
    /* Not while a card's start is on its way either (a wallet sheet opened
       just before "Use a card instead" was pressed). */
    if (paying.current || busy || !stripe || !elements || !accessToken) {
      failSheet();
      return;
    }
    paying.current = true;
    setBusy(true);
    setFormError(null);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message || "Your card couldn’t be saved. Please try again.");
      const built = await ensureCart(accessToken);
      startTracking("wallet");
      const secret = await saveGiftCard(built, accessToken);
      confirming = true;
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret: secret,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });
      if (error) throw new Error(error.message || "Your card couldn’t be saved. Please try again.");
      if (setupIntent?.status !== "succeeded") throw new Error("Your card couldn’t be saved. Please try again.");
      onCardSaved(setupIntent.id, built);
      cardIsSaved = true;
      await sendGift();
    } catch (err) {
      const msg = (err as Error).message || "Something went wrong. Please try again.";
      console.error("Parent wallet checkout failed", err);
      failSheet();
      if (cardIsSaved) {
        /* Saved, not sent: the card step's Finish only sends. */
        setPayError(msg);
        toStep("pay");
      } else setFormError(msg);
    } finally {
      paying.current = false;
      setBusy(false);
    }
  };

  /* The builder keeps the step for the save. A card saved but whose gift
     isn't sent comes back no further than who. */
  useEffect(() => {
    if (step === "done") return;
    resume?.report(step === "pay" && cardSaved ? "who" : step);
    // On the step changing, and the card being saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cardSaved]);

  const onCardSaved = (setupIntentId: string, built: PlusCart) => {
    const hasNote = !!giftNote.trim() || !!giftPhoto;
    saved = {
      cart: built,
      setupIntentId,
      who: student.trim(),
      masked: maskDigits(phoneD),
      phone: toE164(phoneD) as string,
      hasNote,
    };
    setSentNote(hasNote);
    setCardSaved(true);
  };

  /* The gift, once its card is saved: the photo uploaded into the parent's
     folder (kept on `saved`, so a retry doesn't upload it twice), then
     create_gift with the card's look as its metadata. Throws with a message
     to show. */
  const photoPath = useRef<string | null>(null);
  const sendGift = async () => {
    const s = saved;
    if (!s) throw new Error("Something went wrong. Please try again.");
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) throw new Error("Sign in again to send your gift.");
    if (giftPhoto && !photoPath.current) photoPath.current = await uploadGiftPhoto(session.user.id, giftPhoto);
    const metadata: GiftMetadata = {
      v: 1,
      from: giftWho(giftFrom, displayName ?? ""),
      /* No note written: the prebuilt one goes (Sam, 9 Nov 2026). */
      note: giftNote.trim() || DEFAULT_NOTE,
      scene: giftScene,
      effect: draft.effect,
      photo: photoPath.current ? { path: photoPath.current } : null,
    };
    onSent(
      await createGift({
        cart: s.cart,
        accessToken: session.access_token,
        setupIntentId: s.setupIntentId,
        recipientPhone: s.phone,
        recipientFirstName: s.who,
        metadata,
      }),
    );
  };
  /* The gift preview this sits in (GiftPreview), which sends the envelope
     off as this step arrives; null on its own. */
  const host = useContext(GiftSentContext);
  /* When the first moment ("We texted …") fills in: as the envelope leaves. */
  const tickAt = useRef<number | null>(null);
  /* Who it went to, kept as the charge cleared (a resumed payment's fields
     are empty). The student's number is only known when the parent typed it:
     an ask link's is masked. */
  const [sentTo, setSentTo] = useState<{ who: string; masked: string; phone: string } | null>(null);
  const finished = useRef(false);
  const onSent = (res: { giftId: string; expiresAt: string }) => {
    /* Sent: the save from this browser goes now (not just as the builder
       closes), and nothing is kept again until the next gift. */
    dropResume({ hold: true });
    const s = saved;
    const to = { who: s?.who ?? who, masked: s?.masked ?? masked, phone: s?.phone ?? (toE164(phoneD) as string) };
    saved = null;
    photoPath.current = null;
    track("parent_gift_sent", { source, gift_id: res.giftId, value: first / 100, currency: "USD" });
    finished.current = true;
    /* The preview measures the drawer before it moves, so first. */
    tickAt.current = host ? host.sent({ who: cap(to.who), texted: true }) : null;
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

  const who = saved?.who ?? student.trim();
  const masked = saved?.masked ?? maskDigits(phoneD);
  /* What the claim will charge first: the cart's own total once it's built,
     the page's price before. */
  const first = (saved?.cart ?? cart)?.dueTodayCents ?? cents(price?.first);
  const monthly = cents(price?.monthly);

  /* No "save card" (Sam, 9 Nov 2026: "its $3.99 today, not when they
     claim it"). */
  const payLabel = "Send the gift";

  /* ── Header ── */
  const title: React.ReactNode =
    step === "done" ? (
      <>
        <span className="ph-mask">{possessive(cap(sentTo?.who || who))}</span> gift is on its way.
      </>
    ) : step === "pay" ? (
      "Add your card"
    ) : quick ? (
      "Who it’s for"
    ) : (
      "Their number, then yours"
    );
  /* Every step has its line under the title, as the builder's stages do
     (Sam, 6 Nov 2026: "consistent across every single step of the modal"):
     who it's for on the charge (its rows and terms say the money), the
     receipt once it's done. No price on who it's for (Sam, 9 Nov 2026: "we
     shouldn't be mentioning price here, people bounce right as they're about
     to sign up and give us their phone number"): the wallets' rows and terms
     say it there only once they're signed in, as the card step does. */
  const sub: React.ReactNode =
    step === "pay"
        ? (
            <>
              For <span className="ph-mask">{cap(who)}</span>, <span className="ph-mask">{masked}</span>.
            </>
          )
        : null;
  /* The builder's stages count as the first bars (GiftPreview's stepsTotal),
     so the count is the same across the whole flow; Send as is counts only
     these two. */
  const STEPS: string[] = quick ? ["who", "pay"] : ["look", "open", "note", "who", "pay"];
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
  const group = (legend: string, kids: React.ReactNode, heading = false) =>
    flat ? (
      <div className="gft-pp-group">
        {heading ? (
          <h2 className="gft-pp-h" data-ph-show="">
            {legend}
          </h2>
        ) : null}
        {kids}
      </div>
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

  /* Replays show the head (model/replayPrivacy.ts); names and numbers in it are .ph-mask spans. */
  const head = flat ? (
    <div className="gft-pp-head" data-ph-show="">
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
      <ResumeLine step={step} />
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

  /* What's due, and the promise: on the card step above the card, and on
     who it's for under the wallets' step (Effort E), where a wallet pays. */
  const rows = (
    <div className={flat ? "prc-e-rows" : "prc-module prc-rows"} data-ph-show="">
      <div className="prc-row">
        <span>First month</span>
        <b className="tnum">{usd(first)}</b>
      </div>
      <div className="prc-row">
        <span>Then</span>
        <b className="tnum">{`${usd(monthly)} a month`}</b>
      </div>
    </div>
  );
  /* The promise, right above the button (Sam, 7 Nov 2026: "go for it"):
     what a hesitating parent needs at it. A gift nobody claims costs
     nothing; cancelling is by support until the account page does it. */
  const promise = (
    <ul className="prc-promise" aria-label="Our promise" data-ph-show="">
      <li>
        <Glyph d={GLYPHS.refund} />
        <span className="tnum">
          <b>Didn’t save what you spent?</b> Ask for a full refund.
        </span>
      </li>
      <li>
        <Glyph d={GLYPHS.bell} />
        <span>
          <b>A text before every bill.</b> Cancel right from it.
        </span>
      </li>
    </ul>
  );

  let view: React.ReactNode = null;
  if (step === "who") {
    /* D · One "who" step: their number (typed once) over yours, the
       marketing boxes as they were, and the student's consent line by the
       buttons. B · Send as is adds the card and their first name on top.
       E · Wallet first puts Apple Pay and Google Pay in the foot, with what's
       due, the promise and the terms under the boxes, and "Pay by card
       instead" going on to the card step. */
    const sceneName = SCENE_ORDER.find((sc) => sc.id === giftScene)?.name ?? "Your";
    const theirs = (
      group(
        "Their number",
        <>
          {showName ? (
            <Input id="student" label="Their first name" value={student} onChange={setStudent} error={shown("student")} autoComplete="off" autoCapitalize="words" maxLength={40} show typed />
          ) : null}
          <Input
            id="phone"
            label={
              Name ? (
                <>
                  <span className="ph-mask">{possessive(Name)}</span> mobile number
                </>
              ) : (
                "Their mobile number"
              )
            }
            value={formatPhone(phoneD)}
            onChange={(v) => setPhone(digitsOf(v))}
            error={shown("phone")}
            tel
            help={<>We text {Name ? <span className="ph-mask">{Name}</span> : "them"} once. Their Plus is tied to this number.</>}
            show
          />
          <OnTheirNumber show={numberOk} who={Name ? <span className="ph-mask">{possessive(Name)}</span> : "their"} number={formatPhone(phoneD)} />
        </>,
      )
    );
    /* From you: the parent signs in with their mobile (a code by text), or
       is already signed in. */
    const yours = group(
      "From you",
      signedIn ? (
        <p className="prc-e-consent tnum" data-ph-show="">
          Signed in as <span className="ph-mask">{formatPhone(ownD)}</span>.{" "}
          <button type="button" className="prc-e-bycard" onClick={() => void supabase.auth.signOut()} disabled={busy}>
            Not you?
          </button>
        </p>
      ) : (
        <>
          <Input
            id="mobile"
            label="Your mobile"
            value={mobile.trim() ? formatPhone(mobileD) : mobile}
            onChange={(v) => {
              setMobile(digitsOf(v));
              setCodeSentTo(null);
            }}
            error={shown("mobile")}
            tel
            autoComplete="tel-national"
            help="We text you a code to sign in. You’ll manage the gift from here."
            show
          />
          {codeSentTo ? (
            <>
              <Input
                id="code"
                label="The code we texted you"
                value={codeD}
                onChange={setCode}
                error={shown("code")}
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                show
              />
              <button
                type="button"
                className="prc-e-bycard"
                data-ph-show=""
                disabled={busy}
                onClick={() => void resendCode()}
              >
                Send a new code
              </button>
            </>
          ) : null}
        </>
      ),
      true,
    );
    /* The student's consent (it was the end of their number's help, Sam,
       5 Nov 2026), shorter and by the buttons it applies to. Counsel to OK
       the wording and the move (lever-lab/effort/notes.md, D). */
    const studentConsent = (
      <p className="prc-e-consent" data-ph-show="">
        By continuing you confirm it’s {Name ? <span className="ph-mask">{possessive(Name)}</span> : "your student’s"} number and they’re OK getting texts from Tapin about it.
      </p>
    );
    view = (
      <form className="prc-form" onSubmit={submit} noValidate>
        {frame(
          <>
            {quick ? (
              <div className="prc-e-card" data-ph-show="">
                <span className="scene-swatch" data-scene={giftScene} aria-hidden="true">
                  <i className="scene-swatch-env" />
                </span>
                <p>{sceneName} card</p>
                <button type="button" onClick={onChangeLook} disabled={busy}>
                  Change
                </button>
              </div>
            ) : null}
            {theirs}
            {yours}
            {walletsShown ? (
              <div className="prc-e-due">
                {rows}
                {promise}
              </div>
            ) : null}
            {studentConsent || walletsShown ? (
              <div className="prc-e-legal">
                {studentConsent}
                {walletsShown ? <Terms first={first} monthly={monthly} /> : null}
              </div>
            ) : null}
            {errorLine(formError)}
          </>,
          <>
            {/* Sticky, right above the wallets and the back arrow (Sam, 8 Nov
                2026: "the pay by card instead be sticky, right above the
                google pay and the back arrow"). */}
            {walletsShown ? (
              <button type="button" className="prc-e-bycard prc-e-bycard-foot" data-ph-show="" onClick={() => void submit()} disabled={busy}>
                Use a card instead
              </button>
            ) : null}
            {/* Back beside the buttons, as the builder's stages have it
                (Sam, 6 Nov 2026): to the note, or with Send as is to where
                it was chosen. */}
            <BackArrow className={arrowClass} onClick={onEditGift} disabled={busy} />
            <div className="prc-e-footmain" data-ph-show="">
              {/* The wallets only once signed in: a wallet's sheet can't sign
                  the parent in. */}
              {signedIn ? (
                <Elements stripe={getStripe()} options={WALLET_ELEMENTS}>
                  <LiveWallets state={wallets} ready={!firstBad()} onState={setWallets} onClick={walletReady} onConfirm={payByWallet} cents={first} monthlyCents={monthly} />
                </Elements>
              ) : null}
              {walletsShown ? null : (
                <button type="submit" className={cta} data-island-cta="" disabled={busy}>
                  {busy
                    ? "One moment…"
                    : formError
                      ? "Try again"
                      : signedIn
                        ? "Continue to your card"
                        : codeSentTo
                          ? "Sign in and continue"
                          : "Text me a code"}
                </button>
              )}
            </div>
          </>,
        )}
      </form>
    );
  } else if (step === "pay" && (clientSecret || cardSaved)) {
    /* The card (Use a card instead, or no wallet on this device): what's
       due, straight on the panel. Back to who beside the button (Sam, 6 Nov
       2026: "wouldn't we want a back button here?"), with everything kept;
       once the card is saved there's no going back. A card saved earlier
       (a wallet's, or a reopen) only needs the gift sent. */
    const pay = { paying, onBusy: setBusy, send: sendGift, onDone: close, label: payLabel, frame, rows, promise, onBack: () => toStep("who"), backDisabled: cardSaved || busy, first, monthly, startError: payError };
    view =
      clientSecret && cart ? (
        <Elements stripe={getStripe()} options={{ clientSecret, appearance: APPEARANCE, fonts: FONTS }}>
          <StripePay onCardSaved={(id) => onCardSaved(id, cart)} alreadySaved={cardSaved} {...pay} />
        </Elements>
      ) : (
        <SendOnly {...pay} />
      );
  } else if (step === "done" && done) {
    /* A · It's on its way (Sam, 7 Nov 2026: "lets do A on its way for after
       they pay"): what happens next, three moments on one line, then the
       pay step's promise on paper, then a quiet way to give them a heads-up
       beside Done. Never she or he for the student: their name, or they. */
    const to = sentTo ?? { who, masked, phone: toE164(phoneD) as string };
    const Who = cap(to.who);
    const expires = new Date(done.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const texted = (
      <>
        <b>
          We texted <span className="ph-mask">{Who}</span>
        </b>
        <p className="tnum">
          A link to {sentNote ? "your gift and note" : "your gift"}, sent to <span className="ph-mask">{to.masked}</span> just now.
        </p>
      </>
    );
    const second = (
      <>
        <b>
          <span className="ph-mask">{Who}</span> claims it
        </b>
        <p className="tnum">
          They sign in with <span className="ph-mask">{to.masked}</span> and their Plus starts, with $25 credit ready.
        </p>
      </>
    );
    const timeline = (
      <ol className="prc-tl" aria-label="What happens next">
        <li data-now="">
          <RingTick at={tickAt.current} />
          <div>{texted}</div>
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
            <b>If they don’t claim it</b>
            <p className="tnum">Their link works until {expires}.</p>
          </div>
        </li>
      </ol>
    );
    /* The pay step's promise rows, on paper. */
    const promise = (
      <ul className="prc-promise prc-done-promise" aria-label="Our promise">
        <li>
          <Glyph d={GLYPHS.mail} />
          <span>
            <b>Cancel anytime</b>, right from the text we send before every bill, or by emailing <a href="mailto:support@tapin.app">support@tapin.app</a>
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
      <div className={flat ? "prc-e-done" : "prc-module prc-done"} role="status" data-ph-show="">
        {timeline}
        {promise}
      </div>,
      <>
        {sms ? (
          <a className="prc-e-text" href={sms}>
            <Glyph d={TEXT_BUBBLE} />
            <span className="prc-e-text-name" data-ph-show="">
              Text <span className="ph-mask">{Who}</span>
            </span>
          </a>
        ) : null}
        <button type="button" className={cta} data-ph-show="" onClick={close}>
          Done
        </button>
      </>,
    );
  }

  if (embedded)
    return (
      <FlatLook.Provider value>
        <div className="prc-embedded ph-mask ph-no-autocapture ph-no-deadclick ph-no-rageclick" ref={sheet} aria-labelledby="prc-title" role="group" tabIndex={-1}>
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
      {/* data-wide: the who step, widest of the steps on a computer (Sam,
          6 Nov 2026: "on desktop this step in checkout can morph to be
          wider"); the width eases between steps (the effect above). */}
      <div className="prc-sheet prc-island ph-no-capture" ref={sheet} data-wide={step === "who" ? "" : undefined} role="dialog" aria-modal="true" aria-labelledby="prc-title" tabIndex={-1}>
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

/* ── D · "It's on their number" (Sam's pick, 7 Nov 2026) ─────────────────
   Who it's for: once their number is a real US number (typed once since
   Effort D, so there's no confirm field to match), a card rises under it
   with the Tapin icon, one line, and the number read back as it will be
   texted, so a slip shows here rather than after paying. It hides again if
   the number stops being one. Reduced motion: it's simply there. (Preview
   and notes: tapin-staging-work/lever-lab/likelihood.) */
const TAPIN_ICON_WHITE = asset("/tapin_icon_white.png");
function OnTheirNumber({ show, who, number }: { show: boolean; who: React.ReactNode; number: string }) {
  const card = useRef<HTMLDivElement | null>(null);
  const icon = useRef<HTMLSpanElement | null>(null);
  /* Only a match made here animates; a step that opens matched (a save
     from earlier) shows it still, under the step's own entrance. */
  const was = useRef(show);
  useEffect(() => {
    if (was.current === show) return;
    was.current = show;
    if (!show || still()) return;
    const rise = card.current?.animate?.([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], {
      duration: 460,
      easing: EASE,
    });
    const settleIn = icon.current?.animate?.([{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "none" }], {
      duration: 420,
      delay: 120,
      easing: EASE,
      fill: "backwards",
    });
    return () => {
      rise?.cancel();
      settleIn?.cancel();
    };
  }, [show]);
  return (
    <div ref={card} className="prc-on" role="status" hidden={!show} data-ph-show="">
      <span ref={icon} className="prc-on-icon" aria-hidden="true">
        <img src={TAPIN_ICON_WHITE} alt="" width="20" height="20" decoding="async" />
      </span>
      <span className="prc-on-text">
        {/* The welcome bonus (Sam, 9 Nov 2026: "can you mention this"): it
            lands on the student's number when they claim the gift. */}
        <b>$25 in credit every month on {who} number</b>
        <span className="tnum">
          It lands when they claim it. We’ll text <span className="ph-mask">{number}</span>
        </span>
      </span>
    </div>
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
  placeholder,
  show = false,
  typed = false,
}: {
  id: Field;
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  error?: React.ReactNode;
  help?: React.ReactNode;
  tel?: boolean;
  ok?: boolean;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  autoCapitalize?: string;
  maxLength?: number;
  placeholder?: string;
  /** Label, error and help are fixed copy (any name inside is a .ph-mask
   *  span): shown in session replays (model/replayPrivacy.ts). */
  show?: boolean;
  /** What's typed is recorded in session replays (the student's first name
   *  only; model/replayPrivacy.ts). Never a number, email or code. */
  typed?: boolean;
}) {
  const flat = useContext(FlatLook);
  const fid = `prc-${id}`;
  const seen = show ? "" : undefined;
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
      data-ph-typed={typed && !tel ? "" : undefined}
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
        <label htmlFor={fid} data-ph-show={seen}>
          {label}
        </label>
        <div className="prc-e-box">
          {input}
          {tick}
        </div>
        {error ? (
          <small id={`${fid}-error`} className="gft-pp-error" data-ph-show={seen}>
            {error}
          </small>
        ) : null}
        {help ? (
          <p id={`${fid}-help`} className="prc-e-help" data-ph-show={seen}>
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

function Terms({ first, monthly }: { first: number; monthly: number }) {
  const flat = useContext(FlatLook);
  return (
    <p className={flat ? "prc-fine prc-e-terms tnum" : "prc-terms tnum"} data-ph-show="">
      {/* Short: the promise above the button carries cancelling (Sam, 7 Nov
          2026); this keeps the price, the renewal and the links. */}
      {`${usd(first)} the first month, then ${usd(monthly)}/month until you cancel. `}
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
  /** Sends the gift once the card is saved (the Sheet's sendGift); throws
   *  with a message to show. */
  send: () => Promise<void>;
  /** Closes the sheet. */
  onDone: () => void;
  label: string;
  /** What the claim charges first, and monthly after. */
  first: number;
  monthly: number;
  /** Why the gift wasn't sent last time, if a wallet saved the card. */
  startError: string | null;
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

/* The card step's foot: the back arrow, then the button filling the rest, as
   every other step's Continue. */
function PayFoot({ busy, disabled, label, onPay, onBack, backDisabled }: { busy: boolean; disabled: boolean; label: string; onPay: () => void; onBack: () => void; backDisabled: boolean }) {
  const flat = useContext(FlatLook);
  const cta = flat ? "gft-pp-cta" : "prc-cta";
  return (
    <>
      <BackArrow className={flat ? "gft-pp-backarrow" : "prc-backarrow"} onClick={onBack} disabled={backDisabled || busy} />
      <button type="button" className={cta} data-island-cta="" data-ph-show="" onClick={onPay} disabled={disabled}>
        {label}
      </button>
    </>
  );
}

/* ── E · Wallet first: Apple Pay and Google Pay on who it's for (Sam's pick,
   7 Nov 2026) ───────────────────────────────────────────────────────────────
   The wallets are Stripe's Express Checkout Element at the foot of the who
   step, before any SetupIntent exists: Elements in deferred setup mode, so
   Stripe can confirm on the SetupIntent create_intent (gift: true) makes
   inside the wallet's confirm (the Sheet's payByWallet). Nothing is charged:
   the card is saved, and the claim charges it. */
const WALLET_OPTIONS: StripeExpressCheckoutElementOptions = {
  paymentMethods: { applePay: "auto", googlePay: "auto", link: "never", amazonPay: "never", paypal: "never", klarna: "never" },
  buttonType: { applePay: "plain", googlePay: "plain" },
  buttonTheme: { applePay: "black", googlePay: "white" },
  buttonHeight: 52,
  layout: { maxColumns: 2, overflow: "never" },
};

/* Deferred setup, matched to the SetupIntent create_intent makes for a gift
   (GiftApi.saveCard: usage off_session, automatic payment methods, no
   redirects): mode "setup", currency "usd", cards only (Apple Pay and Google
   Pay are cards). Stripe refuses the confirm if these differ from the
   intent's, so a change to one needs the same change in the other.
   For the buttons to show in production:
   - Apple Pay: register plus.tapin.app (and every staging/preview host) in
     Stripe, Settings → Payment methods → Payment method domains (Apple Pay
     domains). Unregistered hosts simply show no Apple Pay button, and with
     no wallet at all the step's foot is "Continue to payment", as before.
   - Turn Apple Pay and Google Pay on in the Stripe account's payment method
     settings.
   - HTTPS only (localhost is exempt for Google Pay, not for Apple Pay), and
     Apple Pay needs Safari with a card in Wallet.
   - Apple's sheet shows the renewal from `applePay.recurringPaymentRequest`
     (walletSheet). */
const WALLET_ELEMENTS: StripeElementsOptions = {
  mode: "setup",
  currency: "usd",
  paymentMethodTypes: ["card"],
  appearance: APPEARANCE,
  fonts: FONTS,
};

/* What the wallet's own sheet shows (Sam, 8 Nov 2026: "google lets me pay
   but it doesn't seem like a subscription?"): nothing today, and for Apple
   Pay its recurring-payment request, so the sheet itself says what the claim
   charges and that it renews monthly. Google Pay's sheet has no recurring
   field; the step's own rows say it. */
function walletSheet(cents: number, monthlyCents: number): ClickResolveDetails {
  const start = new Date();
  const next = nextBillingDate({ interval: "month", interval_count: 1 } as Parameters<typeof nextBillingDate>[0], start);
  return {
    applePay: {
      recurringPaymentRequest: {
        paymentDescription: "Tapin Plus, a gift",
        managementURL: "https://plus.tapin.app/parents/account",
        trialBilling: {
          label: "First month",
          amount: cents,
          recurringPaymentStartDate: start,
          recurringPaymentEndDate: next,
          recurringPaymentIntervalUnit: "month",
          recurringPaymentIntervalCount: 1,
        },
        regularBilling: {
          label: "Tapin Plus",
          amount: monthlyCents,
          recurringPaymentStartDate: next,
          recurringPaymentIntervalUnit: "month",
          recurringPaymentIntervalCount: 1,
        },
        billingAgreement: `${usd(cents)} the first month, then ${usd(monthlyCents)} a month until you cancel. We text you before every bill; cancel anytime by replying, or by emailing support@tapin.app.`,
      },
    },
  };
}

function LiveWallets({
  state,
  ready,
  onState,
  onClick,
  onConfirm,
  cents,
  monthlyCents,
}: {
  state: "pending" | "shown" | "none";
  /** The step's fields are all filled: the buttons at full strength. */
  ready: boolean;
  onState: (s: "shown" | "none") => void;
  /** True to open the wallet's sheet; false shows what's missing instead. */
  onClick: () => boolean;
  onConfirm: (ev: StripeExpressCheckoutElementConfirmEvent, stripe: Stripe | null, elements: StripeElements | null) => void;
  /** Today's charge and the monthly one after it, for the wallet's sheet. */
  cents: number;
  monthlyCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  /* Shown once Stripe says so: they rise into Continue's place. */
  const box = useRef<HTMLDivElement | null>(null);
  const was = useRef(state);
  useLayoutEffect(() => {
    const from = was.current;
    was.current = state;
    const el = box.current;
    if (from !== "pending" || state !== "shown" || !el || still() || typeof el.animate !== "function") return;
    const a = el.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: getComputedStyle(el).opacity, transform: "none" }], { duration: 320, easing: EASE });
    return () => a.cancel();
  }, [state]);
  if (state === "none") return null;
  return (
    /* Laid out from the start (so Stripe can measure it) but unseen until a
       wallet can show; Continue to payment holds the place meanwhile. */
    <div ref={box} className="prc-e-wallets" data-pending={state === "pending" ? "" : undefined} data-ready={ready ? "" : undefined}>
      <ExpressCheckoutElement
        options={WALLET_OPTIONS}
        onReady={({ availablePaymentMethods: m }) => onState(m && (m.applePay || m.googlePay) ? "shown" : "none")}
        onLoadError={() => onState("none")}
        onClick={(e) => (onClick() ? e.resolve(walletSheet(cents, monthlyCents)) : e.reject())}
        onConfirm={(e) => onConfirm(e, stripe, elements)}
      />
    </div>
  );
}

/* ── Stripe: the card, saved on the gift's SetupIntent ───────────────────── */
function StripePay({
  paying,
  onBusy,
  send,
  onCardSaved,
  alreadySaved,
  label,
  first,
  monthly,
  startError,
  frame,
  rows,
  promise,
  onBack,
  backDisabled,
}: PayProps & { onCardSaved: (setupIntentId: string) => void; alreadySaved: boolean }) {
  const flat = useContext(FlatLook);
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  /* The card was saved but the gift wasn't sent: said here, with Finish to
     send it again. */
  const [error, setError] = useState<string | null>(startError);
  /* Once the card is saved, a retry only sends: never save it twice. */
  const isSaved = useRef(alreadySaved);

  const confirm = async () => {
    if (!stripe || !elements || paying.current) return;
    paying.current = true;
    setBusy(true);
    onBusy(true);
    setError(null);
    try {
      if (!isSaved.current) {
        const { error: setupError, setupIntent } = await stripe.confirmSetup({
          elements,
          redirect: "if_required",
          confirmParams: { return_url: window.location.href },
        });
        if (setupError) throw new Error(setupError.message || "Your card couldn’t be saved. Please try again.");
        if (setupIntent?.status !== "succeeded") throw new Error("Your card couldn’t be saved. Please try again.");
        isSaved.current = true;
        onCardSaved(setupIntent.id);
      }
      await send();
    } catch (e) {
      console.error("Parent checkout failed", e);
      setError((e as Error).message || "Something went wrong. Please try again.");
    } finally {
      paying.current = false;
      setBusy(false);
      onBusy(false);
    }
  };

  /* The card only: the wallets were on who it's for (Effort E), and this is
     "Use a card instead" (or no wallet on this device). */
  const element = (
    <div className={flat ? "prc-e-pay" : "prc-module prc-pay"}>
      <PaymentElement
        options={{ wallets: { applePay: "never", googlePay: "never", link: "never" }, layout: "tabs" }}
        onReady={() => setReady(true)}
        /* Already saved: Finish only sends, so the reason it stopped stays
           on screen instead. */
        onLoadError={() => {
          if (!isSaved.current) setError("The card form didn’t load. Close this and try again.");
        }}
      />
      {!ready && !error && !isSaved.current ? <div className="prc-pay-wait" aria-busy="true" /> : null}
    </div>
  );
  const terms = <Terms first={first} monthly={monthly} />;
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
              {element}
              {terms}
            </div>
          ) : (
            <>
              {element}
              {terms}
            </>
          )}
          {promise}
          {errorLine}
        </>,
        <PayFoot
          busy={busy}
          disabled={busy || (!isSaved.current && (!ready || !stripe))}
          label={busy ? "Sending…" : isSaved.current ? "Finish" : label}
          onPay={() => void confirm()}
          onBack={onBack}
          backDisabled={backDisabled || isSaved.current}
        />,
      )}
    </>
  );
}

/* A card saved earlier (a wallet's whose gift didn't send, or a reopen):
   only the gift is left to send. */
function SendOnly({ paying, onBusy, send, first, monthly, startError, frame, rows, promise, onBack }: PayProps) {
  const flat = useContext(FlatLook);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(startError);
  const finish = async () => {
    if (paying.current) return;
    paying.current = true;
    setBusy(true);
    onBusy(true);
    setError(null);
    try {
      await send();
    } catch (e) {
      console.error("Sending the gift failed", e);
      setError((e as Error).message || "Something went wrong. Please try again.");
    } finally {
      paying.current = false;
      setBusy(false);
      onBusy(false);
    }
  };
  return frame(
    <>
      {rows}
      <Terms first={first} monthly={monthly} />
      {promise}
      {error ? (
        <p className={flat ? "gft-pp-error" : "prc-error"} role="alert">
          {error}
        </p>
      ) : null}
    </>,
    <PayFoot busy={busy} disabled={busy} label={busy ? "Sending…" : "Finish"} onPay={() => void finish()} onBack={onBack} backDisabled />,
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
