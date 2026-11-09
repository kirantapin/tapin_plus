/* ══ SESSION REPLAY PRIVACY: THE PARENTS' BUILDER AND CHECKOUT (9 Nov 2026) ══
   Sam: "I'd like to be able to see what parents are seeing as they go
   through that". They used to be blocked outright (ph-no-capture), so a
   replay of the builder was a flat gray box. Now they are recorded with
   their text masked BY DEFAULT:

   - Inside a `.ph-mask` area (the builder's root, and the embedded
     checkout), every word is recorded as asterisks, unless the NEAREST
     marked ancestor is `[data-ph-show]`. That marker goes only on fixed copy
     (step titles, button labels, prices, the places): never on anything that
     can hold a family's own words (the student's name, the sign-off, the
     note, a phone number or email). A `.ph-mask` inside a `[data-ph-show]`
     masks again, so a name inside a shown line stays hidden.
   - Text a later change adds is masked until someone marks it: forgetting a
     marker costs a word in a replay, never a family's privacy.
   - The same goes for attributes that carry words (aria-label, alt, title,
     placeholder) and for sms:/mailto:/tel: links.
   - Photos are blocked (ph-no-capture on each <img>, and on the file input,
     whose value is the file's name: maskAllInputs skips file inputs). Typed
     values are masked by maskAllInputs (context/event_tracking_context.tsx).
   - Autocapture is a separate thing: areas that show family data carry
     ph-no-autocapture ph-no-deadclick ph-no-rageclick, as ph-no-capture
     kept them out of it before.

   Wired into posthog.init's session_recording as maskTextFn and
   maskAttributeFn. Session replay calls maskTextFn only for text inside a
   `.ph-mask` area, so nothing outside these areas changes. */

const SHOW = "[data-ph-show]";
const MASK = ".ph-mask";

const stars = (s: string) => s.replace(/\S/g, "*");

/** True when the nearest marked ancestor (or the element itself) says show. */
function shown(el: Element | null | undefined): boolean {
  const near = el?.closest?.(`${SHOW}, ${MASK}`);
  return !!near && near.matches(SHOW);
}

export function replayMaskText(text: string, el?: HTMLElement | null): string {
  return shown(el) ? text : stars(text);
}

const WORDY = new Set(["aria-label", "aria-description", "aria-valuetext", "aria-roledescription", "alt", "title", "placeholder", "label"]);

export function replayMaskAttribute(name: string, value: string, el?: Element | null): string {
  const wordy = WORDY.has(name) || (name === "href" && /^\s*(sms|mailto|tel):/i.test(value));
  if (!wordy || !el?.closest?.(MASK) || shown(el)) return value;
  return stars(value);
}
