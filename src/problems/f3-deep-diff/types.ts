/** A JSON Patch (RFC 6902) operation. Paths are JSON Pointers. */
export type Operation =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string }
  | { op: 'copy'; from: string; path: string }
  | { op: 'test'; path: string; value: unknown };

export interface DiffOptions {
  /** Identity of an array item. When given, reordered items become `move` ops. */
  objectHash?: (item: unknown, index: number) => string;
}
