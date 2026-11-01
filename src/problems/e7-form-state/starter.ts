export type Values = Record<string, any>;
export type Errors = Record<string, string>;
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}
export interface FieldConfig {
  validate?: (value: any, values: Values) => string | undefined;
  asyncValidate?: (value: any, values: Values) => Promise<string | undefined>;
  debounceMs?: number;
}
export interface FormOptions {
  initialValues: Values;
  validate?: (values: Values) => Errors;
  fields?: Record<string, FieldConfig>;
  clock?: Clock;
}
export interface SubmitResult { ok: boolean; errors: Errors }

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

export function createForm(options: FormOptions): Form {
  throw new Error('Not implemented');
}
