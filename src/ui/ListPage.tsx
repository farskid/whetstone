import { useMemo, useRef, useState } from 'react';
import { problems } from '../problems';
import type { Difficulty, Theme } from '../problems/types';
import { useProgress, actions, passedStages } from '../store';
import { stageCount } from '../problems/stages';
import { href } from './router';
import { KIND_LABEL, KIND_ORDER, TagChips } from './TagChips';

const DIFFS: Difficulty[] = ['Easy', 'Medium', 'Hard'];

export function ListPage({ tag }: { tag: string | null }) {
  const progress = useProgress();
  const [query, setQuery] = useState('');
  const [diff, setDiff] = useState<Difficulty | 'All'>('All');
  const [theme, setTheme] = useState<Theme | 'All'>('All');
  const [status, setStatus] = useState<'All' | 'Solved' | 'Unsolved'>('All');
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const themes = useMemo(() => [...new Set(problems.map((p) => p.theme))].sort(), []);
  /** Every tag with how many problems use it, grouped by kind. */
  const tagGroups = useMemo(() => {
    const counts = new Map<string, { kind: (typeof KIND_ORDER)[number]; name: string; n: number }>();
    for (const p of problems) for (const t of p.tags) {
      const c = counts.get(t.name) ?? { ...t, n: 0 };
      c.n++;
      counts.set(t.name, c);
    }
    return KIND_ORDER.map((kind) => ({
      kind,
      tags: [...counts.values()].filter((c) => c.kind === kind).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)),
    }));
  }, []);
  const solvedCount = problems.filter((p) => progress.solved[p.id]).length;

  const visible = problems.filter((p) => {
    if (diff !== 'All' && p.difficulty !== diff) return false;
    if (theme !== 'All' && p.theme !== theme) return false;
    if (tag && !p.tags.some((t) => t.name === tag)) return false;
    const solved = !!progress.solved[p.id];
    if (status === 'Solved' && !solved) return false;
    if (status === 'Unsolved' && solved) return false;
    const q = query.trim().toLowerCase();
    if (q && !`${p.title} ${p.summary} ${p.inspiredBy} ${p.catalogId} ${p.tags.map((t) => t.name).join(' ')}`.toLowerCase().includes(q)) return false;
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

      <section className="tag-filter" aria-label="Tags">
        {tag && (
          <div className="tag-active small">
            Tagged <span className="tchip on">{tag}</span>
            <a className="muted" href={href.list()} data-testid="clear-tag">Clear ✕</a>
          </div>
        )}
        <details className="tag-browser">
          <summary className="small muted">Browse by library, framework, company or pattern</summary>
          {tagGroups.map((g) => (
            <div key={g.kind} className="tag-group">
              <span className="tag-group-label small muted">{KIND_LABEL[g.kind]}</span>
              <span className="tag-chips">
                {g.tags.map((t) => (
                  <a key={t.name} className={`tchip k-${t.kind} ${tag === t.name ? 'on' : ''}`} href={href.list(tag === t.name ? null : t.name)}>
                    {t.name} <span className="tchip-n">{t.n}</span>
                  </a>
                ))}
              </span>
            </div>
          ))}
        </details>
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
          const n = stageCount(p);
          const passedN = n > 1 ? passedStages(progress, p.id) : 0;
          const started = passedN > 0 || (!!progress.code[p.id] && Object.keys(progress.code[p.id]).length > 0);
          return (
            <div key={p.id} className={`problem-row link-row ${solved ? 'solved' : ''}`}>
              <span className={`status-dot ${solved ? 'ok' : started ? 'started' : ''}`} title={solved ? 'Solved' : started ? 'Started' : 'Not started'}>
                {solved ? '✓' : ''}
              </span>
              <span className="p-main">
                <a className="p-title row-link" href={href.problem(p.id)} data-testid={`problem-${p.id}`}><span className="cat-id">{p.catalogId}</span>{p.title}</a>
                <span className="p-summary muted">{p.summary}</span>
                <span className="p-inspired small">like {p.inspiredBy}</span>
                {n > 1 && (
                  <span className="stage-pill small" data-testid={`stages-${p.id}`} title={p.stages.map((st, k) => `${k + 1}. ${st.title}`).join('\n')}>
                    <span className="stage-dots" aria-hidden="true">
                      {p.stages.map((_, k) => <span key={k} className={`sd ${progress.stagePassed[p.id]?.[k] ? 'on' : ''}`} />)}
                    </span>
                    {passedN}/{n} stages
                  </span>
                )}
                <TagChips tags={p.tags} active={tag} />
              </span>
              <span><span className="tag">{p.theme}</span></span>
              <span className={`diff d-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
              <span className="right muted">{p.tests.length}</span>
            </div>
          );
        })}
        {!visible.length && <div className="empty muted">No problems match these filters.</div>}
      </section>
    </main>
  );
}
