export type Id = string | number;

export interface Entry<V, P> {
  id: Id;
  /** Ordered by the queue's `compare`; smaller comes out first. */
  priority: P;
  /** Whatever was passed to `push` (undefined if omitted). */
  value: V;
}
