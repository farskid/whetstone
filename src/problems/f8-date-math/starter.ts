import type { PlainDate, Weekday, DateInput, RecurrenceRule } from './types';

export function getDay(date: PlainDate): Weekday {
  throw new Error('Not implemented');
}

export function addDays(date: PlainDate, amount: number): PlainDate {
  throw new Error('Not implemented');
}

export function addMonths(date: PlainDate, amount: number): PlainDate {
  throw new Error('Not implemented');
}

export function startOfWeek(date: PlainDate, weekStartsOn: Weekday = 0): PlainDate {
  throw new Error('Not implemented');
}

/** The calendar date of an instant in a time zone. */
export function toPlainDate(instant: Date | number, timeZone: string = 'UTC'): PlainDate {
  throw new Error('Not implemented');
}

export function differenceInCalendarDays(a: DateInput, b: DateInput, timeZone: string = 'UTC'): number {
  throw new Error('Not implemented');
}

export function isSameDay(a: DateInput, b: DateInput, timeZone: string = 'UTC'): boolean {
  throw new Error('Not implemented');
}

export function addBusinessDays(date: PlainDate, amount: number, holidays: PlainDate[] = []): PlainDate {
  throw new Error('Not implemented');
}

export function differenceInBusinessDays(later: PlainDate, earlier: PlainDate, holidays: PlainDate[] = []): number {
  throw new Error('Not implemented');
}

export function expand(rule: RecurrenceRule, from: PlainDate, to: PlainDate): PlainDate[] {
  throw new Error('Not implemented');
}
