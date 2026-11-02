/** One step of a path: an object key or an array index. */
export type PathKey = string | number;

/** One query result: the concrete path to a value, and the value. */
export interface Match {
  path: PathKey[];
  value: unknown;
}
