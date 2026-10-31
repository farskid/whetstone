import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { Problem } from '../problems/types';
import { getSources, toJs } from '../problems/sources';
import { useProgress, actions } from '../store';
import type { Language, TestResult } from '../runner/types';
import { runInWorker, type RunHandle } from '../runner/client';
import { monaco } from '../monaco';
import { href } from './router';
import { Markdown } from './Markdown';
import { Results, type RunState } from './Results';
import { Splitter } from './Splitter';
import { CodeView } from './CodeView';

type Ed = Parameters<OnMount>[0];

export function ProblemPage({ problem }: { problem: Problem }) {
  const progress = useProgress();
  const lang = progress.lang;
  const sources = useMemo(() => getSources(problem.id), [problem.id]);
  const starter = (l: Language) => (l === 'ts' ? sources.starterTs : toJs(sources.starterTs));
  const solution = lang === 'ts' ? sources.solutionTs : toJs(sources.solutionTs);
  const titles = useMemo(() => problem.tests.map((t) => t.title), [problem]);

  const [tab, setTab] = useState<'statement' | 'solution'>('statement');
  const [run, setRun] = useState<RunState>({ phase: 'idle' });
  const [leftW, setLeftW] = useState(() => Math.round(window.innerWidth * 0.4));
  const [resultsH, setResultsH] = useState(() => Math.round(window.innerHeight * 0.36));
  const editorRef = useRef<Ed | null>(null);
  const handleRef = useRef<RunHandle | null>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const solved = !!progress.solved[problem.id];
  const revealed = solved || !!progress.revealed[problem.id];
  const attempts = progress.attempts[problem.id] ?? 0;
  const initialCode = progress.code[problem.id]?.[lang] ?? starter(lang);

  useEffect(() => () => handleRef.current?.cancel(), []);

  const doRun = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    handleRef.current?.cancel();
    const source = ed.getValue();
    actions.setCode(problem.id, lang, source);
    const partial: TestResult[] = [];
    setRun({ phase: 'running', results: [] });
    const h = runInWorker(problem.id, titles, source, lang, (r) => {
      partial.push(r);
      setRun({ phase: 'running', results: [...partial] });
    });
    handleRef.current = h;
    h.promise.then((summary) => {
      if (handleRef.current !== h) return;
      setRun({ phase: 'done', summary });
      if (summary.aborted !== 'Cancelled.') {
        actions.recordAttempt(problem.id, !summary.compileError && summary.passed === summary.total, lang);
      }
    });
  }, [problem.id, titles, lang]);

  const runRef = useRef(doRun);
  runRef.current = doRun;

  const onMount: OnMount = (ed) => {
    editorRef.current = ed;
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
  };

  const reset = () => {
    if (!confirm(`Reset your ${lang === 'ts' ? 'TypeScript' : 'JavaScript'} code to the starter? Your current code for this language is lost.`)) return;
    const ed = editorRef.current;
    const model = ed?.getModel();
    const text = starter(lang);
    if (ed && model) {
      ed.pushUndoStop();
      model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
      ed.pushUndoStop();
    }
    actions.resetCode(problem.id, lang);
  };

  const reveal = () => {
    if (confirm('Reveal the reference solution before solving it? You can still solve it afterwards.')) actions.reveal(problem.id);
  };

  const running = run.phase === 'running';
  const monacoTheme = progress.theme === 'dark' ? 'vs-dark' : 'vs';

  return (
    <main className="problem-page">
      <div className="problem-bar">
        <a className="btn ghost small" href={href.list()}>← Problems</a>
        <h1 className="pb-title"><span className="cat-id">{problem.catalogId}</span>{problem.title}</h1>
        <span className={`diff d-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
        <span className="tag">{problem.theme}</span>
        {solved && <span className="solved-badge" data-testid="solved-badge">✓ Solved</span>}
        <div className="spacer" />
        <span className="muted small">{attempts} {attempts === 1 ? 'submission' : 'submissions'}</span>
      </div>
      <div className="workspace">
        <section className="left-pane" ref={leftRef} style={{ width: leftW }}>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'statement'} className={`tab ${tab === 'statement' ? 'on' : ''}`} onClick={() => setTab('statement')}>Description</button>
            <button role="tab" aria-selected={tab === 'solution'} className={`tab ${tab === 'solution' ? 'on' : ''}`} onClick={() => setTab('solution')}>
              Solution {revealed ? '' : '🔒'}
            </button>
          </div>
          <div className="left-body">
            {tab === 'statement' ? (
              <>
                <Markdown source={sources.statement} theme={progress.theme} />
                <div className="inspired muted small">Inspired by {problem.inspiredBy}.</div>
              </>
            ) : revealed ? (
              <div>
                <p className="muted small">Reference solution ({lang === 'ts' ? 'TypeScript' : 'JavaScript'}). Yours doesn't need to look like this.</p>
                <CodeView code={solution} language={lang === 'ts' ? 'typescript' : 'javascript'} theme={progress.theme} />
              </div>
            ) : (
              <div className="locked">
                <div className="lock-icon">🔒</div>
                <p>The reference solution unlocks when all tests pass.</p>
                <button className="btn" onClick={reveal}>Reveal anyway</button>
              </div>
            )}
          </div>
        </section>
        <Splitter direction="horizontal" getStart={() => leftRef.current?.offsetWidth ?? leftW} onResize={(w) => setLeftW(Math.max(260, Math.min(window.innerWidth - 360, w)))} />
        <section className="right-pane">
          <div className="editor-bar">
            <div className="seg" role="group" aria-label="Language">
              <button className={lang === 'ts' ? 'on' : ''} onClick={() => actions.setLang('ts')}>TypeScript</button>
              <button className={lang === 'js' ? 'on' : ''} onClick={() => actions.setLang('js')}>JavaScript</button>
            </div>
            <button className="btn ghost small" onClick={reset} title="Reset to starter code">↺ Reset</button>
            <div className="spacer" />
            <span className="muted small kbd-hint">Ctrl/⌘ + Enter</span>
            <button className="btn primary" onClick={doRun} disabled={running} data-testid="run">
              {running ? 'Running…' : 'Run tests'}
            </button>
          </div>
          <div className="editor-wrap">
            <Editor
              key={lang}
              path={`file:///problems/${problem.id}/solution.${lang}`}
              language={lang === 'ts' ? 'typescript' : 'javascript'}
              defaultValue={initialCode}
              theme={monacoTheme}
              onMount={onMount}
              onChange={(v) => v !== undefined && actions.setCode(problem.id, lang, v)}
              loading={<div className="muted pad">Loading editor…</div>}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                tabSize: 2,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fixedOverflowWidgets: true,
                renderLineHighlight: 'line',
                padding: { top: 10 },
              }}
            />
          </div>
          <Splitter direction="vertical" getStart={() => -(resultsRef.current?.offsetHeight ?? resultsH)} onResize={(h) => setResultsH(Math.max(120, Math.min(window.innerHeight - 220, -h)))} />
          <div className="results-wrap" ref={resultsRef} style={{ height: resultsH }}>
            <Results titles={titles} state={run} />
          </div>
        </section>
      </div>
    </main>
  );
}
