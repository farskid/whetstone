import type { Position, Snapshot } from './types';

/** Immutable: never mutated after creation, so snapshots can share them. */
type Piece = { add: boolean; start: number; length: number; breaks: number[] /* offsets of '\n' inside the piece */ };

function findBreaks(text: string, from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = text.indexOf('\n', from); i !== -1 && i < to; i = text.indexOf('\n', i + 1)) out.push(i - from);
  return out;
}

const isHigh = (c: number) => c >= 0xd800 && c <= 0xdbff;
const isLow = (c: number) => c >= 0xdc00 && c <= 0xdfff;

export class TextBuffer {
  private original: string;
  private added = '';
  private pieces: Piece[];
  private shared = false;
  private len: number;
  private breakCount: number;

  constructor(initial = '') {
    this.original = initial;
    this.pieces = initial ? [{ add: false, start: 0, length: initial.length, breaks: findBreaks(initial, 0, initial.length) }] : [];
    this.len = initial.length;
    this.breakCount = this.pieces[0]?.breaks.length ?? 0;
  }

  get length() { return this.len; }
  get lineCount() { return this.breakCount + 1; }

  private text(p: Piece, from = 0, to = p.length) {
    return (p.add ? this.added : this.original).slice(p.start + from, p.start + to);
  }

  private codeAt(offset: number): number {
    let pos = 0;
    for (const p of this.pieces) {
      if (offset < pos + p.length) return (p.add ? this.added : this.original).charCodeAt(p.start + offset - pos);
      pos += p.length;
    }
    return NaN;
  }

  private splitsPair(offset: number) {
    return offset > 0 && offset < this.len && isHigh(this.codeAt(offset - 1)) && isLow(this.codeAt(offset));
  }

  private checkOffset(offset: number) {
    if (!Number.isInteger(offset) || offset < 0 || offset > this.len) throw new RangeError(`offset ${offset} out of range 0..${this.len}`);
    if (this.splitsPair(offset)) throw new RangeError(`offset ${offset} splits a surrogate pair`);
  }

  private writable() {
    if (this.shared) { this.pieces = this.pieces.slice(); this.shared = false; }
  }

  /** Make sure a piece starts at `offset`; returns that piece's index. */
  private splitAt(offset: number): number {
    let pos = 0;
    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i];
      if (pos === offset) return i;
      if (offset < pos + p.length) {
        const cut = offset - pos;
        const left: Piece = { add: p.add, start: p.start, length: cut, breaks: p.breaks.filter((b) => b < cut) };
        const right: Piece = { add: p.add, start: p.start + cut, length: p.length - cut, breaks: p.breaks.filter((b) => b >= cut).map((b) => b - cut) };
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
    this.writable();
    const i = this.splitAt(offset);
    const start = this.added.length;
    this.added += text;
    const breaks = findBreaks(text, 0, text.length);
    const prev = this.pieces[i - 1];
    if (prev && prev.add && prev.start + prev.length === start) {
      // Typing at the end of the last insert: extend that piece instead of adding a new one.
      this.pieces[i - 1] = { add: true, start: prev.start, length: prev.length + text.length, breaks: prev.breaks.concat(breaks.map((b) => b + prev.length)) };
    } else {
      this.pieces.splice(i, 0, { add: true, start, length: text.length, breaks });
    }
    this.len += text.length;
    this.breakCount += breaks.length;
  }

  delete(offset: number, length: number): void {
    this.checkOffset(offset);
    const end = Math.min(this.len, offset + Math.max(0, length));
    if (this.splitsPair(end)) throw new RangeError(`end ${end} splits a surrogate pair`);
    if (end === offset) return;
    this.writable();
    const i = this.splitAt(offset);
    const j = this.splitAt(end);
    for (let k = i; k < j; k++) this.breakCount -= this.pieces[k].breaks.length;
    this.pieces.splice(i, j - i);
    this.len -= end - offset;
  }

  getText(): string {
    return this.pieces.map((p) => this.text(p)).join('');
  }

  private substring(from: number, to: number): string {
    const out: string[] = [];
    let pos = 0;
    for (const p of this.pieces) {
      if (pos >= to) break;
      const a = Math.max(from, pos), b = Math.min(to, pos + p.length);
      if (a < b) out.push(this.text(p, a - pos, b - pos));
      pos += p.length;
    }
    return out.join('');
  }

  /** Offset of the first character of line n. */
  private lineStart(n: number): number {
    if (n === 0) return 0;
    let count = 0, pos = 0;
    for (const p of this.pieces) {
      if (count + p.breaks.length >= n) return pos + p.breaks[n - count - 1] + 1;
      count += p.breaks.length;
      pos += p.length;
    }
    return this.len;
  }

  /** [start, end of content) for line n, excluding '\n' or '\r\n'. */
  private lineRange(n: number): [number, number] {
    const start = this.lineStart(n);
    if (n + 1 >= this.lineCount) return [start, this.len];
    let end = this.lineStart(n + 1) - 1;
    if (end > start && this.codeAt(end - 1) === 13) end--;
    return [start, end];
  }

  getLine(line: number): string {
    if (!Number.isInteger(line) || line < 0 || line >= this.lineCount) throw new RangeError(`line ${line} out of range`);
    const [a, b] = this.lineRange(line);
    return this.substring(a, b);
  }

  positionAt(offset: number): Position {
    offset = Math.max(0, Math.min(this.len, Math.floor(offset)));
    let line = 0, pos = 0;
    for (const p of this.pieces) {
      if (pos >= offset) break;
      if (pos + p.length <= offset) line += p.breaks.length;
      else {
        // Binary search: breaks inside this piece that come before offset.
        let lo = 0, hi = p.breaks.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (pos + p.breaks[mid] < offset) lo = mid + 1; else hi = mid; }
        line += lo;
      }
      pos += p.length;
    }
    const [start, end] = this.lineRange(line);
    return { line, col: Math.min(offset, end) - start };
  }

  offsetAt(position: Position): number {
    const line = Math.max(0, Math.min(this.lineCount - 1, Math.floor(position.line)));
    const [start, end] = this.lineRange(line);
    let offset = start + Math.max(0, Math.min(end - start, Math.floor(position.col)));
    if (this.splitsPair(offset)) offset--;
    return offset;
  }

  snapshot(): Snapshot {
    this.shared = true;
    const pieces = this.pieces, original = this.original, added = this.added, length = this.len;
    return {
      length,
      getText: () => pieces.map((p) => (p.add ? added : original).slice(p.start, p.start + p.length)).join(''),
    };
  }
}
