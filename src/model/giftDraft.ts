/* ══ THE GIFT A PARENT IS PUTTING TOGETHER (Sam, 6 Nov 2026: "We should also
   allow someone to preview their own message, own photo, and sender name (if
   someone fills that in with the preview, it should be saved when they check
   out so they don't have to do it twice)") ═══════════════════════════════════
   One draft for the page's life: the preview on /parents ("See what they'll
   see") and the checkout read and write the same fields, so whatever a parent
   types in one is already in the other. Kept in this browser for a day too
   (model/checkoutResume.ts, Sam, 7 Nov 2026), so leaving or reloading
   doesn't lose it; the photo only when it's small enough to store. Cleared
   once a checkout goes through, or on "Start over". */
import { useSyncExternalStore } from "react";
import type { Delight, SceneId } from "./gift";
import { dropResume, keepGift, keptGift } from "./checkoutResume";

export type GiftDraft = {
  /** The student's first name, as typed. */
  to: string;
  note: string;
  /** How it's signed ("Mom"). */
  from: string;
  scene: SceneId;
  /** A JPEG data URL (model/giftPhoto.ts shrinkPhoto), or null. */
  photo: string | null;
  /** What plays as they open it, or none. */
  effect: Delight | null;
};

const EMPTY: GiftDraft = { to: "", note: "", from: "", scene: "maroon", photo: null, effect: null };
let draft: GiftDraft = EMPTY;
/* What the page picked on its own (the band's season), which "Start over"
   goes back to. */
let base: GiftDraft = EMPTY;
/* A save from earlier brought their background back (hydrateGiftDraft):
   it's theirs, so the page's own pick doesn't replace it, even when it's
   the maroon a fresh gift starts on. */
let restored = false;
const subs = new Set<() => void>();
const changed = () => subs.forEach((f) => f());

export const getGiftDraft = (): GiftDraft => draft;
/** The page's own pick (the band's season), before any of theirs: the look
 *  the builder puts first (Effort C, 7 Nov 2026). */
export const defaultGiftScene = (): SceneId => base.scene;

/** A parent's edit, kept for a day. `quiet`: the page's own default (the
 *  band's season), not theirs, so it isn't kept. */
export function setGiftDraft(patch: Partial<GiftDraft>, opts?: { quiet?: boolean }) {
  if (opts?.quiet) {
    base = { ...base, ...patch };
    if (restored) return;
    draft = { ...draft, ...patch };
  } else {
    draft = { ...draft, ...patch };
    keepGift(draft);
  }
  changed();
}

/** Paid: the next gift starts fresh, and the day's save goes with it. */
export function clearGiftDraft() {
  draft = EMPTY;
  restored = false;
  dropResume();
  changed();
}

/** "Start over": back to the page's own default, nothing of theirs kept. */
export function startGiftOver() {
  draft = { ...EMPTY, scene: base.scene };
  restored = false;
  dropResume();
  changed();
}

/** The gift as they left it, from the save in this browser (under a day
 *  old), once per page load. The /parents page asks before it first draws,
 *  so its band and the builder open on their pick. */
let hydrated = false;
export function hydrateGiftDraft() {
  if (hydrated) return;
  hydrated = true;
  const g = keptGift();
  if (!g) return;
  draft = { to: g.to, note: g.note, from: g.from, scene: g.scene ?? draft.scene, photo: g.photo, effect: g.effect };
  restored = g.scene !== null;
  changed();
}

/** Whether they've made any of the gift theirs (beyond the student's name). */
export const giftDraftTouched = (d: GiftDraft = draft): boolean =>
  !!(d.note.trim() || d.from.trim() || d.photo || d.effect || d.scene !== EMPTY.scene);

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

export function useGiftDraft(): GiftDraft {
  return useSyncExternalStore(subscribe, getGiftDraft, getGiftDraft);
}
