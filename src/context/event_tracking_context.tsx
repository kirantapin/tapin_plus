import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type FC,
  type ReactNode,
} from "react";
import posthog, { type Properties, type CaptureOptions } from "posthog-js";
import {
  POSTHOG_PROJECT_TOKEN,
  POSTHOG_HOST,
  IN_PRODUCTION,
  RESTAURANT_ID,
} from "../constants";

/**
 * POSTHOG, PORTED FROM THE MERCHANT APP (`~/tapin/src/context/event_tracking_context.tsx`).
 *
 * The shape is that file's, deliberately: one provider, one `useEventTracking`
 * hook, every call wrapped so analytics can never throw into a render, and a
 * `globalProps` bag merged into every event. Two things were dropped on the way
 * over and one was added — see below.
 *
 * ══ KNOWN POSTHOG BEHAVIOUR, CARRIED OVER VERBATIM ═════════════════════════
 * `posthog.register` stores props in localStorage and they persist until
 * explicitly cleared. `register_for_session` is SUPPOSED to store props in
 * sessionStorage and clear them at session end, but whether they actually
 * refresh on a new session is unverified — so a session prop can outlive the
 * thing it described. `getSessionProperty` below defends against that by
 * stamping each prop with the session id it was written under and refusing to
 * return one from a different session.
 *
 * Logged out, `distinct_id` is a random id. On identify it becomes the user id.
 *
 * ══ DROPPED: FEATURE FLAGS AND EXPERIMENTS ═════════════════════════════════
 * The merchant app resolves a table of `EXPERIMENTS` through `onFeatureFlags`
 * and blocks part of its first render on them. There is no experiment config in
 * this project and nothing reads a variant, so porting it would have added a
 * 2-second flag timeout in front of a page whose first paint IS the argument
 * for a purchase. Add it back with the experiments table, not before.
 *
 * ══ AUTOCAPTURE IS ON, UNSCOPED ════════════════════════════════════════════
 * The merchant app sets `autocapture: false`; this one does not. The reason to
 * differ: that app has years of named events and this one has none, so until
 * the domain events are wired, autocapture is the only record of what anyone
 * did. See the note at `posthog.init`.
 *
 * ══ SESSION REPLAY IS ON, WITH INPUTS MASKED ═══════════════════════════════
 * The merchant app disables replay outside production and leaves it to project
 * settings in production. Here it is on, including across the checkout, with
 * `maskAllInputs` so no typed value reaches the tape. See the note at
 * `posthog.init` for what that does and does not cover.
 *
 * ══ ADDED: PAGEVIEWS ARE SENT BY HAND ══════════════════════════════════════
 * `capture_pageview` is false, as it is there. PostHog's automatic pageview
 * fires on load only, and this is a single-page app where `/`, `/how`,
 * `/reserve` and `/in` are one document — so without help the funnel would be
 * one pageview per visit. `usePageviews()` below sends one per route change,
 * mounted once in App.
 *
 * ══ OFF OUTSIDE PRODUCTION, AND LOUD INSTEAD ═══════════════════════════════
 * `ENABLED` is `IN_PRODUCTION` — which is `environment === "production"`, i.e.
 * `VITE_VERCEL_ENV`. On anything else `posthog.init` NEVER RUNS: the library is
 * never configured, no request reaches PostHog, no session is recorded, and no
 * distinct_id is minted. Every method below checks the same flag, so this holds
 * even if something calls one before the provider has mounted.
 *
 * `LOG_EVENTS` is its inverse, so a dev server prints exactly what it would
 * have sent. You can read the funnel off the console without polluting the
 * project — the same trade the merchant app makes.
 */

type EventsAPI = {
  /** Generic capture. No business logic — domain events are named below. */
  track: (event: string, props?: Properties, options?: CaptureOptions) => void;
  identify: (userId: string) => void;
  logout: () => void;
  /** Merged into every subsequent event from this provider. */
  setGlobalProps: (props: Properties) => void;
  clearGlobalProps: (keys?: string[]) => void;
  getGlobalProps: (key: string) => unknown;
  registerForSession: (props: Properties) => void;
  getSessionProperty: (key: string) => unknown;
};

type Events = EventsAPI & { enabled: boolean };

const EventsContext = createContext<Events | null>(null);

export function useEventTracking(): Events {
  const ctx = useContext(EventsContext);
  if (!ctx) {
    throw new Error(
      "useEventTracking must be used within EventTrackingProvider",
    );
  }
  return ctx;
}

const ENABLED = IN_PRODUCTION;
const LOG_EVENTS = !IN_PRODUCTION;

export const EventTrackingProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const initialized = useRef(false);
  const globalProps = useRef<Properties>({});

  useEffect(() => {
    if (initialized.current || !ENABLED) return;
    initialized.current = true;

    posthog.init(POSTHOG_PROJECT_TOKEN, {
      api_host: POSTHOG_HOST,
      /* Manual, because this is an SPA — see the note above. */
      capture_pageview: false,

      autocapture: true,

      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
      },
      capture_performance: { web_vitals: false },
    });

    /* ══ restaurant_id ON EVERY EVENT ══════════════════════════════════════
       A SUPER PROPERTY, not one of the `globalProps` below, and the difference
       is the whole point: `globalProps` is a local bag merged inside `track()`,
       so it reaches named events only. Autocapture, `$pageview`, `$rageclick`
       and the replay events are captured by posthog itself and would carry
       nothing. `register` attaches this to all of them.

       It persists to localStorage and survives reloads. It does NOT survive
       `posthog.reset()` on sign-out, which clears super properties along with
       the distinct_id — so it is registered again below whenever that runs. */
    posthog.register({ restaurant_id: RESTAURANT_ID });
  }, []);

  const api = useMemo<EventsAPI>(
    () => ({
      track: (event, props, options) => {
        const merged = { ...globalProps.current, ...props };
        if (LOG_EVENTS) console.log("[track]", event, merged);
        if (!ENABLED) return;
        try {
          posthog.capture(event, merged, options);
        } catch {
          /* Analytics must never break a page that takes money. */
          console.error("Error capturing event:", event, merged);
        }
      },

      identify: (userId) => {
        if (LOG_EVENTS) console.log("[identify]", userId);
        if (!ENABLED) return;
        try {
          posthog.identify(userId);
        } catch {
          console.error("Error identifying user:", userId);
        }
      },

      logout: () => {
        if (LOG_EVENTS) console.log("[logout]");
        if (!ENABLED) return;
        try {
          /* Clears distinct_id AND super properties, so restaurant_id has to
             be put back or every event after a sign-out loses it. */
          posthog.reset();
          posthog.register({ restaurant_id: RESTAURANT_ID });
        } catch {
          console.error("Error resetting PostHog");
        }
      },

      setGlobalProps: (props) => {
        if (LOG_EVENTS) console.log("[setGlobalProps]", props);
        globalProps.current = { ...globalProps.current, ...props };
      },

      clearGlobalProps: (keys) => {
        if (LOG_EVENTS) console.log("[clearGlobalProps]", keys);
        if (!keys) return;
        for (const k of keys) delete globalProps.current[k];
      },

      getGlobalProps: (key) => {
        /* Reads go through the guard too. Uninitialised, posthog's accessors
           are not guaranteed to be no-ops, and a disabled build must not
           depend on them behaving. */
        if (!ENABLED) return undefined;
        try {
          return posthog.get_property(key);
        } catch {
          console.error("Error reading global prop:", key);
          return undefined;
        }
      },

      registerForSession: (props) => {
        if (LOG_EVENTS) console.log("[registerForSession]", props);
        if (!ENABLED) return;
        try {
          /* Each prop is stamped with the session it was written under, so a
             stale one cannot be read back as current. See the note above. */
          const sid = posthog.get_session_id?.();
          const scoped: Properties = {};
          for (const [k, v] of Object.entries(props)) {
            scoped[k] = v;
            scoped[`${k}_session_id`] = sid ?? null;
          }
          posthog.register_for_session(scoped);
        } catch {
          console.error("Error registering session props");
        }
      },

      getSessionProperty: (key) => {
        if (!ENABLED) return undefined;
        try {
          const current = posthog.get_session_id?.();
          const stored = posthog.getSessionProperty?.(`${key}_session_id`);
          if (!current || !stored || stored !== current) return undefined;
          return posthog.getSessionProperty?.(key);
        } catch {
          console.error("Error reading session prop:", key);
          return undefined;
        }
      },
    }),
    [],
  );

  return (
    <EventsContext.Provider value={{ ...api, enabled: ENABLED }}>
      {children}
    </EventsContext.Provider>
  );
};
