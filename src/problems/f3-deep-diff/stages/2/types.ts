/** A JSON Patch (RFC 6902) operation. `diff` only emits these three in this stage. Paths are JSON Pointers. */
export type Operation =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown };
