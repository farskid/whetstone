/** Event name → argument tuple, e.g. `{ data: [chunk: string]; end: [] }`. */
export type EventMap = Record<string, unknown[]>;

/** A listener for one event: gets that event's arguments. */
export type Listener<A extends unknown[]> = (...args: A) => void;

/** A `'*'` listener: gets the event name, then its arguments. */
export type Wildcard<E extends EventMap> = (name: keyof E & string, ...args: any[]) => void;

/** Options for `new Emitter(options)`. */
export interface EmitterOptions {
  /** Called with the leak warning. Default: console.warn. */
  onWarning?: (message: string) => void;
}

/** Options for `once(emitter, name, options)`. */
export interface OnceOptions {
  /** Aborting rejects the promise and removes the listeners. */
  signal?: AbortSignal;
}
