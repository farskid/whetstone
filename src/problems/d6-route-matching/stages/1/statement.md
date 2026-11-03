Build a router like **find-my-way** (Fastify) or the matcher inside **React Router**. Start with static segments and params.

```ts
const r = createRouter<string>();
r.add('GET', '/users/:id/posts/:postId', 'post');
r.match('GET', '/users/j%C3%B6rg/posts/7?tab=1');
// { handler: 'post', params: { id: 'jörg', postId: '7' }, pattern: '/users/:id/posts/:postId' }
```

```ts
interface Match<H> { handler: H; params: Record<string, string>; pattern: string }
interface Router<H> {
  add(method: string, pattern: string, handler: H): void;
  match(method: string, path: string): Match<H> | null;
}
function createRouter<H>(): Router<H>;
```

**Patterns.** A pattern is a list of `/`-separated segments (empty ones are ignored, so `/` has zero segments). Each segment is either:
- static text like `users`, which matches exactly that segment (case-sensitive); or <!-- tests: static routes and the root -->
- `:name`, which matches any one non-empty segment and captures it as `params.name`. <!-- tests: params are captured and decoded -->

**Paths**
- Strip any `?query` and `#hash` first. <!-- tests: query, hash, trailing and duplicate slashes are ignored -->
- Ignore empty segments. `/a//b/` is the same as `/a/b`, and `/` is the root (zero segments). <!-- tests: query, hash, trailing and duplicate slashes are ignored -->
- A route matches when the path has the same number of segments and every segment matches.
- Param values are **decoded** with `decodeURIComponent`. If decoding throws, keep the raw text. <!-- tests: params are captured and decoded -->

**Matching**
- `match` returns `{ handler, params, pattern }`, where `pattern` is the string passed to `add`, or `null` if no route matches.
- The method must equal the route's method exactly (methods are upper-case strings like `'GET'`).
- In this stage, patterns are well-formed, each method and pattern is added once, and at most one route matches any request.
