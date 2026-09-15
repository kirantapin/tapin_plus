import { BenefitIcon } from "../../shell/Icons";
import AppliesTo from "../../shell/AppliesTo";
import { benefits, plusVenues, venues } from "../../model/content";
import { liveOffers, logoFor } from "./appBits";
import { heroIsBright } from "../../model/content";

/**
 * Deals. Two different things, kept visibly apart:
 *
 *   STANDING — the three benefits, automatic, identical at every Plus venue.
 *     Nothing to add, nothing to show.
 *   ONE-TIME — an offer a place runs itself. She ADDS it, it applies once, then
 *     it reads used.
 *
 * Collapsing those into one list is what made the old benefit rows wrong: a
 * member does nothing to get the 15%, and must act to get the offer.
 */
export default function AppDeals() {
  return (
    <>
      <section className="app-sec">
        <h2 className="t-caption">Always on</h2>
        <ul className="app-list">
          {benefits.map((b) => (
            <li key={b.id}>
              <span className="app-glyph">
                <BenefitIcon id={b.id} />
              </span>
              <div className="app-row-text">
                <b>{b.label}</b>
                <span>{b.detail}</span>
              </div>
              <span className="app-state">Automatic</span>
            </li>
          ))}
        </ul>
        <p className="t-compact app-note">
          At all {plusVenues.length} TapIn Plus places. 15% off now, or $5 credit added to your account on a $10+ order — one of the two — and points on everything.
        </p>
        <AppliesTo />
      </section>

      <section className="app-sec">
        {/* NOT "One-time offers" ANY MORE. That heading was true while the list
            held exactly one row — Italiano's welcome offer, which really is one
            order, one time. Olaika's is a standing condition ("with any drink")
            and would have been mislabelled by the heading above it. Each row's
            own terms are in its detail line, which is where a use limit belongs:
            it is a property of the offer, not of the section. */}
        <h2 className="t-caption">Offers from the places</h2>
        {/* Cards, with the place's own photograph (15 Sep 2026 layout pass):
            an offer is a thing from a place, and the Tonight cards on Home
            already draw a place that way. Not buttons — in the real app this
            is "Add"; here it is the state it would be in. */}
        <ul className="app-offers">
          {liveOffers.map((o) => {
            const v = venues.find((x) => x.id === o.venueId);
            if (!v) return null;
            return (
              <li className="of-card" key={o.id}>
                <span className="of-shot">
                  <img src={v.hero} alt="" decoding="async" data-bright={heroIsBright(v.id) ? "true" : undefined} />
                  <em className="tag of-tag">Members only</em>
                </span>
                <span className="of-body">
                  <span className="of-where">
                    {logoFor(v)}
                    <b>{v.name}</b>
                  </span>
                  <span className="of-label">{o.label}</span>
                  <span className="of-detail">{o.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="app-sec">
        <h2 className="t-caption">
          Partner offers <span className="tag tag-sm">Coming</span>
        </h2>
        <p className="t-compact app-note">
          Places run their own, on top of the standing three.
        </p>
      </section>
    </>
  );
}
