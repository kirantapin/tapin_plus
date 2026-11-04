/* ══ THE HERO A/B TEST (Sam, 4 Nov 2026: "go ahead with AB test too that's
   fine, as long as it's the same link pointing to the page") ═══════════════
   One link, plus.tapin.app, and each visitor is given one hero the first time
   and keeps it (localStorage), half and half:
     "a" · Named: "$5 back every week at 5 Blacksburg spots", the five places
           named, then 15% / the first month / the Promise (Grok's audit).
     "0" · Control: the hero as it was, "$5 back at every place you already go
           in Blacksburg".
   "b" (Payoff: "Your first $10 order pays for the month") is in the build but
   not in the draw; ?hero=a|b|0 shows any of them and is not stored.

   Every PostHog event carries the variant (context/event_tracking_context.tsx
   registers it), as `hero_variant` and as `$feature/plus-hero`, the property
   PostHog's experiment and breakdown views read. Compare Join clicks, step
   events and subscriptions per variant. */

export type HeroVariant = "a" | "b" | "0";

export const HERO_TEST = "plus-hero";
const KEY = "tp_hero_v1";
const DRAW: HeroVariant[] = ["a", "0"];

let cached: HeroVariant | null = null;

export function heroVariant(): HeroVariant {
  if (cached) return cached;
  if (typeof window === "undefined") return "0";
  const asked = new URLSearchParams(window.location.search).get("hero");
  if (asked === "a" || asked === "b" || asked === "0") return (cached = asked);
  try {
    const kept = window.localStorage.getItem(KEY);
    if (kept === "a" || kept === "0") return (cached = kept);
  } catch {
    /* Storage blocked: a draw per page load is the best there is. */
  }
  const drawn = DRAW[Math.floor(Math.random() * DRAW.length)] ?? "0";
  try {
    window.localStorage.setItem(KEY, drawn);
  } catch {
    /* As above. */
  }
  return (cached = drawn);
}

/** The super properties that tag every event with the visitor's hero. */
export const heroTestProps = () => {
  const v = heroVariant();
  return { hero_variant: v, [`$feature/${HERO_TEST}`]: v };
};
