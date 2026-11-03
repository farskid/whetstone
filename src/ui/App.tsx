import { useEffect } from 'react';
import { useRoute, href } from './router';
import { useProgress, actions } from '../store';
import { ListPage } from './ListPage';
import { ProblemPage } from './ProblemPage';
import { problemsById } from '../problems';
import { useResolvedTheme, type ThemePref } from '../theme';
import { pageView, trackEvent } from '../analytics';

/** The generic feedback issue form: bugs, feature ideas, problem or library requests, anything else. */
const FEEDBACK_URL = 'https://github.com/farskid/whetstone/issues/new?template=feedback.yml';

export function App() {
  const route = useRoute();
  const progress = useProgress();
  const theme = useResolvedTheme(progress.theme);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const problem = route.name === 'problem' ? problemsById.get(route.id) : undefined;
  useEffect(() => { pageView(route, problem ? `${problem.title} · Whetstone` : undefined); }, [route, problem]);

  return (
    <div className={`app${route.name === 'problem' ? '' : ' is-home'}`}>
      <header className="topbar">
        <a className="brand" href={href.list()}>
          <span className="brand-mark">{'{ }'}</span> Whetstone
        </a>
        <span className="brand-sub">library-style coding practice</span>
        <div className="spacer" />
        <a
          className="btn ghost small request-link"
          data-testid="request-problem"
          href={FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('feedback-click')}
          title="Opens a GitHub issue for bugs, feature ideas, problem or library requests, or anything else"
        >
          send feedback or something
        </a>
        <select
          className="theme-select"
          data-testid="theme-select"
          aria-label="Color theme"
          title="Color theme"
          value={progress.theme}
          onChange={(e) => actions.setTheme(e.target.value as ThemePref)}
        >
          <option value="system">◐ System ({theme === 'dark' ? 'dark' : 'light'})</option>
          <option value="dark">☾ Dark</option>
          <option value="light">☀ Light</option>
        </select>
      </header>
      {route.name === 'problem' ? (
        problem ? <ProblemPage key={problem.id} problem={problem} /> : (
          <main className="empty"><h2>Problem not found</h2><a href={href.list()}>Back to all problems</a></main>
        )
      ) : (
        <ListPage tag={route.tag} />
      )}
    </div>
  );
}
