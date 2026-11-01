# Router history

Client-side routers like **React Router** sit on top of a history object. It keeps a stack of locations, moves around in it, and tells listeners when the location changes. Here you'll build `createMemoryHistory`, the in-memory version used in tests and on servers. It also handles navigation blocking ("You have unsaved changes"), remembers scroll positions, and caps the stack's length.

## Paths

A location is `{ pathname, search, hash, state, key }`.

### `parsePath(path)`

`parsePath` splits a string into the parts it contains: `'/a?x=1#top'` gives `{ pathname: '/a', search: '?x=1', hash: '#top' }`. It leaves out any part that's missing, so `'?q=2'` gives `{ search: '?q=2' }`.

### Targets

A navigation target (`to`) is a string or a partial `{ pathname?, search?, hash? }`. It resolves against the **current** location:

- A missing `pathname` keeps the current one.
- A missing `search` or `hash` becomes `''`.
- A bare `'?'` or `'#'` also becomes `''`.

`createHref(to)` resolves `to` the same way and joins the parts back into a string.

## `createMemoryHistory({ initialEntries = ['/'], initialIndex, maxLength = Infinity })`

### Setup

- **Initial entries** are strings or partial paths, optionally with a `state`. Each one resolves against `/`. An empty list counts as `['/']`.
- **`initialIndex`** defaults to the last entry and is clamped into range.
- **`maxLength`** must be a positive integer or `Infinity`. Otherwise it throws a `RangeError`.
- **Read-only properties:** `location`, `index`, `length`, and `action`. `action` starts as `'POP'`.
- **Keys.** Every entry gets a **unique** string `key`. That includes a `replace`, which creates a new entry with a new key. `state` defaults to `null`.

### Navigation

- **`push(to, state?)`** drops everything after the current entry, adds the new entry and moves to it. The action is `'PUSH'`.
- **`replace(to, state?)`** swaps the current entry for a new one. The action is `'REPLACE'`.
- **`go(delta)`** moves by `delta`, clamped to the stack. If that doesn't change the index, nothing happens at all. The action is `'POP'`.
- **`back()`** is `go(-1)`, and **`forward()`** is `go(1)`.
- **`listen(fn)`** calls `fn({ action, location })` after every navigation. It returns an unsubscribe function.

### Blocking

`block(blocker)` adds a blocker and returns a function that removes it. Before any navigation, the blockers are asked in the order they were added:

- **Asking.** Each blocker is called with a transition `{ action, location, retry }`. `location` is where the navigation would go.
- **Allowing.** A blocker that returns `true` lets it through.
- **Blocking.** Any other return value stops the navigation right there. Later blockers aren't asked, and nothing changes.

`tx.retry()` means "the blocker that stopped this transition now approves". The navigation carries on from there:

- **Who is asked.** Only the blockers that haven't approved it yet are asked. Each one is checked against the blockers that exist **now**, so removed ones are skipped.
- **Stale transitions.** If any other navigation has been attempted since, even a blocked one, the transition is **stale**. `retry` then does nothing.
- **Already done.** Calling `retry` again after the navigation went through also does nothing.

### Scroll positions

- **`saveScroll(y)`** remembers `y` for the current entry.
- **`getScroll(key?)`** returns the remembered value for that entry, or the current entry if no key is given. It returns `undefined` when nothing was saved.
- **Discarded entries.** An entry that's discarded loses its scroll data. That covers entries replaced, cut off by a `push`, or dropped by `maxLength`.

### `maxLength`

When a `push` makes the stack longer than `maxLength`, the **oldest** entries are dropped. The index shifts to match.
