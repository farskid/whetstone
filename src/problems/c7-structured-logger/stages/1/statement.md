Build a small pino: a logger that writes one JSON object per line. Start with levels, the line format, and writing to transports.

```ts
const log = createLogger({ level: 'info', transports: [{ write: (chunk) => process.stdout.write(chunk) }] });
log.info({ userId: 7 }, 'signed in');
// {"level":30,"time":1730000000000,"userId":7,"msg":"signed in"}
log.debug('hidden');
await log.flush();
```

```ts
type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };   // export this

interface Transport { write(chunk: string): void | Promise<void> }

function createLogger(opts: {
  level?: Level;                    // default 'info'
  transports: Transport[];
  base?: Record<string, unknown>;   // fields on every line
  now?: () => number;               // default Date.now
}): Logger;

interface Logger {
  level: Level;                     // get or set at runtime
  trace/debug/info/warn/error/fatal(objOrMsg?: object | Error | string, msg?: string): void;
  isLevelEnabled(level: Level): boolean;
  flush(): Promise<void>;
}
```

**Levels**
- A call below the logger's level does nothing. `isLevelEnabled(l)` is true when `l` is at or above the level.
- An unknown level throws, both in `createLogger` and when setting `log.level`.

**Arguments**
- `log.info('msg')` logs just a message.
- `log.info(obj, 'msg?')` merges `obj`'s own fields into the line.
- `log.error(err, 'msg?')` logs `{ err }`, and `msg` defaults to `err.message`.
- A top-level field whose value is an `Error` (including that `err`) is written as `{ type: constructor name, message, stack }`. Other values go through `JSON.stringify` as they are.

**Lines**
- Each line is `JSON.stringify(record) + '\n'`. Keys go in this order:
  1. `level` (the number) and `time` (from `now()`);
  2. `base` fields;
  3. the call's object fields;
  4. `msg`, only if there is one.
- If a key appears in both `base` and the object, the object wins. Keys named `level`, `time` or `msg` in `base` or objects are ignored.

**Transports**
- Every line goes to every transport's `write`, in the order logged.
- `write` may return a promise. `flush()` resolves once every line logged before the call has been written, meaning `write` has been called and any promise it returned has settled.
