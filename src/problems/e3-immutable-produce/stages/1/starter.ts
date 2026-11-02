import type { Recipe } from './types';

export function produce<T>(base: T, recipe: Recipe<T>): T {
  throw new Error('Not implemented');
}
