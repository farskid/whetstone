Add path-scoped middleware and routes.

```ts
app.use('/api', apiLogger);
app.get('/users/:id', loadUser, (req, res) => res.end(req.user));

interface Request {
  // ...stage 1, plus:
  originalUrl?: string;
  baseUrl?: string;
  params?: Record<string, string>;
}
type Next = (signal?: 'route') => void;

interface Router {
  use(pathOrFn: string | Handler, ...fns: Handler[]): Router;
  get / post / put / delete / all(path: string, ...fns: Handler[]): Router;
  handle(req: Request, res: Response): Promise<void>;
}
```

**Matching**
- Layers (middleware and routes) run in the order they were added. A layer runs only if its path (and method, for routes) matches. `next()` moves on to the next matching layer.
- Paths are matched against `req.url` without the query string. Matching is case-sensitive.
- `handle` sets `req.originalUrl` to the incoming url, `req.baseUrl` to `''`, and `req.params` to `{}` if it isn't set. `originalUrl` never changes after that, and the 404 message uses its path.

**use(path)**
- `use(path, ...fns)` takes a literal path (no `:params`; a trailing `/` is ignored) and matches whole segments: `/api` matches `/api`, `/api/` and `/api/x`, but not `/apix`. With no path it matches everything.
- Inside a `use` layer with a path, `req.baseUrl` gains the prefix and `req.url` loses it: `/api/users?x=1` becomes `/users?x=1`, and `/api` becomes `/`. Both are restored when the layer calls `next`.

**Routes**
- `get/post/put/delete(path, ...fns)` match the whole path for that method (compare methods in upper case). `all` matches any method. A trailing slash is allowed (`/users/` matches `/users`).
- `:name` segments match one non-empty segment. When a route runs, `req.params` is set to that route's params, URL-decoded.
- A route with several handlers runs them in order through `next()`. After the last one, `next()` moves on to the next layer.
- `next('route')` skips the rest of that route's handlers and moves on to the next layer.
