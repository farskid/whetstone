// Bug: missing-token errors do not name the chain
export type Ctor<T> = new (...args: any[]) => T;
export type Token<T = unknown> = string | symbol | Ctor<T>;
export type Lifetime = 'singleton' | 'transient' | 'scoped';
export interface Resolver {
  resolve<T>(token: Token<T>): T;
  resolveAsync<T>(token: Token<T>): Promise<T>;
}
export type Provider<T> =
  | { useValue: T }
  | { useFactory: (r: Resolver) => T | Promise<T>; lifetime?: Lifetime }
  | { useClass: Ctor<T>; lifetime?: Lifetime };

export const asyncDispose: symbol = (Symbol as any).asyncDispose ?? Symbol.for('Symbol.asyncDispose');

interface Entry { done: boolean; value?: unknown; promise?: Promise<unknown> }
type Path = readonly Token[];

const nameOf = (t: Token) => (typeof t === 'function' ? t.name : typeof t === 'symbol' ? t.description ?? 'symbol' : t);
const chain = (path: Path) => path.map(nameOf).join(' -> ');
const isThenable = (v: unknown): v is Promise<unknown> => !!v && typeof (v as any).then === 'function';

export class Container {
  private providers = new Map<Token, Provider<unknown>>();
  private cache = new Map<Token, Entry>();
  private created: unknown[] = [];
  private disposed = false;

  constructor(private readonly parent?: Container) {}

  register<T>(token: Token<T>, provider: Provider<T>): this {
    const kinds = ['useValue', 'useFactory', 'useClass'].filter((k) => k in provider);
    if (kinds.length !== 1) throw new Error(`Provider for ${nameOf(token)} needs exactly one of useValue, useFactory, useClass`);
    this.providers.set(token, provider as Provider<unknown>);
    this.cache.delete(token);
    return this;
  }

  createChild(): Container {
    return new Container(this);
  }

  resolve<T>(token: Token<T>): T {
    return this.resolveSync(token, [], false) as T;
  }

  resolveAsync<T>(token: Token<T>): Promise<T> {
    try {
      return this.resolveAsyncAt(token, [], false) as Promise<T>;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    const items = this.created.splice(0).reverse();
    this.cache.clear();
    for (const item of items) {
      const fn = (item as any)?.[asyncDispose];
      if (typeof fn === 'function') await fn.call(item);
    }
  }

  // ---- internals ----

  private lookup(token: Token): { owner: Container; provider: Provider<unknown> } | undefined {
    for (let c: Container | undefined = this; c; c = c.parent) {
      const provider = c.providers.get(token);
      if (provider) return { owner: c, provider };
    }
    return undefined;
  }

  private plan(token: Token, path: Path, captive: boolean) {
    if (this.disposed) throw new Error('Container is disposed');
    const next = [...path, token];
    if (path.includes(token)) throw new Error(`Circular dependency: ${chain(next)}`);
    const found = this.lookup(token);
    if (!found) throw new Error(`No provider for ${nameOf(token)}`);
    const { owner, provider } = found;
    if ('useValue' in provider) return { kind: 'value' as const, value: provider.useValue };
    const lifetime = provider.lifetime ?? 'transient';
    if (lifetime === 'scoped' && captive) throw new Error(`Captive dependency: scoped ${nameOf(token)} inside a singleton (${chain(next)})`);
    const home = lifetime === 'singleton' ? owner : this;
    return {
      kind: 'build' as const,
      provider,
      next,
      lifetime,
      home,
      captive: captive || lifetime === 'singleton',
    };
  }

  private resolver(at: Container, path: Path, captive: boolean): Resolver {
    return {
      resolve: <T>(t: Token<T>) => at.resolveSync(t, path, captive) as T,
      resolveAsync: <T>(t: Token<T>) => at.resolveAsyncAt(t, path, captive) as Promise<T>,
    };
  }

  private resolveSync(token: Token, path: Path, captive: boolean): unknown {
    const p = this.plan(token, path, captive);
    if (p.kind === 'value') return p.value;
    const cached = p.lifetime !== 'transient' ? p.home.cache.get(token) : undefined;
    if (cached) {
      if (!cached.done) throw new Error(`${nameOf(token)} is still being created asynchronously; use resolveAsync`);
      return cached.value;
    }
    let value: unknown;
    if ('useFactory' in p.provider) {
      value = p.provider.useFactory(p.home.resolver(p.home, p.next, p.captive));
      if (isThenable(value)) {
        value.catch(() => {});
        throw new Error(`${nameOf(token)} has an async factory; use resolveAsync (${chain(p.next)})`);
      }
    } else if ('useClass' in p.provider) {
      const cls = p.provider.useClass;
      const deps: Token[] = (cls as any).inject ?? [];
      value = new cls(...deps.map((d) => p.home.resolveSync(d, p.next, p.captive)));
    }
    if (p.lifetime !== 'transient') {
      p.home.cache.set(token, { done: true, value });
      p.home.created.push(value);
    }
    return value;
  }

  private resolveAsyncAt(token: Token, path: Path, captive: boolean): Promise<unknown> {
    const p = this.plan(token, path, captive);
    if (p.kind === 'value') return Promise.resolve(p.value);
    if (p.lifetime !== 'transient') {
      const cached = p.home.cache.get(token);
      if (cached) return cached.done ? Promise.resolve(cached.value) : cached.promise!;
    }
    const build = async () => {
      if ('useFactory' in p.provider) return p.provider.useFactory(p.home.resolver(p.home, p.next, p.captive));
      const cls = (p.provider as { useClass: Ctor<unknown> }).useClass;
      const deps: Token[] = (cls as any).inject ?? [];
      const args = [];
      for (const d of deps) args.push(await p.home.resolveAsyncAt(d, p.next, p.captive));
      return new cls(...args);
    };
    const promise = build();
    if (p.lifetime === 'transient') return promise;
    const entry: Entry = { done: false, promise };
    p.home.cache.set(token, entry);
    return promise.then(
      (value) => {
        if (p.home.cache.get(token) === entry) {
          entry.done = true;
          entry.value = value;
          p.home.created.push(value);
        }
        return value;
      },
      (err) => {
        if (p.home.cache.get(token) === entry) p.home.cache.delete(token);
        throw err;
      },
    );
  }
}
