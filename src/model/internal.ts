/* ══ OUR OWN DEVICES (Sam, 4 Nov 2026: "these might've been me too though
   that's the thing") ═══════════════════════════════════════════════════════
   Open plus.tapin.app/?internal once on a phone or laptop and that device is
   marked as ours for good (localStorage). Every PostHog event from it then
   carries `is_internal: true`, so the project's "Filter out internal and test
   users" switch can hide it. ?internal=0 clears the mark. Works on any page
   of the site. */

const KEY = "tp_internal_v1";

export function isInternalDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const asked = new URLSearchParams(window.location.search).get("internal");
    if (asked !== null) {
      if (asked === "0" || asked === "false") window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, "1");
    }
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** The super property to register; empty for everyone else. */
export function internalProps(): { is_internal?: true } {
  return isInternalDevice() ? { is_internal: true } : {};
}
