// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { render } from './solution';

/**
 * @contract render
 * @change `render` takes a third argument, `options: RenderOptions`, with partials and helpers.
 * Your `render` doesn't take options yet. Add `options: RenderOptions = {}` (from `./types`).
 */
export function withPartials(): string {
  return render('{{> row}}', {}, { partials: { row: 'x' }, helpers: { up: (s) => String(s).toUpperCase() } });
}
