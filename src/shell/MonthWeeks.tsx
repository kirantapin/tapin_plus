import { useLayoutEffect, useRef, type Ref } from "react";
import type { Month, MonthOrder } from "../model/month";
import { dollars, signedDollars } from "../model/month";
import { MonthSegments, TALLY, easeOut, still, useMonthSwitch, type MonthChoice } from "./MonthSwitch";

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
 *
 * IT PLAYS ONCE (§41). The first time the card is 40% in view the weeks land
 * 520ms apart: the tiles left to right (.92 to full, 240ms, 50ms apart), then
 * the week's two figures count up from $0.00 over 360ms, and the foot's two
 * count on with them, both from $0.00 in their own colours. "You saved"
 * climbs by each week's share of what the month brought back, so it ends on
 * the model's figure after the membership and never dips below zero. Then it
 * rests. One observer, one frame loop, both gone on unmount.
 *
 * THE MARKUP IS THE FINISHED MONTH. Only the script sets `data-run` and the
 * zeros, so no observer, reduced motion or a `data-still` ancestor all show
 * it whole. Each counted figure sits over its final text, held invisible, so
 * a count never widens a column; tiles move by transform and opacity only.
 * A §40 switch never replays it: the new month shows whole and "You saved"
 * counts across.
 */
const WEEK = 520;
const STAGGER = 50;
const ENTER = 240;
const COUNT = 360;
/** How much of the card has to be in view before it plays. */
const SEEN = 0.4;

const weekSum = (orders: MonthOrder[], pick: (o: MonthOrder) => number) =>
  orders.reduce((s, o) => s + pick(o), 0);

/** Each week's orders, what they cost and what they brought back. */
const byWeek = (month: Month) =>
  month.weeks.map((label, wk) => {
    const orders = month.orders.filter((o) => o.week === wk);
    return {
      label,
      orders,
      spent: weekSum(orders, (o) => o.priceCents),
      saved: weekSum(orders, (o) => o.cents),
    };
  });

/** A figure the sequence counts: the final text holds the width, unseen, and
 *  the live text over it is the one the count writes. */
function Counted({ className, text, live }: { className?: string; text: string; live?: Ref<HTMLSpanElement> }) {
  return (
    <b className={className ? `${className} mw-count` : "mw-count"} aria-hidden="true">
      <span className="mw-hold">{text}</span>
      <span className="mw-live" ref={live}>
        {text}
      </span>
    </b>
  );
}

export default function MonthWeeks({
  month: given,
  choices,
}: {
  month: Month;
  choices?: MonthChoice[];
}) {
  const card = useRef<HTMLDivElement>(null);
  const fig = useRef<HTMLSpanElement>(null);
  const spentFig = useRef<HTMLSpanElement>(null);
  const sw = useMonthSwitch(given, choices, card);
  const month = sw.shown;
  const ahead = month.netCents > 0;
  const weeks = byWeek(month);
  /** The month the sequence last saw, and whether it has had its one play. */
  const seen = useRef<Month | null>(null);
  const played = useRef(false);

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

  /* THE ONE PLAY (§41). Layout, not a passive effect: the emptied month has
     to be in place before the first paint, or the finished one flashes. */
  useLayoutEffect(() => {
    const el = card.current;
    const spentAll = spentFig.current;
    const savedAll = fig.current;
    if (!el || !spentAll || !savedAll) return;
    const switched = seen.current !== null && seen.current !== month;
    seen.current = month;
    const rows = [...el.querySelectorAll<HTMLElement>(".mw-week")];
    const all = byWeek(month);
    const back = all.reduce((s, w) => s + w.saved, 0);
    const parts = all.map((w, k) => {
      const row = rows[k];
      const tiles = row ? [...row.querySelectorAll<HTMLElement>(".mw-tile")] : [];
      return {
        ...w,
        tiles,
        start: k * WEEK,
        /* The count begins as the week's last tile lands. */
        countAt: k * WEEK + STAGGER * Math.max(0, tiles.length - 1) + ENTER,
        /* This week's part of "You saved", by what it brought back. */
        share: back > 0 ? (month.netCents * w.saved) / back : 0,
        spentLive: row?.querySelector<HTMLElement>(".mw-spent .mw-live") ?? null,
        savedLive: row?.querySelector<HTMLElement>(".mw-saved .mw-live") ?? null,
      };
    });
    const end = Math.max(0, ...parts.map((w) => (w.tiles.length ? w.countAt + COUNT : 0)));
    const put = (node: HTMLElement | null, text: string) => {
      if (node && node.textContent !== text) node.textContent = text;
    };
    /* Every figure `t` ms into the play. */
    const paint = (t: number) => {
      let spent = 0;
      let saved = 0;
      parts.forEach((w) => {
        if (!w.tiles.length) return;
        const e = easeOut(Math.max(0, Math.min(1, (t - w.countAt) / COUNT)));
        spent += w.spent * e;
        saved += w.share * e;
        put(w.spentLive, dollars(Math.round(w.spent * e)));
        put(w.savedLive, `+${dollars(Math.round(w.saved * e))}`);
      });
      put(spentAll, dollars(Math.round(spent)));
      put(savedAll, signedDollars(Math.round(saved)));
      sw.net.current = Math.round(saved);
    };
    /* The finished month, as the markup drew it. After a switch "You saved"
       is the switch's own count, so it is left to that. */
    const rest = (withSaved: boolean) => {
      el.removeAttribute("data-run");
      parts.forEach((w) => {
        put(w.spentLive, dollars(w.spent));
        put(w.savedLive, `+${dollars(w.saved)}`);
      });
      put(spentAll, dollars(month.spentCents));
      if (withSaved) {
        put(savedAll, signedDollars(month.netCents));
        sw.net.current = month.netCents;
      }
    };

    if (switched || played.current || typeof IntersectionObserver === "undefined" || still(el)) {
      played.current = true;
      rest(!switched);
      return;
    }

    el.setAttribute("data-run", "");
    paint(0);
    let raf = 0;
    const play = () => {
      played.current = true;
      let t0 = -1;
      const tick = (now: number) => {
        if (t0 < 0) t0 = now;
        const t = now - t0;
        parts.forEach((w) =>
          w.tiles.forEach((tile, i) => {
            if (t >= w.start + i * STAGGER) tile.classList.add("is-in");
          }),
        );
        if (t < end) {
          paint(t);
          raf = requestAnimationFrame(tick);
        } else {
          raf = 0;
          rest(true);
        }
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e || e.intersectionRatio < SEEN) return;
        io.disconnect();
        play();
      },
      { threshold: SEEN },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [month, sw.net]);

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
        {weeks.map(({ label, orders, spent, saved }) => (
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
                <Counted className="mw-spent" text={dollars(spent)} />
                <Counted className="mw-saved" text={`+${dollars(saved)}`} />
              </span>
            ) : (
              <b className="mw-figs" aria-hidden="true">
                —
              </b>
            )}
          </li>
        ))}
      </ol>
      {/* The moving figures are hidden from screen readers beside still
          copies: they read the month, not the count. */}
      <div className={`mw-foot${ahead ? " is-ahead" : ""}`}>
        <p className="mw-row">
          <span>You spent</span>
          <Counted text={dollars(month.spentCents)} live={spentFig} />
          <span className="sr-only">{dollars(month.spentCents)}</span>
        </p>
        <p className="mw-net">
          <span>
            You saved
            <span className="mw-after">after the {dollars(month.planCents)} membership</span>
          </span>
          <Counted text={signedDollars(month.netCents)} live={fig} />
          <span className="sr-only">{signedDollars(month.netCents)}</span>
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
