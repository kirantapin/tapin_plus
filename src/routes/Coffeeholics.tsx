import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TapInLogo from "../shell/TapInLogo";
import PlusFlag from "../shell/PlusFlag";
import SiteFoot from "../shell/SiteFoot";
import TrialModal from "../shell/TrialModal";
import SeatCapLine from "../shell/SeatCapLine";
import PhotoCard from "../shell/PhotoCard";
import { BenefitIcon } from "../shell/Icons";
import { useReserveCta } from "../shell/useReserveCta";
import {
  heroIsBright,
  logoField,
  launchWindow,
  monthlyToday,
  venues,
} from "../model/content";
import { campaignVenue, campaignBenefits, campaignShots } from "../model/campaign";

/**
 * THE COFFEEHOLICS SPLASH — the page a Meta ad points at.
 *
 * Sam, 20 Sep 2026: "I'm creating a post on meta for coffeeholics… Let's get a
 * dedicated splash page for this. Narrowing the focus on coffeeholics."
 *
 * ══ THE ORDER OF THE PAGE IS THE ARGUMENT ══════════════════════════════════
 * The advert's six cards run: the credit, the 15%, the points, the guarantee,
 * the rate, then "Get early access". This page keeps that spine and puts one
 * thing in the middle of it that a carousel cannot do — the two live trials at
 * that shop, free, today.
 *
 *   the shop, photographed        evidence before argument
 *   what a member gets here       the advert's three claims, as figures
 *   the membership                the price, the seats, the action
 *
 * Proof before the ask. A cold reader from a scroll has spent no intent to get
 * here; opening with $4.99 toward a service that starts at {launchWindow} asks
 * a question they have not reached yet, while a free $5 at a shop they walk
 * past is one they can answer now — and answering it is what earns the ask.
 *
 * ══ IT IS THE SAME WORLD, NOT A NEW ONE ════════════════════════════════════
 * Same ground, same glass, same lockup, same maroon, same `.action`, same seat
 * line, same footer. A campaign page that looks like a different company reads
 * as a scam, which is the exact suspicion "free $5" invites, so nothing here is
 * invented that the site already owns.
 *
 * ══ AND IT IS SHORT ════════════════════════════════════════════════════════
 * Sam, the same afternoon, twice: "there's just a bunch of little text that i
 * think is unnecessary and redundant", and "way too crowded and dense. We
 * gotta dial back significantly." Every second line on this page is a
 * condition, a cadence or a price. Nothing restates a label.
 *
 * ══ 21 SEP 2026 — ONE BOX, ONE DISPLAY MOMENT ══════════════════════════════
 * docs/POLISH-2026-09-21.md §3. Sam: "it still feels a bit AI generated." It
 * did, and the diagnosis was composition rather than colour: three benefits as
 * icon-tile-plus-heading rows, a headline and a lead inside the same rounded
 * panel as everything else, and the merchant's photograph reduced to a 128px
 * strip. So:
 *
 *   the photograph is the hero      full-bleed, the shop before the sentence
 *   the headline sits on the ground the panel around it is gone
 *   the three claims are FIGURES    $5 / 15% / 1×, in open columns
 *   the membership keeps its box    it is the decision; it is the only box
 *
 * ══ 22 SEP 2026 — THE PROOF UNDER THE CLAIM ═══════════════════════════════
 * §11: "showing items from their page, and when ordering what they save."
 * Three of Coffeeholics' own items as the pitch's photo cards (PhotoCard),
 * between the hero and the membership. The strip is the advert's claim; the
 * cards are what it comes to on a real order.
 */
export default function Coffeeholics() {
  /* ══ THE LIGHT SURFACE, FOR THIS ROUTE ONLY ═════════════════════════════
     Sam, 20 Sep 2026: "the whole thing is too dark. Maybe we use coffeeholics
     colors for this?" The palette lives in campaign.css under
     `:root[data-surface="cg"]`; this is the only thing that turns it on.

     ON <html>, BECAUSE THE FIELD IS NOT INSIDE THIS COMPONENT. `body` carries
     the gradient and `.ground` is Shell's sibling of `.column`, so a wrapper
     class here could never reach either. The same place App.tsx toggles
     `is-layered`, and removed on unmount so no other route inherits it. */
  useEffect(() => {
    document.documentElement.setAttribute("data-surface", "cg");
    return () => document.documentElement.removeAttribute("data-surface");
  }, []);

  /* ══ THE DOCKED PAIR ARRIVES WHEN THE HERO LEAVES ══════════════════════
     Sam, 20 Sep 2026: "need two sticky buttons, one is 'try it once for
     free' the other is 'get early access'."

     Out while the top of the page is on screen, in once it is not — the same
     rule the pitch's bar follows, and for the same reason layout.css gives:
     a docked control competing with the one the reader is already looking at
     is the decoy shape, not redundancy. An observer rather than a scroll
     handler, so nothing runs on the frames between. */
  /* ══ THE CHECKOUT OPENS OVER THIS PAGE ═════════════════════════════════
     Sam, 20 Sep 2026: "when I click on get early access it shouldn't take me
     to the Tapin checkout on the other page, everything should be siloed."

     `/reserve` is a LAYER, not a destination: App.tsx renders it over
     `state.background ?? "/"`, and the fallback is why it used to land the
     reader on the pitch. This hook already carries the current location as
     that background — the pitch has always used it — so the sheet opens over
     the Coffeeholics page, closing it returns here, and the main landing page
     is never seen. It also sends a member who already holds a membership to
     /in rather than inviting them to buy it twice. */
  const cta = useReserveCta();
  const buy = useRef<HTMLDivElement>(null);
  const [past, setPast] = useState(true);
  useEffect(() => {
    const el = buy.current;
    if (!el) return;
    /* ══ ONE ANCHOR: THE FILLED ACTION ════════════════════════════════════
       The bar is out only while the page's own filled "Get early access" is
       on screen. Two controls for one destination at the same moment is the
       decoy shape layout.css warns about, and that is the only moment it can
       happen here.

       THE REF MOVED WITH THE BUTTON. The price and the button used to share
       one `.cg-buy` block; the desktop band (§3) splits them into two cells
       of a row, so the observed element is now the cell the button is in.
       Observing the price instead would hide the bar a beat early on a phone,
       where the two are 60px apart.

       IT IS NOT ALSO KEYED TO THE HERO, which is what this tried first. The
       pitch hides its bar until the reader passes a buy block near the top;
       this page's buy block is at the BOTTOM, and the whole page is about
       1,500px against an 812px viewport — so "past the hero and before the
       buy block" was a window roughly a hundred pixels wide, and measured
       across four scroll positions the bar never appeared once. On a page
       under two screens tall there is nothing to defer: both actions are
       reachable from the first frame, which is what an advert's landing page
       is for. */
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting), {
      rootMargin: "0px 0px -72px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ══ THE DOCKED BUTTON OPENS A MODAL ═══════════════════════════════════
     Sam, 20 Sep 2026: "instead of scrolling to a section on the page (which
     we can remove), we can instead have a modal pop up that shows me how I
     can try this for free… and then there should be a call out."

     It used to scroll to a panel holding the two links. A button that moves
     the page rather than doing something is the weakest thing this page can
     put in its most valuable slot, and the panel it arrived at answered
     "which offer" without answering "and then what happens". */
  const [trial, setTrial] = useState(false);

  /* The record, not a typed name: this venue's photograph, mark, category and
     street change here when they change anywhere. */
  const v = campaignVenue;
  /* Everywhere else it works, from the records — never a typed list of names,
     which is how a sixth venue signs and a page keeps saying five. */
  const others = venues.filter((o) => o.id !== "coffeeholicsva" && o.plus);
  if (!v) return null;

  return (
    <>
      {/* The pitch's own bar, carrying the town. The first question a Meta ad
          has to answer is "is this near me", and the date belongs further
          down, beside the price it qualifies.

          THE TOWN, NOT THE SHOP. This read "Coffeeholics · Draper Road,
          Blacksburg", which put the venue's name three times and its street
          twice into one screen that already has both on the plate below. */}
      <div className="announce">
        <p className="announce-in">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="ann-pin">
            <path
              d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="10" r="2.4" fill="currentColor" />
          </svg>
          Blacksburg, Virginia
        </p>
      </div>

      {/* NOT A `.panel`. The headline, the lead and the three figures sit on
          the page's own ground; the only box on this page is the membership,
          because the membership is the decision. */}
      <section className="cg">
        {/* ══ THE MERCHANT, AS EVIDENCE AND AS THE HERO ════════════════════
            Their photograph and their own mark. The single thing a cold reader
            is deciding is whether this is a real shop on a real street, and a
            128px strip below the fold was answering that last. Full-bleed
            under the announcement bar on a phone; a tall object beside the
            argument from 1024. The name and street ride the photograph rather
            than a plate under it — the venue-card shape the rail and the
            pop-up both use. */}
        <div className="cg-band">
          <img
            className="cg-shot"
            src={v.hero}
            alt=""
            decoding="async"
            data-bright={heroIsBright(v.id) ? "true" : undefined}
          />
          <p className="cg-name">
            <span
              className="collar cg-collar"
              data-field={logoField(v.id)}
              style={{ ["--brand" as string]: v.brandColor }}
            >
              <img src={v.logo} alt="" decoding="async" />
            </span>
            <span className="cg-name-text">
              <b>{v.name}</b>
              <span>
                {v.category} · {v.street}
              </span>
            </span>
          </p>
        </div>

        {/* On the photograph on a phone, at the head of the left column from
            1024 — one element either way, moved by CSS, so there is no second
            lockup to keep in sync. */}
        <p className="cg-lockup">
          <TapInLogo />
          <PlusFlag className="plus" mark={false} />
        </p>

        <div className="cg-say">
          {/* THE ADVERT'S FIRST CARD, VERBATIM. The reader tapped those words
              a second ago; re-earning their attention with a different
              sentence is the cost message match exists to avoid. */}
          <h1 className="t-hero cg-h1">$5 credit every week at Coffeeholics</h1>
          <p className="t-lead cg-lead">
            On any order over $10. Plus 15% off and points toward rewards.
          </p>

          {/* ══ THREE FIGURES, NOT THREE ROWS ════════════════════════════
              docs/POLISH-2026-09-21.md §3.3, the biggest single move on the
              page: the numbers that ARE the offer are set as the offer, in
              open columns divided by a hairline, with no tile beside them.
              $5 / 15% / 1×, one size (Sam, 22 Sep 2026). */}
          <ul className="cg-figures">
            {campaignBenefits.map((b) => (
              <li key={b.id}>
                <b className="t-figure">{b.figure}</b>
                <span className="t-compact">{b.qualifier}</span>
              </li>
            ))}
          </ul>

          {/* ══ THE ACTIONS ══════════════════════════════════════════════
              ONE FILLED ACTION PER VIEW. On a phone that is the membership
              button at the foot, so the only control up here is the ghost —
              the filled twin below is `display:none` until 1024, where the
              fold is wide enough to hold the argument and both actions at
              once and the docked bar is switched off in exchange. */}
          <div className="cg-acts">
            <Link
              className="action cg-hero-cta"
              to={cta.to}
              state={cta.state}
            >
              {cta.label}
            </Link>
            {/* ══ THE TRIAL, MENTIONED WHERE THE BENEFITS ARE ═══════════
                Sam, 20 Sep 2026: "maybe we still mention that you can try it
                now, and when I click on the deals to try it triggers the
                modal first before I actually go to the coffeeholics page to
                use the deals."

                The docked bar says it too, but the bar is chrome — it arrives
                over the page rather than in it, and a reader who has just
                read the three figures is exactly the reader the offer is for.
                So the invitation sits at the end of that list, and it opens
                the same modal: the how-it-works comes first and Coffeeholics
                comes from there, which is the order he asked for. */}
            <button
              type="button"
              className="action action-ghost cg-try"
              onClick={() => setTrial(true)}
            >
              Try the first two free today
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="m10 7 5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ══ WHAT YOU'D SAVE HERE ═════════════════════════════════════════════
          §11. Three of their own items, their own photographs, and what the
          benefit takes off each — the pitch's photo card, not a lookalike.
          On the page's ground, not in a panel: the cards are the boxes. */}
      {campaignShots.length ? (
        <section className="cg-save" aria-labelledby="cg-save-h">
          <h2 className="t-section cg-save-h" id="cg-save-h">
            What you'd save here
          </h2>
          <div className="bshots cg-shots">
            {campaignShots.map((c) => (
              <PhotoCard
                key={c.id}
                img={c.img}
                title={c.title}
                line={c.line}
                lead={c.id === "credit"}
                chip={{ ...c.chip, icon: <BenefitIcon id={c.id} /> }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ══ THE MEMBERSHIP, AFTER THE PROOF ══════════════════════════════════
          The advert closes on "Get early access" and so does the page. The
          price, the date and the seat sentence are the site's own constants —
          the checkout charges from the same ones, so an advert cannot quote a
          figure this build does not hold.

          THREE CELLS, STACKED ON A PHONE AND A ROW FROM 1024. The wrappers
          exist so the desktop band can be one movement — statement, price,
          action — rather than a 1,120px-wide phone. Their stacked order is
          the order the phone already had. */}
      <section className="panel cg-member">
        <div className="cg-member-head">
          {/* A HEADING, NOT A CAPTION. This was `.t-caption` — 11px tracked
              uppercase over a sentence — which is the tic §1.5 of the polish
              plan names: one such label on a page is a label, four is a
              style. `.t-section` is the replacement the ramp gained for it. */}
          <h2 className="t-section cg-member-h">Every week, not once</h2>
          {/* NO BACK-REFERENCE. This opened "Those two are a trial", which
              pointed at a panel that stood directly above it — and that panel
              became a modal (Sam, 20 Sep 2026), so the sentence was pointing
              at nothing. He caught it: "not sure it does right now since we
              removed the try it now from the page." It stands on its own. */}
          <p className="t-body cg-member-line">
            From {launchWindow}, members get all three at Coffeeholics every
            week, and at every other place on the membership around Blacksburg.
          </p>
        </div>

        <div className="cg-buy">
          {/* DEPOSIT, THE WORD THE REST OF THE BUILD USES. Sam, 20 Sep 2026:
              "need to make sure it says $4.99 deposit." This read "a month,
              from when we open", which is the framing his advert's fifth card
              uses and the one the pitch and the checkout do not — and the
              checkout this button opens charges a deposit. The date it was
              carrying moved up into the sentence above, where it qualifies
              the membership rather than the figure.

              `.t-figure` RATHER THAN `.hero-price`: the price is this page's
              one display moment, and the ramp gained the step for it. The
              class carries tabular figures, so `.tnum` is not also needed. */}
          <p className="cg-price">
            <b className="t-figure">${monthlyToday.toFixed(2)}</b>
            <span>deposit</span>
          </p>
          <p className="t-compact cg-seat">
            <SeatCapLine />
          </p>
        </div>

        <div className="cg-act" ref={buy}>
          <Link className="action cg-cta" to={cta.to} state={cta.state}>
            {cta.label}
          </Link>

          {/* ══ THE OTHER PLACES ════════════════════════════════════════
              Sam, 20 Sep 2026: "we still want to mention somewhere, even if
              it's lower down or at checkout that someone can use this at
              other spots too not just coffeeholics." His advert closes the
              same way.

              Down here rather than up there on purpose: the advert was about
              one shop and the reader came for it, so widening the offer
              before they have taken it in trades a concrete thing for a vague
              one. After the price it is the reason the price is worth
              paying. */}
          {others.length ? (
            <div className="cg-also">
              <span className="cg-also-marks" aria-hidden="true">
                {others.map((o) => (
                  <span
                    key={o.id}
                    className="collar"
                    data-field={logoField(o.id)}
                    style={{ ["--brand" as string]: o.brandColor }}
                  >
                    <img src={o.logo} alt="" decoding="async" />
                  </span>
                ))}
              </span>
              <p className="t-compact">
                Also at{" "}
                {others.map((o, k, arr) => (
                  <Fragment key={o.id}>
                    {o.name}
                    {k === arr.length - 1
                      ? ""
                      : k === arr.length - 2
                        ? " and "
                        : ", "}
                  </Fragment>
                ))}
                .
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* ══ POWERED BY TAPIN ════════════════════════════════════════════════
          Sam, 20 Sep 2026: "it needs the powered by tapin as well."

          This page wears Coffeeholics' colour from the announcement bar to
          the button, which is the point of it — and the cost of that is that
          the only thing naming whose product this is sits 1,100px up in the
          lockup. A co-brand says whose it is at the foot, where a reader who
          scrolled the whole thing is deciding whether to trust it. */}
      <p className="cg-powered">
        <span>Powered by</span>
        <TapInLogo />
      </p>

      <SiteFoot />

      {trial ? <TrialModal onClose={() => setTrial(false)} /> : null}

      <div className={`sticky-cta is-pair cg-sticky${past ? "" : " is-away"}`}>
        {/* A button, not a link: it moves the reader to the two offers on this
            page rather than navigating, because there are two tokens and one
            href can only carry one of them. */}
        <button type="button" className="action" onClick={() => setTrial(true)}>
          Try it once for free
        </button>
        <Link className="sticky-alt" to={cta.to} state={cta.state}>
          {cta.label}
        </Link>
      </div>
    </>
  );
}
