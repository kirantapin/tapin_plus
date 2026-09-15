import { useSyncExternalStore } from "react";

/**
 * ONE NAME PER SESSION — the one on the card.
 *
 * Sam, 14 Sep 2026: "maybe the questionnaire should also give people the
 * option to add their name on the last slide, they'd just click on the
 * membership card to add their name, it's optional though."
 *
 * So the name has three readers and no owner: the deck's close (where she can
 * type it onto the card), the checkout's name field (which now opens already
 * filled) and the /reserve card (which shows it as she types). Same shape as
 * spendStore.ts and for the same reason — three unrelated routes, one value, no
 * provider worth wrapping the shell in.
 *
 * NOT PERSISTED, and this one is the clearer case: it is a person's name typed
 * into a prototype. It lives for the tab. The reservation record written at
 * purchase carries it from there, which is the only place it should outlive
 * the session.
 */
let name = "";
const listeners = new Set<() => void>();

export function setName(next: string) {
  if (next === name) return;
  name = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const getSnapshot = () => name;

/** Reads the session's one name and re-renders when it changes. */
export function useName(): [string, (n: string) => void] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [name, setName];
}
