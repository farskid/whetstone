// Bug: keeps one plain string and rebuilds it on every edit, and splits it to answer line queries.
export type Position = { line: number; col: number };

export class TextBuffer {
  private s: string;
  constructor(initial = '') { this.s = initial; }
  get length() { return this.s.length; }
  get lineCount() { return this.s.split('\n').length; }
  getText() { return this.s; }
  private check(o: number) {
    if (!Number.isInteger(o) || o < 0 || o > this.s.length) throw new RangeError('offset');
    const c = this.s.charCodeAt(o - 1), d = this.s.charCodeAt(o);
    if (o > 0 && c >= 0xd800 && c <= 0xdbff && d >= 0xdc00 && d <= 0xdfff) throw new RangeError('pair');
  }
  insert(o: number, t: string) { this.check(o); this.s = this.s.slice(0, o) + t + this.s.slice(o); }
  delete(o: number, n: number) {
    this.check(o);
    const e = Math.min(this.s.length, o + Math.max(0, n));
    this.check(e);
    this.s = this.s.slice(0, o) + this.s.slice(e);
  }
  getLine(n: number) {
    const lines = this.s.split('\n');
    if (!Number.isInteger(n) || n < 0 || n >= lines.length) throw new RangeError('line');
    return n < lines.length - 1 ? lines[n].replace(/\r$/, '') : lines[n];
  }
  positionAt(o: number): Position {
    o = Math.max(0, Math.min(this.s.length, Math.floor(o)));
    const before = this.s.slice(0, o).split('\n');
    const line = before.length - 1;
    return { line, col: Math.min(before[line].length, this.getLine(line).length) };
  }
  offsetAt(p: Position) {
    const lines = this.s.split('\n');
    const line = Math.max(0, Math.min(lines.length - 1, Math.floor(p.line)));
    let off = 0;
    for (let i = 0; i < line; i++) off += lines[i].length + 1;
    let o = off + Math.max(0, Math.min(this.getLine(line).length, Math.floor(p.col)));
    const c = this.s.charCodeAt(o - 1), d = this.s.charCodeAt(o);
    if (o > 0 && c >= 0xd800 && c <= 0xdbff && d >= 0xdc00 && d <= 0xdfff) o--;
    return o;
  }
  snapshot() { const s = this.s; return { length: s.length, getText: () => s }; }
}
