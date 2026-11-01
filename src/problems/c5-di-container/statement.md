# DI container

Build a small dependency injection container, like tsyringe or InversifyJS without decorators.

```ts
class Db { static inject = [CONFIG]; constructor(public cfg: Config) {} }
class UserRepo { static inject = [Db]; constructor(public db: Db) {} }

const root = new Container()
  .register(CONFIG, { useValue: { url: 'pg://' } })
  .register(Db, { useClass: Db, lifetime: 'singleton' })
  .register(UserRepo, { useClass: UserRepo, lifetime: 'scoped' });

const request = root.createChild();
request.resolve(UserRepo).db === root.resolve(Db); // true
```

## API

```ts
type Token<T> = string | symbol | (new (...args: any[]) => T);
type Lifetime = 'singleton' | 'transient' | 'scoped';
interface Resolver { resolve<T>(token: Token<T>): T; resolveAsync<T>(token: Token<T>): Promise<T> }
type Provider<T> =
  | { useValue: T }
  | { useFactory: (r: Resolver) => T | Promise<T>; lifetime?: Lifetime }
  | { useClass: new (...args: any[]) => T; lifetime?: Lifetime };   // deps from static inject = [tokens]

const asyncDispose: symbol; // Symbol.asyncDispose, or Symbol.for('Symbol.asyncDispose') where missing

class Container {
  register<T>(token: Token<T>, provider: Provider<T>): this;
  resolve<T>(token: Token<T>): T;
  resolveAsync<T>(token: Token<T>): Promise<T>;
  createChild(): Container;
  dispose(): Promise<void>;
}
```

## Rules

**Providers**
- A provider has exactly one of `useValue`, `useFactory` or `useClass`. Otherwise `register` throws. Registering a token again replaces it.
- `useValue` always returns that value.
- `useFactory` gets a `Resolver` for its own dependencies. `useClass` resolves each token in the class's `static inject` array (none if missing) and calls `new Class(...deps)`.
- The default lifetime is `transient`: a new instance on every resolve.
- `singleton`: one instance per container that **registered** the token. It is created in that container, so its dependencies come from there too, even when a child resolves it.
- `scoped`: one instance per container that **resolves** it. The root is its own scope.

**Children**
- `createChild()` returns a container that looks up tokens in itself first, then its parent, then the parent's parent, and so on.

**Errors**
- An unregistered token throws `No provider for X`. When it is a dependency, the message also names the chain, e.g. `No provider for Missing (App -> Service -> Missing)`.
- Resolving a token that is already being resolved higher up the chain throws `Circular dependency: A -> B -> A`.
- A scoped instance needed (directly, or through transients) while building a singleton throws an error containing `Captive dependency`. The singleton would otherwise keep one scope's instance forever.
- Names in messages are the class name, the string, or the symbol's description.

**Async**
- `resolve` throws if a factory it reaches returns a promise. The message mentions `resolveAsync`.
- `resolveAsync` awaits async factories anywhere in the graph. Concurrent `resolveAsync` calls for a singleton or scoped token share one creation. A failed creation isn't cached.

**Dispose**
- `dispose()` calls `[asyncDispose]()` (awaited, one at a time) on every singleton and scoped instance **this container created**, newest first. Dependencies are created before the things that use them, so dependents are disposed first.
- Transient instances and `useValue` values are not disposed. A child's `dispose` doesn't touch its parent's instances.
- Calling `dispose` again does nothing. `resolve` after `dispose` throws.
