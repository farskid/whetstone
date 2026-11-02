import type { Change } from './types';

/** Split text into lines that keep their '\n'. The last line may lack one. */
export function splitLines(text: string): string[] {
  throw new Error('Not implemented');
}

export function diffLines(oldText: string, newText: string): Change[] {
  throw new Error('Not implemented');
}
