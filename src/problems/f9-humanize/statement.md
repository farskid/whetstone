# Humanize bytes and durations

Write the small formatting helpers that every dashboard needs, in the spirit of **pretty-bytes** and **ms**. Any number argument that is `NaN` or infinite throws a `RangeError`, and so does an invalid `Date`.

## `formatBytes(bytes, options?)`

```ts
formatBytes(1536);                     // '1.5 kB'
formatBytes(1536, { binary: true });   // '1.5 KiB'
formatBytes(999_950);                  // '1 MB'
formatBytes(1536, { locale: 'de-DE' }); // '1,5 kB'
```

- **Units.** By default, units are powers of 1000: `B`, `kB`, `MB`, `GB`, `TB`, `PB`, `EB`, `ZB`, `YB`. With `binary: true`, they are powers of 1024: `B`, `KiB`, `MiB`, … `YiB`. Pick the largest unit whose size is ≤ `|bytes|`. Past the last unit, keep using `YB`/`YiB`.
- **Rounding.** By default, round to `fractionDigits` (default `1`) decimal places. If `significantDigits` is given, round to that many significant digits instead. Do not show trailing zeros: `1000` is `'1 kB'`, not `'1.0 kB'`.
- **Carrying.** If rounding pushes the value up to a full unit (`999.95 kB` → `1000 kB`), move to the next unit. The result is `'1 MB'`.
- **Output.** Format the number with `Intl.NumberFormat(locale)` (default `'en-US'`) without grouping separators, then add a space and the unit. A negative input keeps its minus sign, unless the value rounds to zero.

## `parseDuration(text)`

Returns milliseconds.

```ts
parseDuration('2h 30m');   // 9_000_000
parseDuration('1.5h');     // 5_400_000
parseDuration('1d2h');     // 93_600_000
parseDuration('90 Seconds'); // 90_000
parseDuration('500');      // 500
```

- **Units.** Unit names are case-insensitive:
  - `ms`, `msec`, `msecs`, `millisecond`, `milliseconds`
  - `s`, `sec`, `secs`, `second`, `seconds`
  - `m`, `min`, `mins`, `minute`, `minutes`
  - `h`, `hr`, `hrs`, `hour`, `hours`
  - `d`, `day`, `days`
  - `w`, `week`, `weeks`
- **Parts.** A duration is one or more number-and-unit parts. Whitespace is optional between parts and between a number and its unit, and the parts are summed. Numbers may have a decimal part.
- **Bare numbers.** A single number with no unit means milliseconds.
- **Sign.** A leading `-` negates the whole duration.
- **Errors.** Throw a `RangeError` for any of these:
  - an empty string;
  - an unknown unit;
  - a part without a unit when there are several parts;
  - anything else that doesn't fit the grammar.

## `formatDuration(ms, options?)`

```ts
formatDuration(9_000_000);                 // '2h 30m'
formatDuration(90_061_001);                // '1d 1h 1m 1s 1ms'
formatDuration(-9_000_000, { long: true }); // '-2 hours 30 minutes'
formatDuration(0);                         // '0ms'
```

- **Rounding.** First round `ms` to the nearest whole millisecond.
- **Parts.** Split the duration into days, hours, minutes, seconds and milliseconds. Leave out any part that is zero, and separate the remaining parts with spaces.
- **Forms.** The short form looks like `2h`. With `long: true`, use `2 hours`, or `1 hour` in the singular. Zero is `'0ms'`, or `'0 milliseconds'` in the long form.
- **Sign.** A negative duration gets a single leading `-`.

## `relativeTime(date, now, options?)`

```ts
relativeTime(now - 3 * DAY, now);                      // '3 days ago'
relativeTime(now - DAY, now, { numeric: 'auto' });     // 'yesterday'
relativeTime(now + 3 * DAY, now, { locale: 'fi' });    // '3 päivän päästä'
```

**Arguments.** `date` and `now` are `Date`s or epoch milliseconds. `now` is required, which keeps the function pure.

**Choosing the unit.** Let `s` be the absolute difference in seconds. The thresholds follow the conventions used by Day.js and Moment.

| Range of `s`     | Unit    | Value               |
| ---------------- | ------- | ------------------- |
| `< 45`           | second  | `s`                 |
| `< 45 · 60`      | minute  | `s / 60`            |
| `< 22 · 3600`    | hour    | `s / 3600`          |
| `< 26 days`      | day     | `s / 86400`         |
| `< 320 days`     | month   | days `/ 30`         |
| otherwise        | year    | days `/ 365`        |

**Rounding and sign.** Round the value to the nearest integer, with halves rounding away from zero. A past date gets a negative value.

**Formatting.** Format with `Intl.RelativeTimeFormat(locale, { numeric })`. `locale` defaults to `'en'` and `numeric` defaults to `'always'`.
