import type { Change } from './types';

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

