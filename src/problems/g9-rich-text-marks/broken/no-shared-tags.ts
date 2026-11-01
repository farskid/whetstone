// Bug: Opens and closes every tag per span.
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

/** Outermost first. */
const RANK: MarkType[] = ['link', 'color', 'bold', 'italic', 'underline', 'code'];
const TAG: Record<SimpleMarkType, string> = { bold: 'strong', italic: 'em', underline: 'u', code: 'code' };

const toMark = (m: Mark | SimpleMarkType): Mark => (typeof m === 'string' ? { type: m } : m);
const copy = (m: Mark): Mark => ({ ...m });

function sameMark(a: Mark, b: Mark): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'link') return a.href === (b as { href: string }).href;
  if (a.type === 'color') return a.color === (b as { color: string }).color;
  return true;
}

/** One mark per type (the last one wins), sorted by rank. */
function cleanMarks(marks: Mark[]): Mark[] {
  const byType = new Map<MarkType, Mark>();
  for (const m of marks) byType.set(m.type, m);
  return [...byType.values()].sort((a, b) => RANK.indexOf(a.type) - RANK.indexOf(b.type)).map(copy);
}

const sameMarks = (a: Mark[], b: Mark[]) => a.length === b.length && a.every((m, i) => sameMark(m, b[i]));

export function normalize(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const span of spans) {
    if (!span.text) continue;
    const marks = cleanMarks(span.marks);
    const prev = out[out.length - 1];
    if (prev && sameMarks(prev.marks, marks)) prev.text += span.text;
    else out.push({ text: span.text, marks });
  }
  return out;
}

const withMark = (marks: Mark[], mark: Mark) => cleanMarks([...marks.filter((m) => m.type !== mark.type), mark]);
const withoutType = (marks: Mark[], type: MarkType) => marks.filter((m) => m.type !== type);

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;');

function openTag(m: Mark): string {
  if (m.type === 'link') return `<a href="${escapeAttr(m.href)}">`;
  if (m.type === 'color') return `<span style="color: ${escapeAttr(m.color)}">`;
  return `<${TAG[m.type]}>`;
}
function closeTag(m: Mark): string {
  if (m.type === 'link') return '</a>';
  if (m.type === 'color') return '</span>';
  return `</${TAG[m.type]}>`;
}

export function toHTML(spans: Span[]): string {
  let html = '';
  const open: Mark[] = [];
  for (const span of normalize(spans)) {
    let keep = 0;
    while (open.length > keep) html += closeTag(open.pop()!);
    for (const m of span.marks.slice(keep)) {
      html += openTag(m);
      open.push(m);
    }
    html += escapeText(span.text);
  }
  while (open.length) html += closeTag(open.pop()!);
  return html;
}

const unescape = (s: string) =>
  s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]!);

export function parseHTML(html: string): Span[] {
  const spans: Span[] = [];
  const stack: { tag: string; mark: Mark | null }[] = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) {
      const marks = stack.map((s) => s.mark).filter((x): x is Mark => x !== null);
      spans.push({ text: unescape(m[4]), marks });
      continue;
    }
    const tag = m[2].toLowerCase();
    if (m[1]) {
      const i = stack.map((s) => s.tag).lastIndexOf(tag);
      if (i >= 0) stack.length = i;
      continue;
    }
    const attrs = m[3];
    let mark: Mark | null = null;
    if (tag === 'strong' || tag === 'b') mark = { type: 'bold' };
    else if (tag === 'em' || tag === 'i') mark = { type: 'italic' };
    else if (tag === 'u') mark = { type: 'underline' };
    else if (tag === 'code') mark = { type: 'code' };
    else if (tag === 'a') {
      const href = /href="([^"]*)"/.exec(attrs);
      if (href) mark = { type: 'link', href: unescape(href[1]) };
    } else if (tag === 'span') {
      const color = /style="[^"]*color:\s*([^;"]+)/.exec(attrs);
      if (color) mark = { type: 'color', color: unescape(color[1].trim()) };
    }
    if (!/\/\s*$/.test(attrs)) stack.push({ tag, mark });
  }
  return normalize(spans);
}

export function createEditor(initial: Span[] = []): Editor {
  /** One entry per character. */
  let chars: { ch: string; marks: Mark[] }[] = [];
  let stored: { pos: number; marks: Mark[] } | null = null;

  const load = (spans: Span[]) => {
    chars = [];
    for (const s of normalize(spans)) for (const ch of s.text.split('')) chars.push({ ch, marks: s.marks });
  };
  load(initial);

  const spans = () => normalize(chars.map((c) => ({ text: c.ch, marks: c.marks })));
  const check = (from: number, to: number) => {
    if (!(Number.isInteger(from) && Number.isInteger(to)) || from < 0 || to > chars.length || from > to) {
      throw new RangeError(`Bad range ${from}..${to} for length ${chars.length}`);
    }
  };
  const edit = (from: number, to: number, f: (marks: Mark[]) => Mark[]) => {
    for (let i = from; i < to; i++) chars[i] = { ch: chars[i].ch, marks: f(chars[i].marks) };
    stored = null;
  };

  const inherited = (pos: number): Mark[] => {
    const before = chars[pos - 1]?.marks;
    const after = chars[pos]?.marks;
    const base = before ?? after ?? [];
    return base.filter((m) => m.type !== 'link' || (!!before && !!after && before.some((b) => sameMark(b, m)) && after.some((a) => sameMark(a, m))));
  };
  const marksAt = (pos: number) => (stored && stored.pos === pos ? stored.marks : inherited(pos));

  return {
    getSpans: () => spans().map((s) => ({ text: s.text, marks: s.marks.map(copy) })),
    getText: () => chars.map((c) => c.ch).join(''),
    addMark(from, to, mark) {
      check(from, to);
      const m = toMark(mark);
      edit(from, to, (marks) => withMark(marks, m));
    },
    removeMark(from, to, type) {
      check(from, to);
      edit(from, to, (marks) => withoutType(marks, type));
    },
    toggleMark(from, to, mark) {
      check(from, to);
      const m = toMark(mark);
      if (from === to) {
        const current = marksAt(from);
        const marks = current.some((c) => sameMark(c, m)) ? withoutType(current, m.type) : withMark(current, m);
        stored = { pos: from, marks };
        return;
      }
      let all = true;
      for (let i = from; i < to; i++) if (!chars[i].marks.some((c) => sameMark(c, m))) all = false;
      edit(from, to, (marks) => (all ? withoutType(marks, m.type) : withMark(marks, m)));
    },
    marksAt(pos) {
      check(pos, pos);
      return marksAt(pos).map(copy);
    },
    insertText(pos, text) {
      check(pos, pos);
      if (!text) return;
      const marks = cleanMarks(marksAt(pos));
      chars.splice(pos, 0, ...text.split('').map((ch) => ({ ch, marks })));
      stored = null;
    },
    deleteText(from, to) {
      check(from, to);
      chars.splice(from, to - from);
      stored = null;
    },
    toHTML: () => toHTML(spans()),
  };
}
