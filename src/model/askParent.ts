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
