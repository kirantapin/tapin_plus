import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Shell from "./shell/Shell";
import Arrival from "./shell/Arrival";
import { PlusCheckoutMount } from "./shell/PlusCheckout";
import { useEventTracking } from "./context/event_tracking_context";
import PlusHome from "./routes/PlusHome";
import { BREXX, SMITHS_LANDING, WELCOME_WEEK, type Group } from "./model/groups";
import { setPagePolicy } from "./model/pagePolicy";
import Members from "./routes/Members";
import ParentsHome from "./routes/ParentsHome";
import ParentAccount from "./routes/ParentAccount";
import GiftPage from "./routes/GiftPage";
import { asset } from "./asset";
import { campaignHeroShot } from "./model/campaign";
import { loadPlusLink } from "./model/link";
import { redactUrl } from "./model/redact";

/**
 * NO PAGE TRANSITION IS ANIMATED. In the old build a `view-transition-name`
 * snapshot turned out to be the whole scrollable page (measured 390x1762),
 * painted above the document, which covered the fixed chrome for ~5 frames
 * (355-430ms). Naming the chrome and clipping the group were both tried and
 * both failed, measured. START-HERE.md: "Either exclude chrome properly or
 * don't animate page changes." This build does not animate them.
 */
/** See the note on the place route: the key is the whole point of this. */
/** `/try` → `/`, the ad's own parameters kept (§66). It no longer opens the
 *  trial modal on arrival: PostHog (30 Sep 2026, 30 days) showed the ad
 *  sessions that landed on `?try` bouncing 89% in 3 seconds, against 0% for
 *  the same ads landing on `/`. The page loads as itself; "Try it once for
 *  free" is one tap away in the hero. `?try` on `/` still opens the modal,
 *  for anyone who wants that link on purpose. */
/** `/simple` → `/`, parameters kept: the page's old address, from before it
 *  became the home page (§88). */
function HomeLink() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/", search }} replace />;
}
/** The old landing pages and the full-page walkthrough, since the 3 Nov 2026
 *  redesign: /pitch and /welcome go home, /how goes home with the
 *  walkthrough open, every parameter kept (Sam: "redirect + rebuild"). */
function ToHome({ how = false }: { how?: boolean }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (how) params.set("how", "1");
  const rest = params.toString();
  return <Navigate to={{ pathname: "/", search: rest ? `?${rest}` : "" }} replace />;
}
function TryLink() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.delete("try");
  const rest = params.toString();
  return <Navigate to={{ pathname: "/", search: rest ? `?${rest}` : "" }} replace />;
}

export default function App() {
  const location = useLocation();

  /* ══ ONE PAGEVIEW PER ROUTE, BY HAND ═══════════════════════════════════════
     `capture_pageview` is off (see event_tracking_context). PostHog's automatic
     pageview fires once per document load, and this is one document — without
     this, `/`, `/how`, `/reserve` and `/in` would all be a single pageview and
     there would be no funnel to read.

     PATHNAME ONLY, deliberately. `/reserve` opens as a layer over the page
     beneath and carries `state.background`; keying on the whole location would
     fire a second view when nothing but that state changed. */
  const { track, registerForSession } = useEventTracking();
  useEffect(() => {
    /* Never a parent's or a student's key (model/redact.ts). */
    track("$pageview", { $current_url: redactUrl(window.location.href), path: redactUrl(location.pathname) });
  }, [location.pathname, track]);
  /* A promo link's id on every event of the session, as the app's link_id
     (model/link.ts), so each audience's funnel reads on its own. */
  useEffect(() => {
    void loadPlusLink().then((link) => link && registerForSession({ link_id: link.linkId }));
  }, [registerForSession]);
  /* THE APP PREVIEW IS GONE (Sam, 20 Sep 2026). Tapping a merchant opens that
     merchant's benefits over the page and points at their LIVE TapIn ordering
     page instead — shell/VenuePopup.tsx. The preview mocked a product that does
     not open until Spring 2027; the six merchant pages are real today, which is
     the stronger thing to show. */
  /* ══ THE ARRIVAL, ON THE DOOR ONLY ════════════════════════════════════════
     Decided once, from the path the browser LOADED on — never from where a
     route change lands. So it plays on every full load of / and /welcome
     (Sam, 15 Sep 2026: "on refresh or first load") and never on a tap back
     to the landing page from the deck. See shell/Arrival.tsx. */
  /* Not under an ad's try link (§66): the window is what it came for, and the
     arrival would play over it. */
  /* Not on / since the 3 Nov 2026 redesign: the home page opens on its
     own collage band, and the arrival would play over it. */
  /* /welcome now redirects home (3 Nov 2026), so nothing plays the arrival;
     it stays wired for the day a page wants it again. */
  const [arrive] = useState(() => false);

  return (
    <>
      <Routes>
        {/* THE HOME PAGE IN THE APP'S OWN LOOK (Sam, 3 Nov 2026). Outside
            the shell: it paints the app's light ground edge to edge. */}
        <Route path="/" element={<PlusHome />} />
        <Route path="/coffeeholics" element={<PlusHome placeId="coffeeholicsva" bandSrc={asset(campaignHeroShot)} />} />
        <Route path="/smiths-landing" element={<GroupPage group={SMITHS_LANDING} bandSrc={asset("/groups/smiths-landing.webp")} />} />
        {/* Brexx at Blacksburg (Sam, 11 Nov 2026): Sam's collage of the
            Brexx clubhouse and pool. */}
        <Route path="/brexx" element={<GroupPage group={BREXX} bandSrc={asset("/groups/brexx.webp")} />} />
        {/* Welcome Week's flash sale (Sam, 11 Nov 2026): $2.99 a month for
            life until the end of today, on the Blacksburg collage. */}
        <Route path="/welcome-week" element={<GroupPage group={WELCOME_WEEK} />} />
        <Route path="/in" element={<Members />} />
        {/* THE PARENTS FLOW (Sam, 5 Nov 2026; wired to the gift backend, 8 Nov
            2026): the parents' landing page, where a parent sends Plus as a
            gift, and their account, signed in. Outside the shell, in the
            app's own look. The old manage-by-link addresses go to the
            account. */}
        <Route path="/parents" element={<ParentsHome />} />
        <Route path="/parents/manage/:token" element={<Navigate to="/parents/account" replace />} />
        <Route path="/parents/manage" element={<Navigate to="/parents/account" replace />} />
        <Route path="/parents/account" element={<ParentAccount />} />
        {/* THE GIFT PAGE (Sam, 6 Nov 2026): what a student opens from their
            text, by the gift's id (routes/GiftPage.tsx), and claims.
            /gift/sample is the sample; /gift is where it sits once its id
            is out of the address. */}
        <Route path="/gift/:token" element={<GiftPage />} />
        <Route path="/gift" element={<GiftPage />} />
        <Route element={<Shell />}>
          {/* The page before the 3 Nov redesign went with the Early Access
              checkout it sold through (3 Nov 2026). */}
          <Route path="/classic" element={<ToHome />} />
          <Route path="/pitch" element={<ToHome />} />
          <Route path="/simple" element={<HomeLink />} />
          {/* The Welcome Week text's link — the pitch, as an invitation. model/invite.ts */}
          <Route path="/welcome" element={<ToHome />} />
          <Route path="/how" element={<ToHome how />} />
          {/* ══ THE CAMPAIGN SPLASH ══════════════════════════════════════
              One venue, for one Meta advert. Sam, 20 Sep 2026: "Should be a
              separate URL, like plus.tapin.app/blacksburg/coffeeholics." The
              app is served under BASE_URL "/blacksburg/", so this route IS
              that path, and vercel.json's "/blacksburg/:path*" rewrite
              already hands it to index.html. The host is a DNS matter. */}

          {/* Early Access's checkout, closed 1 Nov 2026: Join opens the
              Plus checkout on the home page now. */}
          <Route path="/reserve" element={<Navigate to="/" replace />} />
          {/* /in — the membership after it has been bought. PRODUCT.md names
              this route as "sign-in and the receipt". */}

          {/* THE PREVIEW'S OLD ADDRESSES. /app and everything under it were
              real routes until 20 Sep 2026, so they are in browser histories,
              in shared links and in anyone's muscle memory. Left unhandled
              they render a blank page; they send you home instead. */}
          <Route path="/app/*" element={<Navigate to="/" replace />} />
          {/* The ad link (§66): the pitch with the try-it-once window open,
              keeping whatever the ad appended (utm_*, fbclid). */}
          <Route path="/try" element={<TryLink />} />
        </Route>
      </Routes>
      <PlusCheckoutMount />
      {arrive ? <Arrival /> : null}
    </>
  );
}

/* A group's page carries its promo link (model/groups.ts) in the address, so
   the price, the checkout and analytics all apply it as they would any ?l=
   link. Put there before the page's first render reads it. */
function GroupPage({ group, bandSrc }: { group: Group; bandSrc?: string }) {
  useState(() => {
    /* Or its own public policy, with no link (model/pagePolicy.ts). */
    if (group.policyId && typeof window !== "undefined") setPagePolicy(group.policyId, group.endsMs ?? null);
    if (!group.linkId || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("l")) return;
    url.searchParams.set("l", group.linkId);
    window.history.replaceState(window.history.state, "", url);
  });
  return <PlusHome group={group} bandSrc={bandSrc} />;
}
