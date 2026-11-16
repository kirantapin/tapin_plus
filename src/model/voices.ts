/* ══ VOICES ON /parents (Sam's pick C, 7 Nov 2026) ══════════════════════
   Shown under the offer's promise (routes/parents_sections.tsx Voices), and
   only when this list has quotes in it: while it's empty, nothing renders.
   Never write one for anyone.

   Each is a real parent's own words, shown with their permission (first
   name, last initial, photo). `quote` is the short line on the card (Sam:
   too much text at first touch is hard to digest); `full` is their whole
   quote, one tap down. Photos live in public/parents/voices/.

   Sam, 7 Nov 2026: three moms whose Virginia Tech students use Tapin Plus,
   asked for reviews over the weekend; they pay us directly for their
   kids' Plus. */

export interface Voice {
  quote: string;
  name: string;
  role: "Parent" | "Student";
  photo?: string;
  /** The whole quote, in their words, shown on a tap. */
  full?: string;
  /** What shows under the name, if not the role (Sam, 7 Nov 2026: "VT parent"). */
  label?: string;
  /** Their Instagram handle, no @: shown under the name and linked to their
   *  profile, so a visitor can see they're real (15 Nov 2026). */
  handle?: string;
  /** Their class year ("Junior"), shown in place of the label when known:
   *  the nearer the reader's own group, the stronger the proof. */
  year?: string;
  /** The words of the quote that are the result, set in bold money green so
   *  a skim gets it. Must appear in `quote` exactly. */
  hit?: string;
  /** The place they talk about (a venue id): on that place's own page they
   *  come first. */
  place?: string;
}

export const VOICES: Voice[] = [
  {
    quote: "She used it 10 times at 3 spots she\u2019s already a regular at and saved $50 in a month.",
    full: "I was worried it would be another subscription she forgot about. She\u2019s used it 10 times at 3 spots she\u2019s already a regular at and saved $50 in 1 month.",
    name: "Denise M.",
    role: "Parent",
    label: "VT parent",
    photo: "/parents/voices/denise.webp",
  },
  {
    quote: "The last care package sat in the mailroom for three days. This went straight to her coffee place.",
    full: "The last care package sat in the mailroom for three days. Tapin went straight to the coffee place she already visits. Apparently, the secret is sending something she doesn\u2019t have to pick up.",
    name: "Elaine C.",
    role: "Parent",
    label: "VT parent",
    photo: "/parents/voices/elaine.webp",
  },
  {
    quote: "Then he asked me to keep it going. For once, he was reminding me.",
    full: "I figured I\u2019d try it for a month and probably have to remind him it existed. Then he asked me to keep it going. For once, he was reminding me about something.",
    name: "Laura B.",
    role: "Parent",
    label: "VT parent",
    photo: "/parents/voices/laura.webp",
  },
];

/* Local preview only (npm run dev with ?parentmock): the marked placeholder
   slots, so the layout can be seen before real quotes exist. A production
   build drops this list (import.meta.env.DEV is false there). */
export const PREVIEW_VOICES: Voice[] = import.meta.env.DEV
  ? [
      { quote: "[real parent quote needed]", name: "[First name]", role: "Parent" },
      { quote: "[real student quote needed]", name: "[First name]", role: "Student" },
    ]
  : [];

/* ══ VOICES ON THE STUDENT PAGE, plus.tapin.app (Sam, 8 Nov 2026) ════════
   The same rules as VOICES above: a real student's own words, with their
   permission (first name, last initial, photo), `label` "VT student". Empty
   until there are some, and while it's empty the slot renders nothing in a
   build. Never write one for anyone, and never reuse a parent's quote here
   without asking them again (Denise M.'s permission covered /parents). */
export const STUDENT_VOICES: Voice[] = [
  /* The three students who lent their name, photo and Instagram (Sam, 15–16
     Nov 2026). Each answers one doubt a student has before joining, in a
     texting voice, one specific detail each, no exclamation marks:
       Zoe    · "Is it worth the money?"         (what she saves)
       Grace  · "Do I even go out enough?"        (the habit she already had)
       Hayley · "What's the catch?"               (to come, in her words)
     DRAFTS for Sam's review, built only on what each told us; each student
     confirms hers is true and OKs the wording in writing before it ships
     (Hayley Palenscar, @hayleypalenscar, the third, goes in once she sends
     her own answer to "did you think there was a catch?"; her photo is in
     public/students/voices on the session's working copy). `place` puts a
     place's own student first on that place's page. */
  {
    quote: "I was spending like $100 a month on coffee between Starbucks and Coffeeholics. Now it\u2019s all Coffeeholics and I\u2019m saving like $40 a month.",
    name: "Zoe P.",
    role: "Student",
    label: "VT student",
    handle: "zoe.peeler",
    hit: "saving like $40 a month",
    photo: "/students/voices/zoe.webp",
    place: "coffeeholicsva",
  },
  {
    quote: "The Burg was already my once-a-week spot, so this was kind of a no-brainer. I go way more now. Get the birria tacos.",
    name: "Grace G.",
    role: "Student",
    label: "VT student",
    handle: "graceeluoo",
    hit: "I go way more now",
    photo: "/students/voices/grace.webp",
    place: "theburg",
  },
];

/* Local dev only (npm run dev): three marked placeholder slots, so the
   layout can be seen before real quotes exist. A production build drops
   this list (import.meta.env.DEV is false there). */
export const PREVIEW_STUDENT_VOICES: Voice[] = import.meta.env.DEV
  ? [1, 2, 3].map(() => ({ quote: "[real student quote needed]", name: "[First name]", role: "Student" as const, label: "VT student" }))
  : [];
