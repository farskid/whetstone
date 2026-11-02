Use the set to find a time when everyone is free.

```ts
interface Person { busy: Range[]; workingHours: Range[] }
function commonFreeSlots(people: Person[], window: Range, minDuration?: number): Range[];   // default 0
```

- Return the times inside `window` where **every** person is inside one of their `workingHours` ranges and none of their `busy` ranges, sorted, keeping gaps of at least `minDuration`.
- A person's `workingHours` may be split (e.g. a lunch break).
- With no people, the whole window is free.
- Don't mutate the people or their ranges.
