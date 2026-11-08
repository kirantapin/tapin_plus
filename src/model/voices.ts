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
}

export const VOICES: Voice[] = [
  {
    quote: "She used it 10 times at 3 places and saved $50 in a month.",
    full: "I was worried it would be another subscription she forgot about. She\u2019s used it 10 times at 3 and saved $50 in 1 month. Those are places she was already going.",
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
