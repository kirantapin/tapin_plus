import {
  savedOrders,
  venueById,
  logoFor,
  totalPoints,
  totalCredit,
  venuePoints,
  weeklyCredit,
  creditPlacesLeft,
} from "./appBits";
import { quote, money, CREDIT_CENTS, CREDIT_MIN_CENTS, whole } from "../../model/order";
import { eventsNote } from "../../model/content";
import { passes, kitchenOrders } from "../../model/tonight";
import { CoverIcon } from "../../shell/Icons";

/**
 * My Spot — what she holds.
 *
 * Sam, 15 Sep 2026: "show a few dummy items that someone might have in their
 * account — and want to make sure we surface some dummy points, credits too."
 * Built from the mockups he approved the same night.
 *
 * Three kinds of thing, in three sections, because they are three kinds:
 *   · WAITING FOR YOU — orders paid at the member price and not yet collected.
 *     Real dishes at real prices (model/preview.ts), with the merchant's own
 *     photographs, because a saved order is a thing and a thing has a picture.
 *   · THIS WEEK'S CREDIT — a STATE per place, available or used, never a
 *     balance. One benefit per order, once a week at each place: that rule is
 *     what this list makes visible.
 *   · TICKETS — an honest empty state until an event exists in the data. A
 *     made-up show at a real bar is a claim about that bar.
 * The two figures on top are the same two the home screen carries.
 */
export default function AppSpot() {
  return (
    <>
      <div className="app-tally">
        <div>
          <b className="tnum">{totalPoints.toLocaleString()}</b>
          <span>points across {venuePoints.length} places</span>
        </div>
        <div>
          <b className="tnum">{money(Math.round(totalCredit * 100))}</b>
          <span>credit in your account</span>
        </div>
      </div>

      {/* ══ RIGHT NOW: AT THE KITCHEN ═══════════════════════════════════════
          The other half of "how you actually used something": a drink she
          ordered is being made, and the app pings her. Three steps, the way
          every pickup app draws it; the middle one is lit. Example. */}
      {kitchenOrders.length ? (
        <section className="app-sec ms-now">
          <h2 className="t-caption">
            Right now <span className="tag tag-sm">Example</span>
          </h2>
          <ul className="app-now">
            {kitchenOrders.map((o) => {
              const v = venueById(o.venueId);
              if (!v) return null;
              const steps = ["Received", "Preparing", "Ready"];
              return (
                <li className="app-now-card" key={o.id}>
                  <div className="app-now-top">
                    {logoFor(v)}
                    <div className="app-row-text">
                      <b>{o.itemName}{o.picks ? ` · ${o.picks}` : ""}</b>
                      <span>{v.name} · to the kitchen</span>
                    </div>
                  </div>
                  <ol className="app-steps" aria-label="Order progress">
                    {steps.map((label, i) => (
                      <li key={label} className={i < o.step ? "is-done" : i === o.step ? "is-on" : ""}>
                        <i aria-hidden="true" />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="app-now-how">We ping you when it&rsquo;s ready. Then show your phone and they hand it over.</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* ══ TONIGHT'S PASSES ═══════════════════════════════════════════════
          What she bought for the door, as the thing she shows there: the
          venue, the pass, a code plate. "Show at the door — some places
          scan" is ways-to-use.json's own sentence. Example, like the rest. */}
      <section className="app-sec ms-passes">
        <h2 className="t-caption">
          Tonight&rsquo;s passes <span className="tag tag-sm">Example</span>
        </h2>
        <ul className="app-passes">
          {passes.map((p) => {
            const v = venueById(p.venueId);
            if (!v) return null;
            return (
              <li className="app-pass" key={p.id}>
                <div className="app-pass-top">
                  {logoFor(v)}
                  <div className="app-row-text">
                    <b>{v.name}</b>
                    <span>{p.title}{p.qty > 1 ? ` · ${p.qty}` : ""}</span>
                  </div>
                  <span className="app-pass-kind"><CoverIcon id={p.kind} /></span>
                </div>
                <div className="app-pass-code" aria-label={`Pass code ${p.code}`}>
                  <span className="app-pass-bars" aria-hidden="true" />
                  <b className="tnum">{p.code}</b>
                </div>
                <p className="app-pass-how">Show this at the door. Some places scan it.</p>
              </li>
            );
          })}
        </ul>
        <p className="t-compact app-note">{eventsNote} Tickets you buy show here too.</p>
      </section>
      <section className="app-sec ms-waiting">
        <h2 className="t-caption">Waiting for you</h2>
        <ul className="app-spot">
          {savedOrders.map((o) => {
            const v = venueById(o.venueId);
            /* ONE PRICING PATH: quote() in model/order.ts, the same arithmetic
               the merchant page uses. A saved order was bought at the member
               price; which of the two benefits bought it is not this list's
               business, and the struck figure is the menu price it was not. */
            const q = v ? quote(v, o.items) : null;
            const shots = o.items.filter((i) => i.img);
            return (
              <li key={o.id}>
                <div className="app-spot-top">
                  {v ? logoFor(v) : null}
                  <div className="app-row-text">
                    <b>{v?.name}</b>
                    <span>{o.savedAgo}</span>
                  </div>
                  <span className="app-state">Ready when you are</span>
                </div>

                {/* The dishes: their photographs, then their names. */}
                <div className="app-spot-dishes">
                  {shots.map((i) => (
                    <img key={i.id} src={i.img} alt="" loading="lazy" decoding="async" />
                  ))}
                  <span>{o.items.map((i) => i.name).join(" · ")}</span>
                </div>

                {q ? (
                  <p className="app-paid">
                    <span>Paid</span>
                    <span className="app-paid-figs">
                      <b className="tnum app-was">{money(q.subtotalCents)}</b>
                      <b className="tnum">{money(q.dueCents)}</b>
                    </span>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="t-compact app-note">
          Member price locked in when you bought it. Collect whenever.
        </p>
      </section>

      <section className="app-sec ms-credit">
        <h2 className="t-caption">This week&rsquo;s {money(CREDIT_CENTS)} credit</h2>
        <ul className="app-credit">
          {weeklyCredit.map((w) => {
            const v = venueById(w.venueId);
            if (!v) return null;
            return (
              <li key={w.venueId}>
                {logoFor(v)}
                <b>{v.name}</b>
                {w.earned ? (
                  <span className="app-credit-ok">Earned {w.earned}</span>
                ) : (
                  <span className="app-credit-used">Spend {whole(CREDIT_MIN_CENTS)}+ to earn it</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="t-compact app-note">
          Spend {whole(CREDIT_MIN_CENTS)}+ at a place in a week, or on one order, and{" "}
          {money(CREDIT_CENTS)} is added to your account — instead of the 15% on that order. Still{" "}
          {creditPlacesLeft} places to earn it this week. It doesn&rsquo;t expire.
        </p>
      </section>

    </>
  );
}
