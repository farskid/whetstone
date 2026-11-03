import type { Platform, KeyEventLike, Combo, Clock, Keybindings, KeybindingsOptions } from './types';

export function parseCombo(text: string, platform: Platform = 'other'): Combo {
  throw new Error('Not implemented');
}

export function normalize(shortcut: string, platform: Platform = 'other'): string {
  throw new Error('Not implemented');
}

export function matches(event: KeyEventLike, combo: Combo): boolean {
  throw new Error('Not implemented');
}

export function createKeybindings(options: KeybindingsOptions): Keybindings {
  throw new Error('Not implemented');
}
