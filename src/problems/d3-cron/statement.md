# Cron next-run

Write the core of `cron-parser`: parse a classic 5-field cron expression, then find when it next (or last) fires.

```ts
next('*/15 9-17 * * MON-FRI', new Date('2026-11-06T17:50:00Z'));  // 2026-11-09T09:00:00.000Z (Monday)
next('0 0 30 2 *', new Date('2026-01-01T00:00:00Z'));             // null (Feb 30 never happens)
next('30 2 * * *', new Date('2026-03-07T12:00:00Z'), { tz: 'America/New_York' });
// 2026-03-09T06:30:00.000Z (02:30 on Mar 8 doesn't exist in New York)
```

## Parsing: `parseCron(expr)`

An expression is exactly 5 whitespace-separated fields:

| Field | Range | Names |
| --- | --- | --- |
| minute | 0–59 | |
| hour | 0–23 | |
| day of month | 1–31 | |
| month | 1–12 | `JAN`–`DEC` |
| day of week | 0–7 (0 and 7 are Sunday) | `SUN`–`SAT` |

**Fields**
- A field is a comma-separated list of items. Each item is one of:
  - `*`;
  - a value `n`;
  - a range `a-b`;
  - any of those followed by a step `/s`.
- `n/s` means `n-max/s`.
- Names are case-insensitive and can appear anywhere a value can.

**Invalid expressions.** Throw an `Error` whose message starts with `Invalid cron expression` for:
- a wrong field count;
- unknown names;
- values out of range;
- `a > b`;
- a step below 1;
- anything else malformed.

`parseCron` returns `{ minute, hour, dayOfMonth, month, dayOfWeek, domRestricted, dowRestricted }`:
- Each set is a sorted array without duplicates.
- In `dayOfWeek`, 7 becomes 0.
- A day field is *restricted* when its text does not start with `*`, so `*/2` counts as unrestricted (like Vixie cron).

## Matching

- A minute matches when its minute, hour and month are in their sets and its day matches.
- If **both** day fields are restricted, a day matches when it's in day-of-month **or** day-of-week. Otherwise it must be in both, where an unrestricted field matches everything it lists.

## `next(expr, from, { tz }?)` and `prev(expr, from, { tz }?)`

- `next` returns the earliest matching minute strictly after `from`. `prev` returns the latest one strictly before `from`. Results are whole minutes (seconds = 0).
- Both look at most 10 years away and return `null` if nothing matches. They must terminate quickly even for impossible schedules (`0 0 30 2 *`), and must find rare ones (`0 0 29 2 *` across 2100, which isn't a leap year).
- Without `tz` (or with `'UTC'`), fields are in UTC.
- With an IANA time zone, fields describe local wall-clock time there. Use `Intl.DateTimeFormat` to get offsets.
  - **Spring forward:** a local time that doesn't exist on a given day (it falls in the DST gap) doesn't fire that day.
  - **Fall back:** a local time that happens twice fires **once**, at its first occurrence. `next` from inside the second occurrence moves on to a later local time.
