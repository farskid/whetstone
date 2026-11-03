import type { EventMap, Listener, Wildcard } from './types';

type AnyMap = Record<string, any[]>;
interface Entry { fn: (...args: any[]) => void; once: boolean }

export class Emitter<E extends EventMap = AnyMap> {
  private events = new Map<string, Entry[]>();

  on<K extends keyof E & string>(name: K, fn: Listener<E[K]>): this;
  on(name: '*', fn: Wildcard<E>): this;
  on(name: string, fn: (...args: any[]) => void): this {
    return this.add(name, fn, false, false);
  }

  once<K extends keyof E & string>(name: K, fn: Listener<E[K]>): this {
    return this.add(name, fn, true, false);
  }

  prependListener<K extends keyof E & string>(name: K, fn: Listener<E[K]>): this {
    return this.add(name, fn, false, true);
  }

  off<K extends keyof E & string>(name: K | '*', fn: (...args: any[]) => void): this {
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
    const wild = name === '*' ? undefined : this.events.get('*');
    if (!list?.length && !wild?.length) return false;
    if (list) for (const e of list) {
      if (e.once) this.removeEntry(name, e);
      e.fn(...args);
    }
    if (wild) for (const e of wild) {
      if (e.once) this.removeEntry('*', e);
      e.fn(name, ...args);
    }
    return true;
  }

  listenerCount(name: (keyof E & string) | '*'): number {
    return this.events.get(name)?.length ?? 0;
  }

  private removeEntry(name: string, entry: Entry) {
    const list = this.events.get(name);
    if (!list || !list.includes(entry)) return;
    const next = list.filter((e) => e !== entry);
    if (next.length) this.events.set(name, next); else this.events.delete(name);
  }

  private add(name: string, fn: (...args: any[]) => void, once: boolean, prepend: boolean): this {
    const list = (this.events.get(name) ?? []).slice();
    const entry = { fn, once };
    if (prepend) list.unshift(entry); else list.push(entry);
    this.events.set(name, list);
    return this;
  }
}
