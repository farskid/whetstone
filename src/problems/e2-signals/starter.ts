export interface ReadonlySignal<T> {
  readonly value: T;
  peek(): T;
}

export interface Signal<T> extends ReadonlySignal<T> {
  value: T;
}

export function signal<T>(initial: T): Signal<T> {
  throw new Error('Not implemented');
}

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  throw new Error('Not implemented');
}

export function effect(fn: () => void | (() => void)): () => void {
  throw new Error('Not implemented');
}

export function batch<T>(fn: () => T): T {
  throw new Error('Not implemented');
}

export function untracked<T>(fn: () => T): T {
  throw new Error('Not implemented');
}
