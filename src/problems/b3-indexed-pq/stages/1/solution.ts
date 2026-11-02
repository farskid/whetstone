import type { Id, Entry } from './types';

export class IndexedPQ<V = undefined, P = number> {
  private heap: Entry<V, P>[] = [];

  constructor(private compare: (a: P, b: P) => number = (a: any, b: any) => a - b) {}

  get size(): number { return this.heap.length; }

  private less(i: number, j: number): boolean {
    return this.compare(this.heap[i].priority, this.heap[j].priority) < 0;
  }

  private swap(i: number, j: number) {
    const h = this.heap;
    [h[i], h[j]] = [h[j], h[i]];
  }

  push(id: Id, priority: P, value?: V): void {
    this.heap.push({ id, priority, value: value as V });
    let i = this.heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }

  peek(): Entry<V, P> | undefined {
    const top = this.heap[0];
    return top && { ...top };
  }

  pop(): Entry<V, P> | undefined {
    const top = this.peek();
    if (!top) return undefined;
    const last = this.heap.pop()!;
    if (this.heap.length) {
      this.heap[0] = last;
      const n = this.heap.length;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < n && this.less(l, m)) m = l;
        if (r < n && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
}
