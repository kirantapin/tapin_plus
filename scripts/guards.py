#!/usr/bin/env python3
"""
The TRUTH.md §10 guards, as a check that runs rather than a rule anyone
remembers. Comments are stripped first: every one of these strings appears
somewhere in a comment EXPLAINING why it must not appear in output, and a
guard that fires on its own documentation gets switched off within a week.

Run: python3 scripts/guards.py
"""
import re
import pathlib
import sys

SRC = pathlib.Path(__file__).resolve().parent.parent / "src"


def strip(src: str, css: bool) -> str:
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    if not css:
        src = re.sub(r"(?m)^\s*//.*$", "", src)
        src = re.sub(r"\s//[^\n\"']*$", "", src, flags=re.M)
    return src


# ══ THE ONE EXEMPTION, AND WHY IT IS A FILE AND NOT A LOOSENED PATTERN ══════
# The seat counter Sam asked for on 13 Sep 2026 — and reaffirmed after being
# shown that TRUTH.md retires the device by name — is an invented count, which
# is precisely what the "member or seat count" check exists to catch. The check
# is therefore working, and it must keep working everywhere else.
#
# So the exemption is granted to ONE FILE rather than by weakening the regex.
# `src/model/seats.ts` is the only place the fabricated figure is produced, its
# header says at length that it counts nothing, and anything that wants to print
# a seat number has to go through it. A looser pattern would have quietly
# re-opened the door on every surface in the build.
EXEMPT = {
    ("member or seat count", "src/model/seats.ts"),
    # TAPIN PLUS WEARS THE REAL LOGO'S GOLD (Sam, 24 Sep 2026: "call it plus
    # with the gold branding", "use the actual gold color that we used in the
    # logo"). Granted to the three files that DEFINE it — the token and the two
    # marks that mirror public/tapin_logo.svg's gradient — so gold anywhere else
    # still fails.
    ("gold/amber literal", "src/styles/tokens.css"),
    ("gold/amber literal", "src/shell/TapInLogo.tsx"),
    ("gold/amber literal", "src/shell/TapInIcon.tsx"),
}

CHECKS = [
    # Hokie Stone Gray is non-text: 3.99:1 on --card, 2.89:1 over glass.
    ("--stone on a color: declaration", r"color\s*:[^;{}]*--stone"),
    # The pinned mockup's gold. Premium here is material and light, never metal —
    # except TapIn Plus's own mark, whose gold is the logo's (see EXEMPT).
    ("gold/amber literal", r"#(?:e8dca7|cda852|ffd700|ffa500)"),
    # A serial number is a count, and there are no members to count.
    ("seat prop passed", r"seat\s*=\s*[\"{]"),
    ("member or seat count", r"\b\d+\s*(?:of|/)\s*100\b|seats?\s+(?:left|remaining|gone)|\b\d+\s+people\b"),
    # The documents live at go.tapin.app (Sam, 14 Sep 2026; all three return 200).
    # A RELATIVE terms/privacy href is still a link to a page this build lacks.
    ("terms/privacy link", r"href\s*=\s*[\"'](?!https?://)[^\"']*(?:terms|privacy)"),
    # "only … left" is matched across a template literal, not just a literal
    # digit: `Only ${left} founding seats left` shipped past `only \d+ left`
    # until the 14 Sep 2026 review caught it rendered.
    ("urgency theatre", r"\bcountdown\b|\bhurry\b|\bact now\b|\bends in\b|\bonly\b[^.\n]{0,40}\b(?:left|remaining)\b"),
    ("named brand as a points destination", r"\b(?:Starbucks|Amazon|Delta|United|Chipotle)\b"),
]


def main() -> int:
    fails = []
    for p in sorted(SRC.rglob("*")):
        if p.suffix not in {".ts", ".tsx", ".css"}:
            continue
        src = strip(p.read_text(), p.suffix == ".css")
        for name, pat in CHECKS:
            for m in re.finditer(pat, src, re.I):
                rel = p.relative_to(SRC.parent.parent)
                if (name, str(p.relative_to(SRC.parent))) in EXEMPT:
                    continue
                line = src[: m.start()].count("\n") + 1
                fails.append(f"{name}: {rel}:{line}  {m.group(0)!r}")
    if fails:
        print("\n".join(fails))
        return 1
    print("guards: all clear")
    return 0


if __name__ == "__main__":
    sys.exit(main())
