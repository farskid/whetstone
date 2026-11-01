# Date math

Build a small **date-fns**. Most bugs in date code come from mixing up two kinds of value:

- A **plain date** is a calendar day, written as the string `'YYYY-MM-DD'`. It has no time and no zone, and is used for birthdays, due dates and holidays.
- An **instant** is a moment in time: a `Date`, or epoch milliseconds. Which calendar day an instant falls on depends on the time zone.

```ts
addMonths('2026-01-31', 1);                                   // '2026-02-28'
differenceInCalendarDays(laterInstant, earlierInstant, 'Europe/Helsinki');
addBusinessDays('2026-12-23', 1, ['2026-12-24', '2026-12-25']); // '2026-12-28'
expand({ freq: 'monthly', start: '2026-01-01', byDay: [5], nth: -1 }, '2026-01-01', '2026-06-30'); // last Fridays
```

Weekdays are numbered `0` (Sunday) through `6` (Saturday). Every plain-date argument must be a real date in exact `YYYY-MM-DD` form. Otherwise, throw a `RangeError`: for example `'2026-02-30'` or `'2026-2-3'`. Amounts must be integers, and anything else also throws a `RangeError`.

## Calendar arithmetic

- **`getDay(date)`** returns the weekday.
- **`addDays(date, n)`** moves by `n` days. `n` can be negative.
- **`addMonths(date, n)`** moves by `n` calendar months. If the day doesn't exist in the target month, it **clamps** to that month's last day, so `2026-01-31 + 1` is `2026-02-28` and `2024-01-31 + 1` is `2024-02-29`.
- **`startOfWeek(date, weekStartsOn = 0)`** returns the latest date on or before `date` that falls on `weekStartsOn`.

## Time zones

- **`toPlainDate(instant, timeZone = 'UTC')`** returns the calendar date of the instant in an IANA zone, like `'America/New_York'`.
- **`differenceInCalendarDays(a, b, timeZone = 'UTC')`** returns the number of calendar days from `b` to `a`, so it's positive when `a` is later. Plain-date arguments are used as they are. Instants are first converted with `toPlainDate(…, timeZone)`.

  This counts calendar days, not periods of 24 hours. In a zone with DST, a calendar day can be 23 or 25 hours long.
- **`isSameDay(a, b, timeZone = 'UTC')`** returns whether `a` and `b` fall on the same calendar day in that zone.

## Business days

A business day is Monday to Friday and not in `holidays`. `holidays` is a list of plain dates, and a holiday that falls on a weekend changes nothing.

- **`addBusinessDays(date, n, holidays = [])`** returns the `n`th business day after `date`. When `n` is negative it counts back to the `|n|`th business day before `date`. `date` itself never counts, and `n = 0` returns `date` unchanged.
- **`differenceInBusinessDays(later, earlier, holidays = [])`** counts the business days `d` with `earlier < d ≤ later`. When `later` is before `earlier`, it returns that count with a minus sign: `-(business days in (later, earlier])`.

## Recurrence

**`expand(rule, from, to)`** returns every occurrence `d` of the rule with `from ≤ d ≤ to`, in ascending order.

```ts
interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly';
  start: PlainDate;      // no occurrence is ever before start
  interval?: number;     // every n days, weeks or months; default 1
  byDay?: Weekday[];     // weekly: which weekdays; monthly: which weekdays of the month
  nth?: number;          // monthly with byDay: 1 = first, 2 = second, …, -1 = last, -2 = second to last
  byMonthDay?: number;   // monthly without byDay: day of month, -1 = last day (default: start's day)
  count?: number;        // stop after this many occurrences, counted from start
  until?: PlainDate;     // last allowed date, inclusive
  weekStartsOn?: Weekday; // for weekly intervals; default 1 (Monday)
}
```

The candidate days for each `freq` are:

- **daily**: `start`, `start + interval`, `start + 2·interval` and so on.
- **weekly**: number the weeks from the week that contains `start`. Weeks begin on `weekStartsOn`, and that first week is week 0. Only weeks `0`, `interval`, `2·interval` and so on are used. In those weeks, the candidates are the days in `byDay`, which defaults to `start`'s weekday.

  Because a week is a span of days rather than a single date, `weekStartsOn` changes which days fall into the same week.
- **monthly**: start from `start`'s month and use every `interval`th month.
  - With `byDay` and no `nth`, every matching weekday in the month is a candidate.
  - With `byDay` and `nth`, the `nth` matching day of each weekday in `byDay` is a candidate. A month without one, such as a 5th Friday, has none.
  - Without `byDay`, the candidate is day `byMonthDay`. A month that doesn't have that day is **skipped**: this is RRULE behaviour, unlike `addMonths`, which clamps.

**Filtering and stopping.**
- Candidates before `start` are dropped.
- `count` counts occurrences from `start`, including those before `from`.
- After `until`, the rule stops.

**Performance.** A daily rule that started in 1900 must still expand a single week in 2026 quickly.
