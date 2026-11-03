Add child containers and a per-container lifetime.

```ts
const root = new Container().register(Db, { useClass: Db, lifetime: 'singleton' })
  .register(UserRepo, { useClass: UserRepo, lifetime: 'scoped' });
const request = root.createChild();
request.resolve(UserRepo).db === root.resolve(Db);   // true

type Lifetime = 'singleton' | 'transient' | 'scoped';
// Container, plus:
createChild(): Container;
```

- `createChild()` returns a container that looks up tokens in itself first, then its parent, then the parent's parent, and so on. Registering in a child never changes the parent. <!-- tests: a child overrides or falls back to its parent -->
- `'singleton'`: one instance per container that **registered** the token. It is created and cached in that container, so its dependencies are resolved from there too, even when a child resolves it. <!-- tests: a singleton resolved from a child lives in, and is wired from, the registering container -->
- `'scoped'`: one instance per container that **resolves** it. The root is its own scope, and each child has its own. <!-- tests: scoped instances are one per resolving container -->
- `'transient'` instances are built in the resolving container, so their dependencies are looked up from there.
