import type { ReadonlySignal, Signal, EffectFn } from './types';

export function signal<T>(initial: T): Signal<T> {
  throw new Error('Not implemented');
}

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  throw new Error('Not implemented');
}

export function effect(fn: EffectFn): () => void {
  throw new Error('Not implemented');
}

export function batch<T>(fn: () => T): T {
  throw new Error('Not implemented');
}

export function untracked<T>(fn: () => T): T {
  throw new Error('Not implemented');
}
