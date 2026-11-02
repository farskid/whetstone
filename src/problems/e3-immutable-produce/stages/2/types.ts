/** Mutates the draft. It returns nothing (return values come in a later stage). */
export type Recipe<T> = (draft: T) => void;
