import TapInIcon from "./TapInIcon";

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
export default function PlusFlag({
  className = "",
  mark = true,
}: {
  className?: string;
  mark?: boolean;
}) {
  return (
    <span className={className}>
      {mark ? <TapInIcon className="plus-mark" /> : null}
      <span className="plus-word">PLUS</span>
    </span>
  );
}
