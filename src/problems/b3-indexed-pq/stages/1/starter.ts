import type { Id, Entry } from './types';

export class IndexedPQ<V = undefined, P = number> {
  constructor(compare: (a: P, b: P) => number = (a: any, b: any) => a - b) {
    throw new Error('Not implemented');
  }
  get size(): number { throw new Error('Not implemented'); }
  push(id: Id, priority: P, value?: V): void { throw new Error('Not implemented'); }
  peek(): Entry<V, P> | undefined { throw new Error('Not implemented'); }
  pop(): Entry<V, P> | undefined { throw new Error('Not implemented'); }
}
