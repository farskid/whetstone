/**
 * Mutates the draft, or returns a replacement: `undefined` or the draft itself means "use the draft", and the
 * `nothing` symbol your module exports means `undefined`.
 */
export type Recipe<T> = (draft: T) => T | void | symbol;
