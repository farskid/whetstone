/** A calendar date with no time or zone: 'YYYY-MM-DD'. */
export type PlainDate = string;

/** 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A plain date, or an instant (Date or epoch milliseconds). */
export type DateInput = PlainDate | Date | number;

/** A recurrence rule for `expand`. */
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
