/** Options for `parse`. */
export interface ParseOptions {
  /** Most bracket groups split off a key; default 5. */
  depth?: number;
  /** Most `&`-separated parts read; default 1000. */
  parameterLimit?: number;
  /** Highest index that makes an array; default 20. */
  arrayLimit?: number;
}

/** Options for `stringify`. */
export interface StringifyOptions {
  /** How arrays are written; default `'indices'`. */
  arrayFormat?: 'indices' | 'brackets' | 'repeat';
}

/** A parsed value: a string, or arrays and objects of them. */
export type Value = string | Value[] | { [k: string]: Value };
