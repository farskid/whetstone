# Router history: the stack

Add navigation: pushing, replacing and moving around the stack, with listeners.

```ts
const h = createMemoryHistory();
h.listen(({ action, location }) => console.log(action, location.pathname));
h.push('/a');  // PUSH /a
h.back();      // POP /
h.go(5);       // POP /a (clamped)
```

- **`push(to, state?)`** resolves `to` against the current location, drops everything after the current entry, adds the new entry and moves to it. The action is `'PUSH'`. <!-- tests: push and replace -->
- **`replace(to, state?)`** swaps the current entry for a new one. The new entry gets a **new key**. The action is `'REPLACE'`. <!-- tests: push and replace -->
- **`state`** defaults to `null`.
- **`go(delta)`** moves by `delta`, truncated to an integer and clamped to the stack. If that doesn't change the index, nothing happens at all: no action change and no listener call. Otherwise the action is `'POP'`. <!-- tests: go clamps; a no-op go does nothing; push cuts the forward entries -->
- **`back()`** is `go(-1)`, and **`forward()`** is `go(1)`.
- **`listen(fn)`** calls `fn({ action, location })` after every navigation, once the history already shows the new location. It returns an unsubscribe function, and calling that twice is harmless. <!-- tests: listeners can unsubscribe -->

Everything from earlier stages still applies.
