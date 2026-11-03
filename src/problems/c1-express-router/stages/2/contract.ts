// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createRouter } from './solution';

/**
 * @contract Router.use
 * @change `use(pathOrFn: string | Handler, ...fns)` can mount handlers under a path prefix.
 * Your router's `use` doesn't take a path prefix yet: stage 2 adds `use(path, ...fns)`.
 */
export function mountUnderPath() {
  return createRouter().use('/api', (_req, _res, next) => next());
}
// @contract-skip Next: your router creates `next` and hands it to handlers; the tests check `next('route')`.
