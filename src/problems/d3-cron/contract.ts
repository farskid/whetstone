// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { next } from './solution';

/**
 * @contract next
 * @change `next` takes a third argument, `opts: NextOptions`, with the time zone.
 * Your `next` doesn't take options yet. Add `opts: NextOptions = {}` (from `./types`).
 */
export function inTimeZone(): Date | null {
  return next('0 9 * * *', new Date(0), { tz: 'Europe/Helsinki' });
}
