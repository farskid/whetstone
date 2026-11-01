// Bug: counts of 1 are omitted
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
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      out.push(text.slice(start, i + 1));
      start = i + 1;
    }
  }
  if (start < text.length) out.push(text.slice(start));
  return out;
}

type Op = 0 | 1 | 2; // 0 equal, 1 remove, 2 add

/** Myers O((N+M)D) shortest edit script; common prefix/suffix trimmed first. */
function editScript(a: string[], b: string[]): Op[] {
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const A = a.slice(pre, a.length - suf);
  const B = b.slice(pre, b.length - suf);
  const n = A.length, m = B.length, max = n + m, off = max + 1;
  const middle: Op[] = [];
  if (n === 0) for (let j = 0; j < m; j++) middle.push(2);
  else if (m === 0) for (let i = 0; i < n; i++) middle.push(1);
  else {
    const v = new Int32Array(2 * max + 3);
    const trace: Int32Array[] = [];
    let found = false;
    for (let d = 0; d <= max && !found; d++) {
      trace.push(v.slice());
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
        let y = x - k;
        while (x < n && y < m && A[x] === B[y]) { x++; y++; }
        v[off + k] = x;
        if (x >= n && y >= m) { found = true; break; }
      }
    }
    let x = n, y = m;
    for (let d = trace.length - 1; d >= 0; d--) {
      const vd = trace[d];
      const k = x - y;
      if (d === 0) { while (x > 0) { middle.push(0); x--; y--; } break; }
      const down = k === -d || (k !== d && vd[off + k - 1] < vd[off + k + 1]);
      const prevK = down ? k + 1 : k - 1;
      const prevX = vd[off + prevK];
      const prevY = prevX - prevK;
      while (x > prevX && y > prevY) { middle.push(0); x--; y--; }
      middle.push(down ? 2 : 1);
      x = prevX; y = prevY;
    }
    middle.reverse();
  }
  const ops: Op[] = [];
  for (let i = 0; i < pre; i++) ops.push(0);
  // Within each changed run, removes come before adds.
  for (let i = 0; i < middle.length; ) {
    if (middle[i] === 0) { ops.push(0); i++; continue; }
    let r = 0, ad = 0;
    while (i < middle.length && middle[i] !== 0) { if (middle[i] === 1) r++; else ad++; i++; }
    for (; r > 0; r--) ops.push(1);
    for (; ad > 0; ad--) ops.push(2);
  }
  for (let i = 0; i < suf; i++) ops.push(0);
  return ops;
}

function toChanges(a: string[], b: string[]): Change[] {
  const ops = editScript(a, b);
  const out: Change[] = [];
  let i = 0, j = 0;
  for (const op of ops) {
    const value = op === 2 ? b[j] : a[i];
    if (op !== 2) i++;
    if (op !== 1) j++;
    const last = out[out.length - 1];
    const sameKind = last && (op === 0 ? !last.added && !last.removed : op === 1 ? last.removed : last.added);
    if (sameKind) { last.value += value; last.count++; }
    else out.push(op === 0 ? { value, count: 1 } : op === 1 ? { value, count: 1, removed: true } : { value, count: 1, added: true });
  }
  return out;
}

export function diffLines(oldText: string, newText: string): Change[] {
  return toChanges(splitLines(oldText), splitLines(newText));
}

export function diffWords(oldText: string, newText: string): Change[] {
  const tok = (s: string) => s.split(/(\s+)/).filter((t) => t !== '');
  return toChanges(tok(oldText), tok(newText));
}

export function structuredPatch(oldFileName: string, newFileName: string, oldText: string, newText: string, options: { context?: number } = {}): StructuredPatch {
  const context = options.context ?? 3;
  const a = splitLines(oldText), b = splitLines(newText);
  const ops = editScript(a, b);
  // Annotate each op with its line and the old/new line numbers before it.
  type Row = { op: Op; text: string; oldIdx: number; newIdx: number };
  const rows: Row[] = [];
  let i = 0, j = 0;
  for (const op of ops) {
    rows.push({ op, text: op === 2 ? b[j] : a[i], oldIdx: i, newIdx: j });
    if (op !== 2) i++;
    if (op !== 1) j++;
  }
  const hunks: Hunk[] = [];
  let r = 0;
  while (r < rows.length) {
    if (rows[r].op === 0) { r++; continue; }
    let start = Math.max(0, r - context);
    let end = r; // exclusive end of the last change seen
    while (end < rows.length) {
      while (end < rows.length && rows[end].op !== 0) end++;
      let eq = end;
      while (eq < rows.length && rows[eq].op === 0) eq++;
      if (eq < rows.length && eq - end <= 2 * context) end = eq;
      else break;
    }
    const stop = Math.min(rows.length, end + context);
    const slice = rows.slice(start, stop);
    const lines: string[] = [];
    for (const row of slice) {
      const prefix = row.op === 0 ? ' ' : row.op === 1 ? '-' : '+';
      const ends = row.text.endsWith('\n');
      lines.push(prefix + (ends ? row.text.slice(0, -1) : row.text));
      if (!ends) lines.push(NO_NEWLINE);
    }
    const oldLines = slice.filter((x) => x.op !== 2).length;
    const newLines = slice.filter((x) => x.op !== 1).length;
    const first = slice[0];
    hunks.push({
      oldStart: oldLines === 0 ? first.oldIdx : first.oldIdx + 1,
      oldLines,
      newStart: newLines === 0 ? first.newIdx : first.newIdx + 1,
      newLines,
      lines,
    });
    r = stop;
  }
  return { oldFileName, newFileName, hunks };
}

export function formatPatch(patch: StructuredPatch): string {
  if (patch.hunks.length === 0) return '';
  const out = [`--- ${patch.oldFileName}`, `+++ ${patch.newFileName}`];
  for (const h of patch.hunks) {
    const r = (s: number, l: number) => (l === 1 ? `${s}` : `${s},${l}`);
    out.push(`@@ -${r(h.oldStart, h.oldLines)} +${r(h.newStart, h.newLines)} @@`, ...h.lines);
  }
  return out.join('\n') + '\n';
}

export function createPatch(fileName: string, oldText: string, newText: string, options: { context?: number } = {}): string {
  return formatPatch(structuredPatch(fileName, fileName, oldText, newText, options));
}

export function parsePatch(text: string): StructuredPatch {
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const patch: StructuredPatch = { oldFileName: '', newFileName: '', hunks: [] };
  let hunk: Hunk | null = null;
  for (const line of lines) {
    const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (header) {
      hunk = { oldStart: +header[1], oldLines: header[2] === undefined ? 1 : +header[2], newStart: +header[3], newLines: header[4] === undefined ? 1 : +header[4], lines: [] };
      patch.hunks.push(hunk);
    } else if (!hunk && line.startsWith('--- ')) patch.oldFileName = line.slice(4);
    else if (!hunk && line.startsWith('+++ ')) patch.newFileName = line.slice(4);
    else if (hunk && (line[0] === ' ' || line[0] === '-' || line[0] === '+' || line[0] === '\\')) hunk.lines.push(line);
    else if (hunk && line === '') hunk.lines.push(' ');
    else if (hunk) throw new Error(`Unexpected patch line: ${line}`);
  }
  return patch;
}

export function applyPatch(source: string, patch: string | StructuredPatch): string {
  const p = typeof patch === 'string' ? parsePatch(patch) : patch;
  const lines = splitLines(source);
  let delta = 0;
  for (const h of p.hunks) {
    const before: string[] = [];
    const after: string[] = [];
    h.lines.forEach((line, idx) => {
      if (line[0] === '\\') return;
      const noNl = h.lines[idx + 1] === NO_NEWLINE;
      const text = line.slice(1) + (noNl ? '' : '\n');
      if (line[0] !== '+') before.push(text);
      if (line[0] !== '-') after.push(text);
    });
    const expected = (h.oldLines === 0 ? h.oldStart : h.oldStart - 1) + delta;
    const fits = (at: number) => at >= 0 && at + before.length <= lines.length && before.every((t, k) => lines[at + k] === t);
    let at = -1;
    for (let d = 0; d <= Math.max(expected, lines.length - expected) + 1; d++) {
      if (fits(expected - d)) { at = expected - d; break; }
      if (fits(expected + d)) { at = expected + d; break; }
    }
    if (at === -1) throw new Error(`Hunk @@ -${h.oldStart},${h.oldLines} does not apply`);
    lines.splice(at, before.length, ...after);
    delta = at - (h.oldLines === 0 ? h.oldStart : h.oldStart - 1) + after.length - before.length;
  }
  return lines.join('');
}
