import type { TestCase } from '../../runner/types';
import type { KeyEventLike } from './types';
type M = typeof import('./solution');

const ev = (key: string, mods: Partial<KeyEventLike> = {}): KeyEventLike => ({ key, ...mods });

export const tests: TestCase<M>[] = [
  {
    group: 'Parse and match',
    title: 'parseCombo resolves modifier and key aliases',
    run({ parseCombo }, { expect }) {
      expect(parseCombo('Ctrl+Shift+K')).toEqual({ key: 'k', ctrl: true, alt: false, shift: true, meta: false });
      expect(parseCombo('cmd+option+esc')).toEqual({ key: 'Escape', ctrl: false, alt: true, shift: false, meta: true });
      expect(parseCombo('Control+Space').key).toBe(' ');
      expect(parseCombo('up').key).toBe('ArrowUp');
      expect(parseCombo('F5').key).toBe('F5');
      expect(parseCombo('KeyK').key, 'codes keep their case').toBe('KeyK');
      expect(parseCombo('Ctrl++')).toEqual({ key: '+', ctrl: true, alt: false, shift: false, meta: false });
      expect(parseCombo('+').key).toBe('+');
    },
  },
  {
    group: 'Parse and match',
    title: '$mod, canonical form and parse errors',
    run({ parseCombo, normalize }, { expect }) {
      expect(parseCombo('$mod+K', 'mac').meta).toBe(true);
      expect(parseCombo('$mod+K', 'mac').ctrl).toBe(false);
      expect(parseCombo('$mod+K').ctrl, 'other platforms').toBe(true);
      expect(normalize('cmd+shift+K', 'mac')).toBe('Shift+Meta+k');
      expect(normalize('shift+alt+ctrl+meta+x')).toBe('Ctrl+Alt+Shift+Meta+x');
      expect(normalize('$mod+k')).toBe('Ctrl+k');
      expect(normalize('  g   i ')).toBe('g i');
      expect(normalize('Shift+space')).toBe('Shift+Space');
      expect(() => parseCombo('Hyper+K'), 'unknown modifier').toThrow();
      expect(() => parseCombo('Ctrl+'), 'missing key').toThrow();
      expect(() => parseCombo('Ctrl++K'), 'empty modifier').toThrow();
      expect(() => normalize(''), 'empty shortcut').toThrow();
    },
  },
  {
    group: 'Parse and match',
    title: 'modifiers must match exactly; keys are case-insensitive',
    run({ parseCombo, matches }, { expect }) {
      const ctrlK = parseCombo('Ctrl+K');
      expect(matches(ev('k', { ctrlKey: true }), ctrlK)).toBe(true);
      expect(matches(ev('K', { ctrlKey: true }), ctrlK), 'caps lock').toBe(true);
      expect(matches(ev('k', { ctrlKey: true, shiftKey: true }), ctrlK), 'extra shift').toBe(false);
      expect(matches(ev('k', { ctrlKey: true, altKey: true }), ctrlK), 'extra alt').toBe(false);
      expect(matches(ev('k'), ctrlK), 'missing ctrl').toBe(false);
      expect(matches(ev('K', { shiftKey: true }), parseCombo('Shift+K'))).toBe(true);
      expect(matches(ev('K', { shiftKey: true }), parseCombo('k')), 'k does not fire on Shift+K').toBe(false);
      expect(matches(ev('Escape'), parseCombo('esc'))).toBe(true);
    },
  },
  {
    group: 'Parse and match',
    title: 'shifted punctuation like ? ignores Shift unless it is named',
    run({ parseCombo, matches }, { expect }) {
      expect(matches(ev('?', { shiftKey: true }), parseCombo('?'))).toBe(true);
      expect(matches(ev('?'), parseCombo('?')), 'layouts without shift').toBe(true);
      expect(matches(ev('?'), parseCombo('Shift+?'))).toBe(false);
      expect(matches(ev('?', { shiftKey: true }), parseCombo('Shift+?'))).toBe(true);
      expect(matches(ev('?', { shiftKey: true, ctrlKey: true }), parseCombo('?')), 'other modifiers still count').toBe(false);
      expect(matches(ev('+', { shiftKey: true }), parseCombo('plus'))).toBe(true);
    },
  },
  {
    group: 'Platforms and layouts',
    title: 'event.code bindings and non-Latin layouts',
    input: 'Russian: physical K gives "л"; Dvorak: physical V gives "k", physical K gives "t"',
    run({ parseCombo, matches }, { expect }) {
      const ctrlK = parseCombo('Ctrl+K');
      expect(matches(ev('л', { code: 'KeyK', ctrlKey: true }), ctrlK), 'Russian layout falls back to the physical key').toBe(true);
      expect(matches(ev('л', { code: 'KeyL', ctrlKey: true }), ctrlK)).toBe(false);
      expect(matches(ev('k', { code: 'KeyV', ctrlKey: true }), ctrlK), 'Dvorak: the typed character decides').toBe(true);
      expect(matches(ev('t', { code: 'KeyK', ctrlKey: true }), ctrlK), 'Dvorak: no fallback for ASCII').toBe(false);
      const byCode = parseCombo('Alt+KeyK');
      expect(matches(ev('˚', { code: 'KeyK', altKey: true }), byCode), 'code binding on macOS Option+K').toBe(true);
      expect(matches(ev('k', { code: 'KeyK', altKey: true }), parseCombo('Alt+keyk')), 'codes are exact').toBe(false);
    },
  },
  {
    group: 'Sequences',
    title: 'bind, handle and unbind',
    run({ createKeybindings }, { expect, clock }) {
      const c = clock();
      const keys = createKeybindings({ clock: c, platform: 'mac' });
      const got: string[] = [];
      const unbind = keys.bind('$mod+K', (e) => got.push(`palette:${e.key}`));
      expect(keys.handle(ev('k', { metaKey: true }))).toBe(true);
      expect(keys.handle(ev('k', { ctrlKey: true })), 'Ctrl+K on a Mac').toBe(false);
      expect(keys.handle(ev('x'))).toBe(false);
      unbind();
      unbind();
      expect(keys.handle(ev('k', { metaKey: true }))).toBe(false);
      expect(got).toEqual(['palette:k']);
    },
  },
  {
    group: 'Sequences',
    title: 'sequence keys must arrive within the timeout',
    run({ createKeybindings }, { expect, clock }) {
      const c = clock();
      const keys = createKeybindings({ clock: c });
      const got: string[] = [];
      keys.bind('g i', (e) => got.push(`inbox:${e.key}`));
      keys.bind('i', () => got.push('i'));
      expect(keys.handle(ev('g')), 'starting a sequence counts as handled').toBe(true);
      c.tick(999);
      expect(keys.handle(ev('i'))).toBe(true);
      expect(got).toEqual(['inbox:i']);
      keys.handle(ev('g'));
      c.tick(1000);
      keys.handle(ev('i'));
      expect(got, 'too slow: i is handled on its own').toEqual(['inbox:i', 'i']);
      const slow = createKeybindings({ clock: c, sequenceTimeout: 3000 });
      slow.bind('g i', () => got.push('slow'));
      slow.handle(ev('g'));
      c.tick(2500);
      slow.handle(ev('i'));
      expect(got[2]).toBe('slow');
    },
  },
  {
    group: 'Sequences',
    title: 'a shortcut that is also a sequence prefix waits',
    run({ createKeybindings }, { expect, clock }) {
      const c = clock();
      const keys = createKeybindings({ clock: c });
      const got: string[] = [];
      keys.bind('g', (e) => got.push(`g:${e.key}`));
      keys.bind('g i', () => got.push('g i'));
      keys.bind('x', () => got.push('x'));
      keys.handle(ev('g'));
      expect(got, 'nothing yet').toEqual([]);
      keys.handle(ev('i'));
      expect(got, 'the longer sequence wins').toEqual(['g i']);
      keys.handle(ev('g'));
      c.tick(1000);
      expect(got, 'timeout fires the short one with the g event').toEqual(['g i', 'g:g']);
      keys.handle(ev('g'));
      expect(keys.handle(ev('x'))).toBe(true);
      expect(got, 'a non-continuing key fires the short one, then is handled itself').toEqual(['g i', 'g:g', 'g:g', 'x']);
      c.tick(5000);
      expect(got).toHaveLength(4);
    },
  },
  {
    group: 'Sequences',
    title: 'broken sequences restart cleanly; unbinding mid-sequence cancels',
    run({ createKeybindings }, { expect, clock }) {
      const c = clock();
      const keys = createKeybindings({ clock: c });
      const got: string[] = [];
      keys.bind('g i', () => got.push('g i'));
      keys.bind('g g', () => got.push('g g'));
      keys.handle(ev('g'));
      expect(keys.handle(ev('z')), 'z continues nothing and is bound to nothing').toBe(false);
      keys.handle(ev('i'));
      expect(got, 'the sequence was dropped').toEqual([]);
      keys.handle(ev('g'));
      keys.handle(ev('g'));
      expect(got).toEqual(['g g']);
      const unbind = keys.bind('d d d', () => got.push('d d d'));
      keys.handle(ev('d'));
      keys.handle(ev('d'));
      unbind();
      expect(keys.handle(ev('d')), 'unbound mid-sequence').toBe(false);
      c.tick(2000);
      expect(got).toEqual(['g g']);
      const unbindShort = keys.bind('q', () => got.push('q'));
      keys.bind('q w', () => got.push('q w'));
      keys.handle(ev('q'));
      unbindShort();
      c.tick(1000);
      expect(got, 'the waiting short shortcut was unbound').toEqual(['g g']);
    },
  },
  {
    group: 'Scopes and inputs',
    title: 'the last pushed scope wins over global',
    run({ createKeybindings }, { expect, clock }) {
      const keys = createKeybindings({ clock: clock() });
      const got: string[] = [];
      keys.bind('Escape', () => got.push('global esc'));
      keys.bind('?', () => got.push('help'));
      keys.bind('esc', () => got.push('modal esc'), { scope: 'modal' });
      keys.bind('Enter', () => got.push('menu enter'), { scope: 'menu' });
      keys.handle(ev('Escape'));
      keys.handle(ev('Enter'));
      const popModal = keys.pushScope('modal');
      keys.handle(ev('Escape'));
      keys.handle(ev('?', { shiftKey: true }));
      const popMenu = keys.pushScope('menu');
      keys.handle(ev('Escape'));
      keys.handle(ev('Enter'));
      popModal();
      keys.handle(ev('Escape'));
      popMenu();
      popMenu();
      keys.handle(ev('Escape'));
      expect(got).toEqual(['global esc', 'modal esc', 'help', 'global esc', 'menu enter', 'global esc', 'global esc']);
    },
  },
  {
    group: 'Scopes and inputs',
    title: 'text fields, key repeat and lone modifiers',
    run({ createKeybindings }, { expect, clock }) {
      const c = clock();
      const keys = createKeybindings({ clock: c });
      const got: string[] = [];
      keys.bind('/', () => got.push('search'));
      keys.bind('$mod+Enter', () => got.push('submit'), { allowInInputs: true });
      keys.bind('j', () => got.push('down'), { allowRepeat: true });
      keys.bind('g i', () => got.push('g i'));
      expect(keys.handle(ev('/', { target: { tagName: 'input' } })), 'typing / in an input').toBe(false);
      keys.handle(ev('/', { target: { tagName: 'DIV', isContentEditable: true } }));
      keys.handle(ev('/', { target: { tagName: 'TEXTAREA' } }));
      keys.handle(ev('/', { target: { tagName: 'BUTTON' } }));
      keys.handle(ev('Enter', { ctrlKey: true, target: { tagName: 'TEXTAREA' } }));
      expect(keys.handle(ev('/', { repeat: true }))).toBe(false);
      keys.handle(ev('j', { repeat: true }));
      keys.handle(ev('g'));
      expect(keys.handle(ev('Shift', { shiftKey: true })), 'lone modifier').toBe(false);
      keys.handle(ev('i'));
      expect(got).toEqual(['search', 'submit', 'down', 'g i']);
    },
  },
  {
    group: 'Platforms and layouts',
    title: 'conflicting bindings throw',
    run({ createKeybindings }, { expect, clock }) {
      const mac = createKeybindings({ clock: clock(), platform: 'mac' });
      const unbind = mac.bind('Cmd+K', () => {});
      expect(() => mac.bind('$mod+k', () => {}), 'same keys on a Mac').toThrow(/conflict/i);
      expect(() => mac.bind('meta+shift+k', () => {}), 'different modifiers').not.toThrow();
      expect(() => mac.bind('$mod+k', () => {}, { scope: 'modal' }), 'another scope').not.toThrow();
      unbind();
      expect(() => mac.bind('$mod+k', () => {}), 'free again after unbind').not.toThrow();
      const pc = createKeybindings({ clock: clock() });
      pc.bind('Cmd+K', () => {});
      expect(() => pc.bind('$mod+k', () => {}), 'Ctrl+K elsewhere').not.toThrow();
      pc.bind('g  i', () => {});
      expect(() => pc.bind('G I', () => {})).toThrow(/conflict/i);
      expect(() => pc.bind('g', () => {}), 'a prefix is not a conflict').not.toThrow();
    },
  },
];
