/** A class constructor. */
export type Ctor<T> = new (...args: any[]) => T;

/** What you register and resolve by: a string, a symbol, or a class. */
export type Token<T = unknown> = string | symbol | Ctor<T>;

/** Default 'transient'. */
export type Lifetime = 'singleton' | 'transient' | 'scoped';

/** Handed to factories, for resolving their own dependencies. */
export interface Resolver {
  resolve<T>(token: Token<T>): T;
}

/** Exactly one of useValue, useFactory or useClass. useClass deps come from `static inject = [tokens]`. */
export type Provider<T> =
  | { useValue: T }
  | { useFactory: (r: Resolver) => T; lifetime?: Lifetime }
  | { useClass: Ctor<T>; lifetime?: Lifetime };
