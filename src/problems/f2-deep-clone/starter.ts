export interface CloneOptions {
  /** Keep the prototype of class instances instead of producing plain objects. */
  keepPrototype?: boolean;
  /** Return a replacement for a value, or undefined to clone it normally. */
  customizer?: (value: unknown) => unknown;
}

export function clone<T>(value: T, options: CloneOptions = {}): T {
  throw new Error('Not implemented');
}
