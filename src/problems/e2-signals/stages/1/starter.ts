import type { ReadonlySignal, Signal } from './types';

export function signal<T>(initial: T): Signal<T> {
  throw new Error('Not implemented');
}

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  throw new Error('Not implemented');
}
