Add a trailing wildcard and specificity ranking: several routes may now match the same request.

```ts
r.add('GET', '/users/:id', 'byId');
r.add('GET', '/users/me', 'me');
r.add('GET', '/files/*', 'files');
r.match('GET', '/users/me');       // 'me': static beats param
r.match('GET', '/files/a/b.txt');  // params: { '*': 'a/b.txt' }
```

**Wildcard.** A last segment `*` matches the **rest** of the path, zero or more segments. <!-- tests: param beats wildcard; wildcard captures the rest -->
- It's captured as `params['*']`: the remaining segments, each decoded, joined with `/`. <!-- tests: param beats wildcard; wildcard captures the rest -->
- With zero remaining segments, it's `''`. So `/files/*` matches `/files` with `{ '*': '' }`.
- `*` only appears as the last segment.

**Specificity.** When several routes match, the more specific one wins, **segment by segment from the left**: static > param > wildcard. Registration order doesn't matter. <!-- tests: static beats param regardless of registration order | param beats wildcard; wildcard captures the rest -->
- If the best choice at one segment leads to a dead end later, **backtrack** and try the next option at that segment. <!-- tests: backtracks when the most specific branch dead-ends -->

```ts
add('GET', '/a/:x/c', 1); add('GET', '/a/b/d', 2); add('GET', '/a/*', 3);
match('GET', '/a/b/c'); // 1: static "b" fails at "c", so it backtracks to :x
match('GET', '/a/b/e'); // 3
```

- A route only counts if its method matches, so backtracking also skips routes for other methods.
- Two routes that differ only in param names at the same position (like `/u/:id` and `/u/:name/x`) are both "param" there; either may be tried first.
