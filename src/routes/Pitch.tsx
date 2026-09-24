import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "../shell/Panel";
import {
  INVITES,
  rememberInvite,
  recallInvite,
  type InviteId,
} from "../model/invite";
import TapInLogo from "../shell/TapInLogo";
import AppliesTo from "../shell/AppliesTo";
import SavingsSlider from "../shell/SavingsSlider";
import { Drill } from "../shell/Drill";
import VenueMosaic from "../shell/VenueMosaic";
import VenueTicker from "../shell/VenueTicker";
import SiteFoot from "../shell/SiteFoot";
import BenefitCards from "../shell/BenefitCards";
import SeatCapLine from "../shell/SeatCapLine";
import { useReserveCta } from "../shell/useReserveCta";
import SignInBar from "../shell/SignInBar";
import TrialModal from "../shell/TrialModal";
import LiveFeed from "../shell/LiveFeed";
import MonthCalendar from "../shell/MonthCalendar";
import MonthWeeks from "../shell/MonthWeeks";
import { useMedia } from "../shell/useMedia";
import type { MonthPlace } from "../shell/MonthSwitch";
import {
  monthlyToday,
  guarantee,
  GUARANTEE_CONTACT,
  launchWindow,
} from "../model/content";

/**
 * The pitch. Mode: Persuade. It STATES NO CHARGE — the charge rows, renewal
 * timing and consent sentence live only on /reserve.
 *
 * Tense is the thing most easily got wrong: this is a founding PREORDER taken
 * fifteen months before delivery (§1), and the member app is not in this build
 * (§12). Nothing here is written in the present tense about a benefit that
 * begins in Spring 2027.
 */
/** Off for now — see the note at the drill. */
const SHOW_POINTS_DRILL = false;
/** The pitch's month is every Plus place; it asks only how much (§48). */
const EVERY_PLACE: MonthPlace[] = [{ id: "all", label: "All of Blacksburg", scope: "all" }];

export default function Pitch({ invite }: { invite?: InviteId } = {}) {
  /* Points at /in with "View your membership" once Stripe says this
     person already holds one. See shell/useReserveCta.ts. */
  const cta = useReserveCta();
  /* The invitation, from the URL or remembered from earlier this session. */
  useEffect(() => {
    if (invite) rememberInvite(invite);
  }, [invite]);
  const via: InviteId | null = invite ?? recallInvite();
  /* Where the app window opens over, on a desktop (AppLayer). */
  /* ONE VISIBLE "Reserve a founding seat" AT A TIME. The hero carries the real
     action now, and the docked bar carries it again once a reader has scrolled
     past — but both on screen together is two identical maroon controls
     competing for the same tap, which is the decoy shape this build already
     removed from /reserve's desktop. The bar waits until the hero's has left. */
  const heroCta = useRef<HTMLAnchorElement>(null);
  const [past, setPast] = useState(false);
  /* The "try it once" sheet, opened from the hero and from the docked pair.
     Same modal the campaign splash uses; `lit` because this page is dark. */
  const [trial, setTrial] = useState(false);
  /* The calendar rides the mosaic from 1024 and is not mounted below it:
     Sam, 23 Sep 2026, "I think this would be only on desktop" (§21). */
  const desk = useMedia("(min-width: 1024px)");
  useEffect(() => {
    const el = heroCta.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Contract text, never retyped (§2, §7). */

  return (
    <>
      {/* ══ THE ANNOUNCEMENT BAR ═══════════════════════════════════════════
          Sam, 13 Sep 2026: the opening line becomes its own thin bar at the
          very top, square-edged, "almost an announcement bar".

          IT IS PAGE CHROME, NOT A CAPTION, and that distinction is what keeps
          it out of the eyebrow ban: it is full bleed, fixed to the viewport,
          and separated from the hero card by the hairline and the column's own
          gap — it does not sit on the heading the way the caption it replaces
          did. The sentence is REMOVED from the hero rather than repeated;
          stating an opening date twice in one viewport is the same fact
          competing with itself.

          The anatomy is app.css's preview banner verbatim — same --subtle
          fill, same single hairline facing the content, same safe-area
          handling, same fixed-inside-.column trick (.column makes a stacking
          context but not a containing block, so this still goes edge to edge).
          Thinner, because this one carries a sentence and one text control.

          ══ AND IT CARRIES SIGN IN NOW (21 Sep 2026) ═══════════════════════
          The session control used to be a full-width ghost button at the foot
          of the hero, which made the first screenful three stacked pills —
          Get early access, How it works, Sign in — where the rule is one
          filled action per view. A bar at the top of the page is where every
          reference puts "who am I signed in as", it is the one piece of
          chrome that is always on screen, and it costs the hero nothing.

          `.announce-row` and not a second child of `.announce-in`: that one
          is a <p>, the sign-in is a <div> with a portalled sheet inside it,
          and Coffeeholics' bar renders the same `.announce-in` with no
          control at all. The row wrapper is what the pitch adds; the sentence
          keeps its own element and its own metrics. */}
      <div className="announce">
        <div className="announce-row">
          <p className="announce-in">
            {/* A pin on the place: the glyph makes the town read as a location
                at a glance, which is the half a stranger scanning for "is this
                near me" is actually looking for. */}
            <svg viewBox="0 0 24 24" aria-hidden="true" className="ann-pin">
              <path
                d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="10"
                r="2.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
              />
            </svg>
            Opening in Blacksburg, {launchWindow}
          </p>
          {/* Sign in / sign out. The sheet still portals to <body>; only the
              control moved. See shell/SignInBar.tsx. */}
          <SignInBar />
        </div>
      </div>

      <VenueMosaic>
        <Panel className="hero">
          {via ? (
            /* ══ THE INVITATION ═══════════════════════════════════════════
               Two marks and one sentence in place of the lone wordmark. The
               sentence is body type, not a kicker: it is the claim the text
               message made, said once, and the headline beneath is unchanged
               because the offer is. See model/invite.ts. */
            <div className="invite">
              <span className="invite-marks">
                <TapInLogo className="logo" />
                <span className="invite-x" aria-hidden="true">
                  ×
                </span>
                <img
                  className="invite-logo"
                  src={INVITES[via].logo}
                  alt={INVITES[via].alt}
                  decoding="async"
                />
              </span>
              <p className="invite-line">{INVITES[via].line}</p>
            </div>
          ) : (
            /* The wordmark, and the tier beside it (Sam, 15 Sep 2026: "add a
               'plus' chip next to the TapIn logo"). The word alone — the mark
               is already the wordmark's own, so the flag's icon would double
               it. Same chip as the app's venue pages (.plus). */
            <span className="hero-brand">
              <TapInLogo className="logo" />
              <span className="plus hero-plus"><span className="plus-word">PLUS</span></span>
            </span>
          )}
          {/* ══ A RECURRING EVENT IN DOLLARS, NOT AN AGGREGATE ══════════════
              The best-evidenced change available to this page. Atlas & Bartels
              (JCR 2018) — 8 experiments plus a field test on 15,127 visitors —
              found that framing a subscription's value as a RECURRING EVENT
              rather than an aggregate took purchase from 9.9% to 24.5%, and
              first-time visitors (84% of that traffic, which is all of this
              page's) converted 1.3% vs 0.7%, a 77% lift. It held while the
              periodic frame was 13% MORE expensive in aggregate; perceived
              BENEFITS mediated the effect and perceived costs did not.

              And the credit anchors, not the 15%. Chen et al. (JM 2012), a
              16-week alternating-week field experiment: a bonus frame beat an
              economically SUPERIOR discount frame by 73% in volume, and 48% of
              the undergraduates in the same paper could not convert between two
              equivalent percentage frames. 15% of a $12 lunch is $1.80 — a
              percentage hung on a base too small to carry it.

              This replaces "Blacksburg's most rewarding membership.", which the
              research named directly: a superlative carrying no dollar, no event
              and no mechanic. Sam chose that line and then chose this rebuild
              over it; it is one revert away if he wants it back.

              The walkthrough note that used to sit here is kept, because it is
              still the binding constraint on this line: all six students in it
              left believing TapIn wanted them to go out MORE, which a student
              on a budget cannot afford and will not buy. "$5 back" is money
              returned on spending she already does — it does not ask for more. */}
          {/* Rob's VT readers, 14 Sep 2026: "each of your places" is misleading — say
              restaurants and bars. The recurring-event frame stays; the place goes to
              the lead, where "restaurants and bars" has room. */}
          {/* 14 Sep funnel audit, implemented at Sam's word: none of five readers
              could say what TapIn IS from the first screen, and "$5 back" read
              as cashback. The word "membership" now leads, and the credit is
              called what TRUTH calls it. */}
          {/* `.t-hero`, not `.t-display`: the ramp gained a page-H1 step on
              21 Sep 2026 (36 on a phone, 56 from 1024) so the headline and
              the dollar figure stop sitting within a few points of each
              other. Same words. See tokens.css. */}
          <h1 className="t-hero">
            $5 credit every week, at every place you already go
          </h1>

          {/* The other two, and where. ONE line: 37signals' own reporting on
              their winning hero is that adding further explanation beneath it
              performed 22% WORSE, so the fix is the first line, never a stack.

              IT IS NOW THE SAME LINE. Sam, 20 Sep 2026: "this copy should flow
              as if it's a single sentence, while keeping the large header text
              we have now." So the headline lost its full stop and this became
              its continuation rather than a second statement: one sentence,
              set at two sizes. The headline's own words are untouched.

              NO LEADING MARK. This opened with an em dash for one commit, and
              Sam, 20 Sep 2026: "no emdash please they're overused by ai." The
              size change and the line break already say "same sentence,
              continued", so the dash was carrying nothing the layout wasn't. */}
          <p className="t-lead hero-lead">
            restaurants and bars around Blacksburg, plus 15% off and points
            toward rewards.
          </p>
          {/* THE REACH LINE. Sam, 23 Sep 2026: "tapin runs ordering and
              experiences across 100 cities nationwide, plus finally is coming
              to blacksburg" — his figure and his claim, replacing the 14 Sep
              verifiable list of the three live venues. `liveUrl` still drives
              the mosaic's Open links, so the proof moved, it did not go. */}
          <p className="t-compact hero-proof">
            TapIn runs ordering and experiences across 100 cities nationwide,
            and is finally coming to Blacksburg.
          </p>

          {/* ══ THE PLACES, UNDER THE COPY ═══════════════════════════════
              Kiran, 15 Sep 2026. The headline names a benefit; this answers
              "where" with the six photographs instead of a sentence, in the
              slot the two supporting lines used to hold before they moved
              below the actions.

              `rail`, always. The ticker switches to a 7-across grid off a
              VIEWPORT media query at 1280, which is a page-width object — in a
              glass panel it would be seven ~90px tiles. The prop keeps it a
              scrolling rail at every width and keeps the duplicate track that
              makes the scroll seamless. */}
          <div className="hero-rail">
            <VenueTicker rail />
          </div>

          {/* ══ PRICE, ACTION AND REFUND, IN ONE BLOCK ═══════════════════════
              The price was the smallest type in this panel, at 13px. Every
              incumbent page examined — Uber One, DashPass, Walmart+, Prime
              Student, Instacart+, Costco, ClassPass — puts what you get, what it
              costs and the action in the first screenful; NN/g's eyetracking
              (130,000+ fixations, 120 participants) puts 57% of viewing time
              above the fold and readers gone in 10-20 seconds.

              The refund joins them rather than sitting four screens down: on an
              advance sale it is what makes prepaying rational at all (Xie &
              Shugan, Marketing Science 2001), and Suwelack et al. (J. Retailing
              2011) find its effect comes from how unconditional it READS —
              position and size, not existence. Both strings below are the
              contract's own. */}
          <div className="hero-buy">
            {/* THE PRICE IS THE DISPLAY MOMENT. `.t-figure` — the ramp's
                dollar step — because the thing this page is selling is a
                number, and it was set at 32px between a 36px headline and a
                17px lead, which is a price mentioned rather than stated. */}
            <p className="hero-price">
              <b className="tnum t-figure">${monthlyToday.toFixed(2)}</b>
              <span>deposit</span>
            </p>
            {/* NO SENTENCE UNDER THE FIGURE. It carried "Your first $10+ order
                earns $5 credit, more than the deposit" — Sam, 20 Sep 2026:
                "let's remove the 'first $10 order' thing it's too
                complicated." The $10 floor is still stated where it is a
                condition, on the credit's own benefit row; it was a second
                number in the one block that already has three. */}
            {/* §2: the only seat sentence any surface may print, from the
                constant, never typed — rendered by the one component that
                strikes the after-price (Sam, 14 Sep 2026). */}
            <p className="t-compact hero-seat">
              <SeatCapLine />
            </p>
            {/* NO LOCKED-RATE SENTENCE HERE. Distilled 14 Sep 2026 (Rob's readers:
                "too much text"): the seat line already carries both prices, and
                the lock-in promise is stated on /reserve, where the decision is. */}
            {/* ══ THE WALKTHROUGH IS OPTIONAL AGAIN ═══════════════════════════
                Rob's Virginia Tech readers, via Sam, 14 Sep 2026: "remove the
                requirement to go through the animation flow. just have the
                primary button be get the early bird special, and a secondary,
                but more prominent button, called 'here's how it works'".

                So the primary goes straight to the price, and the deck sits
                beside it. This reverses the 13 Sep routing (primary → /how,
                "Skip to the price" as the escape); the deck itself is
                unchanged and its own close still lands on /reserve.

                ══ AND THEN OUT OF THE HERO ENTIRELY, 21 Sep 2026 ═══════════
                The deck's door was `.action.action-ghost` here, then a 16px
                link with a chevron, and it is now neither: `How it works`
                lives in the savings panel, which is the place a reader asking
                how it works has already stopped at. The slot it leaves is the
                trial's — see the note on the control below. */}
            <div className="hero-actions">
              <Link
                className="action hero-cta"
                to={cta.to}
                state={cta.state}
                ref={heroCta}
              >
                {cta.label}
              </Link>
              {/* ══ AND IT OPENS THE TRIAL, NOT THE DECK, 21 Sep 2026 ═══════
                  Sam: "can we have 'get early access' on this main splash, and
                  a similar 'try it once' modal like what we had on the
                  coffeeholics specific page."

                  The walkthrough is not lost — `How it works` still sits in
                  the savings panel (`.save-how`), which is where a reader who
                  wants the mechanism is already looking. What the hero's
                  second slot gains instead is the only thing on this page a
                  stranger can do today: one free order at a real counter,
                  before the membership exists. A door beats a description in
                  the slot beside the money control.

                  The house ghost pill at every width (Sam, 23 Sep 2026: "I
                  liked the larger try it once free button for the page
                  header"), the docked bar's `.sticky-alt` twin; a <button>
                  because it opens a dialog rather than navigating. */}
              <button
                type="button"
                className="hero-try"
                onClick={() => setTrial(true)}
              >
                Try it once for free
              </button>
              {/* The deck's door, back in the hero. It left on 21 Sep when
                  Try it once took its slot; Sam, 23 Sep 2026: "I'd like to
                  bring that back, it just wouldn't be one of the focuses." A
                  text link, never a third pill: the same treatment as the
                  savings panel's, under the pair. */}
              <Link className="hero-how" to="/how">
                How it works
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m9 5 7 7-7 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
            {/* No refund line in the hero (audit, 14 Sep 2026): it is stated in
                the checkout sheet before any charge, where it decides something. */}
          </div>

          {/* ══ THE SIX-COLLAR ROW IS GONE, 21 Sep 2026 ═════════════════════
              It was a desktop-only strip of the same six marks the rail above
              it already carries, in the same panel — the places stated twice,
              once as photographs with names and once as bare collars, with a
              hairline under them to separate a third control that has also
              left (`SignInBar`, now in the announcement bar). Sam: the page
              "still feels a bit AI generated", and a second, weaker copy of a
              row that is already there is how that happens.

              The venue marks themselves are not lost: `VenueTicker` shows
              three of them in the hero and all eight in the places section.
              Nothing else referenced `.hero-marks`; its rules go with it. */}
        </Panel>

        {/* ══ THE CALENDAR, OVER THE PHOTOGRAPHS (§21, 23 Sep 2026) ══════════
            Sam, on the canvas's calendar: "wondering if you could implement
            that on the main LP", with "offerings from other locations". The
            headline, shown happening: a month of real orders at four places,
            each earning the week's credit, against one membership. Centred
            in the mosaic, an object set down on the venues rather than one
            cropped at the corner (Sam, at 1440: "the placement here doesn't
            sit with me quite right"). Desktop only. A sibling of the hero
            panel, so the copy column is untouched. */}
        {desk ? <MonthCalendar places={EVERY_PLACE} /> : null}
      </VenueMosaic>

      {/* The label carries "at Plus places" so the badge on the venue tiles has
          a meaning on the page it appears on — it was stamped on five tiles and
          defined nowhere except inside a disclosure. */}
      {/* ══ A SECTION, NOT A PANEL ═══════════════════════════════════════════
          The benefits are photograph cards now (docs/POLISH-2026-09-21.md §7),
          and the cards ARE the boxes — a panel around them is a card inside a
          card, which is the storefront's one hard rule. So this block comes out
          onto the field with its heading on the ground: `.pitch-get`, an open
          section that sets its own intervals at both widths.

          A HEADING, NOT A LABEL. `Panel`'s own `label` prop renders
          `.t-caption` — 11px tracked caps — which is the list-label role, and
          four of those down one page is the eyebrow tic the 21 Sep 2026 pass
          removed. Same string, set as the heading it always was. */}
      {/* ══ THE LIGHT ROOM UNDER THE DARK HEADER (23 Sep 2026) ══════════════
          Sam: "this entire page needs to go light mode instead of dark. We can
          have a dark mode header, but the stuff beneath needs to be more
          legible." The hero band above stays the dark world; everything from
          here to the foot sits on the light ramp. One attribute does it —
          styles/light.css inverts the nine tokens on this subtree, and
          `.pitch-lit` (pitch.css) paints the ground edge to edge and to the
          page's foot. docs/POLISH-2026-09-21.md §14. */}
      <div className="pitch-lit" data-lit="">
        {/* THE MONTH ON A PHONE, RIGHT UNDER THE HEADER (Sam, 23 Sep 2026: "it'd
            make sense to include this on mobile too, right below the header on
            BOTH pages"). The same calendar the desktop sets over the mosaic,
            first thing on the light ground. */}
        {!desk ? (
          <div className="mc-phone">
            <MonthWeeks places={EVERY_PLACE} />
          </div>
        ) : null}
        <section className="pitch-get">
          <h2 className="t-section pitch-get-head">What you get</h2>
          <BenefitCards />

          {/* The transfer programme. Behind a tap because it is the one benefit
              with a catch in it, and a catch in a headline is noise while a catch
              in an answer is candour. NO RATIO: the programme is not built, and a
              rate published today is a rate a member holds Sam to in 2027. §10
              forbids naming a brand as a destination, so these stay categories. */}
          {/* THE POINTS DRILL IS OFF THE PAGE. Rob's readers, 14 Sep 2026: "too much
              text, too busy" — and this answered a question about an unbuilt
              transfer programme under a panel about live benefits. Retained
              behind a flag with the deck's transfer plate. */}
          {SHOW_POINTS_DRILL ? (
            <div className="panel-drill">
              <Drill summary="What points are worth">
                <p className="t-compact">
                  A point is worth about a cent at the place you earned it, and
                  worth most spent there. Moving a balance into one TapIn
                  balance, good anywhere on the network or out to gift cards and
                  airline miles, is coming.
                </p>
              </Drill>
            </div>
          ) : null}
        </section>

        {/* ══ WHERE IT WORKS, AS A TICKER ═══════════════════════════════════════
            Sam asked for a carousel rather than the 2x2 grid: auto-scrolling,
            swipeable, "more like a ticker", with a View all door into the app
            preview's own list of every place.

            The grid it replaces was itself a fix for a failed rail — six tiles
            shown two at a time behind a gesture with no affordance. The ticker
            answers that objection rather than reopening it: it moves on its own,
            so a reader who does nothing still sees all eight go past, and the
            headline's promise is now delivered by the door instead of by
            rendering the whole list at once. */}
        {/* NOT A PANEL. The tiles become cards here, and TapIn's own card rule —
            carried over from the storefront — is that a card never sits inside a
            card. So the rail comes out onto the field with a label above it,
            which is also how the storefront ships every horizontal rail it has.
            It buys the ticker the full width as a side effect. */}

        {/* ══ MEMBERS-ONLY NIGHTS IS OUT ═══════════════════════════════════════
            Sam, 13 Sep 2026: "let's get rid of this for now too."

            RETAINED, NOT DELETED — the same treatment the three cut scenes get in
            Scenes.tsx. `NightScene` and the whole `.nights` block in pitch.css
            stay built and one JSX block from returning; "for now" is his word and
            a feature tagged Coming is a feature that comes back. Nothing else on
            the page referenced it.

            THE TWO-COLUMN PAIR WENT WITH IT, because a 1.55:1 grid with one child
            in it is a grid pretending to be a layout. "What it saves" takes the
            page's own measure again and the funnel is unchanged: the wide blocks
            run wide, and the page still narrows at the closing. */}

        {/* ══ THE DECISION, AS ONE MOVEMENT ═══════════════════════════════════
            Sam, 14 Sep 2026: "desktop still feels super incomplete, only the top
            half seems like it was touched."

            He is right, and the measurements said so plainly. Below the hero at
            1440 every block was a wide, SHORT strip — the three benefit cards
            were 87px tall across 1,278px, the plans 97px across 886, the app link
            46px, the close 88px. Seven ribbons stacked down a page. Widening a
            phone component is not designing for desktop; it is the same component
            with more air on either side of it.

            What the figure and the plans have in common is that they are the same
            question — what do I get, and what does it cost — asked twice and
            answered in two separate boxes 40px apart. On a phone that is the only
            option. At 1,280px they are one composition: the argument on the left,
            the choice and the action on the right, sharing a top edge.

            `display:contents` below 1024, so the phone keeps the identical DOM
            order, gap and rendering it had before this wrapper existed. */}
        {/* ══ THE DECISION AND THE CLOSE, ONE WRAPPER (21 Sep 2026) ═══════════
            They were two — `.pitch-decide` and `.pitch-close` — and on a phone
            both are `display:contents`, so the split only ever meant anything
            at 1024, where it put the figure in one band and the promise in
            another. The plan pairs them: the savings panel at 60% and the
            guarantee as an open statement at 40%, sharing a top edge, so the
            close is one movement rather than two stacked sections. One wrapper
            is what that grid is; the phone's DOM order, gaps and rendering are
            unchanged because `display:contents` never cared which div it was. */}
        <div className="pitch-decide">
          {/* ══ THE SCOPE, BESIDE THE FIGURE IT QUALIFIES (§19, 23 Sep 2026) ═════
              Sam, on the close at 1440: "use /impeccable redesign for this
              desktop section." Six plates across the left of the grid, the
              savings panel under them and the guarantee floating over empty
              ground were three objects at three weights. They are one band now:
              the savings panel on the left, and on the right what it reaches
              over the promise that backs it. The block moved here, not the
              grid: cards → scope → savings → guarantee was already the phone's
              order, so the phone renders exactly as it did. */}
          <div className="pitch-scope">
            {/* The connective tissue the panel was missing: without the label the
                two icon rows read as unrelated grids. Shared with the checkout.
                (A "social passport" panel stood above this for an hour on 15 Sep
                2026; Sam: "I don't want to pitch the whole idea of the social
                passport. I just want the app preview to feel like one." It lives
                in the app now — routes/app/Tonight.tsx and the venue pages.) */}
            <AppliesTo />

            {/* NOT BEHIND A TAP ANY MORE. §10 flatly bans any claim that alcohol is
                discounted, and "Drinks" sitting in a strip under "15% off" makes
                exactly that claim by layout. The correction was hidden behind a
                disclosure titled "Where and when" — which answered a question
                nobody was asking — and students walked away from this panel
                believing they got 15% off a Friday night. One of them said she
                would have reserved on that belief. The sentence is unchanged; it
                has simply stopped being optional to read. */}
            {/* ══ WHAT ALCOHOL DOES AND DOES NOT TOUCH ═════════════════════════
                Sam, 14 Sep 2026: "credit can be used towards alcohol, it's just
                that 15% off can't be applied towards alcohol. Points can be earned
                on alcohol, redeemed for generic credit, then used towards alcohol
                purchases. So we need to include that any credit someone has can be
                used towards alcohol." This reverses his 11 Sep decision recorded in
                docs/virginia-alcohol-research.md, whose cautions (no 9pm–2am use,
                never market the credit as meant for drinks, age-gate the spend)
                are flagged there and not resolved here. Stated once, as scope, in
                body type, under the benefits it qualifies — not as a headline. */}
            <p className="t-compact pitch-scope-note">
              Only the 15% off skips alcohol. Credit can be used on anything.
            </p>
          </div>

          <Panel className="pitch-save">
            <h2 className="t-section panel-head">What you&rsquo;d save</h2>
            <SavingsSlider />
            {/* The door to the deck, under the figure it explains (Sam, 15 Sep
                2026: "can we add a how it works button to this section?"). The
                same control the hero carries, so the page has one way of saying
                it — and the hero's is a 16px text link now, so this one is too.
                Left as a full-width ghost button it would have been the third
                slab in a view that also carries the docked bar's pair. */}
            <Link className="save-how" to="/how">
              How it works
            </Link>
          </Panel>

          {/* ══ THE TWO PLANS, ON THE PAGE THAT ASKS FOR THE DECISION ════════════
              Sam, 13 Sep 2026, from a desktop pattern review: Epidemic Sound, Oku,
              Mailchimp and TravelPerk all put their plan cards on the landing page.
              This pitch showed neither plan anywhere — a reader met "Monthly or 3
              months?" for the first time on the page that takes money, having been
              asked to decide on a single figure that was only ever the monthly one.

              THESE ARE NOT CONTROLS. Nothing here is selectable: the choice is made
              at /reserve, where switching a plan also switches the charge rows, the
              consent sentence and the terms together. A picker here would either
              have to carry all of that (§4) or set a state the next page does not
              read — which is a control that looks like it did something and did
              not. They are read-only cards, and the one action is the same action
              the rest of the page has.

              IT SURVIVES THE SOLD-OUT FLIP because it renders whatever `PLANS`
              holds: struck price and saving while the founding round is open, plain
              standard price after. */}
          {/* THE PLAN CARDS LEFT THIS PAGE. Sam, 15 Sep 2026: "We can remove
              this from the homepage. It's going to be on the landing page and on
              the checkout page anyway, so I think we save it for the checkout
              page." The hero states the entry price and the seat line; the three
              plans are chosen on /reserve, where the price is paid. */}

          {/* ══ THE GUARANTEE, OUT OF ITS BOX ═══════════════════════════════════
              It was a panel: 88px of --card holding 42px of text, one more
              rounded rectangle at the end of a page of rounded rectangles, at
              the point where the page should be at its most substantial. It is
              the strongest sentence here and the signature of the offer, so it
              is now an open statement on the field — a hairline above it, the
              shield at 28px, the promise at 22px — beside the figure it
              guarantees rather than under it. `pitch-guarantee` is what takes
              the panel dress off; `.closing` stays, because layout.css flexes
              `.closing:has(.guarantee-tile)` into the shield-and-body shape and
              /reserve states the same promise with the same markup.

              No label here. Every other label heads a grid or a list; this one
              would sit directly above a sentence set larger than it.

              The seat line has moved to the hero. It is still printed exactly
              once on this surface, still in body type, still with no clock on
              it — and the guarantee is stronger standing alone than it was
              carrying a price underneath it. */}
          <Panel className="closing pitch-guarantee">
            {/* THE SHIELD, BACK ON THE LEFT. Sam, 20 Sep 2026: "for the primary
                tapin spot though we can have the guarantee icon next to this on
                the left like we had." /reserve's refund card has carried it all
                along, and layout.css already flexes `.closing:has(
                .guarantee-tile)` into the two-part shape — so this is the same
                markup, not a second version of it, and the two surfaces state
                the promise the same way. */}
            <span className="guarantee-tile" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3.4 5.2 6v5.4c0 4.4 2.9 8.3 6.8 9.6 3.9-1.3 6.8-5.2 6.8-9.6V6L12 3.4Z" />
                <path d="m9.2 12.2 1.9 1.9 3.8-4" />
              </svg>
            </span>
            <div className="guarantee-body">
              <p className="guarantee">{guarantee}</p>
              {/* A person to write to, which the walkthrough named as one of its two
                  sharpest objections: a guarantee with no addressee is a promise with
                  nobody behind it, and the reader most likely to care is the one
                  working out what happens if this goes wrong. Sam's, this session. */}
              <p className="t-compact guarantee-contact">
                <a href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>
              </p>
            </div>
          </Panel>

          {/* THE PAIR INVERTED, 13 Sep 2026. It used to be Reserve (straight to the
              charge) over "See how it works". Sam asked for the walkthrough to sit
              IN the path rather than beside it, so the primary now goes to /how —
              and the secondary becomes the escape hatch instead of the detour,
              which is the half he explicitly wanted kept easy.

              One .action and one slim link, unchanged: two stacked buttons put
              ~140px of bar over the page and layout.css's clearance below is tuned
              to one button's height. */}

          <SiteFoot />
        </div>
      </div>

      {/* ══ THE DESKTOP HEADER ═══════════════════════════════════════════════
          Sam, 13 Sep 2026, after a desktop pattern review: every reference —
          Blue Apron, OpenTable, 7shifts, Square, Epidemic Sound — carries a
          persistent bar with the CTA in it, and this page had NO header element
          at all. Measured: scroll past the hero at 1440 and there was no way to
          buy without scrolling back, because the only other control is a
          phone-shaped bar docked to the bottom of a 900px-tall window.

          IT SHARES THE HERO'S OBSERVER rather than adding a scroll listener.
          `past` already means "the hero's own Reserve has left the screen",
          which is exactly when a second one stops being a duplicate and starts
          being the only one — the same rule the bottom bar has always used, now
          serving a second control.

          IT CARRIES THE PRICE. A bar with only a button asks for a decision
          without restating what it costs; the reference bars that work all keep
          the figure next to the action. DESKTOP ONLY — below 1024 the bottom
          bar is still the right shape and this is `display:none`. */}
      {/* `data-lit`: it only ever docks over the light region, so it takes
          that ground — a white bar with dark ink (light.css). */}
      <div className={`top-cta${past ? "" : " is-away"}`} data-lit="">
        <div className="top-cta-in">
          <TapInLogo className="top-cta-logo" />
          <p className="top-cta-price">
            <b className="tnum">${monthlyToday.toFixed(2)}</b>
            <span>deposit</span>
          </p>
          <Link className="action top-cta-go" to={cta.to} state={cta.state}>
            {cta.label}
          </Link>
        </div>
      </div>

      {/* `lit` inverts the nine tokens on the panel (styles/light.css): the
          modal is light whichever ground it opens over, like every pop-up. */}
      {trial ? <TrialModal lit onClose={() => setTrial(false)} /> : null}

      {/* THE SIMULATED FEED (§34) — invented, and shell/LiveFeed.tsx says so.
          `lit` like the modal above: every pop-up on this dark page is light. */}
      <LiveFeed lit />

      {/* Lit for the same reason as the header bar: it floats over the
          light region, and fades into that ground rather than the dark one. */}
      <div className={`sticky-cta is-pair${past ? "" : " is-away"}`} data-lit="">
        <Link className="action" to={cta.to} state={cta.state}>
          {cta.label}
        </Link>
        {/* The bar carries the same pair the hero does, in the same order —
            a docked control that offers a different second action than the one
            the reader has already seen is two pages of chrome, not one. */}
        <button
          type="button"
          className="sticky-alt"
          onClick={() => setTrial(true)}
        >
          Try it once for free
        </button>
      </div>
    </>
  );
}
