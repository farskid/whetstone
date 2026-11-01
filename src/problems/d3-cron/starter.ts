export interface CronSchedule {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
  domRestricted: boolean;
  dowRestricted: boolean;
}
export interface NextOptions {
  tz?: string;
}

export function parseCron(expr: string): CronSchedule {
  throw new Error('Not implemented');
}

export function next(expr: string, from: Date, opts: NextOptions = {}): Date | null {
  throw new Error('Not implemented');
}

export function prev(expr: string, from: Date, opts: NextOptions = {}): Date | null {
  throw new Error('Not implemented');
}
