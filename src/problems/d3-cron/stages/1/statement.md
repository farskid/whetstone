Write the parser at the core of `cron-parser`: turn a classic 5-field cron expression into sets of values.

```ts
parseCron('5,0,5 12 * 1,6 *');
// { minute: [0, 5], hour: [12], dayOfMonth: [1, ..., 31], month: [1, 6],
//   dayOfWeek: [0, ..., 6], domRestricted: false, dowRestricted: false }
```

```ts
interface CronSchedule {
  minute: number[]; hour: number[]; dayOfMonth: number[]; month: number[]; dayOfWeek: number[];
  domRestricted: boolean; dowRestricted: boolean;
}
function parseCron(expr: string): CronSchedule;
```

An expression is exactly 5 fields separated by whitespace (leading and trailing whitespace is ignored):

| Field | Range |
| --- | --- |
| minute | 0–59 |
| hour | 0–23 |
| day of month | 1–31 |
| month | 1–12 |
| day of week | 0–6 (0 is Sunday) |

- A field is a comma-separated list of items. In this stage an item is either `*` (every value in the range) or a decimal number.
- Each set in the result is sorted ascending, without duplicates.
- A day field is *restricted* when its text does not start with `*`. `domRestricted` is for day of month, `dowRestricted` for day of week.
- Throw an `Error` whose message starts with `Invalid cron expression` for a wrong field count, a value out of range, an empty item (`1,,2`), or any other item (letters, `-`, `/`).
