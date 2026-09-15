import { environment } from "./supabase";
export const IN_PRODUCTION = environment === "production";

const useStripeSandbox = !IN_PRODUCTION;
export const STRIPE_PUBLISHABLE_KEY = useStripeSandbox
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_SANDBOX!
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!;
