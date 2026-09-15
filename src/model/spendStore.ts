import { useSyncExternalStore } from "react";
import { MONTHLY_SPEND_ANCHOR } from "./savings";

/**
 * ONE SPEND NUMBER PER SESSION.
 *
 * This exists because of a defect a student walkthrough caught, and it is the
 * only one in the build that could fairly be called deceptive rather than
 * merely unclear: she told the walkthrough she spends $100 a month, the deck
 * closed on "About $45.75 back a month", and then /reserve mounted its own
 * slider at its own default and printed $152.50 three inches above a charge
 * row. A savings claim that changes between two screens on the way to a
 * payment is not a design problem.
 *
 * So the deck, the pitch and the checkout all read and write one value. A
 * module-level store rather than context: three unrelated routes need it, none
 * of them owns it, and a provider wrapping the whole shell to hold one number
 * is more machinery than the number is worth.
 *
 * Deliberately NOT persisted. It lives for the session and dies with the tab —
 * a figure a stranger set once and forgot is not something to keep.
 *
 * THE DEFAULT IS 150, NOT THE ANCHOR. $300 is Sam's own going-out figure and
 * stays documented as the anchor in savings.ts, but three of six students read
 * the biggest number on the page, worked out it was measured off someone who
 * spends $300 a month, and heard "not for you". The model returns real computed
 * figures across the whole range; only the starting point moves.
 */
export const DEFAULT_SPEND = 150;

let spend = DEFAULT_SPEND;
/**
 * HAS SHE ACTUALLY ANSWERED, or is this still the default?
 *
 * The store could not tell the difference, and that is a correctness problem
 * rather than a nicety: a surface that prints "you said $150" over a figure she
 * never chose is laundering our own default as her answer. The sibling
 * prototype shipped exactly that defect and it was the one finding a reviewer
 * called deceptive rather than merely unclear. So the flag is set only by a
 * real call to setSpend, and a default-valued session reads "Assuming".
 */
let answered = false;
const listeners = new Set<() => void>();

export function setSpend(next: number) {
  answered = true;
  if (next === spend) {
    listeners.forEach((l) => l());
    return;
  }
  spend = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/* One snapshot string covering both values: useSyncExternalStore compares by
   Object.is, so returning a fresh object each call would loop forever. */
const getSnapshot = () => `${spend}:${answered ? 1 : 0}`;

/** Reads the session's one spend figure and re-renders when it changes. */
export function useSpend(): [number, (n: number) => void] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [spend, setSpend];
}

/** Whether the figure is hers or still ours. Never claim the second is the first. */
export function useAnswered(): boolean {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return answered;
}

/** Kept exported so the anchor's provenance stays traceable from here. */
export { MONTHLY_SPEND_ANCHOR };
