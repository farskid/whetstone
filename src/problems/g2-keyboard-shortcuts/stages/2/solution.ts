import type { Platform, KeyEventLike, Combo, Clock, Handler, Keybindings, KeybindingsOptions } from './types';

const MODIFIERS: Record<string, 'ctrl' | 'alt' | 'shift' | 'meta'> = {
  ctrl: 'ctrl', control: 'ctrl',
  alt: 'alt', option: 'alt', opt: 'alt',
  shift: 'shift',
  meta: 'meta', cmd: 'meta', command: 'meta', super: 'meta', win: 'meta',
};

const KEY_ALIASES: Record<string, string> = {
  esc: 'Escape', escape: 'Escape',
  enter: 'Enter', return: 'Enter',
  space: ' ', spacebar: ' ',
  up: 'ArrowUp', arrowup: 'ArrowUp',
  down: 'ArrowDown', arrowdown: 'ArrowDown',
  left: 'ArrowLeft', arrowleft: 'ArrowLeft',
  right: 'ArrowRight', arrowright: 'ArrowRight',
  del: 'Delete', delete: 'Delete',
  backspace: 'Backspace',
  tab: 'Tab',
  plus: '+',
};

export function parseCombo(text: string, platform: Platform = 'other'): Combo {
  let keyPart: string;
  let modPart: string;
  if (text.endsWith('++')) {
    keyPart = '+';
    modPart = text.slice(0, -2);
  } else if (text === '+') {
    keyPart = '+';
    modPart = '';
  } else {
    const i = text.lastIndexOf('+');
    keyPart = text.slice(i + 1);
    modPart = i < 0 ? '' : text.slice(0, i);
  }
  if (!keyPart) throw new Error(`Missing key in "${text}"`);
  const combo: Combo = { key: '', ctrl: false, alt: false, shift: false, meta: false };
  if (text.length > keyPart.length) {
    for (const raw of modPart.split('+')) {
      const name = raw.trim().toLowerCase();
      if (name === '$mod') combo[platform === 'mac' ? 'meta' : 'ctrl'] = true;
      else if (name in MODIFIERS) combo[MODIFIERS[name]] = true;
      else throw new Error(`Unknown modifier "${raw}" in "${text}"`);
    }
  }
  const alias = KEY_ALIASES[keyPart.toLowerCase()];
  combo.key = alias ?? (keyPart.length === 1 ? keyPart.toLowerCase() : keyPart);
  return combo;
}

function comboToString(c: Combo): string {
  const parts: string[] = [];
  if (c.ctrl) parts.push('Ctrl');
  if (c.alt) parts.push('Alt');
  if (c.shift) parts.push('Shift');
  if (c.meta) parts.push('Meta');
  parts.push(c.key === ' ' ? 'Space' : c.key);
  return parts.join('+');
}

/** Canonical form: modifiers in the order Ctrl, Alt, Shift, Meta; sequence steps joined by one space. */
export function normalize(shortcut: string, platform: Platform = 'other'): string {
  return parseSequence(shortcut, platform).map(comboToString).join(' ');
}

function parseSequence(shortcut: string, platform: Platform): Combo[] {
  const steps = shortcut.trim().split(/\s+/);
  if (!steps[0]) throw new Error('Empty shortcut');
  return steps.map((s) => parseCombo(s, platform));
}

function keyMatches(event: KeyEventLike, key: string): boolean {
  return event.key.toLowerCase() === key.toLowerCase();
}

export function matches(event: KeyEventLike, combo: Combo): boolean {
  if (!!event.ctrlKey !== combo.ctrl || !!event.altKey !== combo.alt || !!event.metaKey !== combo.meta) return false;
  const shiftFree = !combo.shift && combo.key.length === 1 && !/[a-z]/i.test(combo.key);
  if (!shiftFree && !!event.shiftKey !== combo.shift) return false;
  return keyMatches(event, combo.key);
}

interface Binding {
  steps: Combo[];
  handler: Handler;
}

interface Pending {
  pos: number;
  bindings: Binding[];
  complete: Binding | null;
  event: KeyEventLike;
  timer: number | undefined;
}

export function createKeybindings(options: KeybindingsOptions): Keybindings {
  const { clock, platform = 'other', sequenceTimeout = 1000 } = options;
  const bindings: Binding[] = [];
  let pending: Pending | null = null;

  function clearPending() {
    if (pending && pending.timer !== undefined) clock.clearTimeout(pending.timer);
    pending = null;
  }

  function resolve(cands: Binding[], pos: number, event: KeyEventLike): boolean {
    if (!cands.length) return false;
    const complete = cands.find((b) => b.steps.length === pos) ?? null;
    const longer = cands.filter((b) => b.steps.length > pos);
    if (!longer.length) {
      complete!.handler(event);
      return true;
    }
    const state: Pending = { pos, bindings: longer, complete, event, timer: undefined };
    state.timer = clock.setTimeout(() => {
      if (pending !== state) return;
      pending = null;
      if (state.complete && bindings.includes(state.complete)) state.complete.handler(state.event);
    }, sequenceTimeout);
    pending = state;
    return true;
  }

  function start(event: KeyEventLike): boolean {
    const cands = bindings.filter((b) => matches(event, b.steps[0]));
    return resolve(cands, 1, event);
  }

  return {
    bind(shortcut, handler) {
      const steps = parseSequence(shortcut, platform);
      const binding: Binding = { steps, handler };
      bindings.push(binding);
      return () => {
        const i = bindings.indexOf(binding);
        if (i < 0) return;
        bindings.splice(i, 1);
        if (pending) {
          pending.bindings = pending.bindings.filter((b) => b !== binding);
          if (pending.complete === binding) pending.complete = null;
          if (!pending.bindings.length && !pending.complete) clearPending();
        }
      };
    },

    handle(event) {
      if (pending) {
        const p = pending;
        const next = p.bindings.filter((b) => matches(event, b.steps[p.pos]));
        clearPending();
        if (next.length) return resolve(next, p.pos + 1, event);
        let fired = false;
        if (p.complete && bindings.includes(p.complete)) {
          p.complete.handler(p.event);
          fired = true;
        }
        return start(event) || fired;
      }
      return start(event);
    },
  };
}
