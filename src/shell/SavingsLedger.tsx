import { useId, useLayoutEffect, useRef } from "react";
import { signedDollars, type MonthLedger } from "../model/campaign";

/**
 * THE MONTH LEDGER — a receipt that fills itself (docs/POLISH-2026-09-21.md §17).
 *
 * The one thing on the Coffeeholics page that is a SEQUENCE: the same $5
 * arriving every week against one membership. So it is the one thing that
 * moves. Rows 1–4 arrive 900ms apart (280ms, a 12px rise, the house ease);
 * as each lands the foot counts to its new total over 400ms, from −$4.99
 * through zero — that crossing is the message, and "You're ahead" arrives
 * with it. The foot holds 3.2s, the weeks fade out together over 240ms, and
 * it starts again with the membership already in place.
 *
 * THE MARKUP IS THE FINISHED LEDGER. Every row visible, the foot at its net.
 * `data-run` is what hides the weeks for the loop, and only the script sets
 * it — so a failed script, `still`, `prefers-reduced-motion: reduce` or a
 * `data-still` ancestor all get the complete, still receipt for free.
 *
 * CHEAP BY CONSTRUCTION. Transform and opacity only, on rows laid out at full
 * size from the start, so the card never changes size. One timeout schedule;
 * `requestAnimationFrame` runs only for the 400ms of each count and never
 * during the hold. The loop stops when the tab is hidden or the card is off
 * screen, and every timer is cleared on unmount.
 *
 * SCREEN READERS READ THE RECEIPT, NOT THE COUNT. Opacity does not hide a row
 * from assistive tech, so every row is always read; the moving figure is
 * `aria-hidden` and a still copy of the net stands in for it.
 */
const RISE_GAP = 900;
const ENTER = 280;
const COUNT = 400;
const HOLD = 3200;
const LEAVE = 240;

export default function SavingsLedger({
  ledger,
  still = false,
}: {
  ledger: MonthLedger;
  /** Complete and never animated — the phone's placement. */
  still?: boolean;
}) {
  const card = useRef<HTMLDivElement>(null);
  const net = useRef<HTMLElement>(null);
  const headId = useId();

  /* Layout, not a passive effect: the hidden-weeks state has to be in place
     before the first paint, or the finished receipt flashes and then empties. */
  useLayoutEffect(() => {
    const el = card.current;
    const fig = net.current;
    if (still || !el || !fig) return;
    const rows = [...el.querySelectorAll<HTMLElement>(".ml-row.is-week")];
    const ahead = el.querySelector<HTMLElement>(".ml-ahead");
    const { startCents, runningCents, netCents } = ledger;
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
    const write = (c: number) => {
      fig.textContent = signedDollars(c);
      if (c >= 0) ahead?.classList.add("is-in");
    };
    const count = (from: number, to: number) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / COUNT);
        write(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
        raf = p < 1 ? requestAnimationFrame(tick) : 0;
      };
      raf = requestAnimationFrame(tick);
    };
    /* Back to the head of a cycle: the membership alone, the foot owed. The
       weeks snap to their start position while they are invisible. */
    const reset = () => {
      el.removeAttribute("data-out");
      rows.forEach((r) => r.classList.remove("is-in"));
      ahead?.classList.remove("is-in");
      write(startCents);
      dirty = false;
    };
    const cycle = () => {
      reset();
      runningCents.forEach((to, k) => {
        later(RISE_GAP * (k + 1), () => {
          dirty = true;
          rows[k]?.classList.add("is-in");
          later(ENTER, () => count(k ? runningCents[k - 1] : startCents, to));
        });
      });
      const settled = RISE_GAP * runningCents.length + ENTER + COUNT;
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
    /* The complete receipt, as the markup drew it: without `data-run` no
       row or label is hidden, whatever classes the loop left on them. */
    const settle = () => {
      halt();
      el.removeAttribute("data-run");
      el.removeAttribute("data-out");
      write(netCents);
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
  }, [ledger, still]);

  return (
    <div className="ml" ref={card} role="group" aria-labelledby={headId}>
      <p className="ml-head" id={headId}>
        {ledger.head}
      </p>
      <ul className="ml-rows">
        <li className="ml-row">
          <span className="ml-what">{ledger.plan.what}</span>
          <b className="ml-fig">{ledger.plan.figure}</b>
        </li>
        {ledger.weeks.map((w) => (
          <li key={w.id} className="ml-row is-week">
            <span className="ml-what">{w.what}</span>
            <span className="ml-basket">{w.basket}</span>
            <b className="ml-fig">{w.figure}</b>
          </li>
        ))}
      </ul>
      <p className="ml-foot">
        <span className="ml-ahead">You're ahead</span>
        <b className="ml-net" ref={net} aria-hidden="true">
          {signedDollars(ledger.netCents)}
        </b>
        <span className="sr-only">{signedDollars(ledger.netCents)}</span>
      </p>
    </div>
  );
}
