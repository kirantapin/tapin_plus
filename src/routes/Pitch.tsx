import { Fragment, useEffect, useRef, useState } from "react";
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
import { venues, logoField } from "../model/content";
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
          Thinner, because this one carries a sentence and no controls. */}
      <div className="announce">
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
              <span className="plus hero-plus">PLUS</span>
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
          <h1 className="t-display">
            $5 credit every week, at every place you already go.
          </h1>

          {/* The other two, and where. ONE line: 37signals' own reporting on
              their winning hero is that adding further explanation beneath it
              performed 22% WORSE, so the fix is the first line, never a stack. */}
          <p className="t-lead">
            Restaurants and bars around Blacksburg. Plus 15% off and points
            toward rewards.
          </p>
          {/* VERIFIABLE TRUST (14 Sep audit): TapIn already runs ordering at two
                of these places today, and a reader can check that in ten
                seconds. The two addresses are the only two that exist. */}
          <p className="t-compact hero-proof">
            TapIn already runs ordering at{" "}
            {venues
              .filter((v) => v.liveUrl)
              .map((v, k, arr) => (
                <Fragment key={v.id}>
                  <a href={v.liveUrl} target="_blank" rel="noopener noreferrer">
                    {v.name}
                  </a>
                  {k < arr.length - 1 ? " and " : ""}
                </Fragment>
              ))}{" "}
            — see it live.
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
            <p className="hero-price">
              <b className="tnum">${monthlyToday.toFixed(2)}</b>
              <span>deposit</span>
            </p>
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
                beside it as a real button rather than a text link. This
                reverses the 13 Sep routing (primary → /how, "Skip to the
                price" as the escape); the deck itself is unchanged and its own
                close still lands on /reserve. */}
            <div className="hero-actions">
              <Link
                className="action hero-cta"
                to={cta.to}
                state={cta.state}
                ref={heroCta}
              >
                {cta.label}
              </Link>
              <Link className="action action-ghost hero-how" to="/how">
                How it works
              </Link>
            </div>
            {/* No refund line in the hero (audit, 14 Sep 2026): it is stated in
                the checkout sheet before any charge, where it decides something. */}
          </div>

          {/* ══ THE SIX PLACES, IN THE FIRST VIEWPORT ═══════════════════════
              Sam, 13 Sep 2026, after a desktop pattern review. Measured on the
              live page at 1440 before this: the first venue mark was 1001px
              down — below the fold on every laptop — while the page's single
              most checkable claim is WHICH six real businesses this works at.
              Square runs participating-business logos along the bottom edge of
              its hero for exactly this reason.

              MARKS, NOT NAMES. A row of six wordmarks at this size would be six
              illegible strings; the collars are recognisable at 34px and the
              names are one scroll away on the ticker that still carries them.
              DESKTOP ONLY — the phone hero is already the whole first screen
              and has nothing to gain from six more objects in it. */}
          <ul className="hero-marks" aria-label="Where it works">
            {venues.map((v) => (
              <li key={v.id}>
                <span
                  className="collar"
                  data-field={logoField(v.id)}
                  style={{ ["--brand" as string]: v.brandColor }}
                  title={v.name}
                >
                  <img src={v.logo} alt={v.name} decoding="async" />
                </span>
              </li>
            ))}
          </ul>

          {/* Sign in / sign out, under the venue marks. NOT inside
              `.hero-marks`, which is `display:none` below 1024px — this has to
              reach the phone too, where most of the traffic is. */}
          <SignInBar />
        </Panel>
      </VenueMosaic>

      {/* The label carries "at Plus places" so the badge on the venue tiles has
          a meaning on the page it appears on — it was stamped on five tiles and
          defined nowhere except inside a disclosure. */}
      <Panel label="What you get" className="flush">
        <BenefitCards />

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
        <p className="t-compact panel-note">
          Only the 15% off skips alcohol. Credit can be used on anything.
        </p>

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
                worth most spent there. Moving a balance into one TapIn balance
                — good anywhere on the network, or out to gift cards and airline
                miles — is coming.
              </p>
            </Drill>
          </div>
        ) : null}
      </Panel>

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
      <section className="places">
        <p className="t-caption places-label">Where it works</p>
        <VenueTicker />
        {/* §6: absence of the badge is the signal — but a prospect who has never
            used TapIn cannot infer what the absence means, so the badge gets its
            meaning at the point of use rather than two panels later. */}
        {/* Sam, 14 Sep 2026: "places that are added are added to the membership
            and those who purchase don't incur an additional fee." Under the row
            of places, which is where that fact belongs. */}
        <p className="t-compact places-note">
          New places are added to your membership at no extra cost.
        </p>
      </section>

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
      <div className="pitch-decide">
        <Panel label="What you'd save">
          <SavingsSlider />
          {/* The door to the deck, under the figure it explains (Sam, 15 Sep
              2026: "can we add a how it works button to this section?"). The
              same ghost control the hero carries, so the page has one way of
              saying it. */}
          <Link className="action action-ghost save-how" to="/how">
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
      </div>

      {/* ══ THE CLOSE, PAIRED ════════════════════════════════════════════════
          The guarantee was 88px of box holding 42px of text, and the app link a
          46px hairline above it — two of the thinnest things on the page, one
          after the other, at the point where the page should be at its most
          substantial. They are a pair: one is the promise, the other is the
          proof you can go and look at. Side by side they read as a close. */}
      <div className="pitch-close">
        {/* No label here. Every other label heads a grid or a list; this one would
            sit directly above a heading, and a kicker over a heading earns
            nothing back. The sentence is the strongest thing on the page. */}
        {/* The seat line has moved to the hero. It is still printed exactly once
            on this surface, still in body type, still with no clock on it — and
            the guarantee is stronger standing alone than it was carrying a price
            underneath it. */}
        <Panel className="closing">
          <p className="guarantee">{guarantee}</p>
          {/* A person to write to, which the walkthrough named as one of its two
              sharpest objections: a guarantee with no addressee is a promise with
              nobody behind it, and the reader most likely to care is the one
              working out what happens if this goes wrong. Sam's, this session. */}
          <p className="t-compact guarantee-contact">
            <a href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>
          </p>
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
      <div className={`top-cta${past ? "" : " is-away"}`}>
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

      <div className={`sticky-cta is-pair${past ? "" : " is-away"}`}>
        <Link className="action" to={cta.to} state={cta.state}>
          {cta.label}
        </Link>
        {/* A button, not a text link: Rob asked for the deck to be "secondary,
            but more prominent". */}
        <Link className="sticky-alt" to="/how">
          How it works
        </Link>
      </div>
    </>
  );
}
