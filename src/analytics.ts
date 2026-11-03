/**
 * GoatCounter analytics (cookieless): one page view per hash route, plus a few named events. The script tag in
 * index.html sets `no_onload`, so nothing is counted until this module says so. Only route ids, stage numbers and the
 * language are ever sent: never code, test results or anything about the person.
 *
 * count.js itself skips localhost / private IPs / file: (its `filter()`), and a blocked script just means nothing is sent.
 */
import type { Route } from './ui/router';

type Vars = { path: string; title?: string; event?: boolean };
type GoatCounter = { count?: (vars: Vars) => void };
declare global { interface Window { goatcounter?: GoatCounter } }

// The tag's id must not be "goatcounter": named element access would make window.goatcounter the <script> element.
/** Calls made before count.js has loaded. Dropped if the script fails (adblocker, offline). Bounded just in case. */
let queue: Vars[] | null = [];

function send(vars: Vars) {
  const gc = window.goatcounter;
  if (typeof gc?.count === 'function') {
    try { gc.count(vars); } catch { /* analytics never breaks the app */ }
  } else if (queue && queue.length < 50) {
    queue.push(vars);
  }
}

function flush() {
  const q = queue ?? [];
  queue = null;
  if (typeof window.goatcounter?.count !== 'function') return;
  q.forEach(send);
}

const tag = document.getElementById('gc-script');
if (typeof window.goatcounter?.count === 'function' || !tag) flush();
else {
  tag.addEventListener('load', flush, { once: true });
  tag.addEventListener('error', () => { queue = null; }, { once: true });
}

/** The path a route is counted under: `/`, `/tag/<name>` or `/p/<problemId>` (no `#`, no base path). */
export function routePath(route: Route): string {
  if (route.name === 'problem') return `/p/${route.id}`;
  return route.tag ? `/tag/${encodeURIComponent(route.tag)}` : '/';
}

let lastPath: string | null = null;

/** One page view per route change. A repeat of the same path (React StrictMode, a no-op hashchange) is ignored. */
export function pageView(route: Route, title?: string) {
  const path = routePath(route);
  if (path === lastPath) return;
  lastPath = path;
  send({ path, title: title ?? 'Whetstone' });
}

/** A named event, e.g. `run/c4-event-emitter/s2`. See docs/DEVELOPMENT.md for the list. */
export function trackEvent(name: string) {
  send({ path: name, title: name, event: true });
}
