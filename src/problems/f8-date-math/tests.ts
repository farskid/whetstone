import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Calendar arithmetic';
const G2 = 'Time zones';
const G3 = 'Business days';
const G4 = 'Recurrence';

function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}

const at = (iso: string) => new Date(iso);
const XMAS = ['2026-12-24', '2026-12-25', '2026-12-26', '2026-12-31'];

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'addDays across months, years and leap days',
    run({ addDays, getDay }, { expect }) {
      expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
      expect(addDays('2023-02-28', 1)).toBe('2023-03-01');
      expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
      expect(addDays('2026-03-28', 2), 'DST weekend does not matter for plain dates').toBe('2026-03-30');
      expect(addDays('2026-11-01', 365)).toBe('2027-11-01');
      expect(addDays('2026-11-01', 0)).toBe('2026-11-01');
      expect(getDay('2026-11-01'), '1 Nov 2026 is a Sunday').toBe(0);
      expect(getDay('2000-02-29')).toBe(2);
    },
  },
  {
    group: G1,
    title: 'addMonths clamps to the end of the month',
    run({ addMonths }, { expect }) {
      expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
      expect(addMonths('2024-01-31', 1), 'leap year').toBe('2024-02-29');
      expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
      expect(addMonths('2026-10-31', 4)).toBe('2027-02-28');
      expect(addMonths('2026-05-15', -17)).toBe('2024-12-15');
      expect(addMonths('2024-02-29', 12)).toBe('2025-02-28');
      expect(addMonths('2026-01-31', 2), 'clamping is per call, not cumulative').toBe('2026-03-31');
      expect(addMonths(addMonths('2026-01-31', 1), 1)).toBe('2026-03-28');
    },
  },
  {
    group: G1,
    title: 'startOfWeek honours weekStartsOn',
    run({ startOfWeek }, { expect }) {
      expect(startOfWeek('2026-11-01'), 'a Sunday, default Sunday start').toBe('2026-11-01');
      expect(startOfWeek('2026-11-01', 1)).toBe('2026-10-26');
      expect(startOfWeek('2026-11-04', 1)).toBe('2026-11-02');
      expect(startOfWeek('2026-11-04', 6)).toBe('2026-10-31');
      expect(startOfWeek('2027-01-01', 1), 'across a year boundary').toBe('2026-12-28');
      expect(startOfWeek('2026-11-02', 1)).toBe('2026-11-02');
    },
  },
  {
    group: G1,
    title: 'invalid dates and amounts throw RangeError',
    run({ addDays, addMonths, getDay }, { expect }) {
      expect(thrown(() => addDays('2026-02-30', 1)) instanceof RangeError, '30 February').toBe(true);
      expect(thrown(() => addDays('2026-2-3', 1)) instanceof RangeError, 'missing zero padding').toBe(true);
      expect(thrown(() => getDay('tomorrow')) instanceof RangeError, 'not a date').toBe(true);
      expect(thrown(() => getDay('2023-02-29')) instanceof RangeError, 'not a leap year').toBe(true);
      expect(thrown(() => addDays('2026-01-01', 1.5)) instanceof RangeError, 'fractional days').toBe(true);
      expect(thrown(() => addMonths('2026-01-01', NaN)) instanceof RangeError, 'NaN months').toBe(true);
    },
  },
  {
    group: G2,
    title: 'toPlainDate gives the calendar date in a zone',
    run({ toPlainDate }, { expect }) {
      const t = at('2026-03-29T21:30:00Z');
      expect(toPlainDate(t), 'UTC by default').toBe('2026-03-29');
      expect(toPlainDate(t, 'Europe/Helsinki')).toBe('2026-03-30');
      expect(toPlainDate(t, 'America/New_York')).toBe('2026-03-29');
      expect(toPlainDate(t.getTime(), 'Asia/Tokyo'), 'epoch ms works too').toBe('2026-03-30');
      expect(toPlainDate(at('2026-01-01T04:59:59Z'), 'America/New_York')).toBe('2025-12-31');
    },
  },
  {
    group: G2,
    title: 'differenceInCalendarDays counts days, not 24-hour periods, across DST',
    input: 'Helsinki springs forward on 29 Mar 2026; New York falls back on 1 Nov 2026',
    run({ differenceInCalendarDays }, { expect }) {
      // 28 Mar 23:30 EET → 30 Mar 00:30 EEST is exactly 24 hours but two calendar days.
      expect(differenceInCalendarDays(at('2026-03-29T21:30:00Z'), at('2026-03-28T21:30:00Z'), 'Europe/Helsinki')).toBe(2);
      // 1 Nov 00:30 EDT → 1 Nov 23:30 EST is 24 hours but the same calendar day.
      expect(differenceInCalendarDays(at('2026-11-02T04:30:00Z'), at('2026-11-01T04:30:00Z'), 'America/New_York')).toBe(0);
      expect(differenceInCalendarDays(at('2026-11-01T04:30:00Z'), at('2026-11-02T04:30:00Z'), 'UTC')).toBe(-1);
      expect(differenceInCalendarDays('2026-12-25', '2026-11-01'), 'plain dates').toBe(54);
      expect(differenceInCalendarDays('2026-11-01', at('2026-11-01T23:30:00Z'), 'Europe/Helsinki'), 'plain date vs instant').toBe(-1);
    },
  },
  {
    group: G2,
    title: 'isSameDay depends on the zone',
    run({ isSameDay }, { expect }) {
      const a = at('2026-07-01T03:00:00Z');
      const b = at('2026-06-30T23:00:00Z');
      expect(isSameDay(a, b), 'UTC').toBe(false);
      expect(isSameDay(a, b, 'America/New_York')).toBe(true);
      expect(isSameDay(a, b, 'Europe/Helsinki')).toBe(true);
      const c = at('2026-07-01T20:30:00Z');
      const d = at('2026-07-01T22:00:00Z');
      expect(isSameDay(c, d)).toBe(true);
      expect(isSameDay(c, d, 'Europe/Helsinki'), '23:30 vs 01:00 next day').toBe(false);
      expect(isSameDay('2026-07-01', c, 'America/New_York')).toBe(true);
    },
  },
  {
    group: G3,
    title: 'addBusinessDays skips weekends in both directions',
    run({ addBusinessDays }, { expect }) {
      expect(addBusinessDays('2026-10-30', 1), 'Friday + 1').toBe('2026-11-02');
      expect(addBusinessDays('2026-10-30', 5)).toBe('2026-11-06');
      expect(addBusinessDays('2026-11-02', -1), 'Monday - 1').toBe('2026-10-30');
      expect(addBusinessDays('2026-10-31', 1), 'from a Saturday').toBe('2026-11-02');
      expect(addBusinessDays('2026-10-31', -1)).toBe('2026-10-30');
      expect(addBusinessDays('2026-10-31', 0), 'zero keeps the date').toBe('2026-10-31');
      expect(addBusinessDays('2026-11-02', 260)).toBe('2027-11-01');
    },
  },
  {
    group: G3,
    title: 'holidays are skipped; a weekend holiday changes nothing',
    run({ addBusinessDays, differenceInBusinessDays }, { expect }) {
      expect(addBusinessDays('2026-12-23', 1, XMAS)).toBe('2026-12-28');
      expect(addBusinessDays('2026-12-28', -1, XMAS)).toBe('2026-12-23');
      expect(addBusinessDays('2026-12-30', 1, XMAS)).toBe('2027-01-01');
      expect(differenceInBusinessDays('2026-12-31', '2026-12-01')).toBe(22);
      expect(differenceInBusinessDays('2026-12-31', '2026-12-01', XMAS)).toBe(19);
      expect(differenceInBusinessDays('2026-12-11', '2026-12-04', ['2026-12-06']), 'Sunday holiday').toBe(5);
    },
  },
  {
    group: G3,
    title: 'differenceInBusinessDays is signed and inverts addBusinessDays',
    run({ addBusinessDays, differenceInBusinessDays, addDays, getDay }, { expect }) {
      expect(differenceInBusinessDays('2026-11-02', '2026-10-30'), 'Fri → Mon').toBe(1);
      expect(differenceInBusinessDays('2026-10-30', '2026-11-02')).toBe(-1);
      expect(differenceInBusinessDays('2026-11-01', '2026-10-31'), 'Sat → Sun').toBe(0);
      expect(differenceInBusinessDays('2026-11-01', '2026-11-01')).toBe(0);
      let seed = 7;
      const rnd = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
      for (let i = 0; i < 60; i++) {
        let d = addDays('2026-01-01', rnd(700));
        while (getDay(d) === 0 || getDay(d) === 6 || XMAS.includes(d)) d = addDays(d, 1);
        const k = rnd(80) - 40;
        expect(differenceInBusinessDays(addBusinessDays(d, k, XMAS), d, XMAS), `${d} ${k}`).toBe(k);
      }
    },
  },
  {
    group: G4,
    title: 'weekly on Monday and Wednesday, with an interval',
    run({ expand }, { expect }) {
      const rule = { freq: 'weekly' as const, start: '2026-11-04', byDay: [1, 3] as (1 | 3)[] };
      expect(expand(rule, '2026-11-01', '2026-11-20')).toEqual(['2026-11-04', '2026-11-09', '2026-11-11', '2026-11-16', '2026-11-18']);
      expect(expand({ ...rule, interval: 2 }, '2026-11-01', '2026-12-10')).toEqual(['2026-11-04', '2026-11-16', '2026-11-18', '2026-11-30', '2026-12-02']);
      expect(expand({ freq: 'weekly', start: '2026-11-05' }, '2026-11-01', '2026-11-20'), "default: start's weekday").toEqual(['2026-11-05', '2026-11-12', '2026-11-19']);
      expect(expand(rule, '2026-12-08', '2026-12-08')).toEqual([]);
    },
  },
  {
    group: G4,
    title: 'weekStartsOn decides which days share a week',
    input: 'every 2 weeks on Sunday and Monday, starting Sunday 1 Nov 2026',
    run({ expand }, { expect }) {
      const rule = { freq: 'weekly' as const, start: '2026-11-01', byDay: [0, 1] as (0 | 1)[], interval: 2 };
      expect(expand(rule, '2026-11-01', '2026-11-30'), 'weeks start on Monday by default').toEqual(['2026-11-01', '2026-11-09', '2026-11-15', '2026-11-23', '2026-11-29']);
      expect(expand({ ...rule, weekStartsOn: 0 }, '2026-11-01', '2026-11-30')).toEqual(['2026-11-01', '2026-11-02', '2026-11-15', '2026-11-16', '2026-11-29', '2026-11-30']);
    },
  },
  {
    group: G4,
    title: 'monthly: nth weekday, last Friday, and day-of-month skipping',
    run({ expand }, { expect }) {
      expect(expand({ freq: 'monthly', start: '2026-01-01', byDay: [5], nth: -1, interval: 2 }, '2026-01-01', '2026-12-31'), 'last Friday every 2 months')
        .toEqual(['2026-01-30', '2026-03-27', '2026-05-29', '2026-07-31', '2026-09-25', '2026-11-27']);
      expect(expand({ freq: 'monthly', start: '2026-01-01', byDay: [4], nth: 5 }, '2026-01-01', '2026-06-30'), 'fifth Thursday only exists in some months')
        .toEqual(['2026-01-29', '2026-04-30']);
      expect(expand({ freq: 'monthly', start: '2026-11-01', byDay: [4, 2], nth: 1 }, '2026-11-01', '2026-12-31'), 'first Thursday and first Tuesday, in date order')
        .toEqual(['2026-11-03', '2026-11-05', '2026-12-01', '2026-12-03']);
      expect(expand({ freq: 'monthly', start: '2026-01-31' }, '2026-01-01', '2026-07-31'), 'months without a 31st are skipped')
        .toEqual(['2026-01-31', '2026-03-31', '2026-05-31', '2026-07-31']);
      expect(expand({ freq: 'monthly', start: '2026-01-15', byMonthDay: -1 }, '2026-01-01', '2026-04-30'))
        .toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    },
  },
  {
    group: G4,
    title: 'count is counted from start; until is inclusive; old rules stay fast',
    run({ expand }, { expect }) {
      expect(expand({ freq: 'monthly', start: '2026-01-31', byMonthDay: -1, count: 4 }, '2026-03-01', '2026-12-31')).toEqual(['2026-03-31', '2026-04-30']);
      expect(expand({ freq: 'daily', start: '2026-11-01', interval: 3, until: '2026-11-10' }, '2026-10-01', '2026-12-31')).toEqual(['2026-11-01', '2026-11-04', '2026-11-07', '2026-11-10']);
      expect(expand({ freq: 'daily', start: '2026-11-10' }, '2026-11-01', '2026-11-11'), 'nothing before start').toEqual(['2026-11-10', '2026-11-11']);
      const t0 = Date.now();
      expect(expand({ freq: 'daily', start: '1900-01-01', interval: 3 }, '2026-11-01', '2026-11-07')).toEqual(['2026-11-02', '2026-11-05']);
      expect(expand({ freq: 'weekly', start: '1900-01-01', byDay: [1, 3, 5] }, '2026-11-01', '2026-11-04')).toEqual(['2026-11-02', '2026-11-04']);
      expect(Date.now() - t0 < 1000, 'expanding from 1900 is fast').toBe(true);
    },
  },
];
