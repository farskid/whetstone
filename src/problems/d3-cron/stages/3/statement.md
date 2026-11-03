Add `next`: when does the expression fire next, in UTC?

```ts
next('*/15 9-17 * * MON-FRI', new Date('2026-11-06T17:50:00Z')); // 2026-11-09T09:00:00.000Z (Monday)
next('0 0 30 2 *', new Date('2026-01-01T00:00:00Z'));            // null

function next(expr: string, from: Date): Date | null;
```

- Fields are read in UTC.
- A minute matches when its minute, hour and month are in their sets and its day matches.
- If **both** day fields are restricted, a day matches when it's in day-of-month **or** day-of-week. Otherwise it must be in both (an unrestricted field lists every day, so effectively only the other one counts). <!-- tests: day-of-month OR day-of-week when both are restricted -->
- `next` returns the earliest matching minute strictly after `from`, as a whole minute (seconds and milliseconds 0). `from` may have seconds. <!-- tests: next is strictly after from and lands on whole minutes -->
- Look at most 10 years ahead and return `null` if nothing matches. It must finish quickly even for impossible schedules (`0 0 30 2 *`), and must find rare ones (`0 0 29 2 *` across 2100, which isn't a leap year). Skip whole months, days and hours that can't match instead of stepping minute by minute. <!-- tests: short months, leap days and impossible schedules -->
- An invalid expression throws, as in `parseCron`.
