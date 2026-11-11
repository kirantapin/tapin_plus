/* The walkthrough's slides, read by the How it works sheet (shell/HowSheet.tsx).
   The full-page walkthrough that also read them went with /how's redirect
   (3 Nov 2026). */
import { illustrate } from "../model/savings";
import { wholeUsd } from "../model/order";

const money = (n: number) => `$${n.toFixed(2)}`;

/* No charge rows, no seat sentence and no lock line on this route any more
   (Sam, 14 Sep 2026: "we can add all of the pricing info and disclosure stuff
   at checkout"). /reserve prints all of them from PLANS.monthly, the
   flip-aware set — never from the raw extraction. */

/* ══ ONE SENTENCE, WITH THE SPEND IN IT ════════════════════════════════════
   Sam, 14 Sep 2026: "we should have 'based on $X spend per month, you'd save X
   amount per month' in the same sentence and just make the $amount spend per
   month clickable."

   The parts are built once and read twice — joined for the string every
   label, live region and step name speaks, and mapped for the headline, where
   the spend part becomes the button that turns the deck back to the question.
   One source, so the spoken sentence and the printed one cannot drift. */
type HeadPart = string | { spend: string };
export const valueHead = (spend: number, steadyUsd: number): HeadPart[] => [
  "Based on ",
  { spend: wholeUsd(spend) },
  ` spend a month, you'd save about ${money(steadyUsd)} a month`,
];
export const headText = (parts: HeadPart[]) =>
  parts.map((p) => (typeof p === "string" ? p : p.spend)).join("");

/**
 * The deck opens by asking what she spends and closes by telling her what that
 * is worth — so the last slide's figure is HERS, not a stranger's. Everything
 * between is the mechanism.
 *
 * §8 still governs: anything the app cannot do yet carries its status in the
 * slide's own type, never as fine print. Lines are one clause — the art carries
 * the explanation.
 *
 * SEVEN SLIDES, NOT TEN. Three came out after a walkthrough, and none of them
 * lost a fact:
 *
 *   "Two ways to collect" — two readers named this as the exact screen they
 *     closed the tab on. It explains a handoff procedure to someone who has not
 *     decided to buy anything, and its art is a bell, the word "or", and a phone.
 *   "More of your week" — duplicates the More-joining tile on "/", which she has
 *     already scrolled past, and its art is five blank boxes.
 *   "Members-only nights" — duplicates the nights block on "/", which now has a
 *     scene of its own there.
 *
 * Both cut scenes stay in Scenes.tsx, built and one line from returning.
 */
export function buildSlides(spend: number) {
  const s = illustrate(spend);
  return [
    {
      id: "spend",
      headline: "What do you spend in a month in Blacksburg?",
      line: "Coffee, lunch, dinner. The everyday stuff.",
      tag: null as string | null,
      /** Never auto-advances: this one waits for her. */
      hold: true,
      dwellMs: 0,
      next: "That's about right",
    },
    {
      id: "value",
      /* The payoff, immediately after the question — computed from HER answer.
         §7 governs here exactly as it does on the close: a figure at display
         size carries its condition and its disclaimer in the same type, which
         is why both slides share `--fig` and the `.close-say` block rather than
         each inventing a treatment. */
      /* Sam, 13 Sep 2026: "we should say, based on your spend of X amount per
         month, here's what you'd be able to save."

         "Up to $152.50 a month" was a ceiling with no owner — it read as a
         marketing maximum rather than as HER number, which is the one thing
         this deck has that a landing page does not. The saving leads, because
         it is what she came for; the basis follows in her own figure; and the
         model's own two sentences follow that, unchanged. `s.condition` is
         model-owned on purpose — savings.ts calls it "not a caveat on the
         claim, it IS the claim" — so it is quoted, never paraphrased. */
      headline: headText(valueHead(spend, s.steadyUsd)),
      line: `${s.condition} ${s.disclaimer}`,
      tag: null,
      hold: false,
      dwellMs: 9000,
    },
    {
      /* The places joining next, and the price locked in (Sam, 4 Nov 2026:
         "mention in one of these slides ... adding other merchants and the
         price going up but not for those who lock it in right now"). Third,
         straight after what you'd save (Sam, 4 Nov 2026: "I just want people
         to know that more places are joining, sooner. Maybe creates a bit of
         urgency"). */
      id: "growing",
      headline: "More places are joining",
      line: "As places join, the price goes up for people who join later. Yours stays $7.99.",
      tag: null,
      hold: false,
      dwellMs: 6000,
      /* "Show me how" (Sam, 13 Sep 2026) sat on the value slide, which led
         into this one once it moved third, so the button promised the how
         and opened the price going up (Sam, 6 Nov 2026: "make sure it makes
         sense logically"). It sits here now, straight before the how. */
      next: "Show me how",
    },
    {
      /* The monthly $5 to spend at each place (Sam, 11 Nov 2026: "did you
         update the how this works modal ... for the $5 to spend"), before
         the order slide's weekly $5 back and 15%. */
      id: "monthly",
      headline: "$5 to spend at each spot, every month",
      line: "No minimum spend. It resets each month, so use it.",
      tag: null,
      hold: false,
      dwellMs: 6000,
    },
    {
      id: "order",
      headline: "Order in the app, save 15% now",
      /* "In the app" is the only place in the whole build that says WHERE the
         order happens. Nothing else did — not one user-visible string contained
         the word — and a reader who took the card as the mechanism would have
         walked into Coffeeholics, ordered at the register and shown it. */
      /* Sam, 15 Sep 2026: "you'd only be able to use one of the two benefits
         ($5 credit on $10 spend or the 15% off), but you can earn points on
         everything." This slide is the 15%; the next is the credit. */
      line: "Or pay full price on a $10+ order and earn $5 back, once a week at each place. Points on everything.",
      tag: null,
      hold: false,
      dwellMs: 8000,
    },
    {
      id: "myspot",
      /* Sam, 13 Sep 2026: the slide should show "how someone can redeem a deal
         before it ends and then save their items to their account which lasts
         for 90 days". Both halves are now in the copy AND in the art — the
         struck price is the deal caught in time, the meter is the 90 days. */
      /* "keep it for later", not "keep the food". Sam, 14 Sep 2026: "this can
         also apply to other items too, like drinks or cover charge or a line
         skip." The art is one real Coffeeholics order — a second venue's cover
         on the same ticket would be an order the app does not place — so the
         reach is stated in the copy, where the four kinds are named. */
      headline: "Catch the deal, keep it for later",
      /* "Example", from the 14 Sep funnel audit: the two-minute window is a
         demonstration on a demonstration order, and the tag says so on the
         slide rather than leaving a skeptic to read it as a flash sale. */
      /* Sam, 14 Sep 2026: the scene is now two minutes left on the week's $5
         credit ("the $5 credit ending in 2 minutes"), answered by ordering now
         and letting the order wait. The line states the window — the art shows
         it drain — and names My Spot, which the short-phone tier relies on (it
         hides the ticket's caption there). */
      line:
        "Thirty seconds left on this week's $5 credit. Order $10+ now at full price, the credit lands in your account, and the food waits in My Spot.",
      tag: "Example",
      hold: false,
      dwellMs: 6000,
    },
    {
      id: "offers",
      headline: "Special offers on top of your benefits",
      /* THE EXAMPLE TAG CAME OFF, and it came off for the one reason that
         justifies removing a hedge: the thing stopped being invented. Sam
         confirmed the Olaika offer is real on 13 Sep 2026, so it moved into
         money-and-terms.json and this slide reads it from there. A real offer
         at a real merchant wearing "Example" understates the only verifiable
         claim on the slide — and Italiano's 10%, which WAS invented, is no
         longer what this slide shows. */
      line: "Run by each place, for members only.",
      tag: null,
      hold: false,
      dwellMs: 6000,
    },
    {
      id: "entry",
      /* Buying entry is not TapIn's idea — other apps already sell line skips.
         Earning on it is. It sits between the two not-yet slides so they are
         never consecutive: four unbuilt screens in a row before the ask is
         what made readers bail at step seven. */
      headline: "Cover and line skips earn too",
      /* They are not alcohol, so the 15% reaches them (28 Oct 2026); the
         scope line under it says the rule. */
      line: "They earn points and get 15% off.",
      footnote: true,
      tag: null,
      hold: false,
      dwellMs: 6000,
    },
    {
      id: "points",
      /* NO RATIO. This line read "Four there make one here" and it was the most
         confusing string in the build — four readers read it three times and
         still could not tell which direction they were losing, and the scene
         draws their balances shrinking while the copy prices the trade. It also
         published a conversion rate for a programme that is not built, which is
         a rate someone holds Sam to in 2027. The true half is the half that
         argues FOR concentrating spend. */
      headline: "Points add up to rewards",
      line: "Earn at every place. Redeem them for rewards where you earned them.",
      /* NO SLIDE-LEVEL TAG. Sam, 13 Sep 2026: "points are already live, what's
         NOT live would be 'move it out' which is where we can have the 'coming'
         badge."

         This was flagged in review and left for him: the tag and the line
         described different halves of the feature. Earning 20 a dollar is a
         standing benefit that works today; the unbuilt half is moving a balance
         out to a partner. A reader who took "Coming" for the whole slide
         concluded that points themselves do not exist yet — which understates a
         live benefit on a page asking for money.

         §8 is still satisfied and is satisfied better: the status now sits on
         the exact thing it governs, inside the composition, at that block's own
         type rather than as a badge over a headline it does not apply to. */
      tag: null,
      hold: false,
      dwellMs: 7000,
    },
    {
      id: "redeem",
      /* The handoff, restored as its own slide at Sam's ask. An earlier deck
         had "Two ways to collect" and it was CUT because two readers named it
         as the exact screen they closed the tab on — but that version was a
         bell, the word "or", and a phone, explaining a procedure to someone who
         had not decided to buy anything. This one sits after the value is made
         and shows the real artifact, which is a different slide with the same
         subject. */
      headline: "How you get it",
      /* CARRIES WHAT THE TILES DROPPED. The four routes used to run as rows
         with a sub-line each; going visual cost those four sub-lines, and one
         of them was load-bearing — "almost anything" is the reason the fourth
         tile is not a rare case. The line says it once for all four. */
      line: "Show your phone at the counter, or have it sent to the kitchen.",
      tag: null,
      hold: false,
      dwellMs: 7000,
    },
    {
      id: "close",
      /* Computed from what she picked on slide one. Never typed. Rendered
         through .scene-head.is-figure rather than as its own treatment — see
         the §7 note in the close's copy block below. */
      headline: `About ${money(s.steadyUsd)} back a month`,
      line: `${s.condition} ${s.disclaimer}`,
      tag: null,
      hold: false,
      dwellMs: 12000,
    },
  ];
}
