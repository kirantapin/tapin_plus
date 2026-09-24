import { Fragment, useId, useLayoutEffect, useRef } from "react";
import { dollars, signedDollars, type Month } from "../model/month";
import { MonthSegments, TALLY, easeOut, useMonthSwitch, type MonthChoice } from "./MonthSwitch";

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
 * A MONTH AT ONE PLACE (§36, `monthAt`) is the same object: an order with a
 * `thumb` is the item's photograph filling the day instead of a collar.
 *
 * GIVEN `choices` (§40), the card offers them under its head. A switch shows
 * the new month whole, counts "You saved" across from what it read, holds,
 * and the loop begins again on the new month.
 */
const OPEN = 1200;
const GAP = 900;
const ENTER = 280;
const COUNT = 400;
const HOLD = 3200;
const LEAVE = 240;

export default function MonthCalendar({
  month: given,
  choices,
}: {
  month: Month;
  choices?: MonthChoice[];
}) {
  const card = useRef<HTMLDivElement>(null);
  const headId = useId();
  const sw = useMonthSwitch(given, choices, card);
  const month = sw.shown;

  /* Layout, not a passive effect: the emptied state has to be in place before
     the first paint, or the finished month flashes and then clears. */
  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return;
    const cells = [...el.querySelectorAll<HTMLElement>(".mc-order")];
    const foot = el.querySelector<HTMLElement>(".mc-foot");
    const net = el.querySelector<HTMLElement>(".mc-net-fig");
    const spent = el.querySelector<HTMLElement>(".mc-spent");
    if (!foot || !net || !spent) return;
    const { startCents, runningCents, runningSpent } = month;
    const last = runningCents.length - 1;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    /* Set when this month replaced another: what "You saved" read then. */
    const before = sw.from.current;
    sw.from.current = null;

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
    /* Both moving figures, `e` of the way from step `from` to step `to`; the
       net can start from a figure of its own (a switch's old month). */
    const write = (from: number, to: number, e = 1, net0 = netAt(from)) => {
      const mix = (a: number, b: number) => Math.round(a + (b - a) * e);
      const c = mix(net0, netAt(to));
      net.textContent = signedDollars(c);
      sw.net.current = c;
      spent.textContent = dollars(mix(spentAt(from), spentAt(to)));
      foot.classList.toggle("is-ahead", c > 0);
    };
    const count = (from: number, to: number, net0?: number, ms = COUNT) => {
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
    const cycle = () => {
      reset();
      runningCents.forEach((_, k) => {
        later(OPEN + GAP * k, () => {
          dirty = true;
          cells[k]?.classList.add("is-in");
          later(ENTER, () => count(k - 1, k));
        });
      });
      const settled = OPEN + GAP * (runningCents.length - 1) + ENTER + COUNT;
      later(settled + HOLD, () => {
        el.setAttribute("data-out", "");
        later(LEAVE, cycle);
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
        later(LEAVE, cycle);
      });
    };
    const play = () => {
      if (running) return;
      running = true;
      el.setAttribute("data-run", "");
      /* Resumed mid-cycle: leave the way a cycle leaves, then begin one. */
      if (dirty) {
        el.setAttribute("data-out", "");
        later(LEAVE, cycle);
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
      if (reduce.matches || el.closest("[data-still]")) return settle();
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
    if (before !== null && !reduce.matches && !el.closest("[data-still]")) arrive(before);
    else decide();

    return () => {
      halt();
      io.disconnect();
      reduce.removeEventListener("change", decide);
      document.removeEventListener("visibilitychange", decide);
    };
  }, [month, sw.from, sw.net]);

  const at = new Map(month.orders.map((o, k) => [`${o.week}:${o.day}`, k]));

  return (
    <div className="mc" data-lit="" ref={card} role="group" aria-labelledby={headId}>
      {sw.on ? (
        /* Every choice's head in one cell, the shown one visible: the card's
           top holds the tallest, so the control never moves under a finger. */
        <div className="mc-heads">
          {sw.options.map((c) => (
            <p
              key={c.id}
              className={c.id === sw.shownId ? "mc-head" : "mc-head mc-ghost"}
              id={c.id === sw.shownId ? headId : undefined}
              aria-hidden={c.id === sw.shownId ? undefined : "true"}
            >
              {c.month.head}
            </p>
          ))}
        </div>
      ) : (
        <p className="mc-head" id={headId}>
          {month.head}
        </p>
      )}
      {sw.on ? <MonthSegments options={sw.options} pick={sw.pick} onPick={sw.choose} /> : null}
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

      {/* SPEND A LITTLE, SAVE A LOT (§42, §42.2): what the month cost, what it
          brought back after the membership, and the points, quietly. Colour
          only on the two money figures; the chips carry the breakdown. */}
      <div className={`mc-foot${month.netCents > 0 ? " is-ahead" : ""}`}>
        <p className="mc-row">
          <span className="mc-ahead">You spent</span>
          <b className="mc-fig mc-spent" aria-hidden="true">
            {dollars(month.spentCents)}
          </b>
          <span className="sr-only">{dollars(month.spentCents)}</span>
        </p>
        <p className="mc-net">
          <span className="mc-ahead">You saved</span>
          <b className="mc-net-fig" aria-hidden="true">
            {signedDollars(month.netCents)}
          </b>
          <span className="sr-only">{signedDollars(month.netCents)}</span>
          <span className="mc-after">after the {dollars(month.planCents)} membership</span>
        </p>
        {month.points ? (
          <p className="mc-points">
            Plus {month.points.toLocaleString("en-US")} points toward free items
          </p>
        ) : null}
      </div>
    </div>
  );
}
