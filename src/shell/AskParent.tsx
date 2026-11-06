import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/auth_context";
import { useEventTracking } from "../context/event_tracking_context";
import { PARENTS_BACKEND_LIVE, createAskLink, parentMock } from "../model/parents";

/* ══ ASK A PARENT TO COVER IT (docs/parents/HANDOFF.md, "Ask a parent") ═════
   A quiet text button for a signed-in student who isn't a member yet. It
   makes a link (ask_link_create; a server token, never the number) and hands
   it to the share sheet where there is one, else copies it and offers a
   text. The parent's page then reads "[Name] asked you to cover their Tapin
   Plus". Placed under the wallet on the checkout's pay step and on Members.

   Hidden for anyone signed out or already a member. Local dev: ?parentmock
   shows it signed out too, so it can be looked at. */

const ASK = "Can you cover my Tapin Plus?";

const still = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** iOS reads sms:&body=, Android sms:?body=; "sms:?&body=" works on both. */
const smsHref = (url: string) => `sms:?&body=${encodeURIComponent(`${ASK} ${url}`)}`;

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function AskParent({ where, className }: { where: "checkout" | "members"; className?: string }) {
  const { accessToken, subscribed, displayName } = useAuth();
  const { track } = useEventTracking();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = panel.current;
    if (!open || !el || still() || typeof el.animate !== "function") return;
    el.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], {
      duration: 240,
      easing: "cubic-bezier(.22,1,.36,1)",
    });
  }, [open]);

  const mock = parentMock();
  if (!mock && (!PARENTS_BACKEND_LIVE || !accessToken || subscribed === true)) return null;

  const share = async (link: string): Promise<"shared" | "dismissed" | "unavailable"> => {
    if (typeof navigator.share !== "function") return "unavailable";
    try {
      await navigator.share({ text: ASK, url: link });
      return "shared";
    } catch (e) {
      /* The person closed the sheet: that's their answer, not a failure.
         Anything else (often the tap's permission running out while the
         link was made) falls back to the panel, whose Share is a new tap. */
      return (e as DOMException)?.name === "AbortError" ? "dismissed" : "unavailable";
    }
  };

  /* The panel opens at once; the copy lands when the browser allows it (a
     clipboard that never answers must not hold the panel back). */
  const showPanel = (link: string) => {
    setCopied(false);
    setOpen(true);
    void copy(link).then(setCopied);
  };

  const ask = async () => {
    setError(null);
    let link = url;
    if (!link) {
      setBusy(true);
      try {
        const first = displayName?.trim().split(/\s+/)[0] || undefined;
        link = (await createAskLink(accessToken ?? "", first)).url;
        setUrl(link);
        track("ask_link_created", { where });
      } catch (e) {
        setError((e as Error).message);
        return;
      } finally {
        setBusy(false);
      }
    }
    const how = await share(link);
    if (how === "shared") track("ask_link_shared", { where, method: "share" });
    if (how === "unavailable") showPanel(link);
  };

  return (
    <div className={`askp${className ? ` ${className}` : ""}`}>
      <button type="button" className="askp-btn" onClick={ask} disabled={busy} aria-expanded={open}>
        {busy ? "Making your link…" : "Ask a parent to cover it"}
      </button>
      {error ? (
        <p className="askp-error" role="alert">
          {error}
        </p>
      ) : null}
      {open && url ? (
        <div ref={panel} className="askp-panel">
          <p className="askp-line" role="status">
            {copied ? "Link copied. Send it to a parent; it works for 14 days." : "Send this link to a parent; it works for 14 days."}
          </p>
          <p className="askp-url">{url}</p>
          <div className="askp-acts">
            <a className="askp-act" href={smsHref(url)} onClick={() => track("ask_link_shared", { where, method: "sms" })}>
              Text it
            </a>
            {typeof navigator.share === "function" ? (
              <button
                type="button"
                className="askp-act"
                onClick={async () => (await share(url)) === "shared" && track("ask_link_shared", { where, method: "share" })}
              >
                Share
              </button>
            ) : (
              <button
                type="button"
                className="askp-act"
                onClick={async () => {
                  const ok = await copy(url);
                  setCopied(ok);
                  if (ok) track("ask_link_shared", { where, method: "copy" });
                }}
              >
                {copied ? "Copy again" : "Copy link"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
