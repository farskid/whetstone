Find the gaps.

```ts
class RangeSet {
  // ...stage 2, plus:
  freeSlots(window: Range, minDuration?: number): Range[];   // minDuration default 0
}
```

- `freeSlots(window, minDuration)` returns the parts of `window` not covered by the set, sorted by start. <!-- tests: freeSlots returns gaps inside the window -->
- Ranges that stick out of the window are clipped to it. <!-- tests: freeSlots clips busy ranges that stick out of the window and filters by minDuration -->
- Keep only gaps whose length is at least `minDuration`. Never return an empty gap. <!-- tests: freeSlots clips busy ranges that stick out of the window and filters by minDuration -->
- An empty set returns the whole window; a fully covered window returns `[]`.
