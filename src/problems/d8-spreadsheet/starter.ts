export type ErrorCode = '#DIV/0!' | '#VALUE!' | '#NAME?' | '#CYCLE!' | '#ERROR!';
export interface CellError { error: ErrorCode }
export type Value = number | string | boolean | null | CellError;
export type CustomFunction = (...args: (Value | Value[])[]) => number | string | boolean | null;

export interface Sheet {
  /** Set a cell's input; returns the addresses whose value changed, sorted by row then column. */
  set(address: string, input: string | number): string[];
  get(address: string): Value;
  define(name: string, fn: CustomFunction): void;
}

export function createSheet(): Sheet {
  throw new Error('Not implemented');
}
