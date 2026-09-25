import { Fragment, useId, useLayoutEffect, useRef } from "react";
import { dollars, signedDollars } from "../model/month";
import { BENEFIT } from "../model/savings";
import { MonthControls, TALLY, easeOut, still, useMonthSwitch, type MonthPlace } from "./MonthSwitch";

/**
 * THE CALENDAR — a month on the membership, filling itself
 * (docs/POLISH-2026-09-21.md §21). The pitch's own claim, "$5 credit every
 * week, at every place you already go", shown happening: four weeks, each
 * order the venue's own mark in its day with a `+$5` chip, and a foot that
 * answers "spend a little, save a lot" (§42): "You spent" in `--loss`, "You
 * saved" after the membership in `--gain`, and the month's points, quietly.
 * Desktop only, over the mosaic: below 1024 it is not mounted.
 *
 * THE ENGINE IS THE COFFEEHOLICS LEDGER'S (§17/§20, SavingsLedger.tsx), kept
 * in step with it on purpose: the foot rests on −$4.99 for 1.2s, then the
 * orders arrive 900ms apart in the order they happened (opacity and a .92
 * scale, 280ms, the house ease); as each lands "You spent" and "You saved"
 * count up together to their new totals over 400ms. The saved figure is
 * `--loss` while the month is still owed and `--gain` past zero (Sam, 23 Sep
 * 2026). It holds 3.2s, the month fades out together over 240ms and begins
 * again.
 *
 * THE MARKUP IS THE FINISHED MONTH. Every order in its day, the last one
 * named, the foot at its net. `data-run` is what empties it for the loop and
 * only the script sets it, so a failed script, reduced motion or a
 * `data-still` ancestor all get the complete, still month.
 *
 * CHEAP BY CONSTRUCTION. Transform and opacity only, on cells laid out at full
 * size from the start, so nothing ever resizes the card. One timeout schedule; `requestAnimationFrame` runs only for the 400ms of each
 * count. Stops when the tab is hidden or the card is off screen; every timer
 * is cleared on unmount.
 *
 * SCREEN READERS READ THE MONTH, NOT THE COUNT: each order is its item and
 * place, and its chip; the moving figures are `aria-hidden` beside still
 * copies.
 *
 * A MONTH AT ONE PLACE (§36, `monthFor(venueId)`) is the same object: one with a
 * `thumb` is the item's photograph filling the day instead of a collar.
 *
 * GIVEN two `places` (§40), the card offers them under its head. A switch shows
 * the new month whole, counts "You saved" across from what it read, holds,
 * and the loop begins again on the new month.
 *
 * AN AMOUNT (§48) replays: the loop starts over from an empty month on the
 * new orders after a short rest. A long month lands faster, so any month
 * fills in about the same ten seconds.
 */
const OPEN = 1200;
const REOPEN = 360;
const GAP = 900;
const FILL = 9900;
const ENTER = 280;
const COUNT = 400;
const HOLD = 3200;
const LEAVE = 240;

export default function MonthCalendar({ places }: { places: MonthPlace[] }) {
  const card = useRef<HTMLDivElement>(null);
  const headId = useId();
  const sw = useMonthSwitch(places, card);
  const month = sw.shown;

  /* Layout, not a passive effect: the emptied state has to be in place before
     the first paint, or the finished month flashes and then clears. */
  useLayoutEffect(() => {
    const el = card.current;
    if (!el || !month) return;
    const cells = [...el.querySelectorAll<HTMLElement>(".mc-order")];
    const foot = el.querySelector<HTMLElement>(".mc-foot");
    const net = el.querySelector<HTMLElement>(".mc-net-fig");
    const spent = el.querySelector<HTMLElement>(".mc-spent");
    const creditFig = el.querySelector<HTMLElement>(".mc-part-credit b");
    const creditN = el.querySelector<HTMLElement>(".mc-part-credit .mc-part-n");
    const pctFig = el.querySelector<HTMLElement>(".mc-part-pct b");
    const pctN = el.querySelector<HTMLElement>(".mc-part-pct .mc-part-n");
    if (!foot || !net || !spent) return;
    const { startCents, runningCents, runningSpent } = month;
    const { runningCredit, runningCredits, runningPercent, runningPercents } = month;
    const last = runningCents.length - 1;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    /* Set when this month replaced another: what "You saved" read then. */
    const before = sw.from.current;
    sw.from.current = null;
    const replaying = sw.replay.current;
    sw.replay.current = false;
    const gap = Math.min(GAP, Math.floor(FILL / Math.max(1, runningCents.length)));

    const timers = new Set<number>();
    let raf = 0;
    let running = false;
    let onScreen = false;
    let dirty = false;

    const later = (ms: number, fn: () => void) => {
      const t = window.setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };
    const halt = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
    };
    /* The foot at step k: −1 is the head of the month, before any order.
       Ahead means above zero — the count can land a frame on $0.00, and
       "You're ahead" beside it would be a cent from true. */
    const netAt = (k: number) => (k < 0 ? startCents : runningCents[k]);
    const spentAt = (k: number) => (k < 0 ? 0 : runningSpent[k]);
    const at = (xs: number[], k: number) => (k < 0 ? 0 : xs[k]);
    /* Both moving figures, `e` of the way from step `from` to step `to`; the
       net can start from a figure of its own (a switch's old month). */
    const write = (from: number, to: number, e = 1, net0 = netAt(from)) => {
      const mix = (a: number, b: number) => Math.round(a + (b - a) * e);
      const c = mix(net0, netAt(to));
      net.textContent = signedDollars(c);
      sw.net.current = c;
      spent.textContent = dollars(mix(spentAt(from), spentAt(to)));
      foot.classList.toggle("is-ahead", c > 0);
      /* The breakdown counts with them; a count steps as its order lands. */
      const k = e > 0 ? to : from;
      if (creditFig) creditFig.textContent = `+${dollars(mix(at(runningCredit, from), at(runningCredit, to)))}`;
      if (creditN) creditN.textContent = `× ${at(runningCredits, k)}`;
      if (pctFig) pctFig.textContent = `+${dollars(mix(at(runningPercent, from), at(runningPercent, to)))}`;
      if (pctN) pctN.textContent = `× ${at(runningPercents, k)}`;
    };
    const count = (from: number, to: number, net0?: number, ms = COUNT) => {
      if (raf) cancelAnimationFrame(raf);
      const t0 = performance.now();
      const tick = (now: number) => {
        /* A frame's timestamp can precede the t0 taken when it was asked
           for; clamped at 0 so the first frame never dips past `from`. */
        const p = Math.max(0, Math.min(1, (now - t0) / ms));
        write(from, to, easeOut(p), net0);
        raf = p < 1 ? requestAnimationFrame(tick) : 0;
      };
      raf = requestAnimationFrame(tick);
    };
    /* Back to the head of a cycle: an empty month, the membership owed. The
       orders snap back to their start while they are invisible. */
    const reset = () => {
      el.removeAttribute("data-out");
      cells.forEach((c) => c.classList.remove("is-in"));
      write(-1, -1);
      dirty = false;
    };
    const cycle = (open = OPEN) => {
      reset();
      runningCents.forEach((_, k) => {
        later(open + gap * k, () => {
          dirty = true;
          cells[k]?.classList.add("is-in");
          later(ENTER, () => count(k - 1, k, undefined, Math.min(COUNT, gap)));
        });
      });
      const settled = open + gap * (runningCents.length - 1) + ENTER + Math.min(COUNT, gap);
      later(settled + HOLD, () => {
        el.setAttribute("data-out", "");
        later(LEAVE, () => cycle());
      });
    };
    /* After a switch: the new month whole, "You saved" counted across from
       the old figure, a hold, then the loop from the top. */
    const arrive = (c0: number) => {
      running = true;
      dirty = true;
      el.setAttribute("data-run", "");
      el.removeAttribute("data-out");
      /* In place at once: the card's crossfade is the entrance, not a pop. */
      cells.forEach((c) => {
        c.style.transition = "none";
        c.classList.add("is-in");
      });
      void el.offsetHeight;
      cells.forEach((c) => (c.style.transition = ""));
      write(last, last, 0, c0);
      count(last, last, c0, TALLY);
      later(TALLY + HOLD, () => {
        el.setAttribute("data-out", "");
        later(LEAVE, () => cycle());
      });
    };
    const play = () => {
      if (running) return;
      running = true;
      el.setAttribute("data-run", "");
      /* Resumed mid-cycle: leave the way a cycle leaves, then begin one. */
      if (dirty) {
        el.setAttribute("data-out", "");
        later(LEAVE, () => cycle());
      } else cycle();
    };
    /* The complete month, as the markup drew it: without `data-run` nothing
       is hidden, whatever classes the loop left behind. */
    const settle = () => {
      halt();
      el.removeAttribute("data-run");
      el.removeAttribute("data-out");
      write(last, last);
      dirty = true;
    };
    const decide = () => {
      if (still(el)) return settle();
      if (!el.hasAttribute("data-run")) {
        el.setAttribute("data-run", "");
        reset();
      }
      if (document.visibilityState === "visible" && onScreen) play();
      else halt();
    };

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      decide();
    });
    io.observe(el);
    reduce.addEventListener("change", decide);
    document.addEventListener("visibilitychange", decide);
    if (still(el)) decide();
    else if (before !== null) arrive(before);
    /* An amount: from empty at once, the card's own rest shortened. */
    else if (replaying) {
      running = true;
      el.setAttribute("data-run", "");
      cycle(REOPEN);
    } else decide();

    return () => {
      halt();
      io.disconnect();
      reduce.removeEventListener("change", decide);
      document.removeEventListener("visibilitychange", decide);
    };
  }, [month, sw.from, sw.net, sw.replay]);

  if (!month) return null;
  const at = new Map(month.orders.map((o, k) => [`${o.week}:${o.day}`, k]));

  return (
    <div className="mc" data-lit="" ref={card} role="group" aria-labelledby={headId}>
      {/* Every head the card can show in one cell, the shown one visible: the
          top holds the tallest, so the controls never move under a finger. */}
      <div className="mc-heads">
        {sw.heads.map((h) => (
          <p
            key={h}
            className={h === month.head ? "mc-head" : "mc-head mc-ghost"}
            id={h === month.head ? headId : undefined}
            aria-hidden={h === month.head ? undefined : "true"}
          >
            {h}
          </p>
        ))}
      </div>
      <MonthControls sw={sw} />
      {/* DECLUTTERED (Sam, 23 Sep 2026: "slightly too busy … we could remove the
          text right beneath the toggle"): the toggle names the places, so the
          sub only shows where there is no toggle. */}
      {sw.on ? null : <p className="mc-sub">{month.sub}</p>}

      <div className="mc-grid">
        <span className="mc-corner" aria-hidden="true" />
        {month.days.map((d, i) => (
          <span key={`d${i}`} className="mc-dow" aria-hidden="true">
            {d}
          </span>
        ))}
        {month.weeks.map((w, wk) => (
          <Fragment key={w}>
            <span className="mc-week">{w}</span>
            {month.days.map((_, day) => {
              const k = at.get(`${wk}:${day}`);
              const o = k === undefined ? undefined : month.orders[k];
              return o?.thumb !== undefined ? (
                <span key={`${wk}:${day}`} className="mc-day">
                  {/* The item's own photograph, filling the day: no brand
                      colour, a hairline ring at the day's radius. */}
                  <span className="mc-order mc-thumb">
                    <img
                      className="mc-img"
                      src={o.thumb}
                      alt={`${o.item} at ${o.venue}`}
                      decoding="async"
                    />
                    {o.chip !== "pts" ? <b className="mc-chip">{o.chip}</b> : null}
                  </span>
                </span>
              ) : o ? (
                <span key={`${wk}:${day}`} className="mc-day">
                  {/* The venue's collar, filling the day: brand colour
                      round the mark, the seat hairline by the mark's field. */}
                  <span
                    className="mc-order collar"
                    data-field={o.field}
                    style={{ ["--brand" as string]: o.brand }}
                  >
                    <img
                      className="mc-img"
                      src={o.img}
                      alt={`${o.item} at ${o.venue}`}
                      decoding="async"
                    />
                    {o.chip !== "pts" ? <b className="mc-chip">{o.chip}</b> : null}
                  </span>
                </span>
              ) : (
                <span key={`${wk}:${day}`} className="mc-day" aria-hidden="true" />
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* No order line under the grid (Sam: "not sure this is necessary"): the
          day's picture and chip already say what was bought and what it earned. */}

      {/* SPEND A LITTLE, SAVE A LOT (§42, §56): what the month cost, then the
          saved tile — what the $5 credits and the 15% brought back (Sam, 24 Sep
          2026: "i liked that breakdown"), and "You saved" after the membership. */}
      <div className={`mc-foot${month.netCents > 0 ? " is-ahead" : ""}`}>
        <p className="mc-row">
          <span className="mc-ahead">You spent</span>
          <b className="mc-fig mc-spent" aria-hidden="true">
            {dollars(month.spentCents)}
          </b>
          <span className="sr-only">{dollars(month.spentCents)}</span>
        </p>
        <div className="mc-save">
          <ul className="mc-parts">
            <li className="mc-part mc-part-credit">
              <span>
                ${BENEFIT.creditUsd} credit{" "}
                <i className="mc-part-n" aria-hidden="true">
                  × {month.credits}
                </i>
              </span>
              <b aria-hidden="true">+{dollars(month.creditCents)}</b>
              <span className="sr-only">
                , {month.credits} {month.credits === 1 ? "time" : "times"}: {dollars(month.creditCents)}
              </span>
            </li>
            {/* No 15% row in a month of credits alone (§58). */}
            {month.percents ? (
              <li className="mc-part mc-part-pct">
                <span>
                  {Math.round(BENEFIT.percentOff * 100)}% off{" "}
                  <i className="mc-part-n" aria-hidden="true">
                    × {month.percents}
                  </i>
                </span>
                <b aria-hidden="true">+{dollars(month.percentCents)}</b>
                <span className="sr-only">
                  , {month.percents} {month.percents === 1 ? "order" : "orders"}: {dollars(month.percentCents)}
                </span>
              </li>
            ) : null}
          </ul>
          <p className="mc-net">
            <span className="mc-ahead">You saved</span>
            <b className="mc-net-fig" aria-hidden="true">
              {signedDollars(month.netCents)}
            </b>
            <span className="sr-only">{signedDollars(month.netCents)}</span>
            <span className="mc-after">after the {dollars(month.planCents)} membership</span>
          </p>
        </div>
      </div>
    </div>
  );
}
