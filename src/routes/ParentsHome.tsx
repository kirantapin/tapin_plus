import TapInIcon from "../shell/TapInIcon";
import { takeKey } from "../model/redact";
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
import { captureUtm, lookupAskLink } from "../model/parents";
import ParentCheckout, { hasChargedParentCheckout } from "../shell/ParentCheckout";
import { useDockPulse } from "../shell/dockPulse";
import { DockArrow } from "../shell/DockArrow";
import {
  CREDIT,
  MIN_ORDER,
  PERCENT,
  FIRST,
  MONTHLY,
  PLACES,
  money,
  reducedMotion,
  Chevron,
  Glyph,
  GLYPHS,
  SAVES_NOTE,
  Fold,
  FlatMark,
} from "./parents_kit";
import { BenefitCards, Guarantee, HowPhone, LunchBars, MoreBenefits, OfferPrice } from "./parents_sections";
import { GiftEnvelope } from "./parents_gift";
import { GiftPreview } from "./GiftPage";

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
   where the money goes, money-back lines beyond the 14-day refund, seat
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
   COPY.md wants "For Virginia Tech parents", but naming the school waits on
   legal clearing it for paid traffic. Until then the pill says Blacksburg;
   flip NAME_VT to true once legal says yes, and nothing else changes. */
const NAME_VT = false;
const EYEBROW = NAME_VT
  ? "For Virginia Tech parents"
  : "For parents of Blacksburg students";

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
type ParentHero = "a" | "b" | "c";
const PARENT_HERO_KEY = "tp_parent_hero_v2";
const PARENT_HEROES: Record<ParentHero, readonly [string, string?]> = {
  a: ["A care package", "they’ll open every day."],
  b: ["Lunch is on you.", "Even from home."],
  c: ["Send them Tapin Plus,", "with a note from you."],
};
const isParentHero = (v: string | null): v is ParentHero =>
  v === "a" || v === "b" || v === "c";

let parentHeroCached: ParentHero | null = null;
function parentHero(): ParentHero {
  if (parentHeroCached) return parentHeroCached;
  if (typeof window === "undefined") return "a";
  const asked = new URLSearchParams(window.location.search).get("ph");
  if (isParentHero(asked)) return (parentHeroCached = asked);
  try {
    window.localStorage.removeItem(PARENT_HERO_KEY);
  } catch {
    /* Storage blocked: a draw per page load is the best there is. */
  }
  /* The test is over (Sam, 6 Nov 2026, picking "A care package they'll
     open every day"): everyone gets "a"; ?ph= still previews the others, and
     an earlier draw is cleared. */
  return (parentHeroCached = "a");
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
function Proof() {
  const box = useRef<HTMLDivElement | null>(null);
  const ring = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (reducedMotion()) return;
    box.current?.animate?.(
      [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: 520,
        delay: 260,
        easing: "cubic-bezier(.22,1,.36,1)",
        fill: "backwards",
      },
    );
    const pulse = ring.current?.animate?.(
      [
        { transform: "scale(1)", opacity: 0.55 },
        { transform: "scale(2.6)", opacity: 0 },
      ],
      {
        duration: 1800,
        delay: 900,
        easing: "cubic-bezier(.2,.6,.3,1)",
        iterations: Infinity,
      },
    );
    return () => pulse?.cancel();
  }, []);
  return (
    <div ref={box} className="tpp-proof">
      <p className="tpa-proof">
        <span className="tpa-proof-dot" aria-hidden="true">
          <i ref={ring} />
        </span>
        {PROOF_STUDENTS}
      </p>
    </div>
  );
}

/* ══ THE ORDER CARD, A PARENT'S VERSION ══════════════════════════════════════
   The student page's How it works card in its grey look (the same classes,
   so it reads as the same object): the five logos in the segmented track, one
   real food order, their $5 credit dropping in, what they pay. Tap a logo to
   see that place's order. No auto-cycle, no points, no "more joining" tab:
   quieter, and only the food. The beat is the student card's (420ms in,
   credit at 500ms, the total swapping at 820ms), played the first time the
   card is in view and on each tap. Reduced motion: the finished card. */
function OrderCard() {
  const card = useRef<HTMLDivElement | null>(null);
  const [which, setWhich] = useState(0);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = card.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const body = card.current;
    if (!body || !seen || reducedMotion()) return;
    const ease = "cubic-bezier(.22,1,.36,1)";
    const q = (sel: string) => body.querySelector<HTMLElement>(sel);
    const runs = [
      q(".tpa-order-in")?.animate?.(
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 420, easing: ease },
      ),
      q(".tpa-order-off")?.animate?.(
        [
          { opacity: 0, transform: "translateY(-12px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 380, delay: 500, easing: ease, fill: "backwards" },
      ),
      q(".tpa-swap .was")?.animate?.(
        [
          { opacity: 1, transform: "none" },
          { opacity: 0, transform: "translateY(-7px)" },
        ],
        { duration: 300, delay: 820, easing: ease, fill: "both" },
      ),
      q(".tpa-swap .now")?.animate?.(
        [
          { opacity: 0, transform: "translateY(9px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 300, delay: 820, easing: ease, fill: "both" },
      ),
    ];
    return () => runs.forEach((r) => r?.cancel());
  }, [which, seen]);
  const p = PLACES[which] ?? PLACES[0];
  if (!p) return null;
  return (
    <div
      ref={card}
      className="tpa-carousel tpp-order"
      data-tabs="a"
      data-look="colour"
      data-grey=""
      role="group"
      aria-label="Example orders"
      style={{
        ["--brand" as string]: "var(--well)",
        ["--brand-ink" as string]: "var(--ink)",
      }}
    >
      <div
        className="tpa-tabs"
        style={{ ["--i" as string]: which, ["--n" as string]: PLACES.length }}
      >
        <span className="tpa-tab-plate" aria-hidden="true" />
        {PLACES.map((x, i) => (
          <button
            key={x.id}
            type="button"
            aria-label={`Show an order at ${x.name}`}
            aria-pressed={i === which}
            data-on={i === which ? "" : undefined}
            onClick={() => setWhich(i)}
          >
            <span className="collar tpa-tab-logo" data-field={logoField(x.id)}>
              <img src={x.logo} alt="" decoding="async" />
            </span>
            <span className="tpa-tab-name" aria-hidden="true">
              {x.name}
            </span>
          </button>
        ))}
      </div>
      <div className="tpa-order">
        <p className="tpa-order-band">
          <b>{p.name}</b>
        </p>
        <div className="tpa-order-in" key={which}>
          <p className="tpa-order-item">
            <img src={p.order.img} alt="" decoding="async" />
            <span>{p.order.label}</span>
            <b className="tnum">{money(p.order.price)}</b>
          </p>
          <p className="tpa-order-off">
            <span>Their ${CREDIT} credit</span>
            <b className="tnum">&minus;{money(CREDIT)}</b>
          </p>
          <p className="tpa-order-total">
            <span>They pay</span>
            <span className="tpa-swap">
              <b className="was tnum">{money(p.order.price)}</b>
              <b className="now tnum">{money(p.order.price - CREDIT)}</b>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── An "Ask a parent" link (?ask=TOKEN) ─────────────────────────────────── */
type Ask =
  | { state: "none" }
  | { state: "loading"; token: string }
  | {
      state: "ok" | "expired" | "covered";
      token: string;
      name: string;
      masked: string;
    }
  | { state: "error"; token: string };

const askToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const t = q.get("ask")?.trim() || null;
  /* The key out of the address before anything reads the URL, kept for this
     tab (model/redact.ts). */
  if (t) q.delete("ask");
  const rest = q.toString();
  return takeKey(
    "tp_parent_ask_v1",
    t,
    `${window.location.pathname}${rest ? `?${rest}` : ""}`,
  );
};

export default function ParentsHome() {
  const { track, registerForSession } = useEventTracking();

  const [hero] = useState(parentHero);
  const [photo] = useState(heroPhoto);
  const headline = PARENT_HEROES[hero];
  const shot = PHOTOS[photo];

  const [token] = useState(askToken);
  const [ask, setAsk] = useState<Ask>(() =>
    token ? { state: "loading", token } : { state: "none" },
  );

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
    track("parent_page_view", { ask: !!token, parent_hero_variant: hero });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    let live = true;
    lookupAskLink(token)
      .then((info) => {
        if (!live) return;
        const state = info.already_covered
          ? "covered"
          : info.expired
            ? "expired"
            : "ok";
        setAsk({
          state,
          token,
          name: info.student_first_name,
          masked: info.masked_phone,
        });
        track("ask_link_opened", {
          expired: info.expired,
          already_covered: info.already_covered,
        });
      })
      .catch(() => {
        if (!live) return;
        setAsk({ state: "error", token });
        track("ask_link_opened", { failed: true });
      });
    return () => {
      live = false;
    };
  }, [token, track]);

  const asked = ask.state === "ok" ? ask : null;
  /* The gift before the ask (Sam, 6 Nov 2026: "the CTA should be "build
     their care package" or something like that. Instead of going right for
     the ask"): every button here opens the checkout on the care package. */
  const cta = asked ? `Build ${asked.name}’s care package` : "Build their care package";
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
    track("parent_signup_clicked", { where, ask: !!asked });
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
      q: "What if they don’t use it?",
      a: `Two $${MIN_ORDER} orders a month cover the cost. If it isn’t getting used, you or your student can cancel anytime. If they never sign in within 14 days, we refund you in full.`,
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
      a: "One text to let them know, and up to two reminders if they haven’t signed in. We don’t send them marketing texts unless they sign up for them.",
    },
    {
      q: "What phone do they need?",
      a: "iPhone: the Tapin app. Android: the Tapin web app in their browser.",
    },
    {
      q: "My student already has Tapin Plus. What happens?",
      a: "Billing moves to you and their own subscription ends. No one is charged twice.",
    },
    {
      q: "How do I cancel?",
      /* Sam, 6 Nov 2026: "parents can manage their subscription any time by
         emailing support@tapin.app - or their student can cancel it in the
         tapin app". */
      a: "Email support@tapin.app any time and we’ll change or cancel it for you. Your student can also cancel in the Tapin app, and we’ll let you know if they do.",
    },
    {
      q: "Who do I contact with questions?",
      a: "support@tapin.app",
    },
  ];

  return (
    <div className="tpa tpa-home tpp">
      <header
        className="tpa-band tpp-band"
        data-hero="parents"
        data-photo={photo}
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
            {/* The Tapin logo, not the Plus mark (Sam, 7 Nov 2026). */}
            <TapInIcon className="tpp-label-mark" />
            {EYEBROW}
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

            <Proof />
          </div>
        </div>
      </header>

      <main className="tpa-sheet">
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
          {ask.state === "ok" ? (
            <div className="tpp-ask" role="status">
              <span className="tpa-well" aria-hidden="true">
                <FlatMark className="tpa-well-mark" />
              </span>
              <p>
                <b>{ask.name} asked you to cover their Tapin Plus</b>
                <span className="tnum">Their number: {ask.masked}</span>
              </p>
            </div>
          ) : ask.state === "expired" ? (
            <p className="tpp-ask tpp-ask-plain" role="status">
              {ask.name}’s link has expired. You can still sign them up here
              with their number.
            </p>
          ) : ask.state === "covered" ? (
            <p className="tpp-ask tpp-ask-plain" role="status">
              {ask.name}’s Tapin Plus is already covered. To sign up a different
              student, use their number below.
            </p>
          ) : ask.state === "error" ? (
            <p className="tpp-ask tpp-ask-plain" role="status">
              We couldn’t open that link. You can still sign your student up
              here with their number.
            </p>
          ) : null}
          {/* The hero's sub (COPY.md v2 final, with Sam's $60, 5 Nov 2026) as a
              picture: the $12 lunch dropping to $7, then its two facts as
              figure-and-label rows ($60 a month on average*; first month
              $3.99, then $7.99). */}
          <OfferPrice />
          <button
            type="button"
            className="tpa-cta tpp-cta"
            data-page-cta=""
            onClick={(e) => signUp("hero", e.currentTarget)}
          >
            {cta}
          </button>
          {/* The price, once, quiet (Sam, 6 Nov 2026: "far too busy"). */}
          <p className="tpp-under tnum">
            {FIRST} the first month, then {MONTHLY}/month. Cancel anytime.
          </p>
        </section>

        <MoreBenefits className="tpp-more tpp-more-out" />
        <Guarantee asked={!!asked} />
        </div>

        {/* SEND IT WITH A NOTE (Sam, 6 Nov 2026): the gift, and the page
            their student opens. */}
        <GiftEnvelope onSend={(el) => signUp("gift", el)} />

        {/* THE VALUE STACK (COPY.md v2) as six tiles: a figure or a glyph and
            a few words each, the approved line one tap under it. No total
            anywhere, no points value. */}
        <section
          className="tpa-module"
          aria-labelledby="tpp-get"
        >
          <h2 id="tpp-get" className="tpa-h2">
            What they get
          </h2>
          <BenefitCards />
          <p className="tpp-note">{SAVES_NOTE}</p>
        </section>

        {/* WHAT A LUNCH COSTS (COPY.md v2 final: under the value stack, the
            $12 to $7 first and the door price as context). One meal priced
            four ways to one scale, never the plan, the Plus bar shedding its
            $5 (Sam's pick A, toned down to the white module, 7 Nov 2026).
            The footnotes, word for word, under Sources. */}
        <section
          className="tpa-module"
          aria-labelledby="tpp-lunch"
        >
          <h2 id="tpp-lunch" className="tpa-h2">
            What a lunch costs
          </h2>
          <LunchBars />
          <p className="tpp-keep">
            <b>Keep their dining plan.</b> Tapin Plus is for the meals they buy
            off campus.
          </p>
          <details className="tpa-more tpp-sources">
            <summary>
              Sources
              <Chevron />
            </summary>
            <div className="tpp-notes">
              <p>
                ¹ VT Dining’s posted door rate for lunch and dinner at D2 and
                Owens Food Court, Nov 2026
                (dining.vt.edu/dining_centers/dietrick-hall.html, owens.html).
              </p>
              <p>
                ² Menu prices before tax (Coffeeholics’ California Club,
                $12.00). $5 credit every 7 days per Plus place on $10+ orders of
                food or non-alcoholic drinks, or 15% off once a day. One per
                order. Tapin is not affiliated with Virginia Tech.
              </p>
            </div>
          </details>
        </section>

        {/* What a week looks like, in one order. */}
        <section className="tpa-module" aria-labelledby="tpp-save">
          <h2 id="tpp-save" className="tpa-h2">
            What ${CREDIT} back looks like
          </h2>
          <OrderCard />
          <p className="tpp-math tnum">
            Two ${MIN_ORDER} orders a month cover the {MONTHLY}. Alcohol is
            never discounted.
          </p>
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
              label={`${FIRST} today, then ${MONTHLY}/month`}
            >
              {FIRST} today for the first month, then {MONTHLY} a month.
            </Fold>
            <Fold
              className="tpp-sure-row"
              lead={<Glyph d={GLYPHS.refund} />}
              label="Full refund if they never sign in"
            >
              If they haven’t signed in within 14 days, we cancel it and refund
              you in full.
            </Fold>
            <Fold
              className="tpp-sure-row"
              lead={<Glyph d={GLYPHS.mail} />}
              label="Change or cancel by email"
            >
              Email support@tapin.app any time and we’ll change or cancel it for
              you.
            </Fold>
            <Fold
              className="tpp-sure-row"
              lead={<Glyph d={GLYPHS.phone} />}
              label="They can cancel in the app"
            >
              They can cancel in the app too. If they do, your billing stops and we’ll text you.
            </Fold>
            <Fold
              className="tpp-sure-row"
              lead={<Glyph d={GLYPHS.shield} />}
              label="No one is charged twice"
            >
              If they already have Tapin Plus, billing moves to you and their
              own subscription ends. No one is charged twice.
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
            {FIRST} today for the first month
          </h2>
          <p className="tpa-close-line tnum">
            Then {MONTHLY}/month. Cancel anytime.
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
            ${CREDIT} credit every 7 days per Plus place on ${MIN_ORDER}+ orders
            of food or non-alcoholic drinks placed through Tapin, or {PERCENT}%
            off once a day. One benefit per order. Alcohol excluded. {FIRST}{" "}
            first month, then {MONTHLY}/month. Billed today, then every month
            until cancelled. Refunded in full if your student doesn’t sign in
            within 14 days. Tapin is not affiliated with Virginia Tech.
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
          fixedTo={asked ? asked.name : null}
          masked={asked ? asked.masked : undefined}
          origin={origin}
          onClose={() => setBuilding(false)}
          action={{ label: "Continue", onClick: () => {} }}
          startNext={hasChargedParentCheckout()}
          next={(back, close, collapse) => (
            <ParentCheckout
              embedded
              open
              onEditGift={back}
              onClose={close}
              onCollapse={collapse}
              ask={
                asked
                  ? {
                      token: asked.token,
                      student_first_name: asked.name,
                      masked_phone: asked.masked,
                    }
                  : null
              }
            />
          )}
        />
      ) : null}
    </div>
  );
}
