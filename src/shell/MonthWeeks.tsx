import type { Month, MonthOrder } from "../model/month";
import { dollars, signedDollars } from "../model/month";

/**
 * THE MONTH ON A PHONE, CALM (23 Sep 2026, /impeccable redesign — Sam: "redesign
 * the calendar for mobile so it's not as busy and overloaded with information").
 *
 * The desktop calendar is a 7×4 lattice with a chip on every order, a running
 * legend and a four-row ledger; at 343px that is twenty-eight cells, a dozen
 * chips and nine figures. On a phone the month is told by WEEK instead: four
 * rows, each the week's orders as small pictures and what the week brought
 * back, then the membership and what you saved. No empty days, no chips, no
 * running line, no loop. The same model as the desktop (`Month`), so the two
 * can never disagree.
 */
const weekCents = (orders: MonthOrder[]) => orders.reduce((s, o) => s + o.cents, 0);
const weekPoints = (orders: MonthOrder[]) =>
  orders.reduce((s, o) => s + ("points" in o && typeof o.points === "number" ? o.points : 0), 0);

export default function MonthWeeks({ month }: { month: Month }) {
  const plan = -month.startCents;
  const ahead = month.netCents > 0;
  return (
    <div className="mw" data-lit="" role="group" aria-label={month.head}>
      <p className="mw-head">{month.head}</p>
      <ol className="mw-weeks">
        {month.weeks.map((label, wk) => {
          const orders = month.orders.filter((o) => o.week === wk);
          const c = weekCents(orders);
          const pts = weekPoints(orders);
          return (
            <li key={label} className="mw-week">
              <span className="mw-label">{label}</span>
              <span className="mw-tiles" aria-hidden="true">
                {orders.map((o) =>
                  "img" in o ? (
                    <span
                      key={o.id}
                      className="mw-tile collar"
                      data-field={o.field}
                      style={{ ["--brand" as string]: o.brand }}
                    >
                      <img src={o.img} alt="" decoding="async" />
                    </span>
                  ) : (
                    <span key={o.id} className="mw-tile mw-thumb">
                      <img src={o.thumb} alt="" decoding="async" />
                    </span>
                  ),
                )}
              </span>
              <span className="sr-only">
                {orders.map((o) => `${o.item} at ${o.venue}`).join(", ")}
              </span>
              <b className="mw-fig">
                {c > 0 ? `+${dollars(c)}` : pts > 0 ? `${pts} pts` : "—"}
              </b>
            </li>
          );
        })}
      </ol>
      <div className={`mw-foot${ahead ? " is-ahead" : ""}`}>
        <p className="mw-row">
          <span>{month.rows[0]?.what ?? "Membership"}</span>
          <b>{dollars(plan)}</b>
        </p>
        <p className="mw-net">
          <span>You saved</span>
          <b>{signedDollars(month.netCents)}</b>
        </p>
      </div>
    </div>
  );
}
