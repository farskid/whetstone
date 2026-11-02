Add method handling, 405 support, pattern validation and reverse routing.

```ts
r.add('ALL', '/x', 'all');
r.add('POST', '/x', 'post');
r.match('delete', '/x')?.handler;   // 'all'
r.allowedMethods('/x');            // ['ALL', 'POST']
buildPath('/users/:id(\\d+)/:tab?', { id: 7 });   // '/users/7'
```

```ts
interface Router<H> {
  // ...add and match as before
  allowedMethods(path: string): string[];
}
function buildPath(pattern: string, params: Record<string, string | number>): string;
```

**Methods**
- Methods are case-insensitive on input: `add` and `match` upper-case them.
- `'ALL'` registers a route for every method. A route for the exact method beats `ALL` on the same pattern.
- `allowedMethods(path)` returns the sorted, de-duplicated methods of **every** route that matches the path, not just the best one (`'ALL'` shows up as `'ALL'`). It's `[]` when nothing matches. You can use it to answer **405** instead of **404**.

**Errors.** `add` throws an `Error` for:
- a malformed pattern: a `*` that isn't last, an empty or invalid param name (`/a/:`), the same param name twice, or a bad regex;
- adding the same method with an equivalent pattern twice. Two patterns are equivalent if they differ only in param names, like `/u/:id` and `/u/:name`. A different method or a different constraint is fine.

**`buildPath(pattern, params)`** fills a pattern in:
- Encode values with `encodeURIComponent`. The `*` value is encoded per segment, so its slashes stay. A missing or empty `*` is dropped.
- An optional param that is missing (or `''`) is dropped.
- A required param that is missing, or a value that breaks its constraint, throws an `Error`.
- The result starts with `/`, and `buildPath('/', {})` is `'/'`.
- Matching a built path gives the params back (as strings).

**Speed.** With thousands of routes, `match` must not scan every route: 20,000 lookups among 2,000 routes take well under half a second.
