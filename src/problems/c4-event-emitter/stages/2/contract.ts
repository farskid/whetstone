// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { Emitter } from './solution';

/**
 * @contract Emitter.off, Emitter.listenerCount
 * @change `off` and `listenerCount` take `'*'` too, for wildcard listeners.
 * Your `off` or `listenerCount` doesn't accept `'*'` yet: stage 2 types the name `(keyof E & string) | '*'`.
 */
export function wildcardOff(emitter: Emitter<{ data: [chunk: string] }>) {
  emitter.off('*', (_name: string) => {});
  return emitter.listenerCount('*');
}
