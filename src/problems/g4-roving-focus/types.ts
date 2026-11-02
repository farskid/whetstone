/** One option. Disabled items are never active. */
export interface ListItem {
  label: string;
  disabled?: boolean;
}

export interface Clock {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export interface ListboxOptions {
  items: ListItem[];
  clock: Clock;
  /** Arrow keys wrap around. Default false. */
  loop?: boolean;
  /** ms after the last character before the query resets. Default 500. */
  typeaheadTimeout?: number;
  /** Items moved by PageUp/PageDown. Default 10. */
  pageSize?: number;
}

export interface Listbox {
  /** Index of the active item, or -1 when every item is disabled. */
  readonly active: number;
  /** Returns true when the key was handled (the caller should preventDefault). */
  handleKey(key: string): boolean;
  /** Moves to an enabled item. Returns false (and does nothing) for a disabled one. */
  setActive(index: number): boolean;
}

export interface GridOptions {
  count: number;
  columns: number;
  /** Swap ArrowLeft and ArrowRight. Default false. */
  rtl?: boolean;
}

export interface Grid {
  /** Index of the active item, or -1 when `count` is 0. */
  readonly active: number;
  handleKey(key: string, mods?: { ctrlKey?: boolean }): boolean;
}
