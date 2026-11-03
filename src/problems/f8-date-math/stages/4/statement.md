# Date math: recurrence

Add recurrence rules.

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
- **weekly**: number the weeks from the week that contains `start`. Weeks begin on `weekStartsOn`, and that first week is week 0. Only weeks `0`, `interval`, `2·interval` and so on are used. In those weeks, the candidates are the days in `byDay`, which defaults to `start`'s weekday. <!-- tests: weekly on Monday and Wednesday, with an interval -->

  Because a week is a span of days rather than a single date, `weekStartsOn` changes which days fall into the same week. <!-- tests: weekStartsOn decides which days share a week -->
- **monthly**: start from `start`'s month and use every `interval`th month.
  - With `byDay` and no `nth`, every matching weekday in the month is a candidate. <!-- tests: monthly: nth weekday, last Friday, and day-of-month skipping -->
  - With `byDay` and `nth`, the `nth` matching day of each weekday in `byDay` is a candidate. A month without one, such as a 5th Friday, has none. <!-- tests: monthly: nth weekday, last Friday, and day-of-month skipping -->
  - Without `byDay`, the candidate is day `byMonthDay`. A month that doesn't have that day is **skipped**: this is RRULE behaviour, unlike `addMonths`, which clamps. <!-- tests: monthly: nth weekday, last Friday, and day-of-month skipping -->

**Filtering and stopping.**
- Candidates before `start` are dropped.
- `count` counts occurrences from `start`, including those before `from`. <!-- tests: count is counted from start; until is inclusive; old rules stay fast -->
- After `until`, the rule stops. <!-- tests: count is counted from start; until is inclusive; old rules stay fast -->

**Performance.** A daily rule that started in 1900 must still expand a single week in 2026 quickly. <!-- tests: count is counted from start; until is inclusive; old rules stay fast -->
- `interval` must be an integer of at least 1. Otherwise throw a `RangeError`.

Everything from earlier stages still applies.
