import type { ListboxOptions, Listbox } from './types';

export function createListbox(options: ListboxOptions): Listbox {
  const { items, loop = false, pageSize = 10 } = options;
  const n = items.length;
  const enabled = (i: number) => i >= 0 && i < n && !items[i].disabled;
  let active = items.findIndex((it) => !it.disabled);

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
      if (active < 0) return ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'].includes(key);
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
      return false;
    },
  };
}
