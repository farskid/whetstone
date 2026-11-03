Add error handling.

```ts
app.use((err, req, res, next) => { res.statusCode = 400; res.end('bad: ' + err.message); });

type Next = (err?: unknown) => void;
type ErrorHandler = (err: unknown, req: Request, res: Response, next: Next) => unknown;
// use/get/post/... now accept Handler | ErrorHandler
```

- A handler with exactly 4 parameters (`fn.length === 4`) is an error handler. This works in `use` and in routes. <!-- tests: next(err) skips normal handlers to the next 4-arity handler; normal handlers ignore it -->
- `next(err)` with any value other than `undefined`, `null` or `'route'` is an error. A synchronous throw counts as `next(thrown)`, including a throw inside an error handler. <!-- tests: next(err) skips normal handlers to the next 4-arity handler; normal handlers ignore it | an error handler can recover with next(); a throw inside one is the new error -->
- While there is an error, normal handlers (and routes' normal handlers) are skipped and the next matching error handler runs. While there is no error, error handlers are skipped. <!-- tests: next(err) skips normal handlers to the next 4-arity handler; normal handlers ignore it -->
- An error handler that calls `next()` recovers: normal handlers after it run again. Calling `next(err)` passes the error on. <!-- tests: an error handler can recover with next(); a throw inside one is the new error -->
- An error nobody handles makes `handle` set `statusCode` to `err.status` if it's a number (otherwise 500) and end with `err.message`, or `String(err)` if it isn't an `Error`. <!-- tests: unhandled errors: err.status or 500, body is the message -->
