import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useEventTracking } from "../context/event_tracking_context";
import { ASK_ERRORS, askMessage, cleanFirstName, sendAsk, smsHref, tapinAskText, usMobile } from "../model/askParent";
import { useAuth } from "../context/auth_context";
import { supabase } from "../supabase";
import { openPlusSignIn } from "../shell/PlusCheckout";
import PlacePopup, { type PlacePopupPlace } from "../shell/PlacePopup";
import { device } from "../shell/GetTheApp";
import { DeskGrid } from "./ClaimDesk";
import { Page } from "./ClaimSeat";
import { Benefits, Foot } from "./MembersPass";
import { FlatMark } from "./parents_kit";

/* ══ /ask: ASK A PARENT FOR PLUS (Sam, 25 Nov 2026: "a page where students
   can request to have their parents gift them tapin plus ... Basically it'd
   be what we have for parents but inversed") ═══════════════════════════════
   /claim's Split: on the dark panel, their first name, a parent's number and
   a tick that the parent is OK with one text; Send signs them in if needed,
   then Tapin texts the parent (api/ask-parent.js, Sam's pick: "Tapin texts
   the parent"). The parent's link is /parents?for=<name>, which greets them
   and starts the gift on that name. "Or text it yourself" opens their own
   Messages with the ask, for when ours can't go.
   On the right: what they're asking for, the places, and how the gift works. */

const STEPS = [
  { h: "We text your parent", p: "Once, with your first name and a link to send you Plus." },
  { h: "They send it with a note", p: "Your parent pays on plus.tapin.app/parents and writes you a note." },
  { h: "You get a text", p: "Open it, and your Plus is on: $25 to spend at Blacksburg spots every month." },
];

export default function AskParents() {
  const { track } = useEventTracking();
  const { userSession, subscribed } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [okd, setOkd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ masked: string; left: number } | null>(null);
  /* Signed out when they pressed Send: it goes once they're signed in. */
  const [pending, setPending] = useState(false);
  const [placeOpen, setPlaceOpen] = useState<PlacePopupPlace | null>(null);
  const first = cleanFirstName(name);
  const to = usMobile(phone);

  const check = (): boolean => {
    if (!first) return fail("name");
    if (!to) return fail("number");
    if (!okd) {
      setError("Tick the box to say they’re your parent and OK with one text.");
      return false;
    }
    setError(null);
    return true;
  };
  function fail(code: string): false {
    setError(ASK_ERRORS[code] ?? ASK_ERRORS.try_again);
    return false;
  }

  const send = async () => {
    if (!check() || !to || sending) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setPending(true);
      track("ask_parent_signin");
      openPlusSignIn("ask");
      return;
    }
    setSending(true);
    const r = await sendAsk(token, first, to);
    setSending(false);
    if (r.ok) {
      setSent({ masked: r.masked, left: r.left });
      track("ask_parent_sent", { left: r.left });
    } else {
      fail(r.error);
      track("ask_parent_failed", { reason: r.error });
    }
  };

  /* Signed in from the Send button: send it now. */
  useEffect(() => {
    if (!pending || !userSession) return;
    setPending(false);
    void send();
  }, [pending, userSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const again = () => {
    setSent(null);
    setPhone("");
    setOkd(false);
  };

  return (
    <Page title="Ask for Tapin Plus · Tapin Plus" className="tpa tpa-home tps cs cs-split ask">
      <div className="sp">
        <aside className="sp-left">
          <Link className="sp-brand" to="/">
            <FlatMark className="sp-mark" />
            Tapin Plus Blacksburg
          </Link>
          <div className="sp-mid">
            <div className="sp-txt">
              {sent ? (
                <>
                  <h1 className="sp-h">Asked.</h1>
                  <p className="sp-lede">
                    We texted your parent at <span className="ph-no-capture">{sent.masked}</span>. When they send it, you’ll get a text with your Tapin Plus.
                  </p>
                  {sent.left > 0 ? (
                    <button type="button" className="sp-cta" onClick={again}>
                      Ask another parent
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <h1 className="sp-h">Ask your parents for Plus.</h1>
                  <p className="sp-lede">Add their number and we’ll text them your ask. They can gift you Tapin Plus this holiday season, with a note from them.</p>
                  {subscribed === true ? <p className="sp-fine">You’re already a Plus member, so there’s nothing to ask for.</p> : null}
                  <form
                    className="ask-form ph-no-capture"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send();
                    }}
                  >
                    <label className="ask-field">
                      <span>Your first name</span>
                      <input
                        type="text"
                        autoComplete="given-name"
                        autoCapitalize="words"
                        maxLength={24}
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setError(null);
                        }}
                        placeholder="Maya"
                      />
                    </label>
                    <label className="ask-field">
                      <span>Your parent’s mobile</span>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setError(null);
                        }}
                        placeholder="(540) 555-0123"
                      />
                    </label>
                    <label className="ask-ok">
                      <input
                        type="checkbox"
                        checked={okd}
                        onChange={(e) => {
                          setOkd(e.target.checked);
                          setError(null);
                        }}
                      />
                      <span>This is my parent, and they’re OK with one text from Tapin about it.</span>
                    </label>
                    {error ? (
                      <p className="ask-error" role="alert">
                        {error}
                      </p>
                    ) : null}
                    <div className="ask-acts">
                      <button type="submit" className="sp-cta ask-send" disabled={sending || subscribed === true} aria-busy={sending || undefined}>
                        {sending ? "Sending…" : userSession ? "Send to my parent" : "Sign in and send"}
                      </button>
                      {first ? (
                        <a
                          className="ask-copy"
                          href={smsHref(to, askMessage(first))}
                          onClick={() => track("ask_parent_texted_self", { device: device() })}
                        >
                          Or text it yourself
                        </a>
                      ) : null}
                    </div>
                    <p className="sp-fine">
                      {userSession ? "" : "You’ll sign in with your number first, so they know it’s really you. "}We text them once, from Tapin, with your first name. They can reply STOP.
                    </p>
                  </form>
                  {first ? (
                    <figure className="ask-preview ph-no-capture" aria-label="What they’ll get">
                      <figcaption>What they’ll get</figcaption>
                      <p>{tapinAskText(first)}</p>
                    </figure>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </aside>
        <main className="sp-right">
          <section className="sp-sec" aria-labelledby="ask-how">
            <span className="sp-kick">How it works</span>
            <h2 id="ask-how" className="sp-h2">
              Three steps to Plus
            </h2>
            <ol className="cl-steps">
              {STEPS.map((s) => (
                <li key={s.h}>
                  <b>{s.h}</b>
                  <span>{s.p}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="sp-sec" aria-labelledby="ask-get">
            <span className="sp-kick">What you’re asking for</span>
            <h2 id="ask-get" className="sp-h2">
              Every month with Plus
            </h2>
            <Benefits className="cl-ben" />
          </section>
          <section className="sp-sec" aria-labelledby="ask-places">
            <span className="sp-kick">8 Blacksburg spots</span>
            <h2 id="ask-places" className="sp-h2">
              Where you’d use it
            </h2>
            <DeskGrid onOpen={setPlaceOpen} />
          </section>
          <div className="mv cs-foot">
            <Foot promise={false} onMail={() => track("ask_parent_email")} />
          </div>
        </main>
      </div>
      {placeOpen ? <PlacePopup place={placeOpen} cta="Got it" onClose={() => setPlaceOpen(null)} onJoin={() => setPlaceOpen(null)} /> : null}
    </Page>
  );
}
