/* ══ THE PARENTS PAGES' SMALL HELPERS ═════════════════════════════════════════
   What's left of Sam's client for his parents backend (5 Nov 2026) now that
   the gift backend is real (model/giftApi.ts, 8 Nov 2026): the dev preview
   switch, the first-touch UTMs, and phone numbers in E.164. */

/** Local dev only: ?parentmock shows the parents page's preview content
 *  (parents_sections Voices). Never a production build. */
export const parentMock = (): boolean =>
  import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("parentmock");

/* ── First-touch UTMs, kept from the landing for the session ─────────────── */
const UTM_KEY = "tp_parent_utm_v1";
export function captureUtm(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(UTM_KEY)) return;
    const q = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    q.forEach((v, k) => {
      if (k.startsWith("utm_") || k === "fbclid" || k === "gclid") utm[k] = v;
    });
    if (document.referrer) utm.referrer = document.referrer;
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  } catch {
    /* Storage blocked: nothing kept. */
  }
}
export function keptUtm(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}");
  } catch {
    return {};
  }
}

/** "+15405550123" from what a person typed; null if it isn't 10 US digits. */
export function toE164(raw: string): string | null {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `+1${d}` : null;
}
