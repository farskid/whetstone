/** A successful match. */
export interface Match {
  /** Score of the chosen alignment. */
  score: number;
  /** Indices into the original text, ascending. */
  positions: number[];
  /** Matched positions merged into half-open [start, end) ranges. */
  ranges: [number, number][];
}
