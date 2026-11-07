/* ══ A PARENT'S CHECKOUT, KEPT FOR A DAY (Sam, 7 Nov 2026: "if I'm in a
   checkout session, and I leave, all of my inputs are lost. I feel like if
   someone leaves checkout their information ... should be saved for 24 hours
   at least, maybe on their browser?") ══════════════════════════════════════
   What a parent has put into the gift and the checkout, kept in this browser
   (localStorage, one key) for 24 hours from their last edit, so closing the
   builder, leaving the page or reloading it loses nothing: the care package
   (model/giftDraft.ts: the background, what plays, the note, the sign-off,
   their student's name, and the photo when it's small enough to store), the
   fields they typed (their student's number, their own name, mobile and
   email) and the step they were on.

   Never kept: the card (it's in Stripe's frames: we can't read it, and
   mustn't store it), the marketing boxes (consent is given fresh each time),
   and anything about the payment (no client secret, no PaymentIntent; a pay
   step makes its checkout again the normal way). Cleared once they've paid,
   on "Start over", and when it's a day old. Every storage call can throw
   (Safari's private mode, a full disk), so each is caught, and the copy in
   memory still carries the builder closing and opening again. */
import { FROM_MAX, NOTE_MAX, isDelight, isScene, type SceneId } from "./gift";
import type { GiftDraft } from "./giftDraft";
import { PHOTO_MAX_CHARS } from "./giftPhoto";

/** The builder's stages, then the checkout's steps (ParentCheckout Step). */
export type ResumeStep = "look" | "open" | "note" | "student" | "you" | "pay";
const STEPS: readonly ResumeStep[] = ["look", "open", "note", "student", "you", "pay"];

/** What they typed in the checkout. Phone numbers are digits only. */
export type KeptFields = { phone: string; confirm: string; name: string; email: string; mobile: string };
const NO_FIELDS: KeptFields = { phone: "", confirm: "", name: "", email: "", mobile: "" };

/** The gift as kept. `scene` is null when the one saved has since been
 *  retired (the page's own pick stands then). */
export type KeptGift = Omit<GiftDraft, "scene"> & { scene: SceneId | null };

type Kept = {
  /** The last edit (ms): the save is a day old 24 hours after it. */
  at: number;
  step: ResumeStep;
  fields: KeptFields;
  /** Null until the gift itself is edited (the page's own season pick isn't kept). */
  gift: KeptGift | null;
};

const KEY = "tp_parent_resume_v1";
const DAY = 24 * 60 * 60 * 1000;
/** Bigger than any honest save (a photo at its cap and a full note). */
const RAW_MAX = PHOTO_MAX_CHARS + 20_000;

let kept: Kept | null = null;
let loaded = false;
/* Paid: nothing is kept again until the gift is cleared for the next one. */
let held = false;
let timer: ReturnType<typeof setTimeout> | null = null;
/* The step they're on, whether or not there's a save yet: a step alone
   never starts one (pressing Continue isn't something to keep), but the
   first edit's save starts on it. */
let stepNow: ResumeStep = "look";

const storage = (): Storage | null => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};
const remove = () => {
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* Blocked: there's nothing to clear. */
  }
};

/* ── Reading it back, checked ── */
const str = (v: unknown, max: number): string | null => (typeof v === "string" ? v.slice(0, max) : null);
const digits = (v: unknown): string | null => (typeof v === "string" ? v.replace(/\D/g, "").slice(0, 10) : null);
/** Our own photo's shape (giftPhoto.ts shrinkPhoto: a JPEG data URL under its cap). */
const okPhoto = (v: unknown): v is string => typeof v === "string" && v.startsWith("data:image/") && v.length <= PHOTO_MAX_CHARS;

function parse(raw: string): Kept | null {
  if (raw.length > RAW_MAX) return null;
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  if (o.v !== 1 || typeof o.at !== "number" || !Number.isFinite(o.at)) return null;
  const now = Date.now();
  /* A day old, or from the future (a clock moved): a fresh start. */
  if (now - o.at > DAY || o.at > now + 5 * 60 * 1000) return null;
  const step = STEPS.includes(o.step as ResumeStep) ? (o.step as ResumeStep) : "look";
  const f = (o.fields ?? {}) as Record<string, unknown>;
  if (typeof f !== "object") return null;
  const fields: KeptFields = {
    phone: digits(f.phone) ?? "",
    confirm: digits(f.confirm) ?? "",
    name: str(f.name, 80) ?? "",
    email: str(f.email, 254) ?? "",
    mobile: digits(f.mobile) ?? "",
  };
  let gift: KeptGift | null = null;
  if (o.gift && typeof o.gift === "object") {
    const g = o.gift as Record<string, unknown>;
    gift = {
      to: str(g.to, 40) ?? "",
      note: str(g.note, NOTE_MAX) ?? "",
      from: str(g.from, FROM_MAX) ?? "",
      scene: isScene(g.scene) ? g.scene : null,
      photo: okPhoto(g.photo) ? g.photo : null,
      effect: isDelight(g.effect) ? g.effect : null,
    };
  }
  return { at: o.at, step, fields, gift };
}

function load() {
  if (loaded) return;
  loaded = true;
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(KEY) ?? null;
  } catch {
    return;
  }
  if (!raw) return;
  kept = parse(raw);
  /* Corrupt or a day old: gone. */
  if (!kept) remove();
}

/** The save, if there's one under a day old. */
function current(): Kept | null {
  load();
  if (kept && Date.now() - kept.at > DAY) dropResume();
  return kept;
}

/* ── Writing it, a beat after the last change ── */
function write() {
  timer = null;
  if (!kept || held) return;
  const s = storage();
  if (!s) return;
  const g = kept.gift;
  const body = (photo: string | null) =>
    JSON.stringify({ v: 1, at: kept!.at, step: kept!.step, fields: kept!.fields, gift: g ? { ...g, photo } : null });
  /* The photo only if it's our small data URL and the write takes it; else
     the rest goes without it, quietly. */
  const photo = g && okPhoto(g.photo) ? g.photo : null;
  try {
    s.setItem(KEY, body(photo));
    return;
  } catch {
    /* Full, or blocked. */
  }
  if (!photo) return;
  try {
    s.setItem(KEY, body(null));
  } catch {
    /* Blocked: it carries on in memory. */
  }
}
const schedule = () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(write, 400);
};
/** Now, not in a beat (the page is going away). */
const flush = () => {
  if (timer) {
    clearTimeout(timer);
    write();
  }
};
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

const blank = (): Kept => ({ at: Date.now(), step: stepNow, fields: NO_FIELDS, gift: null });
const sameGift = (a: KeptGift | null, b: KeptGift | null) =>
  a === b ||
  (!!a && !!b && a.to === b.to && a.note === b.note && a.from === b.from && a.scene === b.scene && a.photo === b.photo && a.effect === b.effect);

/** The gift as it now is (giftDraft.ts, on every edit a parent makes). */
export function keepGift(gift: GiftDraft) {
  if (held) return;
  const was = current();
  if (sameGift(was?.gift ?? null, gift)) return;
  kept = { ...(was ?? blank()), gift: { ...gift }, at: Date.now() };
  schedule();
}

/** What they've typed in the checkout (only what changed counts as an edit). */
export function keepFields(patch: Partial<KeptFields>) {
  if (held) return;
  const was = current();
  const fields = { ...(was?.fields ?? NO_FIELDS), ...patch };
  const before = was?.fields ?? NO_FIELDS;
  if ((Object.keys(fields) as (keyof KeptFields)[]).every((k) => fields[k] === before[k])) return;
  kept = { ...(was ?? blank()), fields, at: Date.now() };
  schedule();
}

/** The step they're on. Moving between steps isn't an edit: it starts no
 *  save, and the day still runs from the last thing they changed. */
export function keepStep(step: ResumeStep) {
  stepNow = step;
  if (held) return;
  const was = current();
  if (!was || was.step === step) return;
  kept = { ...was, step };
  schedule();
}

/** Gone, from memory and the browser. `hold`: they've just paid, so nothing
 *  is kept again until the next gift starts (releaseResume). */
export function dropResume(opts?: { hold?: boolean }) {
  kept = null;
  loaded = true;
  held = !!opts?.hold;
  stepNow = "look";
  if (timer) clearTimeout(timer);
  timer = null;
  remove();
}

export const keptGift = (): KeptGift | null => current()?.gift ?? null;
export const keptFields = (): KeptFields => current()?.fields ?? NO_FIELDS;
export const keptStep = (): ResumeStep | null => current()?.step ?? null;
/** Whether there's anything of theirs in it worth saying so ("We kept your
 *  care package from earlier"): words, a photo, a pick of what plays, or a
 *  field. A background alone, or only a step, comes back without a word. */
export function keptSomething(): boolean {
  const k = current();
  if (!k) return false;
  const g = k.gift;
  const f = k.fields;
  return !!(g && (g.to.trim() || g.note.trim() || g.from.trim() || g.photo || g.effect)) || Object.values(f).some((v) => v.trim());
}
