/** What you register and resolve by. */
export type Token<T = unknown> = string | symbol;

/** Handed to factories, for resolving their own dependencies. */
export interface Resolver {
  resolve<T>(token: Token<T>): T;
}

/** Exactly one of useValue or useFactory. */
export type Provider<T> =
  | { useValue: T }
  | { useFactory: (r: Resolver) => T };
