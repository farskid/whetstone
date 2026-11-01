export type PatchPath = (string | number)[];
export interface Patch { op: 'add' | 'remove' | 'replace'; path: PatchPath; value?: unknown }
export type Recipe<T> = (draft: T) => T | void | typeof nothing;

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
