import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { BenefitIcon, CoverIcon } from "../../shell/Icons";
import { benefits, offers, venues, heroIsBright, reserveCta, eventsNote } from "../../model/content";
import { sectionsFor, type MenuItem } from "../../model/menu";
import {
  quote,
  money,
  SEED,
  CREDIT_CENTS,
  CREDIT_MIN_CENTS,
  POINTS_PER_DOLLAR,
  whole,
} from "../../model/order";
import { venuePoints } from "./appBits";
import { BENEFIT } from "../../model/savings";
import { brandTheme } from "./brandTheme";
import PlusFlag from "../../shell/PlusFlag";

const ALCOHOL_NOTE = "The 15% skips alcohol; points and credit still earn on it.";
/**
 * NAMES THE THREE, because this is the one page that lists none of them.
 * A reader who came straight to Italiano's from Home has never seen them, and
 * asking "which three?" on the page that cannot answer is worse than three
 * extra words.
 */
const BADGE_NOTE =
  "TapIn Plus places carry 15% off, $5 credit and 2× points. Italiano’s runs its own one-time offers.";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * One merchant, inside the app preview — AS THE MERCHANT'S OWN PAGE.
 *
 * Sam, 14 Sep 2026: "I really want to make sure that students actually fully
 * understand what they're looking at. The thinking is that it should look
 * basically like a modified version of the real merchant pages."
 *
 * So this page takes the storefront's anatomy (tapin.app/<id>, read from the
 * live Coffeeholics page and from ~/desktop-ui V3.1) slot for slot, and puts
 * the membership into the slots the real page already has:
 *
 *   storefront                          here
 *   ─────────────────────────────────── ──────────────────────────────────────
 *   full-bleed hero, round logo, OPEN   the same, from the same files
 *   brand-colour ground, brand cards    the same, from venues.json brandColor
 *   name · Follow · pin line            name · PLUS · pin line (no fake Follow)
 *   Menu / Rewards / Bundles chips      Menu / My Spot / Offers — real anchors
 *   Highlights slider                   what the membership does HERE, on the
 *                                       merchant's own photographs
 *   My Spot (bundles/tickets/items)     My Spot (credit / points / tickets)
 *   Order: search, categories, cards    Order: categories, the same cards,
 *                                       the + that builds the demo ticket
 *   Order Now                           the running total, and the one action
 *
 * WHY THIS PAGE IS INTERACTIVE WHEN THE OTHER FOUR ARE NOT. The preview's rule
 * is a defect definition, not a ban on controls: "a control that looks tappable
 * but does nothing". A menu card that adds its dish to the ticket does exactly
 * what it appears to do — the effect completes on this page, immediately, and
 * is reversible. What stays forbidden is any control naming an effect OUTSIDE
 * this page: no Pay, no Order Now, no Follow, no Save. She assembles a real
 * basket of real dishes at real prices and watches the member price assemble
 * with it; what she cannot do is buy it, because the app does not open until
 * Spring 2027 and the bar above says so.
 *
 * THE THREE VENUE STATES ARE NOT THREE TEMPLATES. One page reads the venue
 * record and renders what is true of it:
 *   plus + menu            Coffeeholics, The Burg, Olaika, The Milk Parlor
 *   plus + no menu         Sweetopia — the joined-but-not-orderable state
 *   not plus + menu        Italiano's — its own one-time offer, no standing
 *                          benefits, because it carries none
 * Nothing is greyed, struck or captioned "not available here" (§6).
 */
export default function AppPlace() {
  const { venueId } = useParams();
  const venue = venues.find((v) => v.id === venueId);

  const sections = useMemo(() => (venue ? sectionsFor(venue.id) : []), [venue]);

  /**
   * SEEDED WITH ONE ITEM, UNDER $10. Empty, the whole ticket is dead and she
   * has to guess what the page is for. Full and over the threshold, both
   * transitions worth having are already spent. One cheap item populates the
   * ticket and leaves her next tap to cross $10 — the moment the credit stops
   * being a rule and starts being an amount. Local to this page; a basket that
   * followed her between venues would imply an account (§9).
   */
  const [picked, setPicked] = useState<string[]>(() => {
    if (!venue) return [];
    const seedName = SEED[venue.id];
    const all = sectionsFor(venue.id).flatMap((s) => s.items);
    const seed = all.find((i) => i.name === seedName);
    return seed ? [seed.id] : [];
  });

  /**
   * THE TOTAL FOLLOWS HER INTO THE MENU. Measured: the ticket and the item
   * that crosses $10 are co-visible for 4.7% of this page's scroll range, so
   * one line pins the running figures once the ticket scrolls away. Tapping it
   * returns to the ticket, which is all it claims to do.
   */
  const ticketRef = useRef<HTMLElement | null>(null);
  const [ticketOff, setTicketOff] = useState(false);
  useEffect(() => {
    const el = ticketRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setTicketOff(!e.isIntersecting), {
      rootMargin: "-60px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!venue) return <Navigate to="/app" replace />;

  const byId = new Map<string, MenuItem>(
    sections.flatMap((s) => s.items).map((i) => [i.id, i]),
  );
  const chosen = picked.map((id) => byId.get(id)).filter(Boolean) as MenuItem[];
  const bal = venuePoints.find((p) => p.venueId === venue.id);
  const offer = offers.find((o) => o.venueId === venue.id);
  // Her credit at THIS venue is spent on THIS ticket (§5, "later orders spend
  // it"). A balance printed above a total that ignores it is the page's worst
  // possible moment for a reader on a budget.
  const q = quote(venue, chosen, Math.round((bal?.creditUsd ?? 0) * 100));

  const orderable = sections.length > 0;
  /** Sweetopia's menu has no photography at all — its rows are typographic. */
  const hasArt = sections.some((sec) => sec.items.some((i) => i.img));
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const theme = brandTheme(venue.brandColor);

  /* THE HIGHLIGHTS: what the membership does here, on this merchant's own
     photographs. The storefront's slider carries the venue's promotions; ours
     carries the three standing benefits (Plus venues) and the venue's own
     offer, each on a dish from its menu — the first pictured items, in menu
     order, so nothing is picked to flatter. A venue with no photographs (or no
     menu) shows its hero. */
  const shots = sections.flatMap((s) => s.items).filter((i) => i.img).map((i) => i.img!);
  const pic = (k: number) => shots[k % Math.max(1, shots.length)] ?? venue.hero;
  const highlights: { id: string; title: string; sub: string; img: string }[] = [
    ...(venue.plus
      ? benefits.map((b, k) => ({ id: b.id, title: b.label, sub: b.detail, img: pic(k) }))
      : []),
    ...(offer
      ? [{ id: offer.id, title: offer.label, sub: `${offer.detail} · run by ${venue.name}`, img: pic(3) }]
      : []),
  ];

  return (
    <div className="pl-page" data-mode={theme.mode} style={theme.style as React.CSSProperties}>
      {/* ══ THE HERO, THE STOREFRONT'S WAY ═══════════════════════════════════
          Full bleed, the merchant's photograph, the round mark overlapping its
          foot with the OPEN pill under it — the exact composition a customer
          already sees at tapin.app/<id>. The brand ground begins where the
          photograph ends. */}
      <div className="pl-hero">
        <img
          src={venue.hero}
          alt=""
          decoding="async"
          data-bright={heroIsBright(venue.id) ? "true" : undefined}
        />
        <span className="pl-logo">
          <img src={venue.logo} alt="" decoding="async" />
        </span>
        {/* Only when the record says so. No "closed", no hours: neither is in
            the data, and a wrong hour at a real business is a §10 claim. */}
        {venue.open ? (
          <span className="pl-open">
            <i aria-hidden="true" />
            Open
          </span>
        ) : null}
      </div>

      <div className="pl-body">
        <div className="pl-main-a">
          <div className="pl-id">
            <h1 className="pl-name">
              {venue.name}
              {venue.plus ? <PlusFlag className="plus" /> : null}
            </h1>
            <p className="pl-where">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" />
                <circle cx="12" cy="11" r="2.2" />
              </svg>
              {venue.street} · Blacksburg, Virginia
            </p>

            {/* The storefront's action row. Every chip here goes somewhere on
                this page — they are anchors, which is a control that does what
                it says. The live address is the last chip: the one control in
                the preview that leaves it, and it says the address so the
                proof is the label (Sam, 13 Sep 2026). */}
            <nav className="pl-chips" aria-label="On this page">
              {orderable ? (
                <a className="pl-chip" href="#pl-order">
                  <CoverIcon id="food" />
                  Menu
                </a>
              ) : null}
              <a className="pl-chip" href="#pl-spot">
                <BenefitIcon id="points" />
                My Spot
              </a>
              {highlights.length ? (
                <a className="pl-chip" href="#pl-high">
                  <BenefitIcon id="percent" />
                  Offers
                </a>
              ) : null}
              {venue.liveUrl ? (
                <a
                  className="pl-chip is-live"
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
              ) : null}
            </nav>
            {venue.liveUrl ? (
              /* Sam's claim, recorded as his: points and credit earned at the
                 two live pages today carry into the membership. Said once. */
              <p className="pl-live-note">
                Open now, not a preview. Points and credit you earn there today
                carry into your membership.
              </p>
            ) : null}
          </div>

          {/* ══ HIGHLIGHTS ═══════════════════════════════════════════════════
              The storefront's slider slot, holding what the membership does at
              THIS place. Photograph, headline, condition — the condition on the
              card, in the card's own type, because "15% off" over a venue
              categorised Drinks with nothing qualifying it is the claim-by-
              layout §10 forbids. */}
          {highlights.length ? (
            <section className="pl-sec" id="pl-high">
              <h2 className="pl-h2">
                {venue.plus ? "Your membership here" : "Offers here"}
              </h2>
              <ul className="pl-high">
                {highlights.map((h) => (
                  <li className="pl-high-card" key={h.id}>
                    <img src={h.img} alt="" loading="lazy" decoding="async" />
                    <span className="pl-high-text">
                      <b>{h.title}</b>
                      <span>{h.sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="pl-note">{venue.plus ? ALCOHOL_NOTE : BADGE_NOTE}</p>
            </section>
          ) : null}

          {/* ══ MY SPOT ══════════════════════════════════════════════════════
              The storefront's panel, three cells and a rule — but the cells
              are the membership's: what she holds here, and where the events
              line lives (Sam, 14 Sep 2026: "less of an emphasis, but include
              something like that somewhere"). State, not controls: no chevron
              promises a page that does not exist. */}
          {venue.plus ? (
            <section className="pl-sec" id="pl-spot">
              <h2 className="pl-h2">My Spot</h2>
              <div className="pl-spot">
                <div className="pl-cell">
                  <BenefitIcon id="credit" />
                  <b>Credit</b>
                  <span>
                    {/* The week's credit is a benefit she USES on a $10+
                        order, one of two (Sam, 15 Sep 2026) — not a balance
                        that piles up. So the cell states the week's figure,
                        never a running total. */}
                    <em className="tnum">{money(CREDIT_CENTS)}</em> this week &middot; on a{" "}
                    {whole(CREDIT_MIN_CENTS)}+ order
                  </span>
                </div>
                <div className="pl-cell">
                  <BenefitIcon id="points" />
                  <b>Points</b>
                  <span>
                    {bal ? (
                      <>
                        <em className="tnum">{bal.points.toLocaleString()}</em> here
                      </>
                    ) : (
                      <>{POINTS_PER_DOLLAR} a dollar</>
                    )}
                  </span>
                </div>
                <div className="pl-cell">
                  <CoverIcon id="tickets" />
                  <b>Tickets</b>
                  <span>Member prices</span>
                </div>
              </div>
              <p className="pl-note">{eventsNote}</p>
            </section>
          ) : null}

          {venue.plus && !orderable ? (
            /* The joined-but-not-orderable state, said before any benefit is
               promised on an order she cannot place here. */
            <section className="pl-sec">
              <h2 className="pl-h2">Ordering</h2>
              <p className="pl-note is-lead">
                {venue.name} is on your membership. TapIn does not have its menu yet.
              </p>
            </section>
          ) : null}
        </div>

        {orderable ? (
          <div className="pl-side">
            {/* THE TICKET. The one thing no other screen has — a real order at
                real prices with the member price assembling under it. Announced
                politely: the figure changes when she taps something 400px
                further down. */}
            <section className="app-sec place-ticket" aria-live="polite" ref={ticketRef}>
              <h2 className="t-caption">Your order</h2>

              {chosen.length === 0 ? (
                <>
                  <p className="t-compact app-note">Tap anything below to start one.</p>
                  {venue.plus ? (
                    <ul className="place-earns">
                      <li className="place-earns-head">Every order here</li>
                      <li>
                        <b>{Math.round(BENEFIT.percentOff * 100)}% off</b>, or{" "}
                        <b className="tnum">{money(CREDIT_CENTS)}</b> credit once a week on a{" "}
                        {whole(CREDIT_MIN_CENTS)}+ order &mdash; one of the two
                      </li>
                      <li>
                        <b>{POINTS_PER_DOLLAR}</b> points a dollar, on everything
                      </li>
                    </ul>
                  ) : null}
                </>
              ) : (
                <>
                  <ul className="app-items place-lines">
                    {chosen.map((i) => (
                      <li key={i.id}>
                        <span>{i.name}</span>
                        <b className="tnum">{money(Math.round(i.price * 100))}</b>
                      </li>
                    ))}
                  </ul>

                  {/* ══ ONE BENEFIT ON THE TICKET, NAMED ═══════════════════
                      Sam, 15 Sep 2026: "you'd only be able to use one of the
                      two benefits ($5 credit on $10 spend or the 15% off), but
                      you can earn points on everything." The row above the
                      total says WHICH one this basket is priced with, and the
                      swap row under it says what the other would have been —
                      so a reader sees a choice, never a stack. See quote(). */}
                  {q.using !== "none" ? (
                    <p className="app-paid place-credit">
                      <span>
                        {q.using === "credit"
                          ? "This week\u2019s credit"
                          : `${q.offPercent}% off`}
                      </span>
                      <b className="tnum">
                        &minus;{money(q.using === "credit" ? q.creditSpentCents : q.offCents)}
                      </b>
                    </p>
                  ) : null}
                  <p className="app-paid place-pay">
                    <span>You pay</span>
                    <span className="app-paid-figs">
                      {q.using !== "none" ? (
                        <b className="tnum app-was">{money(q.subtotalCents)}</b>
                      ) : null}
                      <b className="tnum">{money(q.dueCents)}</b>
                    </span>
                  </p>

                  {/* The road not taken, under the price it would have changed.
                      Reversible by construction: remove an item, drop under
                      $10, and the sentence goes back to stating the rule. */}
                  {q.using !== "none" ? (
                    <p key={q.using} className="t-compact app-note place-alt place-earn-swap">
                      {q.using === "credit" ? (
                        <>
                          Instead of {q.offPercent}% off (
                          <b className="tnum">{money(q.altCents)}</b>). One of the two per order.
                        </>
                      ) : (
                        <>
                          Or this week&rsquo;s <b className="tnum">{money(CREDIT_CENTS)}</b> credit
                          instead, on a {whole(CREDIT_MIN_CENTS)}+ order. One of the two per order.
                        </>
                      )}
                    </p>
                  ) : null}

                  {q.standing ? (
                    <ul className="place-earns">
                      <li className="place-earns-head">And you earn</li>
                      <li>
                        <b className="tnum">{q.points.toLocaleString()}</b> points &middot; on
                        everything
                      </li>
                    </ul>
                  ) : null}

                  {offer ? (
                    <p className="t-compact app-note place-offer">
                      {offer.label} available here — {offer.detail.toLowerCase()}.
                    </p>
                  ) : null}
                </>
              )}
            </section>
          </div>
        ) : null}

        <div className="pl-main-b">
          {orderable ? (
            /* ══ ORDER ═══════════════════════════════════════════════════════
                The storefront's menu, as the storefront draws it: a category
                row, uppercase section heads, one card per dish with the
                photograph lifted off the card and a round + at the right. The
                + adds the dish to the ticket above — the one thing here that
                completes on this page. Menu prices only, at every venue,
                always: the 15% exists in exactly one place, attached to a
                named basket, so no card can become a discount claim about a
                drink. */
            <section className="pl-sec" id="pl-order">
              <h2 className="pl-h2">Order</h2>
              {sections.length > 1 ? (
                <nav className="pl-cats" aria-label="Menu sections">
                  {sections.map((s) => (
                    <a className="pl-cat" href={`#sec-${slug(s.label)}`} key={s.label}>
                      {s.label}
                    </a>
                  ))}
                </nav>
              ) : null}
              {sections.map((s) => (
                <div className="place-sec" key={s.label} id={`sec-${slug(s.label)}`}>
                  <h3 className="place-sec-head">{s.label}</h3>
                  <ul className="place-menu">
                    {s.items.map((i) => {
                      const on = picked.includes(i.id);
                      return (
                        <li key={i.id}>
                          <button
                            type="button"
                            className={`place-item${on ? " is-on" : ""}`}
                            aria-pressed={on}
                            onClick={() => toggle(i.id)}
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
                              {/* Always rendered, even empty: a zero-width space
                                  reserves the line so every card is one height —
                                  the storefront's own device. */}
                              <span>{i.desc || "​"}</span>
                              <span className="place-item-price tnum">
                                {money(Math.round(i.price * 100))}
                              </span>
                            </span>
                            <span className="place-tick" aria-hidden="true">
                              <svg viewBox="0 0 24 24">
                                <path
                                  d={on ? "m6 12.5 4 4 8-8.5" : "M12 6v12M6 12h12"}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
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
              <p className="pl-note">Part of the menu, at venue prices.</p>
            </section>
          ) : null}
        </div>
      </div>

      {/* The running total, only while the ticket is off-screen. */}
      {orderable && ticketOff && chosen.length > 0 ? (
        <button
          type="button"
          className="place-mini"
          onClick={() => ticketRef.current?.scrollIntoView({ block: "start" })}
        >
          <span className="place-mini-n">
            {chosen.length} {chosen.length === 1 ? "item" : "items"}
          </span>
          <span className="place-mini-figs" aria-hidden="true">
            {q.using !== "none" ? (
              <b className="tnum app-was">{money(q.subtotalCents)}</b>
            ) : null}
            <b className="tnum">{money(q.dueCents)}</b>
          </span>
        </button>
      ) : null}

      {/* The one action. Same bytes as the control on / and /reserve; it does
          not name the venue — a real business's name on a control that takes
          money asserts an endorsement that business never gave. */}
      <div className="app-cta">
        <Link className="action" to="/reserve">
          {reserveCta}
        </Link>
      </div>
    </div>
  );
}
