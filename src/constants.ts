import { environment } from "./supabase";
export const IN_PRODUCTION = environment === "production";

const useStripeSandbox = !IN_PRODUCTION;
export const STRIPE_PUBLISHABLE_KEY = useStripeSandbox
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_SANDBOX!
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!;

/* PostHog. The host is fixed (US cloud, same project as the merchant app);
   only the token comes from the environment. Tracking is off outside
   production — see the note in context/event_tracking_context.tsx. */
export const POSTHOG_PROJECT_TOKEN = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN!;
export const POSTHOG_HOST = "https://us.i.posthog.com";
