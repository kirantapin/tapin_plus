import type { ReactNode } from "react";

/**
 * One photograph card — the `.bshot` construction pitch.css styles (§7 of
 * docs/POLISH-2026-09-21.md): a photograph under a veil, the title and one
 * line top-left, and a frosted chip showing the benefit on one order.
 *
 * Extracted 22 Sep 2026 (§11) so the pitch's "What you get" and the
 * Coffeeholics splash's "What you'd save here" are one construction rather
 * than two lookalikes. The markup is exactly what BenefitCards rendered
 * inline, byte for byte: pitch.css owns every rule, this owns none.
 *
 * `lead` is the taller card (260 on a phone). `img` is optional because a
 * card must survive a missing file; a chip with no content is not rendered.
 */
export interface PhotoCardProps {
  img?: string;
  /** "" by default: every word the photograph carries is already on the card. */
  alt?: string;
  title: string;
  line: string;
  chip?: { icon: ReactNode; line: string; figure: string };
  lead?: boolean;
}

export default function PhotoCard({ img, alt = "", title, line, chip, lead = false }: PhotoCardProps) {
  return (
    <article className={`bshot${lead ? " is-lead" : ""}`}>
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
            <span className="bshot-glyph" aria-hidden="true">
              {chip.icon}
            </span>
            {chip.line}
          </span>
          <b className="bshot-chip-b">{chip.figure}</b>
        </p>
      ) : null}
    </article>
  );
}
