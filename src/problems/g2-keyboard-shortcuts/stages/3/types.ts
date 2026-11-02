/** 'mac' maps `$mod` to Meta; anything else maps it to Ctrl. */
export type Platform = 'mac' | 'other';

/** A plain object shaped like a `KeyboardEvent`. Missing modifier flags mean `false`. */
export interface KeyEventLike {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  repeat?: boolean;
  target?: { tagName?: string; isContentEditable?: boolean } | null;
}

/** A parsed combo. Single-character keys are lowercase. */
export interface Combo {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

export interface Clock {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export interface BindOptions {
  /** Default 'global'. */
  scope?: string;
  allowInInputs?: boolean;
  allowRepeat?: boolean;
}

/** Receives the event that completed the shortcut. */
export type Handler = (event: KeyEventLike) => void;

export interface Keybindings {
  /** Returns `unbind`. */
  bind(shortcut: string, handler: Handler, options?: BindOptions): () => void;
  /** `true` when a handler ran or a sequence started or advanced. */
  handle(event: KeyEventLike): boolean;
  /** Returns `pop`. */
  pushScope(name: string): () => void;
}
