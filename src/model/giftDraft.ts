/* ══ THE GIFT A PARENT IS PUTTING TOGETHER (Sam, 6 Nov 2026: "We should also
   allow someone to preview their own message, own photo, and sender name (if
   someone fills that in with the preview, it should be saved when they check
   out so they don't have to do it twice)") ═══════════════════════════════════
   One draft for the page's life: the preview on /parents ("See what they'll
   see") and the checkout read and write the same fields, so whatever a parent
   types in one is already in the other. In memory only (the photo is a data
   URL of up to 1.5M characters, and it's a family's own). Cleared once a
   checkout goes through. */
import { useSyncExternalStore } from "react";
import type { Delight, SceneId } from "./gift";

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
const subs = new Set<() => void>();

export const getGiftDraft = (): GiftDraft => draft;

export function setGiftDraft(patch: Partial<GiftDraft>) {
  draft = { ...draft, ...patch };
  subs.forEach((f) => f());
}

export function clearGiftDraft() {
  draft = EMPTY;
  subs.forEach((f) => f());
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
