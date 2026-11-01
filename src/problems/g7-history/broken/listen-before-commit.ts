// Bug: listeners run before the location changes
export type Action = 'POP' | 'PUSH' | 'REPLACE';

export interface Path {
  pathname: string;
  search: string;
  hash: string;
}

export interface Location extends Path {
  state: unknown;
  key: string;
}

export type To = string | Partial<Path>;

export interface Update {
  action: Action;
  location: Location;
}

export interface Transition extends Update {
  /** Approve on behalf of the blocker that stopped this navigation and try again. */
  retry(): void;
}

/** Return true to let the navigation through; anything else blocks it. */
export type Blocker = (tx: Transition) => boolean | void;

export interface MemoryHistoryOptions {
  initialEntries?: (To | (Partial<Path> & { state?: unknown }))[];
  initialIndex?: number;
  maxLength?: number;
}

export interface MemoryHistory {
  readonly location: Location;
  readonly action: Action;
  readonly index: number;
  readonly length: number;
  push(to: To, state?: unknown): void;
  replace(to: To, state?: unknown): void;
  go(delta: number): void;
  back(): void;
  forward(): void;
  listen(listener: (update: Update) => void): () => void;
  block(blocker: Blocker): () => void;
  createHref(to: To): string;
  saveScroll(y: number): void;
  getScroll(key?: string): number | undefined;
}

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
  const maxLength = options.maxLength ?? Infinity;
  if (!(maxLength === Infinity || (Number.isInteger(maxLength) && maxLength >= 1))) {
    throw new RangeError('maxLength must be a positive integer');
  }
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
  let index = Math.min(Math.max(options.initialIndex ?? entries.length - 1, 0), entries.length - 1);
  let action: Action = 'POP';
  const listeners = new Set<(u: Update) => void>();
  const blockers: Blocker[] = [];
  const scroll = new Map<string, number>();
  let attempt = 0;

  function forget(dropped: Location[]) {
    for (const l of dropped) scroll.delete(l.key);
  }

  function navigate(act: Action, location: Location, commit: () => void) {
    const id = ++attempt;
    const approved = new Set<Blocker>();
    const tryIt = () => {
      for (const b of blockers) {
        if (approved.has(b)) continue;
        let blocked = true;
        const tx: Transition = {
          action: act,
          location,
          retry() {
            if (!blocked || id !== attempt) return;
            blocked = false;
            approved.add(b);
            tryIt();
          },
        };
        if (b(tx) === true) {
          blocked = false;
          approved.add(b);
          continue;
        }
        return;
      }
      attempt++;
      action = act;
      for (const l of [...listeners]) l({ action, location });
      commit();
    };
    tryIt();
  }

  function go(delta: number) {
    const target = Math.min(Math.max(index + Math.trunc(delta), 0), entries.length - 1);
    if (target === index) return;
    navigate('POP', entries[target], () => {
      index = target;
    });
  }

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
    push(to, state) {
      const next = make(to, state, entries[index]);
      navigate('PUSH', next, () => {
        forget(entries.splice(index + 1, Infinity, next));
        index++;
        if (entries.length > maxLength) {
          const drop = entries.length - maxLength;
          forget(entries.splice(0, drop));
          index -= drop;
        }
      });
    },
    replace(to, state) {
      const next = make(to, state, entries[index]);
      navigate('REPLACE', next, () => {
        forget(entries.splice(index, 1, next));
      });
    },
    go,
    back: () => go(-1),
    forward: () => go(1),
    listen(listener) {
      const fn = (u: Update) => listener(u);
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    block(blocker) {
      const b: Blocker = (tx) => blocker(tx);
      blockers.push(b);
      return () => {
        const i = blockers.indexOf(b);
        if (i >= 0) blockers.splice(i, 1);
      };
    },
    createHref(to) {
      const p = resolve(to, entries[index]);
      return p.pathname + p.search + p.hash;
    },
    saveScroll(y) {
      scroll.set(entries[index].key, y);
    },
    getScroll(key) {
      return scroll.get(key ?? entries[index].key);
    },
  };
}
