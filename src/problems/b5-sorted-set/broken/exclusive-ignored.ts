// Bug: treats (5 the same as 5.
export type Entry = { member: string; score: number };
export type Bound = number | string;

type Node<K> = { key: K; pri: number; size: number; left: Node<K> | null; right: Node<K> | null };

const sz = <K>(n: Node<K> | null) => (n ? n.size : 0);
function fix<K>(n: Node<K>) { n.size = 1 + sz(n.left) + sz(n.right); return n; }

/** Treap with subtree sizes. `isLeft(key)` must be true for a prefix of the order. */
class Treap<K> {
  root: Node<K> | null = null;
  constructor(private cmp: (a: K, b: K) => number) {}

  get size() { return sz(this.root); }

  private split(n: Node<K> | null, isLeft: (k: K) => boolean): [Node<K> | null, Node<K> | null] {
    if (!n) return [null, null];
    if (isLeft(n.key)) {
      const [a, b] = this.split(n.right, isLeft);
      n.right = a;
      return [fix(n), b];
    }
    const [a, b] = this.split(n.left, isLeft);
    n.left = b;
    return [a, fix(n)];
  }

  private merge(a: Node<K> | null, b: Node<K> | null): Node<K> | null {
    if (!a) return b;
    if (!b) return a;
    if (a.pri > b.pri) { a.right = this.merge(a.right, b); return fix(a); }
    b.left = this.merge(a, b.left);
    return fix(b);
  }

  insert(key: K) {
    const [l, r] = this.split(this.root, (k) => this.cmp(k, key) < 0);
    this.root = this.merge(this.merge(l, { key, pri: Math.random(), size: 1, left: null, right: null }), r);
  }

  delete(key: K): boolean {
    const [l, r] = this.split(this.root, (k) => this.cmp(k, key) < 0);
    const [m, rest] = this.split(r, (k) => this.cmp(k, key) <= 0);
    this.root = this.merge(l, rest);
    return m !== null;
  }

  /** Number of keys for which `pred` holds (pred must hold for a prefix). */
  count(pred: (k: K) => boolean): number {
    let n = this.root, c = 0;
    while (n) {
      if (pred(n.key)) { c += sz(n.left) + 1; n = n.right; } else n = n.left;
    }
    return c;
  }

  at(i: number): K {
    let n = this.root!;
    for (;;) {
      const l = sz(n.left);
      if (i < l) n = n.left!;
      else if (i === l) return n.key;
      else { i -= l + 1; n = n.right!; }
    }
  }
}

type Key = { member: string; score: number };
const byScoreThenMember = (a: Key, b: Key) =>
  a.score < b.score ? -1 : a.score > b.score ? 1 : a.member < b.member ? -1 : a.member > b.member ? 1 : 0;

function parseBound(b: Bound): { value: number; exclusive: boolean } {
  if (typeof b === 'number') {
    if (Number.isNaN(b)) throw new RangeError('NaN bound');
    return { value: b, exclusive: false };
  }
  let s = b.trim();
  const exclusive = false;
  if (s.startsWith('(')) s = s.slice(1);
  const value = s === '-inf' ? -Infinity : s === '+inf' || s === 'inf' ? Infinity : Number(s);
  if (s === '' || Number.isNaN(value)) throw new RangeError(`Bad bound ${b}`);
  return { value, exclusive };
}

export class SortedSet {
  private scores = new Map<string, number>();
  private order = new Treap<Key>(byScoreThenMember);
  private distinct = new Treap<number>((a, b) => a - b);
  private scoreCounts = new Map<number, number>();

  get size(): number { return this.scores.size; }

  add(member: string, score: number): boolean {
    if (typeof score !== 'number' || Number.isNaN(score)) throw new RangeError('score must be a number');
    const old = this.scores.get(member);
    if (old === score) return false;
    if (old !== undefined) this.detach(member, old);
    this.scores.set(member, score);
    this.order.insert({ member, score });
    const c = this.scoreCounts.get(score) ?? 0;
    if (c === 0) this.distinct.insert(score);
    this.scoreCounts.set(score, c + 1);
    return old === undefined;
  }

  private detach(member: string, score: number) {
    this.order.delete({ member, score });
    const c = this.scoreCounts.get(score)! - 1;
    if (c === 0) { this.scoreCounts.delete(score); this.distinct.delete(score); } else this.scoreCounts.set(score, c);
  }

  score(member: string): number | undefined { return this.scores.get(member); }

  remove(member: string): boolean {
    const s = this.scores.get(member);
    if (s === undefined) return false;
    this.detach(member, s);
    this.scores.delete(member);
    return true;
  }

  rank(member: string): number | undefined {
    const score = this.scores.get(member);
    if (score === undefined) return undefined;
    const key = { member, score };
    return this.order.count((k) => byScoreThenMember(k, key) < 0);
  }

  revRank(member: string): number | undefined {
    const r = this.rank(member);
    return r === undefined ? undefined : this.size - 1 - r;
  }

  private slice(from: number, to: number, rev: boolean): Entry[] {
    const out: Entry[] = [];
    for (let i = from; i <= to; i++) {
      const k = this.order.at(rev ? this.size - 1 - i : i);
      out.push({ member: k.member, score: k.score });
    }
    return out;
  }

  rangeByRank(start: number, stop: number, options: { rev?: boolean } = {}): Entry[] {
    const n = this.size;
    if (start < 0) start += n;
    if (stop < 0) stop += n;
    start = Math.max(0, start);
    stop = Math.min(n - 1, stop);
    if (start > stop) return [];
    return this.slice(start, stop, !!options.rev);
  }

  rangeByScore(min: Bound, max: Bound, options: { offset?: number; count?: number } = {}): Entry[] {
    const lo = parseBound(min), hi = parseBound(max);
    const from = this.order.count((k) => (lo.exclusive ? k.score <= lo.value : k.score < lo.value));
    const to = this.order.count((k) => (hi.exclusive ? k.score < hi.value : k.score <= hi.value)) - 1;
    const start = from + (options.offset ?? 0);
    const end = options.count === undefined || options.count < 0 ? to : Math.min(to, start + options.count - 1);
    return start > end ? [] : this.slice(start, end, false);
  }

  incrBy(member: string, delta: number): number {
    const next = (this.scores.get(member) ?? 0) + delta;
    this.add(member, next);
    return next;
  }

  denseRevRank(member: string): number | undefined {
    const s = this.scores.get(member);
    if (s === undefined) return undefined;
    return this.distinct.size - this.distinct.count((d) => d <= s);
  }

  around(member: string, k: number): Entry[] {
    const r = this.revRank(member);
    if (r === undefined) return [];
    return this.rangeByRank(Math.max(0, r - k), r + k, { rev: true });
  }
}
