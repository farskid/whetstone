export type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

export function allSettled<T>(inputs: Iterable<T | PromiseLike<T>>): Promise<SettledResult<T>[]> {
  throw new Error('Not implemented');
}
