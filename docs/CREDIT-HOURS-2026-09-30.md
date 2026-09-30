# The $5 credit, the 15% and alcohol: the hours rule

Decision, Sam, 30 Sep 2026: "let's do the 9pm to 2am thing", and later the
same day, "the 15% off and credit can be used towards alcohol outside the
hours of 9pm to 2am." This is the rule the ordering backend has to apply when
it spends a member's credit or applies the 15%. The site's copy and terms
already say it (`benefitScopeNote`, `creditHoursTerm` in
`src/model/content.ts`). Research behind it: `docs/virginia-alcohol-research.md`
in tapin-blacksburg (11 Sep) and the compliance check of 30 Sep. Not legal
advice; for counsel and the regional ABC Special Agent in Charge to confirm.

## Why

Virginia bars any reduced drink price between 9 p.m. and 2 a.m. (3VAC5-50-160
C 1; ABC: "No discounts are permitted after 9 p.m."). Merchants absorb the
credit and the 15%, so when either comes off a drink, the bar has sold that
drink at a reduced price. Before 9 p.m. that is a lawful happy hour,
members-only included. After 9 p.m. it is not. A drink the credit pays for in
full is a gift of alcohol (3VAC5-70-100), which has its own limits, so no
drink line may reach $0. A 15% cut never reaches $0, and never approaches the
bar's cost, so it needs only the hours and the records.

## The rule

When an order spends credit, or takes the 15%:

1. **Tag every line** as alcohol or not, from the venue's menu data. Unknown
   counts as alcohol.
2. **Quiet hours.** If the order is placed at or after 21:00 or before 02:00,
   Blacksburg time (America/New_York), the credit may be applied only to
   non-alcohol lines. Use the time the order is placed; if fulfilment time is
   known and also falls in the window, the same applies.
3. **Food first, at every hour.** Apply the credit to non-alcohol lines before
   any alcohol line.
4. **No line to $0.** If the credit reaches alcohol lines, spread it across
   them pro rata, and never take more than 99% of any alcohol line.
5. **Nothing to apply.** In quiet hours, an order with no non-alcohol lines
   spends no credit; the order goes through at full price and the credit
   stays in My Spot. Show the member why, in one line.
6. **Earning is unchanged.** Any $10+ order earns the credit at any hour.
   Earning never lowers a drink's price, so the hours do not touch it.
7. **The 15% follows rule 2.** Outside quiet hours it applies to every line,
   alcohol included. In quiet hours it applies to non-alcohol lines only; a
   drinks-only order in quiet hours pays full price. Rules 3 and 4 are about
   the credit; a percentage needs neither.

## Records

For every credit spent or 15% applied, record per line: the menu price, the
reduction, the price after it, and the order time. ABC may otherwise presume every
drink was sold at the highest posted menu price (3VAC5-70-90 E). Keep the
venue's POS in step: a drink line the credit touched is a reduced-price sale.

## Test cases

| Order (time) | Lines | Credit goes to |
|---|---|---|
| 7 p.m. | 2 × beer $5 | $2.50 off each beer |
| 7 p.m. | wings $10, beer $6 | $5 off wings |
| 11 p.m. | wings $10, beer $6 | $5 off wings |
| 11 p.m. | 2 × beer $5 | none; full price; credit kept |
| 11 p.m. | beer $6, soda $3, fries $4 | $5 off soda and fries |
| 1:30 a.m. Sat | cocktail $12 | none; full price; credit kept |
| 2:05 a.m. | cocktail $12 (closed venue, Save to My Spot) | $5 off, if the venue allows |
| 8:55 p.m. placed, served 9:10 p.m. | beer $6 | $5 off; log both times |
| 7 p.m., 15% order | 2 × beer $5 | 15% off each beer |
| 11 p.m., 15% order | wings $10, beer $6 | 15% off wings; beer full price |
| 11 p.m., 15% order | 2 × beer $5 | none; full price |

## What the site says

- Venue pop-up, checkout, pitch, Coffeeholics and /how: "Your $5 credit and
  15% off go toward all food and drink. From 9 p.m. to 2 a.m., food and soft
  drinks."
- Terms (every plan, after the guarantee): "Your $5 credit (on a $10+ order,
  once a week at each place) and the 15% off go toward all food and drink.
  From 9 p.m. to 2 a.m., food and soft drinks."

The 21:00 and 02:00 are `BENEFIT.creditQuietFrom` and `BENEFIT.creditQuietTo`
in `src/model/savings.ts`, so the copy and the rule share one source. If the
backend keeps its own constants, they must match.

## Open, for counsel or the SAC

- Whether order time or service time is what counts for the 9 p.m. line.
- Whether points redeemed on drinks should follow the same rule (they lower a
  drink's price the same way).
- The venue's cost floor: a $5 credit on a $10 order is at most 50% off a
  drink, which should clear cost, but the bar's numbers decide.
