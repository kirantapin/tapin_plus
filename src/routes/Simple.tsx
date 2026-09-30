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
   ticket at The Burg and cover with a line skip at The Milk Parlor, with NO
   price, name or date: none exists in the extracted data, and a figure beside
   a real business is a claim about it (the deck's entry scene holds the same
   line). Cover stays off The Burg, which sells its door through LineLeap (Sam,
   13 Sep 2026). Points are the deck's own rate on the menu price. Italiano's
   is out: offers only, not the credit. */
type Venue = (typeof venues)[number];
interface Example { venue: Venue; item: string; price: number | null; img: string }
function cheapestAt(venue: Venue): Example | null {
  if (!hasMenu(venue.id)) return null;
  const single = itemsFor(venue.id)
    .filter((i) => !i.alcohol && i.price >= MIN)
    .sort((a, b) => a.price - b.price)[0];
  return single ? { venue, item: single.name, price: single.price, img: single.img ?? venue.hero } : null;
}
function passAt(id: string, item: string): Example | null {
  const venue = venues.find((v) => v.id === id);
  return venue ? { venue, item, price: null, img: venue.hero } : null;
}
const EXAMPLES: Example[] = [
  ...venues.filter((v) => v.id === "coffeeholicsva").map(cheapestAt),
  passAt("theburg", "A show ticket"),
  passAt("themilkparlor", "Cover + line skip"),
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

export default function Simple() {
  const cta = useReserveCta();
  const [trial, setTrial] = useTrialLink();
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
          <RefundPlate className="hero-refund" />

          <div className="hero-rail">
            <VenueTicker rail />
          </div>

          <div className="hero-buy">
            <p className="hero-price">
              <b className="tnum t-figure">{price}</b>
              <span>a month</span>
            </p>
            {FOUNDING_OPEN ? <Spots /> : null}
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
      </VenueMosaic>

      <div className="pitch-lit simple-lit" data-lit="">
        {/* Three steps and one example lead (Sam, 30 Sep 2026: "show this above
            the 'what you get'"), in a panel like the pitch's own. */}
        <Panel className="simple-how" innerRef={howPanel}>
          {/* The words in one block, so from 1024 they take the left track and
              the ticket the right, where the month sat on the Coffeeholics band
              (Sam, 30 Sep 2026: "on desktop it should show up how the last
              animation did on the right"). */}
          <div className="how-copy">
            <h2 className="t-section panel-head">How it works</h2>
            <BenefitFigures items={STEPS} size="sheet" className="how-figs" />
            <p className="how-note">
              Every week, at all {PLACES} places. Up to ${MONTH_MAX} of credit a month.
            </p>
          </div>
          {ex ? (
            <div
              key={seen ? `seen-${which}` : "waiting"}
              className={`ticket is-order how-ticket${ex.price === null ? " is-pass" : ""}`}
              style={seen ? undefined : { visibility: "hidden" }}
              aria-live="polite"
              aria-label={
                ex.price === null
                  ? `An example: ${ex.item} at ${ex.venue.name}. $${CREDIT} credit comes off, and you earn points.`
                  : `An example order: ${ex.item} at ${ex.venue.name}, $${ex.price.toFixed(2)}, $${CREDIT} credit, you pay $${(ex.price - CREDIT).toFixed(2)}, and earn ${pointsOn(ex.price)} points.`
              }
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
                {ex.price !== null ? <b className="tnum">${ex.price.toFixed(2)}</b> : null}
              </p>
              <p className="tk-rule" />
              <p className="tk-off is-credit">
                <span>${CREDIT} credit</span>
                <b className="tnum">&minus;${CREDIT.toFixed(2)}</b>
              </p>
              <p className="tk-total">
                <span>You pay</span>
                {ex.price !== null ? (
                  <span className="tk-swap">
                    <b className="was tnum">${ex.price.toFixed(2)}</b>
                    <b className="now tnum">${(ex.price - CREDIT).toFixed(2)}</b>
                  </span>
                ) : (
                  <b className="tnum">${CREDIT} less</b>
                )}
              </p>
              {/* The earn side, as the deck's ticket carries it (how.css `.tk-earned`). */}
              <ul className="tk-earned">
                <li>
                  {ex.price !== null ? (
                    <>
                      <b>+{pointsOn(ex.price)} points</b>
                      <span>toward free items here</span>
                    </>
                  ) : (
                    <>
                      <b>Points too</b>
                      <span>{POINTS_PER_DOLLAR} on every dollar, toward free items here</span>
                    </>
                  )}
                </li>
              </ul>
            </div>
          ) : null}
        </Panel>


        {/* The four photo cards, as on the pitch; the scope line under them.
            The "Applies to" plates, the calendar and the slider are cut. */}
        <section className="pitch-get">
          <h2 className="t-section pitch-get-head">What you get</h2>
          <BenefitCards />
          <ScopeLine className="pitch-scope-note" />
        </section>


        {/* The objections, answered before they form, nested so the page
            stays short for the reader who has none. */}
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
