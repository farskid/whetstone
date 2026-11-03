/** Event name → argument tuple, e.g. `{ data: [chunk: string]; end: [] }`. */
export type EventMap = Record<string, unknown[]>;

/** A listener for one event: gets that event's arguments. */
export type Listener<A extends unknown[]> = (...args: A) => void;
