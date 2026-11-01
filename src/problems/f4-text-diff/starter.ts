export interface Change {
  value: string;
  count: number;
  added?: true;
  removed?: true;
}

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  /** ' ', '-', '+' prefixed lines without terminators, plus '\ No newline at end of file' markers. */
  lines: string[];
}

export interface StructuredPatch {
  oldFileName: string;
  newFileName: string;
  hunks: Hunk[];
}

export const NO_NEWLINE = '\\ No newline at end of file';

/** Split text into lines that keep their '\n'. The last line may lack one. */
export function splitLines(text: string): string[] {
  throw new Error('Not implemented');
}

export function diffLines(oldText: string, newText: string): Change[] {
  throw new Error('Not implemented');
}

export function diffWords(oldText: string, newText: string): Change[] {
  throw new Error('Not implemented');
}

export function structuredPatch(oldFileName: string, newFileName: string, oldText: string, newText: string, options: { context?: number } = {}): StructuredPatch {
  throw new Error('Not implemented');
}

export function createPatch(fileName: string, oldText: string, newText: string, options: { context?: number } = {}): string {
  throw new Error('Not implemented');
}

export function applyPatch(source: string, patch: string | StructuredPatch): string {
  throw new Error('Not implemented');
}
