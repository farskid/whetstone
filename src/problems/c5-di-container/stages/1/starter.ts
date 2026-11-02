import type { Token, Provider } from './types';

export class Container {
  register<T>(token: Token<T>, provider: Provider<T>): this {
    throw new Error('Not implemented');
  }

  resolve<T>(token: Token<T>): T {
    throw new Error('Not implemented');
  }
}
