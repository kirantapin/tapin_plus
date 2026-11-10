import { Link } from "react-router-dom";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import { logoField } from "../model/content";
import { captureUtm } from "../model/parents";
import ParentCheckout, { hasSavedGiftCard, resumeStep } from "../shell/ParentCheckout";
import { hydrateGiftDraft } from "../model/giftDraft";
import { useDockPulse } from "../shell/dockPulse";
import { DockArrow } from "../shell/DockArrow";
import {
  CREDIT,
  MIN_ORDER,
  PERCENT,
  useParentPrice,
  PLACES,
  reducedMotion,
  Chevron,
  Glyph,
  GLYPHS,
  SAVES_NOTE,
  Fold,
  FlatMark,
} from "./parents_kit";
import { BenefitCards, CheckoutPhone, HowPhone, PriceLead, ProofTurn, UnderOffer, Voices } from "./parents_sections";
import { GiftEnvelope } from "./parents_gift";
import { GiftPreview } from "./GiftPage";
import { WelcomeCallout } from "../shell/WelcomeCallout";
import { BonusSpots } from "../shell/BonusSpots";

/* ══ THE PARENTS' LANDING PAGE (/parents; Sam, 5 Nov 2026) ═══════════════════
   Third pass. The student page's language (routes/PlusHome.tsx, plus-app.css,
   .tpa): the photo band, white modules on the light ground, the order card
   with the $5 coming off, the photo rail, the offer card, the docked button
   on phones, the questions, the foot. On a computer the root also wears
   .tpa-home, so it takes the student page's desk layout as it is: the band on
   top, the story left, the offer card held on the right.

   Copy: docs/parents/COPY.md, its "v2 messaging block" and "v2 final hero"
   (Sam approved, 5 Nov 2026) over "As built: charge at checkout". The hero is
   a parent and their student (Sam: "the image should be friendlier ...
   parents and their kids at Virginia Tech, maybe move-in day"), the value
   stack, then "What a lunch costs" priced per meal, never per plan.
   Left out on purpose: a weekly dollar total, plan prices, anything that sets
   Plus against their dining plan or calls it an alternative, budget control,
   where the money goes, money-back lines beyond the refund, seat
   counts, points values, VT marks. Food only: no bar, cover, line-skip or
   crowd imagery; The Burg's and The Milk Parlor's own photographs are
   swapped for their dishes.

   Fourth pass (Sam, 5 Nov 2026: "a lot of text and not enough visual
   explainers ... it's helpful when nested"): each idea is a picture first
   with a short label, and the approved sentence sits one tap under it
   (details/summary): the price drop, the six tiles, the four bars, the three
   steps, the five assurances. Same facts, same order.
   The proof line under the headline and the $60 are Sam's own override of
   HANDOFF.md's "do not carry over" for these two claims (5 Nov 2026):
   "mention the 500 other students in blacksburg are on tapin, saves an
   average of $60 a month at places they already frequent". The $60 is said
   twice, the offer card and the value stack's first tile, each with its
   asterisk; the footnote (SAVES_NOTE) sits under the tiles. */

/* ══ THE EYEBROW ═════════════════════════════════════════════════════════════
   COPY.md wants "For Virginia Tech parents"; it waited on legal clearing the
   school's name for paid traffic. Sam, 8 Nov 2026: "it needs to say "for
   virginia tech parents" intead of "for parents on blacksburg students"",
   and "500 Vtech students are on Tapin plus": named now. */
const NAME_VT = true;
const EYEBROW = NAME_VT
  ? "For Virginia Tech parents"
  : "For parents of Blacksburg students";
/* The same line where a phone is too narrow for the whole of it (under
   375): still says who (parents) and where (Blacksburg). */
const EYEBROW_SHORT = NAME_VT
  ? "Virginia Tech parents"
  : "Parents of Blacksburg students";

/* ══ THE TOP OF THE BAND ON A PHONE: three treatments (8 Nov 2026) ══════════
   Sam picked header A · What's inside and asked for the top chips to be
   redone ("they read as stock UI stuck on a photo"). The default is now
   "b" (Sam's pick, below); "a" · Masthead: the Tapin logo and the line set straight on the photo,
   white on a photo shade, the account a white ring. The other two are
   development-only previews, ?hdr=b|c, never read in a production build:
     "b" · Smoked plate: the app's one glass (plus-app.css .tpa-glass recipe,
           no backdrop-filter), white type.
     "c" · White bar: a solid white bar above the photo, ink type, the
           account on a grey disc; the photo starts under it.
   A computer keeps its paper label and button (parents.css scopes every
   treatment to a phone). */
type HeaderChips = "a" | "b" | "c";
/* Sam, 8 Nov 2026, picking "b": "let's go with this one". ?hdr=a|c stay as
   development-only previews. */
const headerChips = (): HeaderChips => {
  if (!import.meta.env.DEV || typeof window === "undefined") return "b";
  const v = new URLSearchParams(window.location.search).get("hdr");
  return v === "a" || v === "c" ? v : "b";
};

/* ══ THE PHONE HEADER (Sam, 8 Nov 2026, picking preview 1 of five) ═══════════
   His parents found the phone's first screen "too confusing ... a lot of text
   they didn't get"; his mom loved "A care package they'll open every day"
   and the envelope. So a phone shows the photo and the headline alone: the
   students line steps back (parents.css) and the two tags are gone, and the
   envelope's section comes straight after. A computer keeps its band. */

/* ══ THE HERO (the A/B round below ended 6 Nov 2026: Sam picked "A care
   package they'll open every day", now everyone's; "b" and "c" stay as ?ph=
   previews) ═══════════════════════════════════════════════════════════════
   THE HERO A/B TEST: THE GIFT ROUND (Sam, 6 Nov 2026: "I think the copy
   variants for the header should be focused on this being a gift to their
   kids") ═══════════════════════════════════════════════════════════════════
   The same pattern as model/heroTest.ts, kept in this file. One link, and
   each visitor is given one headline the first time and keeps it
   (localStorage), a third each:
     "a" · the care package: "A care package they’ll open every week."
     "b" · from home: "Lunch is on you. Even from home."
     "c" · the note: "Send them Tapin Plus, with a note from you."
   The first round (5 Nov: "Does your kid text you for food money?" against
   "They’re eating out in Blacksburg anyway. Make it cost less.") is retired;
   this round has its own key and flag, so its numbers start clean.
   ?ph=a|b|c shows any one and is not stored. The variant is registered for
   the session on mount (parent_hero_variant, and $feature/plus-parent-hero-gift
   for PostHog's experiment and breakdown views), so compare sign-up clicks
   and checkouts per variant. A second piece, when there is one, holds
   together on a line of its own. */
type ParentHero = "a" | "b" | "c" | "d" | "e" | "f" | "r" | "s" | "w";
const PARENT_HERO_KEY = "tp_parent_hero_v2";
const PARENT_HEROES: Record<ParentHero, readonly [string, string?]> = {
  a: ["A care package", "they’ll open every day."],
  b: ["Lunch is on you.", "Even from home."],
  c: ["Send them Tapin Plus,", "with a note from you."],
  /* Rob's round (Sam, 9 Nov 2026: "the copy at the beginning should be less
     about the care package and more like your kid is already spending at
     all of these spots every week, this helps them save"); the care package
     moves down to the envelope's heading. ?ph=d|e|f while Sam picks. */
  d: ["Help them save", "where they already eat."],
  e: ["They already eat here.", "Now they save every week."],
  f: ["$5 credit every week", "where they already eat."],
  /* Rob's header (Sam, 9 Nov 2026), with its line under it (PARENT_SUBS):
     "r" in his words, "s" with the line held to what Plus gives ($5 credit,
     not money back; 15% off once a day). */
  r: ["Make every dollar they spend", "in Blacksburg go further."],
  /* "spend" on the second line, so it's the longer one (Sam, 9 Nov 2026:
     "can we have spend be in the second line of text"). */
  s: ["Make every dollar they", "spend in Blacksburg go further."],
  /* The welcome offer (Sam, 9 Nov 2026: "Gift your student $25 at
     Blacksburg's best spots. $5 to spend at each spot the moment they join,
     then $5 back every week at each spot when they spend $10"; credit, not
     back, as everywhere). The $25 doesn't expire; $3.99 the first month
     still stands. */
  w: ["Gift your student $25 at", "Blacksburg’s best spots."],
};
/** A line under the headline, for the headlines that carry one; it says the
 *  offer, so the favourites row then shows the places alone. */
const PARENT_SUBS: Partial<Record<ParentHero, string>> = {
  r: "Tapin Plus gives your Virginia Tech student money back at their favorite local spots every week, plus 15% off a meal every day.",
  s: "$5 credit every week at each of their favorite Blacksburg spots, plus 15% off once a day.",
  w: "$5 to spend at each spot the moment they join, then $5 credit every week at each spot when they spend $10.",
};
const isParentHero = (v: string | null): v is ParentHero =>
  v === "a" || v === "b" || v === "c" || v === "d" || v === "e" || v === "f" || v === "r" || v === "s" || v === "w";

let parentHeroCached: ParentHero | null = null;
function parentHero(): ParentHero {
  if (parentHeroCached) return parentHeroCached;
  if (typeof window === "undefined") return "s";
  const asked = new URLSearchParams(window.location.search).get("ph");
  if (isParentHero(asked)) return (parentHeroCached = asked);
  try {
    window.localStorage.removeItem(PARENT_HERO_KEY);
  } catch {
    /* Storage blocked: a draw per page load is the best there is. */
  }
  /* The test is over (Sam, 6 Nov 2026); since 9 Nov everyone gets "s",
     Rob's "Make every dollar they spend in Blacksburg go further" with its
     line held to the offer ("A care package they'll open every day" heads
     the envelope now). ?ph= still previews the others, and an earlier draw
     is cleared. */
  /* Rob's headline, with the welcome offer as its own callout under it
     (Sam, 9 Nov 2026: "wouldn't it go on the header of both?"); "w", the
     $25 headline, stays a preview so the $25 isn't said twice. */
  return (parentHeroCached = "s");
}
/* The experiment's flag isn't registered any more (the test is over); the
   variant still is, so events say which headline was showing. */
const parentHeroProps = (v: ParentHero) => ({ parent_hero_variant: v });

/* ══ THE HERO PHOTOGRAPH ═════════════════════════════════════════════════════
   Parents and their student, framed so the faces clear the pill and the
   headline: `phone` is the object-position up to 1023 wide, `desk` from
   1024. ?photo=move-in|hug|downtown previews the others (any build,
   nothing stored).

   The default since 6 Nov 2026 is the split (Sam: "the header image would
   need to lean into this ... a split image of a mom sending this to her
   kid, and the kid receiving it"): the same mom and daughter as move-in
   day, her at home sending it, her student on campus opening it, the two
   halves meeting at a little care package. */
type HeroPhoto = "split" | "move-in" | "hug" | "downtown";
const SPLIT = {
  parent: asset("/parents/hero-split-parent.webp"),
  student: asset("/parents/hero-split-student.webp"),
};
const PHOTOS: Record<HeroPhoto, { src: string; phone: string; desk: string }> =
  {
    split: { src: SPLIT.parent, phone: "", desk: "" },
    "move-in": {
      src: asset("/parents/hero-move-in.webp"),
      phone: "50% 22%",
      desk: "50% 24%",
    },
    hug: {
      src: asset("/parents/hero-hug.webp"),
      phone: "36% 18%",
      desk: "50% 22%",
    },
    downtown: {
      src: asset("/parents/hero-downtown.webp"),
      phone: "52% 20%",
      desk: "50% 22%",
    },
  };
const heroPhoto = (): HeroPhoto => {
  if (typeof window === "undefined") return "split";
  const p = new URLSearchParams(window.location.search).get("photo");
  return p === "move-in" || p === "hug" || p === "downtown" ? p : "split";
};

const LEGAL = [
  { label: "Terms", href: "https://go.tapin.app/terms-and-conditions" },
  { label: "Privacy", href: "https://go.tapin.app/privacy-policy" },
];

const PAPER_MARK = asset("/brand/plus-paper-mark.svg");

/* ══ THE PROOF LINE (Sam, 5 Nov 2026; see the note at the top) ═══════════════
   The student band's live dot (PlusHome.tsx SocialProof): the line settles in
   a beat after the headline and the ring pulses. Reduced motion: still. The
   school's name waits on legal, like the eyebrow. */
const PROOF_STUDENTS = NAME_VT
  ? "Over 500 Virginia Tech students are on Tapin Plus"
  : "Over 500 Blacksburg students are on Tapin Plus";
export default function ParentsHome() {
  const { track, registerForSession } = useEventTracking();

  /* The care package and checkout as they left it, if it's under a day old
     (model/checkoutResume.ts): before anything draws, so the band and the
     builder open on their pick. */
  useState(hydrateGiftDraft);
  const [hero] = useState(parentHero);
  const [photo] = useState(heroPhoto);
  const [chips] = useState(headerChips);
  const headline = PARENT_HEROES[hero];
  const shot = PHOTOS[photo];
  /* Plus's price for this page (a promo link's offer, else the welcome
     offer): what the parent's gift will charge when it's claimed. */
  const { FIRST, MONTHLY } = useParentPrice();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = "tpa";
    return () => {
      delete root.dataset.surface;
    };
  }, []);

  useEffect(() => {
    captureUtm();
    /* The headline's variant first, so the page view carries it too. */
    registerForSession(parentHeroProps(hero));
    track("parent_page_view", { parent_hero_variant: hero });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* The gift before the ask (Sam, 6 Nov 2026: "the CTA should be "build
     their care package" or something like that. Instead of going right for
     the ask"): every button here opens the checkout on the care package. */
  const cta = "Build their care package";
  /* One funnel (Sam, 6 Nov 2026: "the preview we already have is the first
     step. that way we only have one purchase funnel not conflicting ones"):
     every button opens the builder, and its Continue carries on to their
     number, you and the charge in the same panel. */
  const [building, setBuilding] = useState(false);
  /* What the builder grows out of: the dock's white plate (Sam, 6 Nov 2026:
     "the parent container should expand into the builder"), else the
     button itself. */
  const [origin, setOrigin] = useState<HTMLElement | null>(null);
  const signUp = (where: string, el: HTMLElement) => {
    track("parent_signup_clicked", { where });
    setOrigin(el.closest<HTMLElement>("[data-island-origin]") ?? el);
    setBuilding(true);
  };


  /* ── The dock: only while none of the page's own buttons is on screen
     (Sam, 6 Nov 2026: "maybe the sticky CTA only shows up when there isn't a
     CTA already on the page like we originally had it"), so there's never
     two of the same button in view. The page's buttons carry data-page-cta
     (the offer card's, the gift band's, the closing one). On a computer the
     offer card is held in view and the dock is hidden (parents.css). ── */
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [dockOn, setDockOn] = useState(false);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-page-cta]"));
    if (!els.length || typeof IntersectionObserver === "undefined") {
      setDockOn(true);
      return;
    }
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
        setDockOn(seen.size === 0);
      },
      /* The dock's own strip at the foot doesn't count as "on screen". */
      { rootMargin: "0px 0px -96px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  useDockPulse(dockRef, dockOn && !building);
  const firstDock = useRef(true);
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    if (firstDock.current) {
      firstDock.current = false;
      el.hidden = !dockOn;
      return;
    }
    if (reducedMotion() || typeof el.animate !== "function") {
      el.hidden = !dockOn;
      return;
    }
    const frames = [
      { opacity: 0, transform: "translateY(16px)" },
      { opacity: 1, transform: "none" },
    ];
    if (dockOn) {
      el.hidden = false;
      el.animate(frames, {
        duration: 320,
        easing: "cubic-bezier(.22,1,.36,1)",
      });
    } else {
      const run = el.animate([...frames].reverse(), {
        duration: 200,
        easing: "ease-in",
        fill: "forwards",
      });
      run.onfinish = () => {
        el.hidden = true;
        run.cancel();
      };
      return () => run.cancel();
    }
  }, [dockOn]);

  /* The headline settles in over the band, once. */
  const titleRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (reducedMotion()) return;
    titleRef.current?.animate?.(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: 560,
        delay: 80,
        easing: "cubic-bezier(.22,1,.36,1)",
        fill: "backwards",
      },
    );
  }, []);

  const faq: ReadonlyArray<{ q: string; a: string }> = [
    {
      q: "Does this replace their meal plan?",
      a: "No. Students living on campus have to have a VT dining plan. Tapin Plus is for the meals they buy off campus at our Plus places. Many students living off campus have no plan at all, and that’s where it helps most.",
    },
    {
      /* The credit is there at once (Sam, 9 Nov 2026). */
      q: "When does their credit start?",
      a: `Right away. The moment they claim your gift, $${CREDIT} credit is added at each of the ${PLACES.length} places, $${PLACES.length * CREDIT} in all, ready to use in the Tapin app.`,
    },
    {
      q: "What if they don’t use it?",
      a: `Two $${CREDIT} credits used in a month cover the ${MONTHLY}. And nothing is charged until they claim it: if they don’t within 30 days, it expires and you’re never charged. Cancel anytime.`,
    },
    {
      q: "Can I see what they order?",
      a: "No. Their orders stay with them.",
    },
    {
      q: "Does it work at bars?",
      a: "Some Plus places serve alcohol, but Tapin Plus never discounts it. Entry follows each venue’s own age rules.",
    },
    {
      q: "What do you text my student?",
      a: "One text with a link to your gift. We don’t send them marketing texts unless they sign up for them.",
    },
    {
      q: "What phone do they need?",
      a: "iPhone: the Tapin app. Android: the Tapin web app in their browser.",
    },
    {
      q: "My student already has Tapin Plus. What happens?",
      a: "They can’t claim a second one while theirs is on, so nothing is charged. If they don’t claim it within 30 days, it expires.",
    },
    {
      q: "How do I cancel?",
      a: "Email support@tapin.app any time and we’ll cancel it for you. You can see your gifts any time from Your account, signed in with your mobile.",
    },
    {
      q: "Who do I contact with questions?",
      a: "support@tapin.app",
    },
  ];

  return (
    <div className="tpa tpa-home tpp">
      {/* The students line as the page's announcement bar, as on the main
          page (Sam, 9 Nov 2026: "for parents, I think we can have the 500
          credit be an announcement banner like on the main, instead of on
          this hero container - for desktop and mobile"). */}
      <aside className="tpa-wbar tpa-pbar" aria-label="Tapin Plus students">
        <i className="tpa-pbar-dot" aria-hidden="true" />
        {/* The short line on a phone (Sam, 9 Nov 2026: "this looks a bit
            strange on this shorter screen"). */}
        <span className="tpa-pbar-long">{PROOF_STUDENTS}</span>
        <span className="tpa-pbar-short">{NAME_VT ? "500+ Virginia Tech students on Plus" : "500+ Blacksburg students on Plus"}</span>
      </aside>
      <header
        className="tpa-band tpp-band"
        data-hero="parents"
        data-photo={photo}
        data-hdr={chips}
        data-phone="card"
      >
        {photo === "split" ? (
          <div className="tpa-band-art tpp-split" aria-hidden="true">
            <img src={SPLIT.parent} alt="" decoding="async" />
            <img src={SPLIT.student} alt="" decoding="async" />
            {/* Where the two halves meet: the care package, on its way. */}
            <span className="tpp-split-seal">
              <i className="scene-swatch-env" />
            </span>
          </div>
        ) : (
          <img
            className="tpa-band-art"
            src={shot.src}
            alt=""
            decoding="async"
            style={{
              ["--photo-pos" as string]: shot.phone,
              ["--photo-pos-desk" as string]: shot.desk,
            }}
          />
        )}
        <div className="tpa-band-top">
          {/* The call-out: who this page is for, before anything else. */}
          {/* Paper, not glass, on the parents page (Sam, 6 Nov 2026: "rework
              this"): the cream of the envelope's seal in the photo, ink type,
              the Plus mark in maroon; the account button matches it. */}
          <span className="tpp-label">
            {/* The Tapin Plus mark again (Sam, 8 Nov 2026: "we can replace the
                tapin logo again with the tapin plus icon"). */}
            <FlatMark className="tpp-label-mark" />
            <span className="tpp-label-long">{EYEBROW}</span>
            <span className="tpp-label-short">{EYEBROW_SHORT}</span>
          </span>
          <Link className="tpp-account" to="/parents/account" aria-label="Your account: manage your student’s Plus">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM4.5 20.2c.8-3.6 3.9-5.6 7.5-5.6s6.7 2 7.5 5.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
        <div ref={titleRef} className="tpa-band-title">
          <div>
            <h1 data-variant={hero}>
              {headline[0]}
              {headline[1] ? (
                <>
                  {" "}
                  <span className="tpp-nowrap">{headline[1]}</span>
                </>
              ) : null}
            </h1>
            {/* The welcome offer, in the header (Sam, 9 Nov 2026): the $25
                the moment they join, then the weekly line under it. */}
            <WelcomeCallout they />
            {/* A phone: the button and the price on the photo (Sam, 8 Nov
                2026, picking preview 5, "just a bit more refined"); a
                computer keeps them on the held card. */}
            <div className="tpp-band-act">
              {/* What's inside, on the first screen (Sam, 9 Nov 2026, picking
                  C of three: "the five logos + one line"; both audits ranked
                  it first). The price line under the button is gone; the
                  students line takes its place. */}
              {/* No line under the callout on Rob's headline (Sam, 9 Nov
                  2026: "just remove the sub text"). */}
              {PARENT_SUBS[hero] && hero !== "s" ? <p className="tpp-band-sub">{PARENT_SUBS[hero]}</p> : null}
              {/* The five favourites as their food, each place's logo on its
                  corner (Sam, 9 Nov 2026, pick C: "Not sure if it's clear to
                  the parents that these are the logos of blacksburg
                  favorites, with amazing food"). */}
              <div className="tpp-band-inside">
                <span className="tpp-band-logos" aria-hidden="true">
                  {PLACES.map((p) => (
                    <span key={p.id} className="tpp-fav">
                      <img src={p.photo} alt="" decoding="async" />
                      <img className="tpp-fav-logo" src={p.logo} alt="" decoding="async" />
                    </span>
                  ))}
                </span>
                <p hidden={!!PARENT_SUBS[hero]}>
                  {hero === "f" ? (
                    "At each of 5 Blacksburg favorites"
                  ) : (
                    <>
                      <b>$5 credit</b> every week at each of 5 Blacksburg favorites
                    </>
                  )}
                </p>
              </div>
              <button type="button" className="tpp-band-cta" data-page-cta="" onClick={(e) => signUp("header", e.currentTarget)}>
                {cta}
                <DockArrow />
              </button>
            </div>

          </div>
        </div>
      </header>

      <main className="tpa-sheet">
        {/* Sam's mom, 8 Nov 2026: the care package first, then what they get,
            then the places; "What a lunch costs" and "What if they don't use
            it?" are gone. The offer card follows the places on a phone; a
            computer still holds it in the right-hand column. */}
        {/* SEND IT WITH A NOTE (Sam, 6 Nov 2026): the gift, and the page
            their student opens. */}
        {/* $5 bonus credit at each spot, right under the band, as on the
            main page (Sam, 9 Nov 2026: "should include this on the parent
            plus page too I think"). */}
        <BonusSpots they />
        <GiftEnvelope onSend={(el) => signUp("gift", el)} />
        {/* C · parents' own words, straight after the envelope (Sam, 9 Nov
            2026, the Dara Denney audit's fix 4: "move the parent quotes up";
            they sat under the offer card). Nothing shows until
            model/voices.ts has real ones. */}
        <Voices className="tpp-v-up" />

        {/* THE VALUE STACK (COPY.md v2) as six tiles: a figure or a glyph and
            a few words each, the approved line one tap under it. No total
            anywhere, no points value. */}
        <section
          className="tpa-module"
          aria-labelledby="tpp-get"
        >
          {/* What's in it, said as a care package (Sam, 8 Nov 2026: "it just
              needs to be more abundantly clear what's actually in it and how
              this acts like a care package"; the cards stay, his mom liked
              them). */}
          <h2 id="tpp-get" className="tpa-h2">
            What’s in their care package
          </h2>
          <p className="tpp-get-intro">Like a box from home that lives on their phone instead of the mail room.</p>
          <BenefitCards />
          <p className="tpp-note">{SAVES_NOTE}</p>
        </section>

        <section className="tpa-places tpp-places" aria-labelledby="tpp-every">
          <h2 id="tpp-every" className="tpa-h2 tpa-h2-out">
            Places they already go
          </h2>
          <ul className="tpa-rail">
            {PLACES.map((p) => (
              <li key={p.id} className="tpa-place">
                <img
                  className="tpa-place-photo"
                  src={p.photo}
                  alt=""
                  decoding="async"
                  loading="lazy"
                />
                <span
                  className="tpp-place-logo collar"
                  data-field={logoField(p.id)}
                  aria-hidden="true"
                >
                  <img src={p.logo} alt="" decoding="async" loading="lazy" />
                </span>
                <span className="tpa-place-name">
                  <b>{p.name}</b>
                  <small>{p.what}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="tpp-more">More places are joining.</p>
        </section>

        {/* THE OFFER: what it is, the price, the button. Right under the band
            on a phone; on a computer, the card held on the right
            (plus-app.css keys that on aria-label="Tapin Plus"). */}
        {/* The offer card and, under it (not in it), the other two benefits
            (Sam, 6 Nov 2026: "the callouts are underneath this parent
            container, not within it. It's too busy otherwise"). On a computer
            the two are the held right-hand column together; on a phone the
            wrapper steps aside (display: contents). */}
        <div className="tpp-offer-col">
        <section
          className="tpa-module tpa-offer tpp-offer"
          aria-label="Tapin Plus"
        >
          {/* No mark on the offer card (Sam, 6 Nov 2026: "can we remove the
              tapin logo from this callout"): the price leads. */}
          {/* The hero's sub (COPY.md v2 final, with Sam's $60, 5 Nov 2026) as a
              picture: the $12 lunch dropping to $7, then its two facts as
              figure-and-label rows ($60 a month on average*; first month
              $3.99, then $7.99). */}
          <PriceLead />
          <button
            type="button"
            className="tpa-cta tpp-cta"
            data-page-cta=""
            onClick={(e) => signUp("hero", e.currentTarget)}
          >
            {cta}
          </button>
          {/* The price, once, quiet (Sam, 6 Nov 2026: "far too busy"), with
              the parents' guarantee beside it (Sam, 9 Nov 2026, the Dara
              Denney audit's fix 2). On request, so never "auto". */}
          {/* The first month moved up under the price (Sam, 9 Nov 2026). */}
          <p className="tpp-under">
            <span>Full refund if they don’t save what you spent.</span>
          </p>
          {/* The turning proof line left the card (9 Nov 2026 polish, Sam:
              "we could still clean it up a bit"): its places, refund and
              students each already show nearby. A phone keeps it on the
              dock. */}
        </section>

        {/* The other two benefits and the promise, one quiet list (7 Nov
            2026 polish: the chips and the promise lines were four objects
            in two styles). */}
        <UnderOffer />
        </div>

        {/* What a week looks like, in one order, on their phone (Sam's pick
            D, 7 Nov 2026). */}
        <section className="tpa-module" aria-labelledby="tpp-save">
          <h2 id="tpp-save" className="tpa-h2">
            What ${CREDIT} credit looks like
          </h2>
          <CheckoutPhone />
        </section>

        {/* Answering the parent (Elevate's "for parents" section, in our own
            claims): how sign-up works from their side, shown on a phone
            beside the three steps (Sam's pick B, toned down, 7 Nov 2026). */}
        <section
          className="tpa-module"
          aria-labelledby="tpp-how"
        >
          <h2 id="tpp-how" className="tpa-h2">
            How it works for you
          </h2>
          <HowPhone />
        </section>

        {/* No surprises: a glyph and a few words per line, the full line one
            tap under it. */}
        <section className="tpa-module" aria-labelledby="tpp-sure">
          <h2 id="tpp-sure" className="tpa-h2">
            No surprises
          </h2>
          <div className="tpp-sure tnum">
            <Fold
              className="tpp-sure-row"
              lead={<Glyph d={GLYPHS.calendar} />}
              label={`Nothing today. ${FIRST} when they claim it`}
            >
              Your card is saved, not charged. When they claim it, {FIRST} for the first month, then {MONTHLY} a month.
            </Fold>
            <Fold
              className="tpp-sure-row"
              lead={<Glyph d={GLYPHS.refund} />}
              label="Unclaimed, it costs nothing"
            >
              If they don’t claim it within 30 days, it expires and you’re never charged.
            </Fold>
            <Fold
              className="tpp-sure-row"
              lead={<Glyph d={GLYPHS.mail} />}
              label="Cancel by email"
            >
              Email support@tapin.app any time and we’ll cancel it for you.
            </Fold>
            <Fold
              className="tpp-sure-row"
              lead={<Glyph d={GLYPHS.shield} />}
              label="No one is charged twice"
            >
              If they already have Tapin Plus, they can’t claim a second one, so nothing is charged.
            </Fold>
          </div>
        </section>

        <section className="tpa-module" aria-labelledby="tpp-faq">
          <h2 id="tpp-faq" className="tpa-h2">
            Questions
          </h2>
          <p className="tpp-faq-sub">For parents and students</p>
          {faq.map((f) => (
            <details key={f.q} className="tpa-qa">
              <summary>
                <span>{f.q}</span>
                <Chevron />
              </summary>
              <p>
                {f.a === "support@tapin.app" ? (
                  <a href="mailto:support@tapin.app">support@tapin.app</a>
                ) : (
                  f.a
                )}
              </p>
            </details>
          ))}
        </section>

        {/* The close: phones only (the desk layout hides it; the offer card
            is beside the reader the whole way down there). */}
        <section
          className="tpa-close tpp-close"
          aria-labelledby="tpp-close-h"
        >
          <img
            className="tpa-close-paper"
            src={PAPER_MARK}
            alt=""
            width="84"
            height="66"
            decoding="async"
            loading="lazy"
          />
          <h2 id="tpp-close-h" className="tpa-close-h tnum">
            Nothing charged until they claim it
          </h2>
          <p className="tpa-close-line tnum">
            Then {FIRST} the first month, {MONTHLY}/month after. Cancel anytime.
          </p>
          <button
            type="button"
            className="tpa-cta tpa-cta-white"
            data-page-cta=""
            onClick={(e) => signUp("close", e.currentTarget)}
          >
            {cta}
          </button>
        </section>

        <footer className="tpa-foot tpp-foot">
          <p>
            The $12 lunch is Coffeeholics’ California Club, $12.00 before tax.{" "}
            ${CREDIT} credit every 7 days per Plus place on ${MIN_ORDER}+ orders
            of food or non-alcoholic drinks placed through Tapin, or {PERCENT}%
            off once a day. One benefit per order. Alcohol excluded. Nothing is
            charged until your student claims the gift; then {FIRST} the first
            month, then {MONTHLY}/month, billed every month until cancelled. A
            gift not claimed within 30 days expires and is never charged. Tapin
            is not affiliated with Virginia Tech.
          </p>
          <p className="tpa-links">
            {LEGAL.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {l.label}
              </a>
            ))}
            <a href="mailto:support@tapin.app">support@tapin.app</a>
          </p>
        </footer>
      </main>

      <div ref={dockRef} className="tpa-dock tpp-dock" data-island-origin="" hidden>
        {/* The bar above says the students line, so the dock starts on the
            promise. */}
        <ProofTurn className="tpp-pt-dock" start="refund" paused={building} />
        <button
          type="button"
          className="tpa-cta tpa-dock-cta"
          onClick={(e) => signUp("dock", e.currentTarget)}
        >
          {cta}
          <DockArrow />
        </button>
      </div>

      {/* One continuous flow (Sam, 6 Nov 2026): the care package, then
          their number, you and the charge in the same panel (on a phone,
          the same drawer) over the gift's preview. */}
      {building ? (
        <GiftPreview
          builder
          sample
          origin={origin}
          onClose={() => setBuilding(false)}
          action={{ label: "Continue", onClick: () => {} }}
          startNext={hasSavedGiftCard()}
          resumeAt={resumeStep()}
          next={({ back, close, collapse, quick, change }) => (
            <ParentCheckout embedded open onEditGift={back} onChangeLook={change} quick={quick} onClose={close} onCollapse={collapse} />
          )}
        />
      ) : null}
    </div>
  );
}
