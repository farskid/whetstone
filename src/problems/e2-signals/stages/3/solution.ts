import type { ReadonlySignal, Signal } from './types';

// Every reactive thing is a node. Sources (signals, computeds) have a version that
// bumps only when their value really changes. Observers (computeds, effects) remember
// the version of each source they read, so they can tell whether they are out of date.
interface Source {
  version: number;
  observers: Set<Observer>;
  /** Bring this source up to date (no-op for plain signals). */
  refresh(): void;
}

interface Observer {
  sources: Map<Source, number>;
  /** Called when something upstream may have changed. */
  markStale(): void;
}

let activeObserver: Observer | null = null;
let batchDepth = 0;
const pendingEffects = new Set<EffectNode>();

function track(source: Source) {
  if (activeObserver) {
    activeObserver.sources.set(source, source.version);
    source.observers.add(activeObserver);
  }
}

function unlinkSources(obs: Observer) {
  for (const src of obs.sources.keys()) src.observers.delete(obs);
  obs.sources.clear();
}

/** True if any source has a newer version than when obs last read it. */
function sourcesChanged(obs: Observer): boolean {
  for (const [src, seen] of obs.sources) {
    src.refresh();
    if (src.version !== seen) return true;
  }
  return false;
}

function flush() {
  let iterations = 0;
  while (pendingEffects.size) {
    if (++iterations > 100) {
      pendingEffects.clear();
      throw new Error('Cycle detected: effects kept re-triggering');
    }
    const effects = [...pendingEffects];
    pendingEffects.clear();
    for (const e of effects) e.runIfStale();
  }
}

function startBatch() { batchDepth++; }
function endBatch() {
  if (--batchDepth === 0) {
    batchDepth++; // effects run inside a batch so their writes are collected
    try { flush(); } finally { batchDepth--; }
  }
}

class SignalNode<T> implements Source, Signal<T> {
  version = 0;
  observers = new Set<Observer>();
  constructor(private _value: T) {}
  refresh() {}
  get value(): T { track(this); return this._value; }
  set value(v: T) {
    if (Object.is(v, this._value)) return;
    this._value = v;
    this.version++;
    startBatch();
    try { for (const o of [...this.observers]) o.markStale(); } finally { endBatch(); }
  }
  peek(): T { return this._value; }
}

class ComputedNode<T> implements Source, Observer, ReadonlySignal<T> {
  version = 0;
  observers = new Set<Observer>();
  sources = new Map<Source, number>();
  private state: 'dirty' | 'check' | 'clean' = 'dirty';
  private computing = false;
  private hasValue = false;
  private _value: T | undefined;
  private error: unknown;
  private hasError = false;

  constructor(private fn: () => T) {}

  markStale() {
    if (this.state === 'clean') {
      this.state = 'check';
      for (const o of [...this.observers]) o.markStale();
    }
  }

  refresh() {
    if (this.computing) throw new Error('Cycle detected: computed reads itself');
    if (this.state === 'clean') return;
    if (this.state === 'check' && this.hasValue && !sourcesChanged(this)) {
      this.state = 'clean';
      return;
    }
    this.recompute();
  }

  private recompute() {
    unlinkSources(this);
    const prevObserver = activeObserver;
    activeObserver = this;
    this.computing = true;
    let next: T | undefined, err: unknown, threw = false;
    try { next = this.fn(); } catch (e) { err = e; threw = true; } finally {
      this.computing = false;
      activeObserver = prevObserver;
    }
    this.state = 'clean';
    if (threw) {
      if (!this.hasError || this.error !== err) this.version++;
      this.hasError = true; this.error = err; this.hasValue = true;
      return;
    }
    if (!this.hasValue || this.hasError || !Object.is(next, this._value)) {
      this.version++;
    }
    this.hasError = false;
    this.hasValue = true;
    this._value = next;
  }

  get value(): T {
    this.refresh();
    track(this);
    if (this.hasError) throw this.error;
    return this._value as T;
  }

  peek(): T {
    this.refresh();
    if (this.hasError) throw this.error;
    return this._value as T;
  }
}

class EffectNode implements Observer {
  sources = new Map<Source, number>();
  private cleanup: (() => void) | void = undefined;
  private disposed = false;

  constructor(private fn: () => void | (() => void)) {}

  markStale() {
    if (!this.disposed) pendingEffects.add(this);
  }

  runIfStale() {
    if (this.disposed) return;
    if (sourcesChanged(this)) this.run();
  }

  run() {
    this.runCleanup();
    unlinkSources(this);
    const prev = activeObserver;
    activeObserver = this;
    startBatch();
    try {
      this.cleanup = this.fn();
    } finally {
      activeObserver = prev;
      endBatch();
    }
  }

  private runCleanup() {
    const c = this.cleanup;
    this.cleanup = undefined;
    if (typeof c === 'function') untracked(c);
  }

  dispose = () => {
    if (this.disposed) return;
    this.disposed = true;
    pendingEffects.delete(this);
    this.runCleanup();
    unlinkSources(this);
  };
}

export function signal<T>(initial: T): Signal<T> {
  return new SignalNode(initial);
}

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  return new ComputedNode(fn);
}

export function effect(fn: () => void | (() => void)): () => void {
  const e = new EffectNode(fn);
  e.run();
  return e.dispose;
}

export function batch<T>(fn: () => T): T {
  startBatch();
  try { return fn(); } finally { endBatch(); }
}

/** Runs fn without tracking (cleanups use it; not part of this stage's API). */
function untracked<T>(fn: () => T): T {
  const prev = activeObserver;
  activeObserver = null;
  try { return fn(); } finally { activeObserver = prev; }
}
