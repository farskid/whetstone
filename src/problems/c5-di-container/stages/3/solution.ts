import type { Ctor, Token, Resolver, Provider } from './types';

const nameOf = (t: Token) => (typeof t === 'function' ? t.name : typeof t === 'symbol' ? t.description ?? 'symbol' : t);

export class Container {
  private providers = new Map<Token, Provider<unknown>>();
  private cache = new Map<Token, unknown>();

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
    let owner: Container | undefined = this;
    while (owner && !owner.providers.has(token)) owner = owner.parent;
    if (!owner) throw new Error(`No provider for ${nameOf(token)}`);
    const provider = owner.providers.get(token)!;
    if ('useValue' in provider) return provider.useValue as T;
    const lifetime = provider.lifetime ?? 'transient';
    // Singletons are built and cached where they were registered; scoped ones where they are resolved.
    const home = lifetime === 'singleton' ? owner : this;
    if (lifetime !== 'transient' && home.cache.has(token)) return home.cache.get(token) as T;
    let value: unknown;
    if ('useFactory' in provider) {
      const resolver: Resolver = { resolve: (t) => home.resolve(t) };
      value = provider.useFactory(resolver);
    } else {
      const cls: Ctor<unknown> = provider.useClass;
      const deps: Token[] = (cls as any).inject ?? [];
      value = new cls(...deps.map((d) => home.resolve(d)));
    }
    if (lifetime !== 'transient') home.cache.set(token, value);
    return value as T;
  }
}
