import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useEventTracking } from "../context/event_tracking_context";
import { useAuth } from "../context/auth_context";
import { supabase } from "../supabase";
import { openPlusSignIn } from "../shell/PlusCheckout";
import { cancelGiftedPlus, revokeGift } from "../model/giftApi";
import { AccountCard, AccountFrame, AppPanel, InfoPanel, type Tone } from "../shell/AccountPage";
import { GLYPHS, Glyph } from "./parents_kit";

/* ══ THE PARENT'S ACCOUNT PAGE (/parents/account; Sam, 6 Nov 2026: "add a
   member login at the top right ... That takes parents to a page where they
   can manage their subscription for their kid") ════════════════════════════
   Signed in, the gifts they've sent (the gifts table, which a payer reads by
   RLS) and, for each one claimed, the membership they pay for
   (ownership.payer_user_id): waiting to be claimed, on, cancelled, expired.
   Cancelling is here too (revoke_gift, manage_subscription). Signed out, the Plus
   sign-in sheet.
   Since 9 Nov 2026 (Sam: "redesign the account page for both ... relatively
   consistent"), the same frame as the students' account (/in), from
   shell/AccountPage.tsx: the account card holds the gifts, each with its
   status chip and the one thing that can still be stopped. */

const MAIL = `mailto:support@tapin.app?subject=${encodeURIComponent("My student’s Tapin Plus")}&body=${encodeURIComponent(
  "Hi Tapin,\n\nI’d like to change / cancel my student’s Tapin Plus.\n\nMy mobile:\nMy student’s first name:\n\nThanks!",
)}`;

const ROWS: ReadonlyArray<{ glyph: keyof typeof GLYPHS; title: string; line?: string }> = [
  { glyph: "bell", title: "A text before every bill", line: "Cancel right from it, or here." },
  { glyph: "refund", title: "Didn’t save what you spent?", line: "Ask support@tapin.app for a full refund." },
  { glyph: "calendar", title: "Cancel anytime, here", line: "A gift before it’s claimed, or their Plus after." },
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

/** One gift's status: its chip (label and tone) and its line. */
function statusOf(gift: SentGift, membership: PaidMembership | undefined): { label: string; tone: Tone; line: string } {
  if (gift.revoked_at) return { label: "Cancelled", tone: "off", line: "It can’t be claimed." };
  if (!gift.claimed_at) {
    if (new Date(gift.expires_at) <= new Date()) return { label: "Expired", tone: "off", line: "It wasn’t claimed in time." };
    return { label: "Waiting", tone: "wait", line: `Not claimed yet. Their link works until ${day(gift.expires_at)}.` };
  }
  if (!membership) return { label: "Claimed", tone: "good", line: `Claimed ${day(gift.claimed_at)}.` };
  if (membership.subscription_status === "canceled" || new Date(membership.ends_at) <= new Date())
    return { label: "Ended", tone: "off", line: `Their Plus ended ${day(membership.ends_at)}.` };
  if (membership.subscription_status === "past_due") return { label: "Payment due", tone: "warn", line: "The last charge to your card didn’t go through." };
  if (!membership.next_period) return { label: "Ending", tone: "wait", line: `Their Plus ends ${day(membership.ends_at)}.` };
  const next = membership.next_period.discounted_amount ?? membership.next_period.amount;
  return { label: "Plus is on", tone: "good", line: `Claimed ${day(gift.claimed_at)}. Next charge ${usd(next)} on ${day(membership.next_period.starts_at)}.` };
}

export default function ParentAccount() {
  const { track } = useEventTracking();
  const { userSession, accessToken } = useAuth();
  const userId = userSession?.user?.id ?? null;
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
      <p className="acc-quiet">Loading your gifts…</p>
    ) : gifts === "failed" ? (
      <p className="acc-quiet" role="alert">
        Your gifts didn’t load. Refresh to try again.
      </p>
    ) : gifts.sent.length === 0 ? (
      <div className="acc-empty">
        <p className="acc-quiet">No gifts sent from this number yet.</p>
        <Link className="acc-btn acc-btn-dark" to="/parents">
          Send a gift
        </Link>
      </div>
    ) : (
      <ul className="acc-gifts">
        {gifts.sent.map((g) => {
          const membership = gifts.paid.find((m) => m.ownership_id === g.ownership_id);
          const status = statusOf(g, membership);
          /* What can still be stopped: a gift nobody has claimed, or the
             membership a claimed one started while it renews. */
          const waiting = !g.revoked_at && !g.claimed_at && new Date(g.expires_at) > new Date();
          const renewing = !!membership?.next_period && membership.subscription_status !== "canceled" && new Date(membership.ends_at) > new Date();
          return (
            <li key={g.gift_id} className="acc-gift">
              <span className="acc-avatar" aria-hidden="true">
                {g.recipient_first_name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="acc-gift-words">
                <p className="acc-gift-name">
                  <b>{g.recipient_first_name}</b>
                  <span className="tnum">{masked(g.recipient_phone)}</span>
                </p>
                <p className="acc-gift-line tnum">{status.line}</p>
                {waiting ? (
                  <button
                    type="button"
                    className="acc-btn acc-btn-quiet"
                    disabled={!!acting}
                    onClick={() =>
                      void act(g.gift_id, `Cancel the gift to ${g.recipient_first_name}? They won’t be able to claim it.`, (t) => revokeGift(g.gift_id, t), "parent_gift_revoked")
                    }
                  >
                    {acting === g.gift_id ? "Cancelling…" : "Cancel gift"}
                  </button>
                ) : renewing && membership ? (
                  <button
                    type="button"
                    className="acc-btn acc-btn-quiet"
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
              </div>
              <span className="acc-chip" data-tone={status.tone}>
                {status.label}
              </span>
            </li>
          );
        })}
      </ul>
    );

  const rows = ROWS.map((r) => ({ key: r.glyph, icon: <Glyph d={GLYPHS[r.glyph]} className="acc-glyph" />, title: r.title, line: r.line }));

  return (
    <AccountFrame back="/parents" docTitle="Your account · Tapin Plus">
      {accessToken ? (
        <AccountCard title="Your account">
          <div className="acc-gifts-head">
            <h2 className="acc-h3">Gifts you’ve sent</h2>
            {gifts !== "loading" && gifts !== "failed" && gifts.sent.length ? (
              <Link className="acc-link" to="/parents">
                Send another
              </Link>
            ) : null}
          </div>
          {list}
          {actionError ? (
            <p className="acc-quiet acc-error" role="alert">
              {actionError}
            </p>
          ) : null}
        </AccountCard>
      ) : (
        <AccountCard title="Your account" line="Sent a gift? Sign in with the mobile number you used to send it.">
          <div className="acc-acts">
            <button
              type="button"
              className="acc-btn acc-btn-dark"
              onClick={() => {
                track("parent_account_signin");
                openPlusSignIn("parent_account");
              }}
            >
              Sign in with your mobile
            </button>
          </div>
        </AccountCard>
      )}

      {/* The app is the student's: their Plus lives there. */}
      <AppPanel where="parent_account" line="Their Plus is in the Tapin app. They sign in with the number you gave us." />

      <InfoPanel rows={rows} mail={MAIL} onMail={() => track("parent_account_email")} />
    </AccountFrame>
  );
}
