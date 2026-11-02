/** Half-open: start is in, end is out. A range with end <= start is empty. */
export type Range = [start: number, end: number];

export interface Person {
  /** Times this person is booked. */
  busy: Range[];
  /** Times this person can be booked at all. */
  workingHours: Range[];
}
