import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { Problem } from '../problems/types';
import { getSources, toJs } from '../problems/sources';
import { useProgress, actions, unlockedStage, getProgress as progressNow } from '../store';
import { stageCount, stageOfGroup, testsForStage } from '../problems/stages';
import type { Language, TestResult } from '../runner/types';
import { runInWorker, type RunHandle } from '../runner/client';
import { monaco } from '../monaco';
import { TagChips } from './TagChips';
import { href } from './router';
import { Markdown } from './Markdown';
import { Results, type RunState } from './Results';
import { Splitter } from './Splitter';
import { CodeView } from './CodeView';

type Ed = Parameters<OnMount>[0];

export function ProblemPage({ problem }: { problem: Problem }) {
  const progress = useProgress();
  const lang = progress.lang;
  const n = stageCount(problem);
  const staged = n > 1;
  const sources = useMemo(() => getSources(problem.id, n), [problem.id, n]);
  const full = staged && !!progress.full[problem.id];
  const unlocked = unlockedStage(progress, problem.id);
  const stagePassed = progress.stagePassed[problem.id] ?? [];
  /** The stage being worked on: its tests (plus every earlier stage's) run. Defaults to the newest unlocked one. */
  const [picked, setPicked] = useState<number | null>(null);
  const viewStage = !staged ? 0 : full ? n - 1 : Math.min(picked ?? unlocked, unlocked);
  // The stage-1 starter only makes sense before any code exists; full mode starts from the full starter.
  const starterTsFor = () => (staged && !full && sources.stageStarterTs ? sources.stageStarterTs : sources.starterTs);
  const starter = (l: Language) => (l === 'ts' ? starterTsFor() : toJs(starterTsFor()));
  const solutionTs = staged && !full ? sources.stageSolutionsTs[viewStage] : sources.solutionTs;
  const solution = lang === 'ts' ? solutionTs : toJs(solutionTs);
  const stageTests = useMemo(() => testsForStage(problem, staged ? viewStage : undefined), [problem, staged, viewStage]);
  const titles = useMemo(() => stageTests.map((t) => t.title), [stageTests]);
  const groups = useMemo(
    () => stageTests.map((t) => (staged && t.group ? `Stage ${stageOfGroup(problem, t.group) + 1} · ${t.group}` : t.group)),
    [stageTests, staged, problem],
  );

  const [tab, setTab] = useState<'statement' | 'solution'>('statement');
  const [run, setRun] = useState<RunState>({ phase: 'idle' });
  /** Set when a run just passed a stage that unlocked the next one. */
  const [justUnlocked, setJustUnlocked] = useState<number | null>(null);
  const [leftW, setLeftW] = useState(() => Math.round(window.innerWidth * 0.4));
  const [resultsH, setResultsH] = useState(() => Math.round(window.innerHeight * 0.36));
  const editorRef = useRef<Ed | null>(null);
  const handleRef = useRef<RunHandle | null>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const solved = !!progress.solved[problem.id];
  const revealed = staged && !full
    ? solved || !!stagePassed[viewStage] || (progress.stageRevealed[problem.id] ?? []).includes(viewStage) || (viewStage === n - 1 && !!progress.revealed[problem.id])
    : solved || !!progress.revealed[problem.id];
  const attempts = progress.attempts[problem.id] ?? 0;
  const initialCode = progress.code[problem.id]?.[lang] ?? starter(lang);

  useEffect(() => () => handleRef.current?.cancel(), []);

  const goStage = (k: number) => {
    handleRef.current?.cancel();
    handleRef.current = null;
    setPicked(k);
    setJustUnlocked(null);
    setRun({ phase: 'idle' });
  };

  const doRun = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    handleRef.current?.cancel();
    const source = ed.getValue();
    actions.setCode(problem.id, lang, source);
    const partial: TestResult[] = [];
    setRun({ phase: 'running', results: [] });
    setJustUnlocked(null);
    const stage = staged ? viewStage : undefined;
    const h = runInWorker(problem.id, titles, source, lang, (r) => {
      partial.push(r);
      setRun({ phase: 'running', results: [...partial] });
    }, stage);
    handleRef.current = h;
    h.promise.then((summary) => {
      if (handleRef.current !== h) return;
      setRun({ phase: 'done', summary });
      if (summary.aborted !== 'Cancelled.') {
        const passedAll = !summary.compileError && summary.passed === summary.total;
        const before = unlockedStage(progressNow(), problem.id);
        actions.recordAttempt(problem.id, passedAll, lang, stage, source);
        if (passedAll && staged && !full && stage !== undefined && stage < n - 1 && stage === before) setJustUnlocked(stage + 1);
      }
    });
  }, [problem.id, titles, lang, staged, viewStage, full, n]);

  const runRef = useRef(doRun);
  runRef.current = doRun;

  const onMount: OnMount = (ed) => {
    editorRef.current = ed;
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
  };

  /** Stage k > 0 resets to the code that passed stage k (its snapshot); otherwise to the starter. */
  const snapshot = staged && !full && viewStage > 0 ? progress.stageCode[problem.id]?.[viewStage - 1]?.[lang] : undefined;
  const reset = () => {
    const what = snapshot !== undefined ? `the code that passed stage ${viewStage}` : 'the starter';
    if (!confirm(`Reset your ${lang === 'ts' ? 'TypeScript' : 'JavaScript'} code to ${what}? Your current code for this language is lost.`)) return;
    const ed = editorRef.current;
    const model = ed?.getModel();
    const text = snapshot ?? starter(lang);
    if (ed && model) {
      ed.pushUndoStop();
      model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
      ed.pushUndoStop();
    }
    if (snapshot !== undefined) actions.setCode(problem.id, lang, snapshot);
    else actions.resetCode(problem.id, lang);
  };

  const reveal = () => {
    if (staged && !full) {
      if (confirm(`Reveal the reference solution for stage ${viewStage + 1} before passing it? You can still pass it afterwards.`)) actions.revealStage(problem.id, viewStage);
    } else if (confirm('Reveal the reference solution before solving it? You can still solve it afterwards.')) actions.reveal(problem.id);
  };

  const toggleFull = (on: boolean) => {
    if (on && !confirm('Show the full problem? Every stage unlocks and one run checks all of them. You can switch back to stages any time.')) return;
    actions.setFull(problem.id, on);
    goStage(on ? n - 1 : unlockedStage({ ...progressNow(), full: {} }, problem.id));
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
      {staged && (
        <div className="stage-bar" role="tablist" aria-label="Stages" data-testid="stage-bar">
          <span className="stage-label small muted">{full ? 'Full problem' : `Stage ${viewStage + 1} of ${n}`}</span>
          {problem.stages.map((st, k) => {
            const open = k <= unlocked;
            const done = !!stagePassed[k];
            return (
              <button
                key={k}
                role="tab"
                aria-selected={!full && k === viewStage}
                disabled={!open || full}
                className={`stage-tab ${!full && k === viewStage ? 'on' : ''} ${done ? 'done' : ''} ${open ? '' : 'locked'}`}
                onClick={() => goStage(k)}
                data-testid={`stage-tab-${k + 1}`}
                title={open ? st.title : `Locked: pass stage ${k} first`}
              >
                <span className="stage-num">{done ? '✓' : open ? k + 1 : '🔒'}</span>
                <span className="stage-title">{st.title}</span>
              </button>
            );
          })}
          <div className="spacer" />
          <label className="full-toggle small" title="Unlock every stage and run all the tests at once">
            <input type="checkbox" checked={full} onChange={(e) => toggleFull(e.target.checked)} data-testid="full-toggle" /> Full problem
          </label>
        </div>
      )}
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
                <div className="pb-tags" aria-label="Tags"><TagChips tags={problem.tags} /></div>
                {staged && !full ? (
                  <StagedStatement problem={problem} sections={sources.stageStatements} unlocked={unlocked} current={viewStage} passed={stagePassed} theme={progress.theme} />
                ) : (
                  <Markdown source={sources.statement} theme={progress.theme} />
                )}
                <div className="inspired muted small">Inspired by {problem.inspiredBy}.</div>
              </>
            ) : revealed ? (
              <div>
                <p className="muted small">Reference solution{staged && !full ? ` for stage ${viewStage + 1}` : ''} ({lang === 'ts' ? 'TypeScript' : 'JavaScript'}). Yours doesn't need to look like this.</p>
                <CodeView code={solution} language={lang === 'ts' ? 'typescript' : 'javascript'} theme={progress.theme} />
              </div>
            ) : (
              <div className="locked">
                <div className="lock-icon">🔒</div>
                <p>{staged && !full ? `The reference solution for stage ${viewStage + 1} unlocks when you pass it.` : 'The reference solution unlocks when all tests pass.'}</p>
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
            <button className="btn ghost small" onClick={reset} title={snapshot !== undefined ? `Reset to the code that passed stage ${viewStage}` : 'Reset to starter code'}>↺ {snapshot !== undefined ? 'Restart stage' : 'Reset'}</button>
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
            {justUnlocked !== null && (
              <div className="stage-unlocked" data-testid="stage-unlocked">
                <span>🎉 Stage {justUnlocked} passed. <strong>Stage {justUnlocked + 1}: {problem.stages[justUnlocked].title}</strong> is unlocked. Your code carries over.</span>
                <button className="btn primary small" onClick={() => goStage(justUnlocked)} data-testid="next-stage">Continue to stage {justUnlocked + 1} →</button>
              </div>
            )}
            <Results titles={titles} groups={groups} state={run} />
          </div>
        </section>
      </div>
    </main>
  );
}

function StagedStatement({ problem, sections, unlocked, current, passed, theme }: {
  problem: Problem; sections: string[]; unlocked: number; current: number; passed: (string | null)[]; theme: 'dark' | 'light';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('.stage-section.current')?.scrollIntoView({ block: 'start' }); }, [current]);
  return (
    <div className="staged-statement" ref={ref}>
      <h1 className="staged-h1">{problem.title}</h1>
      {problem.stages.map((st, k) => k <= unlocked ? (
        <section key={k} className={`stage-section ${k === current ? 'current' : ''}`} data-testid={`stage-section-${k + 1}`}>
          <div className="stage-head">
            <span className="stage-kicker">Stage {k + 1}{passed[k] ? ' ✓' : ''}</span>
            <span className="stage-head-title">{st.title}</span>
          </div>
          <Markdown source={sections[k]} theme={theme} />
        </section>
      ) : (
        <div key={k} className="stage-section locked-section muted small">🔒 Stage {k + 1}: {st.title}. Unlocks when stage {k} passes.</div>
      ))}
    </div>
  );
}
