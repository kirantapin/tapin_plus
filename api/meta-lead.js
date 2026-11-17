/* ══ THE WAITLIST LEAD, SERVER SIDE (Meta Conversions API, 17 Nov 2026) ══════
   POST /api/meta-lead with the student's Supabase access token. It asks
   Supabase who the token belongs to, checks they are on the waitlist
   (user_metadata.waitlist_at, written by model/waitlist.ts), and sends Meta
   one Lead with event id wl_<user id>: the same id the browser pixel's Lead
   carries (context/meta_pixel.ts), so Meta deduplicates the pair.

   ENV (Vercel, Production): META_CAPI_TOKEN, a Conversions API access token
   from Events Manager for the pixel. Without it this answers 204 and sends
   nothing. META_TEST_EVENT_CODE (optional) routes events to Events Manager's
   Test Events tab while checking. The pixel id, project ref and anon key
   are the build's own VITE_ variables.

   The phone and user id go to Meta only as SHA-256 hashes, as Meta requires;
   the page URL without its query string. */
import { createHash } from "node:crypto";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const SITE = /^https:\/\/(plus\.tapin\.app|[a-z0-9-]+\.vercel\.app)\//;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const token = process.env.META_CAPI_TOKEN;
  const pixel = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID;
  const ref = process.env.VITE_PROJECT_REF;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !pixel || !ref || !anon) {
    res.status(204).end();
    return;
  }
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "No session" });
    return;
  }
  const who = await fetch(`https://${ref}.supabase.co/auth/v1/user`, { headers: { apikey: anon, Authorization: auth } });
  if (!who.ok) {
    res.status(401).json({ error: "Session not valid" });
    return;
  }
  const user = await who.json();
  const joined = Date.parse(user?.user_metadata?.waitlist_at ?? "");
  if (!user?.id || !Number.isFinite(joined)) {
    res.status(409).json({ error: "Not on the waitlist" });
    return;
  }
  /* Meta takes events up to 7 days old; a join older than that isn't news. */
  const now = Math.floor(Date.now() / 1000);
  const at = Math.min(now, Math.floor(joined / 1000));
  if (now - at > 6 * 86_400) {
    res.status(409).json({ error: "Joined too long ago" });
    return;
  }
  let body = req.body ?? {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const phone = String(user.phone || "").replace(/\D/g, "");
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const userData = {
    external_id: [sha(user.id)],
    ...(phone ? { ph: [sha(phone)] } : {}),
    ...(ip ? { client_ip_address: ip } : {}),
    ...(req.headers["user-agent"] ? { client_user_agent: String(req.headers["user-agent"]) } : {}),
    ...(typeof body.fbp === "string" && body.fbp ? { fbp: body.fbp } : {}),
    ...(typeof body.fbc === "string" && body.fbc ? { fbc: body.fbc } : {}),
  };
  const event = {
    event_name: "Lead",
    event_time: at,
    event_id: `wl_${user.id}`,
    action_source: "website",
    ...(typeof body.url === "string" && SITE.test(body.url) ? { event_source_url: body.url } : {}),
    user_data: userData,
  };
  const test = process.env.META_TEST_EVENT_CODE;
  const sent = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event], ...(test ? { test_event_code: test } : {}) }),
  });
  if (!sent.ok) {
    console.error("Meta CAPI Lead failed", sent.status, (await sent.text()).slice(0, 300));
    res.status(502).json({ ok: false });
    return;
  }
  res.status(200).json({ ok: true });
}
