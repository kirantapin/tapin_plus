import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/auth_context";
import { useEventTracking } from "../context/event_tracking_context";
import { plusPageBack } from "../model/backTo";
import { device } from "../shell/GetTheApp";
import PlacePopup, { type PlacePopupPlace } from "../shell/PlacePopup";
import { openPlusSignIn } from "../shell/PlusCheckout";
import { useMedia } from "../shell/useMedia";
import { DeskGrid } from "./ClaimDesk";
import { MemberRight, Page, Questions } from "./ClaimSeat";
import { Account, Benefits, Foot, GetApp, Pass, useFour } from "./MembersPass";
import { FlatMark, PERCENT } from "./parents_kit";

/* ══ /in IN THE SPLIT (Sam, 24 Nov 2026: "now do the membership page in the
   split style") ═════════════════════════════════════════════════════════════
   The account page wears /claim's Split. A member's is the claimed page at
   rest: in the dark panel their pass (Active, their last four), You're a
   Plus member, the Tapin app (the QR on a computer, a white button on a
   phone) and who's signed in; on the right the first $5 in four steps, the
   places, what's theirs every month, the questions. Everyone else gets the
   same panel with the pass not yet theirs and, signed out, signing in with
   the number they joined with in white; on the right the app, the places,
   every month with Plus, the questions. From 1024px the panel holds the left
   while the right scrolls; on a phone it comes first. Styles: the Split's,
   in styles/members-pass.css. */

function Brand() {
  return (
    <Link className="sp-brand" to={plusPageBack()} state={{ from: "members" }}>
      <FlatMark className="sp-mark" />
      Tapin Plus Blacksburg
    </Link>
  );
}

export function MemberSplit() {
  const four = useFour();
  const { track } = useEventTracking();
  const desk = useMedia("(min-width: 1024px)");
  return (
    <Page title="Your account · Tapin Plus" className="tpa tpa-home tps cs cs-split cs-claimed mv-split">
      <div className="sp">
        <aside className="sp-left">
          <Brand />
          <div className="sp-mid">
            <div className="sp-txt cl-txt">
              <div className="cl-stage">
                <Pass active who={four ? `••• ${four}` : "Signed in"} whoLabel="Member" />
              </div>
              <div className="cl-after">
                <h1 className="sp-h">You’re a Plus member</h1>
                <p className="sp-lede">Your credit, {PERCENT}% off and points live in the Tapin app. Sign in there with the number you joined with.</p>
                <GetApp where="members_pass" tone="light" />
                <Account four={four} className="sp-acct" />
              </div>
            </div>
          </div>
          {desk ? <p className="sp-hint">Scroll for how to use it</p> : null}
        </aside>
        <MemberRight onMail={() => track("members_email")} />
      </div>
    </Page>
  );
}

export function GuestSplit() {
  const { userSession, subscribed } = useAuth();
  const four = useFour();
  const { track } = useEventTracking();
  const desk = useMedia("(min-width: 1024px)");
  const [placeOpen, setPlaceOpen] = useState<PlacePopupPlace | null>(null);
  const signedIn = !!userSession;
  const loading = userSession === undefined || (signedIn && subscribed === null);
  const signIn = () => {
    track("members_signin");
    openPlusSignIn("members");
  };
  return (
    <Page title="Your account · Tapin Plus" className="tpa tpa-home tps cs cs-split cs-claimed mv-split">
      <div className="sp">
        <aside className="sp-left">
          <Brand />
          <div className="sp-mid">
            <div className="sp-txt cl-txt">
              <div className="cl-stage">
                <Pass active={false} who={signedIn ? (four ? `••• ${four}` : "Signed in") : undefined} whoLabel="Signed in" />
              </div>
              <div className="cl-after">
                <h1 className="sp-h">Your account</h1>
                {signedIn ? (
                  loading ? null : (
                    <>
                      <p className="sp-lede">Joined early access? You’re on file. For anything about your plan, your credit or a refund, email us below.</p>
                      <Account four={four} className="sp-acct" />
                    </>
                  )
                ) : (
                  <>
                    <p className="sp-lede">Sign in with the mobile number you joined with.</p>
                    {loading ? null : (
                      <button type="button" className="sp-cta" onClick={signIn}>
                        Sign in with your mobile
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          {desk ? <p className="sp-hint">Scroll for everything Plus gets you</p> : null}
        </aside>
        <main className="sp-right">
          <section className="sp-sec" aria-labelledby="mv-app">
            <span className="sp-kick">Already a member?</span>
            <h2 id="mv-app" className="sp-h2">
              In the Tapin app
            </h2>
            {/* On a phone a light button, so signing in stays the one strong action. */}
            <GetApp where="members_guest" tone={device() === "desktop" ? "dark" : "light"} />
          </section>
          <section className="sp-sec" aria-labelledby="mv-places">
            <span className="sp-kick">8 Blacksburg spots</span>
            <h2 id="mv-places" className="sp-h2">
              Where Plus works
            </h2>
            <DeskGrid onOpen={setPlaceOpen} />
          </section>
          <section className="sp-sec" aria-labelledby="mv-month">
            <span className="sp-kick">What you get</span>
            <h2 id="mv-month" className="sp-h2">
              Every month with Plus
            </h2>
            <Benefits className="cl-ben" />
          </section>
          <Questions />
          <div className="mv cs-foot">
            <Foot onMail={() => track("members_email")} />
          </div>
        </main>
      </div>
      {placeOpen ? <PlacePopup place={placeOpen} cta="Got it" onClose={() => setPlaceOpen(null)} onJoin={() => setPlaceOpen(null)} /> : null}
    </Page>
  );
}
