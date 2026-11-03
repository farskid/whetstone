Build a small dependency injection container, like tsyringe or InversifyJS without decorators. Start with values and factories.

```ts
const URL = Symbol('url');
const c = new Container()
  .register(URL, { useValue: 'pg://db' })
  .register('client', { useFactory: (r) => connect(r.resolve<string>(URL)) });

c.resolve('client');   // a new client, built with 'pg://db'
```

```ts
type Token<T> = string | symbol;
interface Resolver { resolve<T>(token: Token<T>): T }
type Provider<T> = { useValue: T } | { useFactory: (r: Resolver) => T };

class Container {
  register<T>(token: Token<T>, provider: Provider<T>): this;   // returns the container, for chaining
  resolve<T>(token: Token<T>): T;
}
```

- A provider has exactly one of `useValue` or `useFactory`. Otherwise `register` throws. Registering a token again replaces it. <!-- tests: a provider needs exactly one kind; missing tokens throw; re-register replaces -->
- `useValue` always returns that value, even `undefined`. <!-- tests: useValue and useFactory; factories are transient by default and get a resolver -->
- `useFactory` is called on **every** resolve, with a `Resolver` it can use for its own dependencies. <!-- tests: useValue and useFactory; factories are transient by default and get a resolver -->
- Resolving an unregistered token throws an error whose message starts `No provider for X`, where `X` is the string or the symbol's description. <!-- tests: a provider needs exactly one kind; missing tokens throw; re-register replaces -->
