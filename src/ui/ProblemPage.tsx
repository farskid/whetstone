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
import { TabBarTags } from './TabBarTags';
import { href } from './router';
import { Markdown } from './Markdown';
import { InlineCode, Results, type RunState } from './Results';
import { Splitter } from './Splitter';
import { useEditorSplit } from './editorSplit';
import { CodeView } from './CodeView';
import { CrackedEffect, CrackLock } from './Cracked';
import { checkContract, clearContractMarks, markContract } from './contractCheck';
import { contractChanges } from '../runner/contract';
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
  /** The stage's hidden contract (src/runner/contract.ts), checked in TypeScript mode; full mode uses the last stage's. */
  const contractTs = !staged ? undefined : sources.stageContractsTs[full ? n - 1 : viewStage];
  const typesPath = `file:///problems/${problem.id}/types.ts`;
  const stageTests = useMemo(() => testsForStage(problem, staged ? viewStage : undefined), [problem, staged, viewStage]);
  const titles = useMemo(() => stageTests.map((t) => t.title), [stageTests]);
  const groups = useMemo(
    () => stageTests.map((t) => (staged && t.group ? `Stage ${stageOfGroup(problem, t.group) + 1} · ${t.group}` : t.group)),
    [stageTests, staged, problem],
  );

  const [tab, setTab] = useState<'statement' | 'solution'>('statement');
  const leftBodyRef = useRef<HTMLDivElement>(null);
  const pbTagsRef = useRef<HTMLDivElement>(null);
  /** Whether the description's tag row is on screen; once it scrolls away the tags dock in the tab bar. */
  const [tagsInView, setTagsInView] = useState(true);
  useEffect(() => {
    const root = leftBodyRef.current;
    const target = pbTagsRef.current;
    if (tab !== 'statement' || !root || !target) return;
    const io = new IntersectionObserver(([e]) => {
      // Below the fold (never, in practice) counts as in view: only scrolling past the row docks it.
      setTagsInView(e.isIntersecting || (e.rootBounds !== null && e.boundingClientRect.top >= e.rootBounds.top));
    }, { root });
    io.observe(target);
    return () => { io.disconnect(); setTagsInView(true); };
  }, [tab]);
  /** The Solution tab has no tag row of its own, so the tab bar keeps them there. */
  const dockTags = tab === 'solution' || !tagsInView;
  const showAllTags = () => {
    const smooth = tab === 'statement' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTab('statement');
    leftBodyRef.current?.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  };
  const [run, setRun] = useState<RunState>({ phase: 'idle' });
  /** The last run's status per test title (partial while running); paints the annotated rules in the statement. */
  const lastResults = useMemo(() => {
    const rs = run.phase === 'done' ? run.summary.results : run.phase === 'running' ? run.results : [];
    return new Map<string, TestStatus>(rs.map((r) => [r.title, r.status]));
  }, [run]);
  /**
   * What the last run cracked, if it newly went green: the whole problem ("Cracked", plays and goes) or a stage that
   * isn't the last ("Stage k cleared" with a button to the next stage). `docked`: the stamp was dismissed and only the
   * bar above the tests is left. `epoch` replays the animation.
   */
  const [cracked, setCracked] = useState<{ kind: 'cracked' | 'stage'; stage: number; epoch: number; docked: boolean } | null>(null);
  const endCracked = useCallback(() => setCracked(null), []);
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
   * Per view (a stage, full mode, or the single-stage problem): whether its last finished run passed. A view not run yet
   * on this page counts as green if it is already passed, so re-running a passed stage or a solved problem green plays
   * nothing; going red and back to green does.
   */
  const green = useRef<Record<string, boolean>>({});
  const viewKey = !staged ? 'one' : full ? 'full' : `s${viewStage}`;
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
    setCracked(null);
    const stage = staged ? viewStage : undefined;
    // Pin the stage being run, so unlocking the next one doesn't move the view mid-run.
    if (staged && !full) setPicked(viewStage);
    // TypeScript only: does the code accept what this stage hands it? Checked alongside the tests. If the checker itself
    // fails, the run counts on the tests alone.
    const model = ed.getModel();
    clearContractMarks(model);
    const contractRun = lang === 'ts' && contractTs && model
      ? checkContract(problem.id, contractTs, model.uri).catch(() => undefined) : Promise.resolve(undefined);
    const h = runInWorker(problem.id, titles, source, lang, (r) => {
      if (handleRef.current !== h) return;
      partial.push(r);
      setRun({ phase: 'running', results: [...partial] });
    }, stage, typesTs);
    handleRef.current = h;
    h.promise.then(async (tested) => {
      if (handleRef.current !== h) return;
      const contract = tested.compileError ? undefined : await contractRun;
      if (handleRef.current !== h) return;
      const summary = contract?.length ? { ...tested, contract } : tested;
      if (contract?.length && model && !model.isDisposed()) markContract(model, contract);
      setRun({ phase: 'done', summary });
      if (summary.aborted !== 'Cancelled.') {
        const passedAll = !summary.compileError && !summary.contract?.length && summary.passed === summary.total;
        const p = progressNow();
        const wasGreen = green.current[viewKey] ?? (viewKey.startsWith('s') ? !!p.stagePassed[problem.id]?.[viewStage] : !!p.solved[problem.id]);
        green.current[viewKey] = passedAll;
        actions.recordAttempt(problem.id, passedAll, lang, stage, source);
        // Newly green. The whole problem is cracked; a stage that isn't the last is cleared, and its banner offers the
        // next stage (no jump without it). The code carries over either way (it is the saved code).
        if (passedAll && !wasGreen) {
          const kind = staged && !full && stage !== undefined && stage < n - 1 ? 'stage' : 'cracked';
          setCracked((c) => ({ kind, stage: stage ?? 0, epoch: (c?.epoch ?? 0) + 1, docked: false }));
        }
      }
    });
  }, [problem.id, titles, lang, staged, viewStage, full, n, typesTs, contractTs, viewKey]);

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
    green.current[viewKey] = false; // the code that passed is gone, so passing again cracks it again
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
        {solved && <span className={`solved-badge ${cracked?.kind === 'cracked' ? 'just' : ''}`} data-testid="solved-badge" title="Solved: every test passes"><CrackLock /> Cracked</span>}
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
            {problem.tags.length > 0 && <TabBarTags tags={problem.tags} show={dockTags} duplicate={tab === 'statement'} onMore={showAllTags} />}
          </div>
          <div className="left-body" ref={leftBodyRef}>
            {tab === 'statement' ? (
              <>
                <div className="pb-tags" aria-label="Tags" ref={pbTagsRef}><TagChips tags={problem.tags} /></div>
                {staged && !full ? (
                  <StagedStatement problem={problem} sections={sources.stageStatements} contracts={sources.stageContractsTs} unlocked={unlocked} current={viewStage} passed={stagePassed} theme={theme} results={lastResults} />
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
          {cracked?.kind === 'cracked' && <CrackedEffect key={cracked.epoch} kind="cracked" total={titles.length} onDone={endCracked} />}
          {cracked?.kind === 'stage' && !cracked.docked && (
            <CrackedEffect key={cracked.epoch} kind="stage" stage={cracked.stage} nextTitle={problem.stages[cracked.stage + 1].title}
              onGo={() => goStage(cracked.stage + 1)} onStay={() => setCracked({ ...cracked, docked: true })} />
          )}
          <span className="sr-only" role="status">
            {cracked?.kind === 'cracked' ? `Problem cracked: all ${titles.length} tests pass.` : cracked?.kind === 'stage' ? `Stage ${cracked.stage + 1} cleared. Stage ${cracked.stage + 2} is unlocked.` : ''}
          </span>
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
                  onChange={(v) => { if (v !== undefined) actions.setCode(problem.id, lang, v); clearContractMarks(editorRef.current?.getModel()); }}
                  loading={<div className="muted pad">Loading editor…</div>}
                  options={{ ...editorOptions, renderLineHighlight: 'line' }}
                />
              </div>
            </div>
          </div>
          <Splitter direction="vertical" label="Resize editor and tests" getStart={() => -(resultsRef.current?.offsetHeight ?? resultsH)} onResize={(h) => setResultsH(Math.max(120, Math.min(window.innerHeight - 220, -h)))} />
          <div className="results-wrap" ref={resultsRef} style={{ height: resultsH }}>
            {cracked?.kind === 'stage' && cracked.docked && (
              <div className="stage-unlocked" data-testid="stage-unlocked">
                <span><CrackLock /> Stage {cracked.stage + 1} cleared. Next: <strong>stage {cracked.stage + 2}, {problem.stages[cracked.stage + 1].title}</strong>. Your code carries over.</span>
                <button className="btn primary small" onClick={() => goStage(cracked.stage + 1)} data-testid="go-next-stage">Go to stage {cracked.stage + 2} →</button>
                <button className="btn ghost small" onClick={() => setCracked(null)} aria-label="Dismiss" data-testid="stage-unlocked-dismiss">✕</button>
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

function StagedStatement({ problem, sections, contracts, unlocked, current, passed, theme, results }: {
  problem: Problem; sections: string[]; contracts: (string | undefined)[]; unlocked: number; current: number; passed: (string | null)[]; theme: ResolvedTheme;
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
          <ContractNotes changes={k > 0 ? contractChanges(contracts[k], contracts[k - 1]) : []} stage={k + 1} />
        </section>
      ) : (
        <div key={k} className="stage-section locked-section muted small">🔒 Stage {k + 1}: {st.title}. Unlocks when stage {k} passes.</div>
      ))}
    </div>
  );
}

/** The signatures a stage changes (its contract's new `@change` lines), so carried-over code knows what to update. */
function ContractNotes({ changes, stage }: { changes: string[]; stage: number }) {
  if (!changes.length) return null;
  return (
    <div className="contract-notes" data-testid={`contract-notes-${stage}`}>
      <div className="contract-notes-head">Signature {changes.length === 1 ? 'change' : 'changes'} in stage {stage}</div>
      <ul>{changes.map((c) => <li key={c}><InlineCode text={c} /></li>)}</ul>
      <div className="muted small">Your code carries over, so update its signatures. In TypeScript a run fails until they match.</div>
    </div>
  );
}
