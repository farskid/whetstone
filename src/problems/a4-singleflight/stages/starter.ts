export class Group<T> {
  do(key: string | number, fn: () => T | Promise<T>): Promise<T> {
    throw new Error('Not implemented');
  }
}
