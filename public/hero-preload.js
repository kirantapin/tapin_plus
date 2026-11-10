/* The first screen's photograph, fetched before the app's code has run
   (PageSpeed, 9 Nov 2026: the hero was only found after the bundle
   loaded). Loaded async from index.html, so it never blocks the page; the
   CSP allows only same-origin scripts, so it is a file, not inline. */
(function () {
  var path = location.pathname.replace(/\/+$/, "") || "/";
  var urls =
    path === "/"
      ? ["/collage/blacksburg.webp"]
      : path === "/parents"
        ? ["/parents/hero-split-parent.webp", "/parents/hero-split-student.webp"]
        : path === "/smiths-landing"
          ? ["/groups/smiths-landing.webp"]
          : [];
  for (var i = 0; i < urls.length; i++) {
    var l = document.createElement("link");
    l.rel = "preload";
    l.as = "image";
    l.href = urls[i];
    l.setAttribute("fetchpriority", "high");
    document.head.appendChild(l);
  }
})();
