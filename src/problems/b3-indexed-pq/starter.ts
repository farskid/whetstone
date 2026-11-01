export type Id = string | number;
export interface Entry<V, P> { id: Id; priority: P; value: V }

export class IndexedPQ<V = undefined, P = number> {
  constructor(compare: (a: P, b: P) => number = (a: any, b: any) => a - b) {
    throw new Error('Not implemented');
  }
  get size(): number { throw new Error('Not implemented'); }
  push(id: Id, priority: P, value?: V): void { throw new Error('Not implemented'); }
  peek(): Entry<V, P> | undefined { throw new Error('Not implemented'); }
  pop(): Entry<V, P> | undefined { throw new Error('Not implemented'); }
  has(id: Id): boolean { throw new Error('Not implemented'); }
  update(id: Id, priority: P): boolean { throw new Error('Not implemented'); }
  remove(id: Id): boolean { throw new Error('Not implemented'); }
}

export class VirtualTimers {
  now(): number { throw new Error('Not implemented'); }
  setTimeout(callback: () => void, ms: number): number { throw new Error('Not implemented'); }
  clearTimeout(id: number): void { throw new Error('Not implemented'); }
  advance(ms: number): void { throw new Error('Not implemented'); }
}
