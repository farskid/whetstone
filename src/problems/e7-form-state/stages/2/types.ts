/** Form values: nested objects and arrays. */
export type Values = Record<string, any>;

/** Error messages keyed by index path, e.g. `items.1.title`. */
export type Errors = Record<string, string>;

/** Validators for the fields matching one pattern. Validators return a message or `undefined`. */
export interface FieldConfig {
  validate?: (value: any, values: Values) => string | undefined;
  asyncValidate?: (value: any, values: Values) => Promise<string | undefined>;
}

/** Options for `createForm`. `fields` is keyed by path patterns where `*` matches one segment. */
export interface FormOptions {
  initialValues: Values;
  validate?: (values: Values) => Errors;
  fields?: Record<string, FieldConfig>;
}

/** Form state. Paths are dot strings with numeric array indices. */
export interface Form {
  readonly values: Values;
  getValue(path: string): any;
  setValue(path: string, value: any): void;
  touch(path: string): void;
  isTouched(path: string): boolean;
  isDirty(path?: string): boolean;
  readonly errors: Errors;
  readonly isValid: boolean;
  reset(values?: Values): void;
}
