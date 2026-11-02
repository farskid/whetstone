/** Marks without attributes. */
export type SimpleMarkType = 'bold' | 'italic' | 'underline' | 'code';

/** Two marks are equal when their type and attributes match. */
export type Mark =
  | { type: 'link'; href: string }
  | { type: 'color'; color: string }
  | { type: SimpleMarkType };

export type MarkType = Mark['type'];

/** A run of text that shares the same marks. */
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
  /** Typed text gets marksAt(pos). */
  insertText(pos: number, text: string): void;
  deleteText(from: number, to: number): void;
}
