Stop the cache from leaking objects, and add Reselect-style selectors.

```ts
const selectTotal = createSelector(
  [(s: State) => s.items, (s: State) => s.taxRate],
  (items, rate) => sum(items) * (1 + rate),
);

function createSelector<S, R>(
  inputs: ((state: S, ...args: any[]) => unknown)[],
  combiner: (...values: any[]) => R,
): ((state: S, ...args: any[]) => R) & { recomputations(): number; resetRecomputations(): void };
```

**memoize**
- Object and function arguments go in a `WeakMap` level, so the cache alone doesn't keep them alive. (With `max` set, the recency list may hold them until they're evicted.) Everything else from stage 3 stays the same.

**createSelector**
- Each call runs every input selector with all of the selector's arguments (the state and any extras). <!-- tests: selector extra args reach the inputs -->
- If every input result is `Object.is`-equal to the previous call's, return the previous result without calling `combiner`. Otherwise call `combiner` with the input results in order. <!-- tests: createSelector recomputes only when an input changes -->
- `recomputations()` counts combiner calls, and `resetRecomputations()` sets it back to 0.
