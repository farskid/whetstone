import { useState } from 'react';
import type { RunSummary, TestResult } from '../runner/types';

export type RunState =
  | { phase: 'idle' }
  | { phase: 'running'; results: TestResult[] }
  | { phase: 'done'; summary: RunSummary };

function Icon({ status }: { status?: TestResult['status'] | 'running' | 'idle' }) {
  if (status === 'pass') return <span className="ti pass" aria-label="passed">✓</span>;
  if (status === 'fail') return <span className="ti fail" aria-label="failed">✗</span>;
  if (status === 'timeout') return <span className="ti fail" aria-label="timed out">⏱</span>;
  if (status === 'running') return <span className="ti running" aria-label="running" />;
  return <span className="ti idle" aria-label="not run" />;
}

function Detail({ r }: { r: TestResult }) {
  return (
    <div className="t-detail">
      {r.input && (<><div className="k">Input</div><pre className="v">{r.input}</pre></>)}
      {r.error?.expected !== undefined && (<><div className="k">Expected</div><pre className="v expected">{r.error.expected}</pre></>)}
      {r.error?.actual !== undefined && (<><div className="k">Actual</div><pre className="v actual">{r.error.actual}</pre></>)}
      {r.error && (<><div className="k">Error</div><pre className="v err">{r.error.message}{r.error.stack ? `\n${r.error.stack}` : ''}</pre></>)}
      <div className="k">Console</div>
      <pre className="v console">{r.logs.length ? r.logs.join('\n') : <span className="muted">(no output)</span>}</pre>
    </div>
  );
}

export function Results({ titles, groups, state }: { titles: string[]; groups?: (string | undefined)[]; state: RunState }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const results: (TestResult | undefined)[] =
    state.phase === 'done' ? state.summary.results : state.phase === 'running' ? state.results : [];
  const summary = state.phase === 'done' ? state.summary : undefined;
  const firstFail = results.findIndex((r) => r && r.status !== 'pass');
  const passed = results.filter((r) => r?.status === 'pass').length;

  let headline: React.ReactNode;
  if (state.phase === 'idle') headline = <span className="muted">{titles.length} tests. Run them with the button or Ctrl/⌘ + Enter.</span>;
  else if (state.phase === 'running') headline = <span>Running… {results.length}/{titles.length}</span>;
  else if (summary?.compileError) headline = <span className="fail-text">Could not run your code</span>;
  else if (passed === titles.length) headline = <span className="pass-text" data-testid="all-passed">All {titles.length} tests passed</span>;
  else headline = <span className="fail-text">{passed}/{titles.length} tests passed</span>;

  return (
    <div className="results" data-testid="results">
      <div className="results-head">
        <strong>Tests</strong>
        <span className="results-headline">{headline}</span>
        {summary && !summary.compileError && <span className="muted small">{summary.results.reduce((a, r) => a + r.durationMs, 0)} ms</span>}
      </div>
      {summary?.compileError && <pre className="compile-error">{summary.compileError}</pre>}
      {summary?.aborted && <div className="aborted">{summary.aborted}</div>}
      {summary?.moduleLogs?.length ? (
        <details className="module-logs"><summary>Console output while loading your code ({summary.moduleLogs.length})</summary><pre>{summary.moduleLogs.join('\n')}</pre></details>
      ) : null}
      <ol className="test-list">
        {titles.map((title, i) => {
          const r = results[i];
          const status = r?.status ?? (state.phase === 'running' && i === results.length ? 'running' : 'idle');
          const failed = r && r.status !== 'pass';
          const isOpen = open[i] ?? (failed && i === firstFail);
          const group = groups?.[i];
          const header = group && group !== groups?.[i - 1]
            ? <li key={`g${i}`} className="t-group" aria-hidden="true">{group}</li> : null;
          return [header,
            <li key={i} className={`test ${r ? r.status : ''}`} data-status={r?.status ?? 'idle'}>
              <button className="t-row" onClick={() => r && setOpen((o) => ({ ...o, [i]: !isOpen }))} disabled={!r} aria-expanded={!!isOpen}>
                <Icon status={status} />
                <span className="t-title">{title}</span>
                {r && <span className="t-ms muted small">{r.durationMs} ms</span>}
                {r && <span className="t-caret muted">{isOpen ? '▾' : '▸'}</span>}
              </button>
              {r && isOpen && <Detail r={r} />}
            </li>,
          ];
        })}
      </ol>
    </div>
  );
}
