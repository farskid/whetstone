/** 'mac' maps `$mod` to Meta; anything else maps it to Ctrl. */
export type Platform = 'mac' | 'other';

/** A plain object shaped like a `KeyboardEvent`. Missing modifier flags mean `false`. */
export interface KeyEventLike {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

/** A parsed combo. Single-character keys are lowercase. */
export interface Combo {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}
