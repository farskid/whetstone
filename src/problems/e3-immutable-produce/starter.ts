import type { Patch, Recipe } from './types';

/** Return this from a recipe to produce `undefined`. */
export const nothing: unique symbol = Symbol('nothing');

export function produce<T>(base: T, recipe: Recipe<T>): T {
  throw new Error('Not implemented');
}

export function produceWithPatches<T>(base: T, recipe: Recipe<T>): [T, Patch[], Patch[]] {
  throw new Error('Not implemented');
}

export function applyPatches<T>(base: T, patches: Patch[]): T {
  throw new Error('Not implemented');
}
