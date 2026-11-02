import type {} from './types';

type Piece = { add: boolean; start: number; length: number };

export class TextBuffer {
  private original: string;
  private added = '';
  private pieces: Piece[];
  private len: number;

  constructor(initial = '') {
    this.original = initial;
    this.pieces = initial ? [{ add: false, start: 0, length: initial.length }] : [];
    this.len = initial.length;
  }

  get length() { return this.len; }

  private text(p: Piece, from = 0, to = p.length) {
    return (p.add ? this.added : this.original).slice(p.start + from, p.start + to);
  }

  private checkOffset(offset: number) {
    if (!Number.isInteger(offset) || offset < 0 || offset > this.len) throw new RangeError(`offset ${offset} out of range 0..${this.len}`);
  }

  /** Make sure a piece starts at `offset`; returns that piece's index. */
  private splitAt(offset: number): number {
    let pos = 0;
    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i];
      if (pos === offset) return i;
      if (offset < pos + p.length) {
        const cut = offset - pos;
        const left: Piece = { add: p.add, start: p.start, length: cut };
        const right: Piece = { add: p.add, start: p.start + cut, length: p.length - cut };
        this.pieces.splice(i, 1, left, right);
        return i + 1;
      }
      pos += p.length;
    }
    return this.pieces.length;
  }

  insert(offset: number, text: string): void {
    this.checkOffset(offset);
    if (!text) return;
    const i = this.splitAt(offset);
    const start = this.added.length;
    this.added += text;
    const prev = this.pieces[i - 1];
    if (prev && prev.add && prev.start + prev.length === start) {
      // Typing at the end of the last insert: extend that piece instead of adding a new one.
      this.pieces[i - 1] = { add: true, start: prev.start, length: prev.length + text.length };
    } else {
      this.pieces.splice(i, 0, { add: true, start, length: text.length });
    }
    this.len += text.length;
  }

  delete(offset: number, length: number): void {
    this.checkOffset(offset);
    const end = Math.min(this.len, offset + Math.max(0, length));
    if (end === offset) return;
    const i = this.splitAt(offset);
    const j = this.splitAt(end);
    this.pieces.splice(i, j - i);
    this.len -= end - offset;
  }

  getText(): string {
    return this.pieces.map((p) => this.text(p)).join('');
  }
}
