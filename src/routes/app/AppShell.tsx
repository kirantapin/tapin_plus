import { useContext, useLayoutEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useMatch } from "react-router-dom";
import { LayerContext } from "../../shell/AppLayer";
import { NavIcon } from "../../shell/Icons";
import { launchWindow } from "../../model/content";

/**
 * The locked app preview.
 *
 * A prospect can walk the whole app before paying anything, and it stays locked
 * afterwards too — because it is not live until Spring 2027. That is the point:
 * she sees exactly what she is buying, and nothing pretends to work.
 *
 * "Controls that look tappable but do nothing" is a named defect, so nothing
 * here is a fake control. The bar at the top says what this is on every screen,
 * and anything that would act in the real app is rendered as state rather than
 * as a button.
 *
 * FOUR TABS, and TRUTH.md §9 says three (Home · Places · You, "no fourth
 * item"). Sam named four destinations — Home, Deals, My Spot, Points — so this
 * supersedes that rule. Flagging rather than quietly breaking it.
 */
const TABS = [
  { to: "/app", id: "home", label: "Home", end: true },
  { to: "/app/deals", id: "deals", label: "Deals" },
  { to: "/app/spot", id: "spot", label: "My Spot" },
  { to: "/app/points", id: "points", label: "Points" },
];

export default function AppShell() {
  const onPlace = useMatch("/app/place/:venueId") !== null;
  /* WHICH SCREEN, as an attribute the stylesheet can read.
     Desktop gave every screen one 720px column, which is a phone layout in a
     wider frame — the five screens hold five different shapes (an object plus
     two figures; two lists; a pair of tickets; five trade cards; a menu beside
     a bill) and they do not all want the same measure. Rather than widen them
     all at once and leave four of them sparse, each screen declares its own
     desktop layout here and the ones that have not been redesigned yet keep
     the 720 they already look right at. */
  const { pathname, state } = useLocation();
  /* EVERY APP SCREEN OPENS AT ITS TOP. Sam, 15 Sep 2026: "when I preview a
     location it's scrolled halfway through again." A route change inside a
     single page keeps the scroll offset the last screen left, so a venue page
     reached from the bottom of Home opened on its menu. Both scrollers, since
     the desktop window scrolls its own `.app-scroll`, and a layout effect so
     the first painted frame is already at the top. */
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>(".app-scroll")?.scrollTo(0, 0);
  }, [pathname]);
  /* Non-null only inside the desktop window. Every link that stays in the app
     forwards `state`, so `state.background` — the page under the window —
     survives tapping through to a venue and back. Drop it and the page behind
     the scrim would switch to the pitch mid-visit. */
  const layer = useContext(LayerContext);
  const screen = onPlace
    ? "place"
    : pathname === "/app" || pathname === "/app/"
      ? "home"
      : pathname.replace(/^\/app\/?/, "").replace(/\/.*$/, "") || "home";
  return (
    /* The merchant page is the longest screen in the preview and the only one
       carrying a live control, so on that route the Preview bar stops scrolling
       away: the sentence saying this app is not open must stay on screen
       alongside the one button that is. Scoped, so the four tab screens keep
       exactly the behaviour they shipped with. */
    <div className={`app${onPlace ? " is-place" : ""}`} data-screen={screen}>
      {/* ══ THE PREVIEW BANNER ═══════════════════════════════════════════════
          Sam, 12 Sep 2026: "a banner at the top across the top of the page and
          flush with the top of the viewport... across all pages within the app
          preview."

          It used to be a pill sitting in the column's gutter, and on four of
          the five screens it scrolled away — so the sentence saying this app is
          not open was something she passed rather than something she was in.
          Fixed and full-bleed it becomes the frame instead: chrome at both ends
          of the preview, this banner above and the tab bar below, and the
          sentence is on screen for every pixel of every screen.

          That also retires the `.is-place` special case. The merchant page made
          its header sticky precisely because it was the one screen where the
          sentence had to stay next to a live control; now every screen has what
          that rule was buying, and the exception has nothing left to except. */}
      <header className="app-banner">
        <div className="app-banner-in">
          {/* On a merchant page the chevron goes up one level, not out of the
              preview entirely. Static, not history: a deep link, a refresh and a
              shared URL all have no history to go back to, and with the tab bar
              present she has four other ways out anyway. */}
          {onPlace ? (
            <Link className="how-back app-back" to="/app" state={state} aria-label="Back to the app">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="m14.5 5.5-7 6.5 7 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ) : layer ? (
            /* In the window the way out is "close", back to the page beneath —
               a button, because it navigates to wherever that page was rather
               than to one fixed address. */
            <button type="button" className="how-back app-back" onClick={layer.close} aria-label="Close the preview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="m14.5 5.5-7 6.5 7 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <Link className="how-back app-back" to="/" aria-label="Back to the pitch">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="m14.5 5.5-7 6.5 7 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          {/* Sam, 15 Sep 2026: "I still don't like the way that looks with
              the dot next to Preview, and the preview text is really small."
              A chip that says what this is, and a sentence at reading size. */}
          <p className="app-lock">
            <span className="app-lock-chip">Preview</span>
            <span className="app-lock-text">The app opens {launchWindow}</span>
          </p>
          {/* The window's own close, where a window has one. */}
          {layer ? (
            <button type="button" className="how-back app-close" onClick={layer.close} aria-label="Close the preview">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
      </header>

      <main className="app-body">
        <Outlet />
      </main>

      <nav className="app-nav" aria-label="App preview">
        {TABS.map((t) => (
          <NavLink key={t.id} to={t.to} end={t.end} state={state} className="app-tab">
            <NavIcon id={t.id} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
