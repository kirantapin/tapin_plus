/**
 * The frozen facts, read straight from docs/data/*.json.
 *
 * These files were produced by EXECUTING the old code, not by retyping it
 * (docs/START-HERE.md), so the strings are byte-exact. Nothing here re-declares
 * a price, term, benefit label or guarantee as a literal — every one is read
 * from the extracted data, so no copy in this app can drift from TRUTH.md.
 *
 * Importing across the docs/ boundary is deliberate: a copy under src/ would be
 * a second source of truth, and the first thing to go stale.
 */
import { asset } from "../asset";
import venuesJson from "../../docs/data/venues.json";
import waysJson from "../../docs/data/ways-to-use.json";
import moneyJson from "../../docs/data/money-and-terms.json";
import { BENEFIT } from "./savings";
import { foundingOpen, SEAT_CAP } from "./seats";

export interface Policy {
  id: string;
  kind: "percent" | "credit" | "points";
  label: string;
  detail: string;
}

export interface Venue {
  id: string;
  name: string;
  logo: string;
  hero: string;
  category: string;
  street: string;
  open: boolean;
  /** Carries all three standing benefits. Italiano's does not — and the
   *  ABSENCE of the badge is the signal, so nothing marks it as lesser. */
  plus: boolean;
  /**
   * The merchant's REAL, LIVE TapIn page — present only where one exists.
   *
   * Sam, 13 Sep 2026, giving the two: tapin.app/theburg and
   * tapin.app/coffeeholicsva. It is optional and stays optional: four of the
   * worse than no link. Absence renders nothing — the same §6 move as the
   * Plus badge, where a thing a venue does not have is a row that is not
   * there.
   *
   * ⚠ A PAGE THAT LOADS IS NOT A PAGE THAT TAKES MONEY. All six ids resolve
   * to a TapIn page with that merchant's menu on it, and on 20 Sep 2026 that
   * was briefly mistaken for six live ordering venues. It is not: Sam, the
   * same day, gave Coffeeholics and The Burg, then added The Milk Parlor a
   * few hours later. The other three render a menu but cannot take a payment
   * and have no physical assets in the store. This field means "you can order
   * and pay here today", which is why it is filled one venue at a time on
   * Sam's word, never by inference from a page that renders.
   *
   * It is also the one place this product leaves itself, and since the app
   * preview came out it is the merchant pop-up's only action — so filling it
   * wrongly puts a false claim about a real business on the hero's proof line
   * as well, which reads from exactly this filter.
   */
  liveUrl?: string;
  /** That venue's own standing benefits, from its record — the three at a
   *  Plus place, none at Italiano's, which carries a one-time offer instead. */
  policies: Policy[];
  /** Merchant property, not a token. May only collar the merchant's own mark
   *  (TRUTH.md §6) — never skin a TapIn surface. */
  brandColor: string;
}

/**
 * The shape as it sits on disk. It is NOT the same as Venue: the file carries
 * `policies`, and `plus` does not exist in it — Plus is DERIVED from whether a
 * venue carries the standing benefits at all. Modelling that honestly is the
 * point; a venue cannot be marked Plus by hand and disagree with its policies.
 *
 * The double assertion is confined to these two JSON boundaries: the extracted
 * files type `kind` as a plain string, which does not narrow to the union on
 * its own.
 */
interface VenueRecord extends Omit<Venue, "plus"> {
  locality: string;
  policies: Policy[];
}

export const venues: Venue[] = (venuesJson as unknown as VenueRecord[]).map(
  (v) => ({
    id: v.id,
    name: v.name,
    logo: asset(v.logo),
    hero: asset(v.hero),
    category: v.category,
    street: v.street,
    open: v.open,
    liveUrl: v.liveUrl,
    brandColor: v.brandColor,
    plus: v.policies.length > 0,
    /* The extraction's points policy reads "2× points" with a multiplier of 2.
     Sam, 15 Sep 2026: points are 1× now. The JSON is frozen; the override
     lives here, so no surface can print a multiplier. */
    policies: v.policies.map((pol) =>
      pol.kind === "points" ? { ...pol, label: "Points", multiplier: 1 } : pol,
    ),
  }),
);

export const plusVenues = venues.filter((v) => v.plus);

/**
 * Signed but not yet live.
 *
 * Deliberately NOT in docs/data/venues.json: that file is the frozen production
 * extraction, and putting a venue there that production does not have would
 * break the one guarantee it makes. These are a different class of thing and
 * they carry a tag that says so.
 *
 * (14 Sep 2026: Slake's logo and banner now arrive as public Supabase URLs on
 * the record below — the paragraph that follows predates them.)
 * Slake had no logo, hero or street ON DISK — so it still renders as a
 * monogram rather than borrowing another venue's art, and claims no Plus badge.
 * Sam sent both a logo (a yellow circular "SLAKE · Sip & Savor · Est. 2025"
 * mark) and a food banner on 13 Sep; they are not in the repo, and nothing here
 * claims they are. When they land, `ComingVenue` grows `logo`/`hero` and
 * VenueTicker stops passing undefined for this row — it does NOT move into
 * docs/data/venues.json, which is the frozen production extraction.
 *
 * CATEGORY IS "Bar · Food & drinks", Sam 13 Sep: "keep it as a bar, food and
 * drinks." The mockup said "Bar • Cocktails", and the banner he sent is food —
 * the widened category is what reconciles them. It also keeps the row clear of
 * §10: a cocktails-only framing sits badly beside a membership whose 15%
 * explicitly skips alcohol, and this one does not lead with the exception.
 *
 * THE "$2 OFF FIRST DRINK" IS GONE, and this is now settled rather than open.
 * The mockup gave Slake that benefit; Virginia does not permit discounting
 * alcohol and §10 forbids any claim that it is, so it was never rendered. Sam,
 * this session: "we can remove the $2 off first drink thing yeah." It survives
 * only in docs/dark-reference.html, which is the old mockup and ships nothing.
 * Slake's benefit set is still unsettled — but it is unsettled without a
 * standing offer on alcohol in it, which is a different and smaller question.
 */
/**
 * What the benefits reach. Shown on both the pitch and the checkout, from this
 * one list, so the two surfaces cannot disagree.
 *
 * The old benefit rows said "Food and non-alcoholic drinks", which was far too
 * narrow — the 15%, the points and the credit all reach cover, entry, line
 * skips, tickets and merch. Alcohol is the single exception, and only to the
 * 15%: points and credit still earn on it.
 */
export const covers = [
  { id: "food", label: "Food" },
  { id: "drinks", label: "Drinks" },
  { id: "cover", label: "Cover" },
  /* "Events", not "Tickets". Sam, 20 Sep 2026, listing what the membership
     reaches at each venue: "for the burg, olaika, and the milk parlor it'd be
     events." One word for one thing, on every surface that prints it. */
  { id: "tickets", label: "Events" },
  { id: "lineskip", label: "Line skips" },
  { id: "merch", label: "Merch" },
];

/**
 * What the membership reaches AT ONE VENUE — the `covers` ids that venue
 * actually has, in the order `covers` declares them.
 *
 * Sam, 20 Sep 2026: "for these pop ups I need to be able to see what it can be
 * used on, for all of them food and drinks are included — for the burg,
 * olaika, and the milk parlor it'd be events, and for the milk parlor it's
 * also cover and lineskips."
 *
 * ══ IT IS A SUBSET, AND THE SUBSET IS THE POINT ════════════════════════════
 * `covers` above is the NETWORK's reach: everything the membership touches
 * anywhere. A reader standing in front of one merchant is asking a narrower
 * question, and answering it with the network's six marks would put "Line
 * skips" on a coffee shop. §6's rule is that a thing a venue does not have is
 * a row that is not there, so each venue names its own.
 *
 * Merch is deliberately absent from every venue. It is real at the network
 * level and Sam did not give it per venue, and a scope row is a claim about a
 * named business — so it is listed where it was granted and nowhere else.
 *
 * Keyed by venue id, so a venue with no entry shows no scope rather than a
 * guessed one.
 */
export const venueCovers: Record<string, string[]> = {
  /* Events too. Sam, 20 Sep 2026: "for coffeeholics this also applies for
     events too" — it was food and drinks only, from his first pass, which
     named the other three venues for events and not this one. */
  coffeeholicsva: ["food", "drinks", "tickets"],
  theburg: ["food", "drinks", "tickets"],
  themilkparlor: ["food", "drinks", "cover", "tickets", "lineskip"],
  olaika: ["food", "drinks", "tickets"],
  sweetopia: ["food", "drinks"],
  italianospizza: ["food", "drinks"],
};

/**
 * What a venue's own benefit rows SAY, at that venue.
 *
 * The frozen extraction gives every venue policy the same two detail strings,
 * and the block above BENEFIT_DETAIL already records that both are wrong:
 * "Food and non-alcoholic drinks" is far too narrow for the 15% and wrong in
 * the other direction for points, which earn on everything. Those strings were
 * latent until the merchant pop-up started printing them, and on 20 Sep 2026
 * Sam read them on a phone and asked for the pop-up to be less confusing.
 *
 * ══ WHY NOT JUST REUSE BENEFIT_DETAIL ══════════════════════════════════════
 * Because these are read standing in front of ONE merchant. The network
 * string says "once a week at each place", which is the fact that makes the
 * monthly figure work and is exactly the wrong emphasis on a card about one
 * address; here it is "once a week here". Same fact, same constant, the
 * sentence the reader is actually in.
 *
 * ══ AND WHY THESE ARE CONDITIONS, NOT SCOPES ═══════════════════════════════
 * Scope moved out. `venueCovers` answers "what can I use this on" once, for
 * the whole card, which is what stopped two of these three rows repeating the
 * same four words at each other.
 */
const VENUE_POLICY_DETAIL: Record<string, string> = {
  percent: "Everything except alcohol",
  /* ══ "ON ANYTHING" EARNS ITS WORDS ══════════════════════════════════════
     Sam, 20 Sep 2026: "mention here, that credit can be used towards
     anything, implying alcohol without actually saying it."

     It is the second half of the network string (BENEFIT_DETAIL, his own
     wording from 15 Sep), and it was cut here with the rest of the density
     pass. It is not a flourish: the row directly above this one says
     "Everything except alcohol", and without the contrast a reader carries
     that exclusion down to the credit as well. The credit reaches alcohol and
     the 15% does not, which is the distinction TRUTH is built on — and this
     is how it gets stated without the surface ever advertising a discount on
     a drink, which §10 forbids outright. */
  credit: `On a $${Math.round(BENEFIT.creditMinUsd)}+ order, once a week here. Spends like cash, on anything`,
  /* ══ IT WAS EMPTY FOR AN HOUR, AND THAT WAS THE WRONG CUT ════════════════
     The density pass took this line out on the reasoning that it only
     restated scope, which the `venueCovers` row below now says once for all
     three. Sam, 20 Sep 2026, looking at the result: "not sure why you cut the
     text here for the page preview pop ups."

     He is right, and the reasoning was wrong about what the line is. "Earned
     on every order" is a CADENCE, not a scope — the parallel of the credit's
     "once a week here", and the answer to the question a reader actually has
     about points, which is whether they have to qualify for them. It is also
     his own wording, from the advert's third card, so the pop-up and the
     campaign page say it identically. */
  points: "Earned on every order",
};

/** A venue policy's detail line, corrected. An empty string means the benefit
 *  carries no condition and the row prints none. Falls back to the record, so
 *  a kind that gains a policy later still prints something true. */
export const venuePolicyDetail = (kind: string, fallback: string): string =>
  VENUE_POLICY_DETAIL[kind] ?? fallback;

export interface ComingVenue {
  id: string;
  name: string;
  category: string;
  /** Absolute URLs, not `asset()` paths: Sam hosts these in the Supabase
   *  `membership_images` public bucket (14 Sep 2026), which is the runtime home
   *  for a venue that is not yet in the frozen production extraction. */
  logo?: string;
  hero?: string;
}

export const comingVenues: ComingVenue[] = [
  {
    id: "slake",
    name: "Slake",
    category: "Bar · Food & drinks",
    logo: "https://zgeqnmzuxrvlqliqkkth.supabase.co/storage/v1/object/public/membership_images/slake.jpg",
    hero: "https://zgeqnmzuxrvlqliqkkth.supabase.co/storage/v1/object/public/membership_images/slake%20blacksburg.avif",
  },
];

/**
 * The three standing benefits: identical at every Plus venue, automatic.
 *
 * TWO OF THE THREE DETAIL STRINGS IN THE EXTRACTION ARE WRONG, and they are
 * corrected HERE rather than in the JSON. The extraction is frozen — it was
 * produced by executing the old code, not by retyping it, and the same file
 * holds the consent sentence and the charge rows. Hand-editing it is how a
 * legally load-bearing string eventually gets retyped by someone in a hurry.
 *
 * What the extraction says, and what is actually true (Sam, this session):
 *
 *   percent.detail  "Food and non-alcoholic drinks"
 *                   — far too narrow. The 15% reaches cover, entry, line skips,
 *                     tickets and merch as well. Alcohol is the one exclusion.
 *   points.detail   "Food and non-alcoholic drinks"
 *                   — wrong in the other direction. Points earn on EVERYTHING,
 *                     alcohol included.
 *   credit.detail   "Earned on a $10+ order, once a week"
 *                   — true but incomplete, and the missing two words are the
 *                     ones doing the work: once a week PER PLACE. The whole
 *                     20-credit month in savings.ts exists because of them.
 *
 * Until those two strings rendered nowhere this was latent. The app preview's
 * Deals screen prints b.detail, so it is latent no longer.
 */
/* The threshold is built from the constant, not typed. It was written out here
   as "$10+" and the merchant page derives the same figure from
   BENEFIT.creditMinUsd a few hundred pixels away — two sources agreeing today,
   on one page, by hand. */
/* Rob's VT readers, 14 Sep 2026: "instead of 2x points, say something like earn
   points towards rewards". The label is overridden the way the two details
   already are — the extraction is frozen, the words are not. "Double" keeps the
   2x fact in the detail so the label can say what points are FOR. */
const BENEFIT_LABEL: Record<string, string> = {
  points: "Points toward rewards",
};
const BENEFIT_DETAIL: Record<string, string> = {
  percent: "Everything except alcohol",
  /* Sam, 15 Sep 2026: "mention that credit acts like cash, can be used
     towards anything." One string, so the pitch card, the checkout's
     checklist and the app's Deals row all say it the same way. */
  credit: `On a $${Math.round(BENEFIT.creditMinUsd)}+ order, once a week at each place. Spends like cash, on anything`,
  /* Sam's wording, 14 Sep 2026: "redeem for free food, drinks, etc. at each
     place". "Drinks" was raised as an alcohol-adjacent word beside a 15% that
     excludes alcohol (docs/virginia-alcohol-research.md); his call to keep it —
     points redeem for what the place offers, and the exclusion is stated on
     the 15% card. */
  points: "Redeem for free food, drinks, etc. at each place",
};

export const benefits = (moneyJson.benefits as unknown as Policy[]).map(
  (b) => ({
    ...b,
    label: BENEFIT_LABEL[b.id] ?? b.label,
    detail: BENEFIT_DETAIL[b.id] ?? b.detail,
  }),
);

/**
 * "Save at least what you pay, or we refund the difference."
 * The DIFFERENCE, not the whole fee — and it is a promise the SERVER keeps.
 * No surface may imply a client computes it (TRUTH.md §3).
 */
export const guarantee: string = moneyJson.guarantee;

export const GUARANTEE_CONTACT = "support@tapin.app";

/* Money primitives, declared before the first string that spends them. `usd`
   used to sit beside PASS_TODAY further down; it is up here now because the
   seat sentence needs it, and a second copy is exactly how two surfaces start
   formatting the same figure differently. */
const usd = (n: number) => `$${n.toFixed(2)}`;
const cents = (n: number) => Math.round(n * 100);
/**
 * Is the founding round still open? Read ONCE, here, for the life of the page.
 * See the block above PLANS for why that is a safety property rather than a
 * convenience — the consent sentence and the amount charged both derive from
 * it, and they must not be able to disagree.
 */
export const FOUNDING_OPEN = foundingOpen();

/**
 * THE NOUN ON EVERY CONTROL THAT TAKES MONEY, and the card's plan label.
 * Pre-deploy review, 14 Sep 2026: after the flip the rows, the consent and the
 * terms inside the sheet correctly said "seat" while the sheet's title, its
 * aria-label, the receipt and every Reserve button on the site still said
 * "founding seat" — a term contradiction inside the §4 block, on the surface
 * that charges. One export, consumed everywhere the word appears, so the flip
 * changes all of them or none.
 */
/* "Early Bird Special", not "founding seat" — Sam, 14 Sep 2026, after Rob's VT
   readers found the site "too complicated". The identifiers keep the old word
   (FOUNDING_OPEN, cardPlan's branch) because they name the STATE, not the copy. */
export const seatNoun = FOUNDING_OPEN ? "Early Bird Special" : "seat";
/* "Get early access" — Sam, 14 Sep 2026, replacing "Get the Early Bird Special". */
export const reserveCta = FOUNDING_OPEN ? "Get early access" : "Reserve a seat";
/** What the card prints under PLAN: Founding while the seats last, and after
 *  that the plan a reader is actually buying, in TRUTH §2's own word. */
export const cardPlan = FOUNDING_OPEN ? "Early Bird" : "Standard";

/**
 * EVENTS, SAID ONCE AND QUIETLY. Sam, 14 Sep 2026: "TapIn also includes
 * discounts to local events that are hosted on the TapIn platform with TapIn
 * Plus partners. That's less of an emphasis, but I would probably include
 * something like that somewhere." So: one sentence, no figure — the 15% is the
 * discount that reaches tickets (see `covers`), and no event exists in the data
 * to price — printed where a member would look for it: the Tickets slot of a
 * venue's My Spot, and the standing-benefits note on the app's Home.
 */
export const eventsNote =
  "Member prices on events TapIn Plus places host on TapIn.";

/** The post-founders rates. See the block beside the pass repricing below for
 *  why these override the extraction rather than editing it. */
/**
 * THE EARLY BIRD PRICE. Sam, 14 Sep 2026: "this is such a good deal that we
 * could charge $6.99 per month instead of $4.99 per month as the early bird
 * subscription price." Overrides the extraction's `pricing.foundingMonthly`
 * (4.99) the same way AFTER_MONTHLY overrides its $9.99 — the JSON is frozen,
 * the constant is the truth, and every rendered figure (price, seat sentence,
 * charge rows, consent, terms, savings) derives from this one number.
 *
 * FLAGGED, NOT DECIDED HERE: the 3-month pass is still $11.99 ($4.00 a month)
 * and the year $47.96 ($4.00 a month), so both now undercut the monthly by 43%.
 * TRUTH.md records that an incoherent monthly/pass pair was fixed once already.
 */
/* Sam, 15 Sep 2026: "the entry price would be $9.99 instead of $6.99 — I honestly
   think a lot of people would still buy it at that price point." The pass
   ($16.99 / 3 months) and the year (4 passes) were not mentioned and stay. */
/* Sam, 15 Sep 2026 (late): "50 early bird seats at $6.99 a month … then it
   should automatically go up to $9.99 after that." The flip is
   FOUNDING_OPEN, as before; the standard ladder is the one that was
   founding an hour earlier (9.99 / 24.99 / 79.99), and the founding ladder
   keeps the same shape under it (3 months = 2½, a year = 8). */
/* ✅ 15 Sep 2026: $6.99 → $3.99. Every figure downstream — the hero price, the
   charge rows, the consent sentence, the terms, `paidTodayCents` and the amount
   the wallet is mounted with — derives from this one line, so there is no
   second place to edit on the client.

   ⚠ THE SERVER DOES NOT READ THIS. `create_simple_intent` charges a Stripe
   PRICE ID (`EARLY_ACCESS_PRICE_ID` / `SUBSCRIPTION_PRICE_ID`), and
   `FIRST_INVOICE_TOTAL_CENTS` in SubscriptionPayButton is a hand-kept copy of
   the same figure. Until both are moved to 399, the consent sentence says
   $3.99 and Stripe invoices $6.99 — which is the one thing TRUTH §4 exists to
   prevent. Do not deploy this alone. */
/* ✅ 18 Sep 2026: $3.99 → $4.99. The three client-side copies of this figure
   moved together — here, `FIRST_INVOICE_TOTAL_CENTS` in SubscriptionPayButton,
   and `FOUNDING_MONTHLY_USD` in model/savings.ts, which had been left at $9.99
   through the last two repricings and so was quoting the slider's net saving
   against a price nobody was being charged.

   ⚠ THE STRIPE PRICE IDS STILL HAVE TO MOVE. Same warning as the line above,
   and it has not been discharged by this edit: the edge function charges a
   price id, not this number. Until `EARLY_ACCESS_PRICE_ID` /
   `SUBSCRIPTION_PRICE_ID` are repointed at a 499 price, the page says $4.99
   and Stripe invoices $3.99. Do not deploy this alone. */
/* 23 Sep 2026: $4.99 → $5.99, with `FIRST_INVOICE_TOTAL_CENTS` and
   `FOUNDING_MONTHLY_USD`. Same Stripe warning: the price ids must move to a
   599 price before this deploys. */
const FOUNDING_MONTHLY = 5.99;
/* The first Early Bird round, shown on /reserve as sold out above the $5.99
   "Early-ish Bird" tile. Display only — nothing charges this figure. */
export const firstEarlyBirdPrice: string = usd(4.99);
/* Sam, 15 Sep 2026 (later still): "for everyone else, we do $14.99 a month,
   25% discount for 3 months, and 40% discount for a full year." 3 × 14.99 =
   44.97, less 25% = 33.73 → $33.99 (24% off at the .99); 12 × 14.99 = 179.88,
   less 40% = 107.93 → $107.99 (40% off). The Early Bird ladder is untouched. */
const AFTER_MONTHLY = 14.99;
/* ══ ONE SHAPE FOR BOTH LADDERS ═════════════════════════════════════════════
   Sam, 15 Sep 2026: "go through the pricing and make sure it actually makes
   sense, mine was just a reference point." His reference: $9.99 / $22.99 /
   $79.99 over a standard $14.99 / $34.99 / $139.96. Two things did not hold:
   the standard year (4 × $34.99) cost the same per month as the standard pass,
   so nobody would ever pick it; and the pass took most of the discount, so
   the year was only 13% better than four passes.

   The ladder now has one shape at both prices: three months cost 2½ months,
   a year costs 8 months (a third off), and Early Bird is a third off every
   rung. Per month that reads 9.99 → 8.33 → 6.67 founding and 14.99 → 12.66 →
   10.00 standard — each longer commitment cheaper than the last, and the year
   20% under four passes, which is a reason to choose it.

     founding  $9.99   $24.99 / 3 mo   $79.99 / yr (+ tee)
     standard  $14.99  $37.99 / 3 mo   $119.99 / yr                          */
const AFTER_PASS = 33.99;
const saves = (now: number, after: number, periodsPerYear: number) => ({
  now: usd(now),
  after: usd(after),
  amount: usd((cents(after) - cents(now)) / 100),
  percent: Math.round((1 - cents(now) / cents(after)) * 100),
  /**
   * The same saving over a year — the figure that answers "what does acting now
   * actually get me?", which $10 a month does not. Derived from the plan's own
   * billing period so the pass is multiplied by 4 and the monthly by 12, rather
   * than both being annualised as if they billed the same way.
   */
  perYear: usd(((cents(after) - cents(now)) * periodsPerYear) / 100),
});

/**
 * The only seat sentence any surface may print (TRUTH.md §2). It names both the
 * founding and the post-launch price, so it is not a bare first payment.
 * There is NO seat count anywhere — the cap is real, the count is not.
 *
 * REBUILT, NOT QUOTED, as of 13 Sep 2026. The extraction's string ends "$9.99
 * after that" and Sam raised the standard monthly to $14.99, so quoting it
 * would have printed a retired price in the one sentence §2 says every surface
 * must use. The shape is the extraction's, clause for clause; only the figure
 * moves, and it moves from the same constant the plan terms read.
 */
/**
 * THE SENTENCE, IN PARTS. Sam, 14 Sep 2026: "the $14.99 should be a stroke
 * through price instead of just sitting there. We want people to know that
 * 14.99 is what they pay if they don't join a founding seat."
 *
 * A struck figure is a presentation, and §2 governs the WORDS — so the words
 * are kept by construction: `seatCapLine` below is these parts joined, and the
 * one renderer (shell/SeatCapLine.tsx) prints the same parts in the same order
 * and only dresses the two prices. `now` is the rate the reader pays; `after`
 * is the rate everyone else pays and is the one that gets the line through it.
 * Once the round has closed, $14.99 IS the reader's rate, so it carries `now`
 * and nothing is struck — a line through the number a reader is about to be
 * charged would be a false compare.
 */
export interface SeatCapPart {
  text: string;
  role?: "now" | "after";
}
export const seatCapParts: SeatCapPart[] = FOUNDING_OPEN
  ? [
      /* No "at $4.99": the price sits directly above this line at display size,
         and the sentence repeated it (audit, 14 Sep 2026; TRUTH §2 re-fenced). */
      /* Sam, 14 Sep 2026: "remove the strike through here on the header — and
         instead say 'Price for everyone else is $14.99'". No `role`, so the
         figure renders as plain text; TRUTH §2 re-fenced to match. */
      { text: `${SEAT_CAP} Early Bird spots · Price for everyone else is ` },
      { text: usd(AFTER_MONTHLY) },
    ]
  : /* The founding round is over. The sentence cannot go on advertising a rate
       nobody can buy — and a reader comparing $4.99 to what they are being
       charged would be reading a discount aimed at someone else. */
    [
      { text: `The ${SEAT_CAP} Early Bird spots are gone · ` },
      { text: usd(AFTER_MONTHLY), role: "now" },
      { text: " a month" },
    ];
export const seatCapLine: string = seatCapParts.map((p) => p.text).join("");

/**
 * ✅ 15 Sep 2026: "Spring 2027" → "Halloween 2026".
 *
 * OVERRIDDEN HERE, NOT EDITED IN THE EXTRACTION, for the same reason the prices
 * are: `docs/data/money-and-terms.json` is a snapshot of what production
 * renders, and its worth is that it was produced by running that code rather
 * than retyped. Overriding records the gap; editing it would hide one.
 *
 * ⚠ IT IS NOW SIX WEEKS OUT, NOT EIGHTEEN MONTHS, and several things were
 * written on the old assumption: the edge function's `SUBSCRIPTION_TRIAL_END`
 * is 1 Feb 2027 (three months AFTER launch now, so the first renewal would fall
 * well after the service opens), the welcome SMS says "We launch Spring 2027",
 * and the founding round still closes "the end of September". All three need a
 * decision, and two of them are server-side.
 */
export const launchWindow = "Halloween 2026";

/**
 * When founding pricing closes. Sam, this session: "closes at the end of
 * october, or when all seats are gone."
 *
 * This is REAL scarcity and it is the only scarcity this product may state. It
 * is stated once, plainly, in body type — never as a countdown clock, never
 * animated, never coloured as an alarm (§10).
 */
/* Sam, 15 Sep 2026: "Early bird will close at the end of september." */
export const foundingCloses = "the end of September";

export interface ChargeRow {
  id: string;
  label: string;
  detail: string;
}

export interface Term {
  id: string;
  term: string;
}

/**
 * The monthly plan's legally load-bearing strings, byte-exact from the
 * extraction. Nothing here is retyped, reworded or reformatted in a component.
 */
export const monthlyPlan = {
  chargeRows: moneyJson.plans.monthly.chargeRows as ChargeRow[],
  /* ONE TERM IS REWRITTEN AND THE OTHER SIX ARE BYTE-EXACT. Term 4 is the only
     one that quotes the post-founders price, and Sam raised it to $14.99 on
     13 Sep — so quoting the extraction would have put a retired figure in the
     full terms, which is the worst place in the build for one. Rewritten from
     the same constant the seat sentence and the plan picker read, and it now
     states the grandfathering in Sam's own frame ("for good") with the
     condition attached, because term 7 is where the forfeit lives and a reader
     should not have to reach it to understand term 4. */
  terms: (moneyJson.plans.monthly.terms as Term[]).map((t) =>
    t.id === "rate"
      ? {
          ...t,
          term:
            `${usd(FOUNDING_MONTHLY)} a month is locked for your first year. After the first ` +
            `${SEAT_CAP} seats, new members pay ${usd(AFTER_MONTHLY)} a month.`,
        }
      : t,
  ),
  consent: moneyJson.plans.monthly.consent as string,
};

/* ---------------------------------------------------------------------------
   THE 3-MONTH PASS, REPRICED — AND THIS IS THE ONE BLOCK IN THE BUILD THAT
   GENERATES A CONSENT SENTENCE RATHER THAN QUOTING ONE. READ BEFORE EDITING.

   The extraction has the pass at $19.99 today renewing at $21.99. Sam, this
   session: "the founder 3 month pass is $11.99 — it renews every 3 months at
   that price until cancelled." That is a different product: no step-up, and
   $11.99/3 works out under the $4.99 monthly, so for the first time the pass
   is the better deal rather than an unfavourable option to put in front of a
   student. TRUTH.md §2 flagged the old one as incoherent; this settles it.

   WHY THIS IS NOT AN EDIT TO docs/data/money-and-terms.json: that file's whole
   guarantee is that it was produced by executing production, not by retyping —
   and production has not changed yet, Sam has just decided. Overriding here
   records the gap instead of hiding it. When production is updated a fresh
   extraction carries these strings and this block should be deleted.

   EVERY STRING BELOW IS BUILT FROM THE MONTHLY PLAN'S OWN SHAPE, clause for
   clause, with only the figures moved. That is deliberate: the monthly consent
   is the sentence Virginia's automatic-renewal statute and ROSCA were satisfied
   against, so the pass's differs from it in numbers alone and in nothing else.
   It still needs Sam's sign-off before it takes a cent — see forSam in the
   session notes.
   --------------------------------------------------------------------------- */
/* Sam, 15 Sep 2026: "adjust the 3 month and 1 year pricing to match the one
   month but with discount? So $9.99 for one month, $22.99 for 3 month, and
   $79.99 for the full year." Taken as given: the pass is three months at 23%
   off ($7.66 a month), the year is twelve at 33% off ($6.67 a month) and
   carries the tee. The year is a figure of its own now, not four passes —
   4 × $22.99 would be $91.96, and Sam named $79.99. (14 Sep: $16.99 / $67.96.) */
const PASS_TODAY = 17.99;
const PASS_MONTHS = 3;
const YEAR_MONTHS = 12;
const YEAR_TODAY = 54.99;
/** The standard year: eight months' worth, the same third off as the founding
 *  year — no longer four passes (see the ladder note above). */
const AFTER_YEAR = 107.99;

/* ---------------------------------------------------------------------------
   THE RATES AFTER THE FOUNDERS ROUND, AND WHAT THE FOUNDING RATE SAVES.

   Sam, 13 Sep 2026: "for the monthly, we need to show that it goes up to
   $14.99/month after our founders round, and our 3 month billing goes to
   $34.99/3months after that — we need to show what they're saving and that
   they're grandfathered into this price for good for the blacksburg membership
   until they choose to cancel."

   TWO CHANGES, AND ONE OF THEM IS A NEW FACT RATHER THAN A CHANGED ONE:
     · The standard monthly moves $9.99 → $14.99.
     · The pass gains a step-up it never had. It renewed at $11.99 forever, so
       until now there was nothing for a pass buyer to be grandfathered OUT of
       and the plan had no saving to state. It does now, and it is the larger
       of the two in dollars.

   Overridden here rather than in docs/data/money-and-terms.json, for the same
   reason the pass is repriced above: that file's guarantee is that it was
   produced by executing production, and production still says $9.99. Rewriting
   it would hide the gap; overriding records it. docs/TRUTH.md carries both as
   Sam's decisions. When production is updated, a fresh extraction carries these
   and this block goes with the one above it.

   THE SAVINGS ARE DERIVED, NEVER TYPED. "Save $10 a month" is a claim about two
   prices, and the one way it can go wrong is someone editing a price and not
   the sentence under it. Cents, not floats: 14.99 - 4.99 is 10.000000000000002
   in IEEE-754, and that is the kind of figure that reaches a screen.
   --------------------------------------------------------------------------- */
/** What the founding rate is worth, per plan. Read by the plan picker. */
export const founderSaving = {
  monthly: {
    ...saves(FOUNDING_MONTHLY, AFTER_MONTHLY, 12),
    per: "a month",
  },
  pass: {
    ...saves(PASS_TODAY, AFTER_PASS, 12 / PASS_MONTHS),
    per: `every ${PASS_MONTHS} months`,
  },
  year: {
    ...saves(YEAR_TODAY, AFTER_YEAR, 1),
    per: "a year",
  },
};

/**
 * The grandfathering sentence, said once and in one place.
 *
 * "For good" is Sam's phrase and it is the whole value of a founding seat, but
 * it is only true WITH its condition — the rate survives as long as the
 * membership does, and a refund or a cancellation gives it up. Term 7 already
 * says so and has since the first build ("A refund gives up your seat and your
 * locked rate"), so this sentence carries the condition inline rather than
 * making a reader find it: an unconditional "locked for good" beside a control
 * that takes money is the kind of promise §10 exists to stop.
 */
/**
 * ══ IT NEVER GOES UP, AND THE YEAR IS GONE ═════════════════════════════════
 * Sam, 20 Sep 2026: "let's just say it never goes up on both."
 *
 * "Both" is his Meta carousel and this build. The advert's fifth card already
 * read "Your rate never goes up — $4.99 for as long as you stay a member —
 * even after it rises to $14.99", while every surface here said the rate was
 * locked for a FULL YEAR. Two different promises about the same money, one of
 * them about to run as paid advertising. He has settled it on the stronger
 * one, which is also the one his own first instinct made — "for good" was his
 * phrase before the year ever appeared (14 Sep, "it stays at $6.99 for an
 * entire year", which narrowed it).
 *
 * THE CONDITION STAYS IN THE SENTENCE. "Never goes up" without it is exactly
 * the unconditional promise beside a control that takes money that §10 exists
 * to stop. The rate survives as long as the membership does, and a refund or
 * a cancellation gives it up — term 7 has said so since the first build ("A
 * refund gives up your seat and your locked rate"), and this sentence carries
 * it inline rather than making a reader go and find it.
 *
 * That is also what makes the promise keepable: it binds the price of a seat
 * that is continuously held, not a price anyone can leave and come back to.
 */
/** The founding lock, said with the plan's own figure — "$9.99 a month" under
 *  a year plan was the wrong number in the right sentence. */
export const lockedRateFor = (price: string, per: string): string =>
  FOUNDING_OPEN
    ? `Your Early Bird rate never goes up: ${price} ${per} from the day we open, for as long as you stay a member.`
    : lockedRateLines.standard;

export const lockedRateLines = {
  founding: `Your Early Bird rate never goes up: ${usd(FOUNDING_MONTHLY)} a month from the day we open, for as long as you stay a member.`,
  /* No founding rate left to lock, but the promise the product actually makes
     about price stability is still true and is still worth saying. It already
     said it this way, which is what made the year on the line above read as
     the odd one out. */
  standard: "Your rate is locked for as long as you keep the membership.",
} as const;
/** Today's line. /in reads the one she bought under instead, from her record. */
export const lockedRateLine: string = FOUNDING_OPEN
  ? lockedRateLines.founding
  : lockedRateLines.standard;
/** $11.99 across 3 months. Derived, so the two can never disagree. */
const PASS_PER_MONTH = usd(Math.round((PASS_TODAY / PASS_MONTHS) * 100) / 100);
const WINDOW = launchWindow;

export const passPlan = {
  paidTodayCents: Math.round(PASS_TODAY * 100),
  termMonths: PASS_MONTHS,
  chargeRows: [
    {
      id: "today",
      label: `${usd(PASS_TODAY)} today`,
      detail: `Your first ${PASS_MONTHS} months`,
    },
    {
      id: "then",
      label: `Then ${usd(PASS_TODAY)} every ${PASS_MONTHS} months`,
      detail: `From when we open, ${WINDOW} · until you cancel`,
    },
    {
      id: "refund",
      label: "Full refund before we open",
      detail: "No reason needed",
    },
  ] as ChargeRow[],
  consent:
    `By reserving, you authorize TapIn to charge ${usd(PASS_TODAY)} today for your first ` +
    `${PASS_MONTHS} months, which start when we open (expected ${WINDOW}), then ` +
    `${usd(PASS_TODAY)} every ${PASS_MONTHS} months automatically until you cancel. ` +
    `Cancel any time. Full refund before we open.`,
  terms: [
    {
      id: "today",
      term:
        `You pay ${usd(PASS_TODAY)} today for your first ${PASS_MONTHS} months, ` +
        `which is ${PASS_PER_MONTH} a month. After that it renews at ${usd(PASS_TODAY)} every ` +
        `${PASS_MONTHS} months, at the same price.`,
    },
    {
      id: "enrols",
      term: "Reserving enrolls you now. The membership starts when we open.",
    },
    {
      id: "starts",
      term:
        `Your ${PASS_MONTHS} months start when we open, expected ${WINDOW}. Your first ` +
        `renewal is ${PASS_MONTHS} months after that. Nothing more is charged before then.`,
    },
    {
      id: "rate",
      /* The pass gained a step-up on 13 Sep that it did not previously have —
         it renewed at $11.99 forever — so this term now names a post-founders
         price in the pass's OWN billing period rather than borrowing the
         monthly's. Quoting "$14.99 a month" here, as it used to, asked a pass
         buyer to do the arithmetic for a plan she did not pick. */
      term:
        `${usd(PASS_TODAY)} every ${PASS_MONTHS} months is locked for your first year. ` +
        `After the first ${SEAT_CAP} seats, new members ` +
        `pay ${usd(AFTER_PASS)} every ${PASS_MONTHS} months.`,
    },
    {
      id: "guarantee",
      term: `Save at least what you pay, or we refund the difference. Checked every ${PASS_MONTHS} months against your TapIn orders.`,
    },
    {
      id: "refund",
      term: "Full refund any time before we open, no reason needed.",
    },
    {
      id: "forfeit",
      term: "A refund gives up your seat and your locked rate. Joining later means whatever the price is then.",
    },
  ] as Term[],
};

/* ---------------------------------------------------------------------------
   THE YEAR, PREPAID — FOUR PASSES IN ONE CHARGE, AND A SHIRT.

   Sam, 14 Sep 2026: "wondering if we could do a yearly prepay option at the
   founder rate which would be 4 times the 3 month rate but also includes a
   tshirt?"

   DERIVED FROM THE PASS, NEVER TYPED: founding $11.99 × 4 = $47.96 a year;
   after the seats, $34.99 × 4 = $139.96. Integer cents, for the reason `saves`
   gives. So the year cannot disagree with the pass it is built from, and the
   saving it states ($92.00 a year) is the pass's own saving four times.

   THE SHIRT IS A PROMISE ABOUT A PHYSICAL THING. It needs a size and a way to
   hand it over, and nothing in this build collects either yet — so the term
   says when we will ask rather than pretending we have. It rides as a charge
   row so it is in front of the reader at the moment of paying, between the
   money rows and the refund, and depositise keeps it there.

   Every generated string below needs Sam's sign-off before it takes a cent,
   exactly as the pass's did (TRUTH §2). Nothing here is from the extraction:
   production sells no yearly plan.
   --------------------------------------------------------------------------- */
const YEAR_PER_MONTH = usd(Math.round((YEAR_TODAY / YEAR_MONTHS) * 100) / 100);
export const TEE_ROW: ChargeRow = {
  id: "tee",
  label: "Includes a TapIn t-shirt",
  detail: "We'll ask your size before we open",
};
/**
 * The shirt itself. Sam, 14 Sep 2026: "here's the image for the T-shirt. We
 * can make it a bit more visible here." A public object in TapIn's own
 * Supabase storage, hot-linked rather than copied into public/ — it is TapIn's
 * asset, not a merchant's, and the bucket is the place Sam keeps it. The CSP
 * in vercel.json names this host under img-src for exactly this one image.
 * 2000×2000, transparent ground: a black tee, front and back, white prints.
 */
export const TEE_IMAGE =
  "https://zgeqnmzuxrvlqliqkkth.supabase.co/storage/v1/object/public/membership_images/" +
  "unisex-garment-dyed-heavyweight-t-shirt-black-front-and-back-6aa75bd688280.png";

export const yearPlan = {
  paidTodayCents: cents(YEAR_TODAY),
  termMonths: YEAR_MONTHS,
  chargeRows: [
    {
      id: "today",
      label: `${usd(YEAR_TODAY)} today`,
      detail: "Your first year",
    },
    {
      id: "then",
      label: `Then ${usd(YEAR_TODAY)} a year`,
      detail: `From when we open, ${WINDOW} · until you cancel`,
    },
    TEE_ROW,
    {
      id: "refund",
      label: "Full refund before we open",
      detail: "No reason needed",
    },
  ] as ChargeRow[],
  consent:
    `By reserving, you authorize TapIn to charge ${usd(YEAR_TODAY)} today for your first ` +
    `year, which starts when we open (expected ${WINDOW}), then ${usd(YEAR_TODAY)} a year ` +
    `automatically until you cancel. Cancel any time. Full refund before we open.`,
  terms: [
    {
      id: "today",
      term:
        `You pay ${usd(YEAR_TODAY)} today for your first year, which is ${YEAR_PER_MONTH} a month. ` +
        `After that it renews at ${usd(YEAR_TODAY)} a year, at the same price.`,
    },
    {
      id: "tee",
      term: "Your year includes a TapIn t-shirt. We will ask your size before we open.",
    },
    {
      id: "enrols",
      term: "Reserving enrolls you now. The membership starts when we open.",
    },
    {
      id: "starts",
      term:
        `Your year starts when we open, expected ${WINDOW}. Your first renewal is a year ` +
        `after that. Nothing more is charged before then.`,
    },
    {
      id: "rate",
      term:
        `${usd(YEAR_TODAY)} is your whole first year. After the first ${SEAT_CAP} seats, ` +
        `new members pay ` +
        `${usd(AFTER_YEAR)} a year.`,
    },
    {
      id: "guarantee",
      term: "Save at least what you pay, or we refund the difference. Checked every year against your TapIn orders.",
    },
    {
      id: "refund",
      term: "Full refund any time before we open, no reason needed.",
    },
    {
      id: "forfeit",
      term: "A refund gives up your seat and your locked rate. Joining later means whatever the price is then.",
    },
  ] as Term[],
};

/* ---------------------------------------------------------------------------
   THE RECURRING MODEL — THE SENTENCE IS BACK. READ BEFORE EDITING.

   This block used to be `depositise`, and it existed to DELETE the recurring
   sentence. Its reasoning, kept because it is the reason this one is worded the
   way it is: the checkout built a PaymentIntent — one charge, no mandate saved,
   no schedule — so "then $X a month automatically until you cancel" would have
   been false at the moment of consent, under Virginia's automatic-renewal
   statute and ROSCA, on the page whose §4 exists to satisfy them. It ended:
   "When the recurring path exists this block is deleted and the extraction
   speaks again."

   15 Sep 2026: THE RECURRING PATH EXISTS. `create_simple_intent` in
   subscription mode creates a Stripe Subscription with
   `save_default_payment_method: on_subscription` and a trial — the card is
   kept and billed automatically when the trial ends. So the deposit wording
   became the false one: it told a member "nothing else is charged now, we will
   ask you before your next month" while enrolling her in exactly the
   negative-option offer it denied. This states the mechanic instead.

   WHAT THE MEMBER MUST BE TOLD, and why each clause is here rather than tidy:
   the amount charged today, that a payment method is STORED, the recurring
   amount and cadence, that it renews AUTOMATICALLY, that it continues UNTIL
   CANCELLED, and how to stop it. Those are the auto-renewal disclosures. Do not
   compress them into "then $X/mo" — the cadence without the automatic renewal
   is the disclosure failure both statutes name.

   ⚠ ONE FACT THIS COPY DOES NOT ASSERT: the date of the first renewal. The
   edge function's `SUBSCRIPTION_TRIAL_END` is 1 Feb 2027, and every surface
   here promises the service opens in Spring 2027 — so as written the first
   automatic charge lands BEFORE the membership it pays for begins. Naming a
   date in the consent sentence would make that contradiction load-bearing.
   The cadence is stated, the date is not, and the mismatch is Sam's and the
   edge function's to settle. Do not add a date here until they agree.

   WHY NOT AN EDIT TO docs/data/money-and-terms.json: that file's guarantee is
   that it was produced by executing production, not by retyping. Overriding
   here records the gap; editing there would hide it. Same reasoning as the
   pass repricing above.

   EVERY PLAN GOES THROUGH ONE FUNCTION so they cannot drift apart in a clause.
   Only the figures move.
   --------------------------------------------------------------------------- */
function subscribise(
  paidToday: string,
  terms: Term[],
  /** Founding round still open. Governs the WORDS, never the arithmetic. */
  founding: boolean,
  /** Rows a plan carries that are not about the charge — the year's shirt —
   *  kept between the "then" and the refund so the money rows stay first. */
  extraRows: ChargeRow[] = [],
  /** The plan's first period as the rows name it: "month", "3 months", "year". */
  period = "month",
): { chargeRows: ChargeRow[]; consent: string; terms: Term[] } {
  /* ══ THE PAYMENT TODAY IS THE FIRST PERIOD, AND IT HOLDS THE SEAT ══════════
     Sam, 14 Sep 2026 (night), answering the review's open question: "the
     $6.99 today holds the seat and is also the first month." One fact, said
     the same way in the rows, the consent, the terms and the receipt — the
     earlier wording read as a hold fee PLUS a first charge. Nothing else is
     charged until the period after the first, and that is asked for. */
  const seat = founding ? "Early Bird Special" : "seat";
  return {
    chargeRows: [
      {
        id: "today",
        label: `${paidToday} today`,
        detail: `Your first ${period}. It holds your ${seat} too`,
      },
      {
        id: "then",
        label: `Then ${paidToday} a ${period}`,
        detail: `Automatically, until you cancel · your ${period} starts when we open, expected ${WINDOW}`,
      },
      ...extraRows,
      {
        id: "refund",
        label: "Full refund before we open",
        detail: "No reason needed",
      },
    ],
    consent:
      `By reserving, you authorize TapIn to charge ${paidToday} today for your first ` +
      `${period}, which starts when we open (expected ${WINDOW}) and holds your ${seat} ` +
      `until then. We keep your payment method on file and charge ${paidToday} every ` +
      `${period} after that, automatically, until you cancel. Cancel any time. Full ` +
      `refund any time before we open.`,
    terms: terms.map((t) =>
      /* ══ TWO TERMS STOP BEING TRUE WHEN THE ROUND CLOSES ══════════════════
         `rate` promises a locked founding rate and tells the reader what NEW
         members pay — but once the seats are gone the reader IS a new member,
         so it would quote them a discount they cannot have and a comparison
         against themselves. `forfeit` gives up "your locked rate", which by
         then is not a thing they hold. Both are rewritten for the standard
         state; every other term is the extraction's own and is untouched. */
      !founding && t.id === "rate"
        ? {
            id: "rate",
            term: `${paidToday} is the standard rate. The Early Bird spots are gone.`,
          }
        : !founding && t.id === "forfeit"
          ? {
              id: "forfeit",
              term: "A refund gives up your seat. Joining later means whatever the price is then.",
            }
          : t.id === "today"
            ? {
                id: "today",
                term: `You pay ${paidToday} today. It is your first ${period}, and it holds your ${seat} until we open.`,
              }
            : t.id === "starts"
              ? {
                  id: "starts",
                  term:
                    `Your membership starts when we open, expected ${WINDOW}. Your first ${period} runs ` +
                    `from then, and every ${period} after that renews automatically at ${paidToday} ` +
                    `until you cancel. We keep your payment method on file to do that. Cancel any time ` +
                    `by emailing ${GUARANTEE_CONTACT}.`,
                }
              : t,
    ),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE PRICE FLIPS WHEN THE SEATS RUN OUT.

   Sam, 13 Sep 2026: "let's just have the price flip to $14.99 when it hits
   zero." So the counter is not a decoration any more — it is the switch that
   decides what this product costs, and everything below is derived from it.

   ══ READ ONCE, AT MODULE LOAD, AND THAT IS A SAFETY PROPERTY ═══════════════
   `FOUNDING_OPEN` is evaluated exactly once when this module is first imported,
   never per render. The counter only moves at local midnight, so the practical
   effect is that a tab left open across that boundary keeps the price it was
   showing — which is the behaviour you want, not a limitation.

   The alternative is genuinely dangerous. If the plans were recomputed while a
   checkout sheet was open, a reader could read "you authorize TapIn to charge
   $4.99 today", have midnight pass, and confirm a wallet for $14.99. The
   consent sentence and `paidTodayCents` both come from the constants below, so
   pinning them together for the life of the page is what makes it impossible
   for the sentence and the charge to disagree.

   ══ ONE PAIR OF NUMBERS FEEDS EVERYTHING ═══════════════════════════════════
   The price, the charge rows, the consent sentence, the full terms, the amount
   actually charged and whether a saving exists at all are all downstream of
   these two lines. There is no second place to edit.
   ═══════════════════════════════════════════════════════════════════════════ */
const MONTHLY_NOW = FOUNDING_OPEN ? FOUNDING_MONTHLY : AFTER_MONTHLY;
const PASS_NOW = FOUNDING_OPEN ? PASS_TODAY : AFTER_PASS;
const YEAR_NOW = FOUNDING_OPEN ? YEAR_TODAY : AFTER_YEAR;

const monthlyDeposit = {
  ...monthlyPlan,
  ...subscribise(
    usd(MONTHLY_NOW),
    monthlyPlan.terms,
    FOUNDING_OPEN,
    [],
    "month",
  ),
  paidTodayCents: cents(MONTHLY_NOW),
};
const passDeposit = {
  ...passPlan,
  ...subscribise(
    usd(PASS_NOW),
    passPlan.terms,
    FOUNDING_OPEN,
    [],
    `${PASS_MONTHS} months`,
  ),
  paidTodayCents: cents(PASS_NOW),
};
const yearDeposit = {
  ...yearPlan,
  ...subscribise(
    usd(YEAR_NOW),
    yearPlan.terms,
    FOUNDING_OPEN,
    [TEE_ROW],
    "year",
  ),
  paidTodayCents: cents(YEAR_NOW),
};

export type PlanId = "monthly" | "pass" | "year";
export const PLANS = {
  monthly: {
    id: "monthly" as const,
    label: "Monthly",
    price: usd(MONTHLY_NOW),
    per: "a month",
    /** The first billed period, as the receipt names it. */
    period: "month",
    /** A non-money thing the plan includes, and its picture. Only the year
     *  has one. */
    perk: null as string | null,
    perkImg: null as string | null,
    /* What the founding rate is worth on THIS plan, derived from the two prices
       rather than typed beside them. NULL once the seats are gone: there is
       nothing to save, and every surface that shows a struck price or a "Save
       $X" line keys off this rather than repeating the condition. */
    saving: FOUNDING_OPEN ? founderSaving.monthly : null,
    ...monthlyDeposit,
  },
  pass: {
    id: "pass" as const,
    label: "3 months",
    price: usd(PASS_NOW),
    per: `every ${PASS_MONTHS} months`,
    period: `${PASS_MONTHS} months`,
    perk: null as string | null,
    perkImg: null as string | null,
    saving: FOUNDING_OPEN ? founderSaving.pass : null,
    ...passDeposit,
  },
  year: {
    id: "year" as const,
    label: "A year",
    price: usd(YEAR_NOW),
    per: "a year",
    period: "year",
    perk: TEE_ROW.label as string | null,
    perkImg: TEE_IMAGE as string | null,
    saving: FOUNDING_OPEN ? founderSaving.year : null,
    ...yearDeposit,
  },
};
/**
 * The monthly price a reader can actually buy TODAY — founding while the seats
 * last, standard after. Renamed from `foundingMonthly`, which became a lie the
 * moment the price learned to flip: the pitch printed it as its headline figure
 * and would have gone on saying $4.99 beside a checkout charging $14.99.
 */
export const monthlyToday: number = MONTHLY_NOW;
/** The standard rate, formatted, for a surface that names what the Early Bird
 *  price is cheaper THAN. Same constant the seat line and the plan ladder
 *  print, so a campaign page cannot quote a figure this build does not hold. */
export const standardAfter: string = usd(AFTER_MONTHLY);

/* `depositEarnsCredit` lived here: "Your first $10+ order earns $5 credit,
   more than the deposit", with a guard that dropped the comparative clause if
   a future price ever met the credit. Sam, 20 Sep 2026: "let's remove the
   'first $10 order' thing it's too complicated." It had three consumers and
   now has none, so it is deleted rather than left for a reader to wonder
   about. The $10 floor is still stated where it is a condition, on the
   credit's own benefit row, from BENEFIT.creditMinUsd. */
export const standardMonthly: number = moneyJson.pricing.standardMonthly;

/** live = the app does this today. soon/example = it does not. */
export type WayStatus = "live" | "soon" | "example";

export interface WayToUse {
  id: string;
  /** Names the illustration for this slide — these were authored as scenes,
   *  not as list rows. */
  scene: string;
  /** How long the scene was meant to hold before the next one. Only two slides
   *  carry it; the rest take the default. */
  dwellMs?: number;
  status: WayStatus;
  headline: string;
  line: string;
  /** "Coming" or "Example". NOT fine print — it sits on the slide, in the
   *  slide's own type. Four of the seven describe things that do not exist
   *  yet, and presenting all seven in one voice sells four features that
   *  do not exist, to students, next to a price (TRUTH.md §8). */
  tag: string | null;
}

export const waysToUse: WayToUse[] = waysJson.slides as WayToUse[];

/** The offers-only promotion. A different thing from a standing benefit: the
 *  member ADDS it, it applies once, then reads used. No expiry was ever
 *  agreed, so the row says "one time" and never a date. */
export const offers = moneyJson.offers;

/**
 * The field polarity of each merchant's mark, MEASURED from the corner pixels
 * of the actual file in public/logos — not judged by eye:
 *
 *   coffeeholicsva  rgb(1,1,1)        theburg  rgb(1,1,1)     olaika rgb(0,0,0)
 *   italianospizza  rgb(236,235,225)  sweetopia rgb(255,255,255)
 *   themilkparlor   rgb(255,255,255)
 *
 * The collar's seat hairline follows it, so the ring reads against a white mark
 * and a black one alike. Without this, three of the six get an invisible seat.
 *
 * This belongs beside brandColor in docs/data/venues.json eventually — it is
 * kept here only because that file is frozen extracted data and adding a field
 * to it is Sam's call, not mine.
 */
const LIGHT_FIELD_MARKS = new Set([
  "italianospizza",
  "sweetopia",
  "themilkparlor",
]);

export const logoField = (id: string): "light" | "dark" =>
  LIGHT_FIELD_MARKS.has(id) ? "light" : "dark";

/**
 * Heroes that are a brand card on white rather than a photograph of a room.
 *
 * MEASURED mean relative luminance of the files in public/heroes:
 *   theburg 0.891 — and the next brightest is coffeeholicsva at 0.220, with the
 *   rest between 0.036 and 0.16. It is one outlier, not a general problem.
 *
 * Dimming all six to hide the one was the wrong fix: it cost the collage its
 * presence. Only the outlier is seated.
 */
const BRIGHT_HEROES = new Set(["theburg"]);

export const heroIsBright = (id: string): boolean => BRIGHT_HEROES.has(id);
