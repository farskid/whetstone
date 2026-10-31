import { useEffect } from 'react';
import { useRoute, href } from './router';
import { useProgress, actions } from '../store';
import { ListPage } from './ListPage';
import { ProblemPage } from './ProblemPage';
import { problemsById } from '../problems';

export function App() {
  const route = useRoute();
  const progress = useProgress();
  useEffect(() => { document.documentElement.dataset.theme = progress.theme; }, [progress.theme]);
  const problem = route.name === 'problem' ? problemsById.get(route.id) : undefined;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={href.list()}>
          <span className="brand-mark">{'{ }'}</span> Practical
        </a>
        <span className="brand-sub">library-style coding practice</span>
        <div className="spacer" />
        <button
          className="btn ghost"
          title="Toggle dark mode"
          aria-label="Toggle dark mode"
          onClick={() => actions.setTheme(progress.theme === 'dark' ? 'light' : 'dark')}
        >
          {progress.theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>
      </header>
      {route.name === 'problem' ? (
        problem ? <ProblemPage key={problem.id} problem={problem} /> : (
          <main className="empty"><h2>Problem not found</h2><a href={href.list()}>Back to all problems</a></main>
        )
      ) : (
        <ListPage />
      )}
    </div>
  );
}
