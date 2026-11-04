import { useState } from "react";
import { useAuth } from "../context/auth_context";
import { openPlusSignIn } from "./PlusCheckout";

/* ══ SIGN IN, SIGN OUT (Sam, 4 Nov 2026: "there needs to be a sign in and
   sign out option on this page (maybe at the bottom), and on the members
   page") ═══════════════════════════════════════════════════════════════════
   One quiet line in the footer. Signed out: "Already a member? Sign in",
   which opens the checkout's phone-and-code sheet in sign-in mode. Signed in:
   the number's last four and Sign out. Nothing while the session is still
   being read, so it never flashes the wrong one. */

const lastFour = (phone: string | undefined) => {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : null;
};

export default function AccountLine({ where }: { where: string }) {
  const { userSession, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  if (userSession === undefined) return null;
  if (!userSession) {
    return (
      <p className="tpa-account">
        <span>Already a member?</span>
        <button type="button" onClick={() => openPlusSignIn(where)}>
          Sign in
        </button>
      </p>
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
