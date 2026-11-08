# /parents copy, draft v1 (from the parent-marketing research session, 5 Nov 2026; Sam approved sending it)

Written against Sam's 5 Nov answers: billing starts when the student activates; the
student can cancel and the parent is emailed; full membership but bar perks aren't
advertised; the regular $3.99 then $7.99 offer.

[CHECK] items, resolved here:
- Support contact: support@tapin.app (the address the rest of the site uses).
- "More places are joining": the student page already says it (the Coming tiles), so it
  stays.
- "in Blacksburg" rather than "downtown", until all five addresses are confirmed
  downtown.

The activation text is 151 characters, plain ASCII, one GSM-7 segment with an 8-letter
name and a ~30-character link: no em dashes or emoji in it.

## Hero
Headline: They're eating out in Blacksburg anyway. Make it cost less.
Subhead: Tapin Plus gives your student $5 back every week at each of five Blacksburg
spots, on any $10+ food order. Sign them up with just their phone number. You won't be
charged until they activate.
Primary button: Sign up my student
Under the button: $3.99 the first month, then $7.99/month. Cancel anytime.
Alternate headline to A/B test: Their dining plan stops at the edge of campus. Tapin Plus
doesn't. (True: VT dining-plan dollars only work at VT Dining locations.)

## Section 1: How it works
1. You add their number. Enter your student's mobile number and your payment details.
   Nothing is charged yet.
2. They activate. They get one text from Tapin, tap the link and confirm their own
   number. That's when your first $3.99 is charged.
3. They save every week. $5 back every week at each Plus place, every time they order
   $10 or more of food through Tapin.

## Section 2: What they get
- $5 back every week at each place on orders of $10 or more of food or soft drinks.
- Or 15% off, once a day.
- One benefit per order.
- Alcohol is never discounted.
Two $10 orders a month cover the $7.99. A $13 lunch costs $8 after the credit.

## Section 3: Where it works
| Place | What to order |
|---|---|
| Coffeeholics | coffee and breakfast sandwiches |
| Sweetopia | ice cream and desserts |
| Olaika | pizza and burgers |
| The Burg | tacos and Latin plates |
| The Milk Parlor | baskets and bar food |
Footer: More places are joining.

## Section 4: Keep their dining plan
VT dining-plan dollars only work at VT Dining locations. Tapin Plus is for the meals they
buy off campus, so it works alongside whatever plan they have, or no plan at all.

## Section 5: No surprises
- You won't be charged until they activate. If they never activate, you're never charged.
- $3.99 the first month, then $7.99 a month.
- You can cancel anytime from the link in your email.
- They can cancel in the app too. If they do, your billing stops and we'll email you.
- If they already have Tapin Plus, you take over billing when they accept. No one is
  charged twice.
Closing button: Sign up my student

## FAQ
Does this replace their meal plan?
No. Students living on campus have to have a VT dining plan. Tapin Plus is for the meals
they buy off campus at our Plus places. Many students living off campus have no plan at
all, and that's where it helps most.

What if they don't use it?
Two $10 orders a month cover the cost. If it isn't getting used, you or your student can
cancel anytime. If they never activate, you're never charged.

Can I see what they order?
No. You'll get receipts for what you pay, but their orders stay with them.

Does it work at bars?
Some Plus places serve alcohol, but Tapin Plus never discounts it. At select places,
members can also use their benefits on cover charges and line skips. Entry follows each
venue's own age rules.

What do you text my student?
One text to activate, and up to two reminders if they haven't. We don't send them
marketing texts unless they sign up for them.

What phone do they need?
iPhone: the Tapin app. Android: the Tapin web app in their browser.

My student already has Tapin Plus. What happens?
When they accept, billing moves to you and their own subscription ends. No one is charged
twice.

How do I cancel?
Use the "manage or cancel" link in your receipt email. Your student can also cancel in
the app, and we'll let you know if they do.

Who do I contact with questions?
support@tapin.app

## Form microcopy
Labels: Your student's first name / Your student's mobile number / Confirm their number /
Your name / Your mobile (no email for now, 6 Nov 2026: no automated emails yet; the done screen no longer mentions a receipt)
Helper text under the number field: We'll text this number once so they can activate.
They confirm it with a code, so double-check it.
Above the payment field: You won't be charged until they activate. Then it's $3.99 the
first month and $7.99/month after. Cancel anytime.
Button: Save and send their invite
Confirmation heading: Invite sent to [Name].
Confirmation body: We've texted [•••1234] an activation link. You'll get an email when
they activate, and that's when your first $3.99 is charged. If they haven't activated in
14 days, the invite expires and you're never charged.

Student activation text (under 160 characters):
Tapin: [Parent first name] signed you up for Tapin Plus, $5 back every week at 5
Blacksburg spots. Activate: [link] Reply STOP to opt out

## Fine print (footer)
$5 credit every 7 days per Plus place on $10+ orders of food or non-alcoholic drinks
placed through Tapin, or 15% off once a day. One benefit per order. Alcohol excluded.
$3.99 first month, then $7.99/month until cancelled. Billing begins when your student
activates. Tapin is not affiliated with Virginia Tech.

## Not on this page, on purpose
- Claims we can't back yet: the spots-left counter, "members save $60 a month", the
  savings calculator, "500+ students", "trusted by".
- Money-back / Plus Promise: off until it's in the Terms.
- Meal-plan framing: "meal-plan alternative", "cheaper than a meal plan".
- Control claims: "budget control", "the money goes to food".
- 529: no mention.
- Points: real, but their value isn't verified, so left out.
- Hero imagery: no bar, cover or line-skip images; the bars question is answered in the
  FAQ instead.
- VT marks: no VT logos or marks; "Hokie" as a word is fine, but imply no affiliation.

---

# As built: charge at checkout (Sam, 5 Nov 2026)

Sam then chose the simpler flow: "that's fine, they're charged immediately, we can have
them type the number twice yeah. The text to the student wouldn't have to change." So the
parent pays $3.99 at checkout, Plus goes on the student's number at once, and the student
signs in to Tapin with that number. The draft above is used as written except these lines,
which assumed billing at activation:

- Hero subhead: Tapin Plus gives your student $5 back every week at each of five
  Blacksburg spots, on any $10+ food order. Sign them up with just their phone number.
- How it works:
  1. You add their number. Enter your student's mobile number and pay $3.99 for the
     first month.
  2. They sign in. They get one text from Tapin and sign in to Tapin with their own
     number. Their Plus is already there.
  3. They save every week. (unchanged)
- No surprises:
  - $3.99 today for the first month, then $7.99 a month.
  - Full refund if they don't save what you spent. (Sam, 7 Nov 2026: no refund for
    never signing in, "if someone doesn't claim it they don't claim it ... We still bill
    them".)
  - You can cancel anytime from the link in your email. (unchanged)
  - They can cancel in the app too. If they do, your billing stops and we'll email you.
  - If they already have Tapin Plus, billing moves to you and their own subscription
    ends. No one is charged twice.
- FAQ, What if they don't use it?: Two $10 orders a month cover the cost. If it isn't
  getting used, you or your student can cancel anytime. (7 Nov 2026, as built: "Two $5
  credits used in a month cover the $7.99. If they don't save what you spent, ask for a
  full refund. You or your student can cancel anytime.")
- FAQ, What do you text my student?: One text to let them know, and up to two reminders
  if they haven't signed in. We don't send them marketing texts unless they sign up for
  them.
- FAQ, My student already has Tapin Plus?: Billing moves to you and their own
  subscription ends. No one is charged twice.
- Form helper under the number: We'll text this number once to let them know. Their
  Plus is tied to it, so double-check it.
- Above the payment field: $3.99 today for the first month, then $7.99/month until you
  cancel. Cancel anytime from the link we email you.
- Button: Pay $3.99 and send their text
- Confirmation heading: [Name]'s Tapin Plus is on.
- Confirmation body: We've texted [•••1234]. They sign in to Tapin with that number and
  it's there. Your receipt and a manage or cancel link are in your email. (The 14-day
  refund sentence is gone, 7 Nov 2026.)
- Student text, unchanged (Sam), its link now the sign-in page: Tapin: [Parent first
  name] signed you up for Tapin Plus, $5 back every week at 5 Blacksburg spots.
  Activate: https://plus.tapin.app/in Reply STOP to opt out
- Fine print: "Billing begins when your student activates." becomes "Billed today, then
  every month until cancelled. Refunded in full on request if your student doesn't save
  what you spent." (7 Nov 2026: the 14-day sign-in refund is gone.)

---

# v2 messaging block: Virginia Tech + per-meal (Sam approved, 5 Nov 2026)

From the parent films messaging session ("Parent films: VT hook, meal math, Hormozi
scripts"); full page with sources: https://claude.ai/artifact/DAZwecbvLaKzuFsP6G3wAA
("Page block"). Overrides the hero and adds a section and a value stack.

HERO
- Eyebrow: "For Virginia Tech parents". Until legal clears naming VT in paid traffic:
  "For parents of Blacksburg students" (safe to ship now).
- H1: "The places they already eat in Blacksburg, for less."
- Sub: "A dining hall lunch is $17.95 at the door. Downtown, a $12 lunch is $7 with Tapin
  Plus, every week, at each of five spots. Sign them up with just their phone number."
- Button / under: "Sign up my student" · "$3.99 the first month, then $7.99/month. Cancel
  anytime."
- A/B against the earlier H1 "They're eating out in Blacksburg anyway. Make it cost less."

NEW SECTION "What a lunch costs"
- A dining hall lunch at the door¹: $17.95
- A $12 lunch downtown: $12.00
- The same lunch with Plus, using the week's $5 credit²: $7.00
- Their other orders, 15% off once a day²: $10.20
¹ VT Dining's posted door rate for lunch and dinner at D2 and Owens Food Court, Nov 2026
  (dining.vt.edu/dining_centers/dietrick-hall.html, owens.html).
² Menu prices before tax (Coffeeholics' California Club, $12.00). $5 credit every 7 days
  per Plus place on $10+ orders of food or non-alcoholic drinks, or 15% off once a day.
  One per order. Tapin is not affiliated with Virginia Tech.

VALUE STACK (no total anywhere: no weekly dollar sum)
- $5 off a meal every week at each Plus place. A $12 lunch is $7.
- 15% off once a day on their other orders. Food and non-alcoholic drinks.
- Places they already go: Coffeeholics, Sweetopia, Olaika, The Burg and The Milk Parlor.
  New Plus places are added at no extra cost.
- Points on every order, toward free food at each place (optional; never a points value).
- On their number right away. You pay, they sign in with their number, and it's there.
- One lunch covers the first month. The $5 credit is more than $3.99. After that, two
  lunches a month cover $7.99.
Reassurance: "Full refund if they don't save what you spent" (7 Nov 2026; it replaced
the 14-day sign-in refund, which is gone) and "Cancel anytime". No other money-back line.

KEEP the FAQ "Does this replace their meal plan? No…". Hold the line: price one meal,
never the plan; no plan price ($3,413/$2,090), no "$11 a meal", no "cheaper than a meal
plan" or "alternative", no "Hokie" or VT marks.

Open check (for Kiran): src/model/savings.ts says "Credit spent does not count toward"
the $10 minimum. If the $10 is measured after credit, a credit-paid $7 lunch doesn't earn
next week's $5, so any "+$5 back for next week" on a credit-paid order is wrong and
"every week" weakens. The student page's FAQ says an order that uses credit "still earns
new $5 back, as long as it's $10 or more", which doesn't settle which total counts.

---

# v2 final hero (Sam approved, 5 Nov 2026; matches the re-cut films)
From the parent films messaging session, "Final v2" on
https://claude.ai/artifact/DAZwecbvLaKzuFsP6G3wAA. Overrides the v2 block's hero; the rest
of the v2 block stands, with the one change below.

HERO (film 1's hook)
- Eyebrow: "For Virginia Tech parents" (ship "For parents of Blacksburg students" until legal
  clears it)
- H1: "Does your kid text you for food money?"
- Sub: "Make it go further at the places they already eat. With Tapin Plus, a $12 lunch
  downtown is $7, every week, at each of five spots. First month $3.99, and one lunch
  covers it."
- Button / under: "Sign up my student" · "Just their phone number. $3.99 the first month,
  then $7.99/month. Cancel anytime."
- A/B: this vs "They're eating out in Blacksburg anyway. Make it cost less."

CHANGE: "What a lunch costs" goes BELOW the value stack, and its first row reads "A dining
hall lunch, paid at the door: $17.95" (holiday traffic is mostly first-year parents who
prepaid the plan: they meet $12 → $7 first; the door price is context, not the lead).

## The gift (Sam, 6 Nov 2026: picked the envelope and the letter)

**Headline test, gift round** (`plus-parent-hero-gift`, a third each; the 5 Nov round is retired):
- a · "A care package they’ll open every week."
- b · "Lunch is on you. Even from home."
- c · "Send them Tapin Plus, with a note from you."

**The callout on /parents** (under the offer card): "Send it with a note" / "Write them a
few words when you sign up. They get a text, tap it, and open their Plus like a present."
/ button "Send Tapin Plus" / link "See what they’ll see" (opens /gift/sample).

**In the checkout** (the "You" step; open already when they came from the callout):
"Add a note for {Student}" folds open to "A note for {Student} (optional)", "Your note"
(240 characters, placeholder "Thinking of you, my love! Here’s a little something to treat yourself. Hang in there! Proud of you!"), help
"Up to 240 characters. They open it like a present when they tap their text. Only they
get the link.", "Sign it" (placeholder "Mom"), "A photo (optional)" / "Add a photo" /
"Change" / "Remove", help "Only {Student} sees it, on their gift. We delete it when their
Plus ends.", and "Background" (Maroon, Picnic, Night sky, Confetti, Airmail, Sunrise, Blue Ridge, Hearts,
Flannel, Lunch, Sunburst, Fall leaves), "Preview their gift". The fold button
reads "Add a note or a photo for {Student}"; the section is "For {Student}, from you
(optional)". Old line, kept for reference:
"Sign it" (placeholder "Mom"). Done screen: "We’ve texted •••0123 a link to your note."

**The text to the student** (Sam's words, 6 Nov 2026): `Tapin: You have a gift from {Who}. Open it: https://plus.tapin.app/gift/{token} Reply STOP to opt out`

**The gift page** (/gift/{token}):
- The envelope is the care package (kraft, twine, a maroon seal with the flat Plus mark),
  on the parent's background; the parent's photo is printed at the top of the letter.
- Sealed: "{Student}, {Who} sent you something" / "Open it".
- The dock once it's open: "Claim my gift" (the app).
- Open: "{Student}, {Who} got you a little surprise!" (Sam, 8 Nov 2026; was "{Who} got you Tapin Plus"), the letter ("For {Student}", the note, "— {Who}"; with
  no note: "{Who} signed you up for Tapin Plus."), "What’s in it" ($5 back every week at
  each place below, on a $10+ food order; 15% off instead, once a day, whenever that’s
  better; points on everything you order; the five logos), "Get the app", "Sign in with
  your number, •••0123. Plus is already on it.", "Text {Who} a thank-you".
- Ended: "{Who}’s gift has ended" / "Tapin Plus isn’t on {Student}’s number anymore. You
  can still join on your own." / "See Tapin Plus".
- Didn’t load (offline, busy): "Your gift didn’t load" / "Check your connection and try
  again." / "Try again".
- Link didn’t open (gift_lookup’s 404): "We couldn’t open this gift" / "The link may be old. If someone
  signed you up for Tapin Plus, it’s on your number: sign in with it." / "Get the app" /
  "Sign in on the web".

## Changing or cancelling (Sam, 6 Nov 2026)

"parents can manage their subscription any time by emailing support@tapin.app - or their
student can cancel it in the tapin app." On the page: FAQ "How do I cancel?" → "Email
support@tapin.app any time and we’ll change or cancel it for you. Your student can also
cancel in the Tapin app, and we’ll let you know if they do."; the assurance row "Change
or cancel by email"; the checkout's terms and done screen say the same.

## The reminder before each bill is an email (Sam, 8 Nov 2026)

"let's not do the text notifications, I think that'll lead to more churn to be honest.
Maybe email notifications?", and asked which: "Bill reminders → email". It goes to the
parent's email (`parent_email`); the backend change is draft PR
kirantapin/tapin_edge_functions#287. On the page:
- Under the offer: "**An email before each bill**, a few days ahead" (a bell, so it
  doesn't twin the "Cancel anytime" mail row under it).
- No surprises: "An email before each bill" / "A few days before each monthly charge, we
  email you the date and the amount."
- How it works for you, step 4: "We email you before each monthly bill. To skip a month,
  cancel, or get a full refund if they didn’t save what you spent, email
  support@tapin.app." The phone shows the email open: "{Student}’s Tapin Plus renews
  {Mon D}", from Tapin, "{price} on {Mon D}. To skip a month, cancel or get a refund,
  email us.", support@tapin.app.
- Checkout, who and pay steps: "We’ll email you a few days before each renewal".
- Done, Before each bill: "We email you a few days before each {price} renewal. The
  first is {date}."
Still texts: the gift text to the student, the student's sign-in reminders, the receipt
("We’ll text you a receipt").
