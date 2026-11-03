import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { Problem } from '../problems/types';
import { getSources, toJs } from '../problems/sources';
import { adoptTypesFile, ownCopiesOfTypes } from '../problems/typesFile';
import { useProgress, actions, unlockedStage, getProgress as progressNow } from '../store';
import { stageCount, stageOfGroup, testsForStage } from '../problems/stages';
import type { Language, TestResult, TestStatus } from '../runner/types';
import { runInWorker, type RunHandle } from '../runner/client';
import { monaco } from '../monaco';
import { TagChips } from './TagChips';
import { href } from './router';
import { Markdown } from './Markdown';
import { Results, type RunState } from './Results';
import { Splitter } from './Splitter';
import { useEditorSplit } from './editorSplit';
import { CodeView } from './CodeView';
import { CrackedEffect, CrackLock } from './Cracked';
import { useResolvedTheme, type ResolvedTheme } from '../theme';

type Ed = Parameters<OnMount>[0];

export function ProblemPage({ problem }: { problem: Problem }) {
  const progress = useProgress();
  const theme = useResolvedTheme(progress.theme);
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
  /**
   * Staged problems: the stage's types, shown read-only beside the solution, which imports them from './types'. A new
   * stage swaps this file and leaves the solution alone. Single-stage problems keep their types inline.
   */
  const typesTs = !staged ? undefined : full ? sources.typesTs ?? '' : sources.stageTypesTs[viewStage];
  const prevTypesTs = staged && !full && viewStage > 0 ? sources.stageTypesTs[viewStage - 1] : undefined;
  const typesPath = `file:///problems/${problem.id}/types.ts`;
  const stageTests = useMemo(() => testsForStage(problem, staged ? viewStage : undefined), [problem, staged, viewStage]);
  const titles = useMemo(() => stageTests.map((t) => t.title), [stageTests]);
  const groups = useMemo(
    () => stageTests.map((t) => (staged && t.group ? `Stage ${stageOfGroup(problem, t.group) + 1} · ${t.group}` : t.group)),
    [stageTests, staged, problem],
  );

  const [tab, setTab] = useState<'statement' | 'solution'>('statement');
  const [run, setRun] = useState<RunState>({ phase: 'idle' });
  /** The last run's status per test title (partial while running); paints the annotated rules in the statement. */
  const lastResults = useMemo(() => {
    const rs = run.phase === 'done' ? run.summary.results : run.phase === 'running' ? run.results : [];
    return new Map<string, TestStatus>(rs.map((r) => [r.title, r.status]));
  }, [run]);
  /** Set (to the stage just passed) when a run passed a stage for the first time and moved on to the next one. */
  const [justPassed, setJustPassed] = useState<number | null>(null);
  const [leftW, setLeftW] = useState(() => Math.round(window.innerWidth * 0.4));
  const [resultsH, setResultsH] = useState(() => Math.round(window.innerHeight * 0.36));
  const editorRef = useRef<Ed | null>(null);
  const typesEdRef = useRef<Ed | null>(null);
  const typesDecos = useRef<{ clear(): void } | null>(null);
  const handleRef = useRef<RunHandle | null>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const typesColRef = useRef<HTMLDivElement>(null);

  const solved = !!progress.solved[problem.id];
  /**
   * Whether the last finished run of the whole problem (single-stage, the final stage, or full mode) passed. Starts as
   * "solved", so opening a solved problem and re-running it green plays nothing; going red and back to green does.
   */
  const wholeGreen = useRef(solved);
  /** Bumped each time the problem newly goes green, which (re)plays the "Cracked" effect; null when it isn't showing. */
  const [cracked, setCracked] = useState<number | null>(null);
  const endCracked = useCallback(() => setCracked(null), []);
  const revealed = staged && !full
    ? solved || !!stagePassed[viewStage] || (progress.stageRevealed[problem.id] ?? []).includes(viewStage) || (viewStage === n - 1 && !!progress.revealed[problem.id])
    : solved || !!progress.revealed[problem.id];
  const attempts = progress.attempts[problem.id] ?? 0;
  const initialCode = progress.code[problem.id]?.[lang] ?? starter(lang);

  useEffect(() => () => handleRef.current?.cancel(), []);

  // This page owns the types model, not its editor: it exists before the solution model is first checked (so
  // `import type … from './types'` resolves from the start), and a stage change replaces its text in place.
  useEffect(() => {
    if (typesTs === undefined) return;
    const uri = monaco.Uri.parse(typesPath);
    const model = monaco.editor.getModel(uri) ?? monaco.editor.createModel(typesTs, 'typescript', uri);
    if (model.getValue() !== typesTs) model.setValue(typesTs);
    markNewTypeLines();
  }, [typesPath, typesTs]);
  useEffect(() => () => monaco.editor.getModel(monaco.Uri.parse(typesPath))?.dispose(), [typesPath]);

  /** Highlight the lines this stage added to the types file. */
  function markNewTypeLines() {
    typesDecos.current?.clear();
    const ed = typesEdRef.current;
    if (!ed || prevTypesTs === undefined || typesTs === undefined) return;
    const before = new Set(prevTypesTs.split('\n').map((l) => l.trim()));
    const ranges = typesTs.split('\n').flatMap((l, i) => (l.trim() && !before.has(l.trim()) ? [i + 1] : []));
    typesDecos.current = ed.createDecorationsCollection(ranges.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: { isWholeLine: true, className: 'types-new-line', linesDecorationsClassName: 'types-new-gutter' },
    })));
  }
  const typesChanged = prevTypesTs !== undefined && typesTs !== prevTypesTs;

  /** Code saved before the types had their own file declares its own copies; offer to switch it to the import. */
  const tsCode = progress.code[problem.id]?.ts;
  const ownCopies = useMemo(
    () => (typesTs !== undefined && tsCode !== undefined ? ownCopiesOfTypes(tsCode, typesTs) : []),
    [tsCode, typesTs],
  );
  const showOwnTypes = lang === 'ts' && ownCopies.length > 0 && !progress.ownTypes[problem.id];
  const useTypesFile = () => {
    const ed = editorRef.current;
    const model = ed?.getModel();
    if (!ed || !model || typesTs === undefined) return;
    const { code } = adoptTypesFile(model.getValue(), typesTs);
    ed.pushUndoStop(); // Ctrl/⌘+Z brings the old declarations back
    model.pushEditOperations([], [{ range: model.getFullModelRange(), text: code }], () => null);
    ed.pushUndoStop();
    actions.setCode(problem.id, 'ts', code);
  };

  /** Bumped by clearRun so the results list remounts and drops which failures were expanded. */
  const [runEpoch, setRunEpoch] = useState(0);
  /**
   * Forgets the last run: cancels one in flight, empties the test list and summary (which also returns the painted
   * rules to neutral), drops the "stage passed" notice and collapses the results. Saved progress is untouched.
   */
  const clearRun = () => {
    handleRef.current?.cancel();
    handleRef.current = null;
    setJustPassed(null);
    setCracked(null);
    setRun({ phase: 'idle' });
    setRunEpoch((e) => e + 1);
  };

  const goStage = (k: number) => {
    clearRun();
    setPicked(k);
  };

  const doRun = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    handleRef.current?.cancel();
    const source = ed.getValue();
    actions.setCode(problem.id, lang, source);
    const partial: TestResult[] = [];
    setRun({ phase: 'running', results: [] });
    setJustPassed(null);
    setCracked(null);
    const stage = staged ? viewStage : undefined;
    // Pin the stage being run, so unlocking the next one doesn't move the view mid-run.
    if (staged && !full) setPicked(viewStage);
    const h = runInWorker(problem.id, titles, source, lang, (r) => {
      if (handleRef.current !== h) return;
      partial.push(r);
      setRun({ phase: 'running', results: [...partial] });
    }, stage, typesTs);
    handleRef.current = h;
    h.promise.then((summary) => {
      if (handleRef.current !== h) return;
      setRun({ phase: 'done', summary });
      if (summary.aborted !== 'Cancelled.') {
        const passedAll = !summary.compileError && summary.passed === summary.total;
        const before = unlockedStage(progressNow(), problem.id);
        actions.recordAttempt(problem.id, passedAll, lang, stage, source);
        // The whole problem (not an intermediate stage) went from red or unsolved to all green: it's cracked.
        if (!staged || full || stage === n - 1) {
          if (passedAll && !wholeGreen.current) setCracked((c) => (c ?? 0) + 1);
          wholeGreen.current = passedAll;
        }
        // A first pass of a stage that isn't the last moves straight on; the code carries over (it is the saved code).
        if (passedAll && staged && !full && stage !== undefined && stage < n - 1 && stage === before) {
          handleRef.current = null;
          goStage(stage + 1);
          setJustPassed(stage);
        }
      }
    });
  }, [problem.id, titles, lang, staged, viewStage, full, n, typesTs]);

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
    if (!confirm(`Reset your ${lang === 'ts' ? 'TypeScript' : 'JavaScript'} code to ${what}? Your stage progress and passed stages are kept. Your current code for this language is lost.`)) return;
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
    wholeGreen.current = false; // the code that passed is gone, so passing again cracks it again
    clearRun(); // the last run tested code that is gone now
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
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
  const split = useEditorSplit(editorWrapRef, typesTs !== undefined);

  return (
    <main className="problem-page">
      <div className="problem-bar">
        <a className="btn ghost small" href={href.list()}>← Problems</a>
        <h1 className="pb-title"><span className="cat-id">{problem.catalogId}</span>{problem.title}</h1>
        <span className={`diff d-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
        <span className="tag">{problem.theme}</span>
        {solved && <span className={`solved-badge ${cracked !== null ? 'just' : ''}`} data-testid="solved-badge" title="Solved: every test passes"><CrackLock /> Cracked</span>}
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
                  <StagedStatement problem={problem} sections={sources.stageStatements} unlocked={unlocked} current={viewStage} passed={stagePassed} theme={theme} results={lastResults} />
                ) : (
                  <Markdown source={sources.statement} theme={theme} results={lastResults} />
                )}
                <div className="inspired muted small">Inspired by {problem.inspiredBy}.</div>
              </>
            ) : revealed ? (
              <div>
                <p className="muted small">Reference solution{staged && !full ? ` for stage ${viewStage + 1}` : ''} ({lang === 'ts' ? 'TypeScript' : 'JavaScript'}). Yours doesn't need to look like this.</p>
                {typesTs !== undefined && (
                  <>
                    <div className="file-label small muted">types.ts</div>
                    <CodeView code={typesTs} language="typescript" theme={theme} />
                    <div className="file-label small muted">solution.{lang}</div>
                  </>
                )}
                <CodeView code={solution} language={lang === 'ts' ? 'typescript' : 'javascript'} theme={theme} />
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
        <Splitter direction="horizontal" label="Resize statement and editor" getStart={() => leftRef.current?.offsetWidth ?? leftW} onResize={(w) => setLeftW(Math.max(260, Math.min(window.innerWidth - 360, w)))} />
        <section className="right-pane">
          {cracked !== null && <CrackedEffect key={cracked} total={titles.length} onDone={endCracked} />}
          <span className="sr-only" role="status">{cracked !== null ? `Problem cracked: all ${titles.length} tests pass.` : ''}</span>
          <div className="editor-bar">
            <div className="seg" role="group" aria-label="Language">
              <button className={lang === 'ts' ? 'on' : ''} onClick={() => actions.setLang('ts')}>TypeScript</button>
              <button className={lang === 'js' ? 'on' : ''} onClick={() => actions.setLang('js')}>JavaScript</button>
            </div>
            <button className="btn ghost small" onClick={reset} data-testid="reset" title={snapshot !== undefined ? `Reset to the code that passed stage ${viewStage}` : 'Reset to starter code'}>↺ {snapshot !== undefined ? 'Restart stage' : 'Reset'}</button>
            <div className="spacer" />
            <span className="muted small kbd-hint">Ctrl/⌘ + Enter</span>
            <button className="btn primary" onClick={doRun} disabled={running} data-testid="run">
              {running ? 'Running…' : 'Run tests'}
            </button>
          </div>
          {showOwnTypes && (
            <div className="own-types" data-testid="own-types">
              <span>
                Your saved code declares its own <code>{ownCopies.join(', ')}</code>. These now live in the read-only{' '}
                <code>types.ts</code>, which changes as stages add to them.
              </span>
              <button className="btn primary small" onClick={useTypesFile} data-testid="use-types-file" title="Remove your copies and import them from ./types. Ctrl/⌘+Z undoes it.">Import from types.ts</button>
              <button className="btn ghost small" onClick={() => actions.keepOwnTypes(problem.id)}>Keep mine</button>
            </div>
          )}
          <div className={`editor-wrap ${typesTs !== undefined ? 'split' : ''} ${split.stacked ? 'stacked' : ''}`} ref={editorWrapRef}>
            {typesTs !== undefined && (
              <div className="editor-col types-col" data-testid="types-editor" ref={typesColRef} style={{ flexBasis: `${split.fraction * 100}%` }}>
                <div className="file-tab">
                  <span className="file-name">types.ts</span>
                  <span className="muted small">read-only{full ? '' : ` · stage ${viewStage + 1}`}</span>
                  {typesChanged && <span className="types-badge" data-testid="types-updated" title="Highlighted lines are new in this stage">updated</span>}
                </div>
                <div className="editor-host">
                  <Editor
                    path={typesPath}
                    language="typescript"
                    keepCurrentModel
                    theme={monacoTheme}
                    onMount={(ed) => { typesEdRef.current = ed; markNewTypeLines(); }}
                    loading={<div className="muted pad">Loading editor…</div>}
                    options={{
                      ...editorOptions,
                      readOnly: true,
                      domReadOnly: true,
                      readOnlyMessage: { value: 'types.ts is read-only. Each stage replaces it. Import what you need in your solution: `import type { … } from \'./types\'`.' },
                      renderLineHighlight: 'none',
                      lineNumbersMinChars: 3,
                    }}
                  />
                </div>
              </div>
            )}
            {typesTs !== undefined && (
              <Splitter
                direction={split.stacked ? 'vertical' : 'horizontal'}
                label="Resize types.ts and solution"
                testId="editor-splitter"
                getStart={() => (split.stacked ? typesColRef.current?.offsetHeight : typesColRef.current?.offsetWidth) ?? 0}
                onResize={split.resize}
              />
            )}
            <div className="editor-col solution-col" data-testid="solution-editor">
              {typesTs !== undefined && (
                <div className="file-tab"><span className="file-name">solution.{lang}</span><span className="muted small">yours · carries over between stages</span></div>
              )}
              <div className="editor-host">
                <Editor
                  key={lang}
                  path={`file:///problems/${problem.id}/solution.${lang}`}
                  language={lang === 'ts' ? 'typescript' : 'javascript'}
                  defaultValue={initialCode}
                  theme={monacoTheme}
                  onMount={onMount}
                  onChange={(v) => v !== undefined && actions.setCode(problem.id, lang, v)}
                  loading={<div className="muted pad">Loading editor…</div>}
                  options={{ ...editorOptions, renderLineHighlight: 'line' }}
                />
              </div>
            </div>
          </div>
          <Splitter direction="vertical" label="Resize editor and tests" getStart={() => -(resultsRef.current?.offsetHeight ?? resultsH)} onResize={(h) => setResultsH(Math.max(120, Math.min(window.innerHeight - 220, -h)))} />
          <div className="results-wrap" ref={resultsRef} style={{ height: resultsH }}>
            {justPassed !== null && justPassed + 1 === viewStage && (
              <div className="stage-unlocked" role="status" data-testid="stage-unlocked">
                <span>Stage {justPassed + 1} passed 🎉 — now on <strong>stage {justPassed + 2}: {problem.stages[justPassed + 1].title}</strong>. Your code carried over.</span>
                <button className="btn ghost small" onClick={() => setJustPassed(null)} aria-label="Dismiss" data-testid="stage-unlocked-dismiss">✕</button>
              </div>
            )}
            <Results key={runEpoch} titles={titles} groups={groups} state={run} />
          </div>
        </section>
      </div>
    </main>
  );
}

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  tabSize: 2,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  fixedOverflowWidgets: true,
  padding: { top: 10 },
} as const;

function StagedStatement({ problem, sections, unlocked, current, passed, theme, results }: {
  problem: Problem; sections: string[]; unlocked: number; current: number; passed: (string | null)[]; theme: ResolvedTheme;
  results: ReadonlyMap<string, TestStatus>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('.stage-section.current')?.scrollIntoView({ block: 'start' }); }, [current]);
  return (
    <div className="staged-statement" ref={ref}>
      <h1 className="staged-h1">{problem.title}</h1>
      {problem.stages.map((st, k) => k <= unlocked ? (
        <section key={k} className={`stage-section ${passed[k] ? 'passed' : ''} ${k === current ? 'current' : ''}`} data-testid={`stage-section-${k + 1}`}>
          <div className="stage-head">
            <span className="stage-kicker">Stage {k + 1}{passed[k] ? ' ✓' : ''}</span>
            <span className="stage-head-title">{st.title}</span>
          </div>
          <Markdown source={sections[k]} theme={theme} results={results} />
        </section>
      ) : (
        <div key={k} className="stage-section locked-section muted small">🔒 Stage {k + 1}: {st.title}. Unlocks when stage {k} passes.</div>
      ))}
    </div>
  );
}
