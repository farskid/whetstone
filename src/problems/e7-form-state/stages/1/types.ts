/** Form values: nested objects and arrays. */
export type Values = Record<string, any>;

/** Options for `createForm`. */
export interface FormOptions {
  initialValues: Values;
}

/** Form state. Paths are dot strings with numeric array indices. */
export interface Form {
  readonly values: Values;
  getValue(path: string): any;
  setValue(path: string, value: any): void;
  touch(path: string): void;
  isTouched(path: string): boolean;
  isDirty(path?: string): boolean;
  reset(values?: Values): void;
}
