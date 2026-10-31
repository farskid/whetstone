# Route matching

Build a router like **find-my-way** (Fastify) or the matcher inside **React Router**.

```ts
const r = createRouter<string>();
r.add('GET', '/users/:id(\\d+)', 'showUser');
r.add('GET', '/users/me', 'me');
r.add('GET', '/files/*', 'files');

r.match('GET', '/users/42?tab=posts');
// { handler: 'showUser', params: { id: '42' }, pattern: '/users/:id(\\d+)' }
r.match('GET', '/users/me');     // 'me' wins: static beats param
r.match('GET', '/files/a/b.txt'); // params: { '*': 'a/b.txt' }
```

## Patterns
A pattern is a list of `/`-separated segments. Each segment is one of:

| segment | matches |
|---|---|
| `users` | exactly `users` (case-sensitive) |
| `:id` | any one non-empty segment, captured as `params.id` |
| `:id(\d+)` | one segment that **fully** matches the regex (`^(?:…)$`) |
| `:id?` / `:id(\d+)?` | optional: the segment may be absent, and then `id` is **not a key** in `params` |
| `*` | the **rest** of the path (zero or more segments), captured as `params['*']`. Only allowed as the last segment |

A malformed pattern throws an `Error`: a `*` that isn't last, an empty param name, the same param name twice, or a bad regex.

## Paths
- Strip any `?query` and `#hash` first.
- Ignore empty segments. `/a//b/` is the same as `/a/b`, and `/` is the root (zero segments).
- Param values (and each segment of `*`) are **decoded** with `decodeURIComponent`. If decoding throws, keep the raw text.

## Specificity
When several routes match, the more specific one wins, **segment by segment from the left**: static > param (constrained or not) > wildcard. Registration order only breaks ties between params at the same position. If the best choice at one segment leads to a dead end later, **backtrack** and try the next option.

```ts
add('GET', '/a/:x/c', 1); add('GET', '/a/b/d', 2);
match('GET', '/a/b/c'); // 1: static "b" fails at "c", so it backtracks to :x
```

## Methods
- Methods are upper-case strings. `'ALL'` registers a route for every method. A route for the exact method beats `ALL` on the same pattern.
- `match(method, path)` returns `{ handler, params, pattern }` or `null`.
- `allowedMethods(path)` returns the sorted, de-duplicated methods that would match the path (`'ALL'` shows up as `'ALL'`). You can use it to answer **405** instead of **404**.
- Adding the same method with an equivalent pattern twice throws an `Error`. Two patterns are equivalent if they differ only in param names, like `/u/:id` and `/u/:name`.

## Reverse routing
`buildPath(pattern, params)` fills a pattern in:
- Encode values with `encodeURIComponent`. The `*` value is encoded per segment, so its slashes stay.
- An optional param that is missing is dropped.
- A required param that is missing, or a value that breaks its constraint, throws an `Error`.

```ts
buildPath('/users/:id(\\d+)/:tab?', { id: 7 })      // '/users/7'
buildPath('/files/*', { '*': 'a b/c.txt' })           // '/files/a%20b/c.txt'
```
