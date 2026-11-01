export interface ListItem {
  label: string;
  disabled?: boolean;
}

export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface ListboxOptions {
  items: ListItem[];
  clock: Clock;
  loop?: boolean;
  typeaheadTimeout?: number;
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
  rtl?: boolean;
}

export interface Grid {
  readonly active: number;
  handleKey(key: string, mods?: { ctrlKey?: boolean }): boolean;
}

export function createListbox(options: ListboxOptions): Listbox {
  throw new Error('Not implemented');
}

export function createGrid(options: GridOptions): Grid {
  throw new Error('Not implemented');
}
