# Router history

Client-side routers like **React Router** sit on top of a history object. It keeps a stack of locations, moves around in it, and tells listeners when the location changes. Over the stages you'll build `createMemoryHistory`, the in-memory version used in tests and on servers.

This stage covers locations: parsing paths, setting up the initial entries and resolving targets.

```ts
parsePath('/a?x=1#top'); // { pathname: '/a', search: '?x=1', hash: '#top' }
const h = createMemoryHistory({ initialEntries: ['/a', '/b?x=1'] });
h.location;          // { pathname: '/b', search: '?x=1', hash: '', state: null, key: '…' }
h.createHref('#top'); // '/b#top'
```

## Paths

A location is `{ pathname, search, hash, state, key }`.

### `parsePath(path)`

`parsePath` splits a string into the parts it contains. The hash starts at the first `#` and runs to the end, so `'/a#h?x'` gives `{ pathname: '/a', hash: '#h?x' }`. The search starts at the first `?` before the hash. It leaves out any part that's missing, so `'?q=2'` gives `{ search: '?q=2' }` and `''` gives `{}`. <!-- tests: parsePath splits a string -->

### Targets

A navigation target (`to`) is a string or a partial `{ pathname?, search?, hash? }`. A string is parsed with `parsePath`. It resolves against the **current** location:

- A missing `pathname` keeps the current one. <!-- tests: initial entries and resolving partial paths -->
- A missing `search` or `hash` becomes `''`. They are never carried over. <!-- tests: initial entries and resolving partial paths -->
- A bare `'?'` or `'#'` also becomes `''`.

## `createMemoryHistory({ initialEntries = ['/'], initialIndex })`

- **Initial entries** are strings or partial paths, optionally with a `state`. Each one resolves against `/`. An empty list counts as `['/']`. <!-- tests: initial entries and resolving partial paths -->
- **`initialIndex`** defaults to the last entry and is clamped into range. <!-- tests: initial entries and resolving partial paths -->
- **Keys.** Every entry gets a **unique** string `key`. `state` defaults to `null`.
- **Read-only properties:** `location` (the current entry), `index`, `length`, and `action`. `action` is `'POP'`.
- **`createHref(to)`** resolves `to` against the current location and joins the parts back into a string.
