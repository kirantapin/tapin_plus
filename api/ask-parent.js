/* ══ A STUDENT'S ASK, TEXTED TO THEIR PARENT BY TAPIN (Sam, 25 Nov 2026:
   "Students can give their parents phone number, and then their parent gets
   a text saying '<student name>' asked for Tapin plus this holiday season -
   send it to them with a note attached"; then, of who sends it: "Tapin texts
   the parent") ══════════════════════════════════════════════════════════════
   POST /api/ask-parent with the student's Supabase access token (Bearer) and
   { name, to }. It asks Supabase who the token belongs to (a student signed
   in with their own number), checks their asks so far, and sends one text
   through Twilio's Messaging Service:

     Tapin: Maya asked for Tapin Plus this holiday season 🎁 Send it to them
     with a note attached: https://plus.tapin.app/parents?for=Maya
     Reply STOP to opt out

   LIMITS, because the parent never signed up for our texts: a signed-in
   student only (each ask traces to a verified number); a first name of
   letters only, so the text can't carry anything else; never their own
   number; one ask per parent number per student; ASK_LIMIT asks per student;
   one text each, no follow-ups; STOP is honoured by the Messaging Service.
   The asks are counted on the student's own account (user_metadata
   .ask_parent: the count and short hashes of the numbers, never the numbers).

   ENV (Vercel, Production): TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
   TWILIO_MESSAGING_SERVICE_SID. Without them this answers 503 and the page
   offers to text it from the student's own phone instead. The project ref
   and anon key are the build's own VITE_ variables. */
import { createHash } from "node:crypto";

const ASK_LIMIT = 3;
const NAME_MAX = 24;
const hash = (s) => createHash("sha256").update(`ask:${s}`).digest("hex").slice(0, 16);

const cleanName = (raw) =>
  String(raw ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}' \-’]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();

function usMobile(raw) {
  const d = String(raw ?? "").replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  /* A US number: no leading 0 or 1 in the area code or exchange. */
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(ten) ? `+1${ten}` : null;
}

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const secret = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const ref = process.env.VITE_PROJECT_REF;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!sid || !secret || !service || !ref || !anon) {
    res.status(503).json({ error: "not_configured" });
    return;
  }
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "signin" });
    return;
  }
  const who = await fetch(`https://${ref}.supabase.co/auth/v1/user`, { headers: { apikey: anon, Authorization: auth } });
  if (!who.ok) {
    res.status(401).json({ error: "signin" });
    return;
  }
  const user = await who.json();
  const own = usMobile(user?.phone);
  if (!user?.id || !own) {
    res.status(401).json({ error: "signin" });
    return;
  }

  const body = readBody(req);
  const name = cleanName(body.name);
  const to = usMobile(body.to);
  if (!name) {
    res.status(400).json({ error: "name" });
    return;
  }
  if (!to) {
    res.status(400).json({ error: "number" });
    return;
  }
  if (to === own) {
    res.status(400).json({ error: "own_number" });
    return;
  }

  const kept = user.user_metadata?.ask_parent;
  const sent = Array.isArray(kept?.sent) ? kept.sent.filter((h) => typeof h === "string") : [];
  const key = hash(to);
  if (sent.includes(key)) {
    res.status(409).json({ error: "already_asked" });
    return;
  }
  if (sent.length >= ASK_LIMIT) {
    res.status(429).json({ error: "limit" });
    return;
  }

  /* Counted before the text goes, so a retry can't send twice. */
  const marked = await fetch(`https://${ref}.supabase.co/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ data: { ask_parent: { sent: [...sent, key], last_at: new Date().toISOString() } } }),
  });
  if (!marked.ok) {
    res.status(502).json({ error: "try_again" });
    return;
  }

  const link = `https://plus.tapin.app/parents?for=${encodeURIComponent(name)}`;
  const text = `Tapin: ${name} asked for Tapin Plus this holiday season 🎁 Send it to them with a note attached: ${link}\nReply STOP to opt out`;
  const form = new URLSearchParams({ MessagingServiceSid: service, To: to, Body: text });
  const tw = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  if (!tw.ok) {
    const why = await tw.json().catch(() => ({}));
    /* Not sent: the ask isn't counted, so they can try again. */
    await fetch(`https://${ref}.supabase.co/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { ask_parent: { sent, last_at: kept?.last_at ?? null } } }),
    }).catch(() => undefined);
    /* 21610: the number replied STOP to us before. */
    console.error("ask-parent: Twilio refused", tw.status, why?.code ?? "");
    res.status(why?.code === 21610 ? 409 : 502).json({ error: why?.code === 21610 ? "opted_out" : "try_again" });
    return;
  }
  res.status(200).json({ ok: true, masked: `•••${to.slice(-4)}`, left: ASK_LIMIT - sent.length - 1 });
}
