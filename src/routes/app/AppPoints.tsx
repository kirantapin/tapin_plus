import { useState } from "react";
import {
  venuePoints,
  totalPoints,
  worthHere,
  asTapInPoints,
  venueById,
  logoFor,
  TRANSFER_RATIO,
  totalCredit,
} from "./appBits";
import { money } from "../../model/order";

const m = (n: number) => `$${n.toFixed(2)}`;

/**
 * Points — and the 4:1 conversion, shown by letting her do it.
 *
 * Sam, 15 Sep 2026: "for points we can show how you can convert these to
 * TapIn points at a 4:1 ratio (4 merchant:1 TapIn)." Built from the mockup he
 * approved.
 *
 * ══ THE TRADE IS THE FACT ══════════════════════════════════════════════════
 * Points are worth most where they were earned; moving them into one portable
 * TapIn balance costs four to one. Every row states both — what the points
 * buy here, and what they become — BEFORE the control, so nobody learns the
 * ratio by losing to it.
 *
 * ══ THE CONTROL WORKS, ON THE PREVIEW'S OWN FIGURES ════════════════════════
 * Convert moves a place's demonstration points into the TapIn balance at the
 * top, and Undo moves them back. It is a readout of the mechanism, reversible
 * and local to this screen; nothing is saved and nothing leaves the page,
 * which is the preview's rule for a live control (see AppPlace.tsx).
 */
export default function AppPoints() {
  /** venueId → TapIn points converted from it, this visit. */
  const [moved, setMoved] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<string | null>(venuePoints[0]?.venueId ?? null);
  const tapin = Object.values(moved).reduce((n, v) => n + v, 0);
  const left = totalPoints - tapin * TRANSFER_RATIO;

  return (
    <>
      <section className="app-sec app-tp">
        <h2 className="t-caption">TapIn points</h2>
        <p className="app-tp-big">
          <b className="tnum">{tapin.toLocaleString()}</b>
          <span>spend at any TapIn place</span>
        </p>
        <p className="t-compact app-note">
          {TRANSFER_RATIO} points at a place make 1 TapIn point. Convert what you have below.
        </p>
      </section>

      <div className="app-tally">
        <div>
          <b className="tnum">{left.toLocaleString()}</b>
          <span>points across {venuePoints.length} places</span>
        </div>
        <div>
          <b className="tnum">{money(Math.round(totalCredit * 100))}</b>
          <span>credit in your account</span>
        </div>
      </div>

      <section className="app-sec">
        <h2 className="t-caption">Where they are</h2>
        <ul className="app-points">
          {venuePoints.map((p) => {
            const v = venueById(p.venueId);
            const converted = moved[p.venueId] ?? 0;
            const here = p.points - converted * TRANSFER_RATIO;
            const isOpen = open === p.venueId;
            return (
              <li key={p.venueId} className={isOpen ? "is-open" : undefined}>
                <button
                  type="button"
                  className="app-points-row"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : p.venueId)}
                >
                  {v ? logoFor(v) : null}
                  <span className="app-row-text">
                    <b>{v?.name}</b>
                    <span>
                      {here.toLocaleString()} points · {m(worthHere(here))} to spend here
                    </span>
                  </span>
                  <svg className="app-points-chev" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m10 7 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isOpen ? (
                  converted > 0 ? (
                    <div className="app-conv">
                      <span className="tnum">
                        Converted {(converted * TRANSFER_RATIO).toLocaleString()} → <b>{converted.toLocaleString()}</b> TapIn points
                      </span>
                      <button
                        type="button"
                        className="app-conv-undo"
                        onClick={() => setMoved((x) => ({ ...x, [p.venueId]: 0 }))}
                      >
                        Undo
                      </button>
                    </div>
                  ) : here >= TRANSFER_RATIO ? (
                    <div className="app-conv">
                      <span className="tnum">
                        {here.toLocaleString()} → <b>{asTapInPoints(here).toLocaleString()}</b> TapIn points
                      </span>
                      <button
                        type="button"
                        className="app-conv-go"
                        onClick={() => setMoved((x) => ({ ...x, [p.venueId]: asTapInPoints(here) }))}
                      >
                        Convert
                      </button>
                    </div>
                  ) : (
                    <p className="app-conv app-conv-none">Nothing to convert.</p>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="t-compact app-note">
          Points here spend here at full value. Converting moves them at {TRANSFER_RATIO}:1 — you
          lose value and gain somewhere to spend them.
        </p>
      </section>
    </>
  );
}
