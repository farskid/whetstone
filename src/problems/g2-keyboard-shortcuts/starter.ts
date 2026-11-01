export type Platform = 'mac' | 'other';

export interface KeyEventLike {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  repeat?: boolean;
  target?: { tagName?: string; isContentEditable?: boolean } | null;
}

export interface Combo {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface BindOptions {
  scope?: string;
  allowInInputs?: boolean;
  allowRepeat?: boolean;
}

export type Handler = (event: KeyEventLike) => void;

export interface Keybindings {
  bind(shortcut: string, handler: Handler, options?: BindOptions): () => void;
  handle(event: KeyEventLike): boolean;
  pushScope(name: string): () => void;
}

export function parseCombo(text: string, platform: Platform = 'other'): Combo {
  throw new Error('Not implemented');
}

export function normalize(shortcut: string, platform: Platform = 'other'): string {
  throw new Error('Not implemented');
}

export function matches(event: KeyEventLike, combo: Combo): boolean {
  throw new Error('Not implemented');
}

export function createKeybindings(options: { clock: Clock; platform?: Platform; sequenceTimeout?: number }): Keybindings {
  throw new Error('Not implemented');
}
