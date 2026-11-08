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
   canceled, or refunded. Under it, three rows (Rows below): skip a month and
   request a refund email support; cancel has a confirm step, and Plus stays
   until the end of the paid month. Plain and calm, in the app's look
   (styles/plus-app.css .tpa, styles/parent-pages.css .ppm).

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

      {active ? <Rows info={info} name={name} until={until} mode={mode} setMode={setMode} busy={busy} act={act} error={error} /> : null}
    </>
  );
}

/* ══ THE THREE ROWS (Sam, 8 Nov 2026: "Fix 1 · A · Three rows") ════════════
   Skip a month, Request my refund, Cancel Tapin Plus: at first glance just
   three labels; each opens in place with one line and one button. Skip and
   refund are a person today ("none of this works yet, but you can check a box
   and we'll manually pause accounts"), so both open an email to support with
   the subject filled in and only the student's first name in it. Cancel is
   the page's own cancel (parent_manage "cancel"), unchanged. */
const SUPPORT = "support@tapin.app";
type RowKey = "skip" | "refund" | "cancel";

/** A mailto with the subject and one line filled in. Straight apostrophes,
 *  so every mail app shows them; nothing but the first name goes in. */
const mailto = (subject: string, body: string) =>
  `mailto:${SUPPORT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const ICON: Record<RowKey, string> = {
  skip: "M5 5.5h14A1.5 1.5 0 0 1 20.5 7v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5ZM3.5 10h17M8 3.5v4M16 3.5v4M9.5 13.5l5 4M14.5 13.5l-5 4",
  refund: "M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v3.5H8",
  cancel: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM9 9l6 6M15 9l-6 6",
};
const Glyph = ({ d, className }: { d: string; className: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Rows({
  info,
  name,
  until,
  mode,
  setMode,
  busy,
  act,
  error,
}: {
  info: ManageInfo;
  name: string;
  until: string;
  mode: Mode;
  setMode: (m: Mode) => void;
  busy: boolean;
  act: (action: "cancel") => Promise<boolean>;
  error: string | null;
}) {
  const { track } = useEventTracking();
  /* Skip and refund open here; cancel is the page's confirm-cancel mode, so
     its error shows in its own panel as before. One row open at a time. */
  const [opened, setOpened] = useState<"skip" | "refund" | null>(null);
  const current: RowKey | null = mode === "confirm-cancel" ? "cancel" : opened;
  const toggle = (k: RowKey) => {
    const on = current !== k;
    if (k === "cancel") {
      setOpened(null);
      setMode(on ? "confirm-cancel" : "view");
    } else {
      setOpened(on ? k : null);
      if (mode === "confirm-cancel") setMode("view");
    }
  };

  const first = info.student_first_name?.trim() || "";
  const theirs = first ? `${first}'s Tapin Plus` : "my student's Tapin Plus";
  const when = info.next_charge_on ? new Date(info.next_charge_on) : null;
  const month = when && !Number.isNaN(when.getTime()) ? when.toLocaleDateString("en-US", { month: "long" }) : "";
  const chargeDay = day(info.next_charge_on);

  const skipHref = mailto(
    first ? `Skip a month: ${first}'s Tapin Plus` : "Skip a month: Tapin Plus",
    `I'd like to skip ${month || "a month"} for ${theirs}.`,
  );
  const refundHref = mailto(
    first ? `Refund request: ${first}'s Tapin Plus` : "Refund request: Tapin Plus",
    `I'd like to request a refund for ${theirs}.`,
  );

  const rows: { k: RowKey; label: string; body: React.ReactNode }[] = [
    {
      k: "skip",
      label: "Skip a month",
      body: (
        <>
          <p className="ppm-more-line">
            {chargeDay ? `A person skips the ${chargeDay} charge for you.` : "A person skips your next charge for you."}
          </p>
          <div className="ppm-row-acts">
            <a className="tpa-cta ppm-btn" href={skipHref} onClick={() => track("parent_manage_skip_email", { signed_in: info.signed_in })}>
              {month ? `Email support to skip ${month}` : "Email support to skip a month"}
            </a>
          </div>
        </>
      ),
    },
    {
      k: "refund",
      label: "Request my refund",
      body: (
        <>
          <p className="ppm-more-line">{`Full refund if ${first || "your student"} doesn’t save what you spent.`}</p>
          <div className="ppm-row-acts">
            <a className="tpa-cta ppm-btn" href={refundHref} onClick={() => track("parent_manage_refund_email", { signed_in: info.signed_in })}>
              Email support
            </a>
          </div>
        </>
      ),
    },
    {
      k: "cancel",
      label: "Cancel Tapin Plus",
      body: (
        <>
          <p className="ppm-more-line tnum">
            {until
              ? `Plus stays on until ${until}, the end of the month you’ve paid for. You won’t be charged again.`
              : "Plus stays on until the end of the month you’ve paid for. You won’t be charged again."}
          </p>
          {error ? (
            <p className="ppm-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="ppm-row-acts">
            <button type="button" className="tpa-cta ppm-btn" disabled={busy} onClick={() => act("cancel")}>
              {busy ? "Canceling…" : "Yes, cancel"}
            </button>
            <button type="button" className="tpa-try ppm-btn" disabled={busy} onClick={() => setMode("view")}>
              Keep it
            </button>
          </div>
        </>
      ),
    },
  ];

  return (
    <section className="tpa-module ppm-card ppm-rows" aria-label={`Manage ${possessive(name)} Tapin Plus`}>
      {rows.map((r) => (
        <Row key={r.k} k={r.k} label={r.label} on={current === r.k} onToggle={() => toggle(r.k)} disabled={busy}>
          {r.body}
        </Row>
      ))}
    </section>
  );
}

function Row({
  k,
  label,
  on,
  onToggle,
  disabled,
  children,
}: {
  k: RowKey;
  label: string;
  on: boolean;
  onToggle: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const chev = useRef<SVGSVGElement | null>(null);
  const more = useRef<HTMLDivElement | null>(null);
  const was = useRef(on);
  useEffect(() => {
    if (was.current === on) return;
    was.current = on;
    if (on) rise(more.current);
    const el = chev.current;
    if (el && !still() && typeof el.animate === "function")
      el.animate([{ transform: on ? "none" : "rotate(90deg)" }, { transform: on ? "rotate(90deg)" : "none" }], { duration: 200, easing: ease });
  }, [on]);
  const id = `ppm-more-${k}`;
  return (
    <div className="ppm-row" data-k={k}>
      <button type="button" className="ppm-row-head" aria-expanded={on} aria-controls={id} disabled={disabled && k === "cancel"} onClick={onToggle}>
        <Glyph className="ppm-row-glyph" d={ICON[k]} />
        <span>{label}</span>
        <svg ref={chev} className="ppm-row-chev" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div ref={more} id={id} className="ppm-more" hidden={!on}>
        {children}
      </div>
    </div>
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
