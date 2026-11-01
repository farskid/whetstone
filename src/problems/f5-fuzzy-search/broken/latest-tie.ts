// Bug: ties go to the latest positions
export interface Match {
  score: number;
  /** Indices into the original text, ascending. */
  positions: number[];
  /** Matched positions merged into half-open [start, end) ranges. */
  ranges: [number, number][];
}

export interface SearchKey {
  name: string;
  weight?: number;
}

export interface SearchOptions {
  keys?: (string | SearchKey)[];
  typo?: boolean;
  limit?: number;
}

export interface SearchResult<T> extends Match {
  item: T;
  refIndex: number;
  /** The key that produced the best score (undefined for string items). */
  key?: string;
}

export const SCORE = { match: 16, start: 10, separator: 9, boundary: 8, consecutive: 8, gapStart: 3, gapExtend: 1, typo: 10 };

const SEPARATORS = /[\s_\-/.:]/;
const isLower = (c: string) => c !== c.toUpperCase() && c === c.toLowerCase();
const isUpper = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase();
const isDigit = (c: string) => c >= '0' && c <= '9';

export function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

interface Folded { chars: string[]; orig: number[]; bonus: number[] }

function prepare(text: string): Folded {
  const chars: string[] = [], orig: number[] = [], bonus: number[] = [];
  const cps = Array.from(text);
  let idx = 0;
  let prev = '';
  for (const cp of cps) {
    let b = 0;
    if (idx === 0) b = SCORE.start;
    else if (SEPARATORS.test(prev)) b = SCORE.separator;
    else if ((isLower(prev) && isUpper(cp)) || (isDigit(cp) && !isDigit(prev)) || (!isDigit(cp) && isDigit(prev) && !SEPARATORS.test(cp))) b = SCORE.boundary;
    let first = true;
    for (const f of Array.from(fold(cp))) {
      chars.push(f);
      orig.push(idx);
      bonus.push(first ? b : 0);
      first = false;
    }
    prev = cp;
    idx += cp.length;
  }
  return { chars, orig, bonus };
}

function toRanges(positions: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const p of positions) {
    const last = out[out.length - 1];
    if (last && last[1] === p) last[1] = p + 1;
    else if (!last || last[1] <= p) out.push([p, p + 1]);
  }
  return out;
}

export function fuzzyMatch(query: string, text: string): Match | null {
  const q = Array.from(fold(query));
  if (q.length === 0) return { score: 0, positions: [], ranges: [] };
  const t = prepare(text);
  const n = t.chars.length, k = q.length;
  if (k > n) return null;
  const NEG = -Infinity;
  // best[i][j]: best score for q[i..] when q[i] is matched at folded index j.
  const best: Float64Array[] = Array.from({ length: k }, () => new Float64Array(n).fill(NEG));
  for (let i = k - 1; i >= 0; i--) {
    const row = best[i], next = best[i + 1];
    let farMax = NEG; // max over j' >= j + 2 of next[j'] - j'
    for (let j = n - 1; j >= 0; j--) {
      if (next && j + 2 < n) farMax = Math.max(farMax, next[j + 2] - (j + 2));
      if (t.chars[j] !== q[i]) continue;
      const own = SCORE.match + t.bonus[j];
      if (!next) { row[j] = own; continue; }
      const adj = j + 1 < n ? next[j + 1] + SCORE.consecutive : NEG;
      // A gap of g = j' - j - 1 >= 1 costs gapStart + (g - 1) * gapExtend (gapExtend is 1).
      const far = farMax + j - (SCORE.gapStart - 2);
      const v = Math.max(adj, far);
      if (v !== NEG) row[j] = own + v;
    }
  }
  let score = NEG, j0 = -1;
  for (let j = 0; j < n; j++) if (best[0][j] >= score) { score = best[0][j]; j0 = j; }
  if (j0 === -1) return null;
  const folded = [j0];
  for (let i = 1; i < k; i++) {
    const prevJ = folded[i - 1];
    const want = best[i - 1][prevJ] - SCORE.match - t.bonus[prevJ];
    for (let j = prevJ + 1; j < n; j++) {
      if (best[i][j] === NEG) continue;
      const trans = j === prevJ + 1 ? SCORE.consecutive : -(SCORE.gapStart + (j - prevJ - 2) * SCORE.gapExtend);
      if (best[i][j] + trans === want) { folded.push(j); break; }
    }
  }
  const positions = [...new Set(folded.map((f) => t.orig[f]))];
  return { score, positions, ranges: toRanges(positions) };
}

function bestFor(query: string, text: string, typo: boolean): Match | null {
  const exact = fuzzyMatch(query, text);
  if (exact || !typo) return exact;
  const q = Array.from(query);
  if (q.length < 3) return null;
  let best: Match | null = null;
  for (let i = 0; i < q.length; i++) {
    const m = fuzzyMatch(q.slice(0, i).join('') + q.slice(i + 1).join(''), text);
    if (m && (!best || m.score - SCORE.typo > best.score)) best = { ...m, score: m.score - SCORE.typo };
  }
  return best;
}

export function search<T>(items: T[], query: string, options: SearchOptions = {}): SearchResult<T>[] {
  const keys = (options.keys ?? []).map((k) => (typeof k === 'string' ? { name: k, weight: 1 } : { name: k.name, weight: k.weight ?? 1 }));
  const results: SearchResult<T>[] = [];
  items.forEach((item, refIndex) => {
    let top: SearchResult<T> | null = null;
    const consider = (text: unknown, key: string | undefined, weight: number) => {
      if (typeof text !== 'string') return;
      const m = bestFor(query, text, !!options.typo);
      if (!m) return;
      const score = m.score * weight;
      if (!top || score > top.score) top = { ...m, score, item, refIndex, key };
    };
    if (keys.length === 0) consider(item, undefined, 1);
    else for (const k of keys) consider((item as Record<string, unknown>)?.[k.name], k.name, k.weight);
    if (top) results.push(top);
  });
  results.sort((a, b) => b.score - a.score || a.refIndex - b.refIndex);
  return options.limit === undefined ? results : results.slice(0, options.limit);
}
