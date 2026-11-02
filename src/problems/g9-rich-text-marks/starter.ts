import type { Span, Editor } from './types';

/** Drops empty spans, keeps one mark per type (the last wins), sorts marks, and merges equal neighbours. */
export function normalize(spans: Span[]): Span[] {
  throw new Error('Not implemented');
}

export function toHTML(spans: Span[]): string {
  throw new Error('Not implemented');
}

export function parseHTML(html: string): Span[] {
  throw new Error('Not implemented');
}

export function createEditor(initial: Span[] = []): Editor {
  throw new Error('Not implemented');
}
