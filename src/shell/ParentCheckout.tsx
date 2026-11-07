import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StepBars } from "./StepBars";
import { createPortal } from "react-dom";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
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
import { clearGiftDraft, setGiftDraft, useGiftDraft } from "../model/giftDraft";
import { BackArrow } from "./BackArrow";
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
let charged: { started: ParentCheckoutStarted; paymentIntent: string; who: string; masked: string; hasNote: boolean } | null = null;
/** A card already charged whose checkout still needs confirming: the
 *  builder goes straight to it (its gift went with the charge). */
export const hasChargedParentCheckout = () => charged !== null;
type Field = "student" | "phone" | "confirm" | "name" | "email" | "mobile" | "note" | "from";

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

  const [step, setStep] = useState<Step>(() => (charged ? "pay" : ask ? "you" : "student"));
  /* The student's name, note, sign-off, background and photo are the gift
     draft (model/giftDraft.ts), shared with the preview on /parents, so what
     a parent typed there is here already (Sam, 6 Nov 2026: "so they don't
     have to do it twice"). */
  const draft = useGiftDraft();
  const student = draft.to;
  const setStudent = (to: string) => setGiftDraft({ to });
  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  /* Kept, never emailed for now (Sam, 6 Nov 2026: "No email at all right
     now. Although I think it'd make sense to capture their emails
     regardless"); the parent is texted. */
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  /* Marketing, texts and email, each unticked until ticked (Sam, 6 Nov
     2026); kept while they go back and forth between the steps. */
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

  const onCharged = (paymentIntent: string) => {
    if (started) charged = { started, paymentIntent, who: ask ? ask.student_first_name : student.trim(), masked: ask ? ask.masked_phone : maskDigits(phoneD), hasNote: sentNote };
    setPaid(true);
  };
  const onPaid = (res: ParentConfirmed) => {
    const first = started?.first_cents ?? OFFER.first_cents;
    charged = null;
    track("parent_purchase", { value: first / 100, currency: "USD", source, checkout_id: started?.checkout_id });
    if (ask) track("ask_paid", { source });
    setDone(res);
    toStep("done");
    /* Sent: the next gift starts fresh. */
    clearGiftDraft();
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
          ? "We’ll text you a receipt."
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
      {bars("gft-pp-steps")}
    </div>
  ) : (
    <div className="prc-top">
      {step === "done" ? <Tick /> : null}
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
          <b className="tnum">{`${usd(monthly)} every month`}</b>
        </div>
      </div>
    );
    const pay = { paying, onBusy: setBusy, onPaid, onDone: close, label: payLabel, frame, rows, onBack: () => toStep("you"), backDisabled: paid || busy };
    view = mock ? (
      <MockPay first={first} monthly={monthly} {...pay} />
    ) : (
      <Elements stripe={getStripe()} options={{ clientSecret: started.client_secret, appearance: APPEARANCE, fonts: FONTS }}>
        <StripePay started={started} onCharged={onCharged} resumeIntent={charged?.paymentIntent ?? null} {...pay} />
      </Elements>
    );
  } else if (step === "done" && done) {
    const said = (
      <p>
        {ask ? (
          /* An ask link's student is already signed in, and isn't texted
             (API.md), unless there's a note: then they get its link. */
          <>
            It’s on {done.student_first_name || who}’s account (<span className="tnum">{done.masked_phone || masked}</span>) now.
            {sentNote ? " We’ve texted them a link to your gift." : ""} To change or cancel, email support@tapin.app, or your student can cancel in the Tapin app.
          </>
        ) : (
          <>
            We’ve texted <span className="tnum">{done.masked_phone || masked}</span>
            {sentNote ? " a link to your gift" : ""}. They sign in to Tapin with that number and it’s there. To change or cancel, email support@tapin.app, or your student can cancel in the Tapin app. If they haven’t signed in within 14 days, we’ll cancel and refund you in full.
          </>
        )}
      </p>
    );
    view = frame(
      flat ? (
        <div className="prc-e-done" role="status">
          <Tick />
          {said}
        </div>
      ) : (
        <div className="prc-module prc-done" role="status">
          {said}
        </div>
      ),
      <button type="button" className={cta} onClick={close}>
        Done
      </button>,
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
function Terms({ first, monthly }: { first: number; monthly: number }) {
  const flat = useContext(FlatLook);
  return (
    <p className={flat ? "prc-fine prc-e-terms tnum" : "prc-terms tnum"}>
      {`${usd(first)} today for the first month, then ${usd(monthly)}/month until you cancel. Cancel anytime: email support@tapin.app, or your student can cancel in the Tapin app. `}
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
    borderRadius: "12px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { boxShadow: "none", border: "1px solid rgba(20, 22, 24, 0.06)", backgroundColor: "#f0f0f0" },
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
  onBack,
  backDisabled,
}: PayProps & { started: ParentCheckoutStarted; onCharged: (paymentIntent: string) => void; resumeIntent: string | null }) {
  const flat = useContext(FlatLook);
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

  const element = (
    <div className={flat ? "prc-e-pay" : "prc-module prc-pay"}>
      <PaymentElement
        options={{ wallets: { applePay: "auto", googlePay: "auto" }, layout: "tabs" }}
        onReady={() => setReady(true)}
        onLoadError={() => setError("The payment form didn’t load. Close this and try again.")}
      />
      {!ready && !error ? <div className="prc-pay-wait" aria-busy="true" /> : null}
    </div>
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
              {element}
              {terms}
            </div>
          ) : (
            <>
              {element}
              {terms}
            </>
          )}
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

/* ── ?parentmock: a card panel's look in the Payment Element's place ────── */
function MockPay({ first, monthly, paying, onBusy, onPaid, onDone, label, frame, rows, onBack, backDisabled }: PayProps & { first: number; monthly: number }) {
  const flat = useContext(FlatLook);
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
  const card = flat ? (
    <div className="prc-e-mock" aria-label="Payment (preview, nothing is charged)">
      <p className="prc-mock-tag">Preview: no card is charged</p>
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
  );
  const terms = <Terms first={first} monthly={monthly} />;
  return (
    <>
      {frame(
        <>
          {rows}
          {flat ? (
            <div className="gft-pp-group">
              {card}
              {terms}
            </div>
          ) : (
            <>
              {card}
              {terms}
            </>
          )}
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
