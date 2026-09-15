import { defineConfig } from "vite";
/* `@types/node` is not a dependency here and does not need to be — this is
   the only env read in the project. The sibling prototype declares it the
   same way. Without this, `tsc -b` fails remotely with TS2580 even though a
   local build passes, because a local node_modules hoists @types/node and a
   clean install does not. */
declare const process: { env: Record<string, string | undefined> };
import react from "@vitejs/plugin-react";

/**
 * Port 4500 by default, and strictPort throughout: this prototype must never
 * silently land on the merchant app's 3000, on the old prototype's 4400, or on
 * another dev server.
 *
 * PORT OVERRIDES IT. The harness runs several chats at once and 4500 can
 * already be held by another session's copy of this same server, which no
 * amount of stopping from here can free. With `autoPort` in launch.json it
 * assigns a free port via PORT, so this reads it. strictPort stays TRUE in
 * both branches — an assigned port that is somehow taken should fail loudly,
 * which is the guarantee this comment existed for in the first place.
 *
 * NO SUPABASE CLIENT AND NO AUTH PAIR. The checkout added 13 Sep 2026 calls ONE
 * endpoint by URL (`create_simple_intent`) and reads two build-time variables —
 * a Stripe publishable key, which is designed to ship in a bundle, and a
 * connected-account id. Neither is a secret and neither is in a file:
 * `.vercelignore` excludes `.env*` so a local copy cannot ride along in an
 * upload. See src/shell/checkoutEnv.ts.
 */
export default defineConfig({
  /* Served under staging.tapin.app/blacksburg via a rewrite in the main app, so
     the build has to know its prefix. ENV-DRIVEN: unset (local dev, `npm run
     dev`) it is "/" and nothing changes. */
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 4500,
    strictPort: true,
    allowedHosts: [".ngrok.app", ".ngrok-free.app", ".ngrok.io"],
  },
});
