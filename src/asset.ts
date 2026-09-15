/**
 * Public-folder paths, prefixed with the build's base.
 *
 * String literals like "/logos/x.jpeg" bypass Vite's URL rewriting — only CSS
 * url() and real imports get it — so under staging.tapin.app/blacksburg they
 * resolve against the MAIN app and 404. Every code-side public path goes
 * through here. At base "/" this is the identity function, so local dev and a
 * root deploy are unaffected.
 */
export const asset = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
