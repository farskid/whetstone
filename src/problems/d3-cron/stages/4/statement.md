Add `prev` and time zones.

```ts
prev('0 0 * * 0', new Date('2026-11-01T00:00:00Z'));   // 2026-10-25T00:00:00.000Z
next('30 2 * * *', new Date('2026-03-07T12:00:00Z'), { tz: 'America/New_York' });
// 2026-03-09T06:30:00.000Z (02:30 on Mar 8 doesn't exist in New York)

interface NextOptions { tz?: string }
function next(expr: string, from: Date, opts?: NextOptions): Date | null;
function prev(expr: string, from: Date, opts?: NextOptions): Date | null;
```

- `prev` returns the latest matching minute strictly **before** `from`, also looking at most 10 years away (back) and returning `null` if nothing matches.
- Without `tz` (or with `'UTC'`), fields are in UTC, as before.
- With an IANA time zone, fields describe local wall-clock time there. Use `Intl.DateTimeFormat` to get offsets.
  - **Spring forward:** a local time that doesn't exist on a given day (it falls in the DST gap) doesn't fire that day.
  - **Fall back:** a local time that happens twice fires **once**, at its first occurrence. `next` from inside the second occurrence moves on to a later local time, and `prev` from inside it returns the first occurrence.
- The result is still a real instant (`Date`), on a whole local minute.
