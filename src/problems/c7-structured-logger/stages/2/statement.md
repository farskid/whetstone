Add child loggers.

```ts
const reqLog = log.child({ reqId: 'a1' });
reqLog.info('start');   // {"level":30,"time":...,"reqId":"a1","msg":"start"}

interface Logger {
  // ...stage 1, plus:
  child(bindings: Record<string, unknown>): Logger;
}
```

- `child(bindings)` returns a logger that adds those bindings to every line and shares the parent's transports. Children can have children.
- Key order is now: `level`, `time`; `base`; bindings from the outermost to the innermost child; the call's object fields; `msg`. If a key appears in more than one place, the later one wins. `level`, `time` and `msg` in bindings are ignored.
- A child's level follows its parent live, so changing the parent's level changes the child's. Once the child's own `level` is set it stops following, and setting it never changes the parent.
- `flush()` on any logger in the family waits for every line logged by the whole family before the call.
