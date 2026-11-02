/** The error codes a cell can hold. */
export type ErrorCode = '#DIV/0!' | '#VALUE!' | '#NAME?' | '#CYCLE!' | '#ERROR!';

/** An error value, like `{ error: '#DIV/0!' }`. */
export interface CellError { error: ErrorCode }

/** A cell value; `null` is an empty cell. */
export type Value = number | string | boolean | null | CellError;

/** A custom function: each argument is a value, or an array of values for a range. */
export type CustomFunction = (...args: (Value | Value[])[]) => number | string | boolean | null;

export interface Sheet {
  /** Set a cell's input; returns the addresses whose value changed, sorted by row then column. */
  set(address: string, input: string | number): string[];
  /** The cell's current value, or `null` when empty. */
  get(address: string): Value;
  /** Register a custom function (case-insensitive) and recalculate every formula. */
  define(name: string, fn: CustomFunction): void;
}
