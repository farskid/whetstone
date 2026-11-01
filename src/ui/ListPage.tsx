import { useMemo, useRef, useState } from 'react';
import { problems } from '../problems';
import type { Difficulty, Theme } from '../problems/types';
import { useProgress, actions } from '../store';
import { href } from './router';

const DIFFS: Difficulty[] = ['Easy', 'Medium', 'Hard'];

export function ListPage() {
  const progress = useProgress();
  const [query, setQuery] = useState('');
  const [diff, setDiff] = useState<Difficulty | 'All'>('All');
  const [theme, setTheme] = useState<Theme | 'All'>('All');
  const [status, setStatus] = useState<'All' | 'Solved' | 'Unsolved'>('All');
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const themes = useMemo(() => [...new Set(problems.map((p) => p.theme))].sort(), []);
  const solvedCount = problems.filter((p) => progress.solved[p.id]).length;

  const visible = problems.filter((p) => {
    if (diff !== 'All' && p.difficulty !== diff) return false;
    if (theme !== 'All' && p.theme !== theme) return false;
    const solved = !!progress.solved[p.id];
    if (status === 'Solved' && !solved) return false;
    if (status === 'Unsolved' && solved) return false;
    const q = query.trim().toLowerCase();
    if (q && !`${p.title} ${p.summary} ${p.inspiredBy} ${p.catalogId}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const doExport = () => {
    const blob = new Blob([actions.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `whetstone-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = async (file: File) => {
    try {
      actions.importJson(await file.text());
      setNotice('Progress imported.');
    } catch (e) {
      setNotice(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <main className="list-page">
      <section className="hero">
        <div>
          <h1>Whetstone problems</h1>
          <p className="muted">Rebuild the core of libraries you use every day: signals, query caches, task runners, interceptors. Every problem runs a real test suite in your browser.</p>
        </div>
        <div className="progress-card">
          <div className="progress-num">{solvedCount}<span>/{problems.length}</span></div>
          <div className="muted small">solved</div>
          <div className="bar"><div style={{ width: `${(solvedCount / Math.max(1, problems.length)) * 100}%` }} /></div>
          <div className="row gap-s">
            <button className="btn small" onClick={doExport}>Export progress</button>
            <button className="btn small" onClick={() => fileRef.current?.click()}>Import</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
          </div>
          {notice && <div className="small notice">{notice}</div>}
        </div>
      </section>

      <section className="filters" aria-label="Filters">
        <input className="input" placeholder="Search problems…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
        <div className="chips" role="group" aria-label="Difficulty">
          {(['All', ...DIFFS] as const).map((d) => (
            <button key={d} className={`chip ${diff === d ? 'on' : ''} ${d !== 'All' ? `d-${d.toLowerCase()}` : ''}`} onClick={() => setDiff(d)}>{d}</button>
          ))}
        </div>
        <select className="input select" value={theme} onChange={(e) => setTheme(e.target.value as Theme | 'All')} aria-label="Theme">
          <option value="All">All themes</option>
          {themes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
          <option value="All">Any status</option>
          <option value="Solved">Solved</option>
          <option value="Unsolved">Unsolved</option>
        </select>
      </section>

      <section className="problem-list" aria-label="Problems">
        <div className="problem-row head">
          <span />
          <span>Problem</span>
          <span>Theme</span>
          <span>Difficulty</span>
          <span className="right">Tests</span>
        </div>
        {visible.map((p) => {
          const solved = !!progress.solved[p.id];
          const started = !!progress.code[p.id] && Object.keys(progress.code[p.id]).length > 0;
          return (
            <a key={p.id} className={`problem-row ${solved ? 'solved' : ''}`} href={href.problem(p.id)} data-testid={`problem-${p.id}`}>
              <span className={`status-dot ${solved ? 'ok' : started ? 'started' : ''}`} title={solved ? 'Solved' : started ? 'Started' : 'Not started'}>
                {solved ? '✓' : ''}
              </span>
              <span className="p-main">
                <span className="p-title"><span className="cat-id">{p.catalogId}</span>{p.title}</span>
                <span className="p-summary muted">{p.summary}</span>
                <span className="p-inspired small">like {p.inspiredBy}</span>
              </span>
              <span><span className="tag">{p.theme}</span></span>
              <span className={`diff d-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
              <span className="right muted">{p.tests.length}</span>
            </a>
          );
        })}
        {!visible.length && <div className="empty muted">No problems match these filters.</div>}
      </section>
    </main>
  );
}
