import type { Release } from './types';

export class Mutex {
  get locked(): boolean { throw new Error('Not implemented'); }
  acquire(): Promise<Release> { throw new Error('Not implemented'); }
  runExclusive<T>(fn: () => T | Promise<T>): Promise<T> { throw new Error('Not implemented'); }
}
