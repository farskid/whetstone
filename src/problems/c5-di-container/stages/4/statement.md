Add the safety checks, async factories and disposal.

```ts
const conn = await c.resolveAsync<Conn>('conn');   // awaits async factories anywhere in the graph
await c.dispose();                                 // calls [asyncDispose]() on what it created

interface Resolver { resolve<T>(token: Token<T>): T; resolveAsync<T>(token: Token<T>): Promise<T> }
// useFactory may now return T | Promise<T>

const asyncDispose: symbol; // Symbol.asyncDispose, or Symbol.for('Symbol.asyncDispose') where missing
// Container, plus:
resolveAsync<T>(token: Token<T>): Promise<T>;
dispose(): Promise<void>;
```

**Errors**
- When a missing token is a dependency, the message also names the chain, e.g. `No provider for Missing (App -> Service -> Missing)`. A missing top-level token is still just `No provider for X`.
- Resolving a token that is already being resolved higher up the chain throws `Circular dependency: A -> B -> A`.
- A scoped instance needed (directly, or through transients) while building a singleton throws an error containing `Captive dependency`. The singleton would otherwise keep one scope's instance forever.
- Names in messages are the class name, the string, or the symbol's description.

**Async**
- `resolve` throws if a factory it reaches returns a promise. The message mentions `resolveAsync`.
- `resolveAsync` awaits async factories anywhere in the graph, and rejects (never throws) on any error above. Concurrent `resolveAsync` calls for a singleton or scoped token share one creation. A failed creation isn't cached, so the next call tries again.

**Dispose**
- `dispose()` calls `[asyncDispose]()` (awaited, one at a time) on every singleton and scoped instance **this container created**, newest first. Dependencies are created before the things that use them, so dependents are disposed first. Instances without the method are skipped.
- Transient instances and `useValue` values are not disposed. A child's `dispose` doesn't touch its parent's instances.
- Calling `dispose` again does nothing. `resolve` after `dispose` throws.
