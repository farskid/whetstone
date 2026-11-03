# Date math: time zones

Add **instants**. An instant is a moment in time: a `Date`, or epoch milliseconds. Which calendar day an instant falls on depends on the time zone.

```ts
toPlainDate(new Date('2026-03-01T03:00:00Z'), 'America/New_York'); // '2026-02-28'
differenceInCalendarDays(laterInstant, earlierInstant, 'Europe/Helsinki');
```

```ts
type DateInput = PlainDate | Date | number;

toPlainDate(instant: Date | number, timeZone?: string): PlainDate
differenceInCalendarDays(a: DateInput, b: DateInput, timeZone?: string): number
isSameDay(a: DateInput, b: DateInput, timeZone?: string): boolean
```

- **`toPlainDate(instant, timeZone = 'UTC')`** returns the calendar date of the instant in an IANA zone, like `'America/New_York'`. <!-- tests: toPlainDate gives the calendar date in a zone -->
- **`differenceInCalendarDays(a, b, timeZone = 'UTC')`** returns the number of calendar days from `b` to `a`, so it's positive when `a` is later. Plain-date arguments are used as they are. Instants are first converted with `toPlainDate(…, timeZone)`. <!-- tests: differenceInCalendarDays counts days, not 24-hour periods, across DST -->

  This counts calendar days, not periods of 24 hours. In a zone with DST, a calendar day can be 23 or 25 hours long. <!-- tests: differenceInCalendarDays counts days, not 24-hour periods, across DST -->
- **`isSameDay(a, b, timeZone = 'UTC')`** returns whether `a` and `b` fall on the same calendar day in that zone. <!-- tests: isSameDay depends on the zone -->
- An invalid instant (such as `new Date('x')`) throws a `RangeError`.

Everything from earlier stages still applies.
