# The $5 credit, the 15% and alcohol: never on alcohol

Decision, Sam, 28 Oct 2026: "the credit and 15% off can't be used on alcohol
at all unfortunately, but they can be applied to food that's ordered with
alcohol", and "You can earn credit from purchasing any items though, which is
a big one. So if I bought a bunch of alcohol I can use the credit I earned on
that towards anything that's not alcohol."

This replaces `docs/CREDIT-HOURS-2026-09-30.md` (the 9 p.m.–2 a.m. rule). The
site's copy and terms already say it (`spendScope`, `earnLine`, `spendLine`,
`creditScopeTerm` in `src/model/content.ts`).

## The rule

1. **Tag every line** as alcohol or not, from the venue's menu data. Unknown
   counts as alcohol.
2. **Earning is unchanged and covers everything.** Any $10+ order earns the
   week's $5 credit at that place, whatever the order includes, alcohol
   lines counted toward the $10. Points earn on every line as before.
3. **Spending skips alcohol, at every hour.** The credit and the 15% apply to
   non-alcohol lines only. There are no hours any more.
4. **Mixed orders.** On an order with alcohol and other items, the credit and
   the 15% apply to the other items; the alcohol lines are charged in full.
5. **Nothing to apply.** An order with only alcohol lines spends no credit and
   takes no 15%; it goes through at full price and the credit stays in My
   Spot. Show the member why, in one line.
6. **No line below $0.** The credit spreads across the non-alcohol lines and
   never takes any line below $0; whatever is left of the $5 stays on the
   account only if the backend already supports partial balances (otherwise
   the credit applies up to the non-alcohol subtotal and the rest lapses, as
   it does today for a small order).

## Test cases

| Order | Lines | Credit and 15% go to |
|---|---|---|
| any time | wings $10, beer $6 | wings only; beer full price |
| any time | 2 × beer $5 | nothing; full price; credit kept; this order EARNS the credit |
| any time | beer $6, soda $3, fries $4 | soda and fries |
| 7 p.m. | cocktail $12 | nothing; full price |
| any time | burger $14 | burger ($5 credit, or 15%) |

## What the site says

- Everywhere the rule is printed (home page, checkout, pitch, venue pop-up,
  Coffeeholics, /how): "Every $10+ order earns your $5 credit, whatever you
  order. Your credit and 15% off go toward anything but alcohol, even when
  alcohol is on the same order."
- Terms (every plan, after the guarantee): "Your $5 credit is earned on any
  $10+ order, once a week at each place, whatever the order includes. The
  credit and the 15% off go toward anything but alcohol; on an order that
  includes alcohol, they apply to the other items."

## The guarantee changed the same day

Sam: "we should say 'refund auto approved if you don't save what you spend on
the membership' - we don't auto refund, but their refund is approved should
they want it." The site no longer says the refund is automatic. The member
asks; if their TapIn orders show they saved less than they paid for the
membership, the refund of the difference is approved without review. Terms:
"If you don't save at least what you spend on the membership, ask for a
refund of the difference and it is approved automatically. Checked every
year (or every 3 months, on the pass) against your TapIn orders."
