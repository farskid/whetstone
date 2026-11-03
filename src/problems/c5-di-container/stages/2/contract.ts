// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { Container } from './solution';

/**
 * @contract Token
 * @change `Token<T>` widens to `string | symbol | Ctor<T>`: a class is its own token.
 * Your `register` or `resolve` doesn't take a class as the token yet. Type it `token: Token<T>` (from `./types`).
 */
export class Service {}
export function classTokens(container: Container): Service {
  container.register(Service, { useClass: Service });
  return container.resolve(Service);
}
