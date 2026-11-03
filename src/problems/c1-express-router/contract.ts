// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createRouter } from './solution';
import type { ErrorHandler } from './types';

/**
 * @contract Router.use
 * @change `use(pathOrFn: string | Handler, ...fns)` can mount handlers under a path prefix.
 * Your router's `use` doesn't take a path prefix yet: stage 2 adds `use(path, ...fns)`.
 */
export function mountUnderPath() {
  return createRouter().use('/api', (_req, _res, next) => next());
}
// @contract-skip Next: your router creates `next` and hands it to handlers; the tests check `next('route')`.

/**
 * @contract Router.use, Router.get, Router.post, Router.put, Router.delete, Router.all
 * @change `use`, `get`, `post`, `put`, `delete` and `all` take `Fn`: a `Handler` or a four-argument `ErrorHandler`.
 * Your router's methods don't accept an error handler `(err, req, res, next)` yet. Type the handlers `...fns: Fn[]` (from `./types`).
 */
export function errorHandlers(onError: ErrorHandler) {
  const router = createRouter();
  router.use(onError).use('/api', onError);
  router.get('/', onError).post('/', onError).put('/', onError).delete('/', onError).all('/', onError);
  return router;
}
