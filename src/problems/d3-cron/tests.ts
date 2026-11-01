import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Parse fields';
const G2 = 'Ranges, steps, names';
const G3 = 'next() in UTC';
const G4 = 'Time zones and prev()';

const u = (s: string) => new Date(s);
const iso = (d: Date | null) => (d ? d.toISOString() : null);
const NY = { tz: 'America/New_York' };

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'stars, numbers and lists become sorted sets',
    run({ parseCron }, { expect }) {
      const s = parseCron('5,0,5 12 * 1,6 *');
      expect(s.minute).toEqual([0, 5]);
      expect(s.hour).toEqual([12]);
      expect(s.dayOfMonth).toHaveLength(31);
      expect(s.month).toEqual([1, 6]);
      expect(s.dayOfWeek).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect([s.domRestricted, s.dowRestricted]).toEqual([false, false]);
      expect(parseCron('  0   0 1 * 0 ').dayOfMonth).toEqual([1]);
    },
  },
  {
    group: G1,
    title: 'invalid expressions throw',
    run({ parseCron }, { expect }) {
      for (const bad of ['* * * *', '* * * * * *', '60 * * * *', '* 24 * * *', '* * 0 * *', '* * * 13 *', '* * * * 8', '5-1 * * * *', '*/0 * * * *', '* * * FOO *', '1-2-3 * * * *', 'a * * * *', '1,,2 * * * *']) {
        expect(() => parseCron(bad), bad).toThrow('Invalid cron expression');
      }
    },
  },
  {
    group: G2,
    title: 'ranges, steps and offset steps',
    run({ parseCron }, { expect }) {
      expect(parseCron('*/15 * * * *').minute).toEqual([0, 15, 30, 45]);
      expect(parseCron('1-30/7 * * * *').minute).toEqual([1, 8, 15, 22, 29]);
      expect(parseCron('50/4 * * * *').minute).toEqual([50, 54, 58]);
      expect(parseCron('0 9-11,20-23/2 * * *').hour).toEqual([9, 10, 11, 20, 22]);
      expect(parseCron('* * */10 * *').dayOfMonth).toEqual([1, 11, 21, 31]);
    },
  },
  {
    group: G2,
    title: 'names, weekday 7 and restriction flags',
    run({ parseCron }, { expect }) {
      const s = parseCron('0 0 1,15 jan-Mar,DEC mon-fri,7');
      expect(s.month).toEqual([1, 2, 3, 12]);
      expect(s.dayOfWeek).toEqual([0, 1, 2, 3, 4, 5]);
      expect([s.domRestricted, s.dowRestricted]).toEqual([true, true]);
      expect(parseCron('0 0 * * 5-7').dayOfWeek).toEqual([0, 5, 6]);
      expect(parseCron('0 0 * * SUN/2').dayOfWeek).toEqual([0, 2, 4, 6]);
      const t = parseCron('0 0 */2 * *');
      expect([t.domRestricted, t.dowRestricted]).toEqual([false, false]);
    },
  },
  {
    group: G3,
    title: 'next is strictly after from and lands on whole minutes',
    run({ next }, { expect }) {
      expect(iso(next('*/15 * * * *', u('2026-11-01T10:15:00Z')))).toBe('2026-11-01T10:30:00.000Z');
      expect(iso(next('*/15 * * * *', u('2026-11-01T10:14:59.999Z')))).toBe('2026-11-01T10:15:00.000Z');
      expect(iso(next('*/15 9-17 * * MON-FRI', u('2026-11-06T17:50:00Z')))).toBe('2026-11-09T09:00:00.000Z');
      expect(iso(next('59 23 31 12 *', u('2026-12-31T23:59:30Z')))).toBe('2027-12-31T23:59:00.000Z');
      expect(iso(next('0 0 1 JAN *', u('2026-06-15T08:00:00Z')))).toBe('2027-01-01T00:00:00.000Z');
    },
  },
  {
    group: G3,
    title: 'day-of-month OR day-of-week when both are restricted',
    run({ next }, { expect }) {
      expect(iso(next('0 12 13 * 5', u('2026-11-01T00:00:00Z'))), 'Friday Nov 6 comes before the 13th').toBe('2026-11-06T12:00:00.000Z');
      expect(iso(next('0 12 13 * */1', u('2026-11-01T00:00:00Z'))), 'a */ weekday is unrestricted, so AND').toBe('2026-11-13T12:00:00.000Z');
      expect(iso(next('0 12 * * 0', u('2026-11-01T12:00:00Z')))).toBe('2026-11-08T12:00:00.000Z');
      expect(iso(next('0 0 * * 7', u('2026-11-02T00:00:00Z'))), '7 is Sunday').toBe('2026-11-08T00:00:00.000Z');
    },
  },
  {
    group: G3,
    title: 'short months, leap days and impossible schedules',
    run({ next }, { expect }) {
      expect(iso(next('0 0 31 * *', u('2026-04-01T00:00:00Z')))).toBe('2026-05-31T00:00:00.000Z');
      expect(iso(next('0 0 29 2 *', u('2026-01-01T00:00:00Z')))).toBe('2028-02-29T00:00:00.000Z');
      expect(iso(next('0 0 29 2 *', u('2096-03-01T00:00:00Z'))), '2100 is not a leap year').toBe('2104-02-29T00:00:00.000Z');
      expect(next('0 0 30 2 *', u('2026-01-01T00:00:00Z'))).toBeNull();
      expect(iso(next('0 0 * FEB *', u('2027-01-31T12:00:00Z'))), 'jumping from Jan 31 lands in February').toBe('2027-02-01T00:00:00.000Z');
      expect(next('0 0 31 4,6,9,11 *', u('2026-01-01T00:00:00Z'))).toBeNull();
    },
  },
  {
    group: G4,
    title: 'prev searches backwards, strictly before from',
    run({ prev }, { expect }) {
      expect(iso(prev('0 0 * * 0', u('2026-11-01T00:00:00Z')))).toBe('2026-10-25T00:00:00.000Z');
      expect(iso(prev('*/15 * * * *', u('2026-11-01T10:15:00Z')))).toBe('2026-11-01T10:00:00.000Z');
      expect(iso(prev('*/15 * * * *', u('2026-11-01T10:15:30Z')))).toBe('2026-11-01T10:15:00.000Z');
      expect(iso(prev('0 0 31 * *', u('2026-05-01T00:00:00Z')))).toBe('2026-03-31T00:00:00.000Z');
      expect(iso(prev('0 0 29 2 *', u('2104-01-01T00:00:00Z')))).toBe('2096-02-29T00:00:00.000Z');
      expect(prev('0 0 30 2 *', u('2026-01-01T00:00:00Z'))).toBeNull();
    },
  },
  {
    group: G4,
    title: 'time zones: local fields, and a skipped local time never fires',
    run({ next, prev }, { expect }) {
      expect(iso(next('0 9 * * *', u('2026-11-01T00:00:00Z'), { tz: 'Europe/Helsinki' }))).toBe('2026-11-01T07:00:00.000Z');
      expect(iso(next('0 9 * * *', u('2026-07-01T00:00:00Z'), { tz: 'Europe/Helsinki' }))).toBe('2026-07-01T06:00:00.000Z');
      expect(iso(next('0 9 * * *', u('2026-11-01T00:00:00Z'), { tz: 'UTC' }))).toBe('2026-11-01T09:00:00.000Z');
      expect(iso(next('30 2 * * *', u('2026-03-07T12:00:00Z'), NY)), 'Mar 8 02:30 is in the gap').toBe('2026-03-09T06:30:00.000Z');
      expect(iso(prev('30 2 * * *', u('2026-03-09T12:00:00Z'), NY))).toBe('2026-03-09T06:30:00.000Z');
      expect(iso(prev('30 2 * * *', u('2026-03-09T06:00:00Z'), NY))).toBe('2026-03-07T07:30:00.000Z');
      expect(iso(next('*/30 * * * *', u('2026-03-08T06:45:00Z'), NY)), '01:45 EST, then 03:00 EDT').toBe('2026-03-08T07:00:00.000Z');
    },
  },
  {
    group: G4,
    title: 'a repeated local time fires once, at its first occurrence',
    run({ next, prev }, { expect }) {
      expect(iso(next('30 1 * * *', u('2026-11-01T04:00:00Z'), NY))).toBe('2026-11-01T05:30:00.000Z');
      expect(iso(next('30 1 * * *', u('2026-11-01T05:30:00Z'), NY)), 'not again at 01:30 EST').toBe('2026-11-02T06:30:00.000Z');
      expect(iso(next('0 * * * *', u('2026-11-01T05:30:00Z'), NY)), '01:00 already ran; next is 02:00 EST').toBe('2026-11-01T07:00:00.000Z');
      expect(iso(next('45 1 * * *', u('2026-11-01T06:10:00Z'), NY)), 'from inside the second 01:xx').toBe('2026-11-02T06:45:00.000Z');
      expect(iso(prev('30 1 * * *', u('2026-11-01T07:00:00Z'), NY))).toBe('2026-11-01T05:30:00.000Z');
      expect(iso(prev('30 1 * * *', u('2026-11-01T06:10:00Z'), NY)), 'from 01:10 EST back to 01:30 EDT').toBe('2026-11-01T05:30:00.000Z');
    },
  },
];
