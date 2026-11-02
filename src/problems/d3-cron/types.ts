/** A parsed expression: each field as a sorted, de-duplicated set. */
export interface CronSchedule {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  /** 0 = Sunday. */
  dayOfWeek: number[];
  /** True when the day-of-month text does not start with `*`. */
  domRestricted: boolean;
  /** True when the day-of-week text does not start with `*`. */
  dowRestricted: boolean;
}

export interface NextOptions {
  /** IANA time zone the fields are in; defaults to UTC. */
  tz?: string;
}
