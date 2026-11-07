"""The gift page's live background tiles (Sam, 6 Nov 2026: "individually
animate the icons within the patterns").

Each scene's tile is redrawn here from the same geometry as its still tile in
src/styles/gift.css, with SMIL animation inside the SVG so every icon moves on
its own clock (hearts beat, stars twinkle, fireworks burst ...). Rules:

- every animation starts at the drawn pose (first value = identity, begin >= 0),
  so the still tile is exactly frame 0 and swapping between them never jumps;
- loops are seamless (values end where they start; spins end on a symmetry);
- flat fills, the scene's own colours and shapes, a handful of moving parts.

Run:  python3 tools/patterns/animate.py
Writes tools/patterns/out/<scene>.live.svg / .still.svg (the still is the live
tile with its animation stripped, for the fidelity check in check.cjs) and
rewrites the GENERATED block at the end of src/styles/gift.css. The page swaps
the live tile in only while the band is on screen (GiftPage.tsx data-live) and
never under prefers-reduced-motion; the picker swatches keep the still tiles.
"""
import math
import pathlib
import re
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "tools/patterns/out"
CSS = ROOT / "src/styles/gift.css"

C, G, M, O, W = "#F7F3EA", "#F2B36B", "#861F41", "#E5751F", "#FFFFFF"
INK, DM, RED = "#141618", "#4A1024", "#C8323C"
SINE = ".45 0 .55 1"  # ease in-out
OUTE = ".16 1 .3 1"  # ease out (arrivals)


def n(x):
    s = f"{x:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def _timing(values, dur, begin, kt, ease, calc):
    k = len(values)
    if kt is None:
        kt = [i / (k - 1) for i in range(k)]
    s = f" values='{';'.join(values)}' keyTimes='{';'.join(n(t) for t in kt)}' dur='{n(dur)}s' begin='{n(begin)}s' repeatCount='indefinite'"
    if calc == "spline":
        eases = ease if isinstance(ease, list) else [ease] * (k - 1)
        s += f" calcMode='spline' keySplines='{';'.join(eases)}'"
    else:
        s += f" calcMode='{calc}'"
    return s


def tf(kind, values, dur, begin=0, kt=None, ease=SINE, calc="spline"):
    """animateTransform, composed after the element's own transform."""
    return f"<animateTransform attributeName='transform' type='{kind}' additive='sum'" + _timing(values, dur, begin, kt, ease, calc) + "/>"


def at(attr, values, dur, begin=0, kt=None, ease=SINE, calc="spline"):
    return f"<animate attributeName='{attr}'" + _timing(values, dur, begin, kt, ease, calc) + "/>"


def rock(amp, dur, begin, px=0, py=0):
    """A swing either side of the drawn pose, about (px, py)."""
    v = [f"{n(a)} {n(px)} {n(py)}" for a in (0, amp, 0, -amp, 0)]
    return tf("rotate", v, dur, begin)


def svg(w, h, body):
    return f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}'>{body}</svg>"


def svg_vb(vb, par, body):
    return f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='{vb}' preserveAspectRatio='{par}'>{body}</svg>"


SCENES = {}

# ── Picnic: the cloth ripples. Each band of the gingham lightens in turn, a
#    soft wave crossing the check on the diagonal (tile 4 checks wide so the
#    wave has room; it repeats every 4 checks without a seam).
b = f"<rect width='144' height='144' fill='#FBF7EE'/>"
for i in range(4):
    b += f"<rect x='{36 * i}' width='18' height='144' fill='{RED}' fill-opacity='.42'>{at('fill-opacity', ['.42', '.24', '.42'], 6, i * 1.5)}</rect>"
for j in range(4):
    b += f"<rect y='{36 * j}' width='144' height='18' fill='{RED}' fill-opacity='.42'>{at('fill-opacity', ['.42', '.24', '.42'], 6, j * 1.5 + .75)}</rect>"
SCENES["picnic"] = svg(144, 144, b)

# ── Night sky: the big stars twinkle (shrink and turn a quarter), the small
#    ones fade in and out, each on its own clock.
b = ""
for (cx, cy, d, col, dur, beg) in [
    (30, 30, "M0 -8l2 6 6 2-6 2-2 6-2-6-6-2 6-2z", C, 4.2, .4),
    (168, 64, "M0 -6l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z", C, 3.4, 1.6),
    (92, 159.5, "M0 -9.5l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z", C, 5.3, 2.5),
    (190, 182, "M0 -6l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z", O, 3.8, .9),
]:
    kt = [0, .55, .78, 1]
    b += (f"<path transform='translate({n(cx)} {n(cy)})' d='{d}' fill='{col}'>"
          + tf("rotate", ["0", "0", "45", "90"], dur, beg, kt, [SINE, SINE, SINE])
          + tf("scale", ["1", "1", ".45", "1"], dur, beg, kt, [SINE, SINE, OUTE]) + "</path>")
for (cx, cy, r, col, dur, beg) in [
    (120, 26, 1.4, C, 2.6, .2), (200, 130, 1.6, C, 3.9, 1.1), (54, 96, 1.2, C, 3.1, 2.0), (150, 196, 1.4, C, 4.6, .7),
    (14, 180, 1.6, C, 2.9, 1.5), (196, 12, 1, C, 3.5, 2.6), (78, 206, 1, C, 4.1, .3), (120, 104, 1.6, O, 3.3, 1.9),
]:
    b += f"<circle cx='{n(cx)}' cy='{n(cy)}' r='{n(r)}' fill='{col}'>{at('opacity', ['1', '.15', '1'], dur, beg)}</circle>"
SCENES["night"] = svg(220, 220, b)

# ── Confetti: every piece flutters as it falls (the layer's drift): it swings
#    and, now and then, turns edge-on and back.
b = ""
pieces = [
    ("r", 20, 18, 14, 6, M, 24, 27, 21), ("r", 120, 30, 12, 5, O, -32, 126, 32), ("c", 78, 64, 4, INK),
    ("r", 150, 96, 14, 6, INK, 58, 157, 99), ("r", 40, 120, 12, 5, O, 12, 46, 122), ("c", 112, 140, 4.5, M),
    ("r", 88, 100, 9, 9, W, 20, 92, 104), ("c", 164, 162, 3, O), ("r", 10, 76, 8, 8, M, -15, 14, 80),
    ("r", 62, 162, 13, 5, INK, -48, 68, 164), ("c", 150, 8, 3, INK), ("r", 104, 58, 12, 5, W, 70, 110, 60),
]
durs = [2.3, 2.9, 2.0, 3.2, 2.6, 2.2, 3.5, 2.4, 2.8, 3.0, 2.1, 2.7]
for k, p in enumerate(pieces):
    dur, beg = durs[k], (k * .37) % 2.2
    amp = (24 + (k * 7) % 14) * (1 if k % 2 else -1)
    if p[0] == "r":
        _, x, y, w, h, col, rot, cx, cy = p
        flip = tf("scale", ["1 1", "1 1", "1 .2", "1 1", "1 1"], dur * 1.7, beg + .5, [0, .35, .5, .65, 1])
        b += (f"<g transform='translate({n(cx)} {n(cy)}) rotate({n(rot)})'>"
              f"<rect x='{n(x - cx)}' y='{n(y - cy)}' width='{n(w)}' height='{n(h)}' fill='{col}'/>"
              + rock(amp, dur, beg) + flip + "</g>")
    else:
        _, cx, cy, r, col = p
        b += (f"<circle cx='{n(cx)}' cy='{n(cy)}' r='{n(r)}' fill='{col}'>"
              + tf("translate", ["0 0", "3 0", "0 0", "-3 0", "0 0"], dur, beg) + "</circle>")
SCENES["confetti"] = svg(180, 180, b)

# ── Airmail: the stripes run round the band like a ribbon, the top edge one
#    way and the bottom the other. (The still tile's two left-hand copies had
#    their colours swapped, so a blue stripe turned red at every tile seam;
#    both tiles are drawn right here, and the still one in gift.css too.)
def airmail(direction):
    red = "".join(f"M{x} 0H{x + 8}L{x + 24} 16H{x + 16}Z" for x in range(-64, 97, 32))
    blue = "".join(f"M{x} 0H{x + 8}L{x + 24} 16H{x + 16}Z" for x in range(-48, 97, 32))
    move = "" if direction == 0 else tf("translate", ["0 0", f"{-32 * direction} 0"], 4, 0, calc="linear")
    return svg(32, 16, f"<rect width='32' height='16' fill='#FBFAF6'/><g><path d='{red}' fill='{RED}'/><path d='{blue}' fill='#2B4C9B'/>{move}</g>")
SCENES["airmail"] = airmail(1)
SCENES["airmail-bottom"] = airmail(-1)
AIRMAIL_STILL = airmail(0)

# ── Sunrise: the sun climbs a little and settles; the hills sway past each
#    other, the near one most, like a slow look around.
def hills_sway(amp, dur=13, beg=0):
    return tf("translate", ["0 0", f"{n(amp)} 0", "0 0", f"{n(-amp)} 0", "0 0"], dur, beg)
b = (f"<circle cx='292' cy='560' r='96' fill='{O}'>"
     + tf("translate", ["0 0", "0 -18", "0 0"], 11, .3) + hills_sway(2) + "</circle>"
     f"<path d='M-40 640L0 640C70 610 120 628 180 616C250 602 300 630 400 612L440 612V800H-40Z' fill='{M}'>{hills_sway(7)}</path>"
     f"<path d='M-40 700L0 700C90 684 160 704 240 690C300 680 350 700 400 692L440 692V800H-40Z' fill='{INK}' fill-opacity='.85'>{hills_sway(15)}</path>")
SCENES["sunrise"] = svg_vb("0 0 400 800", "xMidYMax slice", b)

# ── Blue Ridge: the same — the sun lifts, the ridges slide in parallax.
b = f"<circle cx='110' cy='470' r='54' fill='{G}'>" + tf("translate", ["0 0", "0 -14", "0 0"], 12, .3) + hills_sway(1.5, 14) + "</circle>"
for (pts, col, amp) in [
    ("L60 470 L110 500 L180 430 L250 490 L320 450 L400 500", "#C77E66", 3), ("L80 520 L150 560 L230 500 L300 556 L400 520", "#A0485A", 6),
    ("L70 600 L140 630 L220 580 L300 626 L400 590", M, 10), ("L90 664 L170 690 L260 650 L340 684 L400 668", DM, 15),
]:
    y0 = {"#C77E66": 520, "#A0485A": 580, M: 640, DM: 700}[col]
    y1 = pts.split()[-1]
    b += f"<path d='M-40 {y0} L0 {y0} {pts} L440 {y1} V800 H-40Z' fill='{col}'>{hills_sway(amp, 14)}</path>"
SCENES["ridge"] = svg_vb("0 0 400 800", "xMidYMax slice", b)

# ── Sunburst: the rays fan — a wave runs round the burst, bunching and
#    spreading them, while the whole layer turns (the drift).
rays = re.findall(r"<path d='(M400 400[^']*)'", (ROOT / "tools/patterns/src/sunburst.svg").read_text())
b = f"<rect width='800' height='800' fill='{G}'/>"
for k in range(8):  # rays k, k+8, k+16 share a phase: the wave wraps three times
    v = [f"{a} 400 400" for a in ("0", "4", "0", "-4", "0")]
    d = "".join(rays[k::8])
    b += f"<path d='{d}' fill='{O}'>{tf('rotate', v, 8, k * 1.0)}</path>"
SCENES["sunburst"] = svg_vb("0 0 800 800", "xMidYMid slice", b)

# ── Hearts: each one beats, lub-dub then rest, at its own pace.
HEART = "M0 -4 C-3 -10 -12 -8 -12 -2 C-12 4 -4 8 0 12 C4 8 12 4 12 -2 C12 -8 3 -10 0 -4Z"
b = ""
for k, (x, y, rot, s, col) in enumerate([(30, 30, -12, .9, M), (110, 22, 10, .6, O), (78, 86, 6, 1.1, M), (18, 118, 14, .6, O), (136, 120, -8, .8, M), (60, 148, 0, .45, M)]):
    dur = [1.9, 2.3, 2.1, 2.6, 1.8, 2.4][k]
    beg = [.2, 1.1, .6, 1.6, .9, 1.3][k]
    beat = tf("scale", ["1", "1.2", "1.04", "1.14", "1", "1"], dur, beg, [0, .1, .2, .3, .46, 1], [OUTE, SINE, OUTE, SINE, SINE])
    b += f"<path d='{HEART}' fill='{col}' transform='translate({x} {y}) rotate({rot}) scale({s})'>{beat}</path>"
SCENES["hearts"] = svg(160, 160, b)

# ── Sprinkles: each one gets jiggled now and then.
b = ""
for k, (x, y, col, rot) in enumerate([
    (14, 16, M, 30), (44, 10, O, -50), (78, 20, G, 70), (104, 12, DM, 10), (24, 46, W, 80), (58, 40, M, -20), (92, 50, O, 40), (12, 80, G, -60),
    (40, 74, DM, 20), (70, 82, W, -80), (100, 86, M, 60), (28, 104, O, 0), (60, 108, G, 50), (90, 110, DM, -30), (52, 60, O, -75), (108, 36, W, -10),
]):
    dur, beg = 2.2 + (k * 0.61) % 2.6, (k * .43) % 2.4
    a = 16 if k % 2 else -16
    v = [f"{n(t)} {x} {y}" for t in (0, a, -a * .7, a * .4, 0, 0)]
    wig = tf("rotate", v, dur, beg, [0, .07, .15, .23, .32, 1])
    b += f"<rect x='{n(x - 1.6)}' y='{n(y - 5.5)}' width='3.2' height='11' rx='1.6' fill='{col}' transform='rotate({rot} {x} {y})'>{wig}</rect>"
SCENES["sprinkles"] = svg(120, 120, b)

# ── Daisies: each flower turns an eighth (one petal on), then rests.
petals = "".join(f"<ellipse cy='-6.2' rx='2.6' ry='4.6' transform='rotate({a})'/>" for a in range(0, 360, 45))
b = f"<defs><g id='p' fill='{C}'>{petals}</g></defs>"
for k, (x, y, rot, s, eye) in enumerate([(40, 42, 10, 2.6, O), (132, 30, 30, 1.6, G), (108, 106, -12, 3.0, G), (30, 136, 20, 1.8, O), (156, 152, 0, 1.4, O), (70, 164, 15, 1.0, G)]):
    dur, beg = [6.4, 5.2, 7.6, 5.8, 4.8, 5.5][k], [.3, 1.9, 1.0, 2.8, .7, 2.2][k]
    turn = tf("rotate", ["0", "45", "45"], dur, beg, [0, .4, 1], [SINE, SINE])
    pulse = tf("scale", ["1", "1", "1.25", "1"], dur, beg, [0, .3, .42, 1], [SINE, OUTE, SINE])
    b += f"<g transform='translate({x} {y}) rotate({rot}) scale({s})'><use href='#p'>{turn}</use><circle r='2.8' fill='{eye}'>{pulse}</circle></g>"
SCENES["daisies"] = svg(180, 180, b)

# ── XOXO: the kisses spin a quarter turn, the hugs squeeze.
def kiss(cx, cy, dur, beg):
    v = [f"{t} {cx} {cy}" for t in (0, 90, 90)]
    return (f"<path d='M{cx - 8} {cy - 8} L{cx + 8} {cy + 8} M{cx + 8} {cy - 8} L{cx - 8} {cy + 8}' stroke='{M}' stroke-width='5' stroke-linecap='round'>"
            + tf("rotate", v, dur, beg, [0, .28, 1], [OUTE, SINE]) + "</path>")
def hug(cx, cy, dur, beg):
    return (f"<circle cx='{cx}' cy='{cy}' r='8.5' fill='none' stroke='{O}' stroke-width='5'>"
            + at("r", ["8.5", "10.5", "7.6", "8.5", "8.5"], dur, beg, [0, .1, .2, .32, 1], [OUTE, SINE, SINE, SINE]) + "</circle>")
SCENES["xoxo"] = svg(96, 96, kiss(24, 24, 3.2, .3) + hug(72, 24, 2.9, 1.0) + hug(24, 72, 3.5, 2.1) + kiss(72, 72, 3.8, 1.6))

# ── Smileys: they bob and, now and then, blink.
b = ""
for k, (x, y, rot, r, face, feat) in enumerate([(38, 40, -10, 22, C, INK), (118, 30, 15, 14, M, C), (110, 108, 8, 24, C, INK), (34, 124, -18, 15, M, C), (72, 78, 0, 9, C, INK), (146, 148, -10, 9, C, INK)]):
    bob_d, bob_b = [3.2, 2.7, 3.8, 2.9, 2.5, 3.4][k], [.2, 1.2, .7, 1.8, .4, 1.5][k]
    blink_d, blink_b = [4.6, 5.9, 5.2, 6.6, 4.9, 5.5][k], [.8, 2.4, 3.3, 1.5, 2.9, .5][k]
    er = .11 * r
    blink = at("ry", [n(er), n(er), n(er * .15), n(er), n(er)], blink_d, blink_b, [0, .9, .94, .98, 1])
    sw = max(2.0, round(.12 * r, 1))
    m1, m2, m3 = .46 * r, .14 * r, .62 * r
    b += (f"<g transform='translate({x} {y}) rotate({rot})'><circle r='{r}' fill='{face}'/>"
          f"<ellipse cx='{n(-.34 * r)}' cy='{n(-.22 * r)}' rx='{n(er)}' ry='{n(er)}' fill='{feat}'>{blink}</ellipse>"
          f"<ellipse cx='{n(.34 * r)}' cy='{n(-.22 * r)}' rx='{n(er)}' ry='{n(er)}' fill='{feat}'>{blink}</ellipse>"
          f"<path d='M{n(-m1)} {n(m2)} Q0 {n(m3)} {n(m1)} {n(m2)}' fill='none' stroke='{feat}' stroke-width='{sw}' stroke-linecap='round'/>"
          + tf("translate", ["0 0", "0 -3.5", "0 0"], bob_d, bob_b) + "</g>")
SCENES["smileys"] = svg(160, 160, b)

# ── Flannel: light catches the threads, a glint running across the weave.
b = f"<rect width='192' height='192' fill='{M}'/>"
for i in range(3):
    o = 64 * i
    b += f"<rect x='{o + 10}' width='14' height='192' fill='{INK}' fill-opacity='.45'/><rect y='{o + 10}' width='192' height='14' fill='{INK}' fill-opacity='.45'/>"
for i in range(3):
    o, beg = 64 * i, i * 2.0
    glint = lambda base, hi, d: at("fill-opacity", [base, base, hi, base, base], 6, beg + d, [0, .1, .2, .32, 1])
    b += (f"<rect x='{o + 40}' width='3' height='192' fill='{O}' fill-opacity='.8'>{glint('.8', '1', .3)}</rect>"
          f"<rect y='{o + 40}' width='192' height='3' fill='{O}' fill-opacity='.8'>{glint('.8', '1', .3)}</rect>"
          f"<rect x='{o + 52}' width='2' height='192' fill='{C}' fill-opacity='.35'>{glint('.35', '.85', 0)}</rect>"
          f"<rect y='{o + 52}' width='192' height='2' fill='{C}' fill-opacity='.35'>{glint('.35', '.85', 0)}</rect>")
SCENES["flannel"] = svg(192, 192, b)

# ── Lunch: the coffee steams, the slice and the cone wobble, the bowl rocks,
#    the sandwich hops.
LS = f"fill='none' stroke='{C}' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'"
steam = lambda d, beg: (f"<path d='{d}'>" + at("opacity", ["1", "0", "0", "1", "1"], 2.6, beg, [0, .35, .45, .75, 1])
                        + tf("translate", ["0 0", "0 -3", "0 2.5", "0 0", "0 0"], 2.6, beg, [0, .35, .45, .75, 1]) + "</path>")
b = (f"<g {LS} transform='translate(24 22)'><path d='M4 10h22v14a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8V10Z'/><path d='M26 14h4a4 4 0 0 1 0 8h-4'/>"
     + steam("M10 2c0 3 3 3 3 6", .3) + steam("M17 2c0 3 3 3 3 6", 1.4) + "</g>"
     f"<g {LS} transform='translate(128 30) rotate(-12)'><path d='M2 26a18 18 0 0 1 36 0Z'/><path d='M8 18h3M17 12h3M26 17h3'/>{rock(7, 3.8, .9, 20, 26)}</g>"
     f"<g {LS} transform='translate(40 124) rotate(14)'><path d='M2 4l30 8-24 26Z'/><circle cx='16' cy='14' r='2.5'/><circle cx='12' cy='24' r='2'/>{rock(8, 4.4, 1.7, 14, 18)}</g>"
     f"<g {LS} transform='translate(140 120)'><path d='M8 18l10 26 10-26'/><path d='M6 18a12 12 0 0 1 24 0Z'/>{rock(7, 3.4, .5, 18, 44)}</g>"
     f"<g {LS} transform='translate(96 178) rotate(-6)'><path d='M2 10a16 8 0 0 1 32 0Z'/><path d='M2 14h32M4 18h28a3 3 0 0 1-3 4H7a3 3 0 0 1-3-4Z'/>"
     + tf("translate", ["0 0", "0 -5", "0 0", "0 0"], 3.0, 2.2, [0, .14, .3, 1], [OUTE, ".5 0 .9 .5", SINE]) + "</g>")
SCENES["lunch"] = svg(220, 220, b)

# ── Fall leaves: each leaf rocks on its way down (the drift), like a leaf
#    falling.
LEAF = "M0 -14 C8 -8 9 4 0 14 C-9 4 -8 -8 0 -14Z"
def leaf(x, y, rot, s, col, dur, beg, amp=16, stem="M0 -10 V18"):
    return (f"<g transform='translate({x} {y}) rotate({rot}) scale({s})'><path d='{LEAF}' fill='{col}'/>"
            f"<path d='{stem}' stroke='{col}' stroke-width='1.6' stroke-linecap='round'/>{rock(amp, dur, beg, 0, -6)}</g>")
b = "".join(leaf(*a) for a in [(34, 40, -30, 1.1, O, 4.2, .3), (150, 30, 40, .9, M, 3.6, 1.5), (96, 108, -70, 1.2, "#B5651D", 5.0, .8),
                                (30, 170, 20, .8, M, 3.9, 2.2), (178, 150, -10, 1, O, 4.6, 1.1), (120, 196, 60, .7, DM, 3.4, 1.9)])
SCENES["leaves"] = svg(220, 220, b)

# ── Hanukkah: the menorahs' flames flicker (each candle on its own clock,
#    a gentle stretch and lean about the wick), the gelt flips, the dreidels
#    spin on their points. (Sam, 6 Nov 2026: no Star of David; menorahs where
#    the stars were.) The menorahs are read from the still tile (extract.py).
src = (ROOT / "tools/patterns/src/hanukkah.svg").read_text()
menorahs = re.findall(r"<g transform='translate\([^)]*\) rotate\([^)]*\) scale\([^)]*\)'>(?:(?!</g>).)*?<path transform='translate[^>]*/></g>", src)
assert len(menorahs) == 4, len(menorahs)
FLAME_EL = re.compile(r"<path transform='translate\([^)]*\)' d='[^']*' fill='#F2B36B'/>")
b = ""
for k, men in enumerate(menorahs):
    flames = FLAME_EL.findall(men)
    assert len(flames) == 9, len(flames)
    for i, el in enumerate(flames):
        dur = 1.6 + ((i * 5 + k * 3) % 9) * .11 + (.5 if i == 4 else 0)  # the shamash burns slower
        beg = ((i * .29 + k * .41) % 1.3)
        kt = [0, .3, .55, .8, 1]
        flick = (tf("scale", ["1 1", ".84 1.14", "1.06 .9", ".92 1.08", "1 1"], dur, beg, kt)
                 + tf("rotate", ["0", f"{n(5 if (i + k) % 2 else -5)}", "0", f"{n(-3 if (i + k) % 2 else 3)}", "0"], dur * 1.3, beg, kt))
        men = men.replace(el, el[:-2] + ">" + flick + "</path>", 1)
    b += men
for k, (cx, cy, r) in enumerate([(92, 64, 9), (62, 106, 7), (146, 66, 5)]):
    dur, beg = [3.6, 4.4, 5.0][k], [.9, 2.3, 1.6][k]
    flip = tf("scale", ["1 1", ".08 1", "1 1", ".08 1", "1 1", "1 1"], dur, beg, [0, .08, .16, .24, .32, 1])
    b += (f"<g transform='translate({cx} {cy})'><circle r='{r}' fill='{G}'/><circle r='{n(r * .72)}' fill='none' stroke='#C98A2E' stroke-width='1.6'/>{flip}</g>")
for k, (x, y, rot, s, col) in enumerate([(74, 34, -14, .9, "#BFD3F5"), (140, 146, 12, .7, C), (16, 84, 18, .6, "#BFD3F5")]):
    dur, beg = [4.0, 4.8, 5.6][k], [1.4, .5, 2.6][k]
    kt = [0, .06, .12, .18, .24, .3, .38, 1]
    spin = tf("rotate", [f"{t} 0 13" for t in (0, 12, -12, 10, -8, 5, 0, 0)], dur, beg, kt)
    face = tf("scale", ["1 1", ".72 1", "1 1", ".72 1", "1 1", ".8 1", "1 1", "1 1"], dur, beg, kt)
    b += (f"<g transform='translate({x} {y}) rotate({rot}) scale({s})'><g><rect x='-1.6' y='-17' width='3.2' height='7' rx='1.4' fill='{col}'/>"
          f"<path d='M-9 -10 H9 V3 L0 13 L-9 3Z' fill='{col}'/><path d='M-3.5 -5 H3.5 V0 H-1.5' fill='none' stroke='#22408C' stroke-width='1.6' stroke-linecap='round'/>{face}</g>{spin}</g>")
SCENES["hanukkah"] = svg(160, 160, b)

# ── Christmas: snow falls (each flake at its own speed, the big ones
#    nearer and faster, with a little wind), the ornaments swing, the trees
#    sway. The layer itself stays put, so the trees stand.
TREE = "M0 -22 L12 -6 H6 L15 8 H-15 L-6 -6 H-12Z"
b = ""
for k, (x, y, s, col) in enumerate([(36, 44, 1.2, C), (122, 120, 1.0, C), (126, 34, .55, "#7FB08F")]):
    b += (f"<g transform='translate({x} {y}) scale({s})'><path d='{TREE}' fill='{col}'/><rect x='-2.5' y='8' width='5' height='6' fill='#C98A2E'/>"
          f"{rock(3, [5.2, 4.6, 4.0][k], [.6, 1.8, 1.2][k], 0, 14)}</g>")
for k, (cx, cy, r, col) in enumerate([(92, 66, 9, RED), (44, 116, 7, G), (146, 80, 5, RED), (80, 146, 5, G)]):
    hy = cy - r - 4
    b += (f"<g><rect x='{cx - 2}' y='{hy}' width='4' height='4' rx='1' fill='{G}'/><circle cx='{cx}' cy='{cy}' r='{r}' fill='{col}'/>"
          f"<circle cx='{n(cx - .35 * r)}' cy='{n(cy - .35 * r)}' r='{n(.22 * r)}' fill='{W}' fill-opacity='.55'/>"
          f"{rock(9, [3.0, 3.4, 2.7, 3.8][k], [.2, 1.3, .8, 2.0][k], cx, hy)}</g>")
for (x, y, r) in [(70, 20, 2), (14, 82, 2.4), (100, 102, 1.8), (150, 12, 1.6), (58, 76, 1.6), (20, 150, 2), (112, 152, 1.6), (140, 58, 1.4)]:
    dur = 26 / r  # near flakes (bigger) fall faster
    fall = tf("translate", ["0 0", "3 40", "-2 80", "2.5 120", "0 160"], dur, 0, calc="linear")
    b += f"<g fill='{W}' fill-opacity='.85'><circle cx='{x}' cy='{y}' r='{r}'/><circle cx='{x}' cy='{y - 160}' r='{r}'/>{fall}</g>"
SCENES["christmas"] = svg(160, 160, b)

# ── Holiday: the snowflakes turn, the presents hop, the specks twinkle.
def flake(cx, cy, L, col, sw, dur, beg):
    d = ""
    for k in range(6):
        a = math.radians(k * 60)
        R = lambda x, y: (x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a))
        p0, p1 = R(0, 0), R(0, -L)
        q, l1, l2 = R(0, -.55 * L), R(.26 * L, -.78 * L), R(-.26 * L, -.78 * L)
        d += f"M{n(p0[0])} {n(p0[1])}L{n(p1[0])} {n(p1[1])}M{n(q[0])} {n(q[1])}L{n(l1[0])} {n(l1[1])}M{n(q[0])} {n(q[1])}L{n(l2[0])} {n(l2[1])}"
    turn = tf("rotate", ["0", "60"], dur, beg, calc="linear")
    return f"<g transform='translate({cx} {cy})'><path d='{d}' fill='none' stroke='{col}' stroke-width='{sw}' stroke-linecap='round'>{turn}</path></g>"
def gift(x, y, s, box, rib, dur, beg):
    hop = tf("translate", ["0 0", "0 -6", "0 0", "0 0"], dur, beg, [0, .12, .26, 1], [OUTE, ".5 0 .9 .5", SINE])
    squash = tf("scale", ["1 1", "1 1", "1.08 .9", "1 1", "1 1"], dur, beg, [0, .25, .29, .36, 1])
    return (f"<g transform='translate({x} {y}) scale({s})'><g><rect x='-10' y='-7' width='20' height='16' rx='2' fill='{box}'/>"
            f"<rect x='-11.5' y='-11' width='23' height='5' rx='1.5' fill='{box}'/><rect x='-1.8' y='-11' width='3.6' height='20' fill='{rib}'/>"
            f"<path d='M0 -11 C-4 -18 -11 -14 -5 -11 M0 -11 C4 -18 11 -14 5 -11' fill='none' stroke='{rib}' stroke-width='2.2' stroke-linecap='round'/>{squash}</g>{hop}</g>")
b = (flake(38, 38, 18, C, 2.6, 12, 0) + flake(124, 116, 15, C, 2.4, 10, 0) + flake(122, 30, 8, "#E7B9C8", 1.8, 7, 0) + flake(30, 128, 9, "#E7B9C8", 1.8, 8, 0)
     + gift(84, 76, 1.0, G, M, 3.4, .6) + gift(146, 70, .6, C, RED, 4.2, 1.9))
for k, (x, y, r) in enumerate([(70, 140, 2), (100, 20, 1.8), (16, 84, 2), (150, 150, 1.6), (60, 108, 1.4)]):
    b += f"<circle cx='{x}' cy='{y}' r='{r}' fill='{C}' fill-opacity='.8'>{at('opacity', ['1', '.2', '1'], [2.8, 3.6, 3.1, 4.2, 2.5][k], [.3, 1.4, 2.2, .9, 1.8][k])}</circle>"
SCENES["holiday"] = svg(160, 160, b)

# ── Thanksgiving: the pumpkins rock, the acorns swing, the leaves sway.
BROWN = "#6B3416"
def pumpkin(cx, cy, s, body, dur, beg):
    return (f"<g transform='translate({cx} {cy}) scale({s})'>"
            f"<ellipse cx='-7' cy='0' rx='9' ry='11' fill='{body}'/><ellipse cx='7' cy='0' rx='9' ry='11' fill='{body}'/>"
            f"<ellipse cx='0' cy='0' rx='9' ry='12' fill='{body}'/>"
            f"<path d='M0 -11 C0 -16 2 -18 4 -19' stroke='{BROWN}' stroke-width='2.6' fill='none' stroke-linecap='round'/>"
            f"<path d='M-3 -3 V6 M3 -3 V6' stroke='{BROWN}' stroke-opacity='.18' stroke-width='1.6' stroke-linecap='round'/>{rock(6, dur, beg, 0, 12)}</g>")
def acorn(cx, cy, s, rot, dur, beg):
    return (f"<g transform='translate({cx} {cy}) rotate({rot}) scale({s})'>"
            f"<path d='M-7 0 C-7 9 0 13 0 13 C0 13 7 9 7 0Z' fill='{M}'/>"
            f"<path d='M-8.5 0 C-8 -6 8 -6 8.5 0Z' fill='{BROWN}'/><path d='M0 -5 V-9' stroke='{BROWN}' stroke-width='2' stroke-linecap='round'/>{rock(12, dur, beg, 0, -9)}</g>")
b = (pumpkin(40, 44, 1.25, C, 4.6, .4) + pumpkin(128, 120, 1.0, G, 3.9, 1.7) + pumpkin(136, 30, .6, C, 3.4, 1.0)
     + acorn(96, 76, 1.0, -14, 3.2, .8) + acorn(30, 132, .9, 18, 3.7, 2.1) + acorn(150, 76, .7, 6, 2.9, 1.4)
     + leaf(78, 22, 40, .7, G, 3.6, .2, stem="M0 -10 V16") + leaf(70, 140, -30, .8, C, 4.3, 1.5, stem="M0 -10 V16") + leaf(16, 86, 70, .6, G, 3.3, 2.4, stem="M0 -10 V16"))
SCENES["thanksgiving"] = svg(170, 170, b)

# ── New Year's: each firework bursts on its own clock — it hangs, sparkles
#    out, then bursts again from its centre — and the specks twinkle.
def burst(cx, cy, r, col, dur, beg, nrays=12):
    rays = "".join(f"<path d='M{math.cos(a) * r * .35:.1f} {math.sin(a) * r * .35:.1f} L{math.cos(a) * r:.1f} {math.sin(a) * r:.1f}'/>"
                   for a in (math.radians(k * 360 / nrays) for k in range(nrays)))
    ring = "".join(f"<circle cx='{math.cos(a) * r * 1.18:.1f}' cy='{math.sin(a) * r * 1.18:.1f}' r='1.6'/>"
                   for a in (math.radians(k * 360 / nrays + 15) for k in range(nrays)))
    kt = [0, .3, .5, .56, .74, 1]
    ease = [SINE, SINE, SINE, OUTE, SINE]
    rkt = [0, .32, .52, .6, .8, 1]
    return (f"<g transform='translate({cx} {cy})'>"
            f"<g stroke='{col}' stroke-width='2.2' stroke-linecap='round'>{rays}"
            + tf("scale", ["1", "1", "1.1", ".25", "1", "1"], dur, beg, kt, ease) + at("opacity", ["1", "1", "0", "0", "1", "1"], dur, beg, kt, ease) + "</g>"
            f"<g fill='{col}'>{ring}"
            + tf("scale", ["1", "1", "1.14", ".5", "1", "1"], dur, beg, rkt, ease) + at("opacity", ["1", "1", "0", "0", "1", "1"], dur, beg, rkt, ease) + "</g></g>")
b = burst(46, 46, 26, G, 4.4, .5) + burst(128, 118, 20, C, 3.8, 2.0, 10) + burst(132, 32, 11, O, 3.2, 1.1, 8) + burst(36, 136, 13, C, 4.0, 2.8, 8)
for k, (x, y, r, col) in enumerate([(90, 84, 2.2, O), (100, 20, 1.8, C), (14, 92, 2, G), (156, 158, 1.8, G), (80, 150, 2, O), (160, 86, 1.6, C)]):
    b += f"<circle cx='{x}' cy='{y}' r='{r}' fill='{col}'>{at('opacity', ['1', '.15', '1'], [2.4, 3.3, 2.9, 3.7, 2.6, 3.1][k], [.2, 1.0, 1.7, .6, 2.3, 1.3][k])}</circle>"
SCENES["newyear"] = svg(170, 170, b)

# ── Snow: the flakes drift down, each turning slowly (a sixth of a turn, one
#    arm on, so it loops on its own symmetry), the dots fall faster, each at
#    its own speed with a little sway. Nearer (bigger) dots fall faster; no
#    two share a clock, so the field never moves in step. Every piece is drawn
#    twice, one tile apart, and falls one tile per loop, so it wraps without a
#    seam; the layer itself stays put (no drift in GiftPage SCENE_MOTION), as
#    with Christmas. Geometry is read from the still tile (extract.py).
src = (ROOT / "tools/patterns/src/snow.svg").read_text()
T = 170
flakes = re.findall(r"<g transform='translate\(([\d.]+) ([\d.]+)\) rotate\((-?[\d.]+)\)'([^>]*)>((?:<g transform='rotate\(\d+\)'>.*?</g>){6})</g>", src)
dots = re.findall(r"<circle cx='([\d.]+)' cy='([\d.]+)' r='([\d.]+)' fill='([^']+)'/>", src)
assert len(flakes) == 4 and len(dots) == 9, (len(flakes), len(dots))
def falling(copies, dur, sway, sway_dur, sway_beg):
    fall = tf("translate", ["0 0", f"0 {T}"], dur, 0, calc="linear")
    drift = tf("translate", ["0 0", f"{n(sway)} 0", "0 0", f"{n(-sway)} 0", "0 0"], sway_dur, sway_beg)
    return f"<g>{copies}{fall}{drift}</g>"
b = "<defs>" + "".join(f"<g id='f{k}'>{f[4]}</g>" for k, f in enumerate(flakes)) + "</defs>"
for k, (x, y, rot, attrs, arms) in enumerate(flakes):
    L = float(re.search(r"V-([\d.]+)", arms).group(1))
    turn_dur = [26, 21, 17, 23][k]
    turn = tf("rotate", ["0", f"{60 if k % 2 == 0 else -60}"], turn_dur, 0, calc="linear")
    body = lambda yy: f"<g transform='translate({x} {n(yy)}) rotate({rot})'{attrs}><use href='#f{k}'>{turn}</use></g>"
    y = float(y)
    b += falling(body(y) + body(y - T), 360 / L, [4, 3.5, 2.5, 3][k], [7.4, 6.2, 5.3, 6.8][k], [.4, 1.7, 1.1, 2.4][k])
for k, (cx, cy, r, col) in enumerate(dots):
    r_ = float(r)
    dot = lambda yy: f"<circle cx='{cx}' cy='{n(yy)}' r='{r}' fill='{col}'/>"
    sway_dur = [3.1, 4.3, 3.7, 4.9, 3.4, 4.1, 5.2, 3.9, 4.6][k]
    b += falling(dot(float(cy)) + dot(float(cy) - T), round(34 / r_ + (k % 3) * .7, 2), 2 + (k % 3) * .6, sway_dur, (k * .53) % 2.6)
SCENES["snow"] = svg(T, T, b)


# ── Output ────────────────────────────────────────────────────────────────
def enc(s):
    return urllib.parse.quote(s, safe=" =:/,'()-.")


def url(s):
    return 'url("data:image/svg+xml,' + enc(s) + '")'


def still(s):
    s = re.sub(r"<animate(Transform)?\b[^>]*/>", "", s)
    return re.sub(r"<(\w+)([^<>]*)></\1>", r"<\1\2/>", s)


SIZES = {"picnic": "144px 144px", "flannel": "192px 192px"}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for k, s in SCENES.items():
        (OUT / f"{k}.live.svg").write_text(s)
        (OUT / f"{k}.still.svg").write_text(still(s))
    rules = []
    for k, s in SCENES.items():
        if k == "airmail-bottom":
            continue
        img = url(s) + (", " + url(SCENES["airmail-bottom"]) if k == "airmail" else "")
        size = f"\n    background-size: {SIZES[k]};" if k in SIZES else ""
        rules.append(f'  .gft-a[data-scene="{k}"] .gft-scene-pat[data-live] {{\n    background-image: {img};{size}\n  }}')
    block = (
        "/* ══ GENERATED: THE BACKGROUNDS' ICONS, ALIVE (tools/patterns/animate.py; "
        "edit there, not here) ═\n"
        "   Sam, 6 Nov 2026: \"individually animate the icons within the patterns\".\n"
        "   Each scene's tile redrawn with SMIL inside the SVG, so every icon moves on\n"
        "   its own clock; frame 0 is the still tile above, so the swap never jumps.\n"
        "   Only the gift page band, only while it's on screen (GiftPage.tsx sets\n"
        "   data-live), never with reduced motion; the swatches keep the still tiles. */\n"
        "@media (prefers-reduced-motion: no-preference) {\n" + "\n".join(rules) + "\n}\n"
        "/* ══ END GENERATED ═ */\n"
    )
    css = CSS.read_text()
    css = re.sub(r"\n/\* ══ GENERATED: THE BACKGROUNDS' ICONS.*?/\* ══ END GENERATED ═ \*/\n", "\n", css, flags=re.S)
    # The airmail still tile carries the same seam fix.
    css = re.sub(r'(\.scene-swatch\[data-scene="airmail"\] \{\n  background: )url\("[^"]*"\)( 0 0 / 32px 16px repeat-x, )url\("[^"]*"\)',
                 lambda m: m.group(1) + url(AIRMAIL_STILL) + m.group(2) + url(AIRMAIL_STILL), css)
    CSS.write_text(css.rstrip("\n") + "\n\n" + block)
    total = sum(len(url(s)) for s in SCENES.values())
    for k, s in SCENES.items():
        print(f"{k:15s} {len(url(s)):6d} bytes")
    print(f"total {total} bytes")
