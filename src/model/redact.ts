/* ══ KEYS NEVER LEAVE THE PAGE (5 Nov 2026, the parents flow's review) ══════
   A parent's manage link (/parents/manage/{token}) and a student's Ask a
   parent link (?ask={token}) are keys: anyone holding one can cancel or pay.
   The pages take them out of the address bar as they open (ParentManage,
   ParentsHome), and everything sent to PostHog passes through this as well,
   so no key is stored by a third party. */
export const redactUrl = (u: string): string =>
  u.replace(/\/parents\/manage\/[^/?#]+/g, "/parents/manage/:token").replace(/([?&]ask=)[^&#]*/g, "$1:token");

/** Moves a key out of the address bar, keeping it for this tab so a reload
 *  still works. Returns the key, from the address or from the tab. */
export function takeKey(storageKey: string, fromAddress: string | null, cleanPath: string): string | null {
  if (typeof window === "undefined") return fromAddress;
  try {
    if (fromAddress) sessionStorage.setItem(storageKey, fromAddress);
  } catch {
    /* Storage blocked: the key lives in memory only. */
  }
  if (fromAddress) window.history.replaceState(window.history.state, "", cleanPath);
  try {
    return fromAddress ?? sessionStorage.getItem(storageKey);
  } catch {
    return fromAddress;
  }
}
