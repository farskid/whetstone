import type { ReadonlySignal, Signal } from './types';

// Pull-based: every source has a version that bumps only when its value really changes. A computed remembers the
// version of each source it read and, when read, re-runs only if one of them moved.
interface Source {
  version: number;
  /** Bring this source up to date (no-op for plain signals). */
  refresh(): void;
}

let activeComputed: ComputedNode<unknown> | null = null;

function track(source: Source) {
  activeComputed?.sources.set(source, source.version);
}

class SignalNode<T> implements Source, Signal<T> {
  version = 0;
  constructor(private _value: T) {}
  refresh() {}
  get value(): T { track(this); return this._value; }
  set value(v: T) {
    if (Object.is(v, this._value)) return;
    this._value = v;
    this.version++;
  }
  peek(): T { return this._value; }
}

class ComputedNode<T> implements Source, ReadonlySignal<T> {
  version = 0;
  sources = new Map<Source, number>();
  private hasValue = false;
  private _value: T | undefined;

  constructor(private fn: () => T) {}

  private stale(): boolean {
    if (!this.hasValue) return true;
    for (const [src, seen] of this.sources) {
      src.refresh();
      if (src.version !== seen) return true;
    }
    return false;
  }

  refresh() {
    if (!this.stale()) return;
    this.sources.clear();
    const prev = activeComputed;
    activeComputed = this as ComputedNode<unknown>;
    let next: T;
    try { next = this.fn(); } finally { activeComputed = prev; }
    if (!this.hasValue || !Object.is(next, this._value)) this.version++;
    this.hasValue = true;
    this._value = next;
  }

  get value(): T {
    this.refresh();
    track(this);
    return this._value as T;
  }

  peek(): T {
    this.refresh();
    return this._value as T;
  }
}

export function signal<T>(initial: T): Signal<T> {
  return new SignalNode(initial);
}

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  return new ComputedNode(fn);
}
