import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SCENES } from "../shell/Scenes";
import { stashCardOrigin } from "../shell/cardFlight";
import { illustrate } from "../model/savings";
import { useSpend } from "../model/spendStore";
import { wholeUsd } from "../model/order";
import { launchWindow } from "../model/content";
import { useReserveCta } from "../shell/useReserveCta";

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
const valueHead = (spend: number, steadyUsd: number): HeadPart[] => [
  "Based on ",
  { spend: wholeUsd(spend) },
  ` spend a month, you'd save about ${money(steadyUsd)} a month`,
];
const headText = (parts: HeadPart[]) =>
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
function buildSlides(spend: number) {
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
      /* Sam: the button here should be "show me how" and transition onward. */
      next: "Show me how",
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
      line: "Or pay full price on a $10+ order and get $5 credit added to your account. Points on everything.",
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
      line: "Everything earns points. 15% off doesn't include alcohol.",
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

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * DEV ONLY: `?slide=<id>` opens the deck on that slide, paused.
 *
 * The deck can only be walked by tapping, and slide 0 holds for input, so no
 * headless capture could ever reach slide 4 — every desktop screenshot of this
 * route was of the first slide, and the other eight shipped looked-at only in
 * the pane. Same seam as `?seats=` in model/seats.ts: gated on
 * `import.meta.env.DEV`, so the query string does nothing in a production
 * build. The ids are the slides' own, read from the builder rather than
 * retyped. Paused, because a screenshot of a slide that advances itself is a
 * screenshot of the wrong slide.
 */
const SLIDE_IDS = buildSlides(0).map((s) => s.id);
const devSlide = (): number | null => {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("slide");
  if (id === null) return null;
  const n = SLIDE_IDS.indexOf(id);
  return n >= 0 ? n : null;
};

export default function How() {
  const cta = useReserveCta();
  const start = devSlide();
  const [i, setI] = useState(start ?? 0);
  const [paused, setPaused] = useState(start !== null);
  // Shared with the pitch and the checkout. The deck used to keep its own copy,
  // so a reader who told it $100 here met $300 and a different savings figure
  // three inches above a charge row on /reserve. See spendStore.ts.
  const [spend, setSpend] = useSpend();
  const reduced = usePrefersReducedMotion();
  const navigate = useNavigate();

  const slides = useMemo(() => buildSlides(spend), [spend]);
  const slide = slides[i];
  const last = i === slides.length - 1;
  const Scene = SCENES[slide.id];
  const s = illustrate(spend);

  /* ══ THE WAY OUT GOES WHERE SHE CAME FROM ═════════════════════════════════
     Sam, 13 Sep 2026: the top-left arrow "would take me back to the home page
     or wherever I was before clicking into the animation."

     So it is history, not a hard link to "/". The deck is reachable from the
     pitch AND from two links at the foot of /reserve, and a checkout reader who
     opens the walkthrough should land back on the checkout, not be dumped at
     the top of the pitch with their place lost.

     THE FALLBACK IS NOT OPTIONAL. `navigate(-1)` on a tab that opened /how
     directly — a shared link, a refresh, a bookmark — leaves the app entirely
     or does nothing at all. React Router keeps an `idx` on history state which
     is 0 for the first entry in this session, so that is the test for "is
     there anywhere of ours to go back to". */
  const leave = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === "number" && idx > 0) navigate(-1);
    else navigate("/");
  }, [navigate]);

  const go = useCallback(
    (n: number) => setI(Math.min(Math.max(n, 0), slides.length - 1)),
    [slides.length],
  );

  /* ══ BACK TO THE QUESTION, FROM THE ANSWER ════════════════════════════════
     Sam, 14 Sep 2026: "we shouldn't show the list of spend selections here, I
     think instead we'd want to show the amount that was selected, and if I
     click on that amount it'd take me back to the slide where I can select my
     spend."

     So the value slide no longer carries a second copy of the control; it
     carries the chosen figure as a button, and this is where the button goes.
     Found by id rather than assumed to be 0 — the order of `buildSlides` is
     data. Pauses on the same reasoning as the Back arrow: a reader who has
     turned the deck around has taken it over, and the spend slide holds for
     input regardless. */
  const toSpend = useCallback(() => {
    setPaused(true);
    go(slides.findIndex((s) => s.id === "spend"));
  }, [go, slides]);

  // A hidden tab suspends autoplay — otherwise she returns to a deck that ran
  // to the end without her.
  /* ══ WHICH WAY THE DECK JUST MOVED ════════════════════════════════════════
     The indicators animate differently forward and back, so the rail has to
     know. A ref for the previous index rather than deriving it inside the
     handlers: autoplay advances through `setI(n => n + 1)` and never touches a
     handler at all, so direction has to be observed from `i` itself or the
     timed advances would all read as "no direction". */
  const prevIndex = useRef(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  useEffect(() => {
    if (i === prevIndex.current) return;
    setDir(i > prevIndex.current ? "fwd" : "back");
    prevIndex.current = i;
  }, [i]);

  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  // Autoplay never finishes the deck: it stops AT the closing step rather than
  // dismissing itself, and one manual advance ends it for good. It also never
  // runs on a slide that holds for input.
  /* ONE EXPRESSION, READ BY THE TIMER AND BY THE FILL. The reason the old
     progress bar lied is that the two were separate: the fill's condition was
     re-typed in JSX and drifted from the timer's. Now a fill can only ever be
     on screen when a timeout is genuinely running. */
  const autoplaying = !reduced && !paused && !last && !hidden && !slide.hold;

  useEffect(() => {
    if (!autoplaying) return;
    const t = setTimeout(() => setI((n) => n + 1), slide.dwellMs);
    return () => clearTimeout(t);
  }, [i, autoplaying, slide.dwellMs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* The close's card takes a name now (Sam, 14 Sep 2026). A space typed
         into it is a space, not "next slide"; Enter and Escape are the
         field's own. Nothing else on the deck takes text. */
      if ((e.target as HTMLElement | null)?.closest?.("input,textarea")) return;
      // preventDefault on Space: without it the key advanced the slide AND
      // scrolled the document in the same frame.
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        if (e.key === " ") e.preventDefault();
        go(i + 1);
      }
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go, leave]);

  /* ══ SWIPE ════════════════════════════════════════════════════════════════
     There was no gesture at all: on a phone the only ways forward were the
     button and a 3px progress mark.

     ON THE STAGE, NEVER ON THE SHEET, and `paused` is set only on a RECOGNISED
     COMPLETED swipe — never on pointerdown. A pointerdown handler here is the
     exact bug that was removed from the container: slide 0 holds for input, so
     the reader's first gesture is unavoidable, and `paused` is one-way. */
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    // A press that begins on a control is that control's, not the deck's.
    if ((e.target as HTMLElement).closest("button,a,input,[role='group']")) return;
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = swipe.current;
    swipe.current = null;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) < 48 || Math.abs(dy) > 40) return;
    // Same exception the Next button applies: answering the holding slide is
    // not taking the deck over.
    if (!slide.hold) setPaused(true);
    go(dx < 0 ? i + 1 : i - 1);
  };

  /* ══ BACK A SLIDE ═════════════════════════════════════════════════════════
     Sam, 13 Sep 2026: "can I have a back arrow next to the 'next' button, on
     the left — this would take me back a slide."

     DISABLED ON SLIDE 1, NOT HIDDEN. There is no previous slide there, and
     hiding it would hand Next the whole row on step 1 and then shrink it on
     every step after — the button would change width under the reader's thumb
     at the one advance that is guaranteed to happen. Disabled keeps the row's
     geometry fixed for the whole deck.

     It renders on the close too, which had no visible way back at all: the
     progress marks, ArrowLeft and a right-swipe all worked there, and all
     three are invisible on a phone. */
  const stepBack = (
    <button
      type="button"
      className="how-prev"
      disabled={i === 0}
      aria-label={i > 0 ? `Back to step ${i}: ${slides[i - 1].headline}` : "No previous step"}
      onClick={() => {
        setPaused(true);
        go(i - 1);
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="m14.5 5.5-7 6.5 7 6.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  return (
    /* NO PAUSE HANDLER ON THE CONTAINER. It used to carry
       onPointerDown={() => setPaused(true)}, and `paused` is never cleared —
       so the first tap anywhere killed autoplay for the rest of the deck. The
       first tap is unavoidable: slide 0 holds for input and cannot be left
       without one. Every dwellMs and the whole progress-fill animation were
       therefore tuned for a playback mode no touch user ever saw. Pausing now
       happens only where a deliberate manual advance happens: the Next button,
       the progress marks, and a completed swipe. */
    <div className="how" data-slide={slide.id}>
      <header className="how-top">
        {/* The way OUT, and only that. Stepping between slides lives beside
            Next in the foot, where Sam asked for it — so this control keeps one
            meaning at every step instead of changing what it does at step 2. */}
        <button type="button" className="how-back" onClick={leave} aria-label="Leave the walkthrough">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="m14.5 5.5-7 6.5 7 6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {/* REVERTED to the chrome row, 13 Sep 2026 — see the note in how.css.
            Flush against the sheet's top edge the tracks read as a rendering
            seam rather than as indicators. The countdown fill went with that
            layout and can return here on request. */}
        <ol className="how-progress" data-dir={dir}>
          {slides.map((sl, n) => (
            <li key={sl.id}>
              <button
                type="button"
                className="seg"
                aria-label={`Step ${n + 1}: ${sl.headline}`}
                aria-current={n === i ? "step" : undefined}
                onClick={() => {
                  setPaused(true);
                  go(n);
                }}
              >
                {/* ══ THE COUNTDOWN FILL, BACK ON REQUEST ══════════════════
                    Sam, 13 Sep 2026: "I need to be able to see the carousel
                    indicators animating as it gets closer to moving to the next
                    slide."

                    This existed once and came out on 13 Sep with the flush rail
                    — how.css records that it went WITH that layout rather than
                    on its own merits, and that "a 20px current mark is enough to
                    fill legibly" when it is wanted again. It is wanted again.

                    THREE ATTRIBUTES, THREE JOBS, and they are separate on
                    purpose. `data-state` is position, unchanged. `data-run`
                    arms the fill and appears only where a next slide is
                    actually coming. `data-paused` freezes it IN PLACE — if
                    pausing simply dropped `data-run`, the rule would stop
                    matching and the fill would snap back to empty, which reads
                    as the deck resetting rather than waiting.

                    The animation restarts because the attribute is added to a
                    node that did not have it, which is when CSS starts an
                    animation — the same mechanism `segHandoff` already uses two
                    rules above. No key, no remount. */}
                <i
                  data-state={n < i ? "done" : n === i ? "now" : undefined}
                  data-run={
                    n === i && !last && !slide.hold && slide.dwellMs > 0
                      ? ""
                      : undefined
                  }
                  data-paused={n === i && !autoplaying ? "" : undefined}
                  style={
                    n === i
                      ? ({ ["--dwell" as string]: `${slide.dwellMs}ms` } as React.CSSProperties)
                      : undefined
                  }
                />
              </button>
            </li>
          ))}
        </ol>
        {/* Keyed on `i` so React replaces the node and its entrance replays.
            Without the key it is the same element with new text, and a CSS
            animation on an element that already exists does not re-run. */}
        <p className="how-count" aria-hidden="true" key={i}>
          {/* The slash is its own element so it can take its own ink — as a
              bare text node it inherited the figures' colour and weight and
              fused with them into what looked like struck-through text. */}
          <b>{i + 1}</b>
          <i>/</i>
          {slides.length}
        </p>
      </header>

      {/* OUTSIDE the keyed stage, so it is not remounted, and carrying only the
          step string. A live region wrapped around the whole dock re-reads the
          headline, the line, the timing and "Next, button" on every tick;
          polite announcements queue, so a screen-reader user falls
          progressively further behind the visual deck. */}
      <p className="how-sr" role="status" aria-live="polite">
        {`Step ${i + 1} of ${slides.length}: ${slide.headline}`}
      </p>

      {/* The mini card (the spine) is pulled for now, at Sam's call. The
          component stays in TapInCard.tsx — built, verified, one line to
          restore above this comment. */}

      {/* Keyed so every scene mounts fresh and replays its choreography.

          NO FIXED ART FRAME. `.scene-art` used to be `min-height:150px` with
          bottom-aligned contents inside a stage that centred itself, which
          forced every composition into a slot: the scene was 127px of a 612px
          stage and 57% of the stage was empty. The stage now packs to the
          bottom and the copy block carries a floor, so the headline's top edge
          and the art's bottom edge land at the same y on all seven slides —
          by construction, with no JS. */}
      <div
        className="how-stage"
        key={slide.id}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <div className="scene-art">
          {Scene ? <Scene spend={spend} setSpend={setSpend} /> : null}
        </div>

        {last || slide.id === "value" ? (
          /* ══ §7, ASSEMBLED IN ONE PLACE ══════════════════════════════════
             Three live breaches closed here, all of them measured:

             1. `--fig` is ONE custom property read by the figure AND by the
                condition-plus-disclaimer. §7 makes type size part of the rule,
                and a shared variable is the only construction in which the two
                cannot drift. Today the figure is 26px --ink-1 and "An
                illustration, not a quote." is 15px --ink-3.
             2. THE CONDITION AND THE DISCLAIMER ARE ONE BLOCK, one size, one
                ink. layout.css:68-71 records this as a decision and
                savings.ts's own docstring says the condition "is not a caveat
                on the claim — it IS the claim". Six students asked "$152.50 off
                WHAT?" and none could find the answer. They do not get split.
             3. MONTH ONE IS STATED. `firstMonthUsd` is computed at
                savings.ts:154 and was rendered nowhere. §7: both months are
                stated, not just the steady one — a stranger is deciding about
                month one.

             NOT RENDERED, deliberately: `s.basis`. It is produced and it is
             the honest answer to "measured how?", but at the $150 default it
             reads "About 10 visits of $15, across 3 places. 50% of it alcohol,
             which only the 15% skips." — printing "50% of it alcohol" to a
             reader who was asked about coffee and lunch four slides ago, on the
             one screen carrying a price and a button. It also partly reverses
             Sam's 12 Sep "simplify the calculator significantly — information
             overload", which is why month one and the basis went behind the
             pitch's Drill. §7 requires both months STATED, not both at rest.
             Sam's call, flagged, not taken here. */
          <div className="scene-copy">
            <h1 className="scene-head is-figure">
              {slide.id === "value"
                ? /* The spend figure is the way back to the question — see
                     valueHead above. Set in the headline's own type, so the
                     sentence still reads as one sentence with one word in it
                     that is hers to change. */
                  valueHead(spend, s.steadyUsd).map((p, k) =>
                    typeof p === "string" ? (
                      <Fragment key={k}>{p}</Fragment>
                    ) : (
                      <button
                        key={k}
                        type="button"
                        className="how-spend tnum"
                        onClick={toSpend}
                        aria-label={`${p.spend} a month, change what you spend`}
                      >
                        {p.spend}
                      </button>
                    ),
                  )
                : slide.headline}
            </h1>
            <p className="close-say">
              {s.condition} {s.disclaimer}
            </p>
            {/* MONTH ONE IS NO LONGER STATED HERE. Sam, 14 Sep 2026, on the
                close: "there's too much text here, I think we keep it pretty
                simple." §7 wants both months stated somewhere in the flow, and
                they are — the pitch's savings drill prints the first-month
                figure (SavingsSlider.tsx) — so the close keeps the claim and
                its condition and nothing else. */}
          </div>
        ) : (
          <div className="scene-copy">
            {/* §8: on the slide, in the slide's own type — so the tag lives
                INSIDE the headline's line box. As a row above it, it was 11px
                --ink-2 over a 26px --ink-1 head: 42% of the claim's size, one
                ink step dimmer, and a 31px lurch on two of seven advances
                because it sat in the copy flow. */}
            <h1 className="scene-head">
              {slide.headline}
              {slide.tag ? <span className="scene-tag">{slide.tag}</span> : null}
            </h1>
            <p className="scene-line">{slide.line}</p>
          </div>
        )}
      </div>

      {/* Sticky and opaque. On a viewport where everything fits this does
          nothing; on a short one the seat line, the charge line and Reserve
          stay reachable while the §7 block scrolls behind them. Never animated:
          `animation … both` on a pressable control parks its transform
          permanently and kills the press response for good. */}
      <footer className="how-foot">
        {last ? (
          <>
            {/* ══ PRICING AND DISCLOSURES LIVE AT CHECKOUT ═════════════════
                Sam, 14 Sep 2026: "there's too much text here, I think we keep
                it pretty simple, we can add all of the pricing info and
                disclosure stuff at checkout."

                The seat sentence (§2), the grandfathering line and the charge
                line all stood here on the 14th — each added to close a real
                misreading — and together they were a foot of small print under
                a deck that had just spent eight slides showing rather than
                telling. All three are printed on /reserve, beside the rows, the
                consent and the button, which is where §4 wants them. The close
                keeps the timing row every other slide has, minus the skip link:
                the button beside it IS the price. */}
            <p className="how-when">Opening {launchWindow}</p>
            {/* Measure the card the instant before the route change takes it
                away; the checkout picks it up from there. */}
            <div className="how-nav">
              {stepBack}
              <Link
                className="action"
                to={cta.to}
                onClick={() => stashCardOrigin(document.querySelector(".sc-close .tcard"))}
              >
                {cta.label}
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* ══ A WAY OUT OF THE WALKTHROUGH ═══════════════════════════════
                Sam, 13 Sep 2026: "There should be a button to skip the
                animations so I don't have to go through that if I'm impatient
                and just want to reach the end screen."

                Named for its destination, not for what it refuses. "Skip" on
                its own asks the reader to guess where they land; the screen
                they want is the one with the price on it, so the control says
                so. It sits beside the timing line rather than beneath the
                primary action, so the deck still has exactly one button that
                looks like a button. */}
            <p className="how-when">
              Opening {launchWindow}
              <button type="button" className="how-skip" onClick={() => { setPaused(true); go(slides.length - 1); }}>
                Skip to the price
              </button>
            </p>
            {/* NOT MAROON. It spent six slides meaning "Next" and then meant
                "$4.99" with the identical object — and on desktop it was the
                largest drawn thing on the page at 670x52, roughly twice the
                painted area of the subject it sat under. Maroon on this route
                is now spent exactly twice: the band she chose, and the action
                that takes money. */}
            <div className="how-nav">
              {stepBack}
              <button
                className="how-next"
                type="button"
                onClick={() => {
                  // Leaving a holding slide is answering its question, not taking
                  // the deck over — so that tap alone does not end autoplay.
                  if (!slide.hold) setPaused(true);
                  go(i + 1);
                }}
              >
                {slide.next ?? "Next"}
              </button>
            </div>
          </>
        )}
      </footer>
    </div>
  );
}
