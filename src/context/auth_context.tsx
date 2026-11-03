import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type FC,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { useEventTracking } from "./event_tracking_context";
import { isPlusMember } from "../model/plus";

interface AuthContextProps {
  userSession: Session | null | undefined;
  accessToken: string | undefined;
  logout: () => Promise<void>;

  subscribed: boolean | null;
  /** Re-ask the server. Call it after a successful purchase. */
  refreshSubscription: () => Promise<void>;
  /**
   * The name this person gave at sign-in, or null when signed out or unnamed.
   *
   * Written to `user_metadata` by `verifyCode` — `display_name` is the key
   * Supabase's dashboard reads, `full_name` the one most of the ecosystem
   * does, so both are checked here in that order.
   */
  displayName: string | null;
}

export const AuthContext = createContext<AuthContextProps | undefined>(
  undefined,
);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [userSession, setUserSession] = useState<Session | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession((prev) => {
        if (prev === undefined) return session;
        if (prev === null && session === null) return prev;
        if (prev === null || session === null) return session;

        /* Both are real sessions — only replace when something that matters
           actually moved, so a refresh does not re-render the whole checkout. */
        const changed =
          session.access_token !== prev.access_token ||
          session.expires_at !== prev.expires_at ||
          session.user?.id !== prev.user?.id;
        return changed ? session : prev;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ══ HAS THIS PERSON ALREADY BOUGHT? ═══════════════════════════════════════
     Asked of the server, because the browser is not a record: whether they
     hold TapIn's Plus bundle right now (model/plus.ts isPlusMember), the same
     check the app makes. */
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const accessToken = userSession?.access_token;
  const memberId = userSession?.user?.id;

  const refreshSubscription = useCallback(async () => {
    if (!memberId) {
      setSubscribed(null);
      return;
    }
    try {
      setSubscribed(await isPlusMember(memberId));
    } catch (err) {
      /* Unknown, not false: a wrong false would offer the checkout to a
         member (create_intent refuses them anyway). */
      console.error("Reading Plus membership failed", err);
      setSubscribed(null);
    }
  }, [memberId]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const meta = userSession?.user?.user_metadata as
    | { display_name?: unknown; full_name?: unknown }
    | undefined;
  const named = [meta?.display_name, meta?.full_name].find(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  const displayName = named?.trim() ?? null;

  const {
    identify,
    logout: resetTracking,
    setGlobalProps,
    clearGlobalProps,
  } = useEventTracking();
  const userId = userSession?.user?.id;

  useEffect(() => {
    if (userSession === undefined) return;
    if (userId) {
      identify(userId);
      setGlobalProps({ user_id: userId });
    } else {
      clearGlobalProps(["user_id"]);
    }
  }, [userSession, userId, identify, setGlobalProps, clearGlobalProps]);

  const logout = async () => {
    await supabase.auth.signOut();
    setSubscribed(null);
    resetTracking();
  };

  return (
    <AuthContext.Provider
      value={{
        userSession,
        accessToken,
        logout,
        subscribed,
        refreshSubscription,
        displayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
