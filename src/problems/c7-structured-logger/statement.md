# Structured logger

Build a small pino: a logger that writes one JSON object per line and sends it to one or more transports.

```ts
const log = createLogger({ level: 'info', transports: [{ write: (chunk) => process.stdout.write(chunk) }] });
log.info({ userId: 7 }, 'signed in');
// {"level":30,"time":1730000000000,"userId":7,"msg":"signed in"}
const reqLog = log.child({ reqId: 'a1' });
reqLog.error(new Error('db down'));
await log.flush();
```

## API

```ts
type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

interface Transport { level?: Level; write(chunk: string): void | Promise<void> }

function createLogger(opts: {
  level?: Level;                                   // default 'info'
  transports: Transport[];
  base?: Record<string, unknown>;                  // fields on every line
  redact?: string[];                               // e.g. 'req.headers.authorization', '*.password'
  serializers?: Record<string, (value: any) => unknown>;
  sample?: Partial<Record<Level, number>>;         // keep probability per level, 0..1
  random?: () => number;                           // default Math.random
  now?: () => number;                              // default Date.now
  onError?: (err: unknown, chunk: string) => void; // a transport write failed
}): Logger;

interface Logger {
  level: Level;                                    // get or set at runtime
  trace/debug/info/warn/error/fatal(objOrMsg?: object | Error | string, msg?: string): void;
  isLevelEnabled(level: Level): boolean;
  child(bindings: Record<string, unknown>): Logger;
  flush(): Promise<void>;
}
function serializeError(err: Error): Record<string, unknown>;
```

## Rules

**Lines**
- A call below the logger's level does nothing.
- Arguments:
  - `log.info('msg')` logs just a message.
  - `log.info(obj, 'msg?')` merges `obj`'s fields into the line.
  - `log.error(err, 'msg?')` logs `{ err }`, and `msg` defaults to `err.message`.
- Each line is `JSON.stringify(record) + '\n'`. Keys go in this order:
  1. `level` (the number) and `time`;
  2. `base` fields;
  3. bindings from the outermost to the innermost child;
  4. the call's object fields;
  5. `msg`, only if there is one.
- If the same key appears in more than one place, the later one wins. Keys named `level`, `time` or `msg` in bindings or objects are ignored.

**Children**
- `child(bindings)` returns a logger that adds those bindings and shares the transports.
- A child's level follows its parent live, until the child's own `level` is set.

**Safe serialization**
- Circular references become `"[Circular]"`. Only true cycles count: the same object appearing twice side by side is fine.
- `bigint` values become strings. Functions and `undefined` are dropped.
- Objects with `toJSON` use it.
- Any `Error` becomes `serializeError(err)`: `{ type: constructor name, message, stack, ...own enumerable props, cause? }`. The cause is serialized the same way.
- `serializers[key]` (if given) transforms that top-level field before the above. The default `err` serializer is `serializeError`.
- **Redaction** runs on the final record. Each path is dotted; `*` matches any key at that depth. Existing values at a matching path become `"[Redacted]"`, and missing paths are left alone.
- The caller's objects are never mutated.

**Transports**
- A line goes to every transport whose `level` (default `trace`) it meets.
- Writes are buffered and asynchronous. Nothing is written during the log call. Lines logged in the same tick reach a transport as one `write` call of the concatenated lines.
- A transport never has two writes in flight. Lines logged while a write is pending go in the next write, in order.
- A failed write (throw or rejection) calls `onError(err, chunk)` and the queue keeps going.
- `flush()` on any logger in the family resolves once every line logged before the call has been written.
- **Sampling:** for a level listed in `sample`, a line is kept only if `random() < rate`. Dropped lines are not serialized at all.
