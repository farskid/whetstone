# Date math

You'll build a small **date-fns**. This stage does calendar arithmetic on **plain dates**: calendar days written as the string `'YYYY-MM-DD'`, with no time and no zone, like birthdays, due dates and holidays.

```ts
addMonths('2026-01-31', 1);       // '2026-02-28'
addDays('2026-12-31', 1);         // '2027-01-01'
startOfWeek('2026-03-12', 1);     // '2026-03-09' (a Monday)
```

```ts
type PlainDate = string;                  // 'YYYY-MM-DD'
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday … 6 = Saturday

getDay(date: PlainDate): Weekday
addDays(date: PlainDate, amount: number): PlainDate
addMonths(date: PlainDate, amount: number): PlainDate
startOfWeek(date: PlainDate, weekStartsOn?: Weekday): PlainDate
```

**Validation**
- Every plain-date argument must be a real date in exact `YYYY-MM-DD` form. Otherwise throw a `RangeError`: for example `'2026-02-30'` or `'2026-2-3'`. <!-- tests: invalid dates and amounts throw RangeError -->
- Amounts must be integers. Anything else also throws a `RangeError`. <!-- tests: invalid dates and amounts throw RangeError -->

- **`getDay(date)`** returns the weekday.
- **`addDays(date, n)`** moves by `n` days. `n` can be negative. <!-- tests: addDays across months, years and leap days -->
- **`addMonths(date, n)`** moves by `n` calendar months. If the day doesn't exist in the target month, it **clamps** to that month's last day, so `2026-01-31 + 1` is `2026-02-28` and `2024-01-31 + 1` is `2024-02-29`. <!-- tests: addMonths clamps to the end of the month -->
- **`startOfWeek(date, weekStartsOn = 0)`** returns the latest date on or before `date` that falls on `weekStartsOn`. <!-- tests: startOfWeek honours weekStartsOn -->
