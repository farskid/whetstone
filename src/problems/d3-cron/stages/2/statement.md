Add ranges, steps and names.

```ts
parseCron('1-30/7 * * * *').minute;            // [1, 8, 15, 22, 29]
parseCron('0 0 * jan-Mar mon-fri,7').dayOfWeek; // [0, 1, 2, 3, 4, 5]
```

- An item can now be `*`, a value `n`, or a range `a-b` (inclusive). Any of these can be followed by a step `/s`, which keeps every `s`-th value from the start: `*/15` is 0, 15, 30, 45. <!-- tests: ranges, steps and offset steps -->
- `n/s` means `n-max/s`, so `50/4` in the minute field is 50, 54, 58. <!-- tests: ranges, steps and offset steps -->
- Month names `JAN`–`DEC` (1–12) and weekday names `SUN`–`SAT` (0–6) can appear anywhere a value can, in any case. <!-- tests: names, weekday 7 and restriction flags -->
- Day of week now accepts 0–7, and 7 also means Sunday. It becomes 0 in the result. <!-- tests: names, weekday 7 and restriction flags -->
- The restriction rule is unchanged: `*/2` starts with `*`, so it's unrestricted. <!-- tests: names, weekday 7 and restriction flags -->
- Also throw `Invalid cron expression` for an unknown name, `a > b`, a step below 1, or anything malformed like `1-2-3`.
