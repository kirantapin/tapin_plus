import TapInLogo from "./TapInLogo";

/**
 * Members-only nights, as a scene rather than a sentence.
 *
 * There is no photography for this. Six hero images exist and every one is a
 * venue's own marketing shot — one is a white wordmark on white — so there is
 * nothing in the library that reads as a night, and buying a stock crowd photo
 * would be a picture of an event that has not happened, at a venue that did not
 * agree to it. So the scene is built from the product's own material: a lit
 * room, and two passes standing in it.
 *
 * TWO PASSES IS THE WHOLE IDEA. "You bring someone" is the part that makes this
 * different from a normal night out, and it is carried by the second pass, not
 * by the copy. The near one is lit and says You; the far one is dimmer and says
 * the guest — the way a second ticket looks when you are holding both.
 *
 * MOTION IS AMBIENT, NOT NARRATIVE. The pool breathes on one layer and each
 * pass sways on its own, on periods that do not divide, so nothing lands on a
 * beat and nothing ever synchronises into a pulse. One transform per element:
 * the old build put two animations on one node and the second silently won.
 */
/** x / y in %, s = diameter px, o = rest opacity, t = animation delay s. */
const LIGHTS = [
  { x: 8, y: 16, s: 3, o: 0.3, t: -0.4 },
  { x: 17, y: 28, s: 5, o: 0.5, t: -2.9 },
  { x: 31, y: 11, s: 4, o: 0.38, t: -1.3 },
  { x: 44, y: 23, s: 3, o: 0.26, t: -4.6 },
  { x: 58, y: 13, s: 6, o: 0.54, t: -0.9 },
  { x: 71, y: 27, s: 4, o: 0.34, t: -3.7 },
  { x: 84, y: 17, s: 5, o: 0.44, t: -2.1 },
  { x: 93, y: 31, s: 3, o: 0.24, t: -5.2 },
];

export default function NightScene() {
  return (
    <div className="night" role="img" aria-label="Two TapIn passes, yours and a guest's">
      {/* The room: a pool of warm light low in the frame, and the dark above it. */}
      <span className="night-pool" aria-hidden="true" />
      <span className="night-haze" aria-hidden="true" />

      {/* Lights above. Placed by hand rather than on a formula: an even row at
          one size reads as a dotted rule, which is exactly what the first pass
          of this produced. Position, size and phase all vary. */}
      <span className="night-lights" aria-hidden="true">
        {LIGHTS.map((l, i) => (
          <i
            key={i}
            style={{
              left: `${l.x}%`,
              top: `${l.y}%`,
              ["--d" as string]: `${l.s}px`,
              ["--o" as string]: l.o,
              animationDelay: `${l.t}s`,
            }}
          />
        ))}
      </span>

      <div className="night-passes" aria-hidden="true">
        <div className="night-pass is-guest">
          <div className="night-pass-face">
            <TapInLogo className="night-mark" />
            <span>Guest</span>
          </div>
        </div>
        <div className="night-pass is-you">
          <div className="night-pass-face">
            <TapInLogo className="night-mark" />
            <span>You</span>
          </div>
        </div>
      </div>
    </div>
  );
}
