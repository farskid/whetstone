// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createKeybindings } from './solution';
import type { KeybindingsOptions } from './types';

/**
 * @contract Keybindings.bind
 * @change `bind` takes a third `options` argument: `{ scope, allowInInputs, allowRepeat }`.
 * Your `bind` doesn't take `options` yet. Type it as `options?: BindOptions` (from `./types`).
 */
export function scopedBind(options: KeybindingsOptions) {
  createKeybindings(options).bind('Escape', () => {}, { scope: 'modal', allowInInputs: true, allowRepeat: false });
}
