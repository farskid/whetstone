import type { Ctor, Token, Resolver, Provider } from './types';

const nameOf = (t: Token) => (typeof t === 'function' ? t.name : typeof t === 'symbol' ? t.description ?? 'symbol' : t);

export class Container {
  private providers = new Map<Token, Provider<unknown>>();
  private cache = new Map<Token, unknown>();

  register<T>(token: Token<T>, provider: Provider<T>): this {
    const kinds = ['useValue', 'useFactory', 'useClass'].filter((k) => k in provider);
    if (kinds.length !== 1) throw new Error(`Provider for ${nameOf(token)} needs exactly one of useValue, useFactory, useClass`);
    this.providers.set(token, provider as Provider<unknown>);
    this.cache.delete(token);
    return this;
  }

  resolve<T>(token: Token<T>): T {
    const provider = this.providers.get(token);
    if (!provider) throw new Error(`No provider for ${nameOf(token)}`);
    if ('useValue' in provider) return provider.useValue as T;
    const singleton = provider.lifetime === 'singleton';
    if (singleton && this.cache.has(token)) return this.cache.get(token) as T;
    let value: unknown;
    if ('useFactory' in provider) {
      const resolver: Resolver = { resolve: (t) => this.resolve(t) };
      value = provider.useFactory(resolver);
    } else {
      const cls: Ctor<unknown> = provider.useClass;
      const deps: Token[] = (cls as any).inject ?? [];
      value = new cls(...deps.map((d) => this.resolve(d)));
    }
    if (singleton) this.cache.set(token, value);
    return value as T;
  }
}
