import type { PlainDate, Weekday } from './types';

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
