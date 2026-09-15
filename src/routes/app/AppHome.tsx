import { Link, useLocation } from "react-router-dom";
import TapInCard from "../../shell/TapInCard";
import { BenefitIcon, SceneIcon } from "../../shell/Icons";
import { venues, benefits, plusVenues, eventsNote } from "../../model/content";
import { totalPoints, totalCredit, venuePoints, logoFor } from "./appBits";
import { money } from "../../model/order";
import Tonight from "./Tonight";
import { tonight } from "../../model/tonight";

/**
 * Home. The card, what she has, and where she can use it.
 * Figures are demonstration data — the bar above says so on every screen.
 */
export default function AppHome() {
  /* Forwarded on every in-app link so the desktop window keeps the page it was
     opened over (AppLayer). */
  const { state } = useLocation();
  return (
    <>
      {/* ══ THE OBJECT, THEN WHAT IT HOLDS ═══════════════════════════════════
          Three wrappers that are `display:contents` below 1024, so the phone
          keeps the identical DOM order, gap and layout it already had.

          On desktop they become a hero row: the card on the left, at the size
          you would hold one, and the two figures plus the standing benefits
          stacked beside it. That is the shape every desktop account surface
          uses — Coinbase One, Rocket Money, Origin all put the object or the
          headline figure left and a column of facts beside it — and it is the
          shape this screen's content already had. Stacked in one 720 column the
          card was a 454px-tall slab and the two figures below it were a
          full-width band holding four words. */}
      <div className="ah-top">
        <div className="ah-object">
          <TapInCard className="app-card" />
        </div>

        <div className="ah-facts">
          <div className="app-tally">
            <div>
              <b className="tnum">{totalPoints.toLocaleString()}</b>
              <span>points</span>
            </div>
            <div>
              {/* A balance: earned on $10+ orders, added to the account, and
                  it does not expire (Sam, 15 Sep 2026). */}
              <b className="tnum">{money(Math.round(totalCredit * 100))}</b>
              <span>credit in your account</span>
            </div>
          </div>

          <section className="app-sec ah-always">
            <h2 className="t-caption">Always on</h2>
            <div className="app-benefits">
              {benefits.map((b) => (
                <div className="app-benefit" key={b.id}>
                  <BenefitIcon id={b.id} />
                  <b>{b.label}</b>
                </div>
              ))}
            </div>
            <p className="t-compact app-note">
              At all {plusVenues.length} TapIn Plus places. The 15% skips alcohol. {eventsNote}
            </p>
          </section>
        </div>
      </div>

      {/* ══ TONIGHT ════════════════════════════════════════════════════════
          The passport's point (Sam, 15 Sep 2026): what is on in town tonight,
          and that cover, a line skip or a ticket is bought here. Example
          listings, tagged as such — see model/tonight.ts. */}
      <Tonight />

      <section className="app-sec ah-places">
        <h2 className="t-caption">Your places</h2>
        {/* These six rows already looked tappable and did nothing — the defect
            the whole preview is built to avoid, sitting on its home screen.
            They go where they look like they go. */}
        <ul className="app-list is-linked">
          {venues.map((v) => {
            const bal = venuePoints.find((p) => p.venueId === v.id);
            return (
              <li key={v.id}>
                <Link className="app-row-link" to={`/app/place/${v.id}`} state={state}>
                  {logoFor(v)}
                  <div className="app-row-text">
                    <b>{v.name}</b>
                    <span>
                      {v.category} · {v.street}
                    </span>
                  </div>
                  {tonight.some((t) => t.venueId === v.id) ? (
                    <span className="tag tag-sm ah-tonight">Tonight</span>
                  ) : null}
                  {bal ? (
                    <span className="app-bal tnum">{bal.points.toLocaleString()}</span>
                  ) : (
                    <span className="app-bal app-bal-none">—</span>
                  )}
                  <span className="app-go" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="m10 7 5 5-5 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              </li>
            );
          })}

          {/* The network grows, and a founding member is buying into that — so
              the app says it where she is looking at what she gets, not only on
              the pitch. Barbers and convenience stores are the first two that
              are not a night out, which is what turns a going-out membership
              into a week.

              NOT A LINK, and visibly so: no chevron, no balance slot, its own
              muted treatment. There is no page behind it and there must not
              appear to be. NO COUNT either — three more are in the works and
              "in the works" is not "signed" (§10). */}
          <li className="app-soon">
            <span className="app-glyph">
              <SceneIcon scene="moretown" />
            </span>
            <div className="app-row-text">
              <b>More joining</b>
              <span>Barbers, convenience stores, the rest of your week</span>
            </div>
            <span className="tag tag-sm">Coming</span>
          </li>
        </ul>
      </section>
    </>
  );
}
