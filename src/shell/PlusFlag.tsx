
/**
 * The TapIn Plus mark: the TapIn icon and the word PLUS, on the logo's gold.
 *
 * Sam, 15 Sep 2026: "it'd be the tapin icon and 'PLUS' instead of 'Tapin
 * Plus'" — then, on the badge: "we should use the tapin gold gradient."
 *
 * ══ MAROON, WHITE INK ═══════════════════════════════════════════════════════
 * A gilt version (the production dot's gold pair, maroon ink, a sheen on
 * hover) lived for an hour on 15 Sep 2026; Sam: "looks kind of tacky … the
 * effect looks really weird. We can just revert." So: the maroon plate, and
 * §9's no-gold rule stands with no exception. The mark is inlined
 * (TapInIcon) so it takes the plate's ink. One component for the pitch's
 * corner flag (.vflag) and the venue page's chip (.plus).
 */
/**
 * `mark` — the TapIn glyph before the word. On by default: on a venue tile or
 * a merchant's card the glyph is what says whose flag this is. Off beside the
 * wordmark (Sam, 22 Sep 2026: "can we remove the tapin logo from the plus
 * chip here"), where the mark is already the word to its left.
 */
/** The mark behind PLUS: a bolt (Sam, 30 Sep 2026: "can this be the branding
 *  behind plus, that electricity icon"). Filled, in currentColor, so it takes
 *  the chip's ink wherever the chip sits. */
export function PlusBolt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M13.2 2.2 4.6 13.4h6.2l-1.4 8.4 8.6-11.2h-6.2l1.4-8.4Z" fill="currentColor" />
    </svg>
  );
}

export default function PlusFlag({
  className = "",
  mark = true,
}: {
  className?: string;
  mark?: boolean;
}) {
  return (
    <span className={className}>
      {mark ? <PlusBolt className="plus-mark" /> : null}
      <span className="plus-word">PLUS</span>
    </span>
  );
}
