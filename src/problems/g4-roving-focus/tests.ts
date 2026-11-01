import type { TestCase } from '../../runner/types';
import type { ListItem } from './solution';
type M = typeof import('./solution');

function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}

const items = (...labels: string[]): ListItem[] =>
  labels.map((l) => (l.startsWith('!') ? { label: l.slice(1), disabled: true } : { label: l }));

const COUNTRIES = items('Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'Denmark');

export const tests: TestCase<M>[] = [
  {
    group: 'Arrow keys',
    title: 'arrows, Home and End without looping',
    run({ createListbox }, { expect, clock }) {
      const lb = createListbox({ items: items('a', 'b', 'c', 'd'), clock: clock() });
      expect(lb.active).toBe(0);
      expect(lb.handleKey('ArrowUp'), 'handled even when nothing moves').toBe(true);
      expect(lb.active).toBe(0);
      lb.handleKey('ArrowDown');
      lb.handleKey('ArrowDown');
      expect(lb.active).toBe(2);
      lb.handleKey('End');
      expect(lb.active).toBe(3);
      lb.handleKey('ArrowDown');
      expect(lb.active, 'no wrap by default').toBe(3);
      lb.handleKey('Home');
      expect(lb.active).toBe(0);
      expect(lb.handleKey('Tab')).toBe(false);
      expect(lb.handleKey('Enter')).toBe(false);
      expect(lb.handleKey(' '), 'space selects when no query is in progress').toBe(false);
    },
  },
  {
    group: 'Disabled items and looping',
    title: 'disabled items are skipped everywhere',
    run({ createListbox }, { expect, clock }) {
      const lb = createListbox({ items: items('!a', 'b', '!c', '!d', 'e', '!f'), clock: clock() });
      expect(lb.active, 'starts at the first enabled item').toBe(1);
      lb.handleKey('ArrowDown');
      expect(lb.active).toBe(4);
      lb.handleKey('ArrowDown');
      expect(lb.active, 'nothing enabled below').toBe(4);
      lb.handleKey('Home');
      expect(lb.active).toBe(1);
      lb.handleKey('End');
      expect(lb.active).toBe(4);
      expect(lb.setActive(2)).toBe(false);
      expect(lb.active).toBe(4);
      expect(lb.setActive(1)).toBe(true);
      expect(lb.active).toBe(1);
      expect(thrown(() => lb.setActive(6)) instanceof RangeError).toBe(true);
    },
  },
  {
    group: 'Disabled items and looping',
    title: 'loop wraps around, past disabled items',
    run({ createListbox }, { expect, clock }) {
      const lb = createListbox({ items: items('!a', 'b', 'c', 'd', '!e'), clock: clock(), loop: true });
      lb.handleKey('ArrowUp');
      expect(lb.active, 'from the first enabled item up to the last').toBe(3);
      lb.handleKey('ArrowDown');
      expect(lb.active).toBe(1);
      const one = createListbox({ items: items('!a', 'only', '!c'), clock: clock(), loop: true });
      one.handleKey('ArrowDown');
      expect(one.active, 'a single enabled item stays put').toBe(1);
    },
  },
  {
    group: 'Disabled items and looping',
    title: 'every item disabled',
    run({ createListbox }, { expect, clock }) {
      const lb = createListbox({ items: items('!a', '!b'), clock: clock(), loop: true });
      expect(lb.active).toBe(-1);
      for (const k of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'a']) lb.handleKey(k);
      expect(lb.active).toBe(-1);
      expect(lb.setActive(0)).toBe(false);
      expect(createListbox({ items: [], clock: clock() }).active, 'empty list').toBe(-1);
    },
  },
  {
    group: 'Disabled items and looping',
    title: 'PageDown and PageUp move by a page without looping',
    input: '30 items, pageSize 10; 12–14 and 25–29 disabled',
    run({ createListbox }, { expect, clock }) {
      const list: ListItem[] = Array.from({ length: 30 }, (_, i) => ({ label: `item ${i}`, disabled: (i >= 12 && i <= 14) || i >= 25 }));
      const lb = createListbox({ items: list, clock: clock(), loop: true });
      lb.handleKey('PageDown');
      expect(lb.active).toBe(10);
      lb.handleKey('PageDown');
      expect(lb.active, 'target 20 is enabled').toBe(20);
      lb.handleKey('PageDown');
      expect(lb.active, 'clamped to 29, the furthest enabled before it is 24').toBe(24);
      lb.handleKey('PageDown');
      expect(lb.active, 'no loop').toBe(24);
      lb.setActive(23);
      lb.handleKey('PageUp');
      expect(lb.active, 'target 13 is disabled: furthest enabled between is 15').toBe(15);
      lb.handleKey('PageUp');
      expect(lb.active).toBe(5);
      lb.handleKey('PageUp');
      expect(lb.active).toBe(0);
      const small = createListbox({ items: list, clock: clock(), pageSize: 3 });
      small.setActive(11);
      small.handleKey('PageDown');
      expect(small.active, '12–14 all disabled: next enabled beyond the target').toBe(15);
    },
  },
  {
    group: 'Typeahead',
    title: 'typing jumps to a matching label',
    run({ createListbox }, { expect, clock }) {
      const c = clock();
      const lb = createListbox({ items: COUNTRIES, clock: c });
      expect(lb.handleKey('c')).toBe(true);
      expect(lb.active).toBe(6);
      c.tick(600);
      lb.handleKey('B');
      expect(lb.active, 'case-insensitive').toBe(3);
      lb.handleKey('r');
      expect(lb.active, '"br"').toBe(4);
      lb.handleKey('a');
      expect(lb.active, '"bra" searches from the active item, so it stays').toBe(4);
      lb.handleKey('x');
      expect(lb.active, 'no match: stay').toBe(4);
      c.tick(600);
      lb.handleKey('d');
      expect(lb.active).toBe(8);
      const cars = createListbox({ items: items('Car', 'Card', 'Cart'), clock: c });
      cars.handleKey('c');
      cars.handleKey('a');
      cars.handleKey('r');
      expect(cars.active, '"c" moves to Card, then "ca" and "car" keep matching it').toBe(1);
    },
  },
  {
    group: 'Typeahead',
    title: 'repeating a character cycles through matches',
    run({ createListbox }, { expect, clock }) {
      const c = clock();
      const lb = createListbox({ items: COUNTRIES, clock: c });
      const seen: number[] = [];
      for (let i = 0; i < 4; i++) {
        lb.handleKey('a');
        seen.push(lb.active);
        c.tick(100);
      }
      expect(seen, 'Australia, Austria, Argentina, Australia').toEqual([1, 2, 0, 1]);
      c.tick(500);
      lb.handleKey('a');
      lb.handleKey('u');
      lb.handleKey('s');
      lb.handleKey('t');
      lb.handleKey('r');
      expect(lb.active, '"austr" from Australia').toBe(2);
    },
  },
  {
    group: 'Typeahead',
    title: 'typeahead always wraps and skips disabled items',
    run({ createListbox }, { expect, clock }) {
      const c = clock();
      const lb = createListbox({ items: items('Apple', 'Banana', '!Blueberry', 'Cherry', 'Bean'), clock: c });
      lb.setActive(3);
      lb.handleKey('b');
      expect(lb.active).toBe(4);
      c.tick(500);
      lb.handleKey('b');
      expect(lb.active, 'wraps without loop, skipping the disabled Blueberry').toBe(1);
      c.tick(500);
      lb.handleKey('b');
      lb.handleKey('l');
      expect(lb.active, '"b" moved on to Bean; the only "bl" item is disabled').toBe(4);
    },
  },
  {
    group: 'Typeahead',
    title: 'the query resets after the last keystroke',
    run({ createListbox }, { expect, clock }) {
      const c = clock();
      const lb = createListbox({ items: items('New Delhi', 'New York', 'Nairobi', 'York'), clock: c, typeaheadTimeout: 1000 });
      for (const ch of 'new y') {
        lb.handleKey(ch);
        c.tick(900);
      }
      expect(lb.active, 'every key restarts the timer, and space joins a query in progress').toBe(1);
      c.tick(100);
      lb.handleKey('y');
      expect(lb.active, 'query was reset: "y" alone').toBe(3);
      c.tick(999);
      lb.handleKey('n');
      expect(lb.active, '"yn" matches nothing').toBe(3);
      c.tick(1000);
      lb.handleKey('n');
      expect(lb.active, '"n" after York wraps to New Delhi').toBe(0);
    },
  },
  {
    group: 'Grid',
    title: 'arrows stay within rows; the ragged last row clamps',
    input: '10 items in 4 columns: rows 0–3, 4–7, 8–9',
    run({ createGrid }, { expect }) {
      const g = createGrid({ count: 10, columns: 4 });
      expect(g.active).toBe(0);
      g.handleKey('ArrowLeft');
      expect(g.active).toBe(0);
      g.handleKey('ArrowRight');
      g.handleKey('ArrowRight');
      g.handleKey('ArrowRight');
      g.handleKey('ArrowRight');
      expect(g.active, 'no wrap into the next row').toBe(3);
      g.handleKey('ArrowDown');
      expect(g.active).toBe(7);
      g.handleKey('ArrowDown');
      expect(g.active, 'column 3 does not exist in the last row').toBe(9);
      g.handleKey('ArrowDown');
      expect(g.active).toBe(9);
      g.handleKey('ArrowUp');
      expect(g.active).toBe(5);
      g.handleKey('ArrowUp');
      g.handleKey('ArrowUp');
      expect(g.active).toBe(1);
      expect(g.handleKey('PageDown')).toBe(false);
    },
  },
  {
    group: 'Grid',
    title: 'Home and End, with and without Ctrl',
    run({ createGrid }, { expect }) {
      const g = createGrid({ count: 10, columns: 4 });
      g.handleKey('ArrowDown');
      g.handleKey('ArrowRight');
      expect(g.active).toBe(5);
      g.handleKey('End');
      expect(g.active).toBe(7);
      g.handleKey('Home');
      expect(g.active).toBe(4);
      g.handleKey('End', { ctrlKey: true });
      expect(g.active).toBe(9);
      g.handleKey('Home');
      expect(g.active).toBe(8);
      g.handleKey('End');
      expect(g.active, 'end of the short row').toBe(9);
      g.handleKey('Home', { ctrlKey: true });
      expect(g.active).toBe(0);
      expect(createGrid({ count: 0, columns: 3 }).active).toBe(-1);
    },
  },
  {
    group: 'Grid',
    title: 'RTL swaps left and right only',
    run({ createGrid }, { expect }) {
      const g = createGrid({ count: 6, columns: 3, rtl: true });
      g.handleKey('ArrowRight');
      expect(g.active, 'item 0 is at the right edge in RTL').toBe(0);
      g.handleKey('ArrowLeft');
      g.handleKey('ArrowLeft');
      expect(g.active).toBe(2);
      g.handleKey('ArrowLeft');
      expect(g.active).toBe(2);
      g.handleKey('ArrowDown');
      expect(g.active).toBe(5);
      g.handleKey('ArrowRight');
      expect(g.active).toBe(4);
      g.handleKey('Home');
      expect(g.active, 'Home is still the first item of the row').toBe(3);
    },
  },
];
