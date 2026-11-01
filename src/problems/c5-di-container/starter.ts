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

export class Container {
  constructor(private readonly parent?: Container) {}

  register<T>(token: Token<T>, provider: Provider<T>): this {
    throw new Error('Not implemented');
  }

  createChild(): Container {
    throw new Error('Not implemented');
  }

  resolve<T>(token: Token<T>): T {
    throw new Error('Not implemented');
  }

  resolveAsync<T>(token: Token<T>): Promise<T> {
    throw new Error('Not implemented');
  }

  async dispose(): Promise<void> {
    throw new Error('Not implemented');
  }
}
