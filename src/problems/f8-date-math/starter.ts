/** A calendar date with no time or zone: 'YYYY-MM-DD'. */
export type PlainDate = string;
/** 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** A plain date, or an instant (Date or epoch milliseconds). */
export type DateInput = PlainDate | Date | number;

export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly';
  start: PlainDate;
  interval?: number;
  byDay?: Weekday[];
  nth?: number;
  byMonthDay?: number;
  count?: number;
  until?: PlainDate;
  weekStartsOn?: Weekday;
}

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
