// Naive push-based signals: computeds are eager, effects run on every write,
// batch does nothing special. Fails laziness, batching, diamond and cutoff tests.
let current: (() => void) | null = null;

export function signal<T>(initial: T) {
  let v = initial;
  const subs = new Set<() => void>();
  return {
    get value() { if (current) subs.add(current); return v; },
    set value(n: T) { v = n; [...subs].forEach((s) => s()); },
    peek: () => v,
  };
}

export function computed<T>(fn: () => T) {
  const s = signal<T>(undefined as T);
  effect(() => { s.value = fn(); });
  return { get value() { return s.value; }, peek: () => s.peek() };
}

export function effect(fn: () => void | (() => void)) {
  let alive = true;
  let cleanup: void | (() => void);
  const run = () => {
    if (!alive) return;
    if (cleanup) cleanup();
    const prev = current; current = run;
    try { cleanup = fn(); } finally { current = prev; }
  };
  run();
  return () => { alive = false; if (cleanup) cleanup(); };
}

export function batch<T>(fn: () => T): T { return fn(); }
export function untracked<T>(fn: () => T): T { const p = current; current = null; try { return fn(); } finally { current = p; } }
