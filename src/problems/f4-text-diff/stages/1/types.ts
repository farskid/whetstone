/** One run of the diff: `count` lines joined into `value`. */
export interface Change {
  value: string;
  count: number;
  added?: true;
  removed?: true;
}
