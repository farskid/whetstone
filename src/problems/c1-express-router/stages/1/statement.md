Rebuild the request pipeline at the heart of Express. There is no HTTP server: requests and responses are plain objects. Start with a chain of middleware that pass control along with `next()`.

```ts
const app = createRouter();
app.use((req, res, next) => { req.user = 'ada'; next(); });
app.use((req, res) => { res.statusCode = 201; res.end('hi ' + req.user); });

await app.handle({ method: 'GET', url: '/' }, res);   // res.end('hi ada')
```

```ts
interface Request { method: string; url: string; [k: string]: unknown }
interface Response { statusCode: number; end(body?: unknown): void; [k: string]: unknown }
type Next = () => void;
type Handler = (req: Request, res: Response, next: Next) => unknown;

function createRouter(): Router;

interface Router {
  use(...fns: Handler[]): Router;           // returns the router, for chaining
  handle(req: Request, res: Response): Promise<void>;
}
```

- Middleware runs in the order it was added. A middleware that calls `next()` passes control to the next one. One that doesn't call `next()` ends the chain there. <!-- tests: middleware runs in order through next() until one ends the response -->
- Calling `next` a second time from the same middleware does nothing. <!-- tests: calling next twice is a no-op -->
- `handle` resolves when `res.end` is first called. If nobody ever ends the response, it never resolves.
- If the chain runs out, `handle` sets `statusCode = 404` and ends with ``Cannot ${METHOD} ${path}``: the method in upper case, and `req.url` without its query string (`/a?x=1` gives `Cannot POST /a`). <!-- tests: falling off the end is a 404 naming the method and path (no query) -->
