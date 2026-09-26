import moneyJson from "../../docs/data/money-and-terms.json";
import { seatsLeftAt } from "./presale";

/**
 * ══ THE SEAT COUNTER IS ARTIFICIAL. READ THIS BEFORE TRUSTING THE NUMBER. ═══
 *
 * It counts nothing. There is no reservations table behind it, no query, no
 * server. It is a pure function of the clock: model/presale.ts's invented
 * schedule of purchases, subtracted from a chosen start (§67).
 *
 * Sam asked for it in those terms on 13 Sep 2026 — "I think it'd be neat to
 * show a fake counter of how many seats are left. This should decrease by 3
 * daily until completely gone, it's artificial on purpose" — and reaffirmed it
 * after being shown that `docs/TRUTH.md` retires exactly this device: "An
 * invented seat count. '63 of 100 taken' was a placeholder chosen to make a bar
 * look full." His call, recorded here rather than argued again, and recorded
 * LOUDLY so that nobody reading this file in 2027 mistakes the output for a
 * real figure or wires a dashboard to it.
 *
 * ══ WHY IT IS A FUNCTION OF THE DATE AND NOT A STORED COUNTER ══════════════
 * A stored number would have to be decremented by something — a cron, a server,
 * a hand — and every one of those can stall, double-fire or be edited to a
 * different number than another reader saw. Derived from the date, every visitor
 * on a given day sees the same figure, it needs no infrastructure at all, and it
 * cannot drift. It is also trivially auditable: one constant, one subtraction.
 *
 * ══ HOW IT SITS BESIDE THE DEADLINE ════════════════════════════════════════
 * The checkout says the round "closes at the end of September". On the §67
 * schedule the count reaches 9 on 30 Sep and falls 1–2 a day after it, so the
 * number never runs out before the date it sits beside.
 *
 * ⚠ ZERO IS NOT REACHED ON ITS OWN. The schedule (model/presale.ts, §67) stops
 * at one, because zero flips every price below (`foundingOpen`) and the
 * checkout's wallet amount does not follow that flip. Closing the round is an
 * edit, not a date.
 */

/** Real: 100 founding seats. The cap is the one true thing in this file. */
/** Real: 100 Early Bird spots — the extraction's figure. Sam, 15 Sep 2026:
 *  "let's keep it 100 spots for now" (a night-earlier 30 lasted an hour).
 *  content.ts reads this constant so no surface can print a different cap. */
/* 50, NOT THE EXTRACTION'S 100. Sam, 15 Sep 2026 (late): "I think we'll do 50
   early bird seats at $6.99 a month. Say that 35 of the 50 are left." The
   JSON is frozen; the override lives here, and content.ts reads this. */
/* Sam, 22 Sep 2026: "Can we say 100 spots, with 41 left now." */
export const SEAT_CAP = 100;
/* The live tier's name — Kiran, 23 Sep 2026; Sam confirmed. The sold-out $4.99
   tier above it is the "Early Bird". content.ts re-exports it (it imports this file). */
export const foundingTierName = "Early-ish Bird";
void moneyJson;

/* ══ THE COUNT NOW FALLS, AND IT IS THE SCHEDULE'S (§67) ═══════════════════
   Sam, 26 Sep 2026: down 5–10 a day until 9–11 are left, then 1–2 a day, and
   "it should actually go down". model/presale.ts holds that schedule — the
   same one the purchase notifications read — and stops at one, so the round
   never closes on its own. The earlier fixed 41 was its starting point. */
/**
 * Seats "left" today. Clamped at both ends: never above the cap (a clock set to
 * last year must not advertise more seats than exist) and never below zero.
 */
const override = (): number | null => {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("seats");
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(SEAT_CAP, Math.max(0, Math.round(n))) : null;
};

export const seatsLeft = (now: Date = new Date()): number =>
  override() ?? Math.min(SEAT_CAP, seatsLeftAt(now.getTime()));

/**
 * Is the founding round still open?
 *
 * THE SINGLE SWITCH FOR EVERY PRICE ON THE SITE. Sam, 13 Sep 2026: "let's just
 * have the price flip to $14.99 when it hits zero." So this is not a display
 * concern — `content.ts` reads it once and builds the plans, the charge rows,
 * the consent sentence and the amount actually charged from the answer.
 *
 * ══ A DEV-ONLY OVERRIDE, BECAUSE THE OTHER STATE IS OTHERWISE UNREACHABLE ═══
 * The sold-out branch arrives on 27 Sep 2026 and cannot be inspected before
 * then without moving a clock. `?seats=0` forces it, and `?seats=n` forces any
 * count — guarded on `import.meta.env.DEV`, so the query string does nothing
 * whatsoever in a production build. It is a test seam for a money path that
 * changes state on a date, which is exactly the kind of branch that ships
 * unverified and is discovered by a customer.
 */
export const foundingOpen = (now: Date = new Date()): boolean =>
  seatsLeft(now) > 0;

/**
 * The sentence, so no surface writes its own. Two states, because "0 seats
 * left" beside a live buy button reads as a bug rather than as an ending.
 *
 * NO COUNTDOWN CLOCK, NO BAR, NO COLOUR CHANGE. §10 bans urgency theatre, and
 * Sam asked for a counter rather than a countdown — a number in body type is
 * the quietest form this can take and still be what he asked for.
 *
 * THERE WAS A THIRD STATE, AND IT WAS THE BANNED ONE. Until the pre-deploy
 * review of 14 Sep 2026 this returned "Only N Early Bird spots left" from 12
 * down — the exact "only N left" pattern §10 names, self-arming on 23 Sep in
 * wording that was not Sam's (his: "42 seats out of 100 left"), and invisible
 * to guards.py because the number is interpolated. The same sentence now
 * serves every non-zero count; the guard's pattern was widened to catch the
 * template itself.
 */
export const seatLine = (now: Date = new Date()): string => {
  const left = seatsLeft(now);
  if (left === 0) return `${foundingTierName} spots are gone`;
  return `${left} of ${SEAT_CAP} ${foundingTierName} spots left`;
};
