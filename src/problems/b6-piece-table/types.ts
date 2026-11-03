/** 0-based line and column; columns count UTF-16 code units. */
export type Position = { line: number; col: number };

/** A frozen view of the buffer, from `snapshot()`. */
export interface Snapshot {
  readonly length: number;
  getText(): string;
}
