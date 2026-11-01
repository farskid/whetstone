export type SimpleMarkType = 'bold' | 'italic' | 'underline' | 'code';

export type Mark =
  | { type: 'link'; href: string }
  | { type: 'color'; color: string }
  | { type: SimpleMarkType };

export type MarkType = Mark['type'];

export interface Span {
  text: string;
  marks: Mark[];
}

export interface Editor {
  getSpans(): Span[];
  getText(): string;
  addMark(from: number, to: number, mark: Mark | SimpleMarkType): void;
  removeMark(from: number, to: number, type: MarkType): void;
  toggleMark(from: number, to: number, mark: Mark | SimpleMarkType): void;
  /** The marks text typed at pos would get. */
  marksAt(pos: number): Mark[];
  insertText(pos: number, text: string): void;
  deleteText(from: number, to: number): void;
  toHTML(): string;
}

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
