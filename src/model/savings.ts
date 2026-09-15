/**
 * The savings illustration (docs/TRUTH.md §7).
 *
 * The pitch prints a savings figure at display size, beside a real price, to
 * students. TRUTH.md: "The figure and the sentence justifying it must be
 * produced together and never typed by hand." So this module returns both, and
 * no surface may hardcode either.
 *
 * Everything is computed in integer cents. Floating-point dollars drift, and a
 * figure that disagrees with itself by a penny beside a refund guarantee is
 * worse than no figure.
 */

/**
 * The assumption doing the most work. §7: keep it a named constant so changing
 * it is one line. 40% yields ~$105, 60% ~$70.
 *
 * THIS AND `VISIT_SIZE_USD` WERE BOTH SET FOR A GOING-OUT MEMBERSHIP, and Sam
 * has since repositioned: "this isn't a membership for going out, it's a
 * membership for your day to day in Blacksburg." The copy has moved; these two
 * numbers have NOT, deliberately, because moving them moves the headline figure
 * and that is his call, not a copy edit.
 *
 * Which way each is wrong, so the decision can be made on facts:
 *   ALCOHOL_SHARE 0.5 — far too high for day-to-day spend. The 15% skips
 *     alcohol, so overstating the alcohol share UNDERSTATES the saving. The
 *     figure is conservative in its current form, which is the safe direction
 *     to be wrong in, but it is wrong.
 *   VISIT_SIZE_USD 15 — too high for a day that includes a $3.25 americano.
 *     A smaller visit means more visits, but the $5 credit needs a $10+ ticket
 *     and the month caps at 20 credits either way, so lowering it cuts the
 *     credit component hard. This one probably moves the figure DOWN.
 * Neither is a copy problem and neither should be guessed at.
 */
export const ALCOHOL_SHARE = 0.5;

/** Sam's anchor, 11 Sep 2026: about $300/month on food and drink. */
export const MONTHLY_SPEND_ANCHOR = 300;

export const BENEFIT = {
  percentOff: 0.15,
  creditUsd: 5,
  /** A $10+ order earns the credit. Credit spent does not count toward it. */
  creditMinUsd: 10,
  pointsPerDollar: 10,
  pointValueUsd: 0.01,
  plusPlaces: 5,
} as const;

export const VISIT_SIZE_USD = 15;
export const WEEKS_PER_MONTH = 4;
/** Sam, this session: $4.99 for the first 100 seats, $9.99 after those sell.
 *  This supersedes TRUTH.md §2's $7.99 — and note $4.99 had previously been on
 *  §2's "retired, do not reintroduce" list as the early-bird rate. */
/* Sam, 15 Sep 2026: $9.99 (was $6.99 on 14 Sep). Mirrors content.ts's FOUNDING_MONTHLY. */
export const FOUNDING_MONTHLY_USD = 9.99;

/**
 * Points are 10 per dollar at 1c = 10% back, but ONLY the extra 1x is the
 * membership's — anyone ordering through TapIn earns the first. So points add
 * 10%, not 20%. Getting this wrong doubles the headline.
 */
const MEMBERSHIP_POINTS_RATE = BENEFIT.pointsPerDollar * BENEFIT.pointValueUsd;

const usd = (dollars: number) => Math.round(dollars * 100);
const money = (cents: number) => cents / 100;

export interface Illustration {
  /** Gross spend before the alcohol exclusion. */
  monthlySpendUsd: number;
  alcoholShare: number;
  /** The portion the 15% can act on — everything except alcohol. */
  eligibleSpendUsd: number;
  visitSizeUsd: number;
  visits: number;
  places: number;
  /** Spend the visits actually account for, at whole visits. */
  modelledSpendUsd: number;
  percentSavingUsd: number;
  creditSavingUsd: number;
  pointsSavingUsd: number;
  /** Steady state, once credit earned last week is there to spend. */
  steadyUsd: number;
  /** Month one, lighter by one credit at each place first visited. */
  firstMonthUsd: number;
  weeklyUsd: number;
  priceUsd: number;
  netUsd: number;
  /** Credits the month can actually yield — capped. NOT the same as `visits`. */
  creditsEarned: number;
  /**
   * The condition on the figure, printed AT REST beside it.
   *
   * Six students walked this flow and every one of them asked "$152.50 off
   * WHAT?"; none could see the answer, because the only string that carried it
   * was inside a disclosure in the smallest type on the panel. Two of them
   * reverse-engineered the number, got half their money back, concluded it was
   * made up and left. The condition is not a caveat on the claim — it IS the
   * claim, and it belongs where the number is.
   */
  condition: string;
  /** The sentence that justifies the figure. Generated, never typed. */
  basis: string;
  /** Always printed in the same type as the figure. §7. */
  disclaimer: string;
}

/**
 * The alcohol exclusion is applied BEFORE the benefit maths. Feeding the $300
 * anchor straight in returns $175 and roughly doubles the claim (§7).
 */
export function illustrate(
  monthlySpendUsd: number = MONTHLY_SPEND_ANCHOR,
  alcoholShare: number = ALCOHOL_SHARE,
): Illustration {
  const spendCents = usd(monthlySpendUsd);

  // Whole visits only — a member does not make 2/3 of a trip. Visits derive
  // from ALL spend, because the $10 credit threshold counts the whole ticket.
  const visits = Math.floor(spendCents / usd(VISIT_SIZE_USD));
  const modelledCents = visits * usd(VISIT_SIZE_USD);

  // The credit is once a week per place, so visits land across as many places
  // as the month needs, capped by how many Plus venues exist.
  const places = Math.min(BENEFIT.plusPlaces, Math.ceil(visits / WEEKS_PER_MONTH));

  // Sam, this session: the three benefits do NOT share one base.
  //   * 15% off applies to everything EXCEPT alcohol — food, non-alcoholic
  //     drinks, line skips, cover, event tickets, merch. Virginia does not
  //     permit discounting alcohol.
  //   * Points earn on everything, alcohol included.
  //   * Credit is EARNED on any $10+ ticket, alcohol included. (It may not be
  //     SPENT on alcohol, which does not change what a member accrues.)
  // Applying the alcohol exclusion to all three — as this model did until now —
  // understated the saving by about a third.
  const nonAlcoholCents = Math.round(modelledCents * (1 - alcoholShare));

  const percentCents = Math.round(nonAlcoholCents * BENEFIT.percentOff);
  const pointsCents = Math.round(modelledCents * MEMBERSHIP_POINTS_RATE);

  // Each visit clears the $10 threshold at a $15 visit size, so each COULD earn
  // — but the credit is once a week PER PLACE, so a month cannot yield more
  // than (Plus places x weeks) of them however often a member goes. Without
  // this cap the model invented $100 of credit at the top of the slider's
  // range: 40 visits reported 40 credits against a real ceiling of 20.
  const maxCredits = BENEFIT.plusPlaces * WEEKS_PER_MONTH;
  const creditsEarned = Math.min(visits, maxCredits);
  const creditCents = creditsEarned * usd(BENEFIT.creditUsd);

  const steadyCents = percentCents + creditCents + pointsCents;

  // §7: both months are stated, not just the steady one. The first visit to a
  // place has no credit to spend, so month one is lighter by one credit per
  // place. A stranger is deciding about month one.
  const firstMonthCents = steadyCents - places * usd(BENEFIT.creditUsd);

  const priceCents = usd(FOUNDING_MONTHLY_USD);

  // The slider asks for ALL of a student's going-out spend, not her spend at
  // TapIn venues. So the figure has ONE load-bearing assumption — that the same
  // money lands on the network — and it now rides beside the figure rather than
  // inside a disclosure. The rest is arithmetic, and stays in the drill.
  const pct = Math.round(alcoholShare * 100);
  const condition = "If you spend that at these places.";
  const basis =
    `About ${visits} visits of $${VISIT_SIZE_USD}, across ${places} ` +
    `${places === 1 ? "place" : "places"}. ` +
    `${pct}% of it alcohol, which only the 15% skips.`;

  return {
    monthlySpendUsd,
    alcoholShare,
    eligibleSpendUsd: money(nonAlcoholCents),
    visitSizeUsd: VISIT_SIZE_USD,
    visits,
    places,
    modelledSpendUsd: money(modelledCents),
    percentSavingUsd: money(percentCents),
    creditSavingUsd: money(creditCents),
    pointsSavingUsd: money(pointsCents),
    steadyUsd: money(steadyCents),
    firstMonthUsd: money(firstMonthCents),
    weeklyUsd: money(Math.round(steadyCents / WEEKS_PER_MONTH)),
    priceUsd: FOUNDING_MONTHLY_USD,
    netUsd: money(steadyCents - priceCents),
    creditsEarned,
    condition,
    basis,
    /* ══ PLAIN, NOT CLEVER ══════════════════════════════════════════════
       Was "An illustration, not a quote." Sam, 13 Sep 2026: "what does it mean
       that we've got 'an illustration, not a quote' — I think we'd want to
       remove that, it's being too cheeky."

       Both halves of that are right. "Quote" is a trade word — a builder gives
       you a quote — and next to a dollar figure on a student's phone it reads
       as wordplay rather than as a caveat, which is the one thing a caveat may
       not do. "An estimate" is the ordinary word for exactly this number.

       IT IS NOT DELETED, and that is the only part of his note I have not taken
       literally: this is a modelled figure sitting one tap from a charge, and
       §7 requires the page to say so wherever it appears. The cheek is gone;
       the disclosure is not. One word from Sam and it goes entirely. */
    disclaimer: "An estimate.",
  };
}
