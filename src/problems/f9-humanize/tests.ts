import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}

const NOW = Date.UTC(2026, 10, 1, 12, 0, 0);
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const tests: TestCase<M>[] = [
  {
    group: 'Bytes',
    title: 'SI units with one decimal and no trailing zeros',
    run({ formatBytes }, { expect }) {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(999)).toBe('999 B');
      expect(formatBytes(1000)).toBe('1 kB');
      expect(formatBytes(1536)).toBe('1.5 kB');
      expect(formatBytes(1_000_000), 'exactly one MB').toBe('1 MB');
      expect(formatBytes(1_234_567)).toBe('1.2 MB');
      expect(formatBytes(1_234_567, { fractionDigits: 2 })).toBe('1.23 MB');
      expect(formatBytes(-1536)).toBe('-1.5 kB');
      expect(formatBytes(-0.01), 'rounds to zero: no minus sign').toBe('0 B');
      expect(formatBytes(1e30), 'past the last unit').toBe('1000000 YB');
    },
  },
  {
    group: 'Bytes',
    title: 'binary units, locales and significant digits',
    run({ formatBytes }, { expect }) {
      expect(formatBytes(1536, { binary: true })).toBe('1.5 KiB');
      expect(formatBytes(1000, { binary: true }), 'below 1024 stays in bytes').toBe('1000 B');
      expect(formatBytes(1024 ** 3 * 5, { binary: true })).toBe('5 GiB');
      expect(formatBytes(1536, { locale: 'de-DE' })).toBe('1,5 kB');
      expect(formatBytes(1536, { significantDigits: 3 })).toBe('1.54 kB');
      expect(formatBytes(123_456_789, { significantDigits: 2 })).toBe('120 MB');
    },
  },
  {
    group: 'Bytes',
    title: 'rounding carries into the next unit',
    run({ formatBytes }, { expect }) {
      expect(formatBytes(999_949)).toBe('999.9 kB');
      expect(formatBytes(999_950)).toBe('1 MB');
      expect(formatBytes(1023.96 * 1024, { binary: true })).toBe('1 MiB');
      expect(formatBytes(999_999, { significantDigits: 3 })).toBe('1 MB');
      expect(formatBytes(-999_950)).toBe('-1 MB');
    },
  },
  {
    group: 'Bytes',
    title: 'whole numbers and every unit size',
    run({ formatBytes }, { expect }) {
      expect(formatBytes(1536, { fractionDigits: 0 })).toBe('2 kB');
      expect(formatBytes(1.5e15)).toBe('1.5 PB');
      expect(formatBytes(2 ** 40, { binary: true })).toBe('1 TiB');
      expect(formatBytes(1023, { binary: true })).toBe('1023 B');
      expect(formatBytes(0.5), 'fractions of a byte').toBe('0.5 B');
      expect(formatBytes(1e24)).toBe('1 YB');
    },
  },
  {
    group: 'Parse durations',
    title: 'units, combinations and decimals',
    run({ parseDuration }, { expect }) {
      expect(parseDuration('2h 30m')).toBe(9_000_000);
      expect(parseDuration('1.5h')).toBe(5_400_000);
      expect(parseDuration('1d2h')).toBe(93_600_000);
      expect(parseDuration('90 Seconds'), 'long names, any case').toBe(90_000);
      expect(parseDuration('2 weeks')).toBe(1_209_600_000);
      expect(parseDuration('1hr 1min 1sec 1msec')).toBe(3_661_001);
      expect(parseDuration('500'), 'bare number is milliseconds').toBe(500);
      expect(parseDuration('  .5s ')).toBe(500);
      expect(parseDuration('-1h 30m'), 'leading minus negates everything').toBe(-5_400_000);
      expect(parseDuration('3M'), 'M is minutes, case-insensitively').toBe(180_000);
    },
  },
  {
    group: 'Parse durations',
    title: 'malformed durations throw RangeError',
    run({ parseDuration }, { expect }) {
      for (const bad of ['', '   ', 'h', '2 fortnights', '1h 30', '1h-30m', '1..5h', 'abc', '-', '2h,30m']) {
        expect(thrown(() => parseDuration(bad)) instanceof RangeError, JSON.stringify(bad)).toBe(true);
      }
    },
  },
  {
    group: 'Format durations',
    title: 'compact form',
    run({ formatDuration }, { expect }) {
      expect(formatDuration(9_000_000)).toBe('2h 30m');
      expect(formatDuration(90_061_001)).toBe('1d 1h 1m 1s 1ms');
      expect(formatDuration(DAY + 5 * SEC)).toBe('1d 5s');
      expect(formatDuration(0)).toBe('0ms');
      expect(formatDuration(1999.6), 'rounded to whole milliseconds first').toBe('2s');
      expect(formatDuration(0.4)).toBe('0ms');
      expect(formatDuration(-9_000_000)).toBe('-2h 30m');
      expect(formatDuration(30 * DAY), 'no weeks or months').toBe('30d');
    },
  },
  {
    group: 'Format durations',
    title: 'long form, round trips and invalid numbers',
    run({ formatDuration, parseDuration, formatBytes }, { expect }) {
      expect(formatDuration(HOUR, { long: true })).toBe('1 hour');
      expect(formatDuration(-9_000_000, { long: true })).toBe('-2 hours 30 minutes');
      expect(formatDuration(DAY + MIN + 1, { long: true })).toBe('1 day 1 minute 1 millisecond');
      expect(formatDuration(0, { long: true })).toBe('0 milliseconds');
      for (const ms of [1, 999, 61_000, 9_000_000, 90_061_001, -3_600_001]) {
        expect(parseDuration(formatDuration(ms)), `round trip ${ms}`).toBe(ms);
        expect(parseDuration(formatDuration(ms, { long: true })), `long round trip ${ms}`).toBe(ms);
      }
      expect(thrown(() => formatDuration(NaN)) instanceof RangeError, 'NaN').toBe(true);
      expect(thrown(() => formatBytes(Infinity)) instanceof RangeError, 'Infinity bytes').toBe(true);
    },
  },
  {
    group: 'Relative time',
    title: 'picks the unit by threshold',
    run({ relativeTime }, { expect }) {
      expect(relativeTime(NOW + 44 * SEC, NOW)).toBe('in 44 seconds');
      expect(relativeTime(NOW + 45 * SEC, NOW)).toBe('in 1 minute');
      expect(relativeTime(NOW - 44 * MIN, NOW)).toBe('44 minutes ago');
      expect(relativeTime(NOW - 45 * MIN, NOW)).toBe('1 hour ago');
      expect(relativeTime(NOW - 90 * MIN, NOW), '1.5 hours rounds away from zero').toBe('2 hours ago');
      expect(relativeTime(NOW + 2 * HOUR, NOW)).toBe('in 2 hours');
      expect(relativeTime(NOW - 22 * HOUR, NOW)).toBe('1 day ago');
      expect(relativeTime(NOW - 3 * DAY, NOW)).toBe('3 days ago');
      expect(relativeTime(NOW - 26 * DAY, NOW)).toBe('1 month ago');
      expect(relativeTime(NOW - 60 * DAY, NOW)).toBe('2 months ago');
      expect(relativeTime(NOW + 320 * DAY, NOW)).toBe('in 1 year');
      expect(relativeTime(NOW - 400 * DAY, NOW)).toBe('1 year ago');
    },
  },
  {
    group: 'Relative time',
    title: 'Dates, locales and numeric: auto',
    run({ relativeTime }, { expect }) {
      expect(relativeTime(new Date(NOW - 3 * DAY), new Date(NOW)), 'Date objects').toBe('3 days ago');
      expect(relativeTime(NOW - DAY, NOW, { numeric: 'auto' })).toBe('yesterday');
      expect(relativeTime(NOW, NOW, { numeric: 'auto' })).toBe('now');
      expect(relativeTime(NOW, NOW)).toBe('in 0 seconds');
      expect(relativeTime(NOW + 3 * DAY, NOW, { locale: 'fi' })).toBe('3 päivän päästä');
      expect(relativeTime(NOW - 2 * HOUR, NOW, { locale: 'de' })).toBe('vor 2 Stunden');
      expect(thrown(() => relativeTime(new Date('nope'), NOW)) instanceof RangeError, 'invalid Date').toBe(true);
    },
  },
];
