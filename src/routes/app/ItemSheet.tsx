import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MenuItem } from "../../model/menu";
import { money, POINTS_PER_DOLLAR } from "../../model/order";
import { unitCents, type OptionGroup, type OrderLine } from "../../model/options";

/**
 * The dish's sheet — the pop-up a tap on a menu row opens.
 *
 * Sam, 15 Sep 2026: "being able to see modifier pop ups and item cards", then
 * "go ahead and build the new merchant pages how you had them in the mock ups."
 *
 * ══ WHY A SHEET AND NOT AN INLINE STEPPER ══════════════════════════════════
 * The real storefront asks for choices before a dish goes in — bagel, bread,
 * extras — and a student who has used it expects the same gesture here. A +
 * that added instantly would teach the wrong mechanism and then surprise her
 * in the real app. So a row opens this; Add is the only thing that changes
 * the ticket.
 *
 * ══ ONE COMPONENT, TWO SHAPES ══════════════════════════════════════════════
 * A bottom sheet on a phone — the storefront's own — and from 1024px a centred
 * dialog with the photograph as its left panel, because the app is a window
 * over the pitch there and a sheet rising inside a window reads as a bug. The
 * DOM is identical; app.css switches the shape by width. It is rendered
 * through a portal onto <body> so it is never inside the app window's
 * animated surface (a transformed ancestor would contain a fixed child), and
 * it carries the app's light ramp itself (`data-surface="app"`, tokens.css)
 * because the body under the desktop window is the dark page.
 *
 * ══ WHAT IT WILL NOT DO ════════════════════════════════════════════════════
 * Nothing leaves this page. Add puts a line on the ticket 400px away and
 * closes; there is no Pay, no Save to My Spot, and the sentence under the
 * options says the groups are examples where they are (model/options.ts).
 */
export default function ItemSheet({
  item,
  groups,
  line,
  door = false,
  onSave,
  onRemove,
  onClose,
}: {
  item: MenuItem;
  groups: OptionGroup[];
  /** The line being edited, or null for a fresh one. */
  line: OrderLine | null;
  /** Cover, a line skip, a ticket: no note field, and a line about the door. */
  door?: boolean;
  onSave: (next: { qty: number; picks: Record<string, string[]>; note: string }) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [picks, setPicks] = useState<Record<string, string[]>>(() =>
    line ? { ...line.picks } : Object.fromEntries(groups.map((g) => [g.id, [...g.defaults]])),
  );
  const [qty, setQty] = useState(line?.qty ?? 1);
  const [note, setNote] = useState(line?.note ?? "");
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  /* Leave with the motion, then unmount: the parent drops us after `close`
     fires, which happens once the exit has run (or at once, reduced). */
  const close = () => {
    if (closing) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, 200);
  };

  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (g: OptionGroup, id: string) => {
    setPicks((p) => {
      const cur = p[g.id] ?? [];
      if (g.select === "single") return { ...p, [g.id]: [id] };
      if (cur.includes(id)) return { ...p, [g.id]: cur.filter((x) => x !== id) };
      if (g.max && cur.length >= g.max) return p;
      return { ...p, [g.id]: [...cur, id] };
    });
  };

  const unit = unitCents(item, groups, picks);
  const total = unit * qty;
  const points = Math.floor((unit * POINTS_PER_DOLLAR) / 100);

  const sheet = (
    <div
      className={`isheet-root${closing ? " is-closing" : ""}`}
      data-surface="app"
      onClick={close}
    >
      <div className="isheet-scrim" aria-hidden="true" />
      <div
        className="isheet"
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="isheet-grab" aria-hidden="true" />
        <div className="isheet-hero">
          {item.img ? (
            <img src={item.img} alt="" decoding="async" />
          ) : (
            <span className="isheet-plate" aria-hidden="true" />
          )}
          <button type="button" className="isheet-close" onClick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="isheet-scroll">
          <div className="isheet-id">
            <h2>{item.name}</h2>
            {item.desc ? <p className="isheet-desc">{item.desc}</p> : null}
            <p className="isheet-price">
              <b className="tnum">{money(unit)}</b>
              <span className="isheet-pts">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" fill="currentColor" />
                </svg>
                <span className="tnum">{points}</span> points
              </span>
            </p>
          </div>

          {groups.map((g) => {
            const cur = picks[g.id] ?? [];
            const full = g.select === "multiple" && !!g.max && cur.length >= g.max;
            return (
              <fieldset className="isheet-grp" key={g.id}>
                <legend className="isheet-grp-head">
                  <b>{g.label}</b>
                  <span>
                    {g.select === "single" ? "Choose one" : `Up to ${g.max ?? "any"}`}
                    {g.required ? " · Required" : ""}
                  </span>
                </legend>
                {g.options.map((o) => {
                  const on = cur.includes(o.id);
                  const disabled = !on && full;
                  return (
                    <label className={`isheet-opt${disabled ? " is-off" : ""}`} key={o.id}>
                      <input
                        type={g.select === "single" ? "radio" : "checkbox"}
                        name={`${item.id}-${g.id}`}
                        checked={on}
                        disabled={disabled}
                        onChange={() => pick(g, o.id)}
                      />
                      <i className={g.select === "single" ? "isheet-radio" : "isheet-check"} aria-hidden="true">
                        {g.select === "multiple" ? (
                          <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        ) : null}
                      </i>
                      <span>{o.label}</span>
                      <em className="tnum">{o.deltaCents ? `+${money(o.deltaCents)}` : "Included"}</em>
                    </label>
                  );
                })}
              </fieldset>
            );
          })}

          {door ? (
            <p className="isheet-door">
              Shown at the door from your phone. Some places scan.
            </p>
          ) : null}
          {!door ? (
          <div className="isheet-grp">
            <p className="isheet-grp-head">
              <b>Anything else?</b>
              <span>Optional</span>
            </p>
            <textarea
              className="isheet-note"
              rows={2}
              placeholder="Extra hot, light foam…"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 140))}
            />
          </div>
          ) : null}

          <div className="isheet-qty">
            <span>Quantity</span>
            <span className="isheet-step">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer" disabled={qty <= 1}>
                &minus;
              </button>
              <b className="tnum">{qty}</b>
              <button type="button" onClick={() => setQty((q) => Math.min(9, q + 1))} aria-label="One more">
                +
              </button>
            </span>
          </div>

          {groups.length ? (
            <p className="isheet-ex">
              Example options. The menu we have carries no choices yet — these show the shape,
              not what the kitchen actually offers.
            </p>
          ) : null}
        </div>

        <div className="isheet-bar">
          {line ? (
            <button type="button" className="isheet-remove" onClick={onRemove}>
              Remove
            </button>
          ) : null}
          <button
            type="button"
            className="action isheet-add"
            onClick={() => onSave({ qty, picks, note })}
          >
            {line ? "Update" : "Add to order"} · <span className="tnum">{money(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
