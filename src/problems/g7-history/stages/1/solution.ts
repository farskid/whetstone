import type { Action, Path, Location, To, MemoryHistoryOptions, MemoryHistory } from './types';

export function parsePath(path: string): Partial<Path> {
  const out: Partial<Path> = {};
  let rest = path;
  const h = rest.indexOf('#');
  if (h >= 0) {
    out.hash = rest.slice(h);
    rest = rest.slice(0, h);
  }
  const q = rest.indexOf('?');
  if (q >= 0) {
    out.search = rest.slice(q);
    rest = rest.slice(0, q);
  }
  if (rest) out.pathname = rest;
  return out;
}

export function createMemoryHistory(options: MemoryHistoryOptions = {}): MemoryHistory {
  let keySeq = 0;
  const newKey = () => `k${(++keySeq).toString(36)}`;

  function resolve(to: To, base: Path): Path {
    const p = typeof to === 'string' ? parsePath(to) : to;
    const path = { pathname: base.pathname, search: '', hash: '', ...p };
    if (path.search === '?') path.search = '';
    if (path.hash === '#') path.hash = '';
    return path;
  }

  const make = (to: To, state: unknown, base: Path): Location => {
    const p = resolve(to, base);
    return { pathname: p.pathname, search: p.search, hash: p.hash, state: state ?? null, key: newKey() };
  };

  const root: Path = { pathname: '/', search: '', hash: '' };
  let entries: Location[] = (options.initialEntries ?? ['/']).map((e) =>
    make(e, typeof e === 'string' ? null : (e as { state?: unknown }).state, root),
  );
  if (entries.length === 0) entries = [make('/', null, root)];
  const index = Math.min(Math.max(options.initialIndex ?? entries.length - 1, 0), entries.length - 1);
  const action: Action = 'POP';

  return {
    get location() {
      return entries[index];
    },
    get action() {
      return action;
    },
    get index() {
      return index;
    },
    get length() {
      return entries.length;
    },
    createHref(to) {
      const p = resolve(to, entries[index]);
      return p.pathname + p.search + p.hash;
    },
  };
}
