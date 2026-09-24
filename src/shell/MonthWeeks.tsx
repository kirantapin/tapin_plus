import { useLayoutEffect, useRef } from "react";
import type { Month, MonthOrder } from "../model/month";
import { dollars, signedDollars } from "../model/month";
import { MonthSegments, TALLY, easeOut, useMonthSwitch, type MonthChoice } from "./MonthSwitch";

/**
 * THE MONTH ON A PHONE, CALM (23 Sep 2026, /impeccable redesign — Sam: "redesign
 * the calendar for mobile so it's not as busy and overloaded with information").
 *
 * The desktop calendar is a 7×4 lattice with a chip on every order, a running
 * legend and a four-row ledger; at 343px that is twenty-eight cells, a dozen
 * chips and nine figures. On a phone the month is told by WEEK instead: four
 * rows, each the week's orders as small pictures, what the week cost in
 * `--loss` and what it brought back in `--gain` (§42), then what the month
 * cost and what you saved after the membership. No empty days, no chips, no
 * running line, no loop. The same model as the desktop (`Month`), so the two
 * can never disagree. Given `choices` (§40) it offers them under the head, and
 * a switch counts "You saved" across while the rows crossfade.
 */
const weekSum = (orders: MonthOrder[], pick: (o: MonthOrder) => number) =>
  orders.reduce((s, o) => s + pick(o), 0);

export default function MonthWeeks({
  month: given,
  choices,
}: {
  month: Month;
  choices?: MonthChoice[];
}) {
  const card = useRef<HTMLDivElement>(null);
  const fig = useRef<HTMLElement>(null);
  const sw = useMonthSwitch(given, choices, card);
  const month = sw.shown;
  const ahead = month.netCents > 0;

  /* After a switch, "You saved" counts from what it read to the new figure,
     its colour following the sign; at rest it is the markup's own. */
  useLayoutEffect(() => {
    const b = fig.current;
    const to = month.netCents;
    const c0 = sw.from.current;
    sw.from.current = null;
    if (!b || c0 === null) {
      sw.net.current = to;
      return;
    }
    const put = (c: number) => {
      b.textContent = signedDollars(c);
      b.closest(".mw-foot")?.classList.toggle("is-ahead", c > 0);
      sw.net.current = c;
    };
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - t0) / TALLY));
      put(Math.round(c0 + (to - c0) * easeOut(p)));
      raf = p < 1 ? requestAnimationFrame(tick) : 0;
    };
    put(c0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [month, sw.from, sw.net]);

  return (
    <div className="mw" data-lit="" ref={card} role="group" aria-label={month.head}>
      {sw.on ? (
        /* Every choice's head in one cell, the shown one visible, so the
           control under it never moves. */
        <div className="mw-heads">
          {sw.options.map((c) => (
            <p
              key={c.id}
              className={c.id === sw.shownId ? "mw-head" : "mw-head mw-ghost"}
              aria-hidden={c.id === sw.shownId ? undefined : "true"}
            >
              {c.month.head}
            </p>
          ))}
        </div>
      ) : (
        <p className="mw-head">{month.head}</p>
      )}
      {sw.on ? <MonthSegments options={sw.options} pick={sw.pick} onPick={sw.choose} /> : null}
      <ol className="mw-weeks">
        {month.weeks.map((label, wk) => {
          const orders = month.orders.filter((o) => o.week === wk);
          const spent = weekSum(orders, (o) => o.priceCents);
          const saved = weekSum(orders, (o) => o.cents);
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
                {orders.length ? `: spent ${dollars(spent)}, saved ${dollars(saved)}` : ""}
              </span>
              {orders.length ? (
                <span className="mw-figs" aria-hidden="true">
                  <b className="mw-spent">{dollars(spent)}</b>
                  <b className="mw-saved">+{dollars(saved)}</b>
                </span>
              ) : (
                <b className="mw-figs" aria-hidden="true">
                  —
                </b>
              )}
            </li>
          );
        })}
      </ol>
      <div className={`mw-foot${ahead ? " is-ahead" : ""}`}>
        <p className="mw-row">
          <span>You spent</span>
          <b>{dollars(month.spentCents)}</b>
        </p>
        <p className="mw-net">
          <span>
            You saved
            <span className="mw-after">after the {dollars(month.planCents)} membership</span>
          </span>
          <b ref={fig}>{signedDollars(month.netCents)}</b>
        </p>
        {month.points ? (
          <p className="mw-points">
            Plus {month.points.toLocaleString("en-US")} points toward free items
          </p>
        ) : null}
      </div>
    </div>
  );
}
