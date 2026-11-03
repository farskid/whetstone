/** Options for `stringify`. */
export interface StringifyOptions {
  /** How arrays are written; default `'indices'`. */
  arrayFormat?: 'indices' | 'brackets' | 'repeat';
}

/** A parsed value: a string, or arrays and objects of them. */
export type Value = string | Value[] | { [k: string]: Value };
