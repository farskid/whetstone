export interface GroupOptions {
  ttl?: number;
  staleAfter?: number;
  clock?: { now(): number };
}
