/* ══ THE WAITLIST LEAD, SERVER SIDE (Meta Conversions API, 17 Nov 2026) ══════
   Two stages, each the server copy of a browser pixel event with the same
   event id, so Meta counts each pair once (context/meta_pixel.ts).

   stage "phone", no sign-in yet: the number was given and the code texted
   (Sam, 17 Nov 2026: "can we just have it trigger when they provide their
   phone number not a 2FA?"). Lead, the number hashed, event id
   wlp_<first 32 hex of sha256("1"+number)>. Unauthenticated, so it only
   takes a well-formed US number whose id matches it, from the site's pages.

   Otherwise, with the student's Supabase access token: it asks Supabase who
   the token belongs to, checks they are on the waitlist
   (user_metadata.waitlist_at, written by model/waitlist.ts), and sends
   CompleteRegistration with event id wl_<user id>.

   ENV (Vercel, Production): META_CAPI_TOKEN, a Conversions API access token
   from Events Manager for the pixel. Without it this answers 204 and sends
   nothing. META_TEST_EVENT_CODE (optional) routes events to Events Manager's
   Test Events tab while checking; remove it after, or nothing counts. The
   pixel id, project ref and anon key are the build's own VITE_ variables.

   The phone and user id go to Meta only as SHA-256 hashes, as Meta requires;
   the page URL without its query string. */
import { createHash } from "node:crypto";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const SITE = /^https:\/\/(plus\.tapin\.app|[a-z0-9-]+\.vercel\.app)\//;

function readBody(req) {
  let body = req.body ?? {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  return body && typeof body === "object" ? body : {};
}

function browserData(req, body) {
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return {
    ...(ip ? { client_ip_address: ip } : {}),
    ...(req.headers["user-agent"] ? { client_user_agent: String(req.headers["user-agent"]) } : {}),
    ...(typeof body.fbp === "string" && body.fbp ? { fbp: body.fbp } : {}),
    ...(typeof body.fbc === "string" && body.fbc ? { fbc: body.fbc } : {}),
  };
}

const pageUrl = (body) => (typeof body.url === "string" && SITE.test(body.url) ? { event_source_url: body.url } : {});

async function send(res, pixel, token, event) {
  const test = process.env.META_TEST_EVENT_CODE;
  const sent = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event], ...(test ? { test_event_code: test } : {}) }),
  });
  if (!sent.ok) {
    console.error("Meta CAPI failed", event.event_name, sent.status, (await sent.text()).slice(0, 300));
    res.status(502).json({ ok: false });
    return;
  }
  res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const token = process.env.META_CAPI_TOKEN;
  const pixel = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID;
  if (!token || !pixel) {
    res.status(204).end();
    return;
  }
  const body = readBody(req);

  /* ── The number given: Lead ── */
  if (body.stage === "phone") {
    const origin = String(req.headers.origin || req.headers.referer || "");
    const digits = String(body.phone || "").replace(/\D/g, "");
    const hashed = sha(`1${digits}`);
    const id = `wlp_${hashed.slice(0, 32)}`;
    if (!/^[2-9]\d{9}$/.test(digits) || body.event_id !== id || !SITE.test(origin.endsWith("/") ? origin : `${origin}/`)) {
      res.status(400).json({ error: "Not a waitlist number" });
      return;
    }
    await send(res, pixel, token, {
      event_name: "Lead",
      event_time: Math.floor(Date.now() / 1000),
      event_id: id,
      action_source: "website",
      ...pageUrl(body),
      user_data: { ph: [hashed], ...browserData(req, body) },
    });
    return;
  }

  /* ── On the list after the code: CompleteRegistration ── */
  const ref = process.env.VITE_PROJECT_REF;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!ref || !anon) {
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
  const phone = String(user.phone || "").replace(/\D/g, "");
  await send(res, pixel, token, {
    event_name: "CompleteRegistration",
    event_time: at,
    event_id: `wl_${user.id}`,
    action_source: "website",
    ...pageUrl(body),
    user_data: {
      external_id: [sha(user.id)],
      ...(phone ? { ph: [sha(phone)] } : {}),
      ...browserData(req, body),
    },
  });
}
