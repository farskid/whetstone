import type { Token, Resolver, Provider } from './types';

const nameOf = (t: Token) => (typeof t === 'symbol' ? t.description ?? 'symbol' : t);

export class Container {
  private providers = new Map<Token, Provider<unknown>>();

  register<T>(token: Token<T>, provider: Provider<T>): this {
    const kinds = ['useValue', 'useFactory'].filter((k) => k in provider);
    if (kinds.length !== 1) throw new Error(`Provider for ${nameOf(token)} needs exactly one of useValue, useFactory`);
    this.providers.set(token, provider as Provider<unknown>);
    return this;
  }

  resolve<T>(token: Token<T>): T {
    const provider = this.providers.get(token);
    if (!provider) throw new Error(`No provider for ${nameOf(token)}`);
    if ('useValue' in provider) return provider.useValue as T;
    const resolver: Resolver = { resolve: (t) => this.resolve(t) };
    return provider.useFactory(resolver) as T;
  }
}
