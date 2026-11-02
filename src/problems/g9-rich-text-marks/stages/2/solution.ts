import type { SimpleMarkType, Mark, MarkType, Span, Editor } from './types';

/** Outermost first. */
const RANK: MarkType[] = ['link', 'color', 'bold', 'italic', 'underline', 'code'];

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

export function createEditor(initial: Span[] = []): Editor {
  /** One entry per character. */
  let chars: { ch: string; marks: Mark[] }[] = [];

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
  };

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
      let all = true;
      for (let i = from; i < to; i++) if (!chars[i].marks.some((c) => sameMark(c, m))) all = false;
      edit(from, to, (marks) => (all ? withoutType(marks, m.type) : withMark(marks, m)));
    },
    deleteText(from, to) {
      check(from, to);
      chars.splice(from, to - from);
    },
  };
}
