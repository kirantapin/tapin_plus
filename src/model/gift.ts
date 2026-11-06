/* ══ A PARENT'S GIFT NOTE (Sam, 6 Nov 2026: "can we also have the ability for
   moms to attach a gift message and a special gift animation with a custom
   landing page for those they're sending it to"; picked: the envelope and
   letter) ═════════════════════════════════════════════════════════════════
   What the student's gift page shows: who it's for, who it's from, the note,
   and the number their Plus is on. The real page reads it by the key in the
   student's text (lookupGift, model/parents.ts); /gift/sample shows the
   sample below, which is what "See what they'll see" on /parents opens.
   Local dev also takes ?to= ?from= ?note= on the sample, to try real words
   (never a production build: a public page that prints any words from its
   address would be a page anyone could put words on). */

export type Gift = {
  /** The student's first name, or null if what was typed isn't plainly one. */
  to: string | null;
  /** How the parent signs it: "Mom", "Dad", "Grandma", their name. */
  from: string;
  /** The note, up to NOTE_MAX characters. Null means no note. */
  note: string | null;
  /** The number Plus is on, masked: "•••0123". */
  masked: string;
};

export const NOTE_MAX = 240;
export const FROM_MAX = 24;

export const SAMPLE_GIFT: Gift = {
  to: "Maya",
  from: "Mom",
  note: "Lunch is on me this semester. So proud of you, and I miss you already. Call me Sunday!",
  masked: "•••0123",
};

/** The sample, with any of ?to= ?from= ?note= swapped in (local dev only). */
export function previewGift(search: string): Gift {
  if (!import.meta.env.DEV) return SAMPLE_GIFT;
  const q = new URLSearchParams(search);
  const take = (k: string, fallback: string, max: number) => {
    const v = q.get(k);
    return v === null ? fallback : v.trim().slice(0, max);
  };
  return {
    to: take("to", SAMPLE_GIFT.to ?? "", 24) || SAMPLE_GIFT.to,
    from: take("from", SAMPLE_GIFT.from, FROM_MAX) || SAMPLE_GIFT.from,
    note: take("note", SAMPLE_GIFT.note ?? "", NOTE_MAX) || null,
    masked: SAMPLE_GIFT.masked,
  };
}

/** A text to the parent, the words already typed. `sms:?&body=` opens the
 *  Messages composer on iPhone and Android alike; the student picks who. */
export const thanksHref = (from: string) =>
  `sms:?&body=${encodeURIComponent(`Thank you for Tapin Plus, ${from}!`)}`;
