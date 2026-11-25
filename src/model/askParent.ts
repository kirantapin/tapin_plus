/* ══ A STUDENT ASKS A PARENT FOR PLUS (Sam, 25 Nov 2026: "a page where
   students can request to have their parents gift them tapin plus ...
   their parent gets a text saying '<student name>' asked for Tapin plus this
   holiday season - send it to them with a note attached") ═════════════════
   /ask builds the text and opens the student's own Messages with it, so the
   ask comes from their number (a parent opens a text from their kid; and we
   never text a number someone else typed in). The link in it is
   plus.tapin.app/parents?for=<their first name>: the parents page greets the
   parent with it and starts the gift's "who it's for" on that name. Only a
   first name goes in the link, never a phone number. */

const NAME_MAX = 24;

/** A first name fit for a link and a greeting: letters, spaces, hyphens and
 *  apostrophes, trimmed and short. Empty when there's nothing usable. */
export function cleanFirstName(raw: string | null | undefined): string {
  const s = (raw ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}' \-’]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();
  return s;
}

/** The name an ask link carries (?for=), read once on /parents. */
export function askedFor(): string {
  if (typeof window === "undefined") return "";
  return cleanFirstName(new URLSearchParams(window.location.search).get("for"));
}

export const askLink = (name: string) => `https://plus.tapin.app/parents?for=${encodeURIComponent(name)}`;

/** The text, in the student's voice (it goes from their phone). Only true
 *  things: $5 at each of the five Plus spots every month, 15% off their other
 *  orders, and the gift's note. */
export const askMessage = (name: string) =>
  `Hi! For the holidays, I’d love Tapin Plus 🎁 It gives me $5 to spend at each of 5 Blacksburg spots every month, plus 15% off. You can send it to me with a note here: ${askLink(name)}`;

/** A US mobile as +1 and ten digits, or null if it isn't one. */
export function usMobile(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10 ? `+1${ten}` : null;
}

/** Opens Messages with the text written, to the parent's number if given.
 *  "?&body=" is read by both iPhone and Android. */
export const smsHref = (to: string | null, body: string) => `sms:${to ?? ""}?&body=${encodeURIComponent(body)}`;

/** The text Tapin sends the parent (api/ask-parent.js writes the same). */
export const tapinAskText = (name: string) =>
  `Tapin: ${name} asked for Tapin Plus this holiday season 🎁 Send it to them with a note attached: ${askLink(name)}\nReply STOP to opt out`;

export type AskResult = { ok: true; masked: string; left: number } | { ok: false; error: string };

/** Sends the ask through Tapin (api/ask-parent.js), as the signed-in student. */
export async function sendAsk(accessToken: string, name: string, to: string): Promise<AskResult> {
  try {
    const r = await fetch("/api/ask-parent", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ name, to }),
    });
    const body = (await r.json().catch(() => ({}))) as { ok?: boolean; masked?: string; left?: number; error?: string };
    if (r.ok && body.ok) return { ok: true, masked: body.masked ?? "", left: body.left ?? 0 };
    return { ok: false, error: body.error ?? (r.status === 503 ? "not_configured" : "try_again") };
  } catch {
    return { ok: false, error: "try_again" };
  }
}

/** What each refusal says to the student. */
export const ASK_ERRORS: Record<string, string> = {
  name: "Add your first name, so they know it’s you.",
  number: "That number doesn’t look right. Use your parent’s US mobile.",
  own_number: "That’s your own number. Add your parent’s.",
  already_asked: "You’ve already asked that number. Give them a little time.",
  limit: "You’ve sent 3 asks, the most we send for one person.",
  opted_out: "That number has turned off texts from Tapin. You can text them yourself below.",
  signin: "Sign in first, so they know it’s really you.",
  not_configured: "We can’t send texts right now. You can text them yourself below.",
  try_again: "That didn’t go through. Try again in a moment.",
};
