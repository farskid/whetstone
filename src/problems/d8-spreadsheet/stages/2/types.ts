/** The error codes a cell can hold. */
export type ErrorCode = '#DIV/0!' | '#VALUE!' | '#NAME?' | '#ERROR!';

/** An error value, like `{ error: '#DIV/0!' }`. */
export interface CellError { error: ErrorCode }

/** A cell value; `null` is an empty cell. */
export type Value = number | string | boolean | null | CellError;

export interface Sheet {
  /** Store a cell's input. */
  set(address: string, input: string | number): void;
  /** The cell's current value, or `null` when empty. */
  get(address: string): Value;
}
