import { Fragment } from "react";
import { seatCapParts } from "../model/content";

/**
 * §2's one seat sentence, printed — the only place it is rendered as markup.
 *
 * The text is `seatCapLine` exactly, part for part (content.ts builds the
 * string from the same array), so no surface can drift from the contract by
 * dressing it. What this adds is Sam's ask of 14 Sep 2026: the rate the reader
 * pays stands up, and the rate everyone after the founding seats pays is
 * struck — "so people know $14.99 is what they pay if they don't join a
 * founding seat."
 *
 * SPANS, NOT <s>. The strike is a visual convention; the sentence must still
 * read aloud as the contract's words, and some screen readers announce <s> as
 * deleted text. A span with a line-through changes nothing a reader hears.
 *
 * Returns inline nodes only. Callers keep their own <p>, because the pitch's
 * panel note follows the sentence with a full stop and the hero, the deck and
 * the note each set their own type.
 */
export default function SeatCapLine() {
  return (
    <>
      {seatCapParts.map((p, i) =>
        p.role === "after" ? (
          <span key={i} className="seat-after tnum">
            {p.text}
          </span>
        ) : p.role === "now" ? (
          <span key={i} className="seat-now tnum">
            {p.text}
          </span>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}
