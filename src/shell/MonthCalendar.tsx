import { Fragment, useId, useLayoutEffect, useRef } from "react";
import { runFigure, signedDollars, type Month } from "../model/month";

/**
 * THE CALENDAR — a month on the membership, filling itself
 * (docs/POLISH-2026-09-21.md §21). The pitch's own claim, "$5 credit every
 * week, at every place you already go", shown happening: four weeks, each
 * order the venue's own mark in its day with a `+$5` chip, a line naming the
 * item and the place, and a foot that counts the membership against the
 * credit. Desktop only, over the mosaic: below 1024 it is not mounted.
 *
 * THE ENGINE IS THE COFFEEHOLICS LEDGER'S (§17/§20, SavingsLedger.tsx), kept
 * in step with it on purpose: the foot rests on −$4.99 for 1.2s, then the
 * orders arrive 900ms apart in the order they happened (opacity and a .92
 * scale, 280ms, the house ease); as each lands the foot counts to its new
 * total over 400ms. While it is owed it is `--ink-3` and unlabelled; past zero
 * it takes `--ink-1` and "You're ahead" fades in. It holds 3.2s, the month
 * fades out together over 240ms and begins again (≈13s a cycle).
 *
 * THE MARKUP IS THE FINISHED MONTH. Every order in its day, the last one
 * named, the foot at its net. `data-run` is what empties it for the loop and
 * only the script sets it, so a failed script, reduced motion or a
 * `data-still` ancestor all get the complete, still month.
 *
 * CHEAP BY CONSTRUCTION. Transform and opacity only, on cells laid out at full
 * size from the start; the latest line is every line stacked in one grid cell
 * and shown one at a time, so a two-line basket never resizes the card. One
 * timeout schedule; `requestAnimationFrame` runs only for the 400ms of each
 * count. Stops when the tab is hidden or the card is off screen; every timer
 * is cleared on unmount.
 *
 * SCREEN READERS READ THE MONTH, NOT THE COUNT: each order is its item and
 * place, and its chip; the moving figures are `aria-hidden` beside still
 * copies.
 *
 * A MONTH AT ONE PLACE (§36, `monthAt`) is the same object: an order with a
 * `thumb` is the item's photograph filling the day instead of a collar, and
 * the foot is however many rows the model gives, every moving one counted
 * together as each order lands.
 */
const OPEN = 1200;
const GAP = 900;
const ENTER = 280;
const COUNT = 400;
const HOLD = 3200;
const LEAVE = 240;

export default function MonthCalendar({ month }: { month: Month }) {
  const card = useRef<HTMLDivElement>(null);
  const headId = useId();

  /* Layout, not a passive effect: the emptied state has to be in place before
     the first paint, or the finished month flashes and then clears. */
  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return;
    const cells = [...el.querySelectorAll<HTMLElement>(".mc-order")];
    const lines = [...el.querySelectorAll<HTMLElement>(".mc-line")];
    const foot = el.querySelector<HTMLElement>(".mc-foot");
    const net = el.querySelector<HTMLElement>(".mc-net-fig");
    const figs = [...el.querySelectorAll<HTMLElement>(".mc-run-fig")];
    const runs = month.rows.flatMap((r) => (r.run ? [r.run] : []));
    if (!foot || !net || figs.length !== runs.length) return;
    const { startCents, runningCents } = month;
    const last = runningCents.length - 1;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

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
    const runAt = (r: (typeof runs)[number], k: number) => (k < 0 ? r.start : r.running[k]);
    /* Every moving figure, `e` of the way from step `from` to step `to`. */
    const write = (from: number, to: number, e = 1) => {
      const mix = (a: number, b: number) => Math.round(a + (b - a) * e);
      const c = mix(netAt(from), netAt(to));
      net.textContent = signedDollars(c);
      runs.forEach((r, i) => {
        figs[i].textContent = runFigure(r.unit, mix(runAt(r, from), runAt(r, to)));
      });
      foot.classList.toggle("is-ahead", c > 0);
    };
    const count = (from: number, to: number) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        /* A frame's timestamp can precede the t0 taken when it was asked
           for; clamped at 0 so the first frame never dips past `from`. */
        const p = Math.max(0, Math.min(1, (now - t0) / COUNT));
        write(from, to, 1 - Math.pow(1 - p, 3));
        raf = p < 1 ? requestAnimationFrame(tick) : 0;
      };
      raf = requestAnimationFrame(tick);
    };
    /* Line 0 is the empty state; line k + 1 names order k. */
    const show = (k: number) => lines.forEach((l, i) => l.classList.toggle("is-now", i === k));
    /* Back to the head of a cycle: an empty month, the membership owed. The
       orders snap back to their start while they are invisible. */
    const reset = () => {
      el.removeAttribute("data-out");
      cells.forEach((c) => c.classList.remove("is-in"));
      show(0);
      write(-1, -1);
      dirty = false;
    };
    const cycle = () => {
      reset();
      runningCents.forEach((_, k) => {
        later(OPEN + GAP * k, () => {
          dirty = true;
          cells[k]?.classList.add("is-in");
          show(k + 1);
          later(ENTER, () => count(k - 1, k));
        });
      });
      const settled = OPEN + GAP * (runningCents.length - 1) + ENTER + COUNT;
      later(settled + HOLD, () => {
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
    decide();

    return () => {
      halt();
      io.disconnect();
      reduce.removeEventListener("change", decide);
      document.removeEventListener("visibilitychange", decide);
    };
  }, [month]);

  const latest = month.orders.length - 1;
  const at = new Map(month.orders.map((o, k) => [`${o.week}:${o.day}`, k]));

  return (
    <div className="mc" data-lit="" ref={card} role="group" aria-labelledby={headId}>
      <p className="mc-head" id={headId}>
        {month.head}
      </p>
      <p className="mc-sub">{month.sub}</p>

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
                    <b className="mc-chip">{o.chip}</b>
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
                    <b className="mc-chip">{o.chip}</b>
                  </span>
                </span>
              ) : (
                <span key={`${wk}:${day}`} className="mc-day" aria-hidden="true" />
              );
            })}
          </Fragment>
        ))}
      </div>

      <div className="mc-latest">
        <p className="mc-line" aria-hidden="true">
          {month.empty}
        </p>
        {month.orders.map((o, k) => (
          <p
            key={o.id}
            className={k === latest ? "mc-line is-last" : "mc-line"}
            aria-hidden={k === latest ? undefined : "true"}
          >
            <b>{o.item}</b>
            {o.at}
          </p>
        ))}
      </div>

      <div className={`mc-foot${month.netCents > 0 ? " is-ahead" : ""}`}>
        {month.rows.map((r) => (
          <p key={r.what} className="mc-row">
            <span>{r.what}</span>
            {r.run ? (
              <>
                <b className="mc-fig mc-run-fig" aria-hidden="true">
                  {r.figure}
                </b>
                <span className="sr-only">{r.figure}</span>
              </>
            ) : (
              <b className="mc-fig">{r.figure}</b>
            )}
          </p>
        ))}
        <p className="mc-net">
          <span className="mc-ahead">You're ahead</span>
          <b className="mc-net-fig" aria-hidden="true">
            {signedDollars(month.netCents)}
          </b>
          <span className="sr-only">{signedDollars(month.netCents)}</span>
        </p>
      </div>
    </div>
  );
}
