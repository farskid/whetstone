Use the set to find a time when everyone is free.

```ts
interface Person { busy: Range[]; workingHours: Range[] }
function commonFreeSlots(people: Person[], window: Range, minDuration?: number): Range[];   // default 0
```

- Return the times inside `window` where **every** person is inside one of their `workingHours` ranges and none of their `busy` ranges, sorted, keeping gaps of at least `minDuration`. <!-- tests: common free slots across people | working hours limit availability, including split days -->
- A person's `workingHours` may be split (e.g. a lunch break). <!-- tests: working hours limit availability, including split days -->
- With no people, the whole window is free. <!-- tests: no people means the whole window is free; inputs untouched -->
- Don't mutate the people or their ranges. <!-- tests: no people means the whole window is free; inputs untouched -->
