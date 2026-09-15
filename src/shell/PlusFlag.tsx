import TapInIcon from "./TapInIcon";

/**
 * The TapIn Plus mark: the TapIn icon and the word PLUS, on gold.
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
export default function PlusFlag({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <TapInIcon className="plus-mark" />
      <span className="plus-word">PLUS</span>
    </span>
  );
}
