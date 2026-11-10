import { useAuth } from "../context/auth_context";
import { useEventTracking } from "../context/event_tracking_context";
import { AccountCard, AccountFrame, AppPanel, InfoPanel } from "../shell/AccountPage";
import { openPlusSignIn } from "../shell/PlusCheckout";

/* ══ THE STUDENTS' ACCOUNT (/in) ════════════════════════════════════════════
   Was the presale's receipt, then "Members" in the home page's band and
   modules (3 Nov 2026). Since 9 Nov 2026 (Sam: "redesign the account page
   for both the parent page and the main page ... relatively consistent"), it
   wears the same frame as the parents' account (shell/AccountPage.tsx): the
   account card, In the app, Good to know. Plus lives in the Tapin app, so
   this page says who you are here, where to use Plus and how to reach a
   person. The offer's countdown bar went with the home page's (#256). */

const MAIL = "mailto:support@tapin.app";

const Shield = (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="m8.8 12.2 2.2 2.2 4.4-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Note = (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <rect x="5" y="3.5" width="14" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export default function Members() {
  const { subscribed, userSession } = useAuth();
  const { track } = useEventTracking();
  /* A signed-in member sees their status; ?member previews it, local dev only. */
  const member = subscribed === true || (import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("member"));
  const signedIn = !!userSession;

  const rows = [
    {
      key: "promise",
      icon: Shield,
      title: "The Plus Promise",
      line: "Save more than Plus costs each month, or get your money back. Ask for a refund and it’s auto-approved.",
    },
    /* Early-access memberships bought here are not in the app yet (Sam, 3 Nov
       2026, after talking to Kiran): on file, and who to ask. */
    ...(member || signedIn
      ? []
      : [{ key: "early", icon: Note, title: "Joined early access? You’re on file.", line: "Your membership is saved with us. Email us for anything about it." }]),
  ];

  return (
    <AccountFrame back="/" backState={{ from: "members" }} docTitle="Your account · Tapin Plus">
      {member ? (
        <AccountCard
          title="You’re a Plus member"
          status={{ tone: "good", label: "Plus is on" }}
          line="Your $5 credit, 15% off and points are in the Tapin app."
        />
      ) : signedIn && subscribed === false ? (
        <AccountCard
          title="Your account"
          line="Joined early access? You’re on file. For anything about your plan, your credit or a refund, email us below."
        />
      ) : signedIn || userSession === undefined ? (
        <AccountCard title="Your account" />
      ) : (
        <AccountCard title="Your account" line="Sign in with the mobile number you joined with.">
          <div className="acc-acts">
            <button
              type="button"
              className="acc-btn acc-btn-dark"
              onClick={() => {
                track("members_signin");
                openPlusSignIn("members");
              }}
            >
              Sign in with your mobile
            </button>
          </div>
        </AccountCard>
      )}

      <AppPanel where="members" signIn="Sign in with the number you joined with." />

      <InfoPanel rows={rows} mail={MAIL} onMail={() => track("members_email")} />
    </AccountFrame>
  );
}
