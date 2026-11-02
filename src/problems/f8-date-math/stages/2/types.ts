/** A calendar date with no time or zone: 'YYYY-MM-DD'. */
export type PlainDate = string;

/** 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A plain date, or an instant (Date or epoch milliseconds). */
export type DateInput = PlainDate | Date | number;
