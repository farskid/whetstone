/** Form values: nested objects and arrays. */
export type Values = Record<string, any>;

/** Error messages keyed by index path, e.g. `items.1.title`. */
export type Errors = Record<string, string>;

/** Timer source. `setTimeout` returns an id for `clearTimeout`. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

/** Validators for the fields matching one pattern. Validators return a message or `undefined`. */
export interface FieldConfig {
  validate?: (value: any, values: Values) => string | undefined;
  asyncValidate?: (value: any, values: Values) => Promise<string | undefined>;
  /** Delay before an async check starts. Default 0 (immediately). */
  debounceMs?: number;
}

/** Options for `createForm`. `fields` is keyed by path patterns where `*` matches one segment. */
export interface FormOptions {
  initialValues: Values;
  validate?: (values: Values) => Errors;
  fields?: Record<string, FieldConfig>;
  clock?: Clock;
}

/** What `submit` resolves to. */
export interface SubmitResult { ok: boolean; errors: Errors }

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
  readonly isValidating: boolean;
  submit(onSubmit?: (values: Values) => unknown): Promise<SubmitResult>;
  reset(values?: Values): void;
  append(path: string, item: any): void;
  remove(path: string, index: number): void;
  move(path: string, from: number, to: number): void;
  ids(path: string): string[];
}
