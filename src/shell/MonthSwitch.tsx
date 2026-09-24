import { useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { monthFor } from "../model/month";

/**
 * WHICH PLACES, AND HOW MUCH (docs/POLISH-2026-09-21.md §40, §48): the two
 * questions a month card asks, and the change between answers. A place
 * crossfades and "You saved" counts across; an amount empties the month and
 * the card plays it again. Either way the card's height glides, never jumps.
 */
export interface MonthPlace {
  id: string;
  label: string;
  /** A venue id, or "all" (§48's `monthFor` scope). */
  scope: string;
}

/** A month's spend to choose from, in cents; $50 until one is chosen (§48). */
export const AMOUNTS = [2500, 5000, 10000, 20000];
const AMOUNT = 5000;

const OUT = 160;
const IN = 200;
const FLIP = 240;
/** "You saved", old figure to new. */
export const TALLY = 400;

/** Reduced motion, or a `data-still` ancestor: no motion, the month whole. */
export const still = (el: Element) =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches || !!el.closest("[data-still]");

/** The count's curve, the house ease-out. */
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

type Kind = "data-swap" | "data-replay";

export function useMonthSwitch(places: MonthPlace[], card: RefObject<HTMLElement>) {
  const options = places.filter((p) => monthFor(p.scope, AMOUNT) !== null);
  const on = options.length >= 2;
  const [pick, setPick] = useState(options[0]?.id ?? "");
  const [amount, setAmount] = useState(AMOUNT);
  const [at, setAt] = useState({ place: pick, amount: AMOUNT });
  const place = options.find((p) => p.id === at.place) ?? options[0];
  const shown = place ? monthFor(place.scope, at.amount) : null;
  /** Every head the card can show, stacked, so the tallest holds the line. */
  const heads = [...new Set(options.flatMap((p) => AMOUNTS.map((a) => monthFor(p.scope, a)?.head ?? "")))].filter(Boolean);
  /** What "You saved" reads now; whoever writes the figure keeps it. */
  const net = useRef(shown?.netCents ?? 0);
  /** A place switch: what "You saved" read, for the count; null at rest. */
  const from = useRef<number | null>(null);
  /** An amount: the card plays the new month from empty; false at rest. */
  const replay = useRef(false);
  const kind = useRef<Kind>("data-swap");
  const first = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  const settle = (el: HTMLElement) => {
    el.removeAttribute("data-swap");
    el.removeAttribute("data-replay");
    el.style.height = "";
    el.style.transition = "";
  };

  const go = (p: string, a: number) => {
    const el = card.current;
    if (!el || (p === pick && a === amount)) return;
    setPick(p);
    setAmount(a);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (still(el)) {
      settle(el);
      replay.current = a !== at.amount;
      setAt({ place: p, amount: a });
      return;
    }
    /* Back to the month still showing, before the swap: fade it back in. */
    if (p === at.place && a === at.amount) {
      (["data-swap", "data-replay"] as Kind[]).forEach((k) => el.hasAttribute(k) && el.setAttribute(k, "in"));
      later(IN, () => settle(el));
      return;
    }
    const k: Kind = a !== at.amount ? "data-replay" : "data-swap";
    el.setAttribute(k, "out");
    /* Styled now, so the fade and the timer start together. */
    void el.offsetHeight;
    later(OUT, () => {
      first.current = el.getBoundingClientRect().height;
      kind.current = k;
      if (k === "data-replay") replay.current = true;
      else from.current = net.current;
      setAt({ place: p, amount: a });
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
    el.removeAttribute(kind.current === "data-swap" ? "data-replay" : "data-swap");
    el.setAttribute(kind.current, "in");
    el.style.height = `${h0}px`;
    void el.offsetHeight;
    el.style.transition = `height ${FLIP}ms var(--ease)`;
    el.style.height = `${h1}px`;
    later(Math.max(FLIP, IN), () => settle(el));
  }, [at, card]);

  useLayoutEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  return {
    on,
    options,
    pick,
    choose: (id: string) => go(id, amount),
    amount,
    chooseAmount: (a: number) => go(pick, a),
    shown,
    heads,
    net,
    from,
    replay,
  };
}

/** A row of radios: arrows move and choose, one stop in the tab order. The
 *  place toggle (`.mcs`) slides a thumb by `--at`; the amounts (`.mca`) fill. */
export function MonthRadios({
  options,
  pick,
  onPick,
  label,
  className,
}: {
  options: { id: string; label: string }[];
  pick: string;
  onPick: (id: string) => void;
  label: string;
  className: string;
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
      className={className}
      role="radiogroup"
      aria-label={label}
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
          className={`${className}-opt`}
          onClick={() => onPick(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

/** The card's two questions, in order: where (when there is a choice), then
 *  how much. */
export function MonthControls({ sw }: { sw: ReturnType<typeof useMonthSwitch> }) {
  return (
    <>
      {sw.on ? (
        <MonthRadios className="mcs" label="Which places" options={sw.options} pick={sw.pick} onPick={sw.choose} />
      ) : null}
      <MonthRadios
        className="mca"
        label="How much you spend a month"
        options={AMOUNTS.map((a) => ({ id: String(a), label: `$${a / 100}` }))}
        pick={String(sw.amount)}
        onPick={(id) => sw.chooseAmount(Number(id))}
      />
    </>
  );
}
