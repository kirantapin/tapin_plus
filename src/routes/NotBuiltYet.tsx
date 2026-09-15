import { Panel } from "../shell/Panel";

/**
 * Honest placeholder for the routes this pass does not build. It claims
 * nothing and states no price.
 */
export default function NotBuiltYet({ pass, title }: { pass: number; title: string }) {
  return (
    <Panel label={`Pass ${pass} of 4`}>
      <h1 className="t-headline">{title}</h1>
      <p className="t-body" style={{ marginTop: "var(--s-lg)" }}>
        Not built yet.
      </p>
    </Panel>
  );
}
