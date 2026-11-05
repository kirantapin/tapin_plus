/* ══ THE WELCOME WEEK HEADLINE TEST (Sam, 5 Nov 2026: "I think we need to AB
   test 3 different header texts since that's going to be a big needle
   mover") ═══════════════════════════════════════════════════════════════════
   On the Welcome Week link only. Each visitor is given one of three
   headlines the first time and keeps it (localStorage), a third each. Every
   PostHog event of the session carries it, as `ww_hero_variant` and as
   `$feature/plus-ww-hero`, the property PostHog's experiment and breakdown
   views read (registered from PlusHome once the invitation applies). The
   Welcome Week link's own `link_id` is on the session too (App.tsx), so
   compare Try Plus for free taps, step events and subscriptions per variant
   within link_id 5ed0ec82-….

   ?wwh=a|b|c shows any of them and is not stored. */

export type WwHeroVariant = "a" | "b" | "c";

export interface WwHero {
  /** The headline. */
  h1: string;
  /** The cream paper strip under it. */
  strip: string;
}

/** Three angles, picked from drafted candidates (5 Nov 2026), so the test
 *  says which idea moves a cold student, not which wording:
 *    a · Money: "each of" settles whether the $5 is per place.
 *    b · Free and Sunday: no charge for a month, a reason to act now; the
 *        strip says what Plus gives.
 *    c · Invitation: why this reached them, on the same offer as "a", so it
 *        measures what the Welcome Week framing adds. */
export const WW_HEROES: Record<WwHeroVariant, WwHero> = {
  a: { h1: "$5 back every week at each of 5 spots", strip: "First month free" },
  b: { h1: "Join by Sunday, pay nothing for a month", strip: "Get $5 back every week" },
  /* Unbroken "Welcome Week" and "$5 back", so it breaks after the colon. */
  c: { h1: "A Welcome\u00a0Week invite: $5\u00a0back every week", strip: "First month free" },
};

export const WW_HERO_TEST = "plus-ww-hero";
const KEY = "tp_ww_hero_v1";
const DRAW: WwHeroVariant[] = ["a", "b", "c"];

let cached: WwHeroVariant | null = null;

export function wwHeroVariant(): WwHeroVariant {
  if (cached) return cached;
  if (typeof window === "undefined") return "a";
  const asked = new URLSearchParams(window.location.search).get("wwh");
  if (asked === "a" || asked === "b" || asked === "c") return (cached = asked);
  try {
    const kept = window.localStorage.getItem(KEY);
    if (kept === "a" || kept === "b" || kept === "c") return (cached = kept);
  } catch {
    /* Storage blocked: a draw per page load is the best there is. */
  }
  const drawn = DRAW[Math.floor(Math.random() * DRAW.length)] ?? "a";
  try {
    window.localStorage.setItem(KEY, drawn);
  } catch {
    /* As above. */
  }
  return (cached = drawn);
}

/** The super properties that tag the session's events with the headline. */
export const wwHeroProps = () => {
  const v = wwHeroVariant();
  return { ww_hero_variant: v, [`$feature/${WW_HERO_TEST}`]: v };
};
