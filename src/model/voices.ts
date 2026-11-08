/* ══ VOICES ON /parents: ONE PARENT, ONE STUDENT (Sam's pick C, 7 Nov 2026) ══
   Shown under the offer's promise (routes/parents_sections.tsx Voices), and
   only when this list has quotes in it: while it's empty, nothing renders.
   No quotes exist yet, and none may ever be written for anyone.

   To add one (Sam, Kiran): a real parent's or student's own words, with
   their written permission to show them; 12 words or fewer; their first
   name and role; a photo only if they gave one (a public path, e.g.
   "/parents/voices/maya.webp"). One parent and one student, in that order. */

export interface Voice {
  quote: string;
  name: string;
  role: "Parent" | "Student";
  photo?: string;
}

export const VOICES: Voice[] = [];

/* Local preview only (npm run dev with ?parentmock): the marked placeholder
   slots, so the layout can be seen before real quotes exist. A production
   build drops this list (import.meta.env.DEV is false there). */
export const PREVIEW_VOICES: Voice[] = import.meta.env.DEV
  ? [
      { quote: "[real parent quote needed]", name: "[First name]", role: "Parent" },
      { quote: "[real student quote needed]", name: "[First name]", role: "Student" },
    ]
  : [];
