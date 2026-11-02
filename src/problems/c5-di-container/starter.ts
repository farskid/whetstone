import type { Token, Provider } from './types';

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
