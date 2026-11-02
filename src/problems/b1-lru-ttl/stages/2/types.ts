export interface Options {
  max: number;
  ttl?: number;
  clock?: { now(): number };
}
