import { createClient, SupabaseClient } from "@supabase/supabase-js";
//supabase client

export const environment: "production" | "preview" | "local" | "dev" =
  import.meta.env.VITE_VERCEL_ENV ?? "production";

const supabase_key =
  environment === "local"
    ? import.meta.env.VITE_SUPABASE_ANON_KEY_LOCAL
    : environment === "production"
      ? import.meta.env.VITE_SUPABASE_ANON_KEY
      : environment === "preview"
        ? import.meta.env.VITE_SUPABASE_ANON_KEY_STAGING
        : import.meta.env.VITE_SUPABASE_ANON_KEY_DEV;

export const project_ref =
  environment === "production"
    ? import.meta.env.VITE_PROJECT_REF
    : environment === "preview"
      ? import.meta.env.VITE_PROJECT_REF_STAGING
      : import.meta.env.VITE_PROJECT_REF_DEV;
export const project_url =
  environment === "local"
    ? import.meta.env.VITE_PROJECT_URL_LOCAL
    : project_ref
      ? `https://${project_ref}.supabase.co`
      : undefined;

let supabase_key_local = import.meta.env.VITE_SUPABASE_ANON_KEY_LOCAL || "";
let project_url_local = import.meta.env.VITE_PROJECT_URL_LOCAL || "";

if (!supabase_key || !project_url) {
  throw new Error(
    "Missing Supabase environment variables: VITE_SUPABASE_ANON_KEY or VITE_PROJECT_URL",
  );
}

export const supabase: SupabaseClient = createClient(project_url, supabase_key);
export const supabase_local: SupabaseClient = createClient(
  window.location.hostname === "localhost" ? project_url_local : project_url,
  window.location.hostname === "localhost" ? supabase_key_local : supabase_key,
);
