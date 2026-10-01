import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "../shell/Panel";
import TapInLogo from "../shell/TapInLogo";
import { Drill } from "../shell/Drill";
import VenueMosaic from "../shell/VenueMosaic";
import VenueTicker from "../shell/VenueTicker";
import SiteFoot from "../shell/SiteFoot";
import SignInBar from "../shell/SignInBar";
import TrialModal from "../shell/TrialModal";
import ScopeLine from "../shell/ScopeLine";
import AppliesTo from "../shell/AppliesTo";
import BenefitCards from "../shell/BenefitCards";
import RefundPlate from "../shell/RefundPlate";
import { PlusBolt } from "../shell/PlusFlag";
import BenefitFigures from "../shell/BenefitFigures";
import { hasMenu, itemsFor } from "../model/menu";
import { POINTS_PER_DOLLAR } from "../model/order";
import { useTrialLink } from "../shell/useTrialLink";
import { useReserveCta } from "../shell/useReserveCta";
import { useSeatsLeft } from "../model/presale";
import { SEAT_CAP } from "../model/seats";
import { BENEFIT } from "../model/savings";
import {
  FOUNDING_OPEN,
  GUARANTEE_CONTACT,
  benefitScopeLine,
  launchWindow,
  logoField,
  monthlyAfter,
  monthlyToday,
  venues,
} from "../model/content";

/* ══ /simple: THE PAGE A 5TH GRADER CAN READ (30 Sep 2026, POLISH §84) ══════
   Sam: "how do we make this landing page so unbelievably simple that a 5th
   grader could understand it", then: keep the current design, structure it
   the way Hormozi would, say "early access" (never "founding seats"), put the
   auto-refund at the top, add a FAQ, and keep only the copy that moves the
   needle. Everything else is cut or nested.

   It is a second route beside the pitch, not a replacement, so the two can be
   compared on a phone. It reuses the pitch's hero, photo cards, panels,
   drills, guarantee and sticky bar unchanged; only the words and the order
   are new. What is gone: the month calendar (the cycling ticket is this
   page's animation instead), the savings slider, the "Applies to" plates,
   and the invented feed. */

const CREDIT = BENEFIT.creditUsd;
const MIN = Math.round(BENEFIT.creditMinUsd);
const PCT = Math.round(BENEFIT.percentOff * 100);
const PLACES = venues.length;
const price = `$${monthlyToday.toFixed(2)}`;
const after = `$${monthlyAfter.toFixed(2)}`;
const names = venues.map((v) => v.name);
/* ══ HOW IT WORKS, AS FIGURES AND A RECEIPT (Sam, 30 Sep 2026: "this section
   needs /impeccable redesign") ══════════════════════════════════════════════
   The numbered list was the one block on the page not drawn in the site's
   language. The sequence is now the three-figure strip the venue pop-ups
   use, and the example is a receipt, so the arithmetic is shown, not told. */
const STEPS = [
  { id: "join", figure: price, qualifier: "a month to join" },
  { id: "order", figure: `$${MIN}+`, qualifier: `an order, at any of the ${PLACES}` },
  { id: "off", figure: `\u2212$${CREDIT}`, qualifier: "comes off, every week" },
];
/** The credit at every place, every week of a month: the biggest true number. */
const MONTH_MAX = CREDIT * PLACES * 4;
/* ══ THE EXAMPLES CYCLE (Sam, 30 Sep 2026: "cycle through a few merchant
   offers … that would definitely resonate more with kids"; then "include the
   points you earn … event tickets at the burg, and cover/lineskip at the milk
   parlor") ══════════════════════════════════════════════════════════════════
   Two real orders (Coffeeholics first, then Olaika): the cheapest non-alcohol
   item at or over the $10 floor, name, price and photo the menu's own. Then a
   show ticket at The Burg and cover with a line skip at The Milk Parlor at
   EXAMPLE prices, Sam's call (30 Sep 2026: "just make up a price for a show
   ticket or a lineskip or cover, it's easier to visualize. No need to include
   a disclaimer either, it's implied that these are all examples"): no ticket
   or cover price exists in the data, so those two figures are his, not the
   venues'. Cover stays off The Burg, which sells its door through LineLeap
   (Sam, 13 Sep 2026). Points are the deck's own rate on the price. Italiano's
   is out: offers only, not the credit. */
type Venue = (typeof venues)[number];
interface Example { venue: Venue; item: string; price: number; img: string }
function cheapestAt(venue: Venue): Example | null {
  if (!hasMenu(venue.id)) return null;
  const single = itemsFor(venue.id)
    .filter((i) => !i.alcohol && i.price >= MIN)
    .sort((a, b) => a.price - b.price)[0];
  return single ? { venue, item: single.name, price: single.price, img: single.img ?? venue.hero } : null;
}
function passAt(id: string, item: string, price: number): Example | null {
  const venue = venues.find((v) => v.id === id);
  return venue ? { venue, item, price, img: venue.hero } : null;
}
const EXAMPLES: Example[] = [
  ...venues.filter((v) => v.id === "coffeeholicsva").map(cheapestAt),
  passAt("theburg", "A show ticket", 15),
  passAt("themilkparlor", "Cover + line skip", 12),
  ...venues.filter((v) => v.id === "olaika").map(cheapestAt),
].filter((e): e is Example => e !== null);
/** Points on the menu price, at the deck's rate; the credit does not lower them. */
const pointsOn = (price: number) => Math.round(price * POINTS_PER_DOLLAR);
/** One example holds this long before the next rises in. */
const CYCLE_MS = 4000;
/** The guarantee, with the refund named as automatic (Sam, 30 Sep 2026). */
const GUARANTEE_AUTO = "Save at least what you pay, or we automatically refund the difference.";
const namesLine = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

const Shield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.4 5.2 6v5.4c0 4.4 2.9 8.3 6.8 9.6 3.9-1.3 6.8-5.2 6.8-9.6V6L12 3.4Z" />
    <path d="m9.2 12.2 1.9 1.9 3.8-4" />
  </svg>
);

/** The seats line: real count, plain words. Only while the round is open. */
function Spots() {
  const left = useSeatsLeft();
  return (
    <p className="t-compact hero-seat">
      <b className="tnum">{left}</b> of {SEAT_CAP} early-access spots left at {price}. After that, it&rsquo;s{" "}
      <span className="tnum">{after}</span>.
    </p>
  );
}

/* ══ HOW IT WORKS, ONE CONTAINER IN TWO SEATS ═══════════════════════════════
   Three figures, the reach line and the cycling ticket, in a panel like the
   pitch's own (Sam, 30 Sep 2026: "show this above the 'what you get'"). On a
   phone it stands in the light half under the hero; from 1024 the same
   container sits on the right of the hero over the photographs, where the
   month sits on the Coffeeholics band (Sam: "the same mobile container just
   on the right side of the desktop hero"). It is rendered in both seats and
   CSS shows one per width; a hidden panel never enters view, so only the
   shown one cycles. */
function HowItWorks() {
  /* The ticket's total swaps the menu price to what she pays on mount
     (how.css); it is mounted when the panel enters view, so the swap plays
     where it can be seen, and while it stays in view the examples cycle,
     each rising in fresh. Reduced motion holds the first example. */
  const howPanel = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  const [inView, setInView] = useState(false);
  const [which, setWhich] = useState(0);
  useEffect(() => {
    const el = howPanel.current;
    if (!el || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { setInView(e.isIntersecting); if (e.isIntersecting) setSeen(true); }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!inView || EXAMPLES.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setWhich((n) => (n + 1) % EXAMPLES.length), CYCLE_MS);
    return () => window.clearInterval(t);
  }, [inView]);
  const ex = EXAMPLES[which] ?? EXAMPLES[0];
  return (
    <Panel className="simple-how" innerRef={howPanel}>
      <h2 className="t-section panel-head">How it works</h2>
      <BenefitFigures items={STEPS} size="sheet" className="how-figs" />
      <p className="how-note">
        Every week, at all {PLACES} places. Up to ${MONTH_MAX} of credit a month.
      </p>
      {ex ? (
        <div
          key={seen ? `seen-${which}` : "waiting"}
          className="ticket is-order how-ticket"
          style={seen ? undefined : { visibility: "hidden" }}
          aria-live="polite"
          aria-label={`An example order: ${ex.item} at ${ex.venue.name}, $${ex.price.toFixed(2)}, $${CREDIT} credit, you pay $${(ex.price - CREDIT).toFixed(2)}, and earn ${pointsOn(ex.price)} points.`}
        >
          <p className="tk-where">
            <span className="collar" data-field={logoField(ex.venue.id)} style={{ ["--brand" as string]: ex.venue.brandColor }}>
              <img src={ex.venue.logo} alt="" decoding="async" />
            </span>
            <b>{ex.venue.name}</b>
          </p>
          <p className="tk-item">
            <img src={ex.img} alt="" decoding="async" />
            <span>{ex.item}</span>
            <b className="tnum">${ex.price.toFixed(2)}</b>
          </p>
          <p className="tk-rule" />
          <p className="tk-off is-credit">
            <span>${CREDIT} credit</span>
            <b className="tnum">&minus;${CREDIT.toFixed(2)}</b>
          </p>
          <p className="tk-total">
            <span>You pay</span>
            <span className="tk-swap">
              <b className="was tnum">${ex.price.toFixed(2)}</b>
              <b className="now tnum">${(ex.price - CREDIT).toFixed(2)}</b>
            </span>
          </p>
          {/* The earn side, as the deck's ticket carries it (how.css `.tk-earned`). */}
          <ul className="tk-earned">
            <li>
              <b>+{pointsOn(ex.price)} points</b>
              <span>toward free items here</span>
            </li>
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

export default function Simple() {
  const cta = useReserveCta();
  const [trial, setTrial] = useTrialLink();
  const heroCta = useRef<HTMLAnchorElement>(null);
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = heroCta.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="announce">
        <div className="announce-row">
          <p className="announce-in">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="ann-pin">
              <path
                d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"
                fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"
              />
              <circle cx="12" cy="10" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            <span className="ann-text">Opening in Blacksburg, {launchWindow}</span>
          </p>
          <SignInBar />
        </div>
      </div>

      <VenueMosaic>
        <Panel className="hero">
          <span className="hero-brand">
            <TapInLogo className="logo" />
            <span className="plus hero-plus">
              <PlusBolt className="plus-mark" />
              <span className="plus-word">PLUS</span>
            </span>
          </span>

          {/* Outcome first, mechanism second, refund third: the three lines
              that decide it, in the order they are needed. */}
          <h1 className="t-hero">${CREDIT} credit every week, at every place you already go</h1>
          <p className="t-lead hero-lead">
            restaurants and bars around Blacksburg, plus {PCT}% off and points toward rewards.
          </p>
          {/* On a phone the plate as §84 set it, under the lead (Sam, 30 Sep
              2026: "revert changes here for mobile"); from 1024 the line
              beside the price (§94–§95). Two seats, one shown per width. */}
          <RefundPlate className="hero-refund is-phone" />
          <div className="hero-rail">
            <VenueTicker rail />
          </div>

          <div className="hero-buy">
            <p className="hero-price">
              <b className="tnum t-figure">{price}</b>
              <span>a month</span>
            </p>
            {FOUNDING_OPEN ? <Spots /> : null}
            {/* The guarantee beside the price it backs (§95): the stack reads
                as three movements, the claim, the places, the ask. */}
            <RefundPlate className="hero-refund is-desktop" />
            <div className="hero-actions">
              <Link className="action hero-cta" to={cta.to} state={cta.state} ref={heroCta}>
                {cta.label}
              </Link>
              <button type="button" className="hero-try" onClick={() => setTrial(true)}>
                Try it once for free
              </button>
              <Link className="hero-how" to="/how">
                How it works
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </Panel>
        {/* The desktop seat (§89): shown from 1024, on the light ramp. */}
        <div className="how-in-hero" data-lit="">
          <HowItWorks />
        </div>
      </VenueMosaic>

      <div className="pitch-lit simple-lit" data-lit="">
        {/* How it works, on the phone: below the hero, above the cards (§84).
            From 1024 it lives in the hero instead (`.how-in-hero`, §89). */}
        <div className="how-in-column">
          <HowItWorks />
        </div>


        {/* The four photo cards, as on the pitch; the scope line under them.
            The "Applies to" plates, the calendar and the slider are cut. */}
        <section className="pitch-get">
          <h2 className="t-section pitch-get-head">What you get</h2>
          <BenefitCards />
        </section>


        {/* The objections, answered before they form, nested so the page
            stays short for the reader who has none. */}
        {/* The close (§96; Sam, 30 Sep 2026: "on desktop … these can be a
            grid, like the FAQ on the left, and the other stuff on the
            right?"): Questions in the left track, what it works on and the
            guarantee stacked in the right. Below 1024 the wrappers are
            `display: contents`, so the phone's column is as it was. */}
        <div className="simple-close">
        <Panel className="simple-faq">
          <h2 className="t-section panel-head">Questions</h2>
          <Drill summary="What if I barely go out?">
            <p>
              Then you&rsquo;re refunded. If you don&rsquo;t save at least what you pay, we refund the
              difference, automatically.
            </p>
          </Drill>
          <Drill summary="Do I have to use it every week?">
            <p>No. The ${CREDIT} is there each week if you want it.</p>
          </Drill>
          <Drill summary="Where does it work?">
            <p>{namesLine}. More places get added at no extra cost.</p>
          </Drill>
          <Drill summary="What can I use it on?">
            <p>{benefitScopeLine}</p>
          </Drill>
          <Drill summary="Can I cancel?">
            <p>Any time. Full refund before we open, no reason needed.</p>
          </Drill>
          <Drill summary="When does it start?">
            <p>{launchWindow}. You pay {price} today, and nothing more until we open.</p>
          </Drill>
        </Panel>
          <div className="simple-close-side">

          {/* What it works on, at the foot (Sam, 30 Sep 2026: "we should still
              have the what it works on section too, at the bottom"): the pitch's
              six plates and the one rule for the credit and the 15%, in a panel
              like the two above. The rule moved here from under the cards, so
              it is said once. */}
          <Panel className="pitch-scope simple-scope">
            <AppliesTo />
            <ScopeLine className="pitch-scope-note" />
          </Panel>

          {/* The guarantee closes the page in a white panel like the two above
              it (Sam, 30 Sep), and says the refund is automatic. */}
          <Panel className="simple-guarantee">
            <span className="guarantee-tile" aria-hidden="true"><Shield /></span>
            <div className="guarantee-body">
              <p className="guarantee">{GUARANTEE_AUTO}</p>
              <p className="t-compact guarantee-contact">
                <a href={`mailto:${GUARANTEE_CONTACT}`}>{GUARANTEE_CONTACT}</a>
              </p>
            </div>
          </Panel>
          </div>
        </div>

        <SiteFoot />
      </div>

      {trial ? <TrialModal lit onClose={() => setTrial(false)} /> : null}

      <div className={`sticky-cta is-pair${past ? "" : " is-away"}`} data-lit="">
        <Link className="action" to={cta.to} state={cta.state}>
          {cta.label}
        </Link>
        <button type="button" className="sticky-alt" onClick={() => setTrial(true)}>
          Try it once for free
        </button>
      </div>
    </>
  );
}
