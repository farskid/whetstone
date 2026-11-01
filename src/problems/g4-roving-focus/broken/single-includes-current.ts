// Bug: single-character search includes the active item
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
  const { items, clock, loop = false, typeaheadTimeout = 500, pageSize = 10 } = options;
  const n = items.length;
  const enabled = (i: number) => i >= 0 && i < n && !items[i].disabled;
  let active = items.findIndex((it) => !it.disabled);
  let query = '';
  let timer: unknown = undefined;

  function scan(from: number, step: 1 | -1, wrap: boolean): number {
    for (let k = 0, i = from; k < n; k++, i += step) {
      if (i < 0 || i >= n) {
        if (!wrap) return -1;
        i = (i + n) % n;
      }
      if (enabled(i)) return i;
    }
    return -1;
  }

  function move(to: number): boolean {
    if (to >= 0) active = to;
    return true;
  }

  function page(dir: 1 | -1): boolean {
    const target = Math.min(n - 1, Math.max(0, active + dir * pageSize));
    for (let i = target; i !== active; i -= dir) if (enabled(i)) return move(i);
    return move(scan(target + dir, dir, false));
  }

  function typeahead(ch: string): boolean {
    clock.clearTimeout(timer);
    timer = clock.setTimeout(() => (query = ''), typeaheadTimeout);
    query += ch.toLowerCase();
    const repeated = [...query].every((c) => c === query[0]);
    const search = repeated ? query[0] : query;
    const start = Math.max(active, 0);
    for (let k = 0; k < n; k++) {
      const i = (start + k) % n;
      if (enabled(i) && items[i].label.toLowerCase().startsWith(search)) return move(i);
    }
    return true;
  }

  return {
    get active() {
      return active;
    },
    setActive(index) {
      if (!Number.isInteger(index) || index < 0 || index >= n) throw new RangeError(`index ${index} is out of range`);
      if (!enabled(index)) return false;
      active = index;
      return true;
    },
    handleKey(key) {
      if (active < 0) return ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'].includes(key) || key.length === 1;
      switch (key) {
        case 'ArrowDown':
          return move(scan(active + 1, 1, loop));
        case 'ArrowUp':
          return move(scan(active - 1, -1, loop));
        case 'Home':
          return move(scan(0, 1, false));
        case 'End':
          return move(scan(n - 1, -1, false));
        case 'PageDown':
          return page(1);
        case 'PageUp':
          return page(-1);
      }
      if ([...key].length !== 1) return false;
      if (key === ' ' && query === '') return false;
      return typeahead(key);
    },
  };
}

export function createGrid(options: GridOptions): Grid {
  const { count, columns, rtl = false } = options;
  if (!Number.isInteger(columns) || columns < 1) throw new RangeError('columns must be a positive integer');
  let active = count > 0 ? 0 : -1;
  return {
    get active() {
      return active;
    },
    handleKey(key, mods = {}) {
      if (active < 0) return false;
      const row = Math.floor(active / columns);
      const rowStart = row * columns;
      const rowEnd = Math.min(rowStart + columns, count) - 1;
      let horizontal = 0;
      switch (key) {
        case 'ArrowRight':
          horizontal = rtl ? -1 : 1;
          break;
        case 'ArrowLeft':
          horizontal = rtl ? 1 : -1;
          break;
        case 'ArrowDown':
          if (active + columns < count) active += columns;
          else if (rowEnd < count - 1) active = count - 1;
          return true;
        case 'ArrowUp':
          if (active - columns >= 0) active -= columns;
          return true;
        case 'Home':
          active = mods.ctrlKey ? 0 : rowStart;
          return true;
        case 'End':
          active = mods.ctrlKey ? count - 1 : rowEnd;
          return true;
        default:
          return false;
      }
      const to = active + horizontal;
      if (to >= rowStart && to <= rowEnd) active = to;
      return true;
    },
  };
}
