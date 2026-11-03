import { useEffect, useLayoutEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, type Location } from "react-router-dom";
import Shell from "./shell/Shell";
import ReserveLayer from "./shell/ReserveLayer";
import Arrival from "./shell/Arrival";
import { useEventTracking } from "./context/event_tracking_context";
import Simple from "./routes/Simple";
import Reserve from "./routes/Reserve";
import { EARLY_ACCESS_CLOSED } from "./model/closed";
import PlusHome from "./routes/PlusHome";
import Members from "./routes/Members";
import { asset } from "./asset";
import { campaignHeroShot } from "./model/campaign";

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
  const { track } = useEventTracking();
  useEffect(() => {
    track("$pageview", { $current_url: window.location.href, path: location.pathname });
  }, [location.pathname, track]);
  /* THE APP PREVIEW IS GONE (Sam, 20 Sep 2026). Tapping a merchant opens that
     merchant's benefits over the page and points at their LIVE TapIn ordering
     page instead — shell/VenuePopup.tsx. The preview mocked a product that does
     not open until Spring 2027; the six merchant pages are real today, which is
     the stronger thing to show. */
  /* Early access is closed (model/closed.ts): no checkout layer, and the
     route below sends /reserve home, where the page says where to go. */
  const isReserve = !EARLY_ACCESS_CLOSED && location.pathname === "/reserve";

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
  const layered = isReserve;
  const background = (location.state as { background?: Location } | null)?.background;
  const under: Location | string = layered ? (background ?? "/") : location;

  /* The page beneath is scenery while the window is open: no wheel-scroll
     through the scrim (`overflow:hidden` keeps the scroll offset), and no focus
     or click reaches it (`inert`). Layout effect so the first painted frame of
     the layer already has both. */
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("is-layered", layered);
    document.querySelector("main.column")?.toggleAttribute("inert", layered);
  }, [layered]);

  return (
    <>
      <Routes location={under}>
        {/* THE HOME PAGE IN THE APP'S OWN LOOK (Sam, 3 Nov 2026). Outside
            the shell: it paints the app's light ground edge to edge. */}
        <Route path="/" element={<PlusHome />} />
        <Route path="/coffeeholics" element={<PlusHome placeId="coffeeholicsva" bandSrc={asset(campaignHeroShot)} />} />
        <Route path="/in" element={<Members />} />
        <Route element={<Shell layered={layered} />}>
          {/* THE HOME PAGE IS THE 5TH-GRADE PAGE (Sam, 30 Sep 2026: "it should
              replace plus.tapin.app, not be plus.tapin.app/simple"; §88). The
              pitch it replaced stays at /pitch, and /simple, already shared,
              comes here. */}
          {/* The page before the 3 Nov redesign, kept for comparison. */}
          <Route path="/classic" element={<Simple />} />
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

          <Route
            path="/reserve"
            element={EARLY_ACCESS_CLOSED ? <Navigate to="/" replace /> : <Reserve />}
          />
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
      {isReserve ? (
        <ReserveLayer background={background}>
          <Reserve />
        </ReserveLayer>
      ) : null}
      {arrive ? <Arrival /> : null}
    </>
  );
}
