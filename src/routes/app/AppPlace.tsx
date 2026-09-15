import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { BenefitIcon } from "../../shell/Icons";
import PlusFlag from "../../shell/PlusFlag";
import {
  benefits,
  offers,
  venues,
  logoField,
  heroIsBright,
} from "../../model/content";
import { useReserveCta } from "../../shell/useReserveCta";
import { sectionsFor, type MenuItem } from "../../model/menu";
import {
  quote,
  money,
  type BenefitMode,
  SEED,
  CREDIT_CENTS,
  CREDIT_MIN_CENTS,
  POINTS_PER_DOLLAR,
  whole,
} from "../../model/order";
import { venuePoints } from "./appBits";
import { BENEFIT } from "../../model/savings";
import { doorItemsFor, isDoorItem, doorKind, tonight } from "../../model/tonight";
import { CoverIcon } from "../../shell/Icons";
import ItemSheet from "./ItemSheet";
import {
  optionsFor,
  lineTotalCents,
  pickSummary,
  newLine,
  type OrderLine,
} from "../../model/options";

const ALCOHOL_NOTE = "The 15% skips alcohol. Points land on everything.";
/**
 * NAMES THE THREE, because this is the one page that lists none of them.
 *
 * The pitch's version reads "Plus places carry all three benefits", which works
 * there — the three tiles are directly above it. Here it is a dangling
 * reference: a reader who came straight to Italiano's from Home has never seen
 * them, and asking "which three?" on the page that cannot answer is worse than
 * three extra words.
 */
const BADGE_NOTE =
  "TapIn Plus places carry 15% off or $5 credit, one per order, and points on everything. Italiano’s runs its own one-time offers.";

/**
 * One merchant, inside the app preview.
 *
 * WHY THIS PAGE IS INTERACTIVE WHEN THE OTHER FOUR ARE NOT. The preview's rule
 * is a defect definition, not a ban on controls: "a control that looks tappable
 * but does nothing". A menu row that adds its dish to a basket does exactly what
 * it appears to do — the effect completes on this page, immediately, and is
 * reversible. /how's spend bands are the same species of control and nobody
 * reads them as fake. What stays forbidden is any control naming an effect
 * OUTSIDE this page: there is no Pay, no Order, no Save to My Spot, no redeem,
 * no scheduling. She assembles a real basket of real dishes at real prices and
 * watches the member price assemble with it; what she cannot do is buy it,
 * because the app does not open until Spring 2027 and the bar above says so.
 *
 * THE THREE VENUE STATES ARE NOT THREE TEMPLATES. One page reads the venue
 * record and renders what is true of it:
 *   plus + menu            Coffeeholics, The Burg, Olaika, The Milk Parlor
 *   plus + no menu         Sweetopia — the joined-but-not-orderable state
 *   not plus + menu        Italiano's — its own one-time offer, and no standing
 *                          benefits, because it carries none
 * Nothing is greyed, struck or captioned "not available here". A benefit
 * Italiano's does not have is a row that is not there (§6).
 */
export default function AppPlace() {
  const cta = useReserveCta();
  const { venueId } = useParams();
  const venue = venues.find((v) => v.id === venueId);

  const sections = useMemo(() => (venue ? sectionsFor(venue.id) : []), [venue]);

  /**
   * SEEDED WITH ONE ITEM, UNDER $10, and it is the difference between a page
   * that explains itself and one that does not. Empty, the whole ticket is dead
   * and she has to guess what the page is for. Full and over the threshold, the
   * page is a screenshot and both transitions worth having are already spent.
   * One cheap item populates the ticket, makes removal discoverable, and leaves
   * her next tap to cross $10 — the moment the credit stops being a rule and
   * starts being an amount.
   *
   * The basket is local to this page and dies with it. One that followed her
   * between venues would imply an account, and §9 allows no badge to show it.
   */
  /* LINES, NOT IDS (15 Sep 2026, the mockups Sam approved). A line is a dish
     with its picks, a quantity and a note; two cappuccinos with different
     milks are two lines. The seed is one line of the venue's seed dish at its
     default picks. See model/options.ts. */
  const [lines, setLines] = useState<OrderLine[]>(() => {
    if (!venue) return [];
    const seedName = SEED[venue.id];
    const secs = sectionsFor(venue.id);
    for (const sec of secs) {
      const seed = sec.items.find((i) => i.name === seedName);
      if (seed) return [newLine(seed, optionsFor(sec.label))];
    }
    return [];
  });
  const [mode, setMode] = useState<BenefitMode>("percent");
  /** The open sheet: a dish, and the line it edits (null = a fresh line). */
  const [sheet, setSheet] = useState<{ item: MenuItem; line: OrderLine | null } | null>(null);
  /** Scroll-spy for the category chips: which section head is nearest the top. */
  const [activeSec, setActiveSec] = useState<string | null>(null);
  useEffect(() => {
    const heads = Array.from(document.querySelectorAll<HTMLElement>(".place-sec[data-sec]"));
    if (!heads.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActiveSec((hit.target as HTMLElement).dataset.sec ?? null);
      },
      { rootMargin: "-120px 0px -70% 0px" },
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [venue]);
  /* DEV seam: `?sheet=<item name>` opens that dish's sheet on load, so the
     dialog can be inspected headless at any width. Nothing in production. */
  useEffect(() => {
    if (!import.meta.env.DEV || !venue) return;
    const want = new URLSearchParams(window.location.search).get("sheet");
    if (!want) return;
    const it = [...sectionsFor(venue.id).flatMap((x) => x.items), ...doorItemsFor(venue.id)].find((i) => i.name === want);
    if (it) setSheet({ item: it, line: null });
  }, [venue]);

  /**
   * THE TOTAL FOLLOWS HER INTO THE MENU.
   *
   * Measured, the reason this exists: the ticket and the item that crosses the
   * $10 threshold are both on screen for 61px of a 1,299px scroll range — 4.7%.
   * At Coffeeholics every item that can cross it is a sandwich, and no sandwich
   * row is ever co-visible with the total. So the page's whole interaction —
   * tap a dish, watch the member price move — was invisible at the moment it
   * happened, and the reversible credit swap this page is built around ran
   * off-screen essentially always.
   *
   * A sticky full ticket was the obvious fix and is wrong: it is 200-270px, a
   * third of the window. This is one line, it appears only once the real ticket
   * has scrolled away, and it carries the same computed figures — no second
   * arithmetic, no projection, no price of the membership. Tapping it returns
   * to the ticket, which is the only thing it claims to do.
   */
  const ticketRef = useRef<HTMLElement | null>(null);
  const [ticketOff, setTicketOff] = useState(false);
  useEffect(() => {
    const el = ticketRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setTicketOff(!e.isIntersecting), {
      // The sticky Preview bar owns the top 60px; anything under it is hidden.
      rootMargin: "-60px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!venue) return <Navigate to="/app" replace />;

  /* What is for sale at the door tonight, here (model/tonight.ts). Example
     listings; they ride the ticket beside the food, never inside quote(). */
  const doorItems = doorItemsFor(venue.id);
  const listing = tonight.find((t) => t.venueId === venue.id);
  const byId = new Map<string, MenuItem>(
    [...sections.flatMap((s) => s.items), ...doorItems].map((i) => [i.id, i]),
  );
  /** Which section a dish sits in — its option groups follow from that. */
  const sectionOf = new Map<string, string>(
    sections.flatMap((sec) => sec.items.map((i) => [i.id, sec.label] as [string, string])),
  );
  const groupsFor = (item: MenuItem) => optionsFor(sectionOf.get(item.id));
  /* Each line priced as one MenuItem for quote(): the dish's price with its
     picks, times its quantity. quote() sums cents(price), so the ticket's
     arithmetic stays in one place. */
  const chosen = lines
    .filter((l) => !isDoorItem(l.itemId))
    .map((l) => {
      const it = byId.get(l.itemId);
      return it ? { ...it, price: lineTotalCents(it, groupsFor(it), l) / 100 } : null;
    })
    .filter(Boolean) as MenuItem[];
  /* Door lines: cover, a line skip, a ticket. Paid at their price beside the
     food's benefits (§5: the 15% and the credit are food and drink), and they
     earn points — "points on everything". */
  const doorCents = lines
    .filter((l) => isDoorItem(l.itemId))
    .reduce((n, l) => {
      const it = byId.get(l.itemId);
      return it ? n + lineTotalCents(it, [], l) : n;
    }, 0);
  const countOf = (itemId: string) => lines.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.qty, 0);
  const units = lines.reduce((n, l) => n + l.qty, 0);
  const bal = venuePoints.find((p) => p.venueId === venue.id);
  const offer = offers.find((o) => o.venueId === venue.id);
  // Her credit at THIS venue is spent on THIS ticket — §5, "later orders spend
  // it". Printing the balance above a total that ignores it was the page's
  // worst moment: a reader on a budget subtracts the two instantly.
  /* Which of the two this ticket takes: 15% off now, or full price and $5
     credit added to her account (Sam, 15 Sep 2026). Percent by default; the
     switch appears once the basket clears $10. Falls back to percent if the
     basket drops under it again. */
  const q = quote(venue, chosen, mode);
  const payCents = q.dueCents + doorCents;
  const listCents = q.subtotalCents + doorCents;
  const pointsAll = q.points + Math.floor((doorCents * POINTS_PER_DOLLAR) / 100);
  /** How a line is used once it is bought — the thing Sam wants "abundantly
   *  clear". Door items are shown at the door; food goes to the kitchen at a
   *  place that is open, and waits in My Spot at one that is not (§5). */
  const howUsed = (itemId: string): string =>
    isDoorItem(itemId)
      ? "Show at the door"
      : venue.open
        ? "To the kitchen · we ping you"
        : "Saves to My Spot";

  /** A venue is orderable in the app when the extraction gave it a menu. */
  const orderable = sections.length > 0;
  /**
   * Whether this venue's menu has photography AT ALL.
   *
   * Five venues have a photograph for every dish; Sweetopia has none, because
   * its menu was read from the live page rather than the extraction run that
   * produced the item files. Rendering its 22 rows with an empty 54px square
   * each reads as twenty-two broken images. A menu with no art is a different,
   * honest shape — the rows are typographic — and it is chosen per venue rather
   * than per item so one missing file cannot ragged-edge a whole section.
   */
  const hasArt = sections.some((sec) => sec.items.some((i) => i.img));

  /* A tap on a row opens the sheet: fresh if the dish is not in the order,
     editing its line if it is (the mockup's rule — the row is the door back
     into what she chose). */
  const openFor = (item: MenuItem) => {
    const existing = [...lines].reverse().find((l) => l.itemId === item.id) ?? null;
    setSheet({ item, line: existing });
  };
  const saveSheet = (next: { qty: number; picks: Record<string, string[]>; note: string }) => {
    if (!sheet) return;
    if (sheet.line) {
      const key = sheet.line.key;
      setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...next } : l)));
    } else {
      setLines((ls) => [...ls, { ...newLine(sheet.item, groupsFor(sheet.item)), ...next }]);
    }
    setSheet(null);
  };
  const removeSheet = () => {
    if (!sheet?.line) return;
    const key = sheet.line.key;
    setLines((ls) => ls.filter((l) => l.key !== key));
    setSheet(null);
  };


  return (
    <>
      {/* Identity. The photograph is the merchant's own, already shown at two
          other scales on / and /reserve, so a page head is a change of scale
          rather than a new claim (§6). No text sits on the bare image; the
          collar is the only place a merchant's brand colour appears anywhere
          in this product. */}
      <div className="place-shot">
        <img
          src={venue.hero}
          alt=""
          decoding="async"
          data-bright={heroIsBright(venue.id) ? "true" : undefined}
        />
        <span
          className="collar place-collar"
          data-field={logoField(venue.id)}
          style={{ ["--brand" as string]: venue.brandColor }}
        >
          <img src={venue.logo} alt="" decoding="async" />
        </span>
      </div>

      {/* ══ MENU LEFT, BILL RIGHT, ON DESKTOP ═════════════════════════════════
          These wrappers are `display:contents` below 1024px, so the phone keeps
          exactly the order it already had: identity, ticket, menu, recital.

          On a desktop the ticket becomes a sticky companion to the menu, which
          is the only honest shape for this page. The whole point of it is that
          tapping a menu row changes a figure — and on a phone that figure sits
          400px above the row being tapped, which is precisely why `.place-mini`
          exists: a pill that pins the running total once the ticket scrolls
          away. Beside the menu the real ticket is always on screen, so desktop
          drops the pill. Same move, same reason, as the bottom bar on /reserve. */}
      <div className="pl-body">
        <div className="pl-main-a">
      <div className="place-id">
        <h1 className="place-name">
          {venue.name}
          {venue.plus ? <PlusFlag className="plus" /> : null}
        </h1>
        <p className="t-compact place-meta">
          {venue.category} · {venue.street}
        </p>
        {/* NO PLACEHOLDER WHERE THERE IS NO BALANCE. This slot briefly read
            "New to you" at Italiano's and Sweetopia, to stop those two pages
            being the only ones with a gap in them — but "New to you" is a
            tense, and neither venue can ever fill the slot: Italiano's carries
            no points or credit policy at all, and Sweetopia cannot be ordered
            from, which is the only way to earn one. A hole is honest; a hole
            filled with a future is not. */}
        {/* Points only. The credit is a weekly benefit she USES on a $10+ order
            — one of the two (Sam, 15 Sep 2026) — not a balance that sits here;
            the ticket below says so where it applies. */}
        {bal ? (
          <p className="place-bal">
            <b className="tnum">{bal.points.toLocaleString()}</b> points here
          </p>
        ) : null}

        {/* ══ THE MERCHANT'S REAL PAGE ════════════════════════════════════════
            Sam, 13 Sep 2026: "when previewing pages like coffeeholics and the
            burg, there should be a button to their actual live pages that are
            currently up and running. This is added proof of authority." He gave
            two addresses and only two; the other four venues have no live page
            and render nothing here, the same way Italiano's renders no benefit
            rows (§6) rather than a greyed one.

            THE PROOF IS THE ADDRESS, NOT THE BUTTON, so the address is what the
            control says. Every other screen in this preview has spent its words
            explaining that the app opens in Spring 2027; this is the one line a
            reader can check in ten seconds, and a control reading "Visit their
            page" would have thrown that away. Hence the hostname, visible, in
            the label.

            IT IS ALSO THE ONLY CONTROL IN THE PREVIEW THAT LEAVES IT. The
            preview's rule is that nothing may name an effect outside its own
            page — because such a control would be a lie. This one is not: the
            effect is real, it happens, and it is the single exception the rule
            exists to permit. New tab, so her place in the preview survives it.

            THE EARNING LINE IS SAM'S CLAIM AND IS RECORDED AS HIS: "Any points
            and credit that are accrued at those locations will count towards
            their membership balance so they can start earning both of those
            starting today." It is the only promise on this page about a date
            that has already arrived, so it is said once, attached to the link
            that makes it actionable, and nowhere else. */}
        {venue.liveUrl ? (
          <p className="place-live">
            <a
              className="place-live-go"
              href={venue.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${venue.name} on tapin.app — opens in a new tab`}
            >
              {venue.liveUrl.replace(/^https?:\/\/(www\.)?/, "")}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 5h5v5M19 5l-8 8M17 14.5V19H5V7h4.5" />
              </svg>
            </a>
            <span className="t-compact place-live-note">
              Open now, not a preview. Points and credit you earn here today carry
              into your membership.
            </span>
          </p>
        ) : null}
      </div>

      {/* THE MENU COMES FIRST, and the order of these two blocks was the
          single biggest thing wrong with this page. The benefits block led,
          which put 39 words of benefit recital in the first viewport — the
          same three rows she can read on the Deals tab and on Home — and
          pushed the one thing no other screen has, a real menu at real
          prices, roughly 900px down. She reached a page about a coffee shop
          with nothing tappable and no price on it. Now the ticket and the
          first menu rows are above the fold and the recital is last. */}
        </div>

        {/* ══ TONIGHT HERE ══════════════════════════════════════════════════
            The passport's door (Sam, 15 Sep 2026): cover, a line skip or a
            ticket, bought here like a dish — a tap opens the sheet, Add puts
            it on the ticket, and the ticket says it is shown at the door.
            Example listing, tagged; see model/tonight.ts. */}
        {listing && doorItems.length ? (
          <section className="app-sec place-tonight">
            <h2 className="t-caption">
              Tonight here <span className="tag tag-sm">{listing.tag}</span>
            </h2>
            <p className="place-tonight-what">
              <b>{listing.title}</b>
              <span>{listing.when}</span>
            </p>
            <ul className="place-door">
              {doorItems.map((d) => {
                const n = countOf(d.id);
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      className={`place-door-row${n ? " is-on" : ""}`}
                      onClick={() => openFor(d)}
                    >
                      <span className="place-door-icon" aria-hidden="true">
                        <CoverIcon id={doorKind(d.id) ?? "cover"} />
                      </span>
                      <span className="place-item-text">
                        <b>{d.name}</b>
                        <span>{d.desc}</span>
                      </span>
                      <span className="place-item-price tnum">{money(Math.round(d.price * 100))}</span>
                      {n > 1 ? <span className="place-count tnum" aria-hidden="true">{n}</span> : null}
                      <span className="place-tick" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d={n ? "m6 12.5 4 4 8-8.5" : "M12 6v12M6 12h12"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="t-compact app-note">Shown at the door from your phone. Some places scan.</p>
          </section>
        ) : null}

        {sections.length > 0 ? (
          <div className="pl-side">
          {/* The ticket. It sits ABOVE the menu so the page explains itself in
              one glance — a seeded, priced order, with the first menu rows
              directly beneath it on a phone, so she can see both while tapping. */}
          {/* Announced, because the whole point of the page is a figure that
              changes when you tap something 400px further down. Without this a
              screen-reader user gets aria-pressed on the row she tapped and no
              idea that the price moved. Polite, not assertive: it is a readout
              she can finish her sentence over, not an alert. */}
          <section className="app-sec place-ticket" aria-live="polite" ref={ticketRef}>
            <h2 className="t-caption">Your order</h2>

            {chosen.length === 0 ? (
              /* THE EMPTY STATE KEEPS THE RULE ROWS. Taking the seeded item out
                 is a first-timer's most likely second tap, and when the ticket
                 held only a sentence it collapsed by 192px — the member price,
                 the credit line, the total and the earn block all vanishing at
                 once and the menu leaping up under her finger. The rules are
                 true of this venue whether or not anything is in the basket, so
                 they stay and the section barely moves. */
              <>
                <p className="t-compact app-note">Tap anything below to start one.</p>
                {venue.plus ? (
                  <ul className="place-earns">
                    <li className="place-earns-head">Every order here</li>
                    <li>
                      <b>{Math.round(BENEFIT.percentOff * 100)}% off</b> now, or spend{" "}
                      {whole(CREDIT_MIN_CENTS)}+ and have <b className="tnum">{money(CREDIT_CENTS)}</b>{" "}
                      credit added to your account &mdash; one of the two, once a week
                    </li>
                    <li>
                      <b>{POINTS_PER_DOLLAR}</b> points a dollar, on everything
                    </li>
                  </ul>
                ) : null}
              </>
            ) : (
              <>
                <ul className="place-lines">
                    {lines.map((l) => {
                      const it = byId.get(l.itemId);
                      if (!it) return null;
                      const g = groupsFor(it);
                      const sum = pickSummary(g, l.picks);
                      return (
                        <li className="place-line" key={l.key}>
                          <span className="place-line-qty tnum" aria-label={`${l.qty} of`}>{l.qty}</span>
                          <span className="place-line-text">
                            <b>{it.name}</b>
                            <span>{sum || l.note || "\u200b"}</span>
                          </span>
                          <b className="tnum place-line-price">{money(lineTotalCents(it, g, l))}</b>
                          <em className={`place-line-how${isDoorItem(it.id) ? " is-door" : ""}`}>{howUsed(it.id)}</em>
                          <button
                            type="button"
                            className="place-line-edit"
                            onClick={() => setSheet({ item: it, line: l })}
                            aria-label={`Edit ${it.name}`}
                          >
                            Edit
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                {/* ══ ONE OF THE TWO, CHOSEN ON THE TICKET ══════════════════
                    Sam, 15 Sep 2026: one benefit per order — 15% off now, or
                    "spend $10, get $5 credit … added to your account, so
                    you're still paying the full price." Once the basket clears
                    $10 the ticket offers the choice as a switch; under $10
                    there is only the 15%, and the note says what $10 unlocks.
                    The switch reprices this ticket and nothing else — the
                    preview's rule for a live control. */}
                {q.standing && q.earnsCredit ? (
                  <div className="place-mode" role="radiogroup" aria-label="Which benefit">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={q.using === "percent"}
                      className={q.using === "percent" ? "is-on" : undefined}
                      onClick={() => setMode("percent")}
                    >
                      {q.offPercent}% off now
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={q.using === "credit"}
                      className={q.using === "credit" ? "is-on" : undefined}
                      onClick={() => setMode("credit")}
                    >
                      {money(CREDIT_CENTS)} credit for later
                    </button>
                  </div>
                ) : null}

                {q.using === "percent" ? (
                  <p className="app-paid place-credit">
                    <span>{q.offPercent}% off</span>
                    <b className="tnum">&minus;{money(q.offCents)}</b>
                  </p>
                ) : null}
                <p className="app-paid place-pay">
                  <span>{q.using === "credit" ? "You pay · full price" : "You pay"}</span>
                  <span className="app-paid-figs">
                    {q.using === "percent" && q.offCents > 0 ? (
                      <b className="tnum app-was">{money(listCents)}</b>
                    ) : null}
                    <b className="tnum">{money(payCents)}</b>
                  </span>
                </p>
                {q.using === "credit" ? (
                  <p className="app-paid place-credit place-earn-swap">
                    <span>Added to your account</span>
                    <b className="tnum place-plus">+{money(q.creditEarnedCents)}</b>
                  </p>
                ) : null}

                {/* The other side, in one sentence. Reversible by construction:
                    drop under $10 and it goes back to saying what $10 unlocks. */}
                {q.using !== "none" ? (
                  <p key={`${q.using}-${q.earnsCredit}`} className="t-compact app-note place-alt place-earn-swap">
                    {q.using === "credit" ? (
                      <>
                        Instead of {q.offPercent}% off now (<b className="tnum">{money(q.altCents)}</b>).
                        The credit doesn&rsquo;t expire.
                      </>
                    ) : q.earnsCredit ? (
                      <>
                        Or pay full price and have <b className="tnum">{money(CREDIT_CENTS)}</b> credit
                        added to your account for later. One of the two per order.
                      </>
                    ) : (
                      <>
                        Spend {whole(CREDIT_MIN_CENTS)}+ and you can take{" "}
                        <b className="tnum">{money(CREDIT_CENTS)}</b> credit for later instead.
                        Once a week here.
                      </>
                    )}
                  </p>
                ) : null}

                {q.standing ? (
                  <ul className="place-earns">
                    <li className="place-earns-head">And you earn</li>
                    <li>
                      <b className="tnum">{pointsAll.toLocaleString()}</b> points &middot; on
                      everything
                    </li>
                  </ul>
                ) : null}

                {/* An offer is not applied to this ticket and must not look as
                    though it were: §5 makes it something the member adds, after
                    which it reads used.

                    THE GUARD USED TO BE `!q.standing && offer`, i.e. non-Plus
                    venues only, because Italiano's was the only venue with an
                    offer. Olaika now has one too and it is a Plus venue, so the
                    narrow guard would have printed a 50% headline in the section
                    below while this ticket quietly applied only the 15% — the
                    exact unexplained gap the line exists to close. It keys off
                    the offer, not off the venue's tier. */}
                {offer ? (
                  <p className="t-compact app-note place-offer">
                    {offer.label} available here — {offer.detail.toLowerCase()}.
                  </p>
                ) : null}

                {/* NO FULFILMENT LINE. "To the kitchen" existed to carry §5's
                    closed-venue case, and once `open` came off the rendered
                    surface it said the same three words on all five pages —
                    while sitting directly above a filled maroon button, in the
                    exact stack a food app uses for checkout: total, destination,
                    place order. A reader gets "Reserve a founding seat" 16px
                    under a lunch total and can reasonably think the button buys
                    the lunch. The line was doing no work and that damage. */}
              </>
            )}
          </section>
          </div>
        ) : null}

        <div className="pl-main-b">
        {sections.length > 0 ? (
          <section className="app-sec place-menu-sec">
            <h2 className="t-caption">Menu</h2>
            {/* The storefront's category chips, stuck under the banner while the
                menu scrolls; a tap jumps to the section, and the chip of the
                section under the banner is the maroon one. */}
            {sections.length > 1 ? (
              <nav className="place-cats" aria-label="Menu sections">
                {sections.map((sec) => (
                  <button
                    type="button"
                    key={sec.label}
                    className={`place-cat${(activeSec ?? sections[0].label) === sec.label ? " is-on" : ""}`}
                    onClick={() => {
                      setActiveSec(sec.label);
                      document
                        .querySelector<HTMLElement>(`.place-sec[data-sec="${CSS.escape(sec.label)}"]`)
                        ?.scrollIntoView({ block: "start", behavior: "smooth" });
                    }}
                  >
                    {sec.label}
                  </button>
                ))}
              </nav>
            ) : null}
            {sections.map((s) => (
              <div className="place-sec" key={s.label} data-sec={s.label}>
                <p className="place-sec-head">{s.label}</p>
                <ul className="place-menu">
                  {s.items.map((i) => {
                    const n = countOf(i.id);
                    const on = n > 0;
                    const inOrder = on ? [...lines].reverse().find((l) => l.itemId === i.id) : undefined;
                    const picksLine = inOrder ? pickSummary(optionsFor(s.label), inOrder.picks) : "";
                    return (
                      <li key={i.id}>
                        <button
                          type="button"
                          className={`place-item${on ? " is-on" : ""}`}
                          aria-pressed={on}
                          onClick={() => openFor(i)}
                        >
                          {hasArt ? (
                            i.img ? (
                              <span className="place-thumb">
                                <img src={i.img} alt="" loading="lazy" decoding="async" />
                              </span>
                            ) : (
                              <span className="place-thumb is-empty" aria-hidden="true" />
                            )
                          ) : null}
                          <span className="place-item-text">
                            <b>{i.name}</b>
                            {/* ALWAYS RENDERED, even empty. Only 31 of these 57
                                items carry a description, and omitting the span
                                for the other 26 made one section render rows at
                                three different heights. The storefront's own
                                device: emit a zero-width space so the 1.5rem
                                box is reserved either way and the list reads as
                                a list rather than a pile. The character is
                                invisible and announces nothing. */}
                            {picksLine ? (
                              <span className="place-picks">{picksLine}</span>
                            ) : (
                              <span>{i.desc || "\u200b"}</span>
                            )}
                          </span>
                          {/* Menu price only, at every venue, always. The 15%
                              exists in exactly one place on this page — attached
                              to a named basket of named food — so no menu can
                              ever become a discount claim about a drink. */}
                          <span className="place-item-price tnum">
                            {money(Math.round(i.price * 100))}
                          </span>
                          {n > 1 ? <span className="place-count tnum" aria-hidden="true">{n}</span> : null}
                          <span className="place-tick" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                              <path
                                d={on ? "m6 12.5 4 4 8-8.5" : "M12 6v12M6 12h12"}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <p className="t-compact app-note">Part of the menu, at venue prices.</p>
          </section>
        ) : null}

      {/* SWEETOPIA GETS THE ORDERING LINE FIRST, and the order of these two
          blocks is the whole fix. All three benefits are defined as automatic
          ON A TAPIN ORDER — there is no mechanism anywhere in this product by
          which a 15% reaches a member at a venue she cannot order from. So
          "Always on here · Automatic" printed above "ordering is not in the
          app" sells a capability that does not exist. Ordering leads, the
          benefits follow in the future tense they actually hold, and the word
          "Automatic" — which answers "do I have to do anything?", a question
          she cannot ask yet — comes off. */}
      {venue.plus && !orderable ? (
        <section className="app-sec">
          <h2 className="t-caption">Ordering</h2>
          <p className="t-compact app-note">
            {venue.name} is on your membership. TapIn does not have its menu.
          </p>
        </section>
      ) : null}

      {/* What is on here. Label AND detail on every row — the bare-label shape
          AppHome uses would put "15% off" over a venue categorised "Drinks"
          with nothing qualifying it, which is the claim-by-layout §10 forbids
          and the exact mistake this build already made once on the pitch. The
          exclusion sentence sits ABOVE the rows for the same reason.
          The caption also defines PLUS where the badge actually is. It used to
          be explained only in the non-Plus arm — so the definition rendered on
          the one page with no badge on it, and the five pages wearing the badge
          carried nothing that said what it meant. */}
      {venue.plus ? (
        <section className="app-sec">
          <h2 className="t-caption">
            {orderable ? "Always on, because this is a TapIn Plus place" : "When ordering opens"}
          </h2>
          <p className="t-compact app-note place-lede">{ALCOHOL_NOTE}</p>
          <ul className="app-list">
            {benefits.map((b) => (
              <li key={b.id}>
                <span className="app-glyph">
                  <BenefitIcon id={b.id} />
                </span>
                <div className="app-row-text">
                  <b>{b.label}</b>
                  <span>{b.detail}</span>
                </div>
                {orderable ? <span className="app-state">Automatic</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="app-sec">
          <h2 className="t-caption">Offers here</h2>
          <ul className="app-list">
            {offer ? (
              <li>
                <span className="app-glyph">
                  <BenefitIcon id="percent" />
                </span>
                <div className="app-row-text">
                  <b>{offer.label}</b>
                  <span>{offer.detail}</span>
                </div>
                <span className="app-state">Members only</span>
              </li>
            ) : null}
          </ul>
          {/* Absence of the Plus badge is the signal (§6) — but a reader who has
              never used TapIn cannot read an absence, so the badge gets its
              meaning here, in the pitch's own words. */}
          <p className="t-compact app-note">{BADGE_NOTE}</p>
        </section>
      )}

      {/* A PLUS VENUE CAN CARRY AN OFFER, and until Sam confirmed Olaika's on
          13 Sep 2026 nothing in this build had ever had to render one. It gets
          its own section rather than a fourth row in the block above, because
          the two are different in the way that matters most on this page: the
          three standing benefits say "Automatic" and are already priced into
          the ticket; an offer says "Members only", is something she adds, and is
          NOT in the ticket. Merged into one list, the state chips would be the
          only thing distinguishing them — 60px of grey text carrying the whole
          distinction. Separated, the section heading carries it.

          The deck's line for this scene has always been "Partners run their own,
          on top of the three standing benefits". This is the first surface where
          that sentence has something to point at. */}
      {venue.plus && offer ? (
        <section className="app-sec">
          <h2 className="t-caption">Offers here</h2>
          <ul className="app-list">
            <li>
              <span className="app-glyph">
                <BenefitIcon id="percent" />
              </span>
              <div className="app-row-text">
                <b>{offer.label}</b>
                <span>{offer.detail}</span>
              </div>
              <span className="app-state">Members only</span>
            </li>
          </ul>
          <p className="t-compact app-note">
            Run by {venue.name}, on top of the three above.
          </p>
        </section>
      ) : null}
        </div>
      </div>

      {/* The running total, only while the ticket is off-screen and only when
          there is one. aria-hidden: the ticket itself is the live region, and
          announcing the same figures twice on every tap is worse than not
          announcing them. */}
      {orderable && ticketOff && units > 0 ? (
        <button
          type="button"
          className="place-mini"
          onClick={() => ticketRef.current?.scrollIntoView({ block: "start" })}
        >
          <span className="place-mini-n">
            {units} {units === 1 ? "item" : "items"}
          </span>
          <span className="place-mini-figs" aria-hidden="true">
            {q.using === "percent" && q.offCents > 0 ? (
              <b className="tnum app-was">{money(listCents)}</b>
            ) : null}
            <b className="tnum">{money(payCents)}</b>
          </span>
        </button>
      ) : null}

      {/* Sam asked for this explicitly. It states no price: §4's rule travels
          with the string rather than the surface — the first payment is never
          stated without what follows it, in the same sentence — and a button
          cannot hold that sentence. Same bytes as the control on / and on
          /reserve, because one purchase should not have three names. It does
          not name the venue: the membership is one membership across six places,
          and a real business's name on a control that takes money asserts an
          endorsement that business never gave. */}
      <div className="app-cta">
        <Link className="action" to={cta.to}>
          {cta.label}
        </Link>
      </div>
    {sheet ? (
        <ItemSheet
          key={sheet.line?.key ?? `new-${sheet.item.id}`}
          item={sheet.item}
          groups={groupsFor(sheet.item)}
          door={isDoorItem(sheet.item.id)}
          line={sheet.line}
          onSave={saveSheet}
          onRemove={removeSheet}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </>
  );
}
