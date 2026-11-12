/* ══ WHERE THE ACCOUNT PAGE'S BACK GOES (Sam, 12 Nov 2026: "if I'm on the
   coffeeholics or burg page and I click back from the account page it should
   take me back to the burg or coffeeholics pages instead of back to the main
   tapin plus page") ═══════════════════════════════════════════════════════════
   Every Plus page (PlusHome: /, /coffeeholics, /theburg, a group's page)
   notes its own address as it opens; the account page's back goes there,
   or home when there's none. Kept for the tab's session, so it survives a
   reload of /in. */
const KEY = "tp_plus_back_v1";

/** Called by a Plus page as it opens. */
export function rememberPlusPage(path: string) {
  try {
    window.sessionStorage.setItem(KEY, path);
  } catch {
    /* Storage blocked: back goes home. */
  }
}

/** The Plus page to go back to, or "/". */
export function plusPageBack(): string {
  try {
    const v = window.sessionStorage.getItem(KEY);
    return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
  } catch {
    return "/";
  }
}
