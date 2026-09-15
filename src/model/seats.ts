import moneyJson from "../../docs/data/money-and-terms.json";

/**
 * ══ THE SEAT COUNTER IS ARTIFICIAL. READ THIS BEFORE TRUSTING THE NUMBER. ═══
 *
 * It counts nothing. There is no reservations table behind it, no query, no
 * server. It is a pure function of today's date that starts at a chosen number
 * and subtracts three a day until it reaches zero.
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
 * ══ HOW IT SITS BESIDE THE REAL DEADLINE ═══════════════════════════════════
 * The page states a REAL close — founding pricing ends "the end of October" —
 * and Sam's framing of it is "closes at the end of october, OR when all seats
 * are gone". This lands on the second branch: from 42 at three a day the room
 * empties in a fortnight, so the counter always runs out first and the date is
 * never left advertising seats that the counter says do not exist. The failure
 * mode to avoid was the other order.
 *
 * ⚠ WHAT HAPPENS AT ZERO IS NOT DECIDED, AND ZERO IS NOW CLOSE. Starting at 42
 * and dropping three a day, this returns 0 on **27 Sep 2026** — fourteen days
 * after it was switched on, and five weeks BEFORE the close date the same line
 * advertises. From that morning the page reads "Early Bird spots are gone" while
 * the $4.99 checkout still works, because nothing in this file touches pricing
 * or the payment path.
 *
 * Someone has to choose, before then, whether hitting zero flips the rate to
 * $14.99, closes the purchase, or whether the floor sits above zero. Flagged
 * for Sam; not invented here.
 */

/** Real: 100 founding seats. The cap is the one true thing in this file. */
/** Real: 100 Early Bird spots — the extraction's figure. Sam, 15 Sep 2026:
 *  "let's keep it 100 spots for now" (a night-earlier 30 lasted an hour).
 *  content.ts reads this constant so no surface can print a different cap. */
/* 50, NOT THE EXTRACTION'S 100. Sam, 15 Sep 2026 (late): "I think we'll do 50
   early bird seats at $6.99 a month. Say that 35 of the 50 are left." The
   JSON is frozen; the override lives here, and content.ts reads this. */
export const SEAT_CAP = 50;
void moneyJson;

/**
 * What the counter reads on day zero. Sam, 13 Sep 2026: "I'd say we want to
 * show 42 seats out of 100 left."
 *
 * So the line opens mid-round rather than full — it asserts that 58 seats have
 * already gone, which is a larger invented claim than a countdown from the cap
 * and is called out here for exactly that reason. His call, asked for in those
 * words.
 */
/* Sam, 15 Sep 2026: "say 45 of them are left available." His words; his
   call; still an invented figure, and this file's header says so. */
const SEATS_AT_OPEN = 35;

/** Sam's rate, exactly as asked (13 Sep: "decrease by 3 daily"). From 45 on
 *  15 Sep, three a day reaches 0 on 30 Sep — the same day the round closes
 *  ("Early bird will close at the end of september", Sam, 15 Sep), so the
 *  counter and the date agree for the whole round. */
const SEATS_PER_DAY = 3;

/**
 * Day zero, when the counter still reads SEATS_AT_OPEN. Local midnight, because
 * the figure should change overnight for a reader in Blacksburg rather than at
 * some fraction of a day determined by when the page was built.
 */
const OPENED_AT = new Date(2026, 8, 15); // 15 Sep 2026, month is 0-indexed

/** Whole days elapsed, floored — the number only ever moves at midnight. */
const daysSince = (now: Date): number => {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(
    0,
    Math.round((midnight.getTime() - OPENED_AT.getTime()) / 86_400_000),
  );
};

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
  override() ??
  Math.min(
    SEAT_CAP,
    Math.max(0, SEATS_AT_OPEN - daysSince(now) * SEATS_PER_DAY),
  );

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
  if (left === 0) return "Early Bird spots are gone";
  return `${left} of ${SEAT_CAP} Early Bird spots left`;
};
