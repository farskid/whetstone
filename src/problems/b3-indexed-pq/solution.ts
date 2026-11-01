export type Id = string | number;
export interface Entry<V, P> { id: Id; priority: P; value: V }

interface Node<V, P> extends Entry<V, P> { seq: number }

export class IndexedPQ<V = undefined, P = number> {
  private heap: Node<V, P>[] = [];
  private index = new Map<Id, number>();
  private seq = 0;

  constructor(private compare: (a: P, b: P) => number = (a: any, b: any) => a - b) {}

  get size(): number { return this.heap.length; }

  private less(i: number, j: number): boolean {
    const a = this.heap[i], b = this.heap[j];
    const c = this.compare(a.priority, b.priority);
    return c < 0 || (c === 0 && a.seq < b.seq);
  }

  private swap(i: number, j: number) {
    const h = this.heap;
    [h[i], h[j]] = [h[j], h[i]];
    this.index.set(h[i].id, i);
    this.index.set(h[j].id, j);
  }

  private up(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }

  private down(i: number) {
    const n = this.heap.length;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < n && this.less(l, m)) m = l;
      if (r < n && this.less(r, m)) m = r;
      if (m === i) break;
      this.swap(i, m);
      i = m;
    }
  }

  private fix(i: number) {
    this.up(i);
    this.down(i);
  }

  push(id: Id, priority: P, value?: V): void {
    if (this.index.has(id)) throw new Error(`Duplicate id: ${String(id)}`);
    this.heap.push({ id, priority, value: value as V, seq: this.seq++ });
    this.index.set(id, this.heap.length - 1);
    this.up(this.heap.length - 1);
  }

  peek(): Entry<V, P> | undefined {
    const top = this.heap[0];
    return top && { id: top.id, priority: top.priority, value: top.value };
  }

  pop(): Entry<V, P> | undefined {
    const top = this.peek();
    if (top) this.remove(top.id);
    return top;
  }

  has(id: Id): boolean { return this.index.has(id); }

  update(id: Id, priority: P): boolean {
    const i = this.index.get(id);
    if (i === undefined) return false;
    this.heap[i].priority = priority;
    this.heap[i].seq = this.seq++;
    this.fix(i);
    return true;
  }

  remove(id: Id): boolean {
    const i = this.index.get(id);
    if (i === undefined) return false;
    const last = this.heap.length - 1;
    if (i !== last) this.swap(i, last);
    this.heap.pop();
    this.index.delete(id);
    if (i < this.heap.length) this.fix(i);
    return true;
  }
}

export class VirtualTimers {
  private time = 0;
  private nextId = 1;
  private queue = new IndexedPQ<() => void>();

  now(): number { return this.time; }

  setTimeout(callback: () => void, ms: number): number {
    const id = this.nextId++;
    this.queue.push(id, this.time + Math.max(0, ms || 0), callback);
    return id;
  }

  clearTimeout(id: number): void {
    this.queue.remove(id);
  }

  advance(ms: number): void {
    const target = this.time + ms;
    for (let next = this.queue.peek(); next && next.priority <= target; next = this.queue.peek()) {
      this.queue.pop();
      this.time = next.priority;
      next.value();
    }
    this.time = target;
  }
}
