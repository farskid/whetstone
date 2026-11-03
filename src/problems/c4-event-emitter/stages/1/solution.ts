import type { EventMap, Listener } from './types';

type AnyMap = Record<string, any[]>;
interface Entry { fn: (...args: any[]) => void }

export class Emitter<E extends EventMap = AnyMap> {
  private events = new Map<string, Entry[]>();

  on<K extends keyof E & string>(name: K, fn: Listener<E[K]>): this {
    const list = (this.events.get(name) ?? []).slice();
    list.push({ fn });
    this.events.set(name, list);
    return this;
  }

  off<K extends keyof E & string>(name: K, fn: (...args: any[]) => void): this {
    const list = this.events.get(name);
    if (!list) return this;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].fn === fn) {
        const next = list.slice();
        next.splice(i, 1);
        if (next.length) this.events.set(name, next); else this.events.delete(name);
        break;
      }
    }
    return this;
  }

  emit<K extends keyof E & string>(name: K, ...args: E[K]): boolean {
    const list = this.events.get(name);
    if (!list?.length) return false;
    for (const e of list) e.fn(...args);
    return true;
  }

  listenerCount(name: keyof E & string): number {
    return this.events.get(name)?.length ?? 0;
  }
}
