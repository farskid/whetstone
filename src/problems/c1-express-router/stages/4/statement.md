Add async handlers and mountable sub-routers.

```ts
const api = createRouter();
api.get('/users/:id', async (req, res) => res.end(await db.user(req.params.id)));
app.use('/api', api);

interface Router {
  (req: Request, res: Response, next: Next): void;   // a router is itself middleware
  // ...stage 3
}
```

**Async**
- If a handler returns a promise that rejects, that counts as `next(reason)`, unless the handler already called `next`.

**Sub-routers**
- A router can be called as middleware, so `use(path, router)` mounts it. It runs its own layers against the stripped `req.url`, with `req.baseUrl` set to the full prefix so far (`/api/v1` for a router mounted at `/v1` inside one at `/api`).
- A sub-router's routes see only their own params.
- When a sub-router runs out of layers, it continues in the parent with `req.url` and `req.baseUrl` restored, carrying any error.
- `next('router')` leaves the current router right away and continues in its parent, with no error.
