/** One run of the diff: `count` lines (tokens) joined into `value`. */
export interface Change {
  value: string;
  count: number;
  added?: true;
  removed?: true;
}

/** One hunk of a unified patch. Starts are 1-based. */
export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  /** ' ', '-', '+' prefixed lines without terminators, plus '\ No newline at end of file' markers. */
  lines: string[];
}

/** A parsed or generated unified patch. */
export interface StructuredPatch {
  oldFileName: string;
  newFileName: string;
  hunks: Hunk[];
}

/** Options for `structuredPatch` and `createPatch`. */
export interface PatchOptions {
  /** Unchanged lines kept around each change; default 3. */
  context?: number;
}
