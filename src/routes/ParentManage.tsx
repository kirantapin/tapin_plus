import { takeKey } from "../model/redact";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { asset } from "../asset";
import MemberDot from "../shell/MemberDot";
import { useEventTracking } from "../context/event_tracking_context";
import { manageParent, toE164, type ManageInfo } from "../model/parents";

/* ══ THE PARENT'S MANAGE PAGE (/parents/manage/:token) ══════════════════════
   The link in the parent's receipt email (docs/parents/API.md, parent_manage).
   No login: the token is the key. It says whose Plus this is, the masked
   number, and where it stands: waiting for the student to sign in (resend
   the text, change the number, entered twice), active with the next charge,
   canceled, or refunded. Cancel has a confirm step; Plus stays until the end
   of the paid month. Plain and calm, in the app's look (styles/plus-app.css
   .tpa, styles/parent-pages.css .ppm).

   Local dev: /parents/manage/mock?parentmock walks it with the mock
   (model/parents.ts); add &signedin for the signed-in state. */

const PAPER_MARK = asset("/brand/plus-paper-mark.svg");
const TERMS_URL = "https://go.tapin.app/terms-and-conditions";
const PRIVACY_URL = "https://go.tapin.app/privacy-policy";

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ease = "cubic-bezier(.22,1,.36,1)";

const usd = (cents?: number) => (typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "");
function day(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}
/** "Alex's", "James'"? Keep it simple and always add 's. */
const possessive = (name: string) => `${name}’s`;

/** A quiet rise for what just appeared, or nothing with reduced motion. */
function rise(el: HTMLElement | null) {
  if (!el || still() || typeof el.animate !== "function") return;
  el.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: ease });
}

type Mode = "view" | "change" | "confirm-cancel";

export default function ParentManage() {
  const { token: fromPath } = useParams();
  /* The key out of the address before anything reads the URL (App's
     pageview, analytics), kept for this tab so a reload still works. */
  const [token] = useState(() => takeKey("tp_parent_manage_v1", fromPath ?? null, `/parents/manage${typeof window !== "undefined" ? window.location.search : ""}`) ?? "");
  const { track } = useEventTracking();
  const page = useRef<HTMLDivElement | null>(null);
  const [info, setInfo] = useState<ManageInfo | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /* The paid month's end, kept from before a cancel so the canceled state
     can still say until when Plus stays on. */
  const endsOn = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = "tpa";
    window.scrollTo(0, 0);
    /* The token is a key: keep it out of search engines and out of the
       Referer of anything this page links to. */
    const metas = [
      Object.assign(document.createElement("meta"), { name: "robots", content: "noindex, nofollow" }),
      Object.assign(document.createElement("meta"), { name: "referrer", content: "no-referrer" }),
    ];
    metas.forEach((m) => document.head.appendChild(m));
    const title = document.title;
    document.title = "Manage Tapin Plus";
    if (!still()) page.current?.animate?.([{ opacity: 0, transform: "scale(1.02)" }, { opacity: 1, transform: "none" }], { duration: 340, easing: ease });
    return () => {
      delete root.dataset.surface;
      metas.forEach((m) => m.remove());
      document.title = title;
    };
  }, []);

  /* A new step starts clean: no "Sent" or error left over from the last. */
  const go = useCallback((m: Mode) => {
    setNote(null);
    setError(null);
    setMode(m);
  }, []);

  const keep = useCallback((next: ManageInfo) => {
    if (next.next_charge_on) endsOn.current = next.next_charge_on;
    setInfo(next);
  }, []);

  useEffect(() => {
    let live = true;
    manageParent(token, "status")
      .then((i) => {
        if (!live) return;
        keep(i);
        track("parent_manage_view", { status: i.status, signed_in: i.signed_in });
      })
      .catch((e: Error) => live && setFailed(e.message));
    return () => {
      live = false;
    };
  }, [token, keep, track]);

  const act = async (action: "resend" | "cancel" | "change_number", newPhone?: string) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const next = await manageParent(token, action, newPhone);
      keep(next);
      setMode("view");
      if (action === "resend") setNote(`Sent. We’ve texted ${next.masked_phone} again.`);
      if (action === "change_number") setNote(`Saved. We’ve texted ${next.masked_phone}.`);
      track(action === "resend" ? "parent_manage_resend" : action === "cancel" ? "parent_manage_cancel" : "parent_manage_number_changed", {
        signed_in: next.signed_in,
      });
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={page} className="tpa ppm">
      <header className="ppm-top">
        <img className="ppm-mark" src={PAPER_MARK} alt="" width="40" height="32" decoding="async" />
        <span>Tapin Plus</span>
      </header>

      <main className="ppm-main">
        {failed ? (
          <section className="tpa-module ppm-card" aria-labelledby="ppm-title">
            <h1 id="ppm-title" className="ppm-h1">
              This link didn’t open
            </h1>
            <p className="ppm-line">
              Use the manage link in your receipt email. If it still doesn’t work, email support@tapin.app and a person will
              help.
            </p>
            <p className="ppm-sub">{failed}</p>
          </section>
        ) : !info ? (
          <section className="tpa-module ppm-card ppm-wait" aria-busy="true" aria-label="Loading" />
        ) : (
          <Status info={info} endsOn={endsOn.current} mode={mode} setMode={go} busy={busy} act={act} note={note} error={error} />
        )}

        <footer className="tpa-foot ppm-foot">
          <p>
            Questions? Email <a href="mailto:support@tapin.app">support@tapin.app</a> and a person will sort it out.
          </p>
          <p className="tpa-links">
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
              Terms
            </a>
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

function Status({
  info,
  endsOn,
  mode,
  setMode,
  busy,
  act,
  note,
  error,
}: {
  info: ManageInfo;
  endsOn?: string;
  mode: Mode;
  setMode: (m: Mode) => void;
  busy: boolean;
  act: (action: "resend" | "cancel" | "change_number", newPhone?: string) => Promise<boolean>;
  note: string | null;
  error: string | null;
}) {
  const name = info.student_first_name || "Your student";
  const active = info.status === "active";
  const waiting = active && !info.signed_in;
  const until = day(info.next_charge_on ?? endsOn);
  const panel = useRef<HTMLDivElement | null>(null);
  useEffect(() => rise(panel.current), [mode]);

  let line: string;
  if (waiting)
    line = `Waiting for ${name} to sign in to Tapin.`;
  else if (active)
    line = info.next_charge_on && typeof info.next_charge_cents === "number"
      ? `Active. Next charge ${usd(info.next_charge_cents)} on ${day(info.next_charge_on)}.`
      : "Active.";
  else if (info.status === "canceled")
    line = until && new Date(info.next_charge_on ?? endsOn ?? 0).getTime() > Date.now()
      ? `Canceled. ${possessive(name)} Plus stays on until ${until}. You won’t be charged again.`
      : "Canceled. You won’t be charged again.";
  else if (info.status === "refunded") line = "Canceled and refunded in full. You won’t be charged again.";
  else line = "We haven’t received this payment, so nothing was charged.";

  return (
    <>
      <section className="tpa-module ppm-card" aria-labelledby="ppm-title">
        <h1 id="ppm-title" className="ppm-h1">
          {`${possessive(name)} Tapin Plus`}
        </h1>
        <p className={`ppm-state ppm-state-${waiting ? "waiting" : info.status}`}>
          {active && !waiting ? <MemberDot /> : <span className="ppm-dot" aria-hidden="true" />}
          <span>{line}</span>
        </p>
        <p className="ppm-sub">
          {waiting ? "Texted to " : "On "}
          <b className="tnum">{info.masked_phone}</b>
        </p>

        {note ? (
          <p className="ppm-note" role="status">
            {note}
          </p>
        ) : null}
        {error && mode !== "confirm-cancel" ? (
          <p className="ppm-error" role="alert">
            {error}
          </p>
        ) : null}

        {mode === "change" ? (
          <div ref={panel}>
            <ChangeNumber name={name} busy={busy} onCancel={() => setMode("view")} onSave={(p) => act("change_number", p)} />
          </div>
        ) : info.can_resend || info.can_change_number ? (
          <div className="ppm-acts">
            {info.can_resend ? (
              <button type="button" className="tpa-try ppm-btn" disabled={busy} onClick={() => act("resend")}>
                Resend the text
              </button>
            ) : null}
            {info.can_change_number ? (
              <button type="button" className="tpa-try ppm-btn" disabled={busy} onClick={() => setMode("change")}>
                Change number
              </button>
            ) : null}
          </div>
        ) : null}

        {info.status === "canceled" || info.status === "refunded" || info.status === "pending_payment" ? (
          <Link className="tpa-try ppm-btn ppm-again" to="/parents">
            Sign them up again
          </Link>
        ) : null}
      </section>

      {active ? (
        <section className="tpa-module ppm-card ppm-cancel" aria-label="Cancel">
          {mode === "confirm-cancel" ? (
            <div ref={panel} className="ppm-confirm">
              <h2 className="ppm-h2">{`Cancel ${possessive(name)} Tapin Plus?`}</h2>
              <p className="ppm-line">
                {until
                  ? `Plus stays on until ${until}, the end of the month you’ve paid for. You won’t be charged again.`
                  : "Plus stays on until the end of the month you’ve paid for. You won’t be charged again."}
              </p>
              {error ? (
                <p className="ppm-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="ppm-acts">
                <button type="button" className="tpa-cta ppm-btn ppm-yes" disabled={busy} onClick={() => act("cancel")}>
                  {busy ? "Canceling…" : "Yes, cancel"}
                </button>
                <button type="button" className="tpa-try ppm-btn" disabled={busy} onClick={() => setMode("view")}>
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="ppm-line">You can cancel anytime. {name} can cancel in the app too, and we’ll email you if they do.</p>
              <button type="button" className="ppm-quiet" disabled={busy} onClick={() => setMode("confirm-cancel")}>
                Cancel Tapin Plus
              </button>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}

/** The new number, entered twice, until the student first signs in. */
function ChangeNumber({
  name,
  busy,
  onCancel,
  onSave,
}: {
  name: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (e164: string) => Promise<boolean>;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [wrong, setWrong] = useState<string | null>(null);
  const first = useRef<HTMLInputElement | null>(null);
  useEffect(() => first.current?.focus({ preventScroll: true }), []);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const one = toE164(a);
    const two = toE164(b);
    if (!one) return setWrong("Enter a 10-digit US mobile number.");
    if (one !== two) return setWrong("The two numbers don’t match.");
    setWrong(null);
    void onSave(one);
  };
  return (
    <form className="ppm-form" onSubmit={submit} noValidate>
      <label className="ppm-label" htmlFor="ppm-new">
        {`${possessive(name)} new mobile number`}
      </label>
      <div className="ppm-field">
        <span aria-hidden="true">+1</span>
        {/* autocomplete off: "tel" would fill in the parent's own number. */}
        <input
          ref={first}
          id="ppm-new"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(540) 555-0123"
          value={a}
          onChange={(e) => setA(e.target.value)}
          aria-describedby="ppm-help"
        />
      </div>
      <label className="ppm-label" htmlFor="ppm-again">
        Confirm the number
      </label>
      <div className="ppm-field">
        <span aria-hidden="true">+1</span>
        <input
          id="ppm-again"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(540) 555-0123"
          value={b}
          onChange={(e) => setB(e.target.value)}
          aria-describedby="ppm-help"
        />
      </div>
      <p id="ppm-help" className="ppm-sub">
        We’ll text this number once to let them know. Their Plus is tied to it, so double-check it.
      </p>
      {wrong ? (
        <p className="ppm-error" role="alert">
          {wrong}
        </p>
      ) : null}
      <div className="ppm-acts">
        <button type="submit" className="tpa-cta ppm-btn" disabled={busy}>
          {busy ? "Saving…" : "Save and text them"}
        </button>
        <button type="button" className="tpa-try ppm-btn" disabled={busy} onClick={onCancel}>
          Never mind
        </button>
      </div>
    </form>
  );
}
