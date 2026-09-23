/**
 * One photograph card — the `.bshot` construction pitch.css styles: the
 * photograph above with nothing over it, and a plate below carrying the title,
 * one line, and the benefit on one order as a ledger row (docs/POLISH-2026-
 * 09-21.md §12, direction A, Sam's choice on 22 Sep 2026).
 *
 * Extracted 22 Sep 2026 (§11) so the pitch's "What you get" and the
 * Coffeeholics splash's "What you'd save here" are one construction rather
 * than two lookalikes. pitch.css owns every rule, this owns none.
 *
 * `lead` is the taller photograph (and, on the pitch from 1024, the card set
 * on its side). `img` is optional because a card must survive a missing file;
 * a chip with no content is not rendered.
 *
 * The chip's two strings are split where CSS cannot split them — the order
 * line into item and price, "You save $X" into its label and figure. The
 * words are the chip's own, divided, never retyped. No glyph: §12 dropped it.
 */
export interface PhotoCardProps {
  img?: string;
  /** "" by default: every word the photograph carries is already on the card. */
  alt?: string;
  title: string;
  line: string;
  chip?: { line: string; figure: string };
  lead?: boolean;
  /**
   * `lit` — the card carries the light ramp (`data-lit`, styles/light.css):
   * a white plate with dark ink on the dark page. Sam, 23 Sep 2026, on the
   * pitch: "the card containers make it really hard to see what's included.
   * Can we figure out a color scheme that makes these easier to read." The
   * dark card rung under grey ink was a plate the eye read as more ground;
   * white under the ink ramp is the same plate the splash, the pop-up and the
   * checkout already use. The splash leaves it off: its page is already light
   * and carries Coffeeholics' own tinted ramp. Nothing passes it since 23 Sep
   * 2026: the pitch's whole region under the hero is `data-lit` now (§14).
   */
  lit?: boolean;
}

/* "California Club · $12.00" → the item and its price. The separator stays in
   the DOM (a line that shows it whole still reads whole); a line with no
   price ("Every order", "Olaika") has no second half. */
const ORDER = /^(.+) · (\$[\d.,]+)$/;
/* "You save $5.00" → the label and the figure. "Points toward a free one" and
   an offer's terms are not savings and stay one string. */
const SAVES = /^(You save) (.+)$/;

export default function PhotoCard({
  img,
  alt = "",
  title,
  line,
  chip,
  lead = false,
  lit = false,
}: PhotoCardProps) {
  const order = chip ? ORDER.exec(chip.line) : null;
  const saves = chip ? SAVES.exec(chip.figure) : null;
  return (
    <article className={`bshot${lead ? " is-lead" : ""}`} data-lit={lit ? "" : undefined}>
      {img ? (
        <img className="bshot-img" src={img} alt={alt} decoding="async" loading="lazy" />
      ) : null}
      <div className="bshot-say">
        <h3 className="bshot-title">{title}</h3>
        <p className="bshot-line">{line}</p>
      </div>
      {chip ? (
        <p className="bshot-chip">
          <span className="bshot-chip-a">
            {order ? (
              <>
                <span className="bshot-item">{order[1]}</span>
                <span className="bshot-sep"> · </span>
                <span className="bshot-price">{order[2]}</span>
              </>
            ) : (
              <span className="bshot-item">{chip.line}</span>
            )}
          </span>
          <b className={`bshot-chip-b${saves ? " is-save" : ""}`}>
            {saves ? (
              <>
                <span className="bshot-save">{saves[1]}</span>{" "}
                <span className="bshot-fig">{saves[2]}</span>
              </>
            ) : (
              chip.figure
            )}
          </b>
        </p>
      ) : null}
    </article>
  );
}
