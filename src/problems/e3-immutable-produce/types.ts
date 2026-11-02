/** A path from the root to a value: object keys, Map keys, and array indices as numbers. */
export type PatchPath = (string | number)[];

/** One change. `value` is set for `add` and `replace`. */
export interface Patch { op: 'add' | 'remove' | 'replace'; path: PatchPath; value?: unknown }

/**
 * Mutates the draft, or returns a replacement: `undefined` or the draft itself means "use the draft", and the
 * `nothing` symbol your module exports means `undefined`.
 */
export type Recipe<T> = (draft: T) => T | void | symbol;
