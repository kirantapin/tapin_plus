import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { asset } from "../asset";
import { useEventTracking } from "../context/event_tracking_context";
import { useAuth } from "../context/auth_context";
import { supabase } from "../supabase";
import { openPlusSignIn } from "../shell/PlusCheckout";
import { cancelGiftedPlus, revokeGift } from "../model/giftApi";
import { AppCard } from "../shell/GetTheApp";
import { GLYPHS, Glyph } from "./parents_kit";

/* ══ THE PARENT'S ACCOUNT PAGE (/parents/account; Sam, 6 Nov 2026: "add a
   member login at the top right ... That takes parents to a page where they
   can manage their subscription for their kid") ════════════════════════════
   Signed in, the gifts they've sent (the gifts table, which a payer reads by
   RLS) and, for each one claimed, the membership they pay for
   (ownership.payer_user_id): waiting to be claimed, on, cancelled, expired.
   Cancelling is here too (revoke_gift, manage_subscription). Signed out, the Plus
   sign-in sheet.
   In the students' Members page's look (Sam, 8 Nov 2026: "can it look
   somewhat like this"): the same band, sheet, modules and two-column frame
   (routes/Members.tsx, styles/plus-app.css .tpa-members), with the parents'
   facts and glyphs; parent-pages.css .ppa holds the few differences. */

const PAPER_MARK = asset("/brand/plus-paper-mark.svg");
const COLLAGE = asset("/collage/blacksburg.webp");
const TERMS_URL = "https://go.tapin.app/terms-and-conditions";
const PRIVACY_URL = "https://go.tapin.app/privacy-policy";
const MAIL = `mailto:support@tapin.app?subject=${encodeURIComponent("My student’s Tapin Plus")}&body=${encodeURIComponent(
  "Hi Tapin,\n\nI’d like to change / cancel my student’s Tapin Plus.\n\nMy mobile:\nMy student’s first name:\n\nThanks!",
)}`;

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ease = "cubic-bezier(.22,1,.36,1)";

const ROWS: ReadonlyArray<{ glyph: keyof typeof GLYPHS; title: string; line?: string }> = [
  { glyph: "refund", title: "Not charged until they claim it", line: "Unclaimed after 30 days, it expires." },
  { glyph: "mail", title: "Cancel anytime, here", line: "A gift before it’s claimed, or their Plus after." },
  { glyph: "phone", title: "Their Plus is in the Tapin app", line: "They sign in with the number you gave us." },
];

type SentGift = {
  gift_id: string;
  recipient_first_name: string;
  recipient_phone: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  claimed_at: string | null;
  ownership_id: string | null;
};
type PaidMembership = {
  ownership_id: string;
  subscription_status: "active" | "past_due" | "canceled" | null;
  ends_at: string;
  next_period: { amount: number; starts_at: string; discounted_amount?: number } | null;
  cancellation: unknown;
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const usd = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
const masked = (phone: string) => `•••${phone.replace(/\D/g, "").slice(-4)}`;

/** One gift's status line. */
function statusOf(gift: SentGift, membership: PaidMembership | undefined): { label: string; line: string } {
  if (gift.revoked_at) return { label: "Cancelled", line: "It can’t be claimed, and nothing was charged." };
  if (!gift.claimed_at) {
    if (new Date(gift.expires_at) <= new Date()) return { label: "Expired", line: "It wasn’t claimed, so nothing was charged." };
    return { label: "Waiting to be claimed", line: `Nothing is charged until they claim it. It expires ${day(gift.expires_at)}.` };
  }
  if (!membership) return { label: "Claimed", line: `Claimed ${day(gift.claimed_at)}.` };
  if (membership.subscription_status === "canceled" || new Date(membership.ends_at) <= new Date())
    return { label: "Ended", line: `Their Plus ended ${day(membership.ends_at)}.` };
  if (membership.subscription_status === "past_due") return { label: "Payment due", line: "The last charge to your card didn’t go through." };
  if (!membership.next_period) return { label: "On, ending", line: `Their Plus ends ${day(membership.ends_at)}.` };
  const next = membership.next_period.discounted_amount ?? membership.next_period.amount;
  return { label: "On", line: `Claimed ${day(gift.claimed_at)}. Next charge ${usd(next)} on ${day(membership.next_period.starts_at)}.` };
}

export default function ParentAccount() {
  const { track } = useEventTracking();
  const { userSession, accessToken } = useAuth();
  const userId = userSession?.user?.id ?? null;
  const navigate = useNavigate();
  const page = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = "tpa";
    window.scrollTo(0, 0);
    const title = document.title;
    document.title = "Your account · Tapin Plus";
    /* Members' arrival: a fade with a very slight settle. */
    if (!still()) page.current?.animate?.([{ opacity: 0, transform: "scale(1.02)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: ease });
    return () => {
      delete root.dataset.surface;
      document.title = title;
    };
  }, []);
  const back = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = page.current;
    if (!el || still() || typeof el.animate !== "function" || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const run = el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(1.02)" }], { duration: 200, easing: "ease-in", fill: "forwards" });
    run.onfinish = () => navigate("/parents");
  };

  /* The gifts this parent sent, newest first, and the memberships they pay
     for. Only their own: RLS also lets them read gifts sent to their number. */
  const [gifts, setGifts] = useState<{ sent: SentGift[]; paid: PaidMembership[] } | "loading" | "failed">("loading");
  /* Bumped after a cancel, to read the list again. */
  const [reload, setReload] = useState(0);
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /* Cancel a gift nobody has claimed, or the membership a claimed one
     started: after a confirm, then the list again. */
  const act = async (id: string, question: string, run: (token: string) => Promise<void>, event: string) => {
    if (!accessToken || acting || !window.confirm(question)) return;
    setActing(id);
    setActionError(null);
    try {
      await run(accessToken);
      track(event);
      setReload((n) => n + 1);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActing(null);
    }
  };
  useEffect(() => {
    if (!userId) return;
    let live = true;
    setGifts("loading");
    Promise.all([
      supabase
        .from("gifts")
        .select("gift_id, recipient_first_name, recipient_phone, created_at, expires_at, revoked_at, claimed_at, ownership_id")
        .eq("payer_user_id", userId)
        .order("created_at", { ascending: false })
        .returns<SentGift[]>(),
      supabase
        .from("ownership")
        .select("ownership_id, subscription_status, ends_at, next_period, cancellation")
        .eq("payer_user_id", userId)
        .returns<PaidMembership[]>(),
    ]).then(([sent, paid]) => {
      if (!live) return;
      if (sent.error || paid.error) {
        console.error("Loading the parent's gifts failed", sent.error ?? paid.error);
        return setGifts("failed");
      }
      setGifts({ sent: sent.data ?? [], paid: paid.data ?? [] });
    });
    return () => {
      live = false;
    };
  }, [userId, reload]);

  const list =
    gifts === "loading" ? (
      <p className="tpa-price-then">Loading your gifts…</p>
    ) : gifts === "failed" ? (
      <p className="tpa-price-then">Your gifts didn’t load. Refresh to try again.</p>
    ) : gifts.sent.length === 0 ? (
      <>
        <p className="tpa-price-then">No gifts yet.</p>
        <div className="tpa-members-acts">
          <Link className="tpa-try tpa-members-mail" to="/parents">
            Send one
          </Link>
        </div>
      </>
    ) : (
      <ul className="tpa-rows">
        {gifts.sent.map((g) => {
          const membership = gifts.paid.find((m) => m.ownership_id === g.ownership_id);
          const status = statusOf(g, membership);
          /* What can still be stopped: a gift nobody has claimed, or the
             membership a claimed one started while it renews. */
          const waiting = !g.revoked_at && !g.claimed_at && new Date(g.expires_at) > new Date();
          const renewing = !!membership?.next_period && membership.subscription_status !== "canceled" && new Date(membership.ends_at) > new Date();
          return (
            <li key={g.gift_id}>
              <span className="tpa-well" aria-hidden="true">
                <Glyph d={GLYPHS.phone} className="tpa-well-mark" />
              </span>
              <span className="tnum">
                <b>
                  {g.recipient_first_name}, {masked(g.recipient_phone)} · {status.label}
                </b>
                <span>{status.line}</span>
                {waiting ? (
                  <button
                    type="button"
                    className="tpa-signin"
                    disabled={!!acting}
                    onClick={() =>
                      void act(g.gift_id, `Cancel the gift to ${g.recipient_first_name}? Nothing has been charged.`, (t) => revokeGift(g.gift_id, t), "parent_gift_revoked")
                    }
                  >
                    {acting === g.gift_id ? "Cancelling…" : "Cancel gift"}
                  </button>
                ) : renewing && membership ? (
                  <button
                    type="button"
                    className="tpa-signin"
                    disabled={!!acting}
                    onClick={() =>
                      void act(
                        membership.ownership_id,
                        `Cancel ${g.recipient_first_name}’s Tapin Plus? It stays on until the end of what you’ve paid for, and you won’t be charged again.`,
                        (t) => cancelGiftedPlus(membership.ownership_id, t),
                        "parent_gift_plus_cancelled",
                      )
                    }
                  >
                    {acting === membership.ownership_id ? "Cancelling…" : "Cancel their Plus"}
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    );

  return (
    <div ref={page} className="tpa tpa-members ppa">
      <header className="tpa-band">
        <img className="tpa-band-art" src={COLLAGE} alt="" decoding="async" />
        <div className="tpa-band-top">
          <Link className="tpa-glass tpa-signin" to="/parents" onClick={back}>
            <svg className="tpa-back" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Tapin Plus
          </Link>
        </div>
        <div className="tpa-band-title">
          <h1>Your account</h1>
        </div>
      </header>

      <main className="tpa-sheet">
        <section className="tpa-module tpa-offer tpa-members-status" aria-label="Your gifts">
          <img className="tpa-paper" src={PAPER_MARK} alt="" width="112" height="89" decoding="async" />
          {accessToken ? (
            <>
              <p className="tpa-lead">Your gifts</p>
              {list}
              {actionError ? (
                <p className="tpa-price-then" role="alert">
                  {actionError}
                </p>
              ) : null}
              <div className="tpa-members-acts">
                <a className="tpa-try tpa-members-mail" href={MAIL} onClick={() => track("parent_account_email")}>
                  Questions? Email us
                </a>
                <button type="button" className="tpa-try tpa-members-mail" onClick={() => void supabase.auth.signOut()}>
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="tpa-lead">Sent a gift? Sign in to see it.</p>
              <p className="tpa-price-then">Use the mobile number you signed in with when you sent it.</p>
              <div className="tpa-members-acts">
                <button
                  type="button"
                  className="tpa-try tpa-members-mail"
                  onClick={() => {
                    track("parent_account_signin");
                    openPlusSignIn("parent_account");
                  }}
                >
                  Sign in with your mobile
                </button>
              </div>
            </>
          )}
        </section>

        {/* The app is the student's: their Plus lives there. */}
        <section className="tpa-module tpa-members-app" aria-label="Their Plus is in the Tapin app">
          <AppCard where="parent_account" line="Their Plus is in the Tapin app. They sign in with the number you gave us." />
        </section>

        <section className="tpa-module" aria-labelledby="ppa-help">
          <h2 id="ppa-help" className="tpa-h2">
            Good to know
          </h2>
          <ul className="tpa-rows">
            {ROWS.map((r) => (
              <li key={r.glyph}>
                <span className="tpa-well" aria-hidden="true">
                  <Glyph d={GLYPHS[r.glyph]} className="tpa-well-mark" />
                </span>
                <span>
                  <b>{r.title}</b>
                  {r.line ? <span>{r.line}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="tpa-foot">
          <p className="tpa-links">
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
              Terms
            </a>
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
