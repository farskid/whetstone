/** A value you can read. Reading `.value` inside a computed or effect makes it a dependency; `peek()` doesn't. */
export interface ReadonlySignal<T> {
  readonly value: T;
  peek(): T;
}

/** A writable signal: assigning `.value` updates it. */
export interface Signal<T> extends ReadonlySignal<T> {
  value: T;
}

/** An effect body: may return a cleanup, run before the next run and on dispose. */
export type EffectFn = () => void | (() => void);
