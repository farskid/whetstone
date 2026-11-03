import { useEffect } from 'react';

/** How long the "Cracked" effect stays on screen. Matches the `crack-*` animations in styles.css. */
export const CRACKED_MS = 1900;

/** An open padlock. The shackle lifts and swings, a crack runs across the body. */
export function CrackLock({ className = '' }: { className?: string }) {
  return (
    <svg className={`crack-lock ${className}`} viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <path className="cl-shackle" d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <rect className="cl-body" x="4.5" y="11" width="15" height="10.5" rx="2.4" fill="currentColor" />
      <path className="cl-crack" d="M12 11.6 10.6 14.4 13.2 16.1 11.2 18.4 12.6 21" fill="none" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A green sweep over the editor and tests and a stamp whose padlock springs open. Two uses:
 * - the whole problem passed: "Cracked", click-through, gone after CRACKED_MS (calls onDone);
 * - a stage passed: "Stage k cleared", which stays with a button to the next stage (the way forward) and a dismiss.
 * Reduced motion gets a fade only.
 */
export function CrackedEffect(props:
  | { kind: 'cracked'; total: number; onDone: () => void }
  | { kind: 'stage'; stage: number; nextTitle: string; onGo: () => void; onStay: () => void }) {
  const onDone = props.kind === 'cracked' ? props.onDone : undefined;
  useEffect(() => {
    if (!onDone) return;
    const t = setTimeout(onDone, CRACKED_MS);
    return () => clearTimeout(t);
  }, [onDone]);
  if (props.kind === 'cracked') {
    return (
      <div className="cracked-fx" data-testid="cracked-fx" data-kind="cracked" aria-hidden="true">
        <div className="cracked-sweep" />
        <div className="cracked-stamp">
          <CrackLock className="open" />
          <span className="cracked-word">Cracked</span>
          <span className="cracked-sub">All {props.total} tests green</span>
        </div>
      </div>
    );
  }
  const { stage, nextTitle, onGo, onStay } = props;
  return (
    <div className="cracked-fx stay" data-testid="cracked-fx" data-kind="stage">
      <div className="cracked-sweep" aria-hidden="true" />
      <div className="cracked-stamp stay" role="dialog" aria-label={`Stage ${stage + 1} cleared`} data-testid="stage-cleared">
        <CrackLock className="open" />
        <span className="cracked-word">Stage {stage + 1} cleared</span>
        <span className="cracked-sub">Next: stage {stage + 2}, {nextTitle}. Your code carries over.</span>
        <div className="cracked-actions">
          <button className="btn primary go-next" onClick={onGo} data-testid="go-next-stage">Go to stage {stage + 2} →</button>
          <button className="btn ghost small" onClick={onStay} data-testid="stay-on-stage">Stay on stage {stage + 1}</button>
        </div>
      </div>
    </div>
  );
}
