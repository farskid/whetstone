/** One option. Disabled items are never active. */
export interface ListItem {
  label: string;
  disabled?: boolean;
}

export interface ListboxOptions {
  items: ListItem[];
  /** Arrow keys wrap around. Default false. */
  loop?: boolean;
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
