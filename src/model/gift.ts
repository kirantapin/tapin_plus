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
  /** The background the parent picked (SCENES). */
  scene: SceneId;
  /** The parent's photo, if they added one: a URL the page can show. */
  photo: string | null;
};

/* ══ THE PARENT'S PICKS (Sam, 6 Nov 2026: "how can we give these a bit more
   personality ... if they could add an image too that'd make it feel super
   personable"; then "let's do the care package envelope, and then give moms
   the option to upload an image and select their own background style") ══
   One envelope for everyone, the care package (kraft and twine). The parent
   picks the background, each a thing from home or from school, and can add
   a photo. (Campus, the Burruss collage, was cut the same day: "too busy".) Flat fills only; a pattern only where the real object has one (a
   tablecloth's check). */
export const SCENES = [
  { id: "maroon", name: "Maroon", line: "School colors" },
  { id: "picnic", name: "Picnic", line: "Lunch is on me" },
  { id: "night", name: "Night sky", line: "Miss you" },
  { id: "confetti", name: "Confetti", line: "Something to celebrate" },
  /* Eight of ten designed the same day ("i like all of these"; Notebook and
     Diner left out). */
  { id: "airmail", name: "Airmail", line: "All the way from home" },
  { id: "sunrise", name: "Sunrise", line: "Good morning" },
  { id: "ridge", name: "Blue Ridge", line: "The mountains" },
  { id: "hearts", name: "Hearts", line: "Love you" },
  /* Four cute ones (Sam, 6 Nov 2026: "can we get a little cute with some of
     these background options?"). */
  { id: "sprinkles", name: "Sprinkles", line: "A little treat" },
  { id: "daisies", name: "Daisies", line: "Sunshine" },
  { id: "xoxo", name: "XOXO", line: "Hugs and kisses" },
  { id: "smileys", name: "Smileys", line: "Hang in there" },
  { id: "flannel", name: "Flannel", line: "Fall" },
  { id: "lunch", name: "Lunch", line: "On me" },
  { id: "sunburst", name: "Sunburst", line: "Hooray" },
  { id: "leaves", name: "Fall leaves", line: "Autumn" },
  /* Seasonal (Sam, 6 Nov 2026: "can we also add channukah and christmas,
     along with a general "holiday" backgrounds - these would be in a
     "seasonal" category"). */
  { id: "hanukkah", name: "Hanukkah", line: "Happy Hanukkah", group: "seasonal" },
  { id: "christmas", name: "Christmas", line: "Merry Christmas", group: "seasonal" },
  { id: "holiday", name: "Holiday", line: "Happy holidays", group: "seasonal" },
] as const;

/** The pickers' groups: the seasonal ones first, marked limited time (Sam,
 *  6 Nov 2026: "seasonal should show up above the regular ones (also
 *  include "limited time")"), then the everyday ones. */
export const SCENE_GROUPS: ReadonlyArray<{ label: string; tag?: string; scenes: ReadonlyArray<(typeof SCENES)[number]> }> = [
  { label: "Seasonal", tag: "Limited time", scenes: SCENES.filter((e) => "group" in e && e.group === "seasonal") },
  { label: "Background", scenes: SCENES.filter((e) => !("group" in e)) },
];
/** Every background in the pickers' order, for cycling through them. */
export const SCENE_ORDER = SCENE_GROUPS.flatMap((g) => g.scenes);
export type SceneId = (typeof SCENES)[number]["id"];

export const isScene = (v: unknown): v is SceneId => SCENES.some((e) => e.id === v);

export const NOTE_MAX = 240;
export const FROM_MAX = 24;

export const SAMPLE_GIFT: Gift = {
  to: "Maya",
  from: "Mom",
  note: "Thinking of you, my love! Here’s a little something to treat yourself. Hang in there! Proud of you!",
  masked: "•••0123",
  scene: "maroon",
  photo: null,
};
/** The sample's photo, for "with a photo" previews: the parents page's own
 *  move-in picture (a parent and their student). */
export const SAMPLE_PHOTO = "/parents/hero-hug.webp";

/** The sample, with any of ?to= ?from= ?note= swapped in (local dev only),
 *  and ?bg= ?photo=1 (any build: they only choose among our own
 *  designs and our own sample photo, so nothing outside can be put on it). */
export function previewGift(search: string, photoSrc: string): Gift {
  const q = new URLSearchParams(search);
  const bg = q.get("bg");
  const picks = {
    scene: isScene(bg) ? bg : SAMPLE_GIFT.scene,
    photo: q.get("photo") === "1" ? photoSrc : null,
  };
  if (!import.meta.env.DEV) return { ...SAMPLE_GIFT, ...picks };
  const take = (k: string, fallback: string, max: number) => {
    const v = q.get(k);
    return v === null ? fallback : v.trim().slice(0, max);
  };
  return {
    to: take("to", SAMPLE_GIFT.to ?? "", 24) || SAMPLE_GIFT.to,
    from: take("from", SAMPLE_GIFT.from, FROM_MAX) || SAMPLE_GIFT.from,
    note: take("note", SAMPLE_GIFT.note ?? "", NOTE_MAX) || null,
    masked: SAMPLE_GIFT.masked,
    ...picks,
  };
}

/** A text to the parent, the words already typed. `sms:?&body=` opens the
 *  Messages composer on iPhone and Android alike; the student picks who. */
export const thanksHref = (from: string) =>
  `sms:?&body=${encodeURIComponent(`Thank you for Tapin Plus, ${from}!`)}`;

/** Who the gift is from, by the backend's rule (gift_lookup's and the text's
 *  {Who}): the sign-off if it's a plain short name (letters, spaces,
 *  apostrophes, hyphens, periods; no "mom.com"), else the parent's first
 *  name if that's plainly a name, else "Your parent". The preview uses it so
 *  the parent sees what the student will. */
export function giftWho(signOff: string, parentName: string): string {
  const s = signOff.trim().replace(/\s+/g, " ").replace(/’/g, "'");
  if (s && s.length <= FROM_MAX && /^[A-Za-z '.-]+$/.test(s) && /[A-Za-z]/.test(s) && !/\.[A-Za-z]{2}/.test(s)) return s;
  const first = parentName.trim().split(/\s+/)[0]?.replace(/’/g, "'") ?? "";
  if (first && first.length <= 40 && /^[A-Za-z][A-Za-z'-]*$/.test(first)) return first;
  return "Your parent";
}
