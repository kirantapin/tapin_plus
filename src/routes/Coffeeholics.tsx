import { Fragment, useEffect } from "react";
import { Link } from "react-router-dom";
import TapInLogo from "../shell/TapInLogo";
import PlusFlag from "../shell/PlusFlag";
import SiteFoot from "../shell/SiteFoot";
import SeatCapLine from "../shell/SeatCapLine";
import { BenefitIcon } from "../shell/Icons";
import {
  heroIsBright,
  logoField,
  launchWindow,
  monthlyToday,
  venues,
} from "../model/content";
import { campaignVenue, campaignBenefits, campaignTrials } from "../model/campaign";

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
 *   what a member gets here     the advert's three cards, its own words
 *   what you can have today     two gated one-time offers, verified live
 *   the membership              the price, the seats, the action
 *
 * Proof before the ask. A cold reader from a scroll has spent no intent to get
 * here; opening with $4.99 toward a service that starts at {launchWindow} asks
 * a question they have not reached yet, while a free $5 at a shop they walk
 * past is one they can answer now — and answering it is what earns the ask.
 *
 * ══ IT IS THE SAME WORLD, NOT A NEW ONE ════════════════════════════════════
 * Same ground, same glass, same lockup, same maroon, same `.action`, same
 * benefit glyphs, same seat line, same footer. A campaign page that looks like
 * a different company reads as a scam, which is the exact suspicion "free $5"
 * invites, so nothing here is invented that the site already owns.
 *
 * ══ AND IT IS SHORT ════════════════════════════════════════════════════════
 * Sam, the same afternoon, twice: "there's just a bunch of little text that i
 * think is unnecessary and redundant", and "way too crowded and dense. We
 * gotta dial back significantly." Every second line on this page is a
 * condition, a cadence or a price. Nothing restates a label.
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

      <section className="panel cg">
        <p className="cg-lockup">
          <TapInLogo />
          <PlusFlag className="plus" />
        </p>

        {/* THE ADVERT'S FIRST CARD, VERBATIM. The reader tapped those words a
            second ago; re-earning their attention with a different sentence is
            the cost message match exists to avoid. */}
        <h1 className="t-display">$5 credit every week at Coffeeholics</h1>
        <p className="t-lead cg-lead">
          On any order over $10. Plus 15% off and points toward rewards.
        </p>

        {/* A plain div on a phone and a two-column grid from 720px, where the
            shop can sit beside the benefits it belongs to instead of pushing
            them a screen down. */}
        <div className="cg-pair">
        {/* ══ THE MERCHANT, AS EVIDENCE ════════════════════════════════════
            Their photograph and their own mark. The single thing a cold reader
            is deciding is whether this is a real shop on a real street, and
            the buttons below settle it by opening their actual page. */}
        <div className="cg-venue">
          <img
            className="cg-shot"
            src={v.hero}
            alt=""
            decoding="async"
            data-bright={heroIsBright(v.id) ? "true" : undefined}
          />
          <span
            className="collar cg-collar"
            data-field={logoField(v.id)}
            style={{ ["--brand" as string]: v.brandColor }}
          >
            <img src={v.logo} alt="" decoding="async" />
          </span>
          <span className="cg-venue-text">
            <b>{v.name}</b>
            <span>
              {v.category} · {v.street}
            </span>
          </span>
        </div>

        <ul className="cg-benefits">
          {campaignBenefits.map((b) => (
            <li key={b.id}>
              <span className="cg-icon" aria-hidden="true">
                <BenefitIcon id={b.id} />
              </span>
              <span>
                <b>{b.label}</b>
                <span>{b.note}</span>
              </span>
            </li>
          ))}
        </ul>
        </div>
      </section>

      {/* ══ WHAT YOU CAN HAVE TODAY ══════════════════════════════════════════
          Two real policies on Coffeeholics' real page, each behind its own
          link. This is the only part of the offer a reader can verify without
          paying anything, so it gets its own panel rather than a line in the
          one above.

          TWO BUTTONS, NOT ONE. They are separate policies on separate tokens —
          one link cannot carry both, and collapsing them into a single "order
          now" would quietly drop whichever one it did not point at. */}
      <section className="panel cg-today">
        <p className="t-caption panel-label">Try it today, free</p>
        <ul className="cg-trials">
          {campaignTrials.map((t) => (
            <li key={t.id}>
              <a
                className="action action-ghost cg-trial"
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  <b>{t.label}</b>
                  <span>{t.note}</span>
                </span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M14 5h5v5M19 5l-8 8M9 6H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </li>
          ))}
        </ul>
        {/* THE LIMIT, BESIDE THE OFFER IT LIMITS. Sam: "It's a one time
            offer." A trial read as the standing weekly benefit is a reader
            misled by omission. */}
        <p className="t-compact cg-once">One time each, on your next order at Coffeeholics.</p>
      </section>

      {/* ══ THE MEMBERSHIP, AFTER THE PROOF ══════════════════════════════════
          The advert closes on "Get early access" and so does the page. The
          price, the date and the seat sentence are the site's own constants —
          the checkout charges from the same ones, so an advert cannot quote a
          figure this build does not hold. */}
      <section className="panel cg-member">
        <p className="t-caption panel-label">Every week, not once</p>
        <p className="t-lead cg-member-line">
          Those two are a trial. Members get them at Coffeeholics every week, and at
          every other place on the membership around Blacksburg.
        </p>
        <div className="cg-buy">
          <p className="hero-price cg-price">
            <b className="tnum">${monthlyToday.toFixed(2)}</b>
            <span>a month, from when we open on {launchWindow}</span>
          </p>
          <p className="t-compact cg-seat">
            <SeatCapLine />
          </p>
          <Link className="action cg-cta" to="/reserve">
            Get early access
          </Link>
        </div>

        {/* ══ THE OTHER PLACES ════════════════════════════════════════════
            Sam, 20 Sep 2026: "we still want to mention somewhere, even if
            it's lower down or at checkout that someone can use this at other
            spots too not just coffeeholics." His advert closes the same way.

            Down here rather than up there on purpose: the advert was about
            one shop and the reader came for it, so widening the offer before
            they have taken it in trades a concrete thing for a vague one.
            After the price it is the reason the price is worth paying. */}
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
                  {k === arr.length - 1 ? "" : k === arr.length - 2 ? " and " : ", "}
                </Fragment>
              ))}
              .
            </p>
          </div>
        ) : null}
      </section>

      <SiteFoot />
    </>
  );
}
