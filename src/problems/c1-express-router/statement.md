# Express router with error middleware

Rebuild the request pipeline at the heart of Express: middleware that calls `next()`, routes with `:params`, error handlers, async handlers and mountable sub-routers. There is no HTTP server. Requests and responses are plain objects.

```ts
const app = createRouter();
const api = createRouter();

app.use(logger);
api.get('/users/:id', loadUser, (req, res) => res.end(req.user));
app.use('/api', api);
app.use((err, req, res, next) => { res.statusCode = 400; res.end('bad: ' + err.message); });

await app.handle({ method: 'GET', url: '/api/users/7?full=1' }, res);
```

## API

```ts
interface Request { method: string; url: string; originalUrl?: string; baseUrl?: string; params?: Record<string, string>; [k: string]: unknown }
interface Response { statusCode: number; end(body?: unknown): void; [k: string]: unknown }
type Next = (err?: unknown) => void;
type Handler = (req, res, next: Next) => unknown;
type ErrorHandler = (err, req, res, next: Next) => unknown;

function createRouter(): Router;

interface Router {
  (req, res, next): void;                          // a router is itself middleware
  use(path?: string, ...fns: (Handler | ErrorHandler | Router)[]): Router;
  get / post / put / delete / all(path: string, ...fns: (Handler | ErrorHandler)[]): Router;
  handle(req, res): Promise<void>;                 // resolves when res.end is first called
}
```

## Rules

**Chain**
- Layers run in the order they were added. A layer runs only if its path (and method, for routes) matches. Calling `next()` moves on to the next matching layer.
- Paths are matched against `req.url` without the query string. Matching is case-sensitive.
- Calling `next` a second time from the same handler does nothing.
- If the chain runs out with no error, `handle` sets `statusCode = 404` and ends with ``Cannot ${METHOD} ${path}``, using the original path without the query.

**Paths and routes**
- `use(path, ...fns)` takes a literal path (no `:params`) and matches whole segments: `/api` matches `/api`, `/api/` and `/api/x`, but not `/apix`. With no path it matches everything.
- Inside a `use` layer with a path, `req.baseUrl` gains the prefix and `req.url` loses it (`/api/users?x=1` becomes `/users?x=1`). Both are restored when the layer calls `next`. `req.originalUrl` never changes.
- `get/post/put/delete(path, ...fns)` match the whole path for that method. `all` matches any method. A trailing slash is allowed (`/users/` matches `/users`).
- `:name` segments match one non-empty segment. `req.params` is set to that route's params, URL-decoded, when the route runs. A sub-router's routes see only their own params.
- In a route with several handlers, `next('route')` skips the rest of that route's handlers and moves on to the next layer.
- `next('router')` leaves the current router and continues in its parent.

**Errors**
- A handler with exactly 4 parameters (`fn.length === 4`) is an error handler. Error handlers are skipped while there is no error. Normal handlers are skipped while there is one.
- `next(err)` with any value other than `undefined`, `null`, `'route'` or `'router'` is an error. A synchronous throw counts as `next(thrown)`, including a throw inside an error handler.
- An error handler that calls `next()` recovers: normal handlers after it run again.
- An error nobody handles makes `handle` set `statusCode` to `err.status` if it's a number (otherwise 500) and end with `err.message`, or `String(err)` if it isn't an `Error`.

**Async and sub-routers**
- If a handler returns a promise that rejects, that counts as `next(reason)`, unless it already called `next`.
- A router passed to `use` runs its own layers. When it runs out, it continues in the parent, carrying any error.
