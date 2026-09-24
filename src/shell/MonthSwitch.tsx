import { useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import type { Month } from "../model/month";

/**
 * ONE MONTH OR ANOTHER (docs/POLISH-2026-09-21.md §40): the choice a month
 * card offers when given two or more, and the switch between them. The old
 * rows fade out, the new month lands, the card's height glides to its own and
 * the rows fade in; "You saved" counts across (each card does its own).
 */
export interface MonthChoice {
  id: string;
  label: string;
  month: Month | null;
}
type Ready = MonthChoice & { month: Month };

const OUT = 160;
const IN = 200;
const FLIP = 240;
/** "You saved", old figure to new. */
export const TALLY = 400;

const still = (el: Element) =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches || !!el.closest("[data-still]");

/** The count's curve, the house ease-out. */
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

export function useMonthSwitch(
  month: Month,
  choices: MonthChoice[] | undefined,
  card: RefObject<HTMLElement>,
) {
  const options = (choices ?? []).filter((c): c is Ready => c.month !== null);
  const on = options.length >= 2;
  const [pick, setPick] = useState(options[0]?.id ?? "");
  const [shownId, setShownId] = useState(pick);
  const shown = (on && options.find((c) => c.id === shownId)?.month) || month;
  /** What "You saved" reads now; whoever writes the figure keeps it. */
  const net = useRef(shown.netCents);
  /** What it read when the month changed, for the count; null at rest. */
  const from = useRef<number | null>(null);
  const first = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  const settle = (el: HTMLElement) => {
    el.removeAttribute("data-swap");
    el.style.height = "";
    el.style.transition = "";
  };

  const choose = (id: string) => {
    const el = card.current;
    if (id === pick || !el) return;
    setPick(id);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (still(el)) {
      settle(el);
      setShownId(id);
      return;
    }
    /* Back to the month still showing, before the swap: fade it back in. */
    if (id === shownId) {
      el.setAttribute("data-swap", "in");
      later(IN, () => settle(el));
      return;
    }
    el.setAttribute("data-swap", "out");
    /* Styled now, so the fade and the timer start together. */
    void el.offsetHeight;
    later(OUT, () => {
      first.current = el.getBoundingClientRect().height;
      from.current = net.current;
      setShownId(id);
    });
  };

  /* FLIP on the height: the old height, the new month's own, and a glide
     between them, so what sits below the card moves with it, never jumps. */
  useLayoutEffect(() => {
    const el = card.current;
    const h0 = first.current;
    first.current = null;
    if (!el || h0 === null) return;
    el.style.transition = "none";
    el.style.height = "";
    const h1 = el.getBoundingClientRect().height;
    el.setAttribute("data-swap", "in");
    el.style.height = `${h0}px`;
    void el.offsetHeight;
    el.style.transition = `height ${FLIP}ms var(--ease)`;
    el.style.height = `${h1}px`;
    later(Math.max(FLIP, IN), () => settle(el));
  }, [shownId, card]);

  useLayoutEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  return { on, options, pick, choose, shown, shownId, net, from };
}

/** A two-option segmented control, as a radio group: arrows move and choose,
 *  one stop in the tab order. The chosen cell is the track's white thumb. */
export function MonthSegments({
  options,
  pick,
  onPick,
}: {
  options: MonthChoice[];
  pick: string;
  onPick: (id: string) => void;
}) {
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const at = Math.max(0, options.findIndex((c) => c.id === pick));
  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = options.length;
    const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
    const to = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : step ? (at + step + n) % n : -1;
    if (to < 0) return;
    e.preventDefault();
    onPick(options[to].id);
    cells.current[to]?.focus();
  };
  return (
    <div
      className="mcs"
      role="radiogroup"
      aria-label="Which places"
      onKeyDown={move}
      style={{ ["--n" as string]: options.length, ["--at" as string]: at }}
    >
      {options.map((c, k) => (
        <button
          key={c.id}
          ref={(b) => {
            cells.current[k] = b;
          }}
          type="button"
          role="radio"
          aria-checked={k === at}
          tabIndex={k === at ? 0 : -1}
          className="mcs-opt"
          onClick={() => onPick(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
