/// <reference types="vite/client" />

/* Without this, `import.meta.env.BASE_URL` does not typecheck — the project
   had no vite/client reference at all, which only surfaced the first time
   anything read the build's base. */

/**
 * EVERY BUILD-TIME VARIABLE THIS PROJECT READS, DECLARED ONCE.
 *
 * Vite exposes only `VITE_`-prefixed variables to client code, and it loads
 * them from a `.env` at the repo root as well as from the host's environment.
 * That is NOT true of `vite.config.ts`, which reads `process.env` directly and
 * so never sees a `.env` file — see the note on `VITE_BASE_PATH` there.
 *
 * All optional. Nothing here may be assumed present: this project's rule is
 * that a half-configured build renders an honest disabled state rather than a
 * control that cannot complete. See `supabase.ts` and `authEnv.ts`.
 */
interface ImportMetaEnv {
  /* ── Which deployment this is. Drives the Supabase project choice in
        `supabase.ts`. Unset behaves as "dev". ─────────────────────────────── */
  readonly VITE_VERCEL_ENV?: "production" | "preview" | "local" | "dev";

  /* ── Supabase, one set per environment. Ported from the merchant app, which
        targets a different project per environment from one build. ────────── */
  readonly VITE_PROJECT_REF?: string;
  readonly VITE_PROJECT_REF_STAGING?: string;
  readonly VITE_PROJECT_REF_DEV?: string;
  readonly VITE_PROJECT_URL_LOCAL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY_STAGING?: string;
  readonly VITE_SUPABASE_ANON_KEY_DEV?: string;
  readonly VITE_SUPABASE_ANON_KEY_LOCAL?: string;

  /* ── Stripe. Read ONLY by `constants.ts`, which picks between them on
        `IN_PRODUCTION`; nothing else in the project may read a key directly,
        or the two would disagree about which mode the build is in. ───────── */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY_SANDBOX?: string;

  /* ── PostHog. Only read by `constants.ts`. ──────────────────────────────── */
  readonly VITE_POSTHOG_PROJECT_TOKEN?: string;

  /* ── Meta Pixel. Only read by `constants.ts`. Unset means the pixel never
        loads and no request reaches facebook.net — see context/meta_pixel.ts. */
  readonly VITE_META_PIXEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
