import type { MemoizeOptions, Memoized } from './types';

type AnyFn = (...args: any[]) => any;

export function memoizeOne<F extends AnyFn>(fn: F, isEqual?: (newArgs: unknown[], lastArgs: unknown[]) => boolean): F {
  throw new Error('Not implemented');
}

export function memoize<F extends AnyFn>(fn: F, options: MemoizeOptions = {}): Memoized<F> {
  throw new Error('Not implemented');
}

export function createSelector<S, R>(
  inputs: ((state: S, ...args: any[]) => unknown)[],
  combiner: (...values: any[]) => R,
): ((state: S, ...args: any[]) => R) & { recomputations(): number; resetRecomputations(): void } {
  throw new Error('Not implemented');
}
