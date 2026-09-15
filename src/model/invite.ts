/**
 * INVITATIONS — a URL per audience, the same offer behind each.
 *
 * Sam, 14 Sep 2026: the Welcome Week link goes out by text to students who
 * were at Welcome Week at Virginia Tech, "so we'll be sending a lot of texts";
 * "not everyone that views this is going to be from welcome week", so the
 * logo needs its own URL; and "maybe we make this seem like an invitation —
 * 'you've been invited' … to early access because you went to welcome week".
 *
 * /welcome renders the pitch with the lockup and the line below, and remembers
 * the invitation for the session (sessionStorage) so `/` keeps it after the
 * modal and the deck. NOTHING ELSE CHANGES: same price, same spots, same
 * terms. The line says they are invited to early access, which is true of
 * everyone the text reached; it must never say the offer is different.
 *
 * The logo is Virginia Tech's Welcome Week mark, supplied by Sam. Whether it
 * may be shown here is his to confirm with them; this file only places it.
 */
export const INVITES = {
  welcomeweek: {
    logo: "https://zgeqnmzuxrvlqliqkkth.supabase.co/storage/v1/object/public/membership_images/welcome%20week%20logo.jpg",
    alt: "Welcome Week at Virginia Tech",
    line: "You've been invited to early access for coming to Welcome Week at Virginia Tech.",
  },
} as const;
export type InviteId = keyof typeof INVITES;

const KEY = "tapin.invite";
export function rememberInvite(id: InviteId): void {
  try { sessionStorage.setItem(KEY, id); } catch { /* private mode: the URL still works */ }
}
export function recallInvite(): InviteId | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v && v in INVITES ? (v as InviteId) : null;
  } catch { return null; }
}
