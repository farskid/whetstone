Add error handling.

```ts
app.use((err, req, res, next) => { res.statusCode = 400; res.end('bad: ' + err.message); });

type Next = (err?: unknown) => void;
type ErrorHandler = (err: unknown, req: Request, res: Response, next: Next) => unknown;
// use/get/post/... now accept Handler | ErrorHandler
```

- A handler with exactly 4 parameters (`fn.length === 4`) is an error handler. This works in `use` and in routes.
- `next(err)` with any value other than `undefined`, `null` or `'route'` is an error. A synchronous throw counts as `next(thrown)`, including a throw inside an error handler.
- While there is an error, normal handlers (and routes' normal handlers) are skipped and the next matching error handler runs. While there is no error, error handlers are skipped.
- An error handler that calls `next()` recovers: normal handlers after it run again. Calling `next(err)` passes the error on.
- An error nobody handles makes `handle` set `statusCode` to `err.status` if it's a number (otherwise 500) and end with `err.message`, or `String(err)` if it isn't an `Error`.
