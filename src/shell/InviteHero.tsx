import { useEffect, useRef } from "react";
import type { Invite } from "../model/invite";
import { reducedMotion } from "./island";

/* ══ THE WELCOME WEEK HEADLINE: A · STICKER (Sam, 5 Nov 2026) ═══════════════
   Picked from three (/impeccable: sticker, label strips, maroon band; Sam:
   "push A"). The band is Sam's torn-paper town collage, so the headline
   speaks its language (the collage skill's look.md): the Welcome Week mark
   pasted on the photo's corner as a die-cut sticker with a white deckle rim,
   and "free" printed on its own torn cream strip, ink type, turned a couple
   of degrees. No glass pill, no gradient, Gilroy 600. */

/** A torn edge down both sides, as a clip-path: a slow wander plus fibre,
 *  seeded so the strip always tears the same way. Amplitude in px, so it
 *  holds at any size. */
export function tornSides(seed: number, amp: number): string {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const n = 9;
  const wob = (i: number) => (Math.sin(i * 1.7 + seed) * 0.5 + (rnd() - 0.5)) * amp;
  const px = (v: number) => `${v.toFixed(1)}px`;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`calc(0% + ${px(amp + wob(i))}) ${((i / n) * 100).toFixed(1)}%`);
  for (let i = n; i >= 0; i--) pts.push(`calc(100% - ${px(amp + wob(i + 40))}) ${((i / n) * 100).toFixed(1)}%`);
  return `polygon(${pts.join(", ")})`;
}

/** Ink on a torn cream strip, with the white deckle rim behind it. */
function Strip({ seed, children }: { seed: number; children: React.ReactNode }) {
  return (
    <span className="tpa-ww-strip" style={{ clipPath: tornSides(seed + 101, 5) }}>
      <span className="tpa-ww-paper" style={{ clipPath: tornSides(seed, 4) }}>
        {children}
      </span>
    </span>
  );
}

/** The mark, die-cut with a deckle rim. It lands the way paper does: a
 *  little large and crooked, then pressed flat (the one moment). */
function Sticker({ invite }: { invite: Invite }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || typeof el.animate !== "function") return;
    el.animate(
      [
        { transform: "translate(-4px, -10px) scale(1.18) rotate(-18deg)", opacity: 0 },
        { opacity: 1, offset: 0.35 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 620, delay: 180, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" },
    );
  }, []);
  return (
    <span ref={ref} className="tpa-ww-sticker">
      <img src={invite.logo} alt={invite.alt} width="96" height="96" decoding="async" />
    </span>
  );
}

/** The headline block for an invitation: what sits above the social proof. */
/* VALUE FIRST (Sam, 5 Nov 2026: picked "2" of two calmer headers, after
   "this is still a bit too busy though no?"). For someone who has never
   heard of Plus: what it gives as the headline, "First month free" on the
   collage's cream strip under it, the sticker above. No student count. */
export default function InviteHero({
  invite,
  free,
  line,
  h1,
  strip,
}: {
  invite: Invite;
  free: boolean;
  line: string;
  /** The headline and the strip, from the headline test (model/wwHeroTest.ts). */
  h1: string;
  strip: string;
}) {
  return (
    <>
      <Sticker invite={invite} />
      <h1 className="tpa-ww-h1">{h1}</h1>
      {/* The strip speaks of the free month, so it says the price line
          instead when the month isn't free. */}
      <p className="tpa-ww-label">
        <Strip seed={7}>{free ? strip : line}</Strip>
      </p>
    </>
  );
}
