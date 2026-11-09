/* ══ THE HERO A/B TEST (Sam, 4 Nov 2026: "go ahead with AB test too that's
   fine, as long as it's the same link pointing to the page") ═══════════════
   One link, plus.tapin.app, and each visitor is given one hero the first time
   and keeps it (localStorage), half and half:
     "b" · Pays for itself: "Your first $10 order pays for your first month"
           and "$5 back every week at 5 Blacksburg spots" (Sam, 4 Nov 2026:
           "swap in the pays-for-itself hero"; "the membership pays for
           itself immediately").
     "0" · Control: the hero as it was, "$5 back at every place you already go
           in Blacksburg".
   "a" (Named: "$5 back every week at 5 Blacksburg spots") ran 4 Nov and is out
   of the draw; ?hero=a|b|0 shows any of them and is not stored. The key moved
   to v2 on the swap, so everyone is drawn again between "b" and "0".

   Every PostHog event carries the variant (context/event_tracking_context.tsx
   registers it), as `hero_variant` and as `$feature/plus-hero`, the property
   PostHog's experiment and breakdown views read. Compare Join clicks, step
   events and subscriptions per variant. */

/* ══ ROUND 3 (Sam, 5 Nov 2026: the running test "isn't very compelling.
   It's not what someone should see first") ══════════════════════════════════
   Three new headlines, each a different idea, so the test says which one
   moves a student:
     "m" · What it is: "A membership to all your favorite Blacksburg spots"
           (Sam's line).
     "s" · What it's worth: "The average member saves $60 a month" (Sam:
           "just say average member"; a rough figure for now, our own
           estimate at $100 a month in $10 orders, $50 in credit and about
           $10 in points; replace it with the real average once there is a
           month of members).
     "p" · How it works, at one place: "Spend $10 at Coffeeholics, get $5
           back weekly" (from drafted candidates; the place most students
           already know).
   The key moved to v3, so everyone is drawn again among the three. "a",
   "b" and "0" stay previewable with ?hero=. */
/* ══ ENDED (Sam, 9 Nov 2026: "End test, use Rob's line") ═══════════════════
   Everyone gets "r", Rob's headline in a student's words with its line
   under it (HERO_SUBS), the same as /parents. Round 3's draw is cleared;
   ?hero= still previews every one. The variant is still registered as
   hero_variant so events say which headline showed, but not as the
   experiment's flag, so the ended experiment's numbers stay as they were. */
export type HeroVariant = "a" | "b" | "0" | "m" | "s" | "p" | "r" | "w";

/** The new round's headlines. */
export const HERO_LINES: Partial<Record<HeroVariant, string>> = {
  m: "A membership to all your favorite Blacksburg spots",
  s: "The average member saves $60 a month",
  p: "Spend $10 at Coffeeholics, get $5 credit weekly",
  r: "Make every dollar you spend in Blacksburg go further.",
  /* The welcome offer leads (Sam, 9 Nov 2026: "a welcome offer of $5 credit
     at each plus spot ... so $25 immediately available after first
     purchase ... I think that'd be the focus"): no expiry, on top of the
     $3.99 first month. */
  w: "Get $25 at Blacksburg’s best spots.",
};

/** A line under the headline, for the ones that carry one. */
export const HERO_SUBS: Partial<Record<HeroVariant, string>> = {
  r: "$5 credit every week at each of your favorite Blacksburg spots, plus 15% off once a day.",
  w: "$5 to spend at each spot the moment you join, then $5 credit every week at each spot when you spend $10.",
};

export const HERO_TEST = "plus-hero";
const KEY = "tp_hero_v3";
const ALL: HeroVariant[] = ["a", "b", "0", "m", "s", "p", "r", "w"];
const isVariant = (v: string | null): v is HeroVariant => !!v && (ALL as string[]).includes(v);

let cached: HeroVariant | null = null;

export function heroVariant(): HeroVariant {
  if (cached) return cached;
  if (typeof window === "undefined") return "w";
  const asked = new URLSearchParams(window.location.search).get("hero");
  if (isVariant(asked)) return (cached = asked);
  /* The test is over (above): an earlier draw is cleared. */
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* Storage blocked: nothing kept to clear. */
  }
  return (cached = "w");
}

/** The super properties that tag every event with the visitor's hero. */
export const heroTestProps = () => {
  const v = heroVariant();
  return { hero_variant: v };
};
