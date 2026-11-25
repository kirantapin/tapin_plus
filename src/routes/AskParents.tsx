import { useState } from "react";
import { Link } from "react-router-dom";
import { useEventTracking } from "../context/event_tracking_context";
import { askMessage, cleanFirstName, smsHref, usMobile } from "../model/askParent";
import PlacePopup, { type PlacePopupPlace } from "../shell/PlacePopup";
import { device } from "../shell/GetTheApp";
import { DeskGrid } from "./ClaimDesk";
import { Page } from "./ClaimSeat";
import { Benefits, Foot } from "./MembersPass";
import { FlatMark } from "./parents_kit";

/* ══ /ask: ASK A PARENT FOR PLUS (Sam, 25 Nov 2026: "a page where students
   can request to have their parents gift them tapin plus ... Basically it'd
   be what we have for parents but inversed") ═══════════════════════════════
   /claim's Split: on the dark panel, their first name and (if they like) a
   parent's number, then one button that opens their own Messages with the
   ask written and addressed (model/askParent.ts). The parent's link is
   /parents?for=<name>, which greets them and starts the gift on that name.
   A computer can't always send a text, so the message can be copied too.
   On the right: what they're asking for, the places, and how the gift works. */

const STEPS = [
  { h: "You send the ask", p: "From your own phone, so it comes from you." },
  { h: "They send it with a note", p: "Your parent pays on plus.tapin.app/parents and writes you a note." },
  { h: "You get a text", p: "Open it, and your Plus is on: $25 to spend at Blacksburg spots every month." },
];

export default function AskParents() {
  const { track } = useEventTracking();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [placeOpen, setPlaceOpen] = useState<PlacePopupPlace | null>(null);
  const first = cleanFirstName(name);
  const to = phone.trim() ? usMobile(phone) : null;
  const ready = !!first && (!phone.trim() || !!to);

  const check = (): boolean => {
    if (!first) {
      setError("Add your first name, so they know it’s you.");
      return false;
    }
    if (phone.trim() && !to) {
      setError("That number doesn’t look right. Use a US mobile, or leave it blank.");
      return false;
    }
    setError(null);
    return true;
  };

  const copy = async () => {
    if (!check()) return;
    try {
      await navigator.clipboard.writeText(askMessage(first));
      setCopied(true);
      track("ask_parent_copied");
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setError("Couldn’t copy here. Select the message below and copy it.");
    }
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
              <h1 className="sp-h">Ask your parents for Plus.</h1>
              <p className="sp-lede">Send them a text from your phone. They can gift you Tapin Plus this holiday season, with a note from them.</p>
              <form
                className="ask-form ph-no-capture"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
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
                  <span>
                    Your parent’s mobile <small>(optional)</small>
                  </span>
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
                {error ? (
                  <p className="ask-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="ask-acts">
                  <a
                    className="sp-cta ask-send"
                    href={ready ? smsHref(to, askMessage(first)) : "#"}
                    aria-disabled={!ready}
                    onClick={(e) => {
                      if (!check()) {
                        e.preventDefault();
                        return;
                      }
                      track("ask_parent_texted", { has_number: !!to, device: device() });
                    }}
                  >
                    Text my parent
                  </a>
                  <button type="button" className="ask-copy" onClick={copy}>
                    {copied ? "Copied" : "Copy the message"}
                  </button>
                </div>
                <p className="sp-fine">
                  It opens your Messages with the text written. You send it, from your number. We don’t text your parent.
                </p>
              </form>
              {first ? (
                <figure className="ask-preview ph-no-capture" aria-label="Your text">
                  <figcaption>Your text</figcaption>
                  <p>{askMessage(first)}</p>
                </figure>
              ) : null}
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
