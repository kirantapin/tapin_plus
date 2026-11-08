import { useState } from "react";
import { useAuth } from "../context/auth_context";
import { AppLink, AppQr, device } from "./GetTheApp";
import { openPlusSignIn } from "./PlusCheckout";

/* ══ SIGN IN, SIGN OUT (Sam, 4 Nov 2026: "there needs to be a sign in and
   sign out option on this page (maybe at the bottom), and on the members
   page") ═══════════════════════════════════════════════════════════════════
   One quiet line in the footer. Signed out: "Already a member? Sign in",
   which opens the checkout's phone-and-code sheet in sign-in mode. Signed in:
   the number's last four and Sign out. Nothing while the session is still
   being read, so it never flashes the wrong one.

   `app` (Sam, 8 Nov 2026, the student page's round 2): signed out, the line
   is "Already a member? Get the app or Sign in", a text link so Join stays
   the only button; on a computer the App Store QR sits beside it. */

const lastFour = (phone: string | undefined) => {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : null;
};

export default function AccountLine({ where, app = false }: { where: string; app?: boolean }) {
  const { userSession, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  if (userSession === undefined) return null;
  if (!userSession) {
    const signIn = (
      <button type="button" onClick={() => openPlusSignIn(where)}>
        Sign in
      </button>
    );
    if (!app) {
      return (
        <p className="tpa-account">
          <span>Already a member?</span>
          {signIn}
        </p>
      );
    }
    const desk = device() === "desktop";
    return (
      <div className="tpa-account-app">
        {desk ? <AppQr className="tpa-account-qr" /> : null}
        <div className="tpa-account-words">
          <p className="tpa-account">
            <span>Already a member?</span>
            <AppLink where={where} className="tpa-account-link" />
            <span>or</span>
            {signIn}
          </p>
          {desk ? <p className="tpa-account-scan">Scan with your iPhone’s camera to get the app</p> : null}
        </div>
      </div>
    );
  }
  const four = lastFour(userSession.user?.phone);
  return (
    <p className="tpa-account">
      <span>{four ? <>Signed in as <span className="tnum">••• {four}</span></> : "Signed in"}</span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await logout();
          setBusy(false);
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </p>
  );
}
