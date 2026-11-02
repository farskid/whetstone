Add classes as providers, and singletons.

```ts
class Db { static inject = [CONFIG, 'pool']; constructor(public cfg: Config, public pool: number) {} }
c.register(Db, { useClass: Db, lifetime: 'singleton' });
c.resolve(Db) === c.resolve(Db);   // true

type Token<T> = string | symbol | (new (...args: any[]) => T);
type Lifetime = 'singleton' | 'transient';
type Provider<T> =
  | { useValue: T }
  | { useFactory: (r: Resolver) => T; lifetime?: Lifetime }
  | { useClass: new (...args: any[]) => T; lifetime?: Lifetime };
```

- A provider has exactly one of `useValue`, `useFactory` or `useClass`. Otherwise `register` throws.
- `useClass` resolves each token in the class's `static inject` array, in order (none if it's missing), and calls `new Class(...deps)`. Dependencies are resolved recursively.
- A class can be a token too. In messages its name is the class name.
- `lifetime` defaults to `'transient'`: a new instance on every resolve.
- `'singleton'`: the first resolve creates the instance, and every later resolve returns it. This works for factories and classes. Registering the token again forgets the old instance.
