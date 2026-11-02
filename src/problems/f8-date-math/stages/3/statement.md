# Date math: business days

Add business-day arithmetic.

```ts
addBusinessDays('2026-12-23', 1, ['2026-12-24', '2026-12-25']); // '2026-12-28'
differenceInBusinessDays('2026-03-16', '2026-03-13');           // 1 (Fri → Mon)
```

```ts
addBusinessDays(date: PlainDate, amount: number, holidays?: PlainDate[]): PlainDate
differenceInBusinessDays(later: PlainDate, earlier: PlainDate, holidays?: PlainDate[]): number
```

A business day is Monday to Friday and not in `holidays`. `holidays` is a list of plain dates, and a holiday that falls on a weekend changes nothing.

- **`addBusinessDays(date, n, holidays = [])`** returns the `n`th business day after `date`. When `n` is negative it counts back to the `|n|`th business day before `date`. `date` itself never counts, and `n = 0` returns `date` unchanged.
- **`differenceInBusinessDays(later, earlier, holidays = [])`** counts the business days `d` with `earlier < d ≤ later`. When `later` is before `earlier`, it returns that count with a minus sign: `-(business days in (later, earlier])`.

Everything from earlier stages still applies.
