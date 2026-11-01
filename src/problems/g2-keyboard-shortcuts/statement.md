# Keyboard shortcuts

Build the logic behind a shortcut library like **tinykeys**. You won't touch the DOM: events are plain objects shaped like `KeyboardEvent`, and timeouts use an injected clock.

```ts
const keys = createKeybindings({ clock, platform: 'mac' });
keys.bind('$mod+K', openPalette);   // ⌘K on a Mac, Ctrl+K elsewhere
keys.bind('g i', goToInbox);        // press g, then i, within 1 second
keys.bind('?', showHelp);
keys.handle({ key: 'k', metaKey: true }); // true: openPalette ran
```

## `parseCombo(text, platform = 'other')`

- **Format.** A combo is zero or more modifiers followed by a key, all joined with `+`: `'Ctrl+Shift+K'`.
- **Result.** Return `{ key, ctrl, alt, shift, meta }`.
- **Modifiers.** These are case-insensitive:
  - `ctrl`/`control`
  - `alt`/`option`/`opt`
  - `shift`
  - `meta`/`cmd`/`command`/`super`/`win`
  - `$mod`, which means `meta` when `platform` is `'mac'` and `ctrl` otherwise.
- **Single-character keys.** These are lowercased: `'K'` becomes `'k'`.
- **Key aliases.** These are case-insensitive:

  | Alias | Key |
  | --- | --- |
  | `esc` | `Escape` |
  | `return` | `Enter` |
  | `space` | `' '` |
  | `up`, `down`, `left`, `right` | `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` |
  | `del` | `Delete` |
  | `plus` | `+` |

  The full names (`escape`, `enter`, `arrowup`, `delete`, `backspace`, `tab`) are case-insensitive too.
- **Other keys.** Any other multi-character key is kept exactly as written: `'F5'`, `'PageDown'`, `'KeyK'`.
- **The `+` key.** `'Ctrl++'` and `'+'` bind the `+` key itself.
- **Errors.** Throw for an unknown modifier, an empty modifier, or a missing key: `'Hyper+K'`, `'Ctrl++K'`, `'Ctrl+'`, `''`.

## `normalize(shortcut, platform = 'other')`

A shortcut is one combo, or a **sequence** of combos separated by whitespace, like `'g i'`. `normalize` returns its canonical form:

- Modifiers come in the order `Ctrl`, `Alt`, `Shift`, `Meta`, joined by `+`, followed by the key.
- The space key is written as `Space`.
- Steps are separated by a single space.

```ts
normalize('cmd+shift+K', 'mac'); // 'Shift+Meta+k'
normalize('$mod+k');             // 'Ctrl+k'
normalize('g   i');              // 'g i'
```

## `matches(event, combo)`

- **Modifiers.** `ctrlKey`, `altKey`, `metaKey` and `shiftKey` must match the combo exactly, so `Ctrl+K` doesn't fire on `Ctrl+Shift+K`.
  - **Exception for shift.** If the combo's key is a single non-letter character and the combo doesn't name `shift`, then `shiftKey` is ignored. Typing `?` needs Shift on most layouts, but `'?'` should still match.
  - `'Shift+?'` requires Shift.
- **Key.** The key matches when either of these is true:
  - `event.key` equals the combo key, case-insensitively, so `'Shift+K'` matches `key: 'K'`;
  - `event.code` equals the combo key exactly, so `'KeyK'` matches the physical K key on any layout.
- **Non-Latin layouts.** A combo key that is a Latin letter `a`–`z` also matches `event.code === 'Key' + LETTER`, but only when `event.key` contains non-ASCII characters. On a Russian layout, `Ctrl+K` gives `key: 'л', code: 'KeyK'`, and that should match `Ctrl+K`. On Dvorak, `event.key` is ASCII, so the character typed decides.

## `createKeybindings({ clock, platform = 'other', sequenceTimeout = 1000 })`

- **`bind(shortcut, handler, { scope = 'global', allowInInputs, allowRepeat })`** returns an `unbind` function. Calling `unbind` again does nothing.
- **`handle(event)`** returns `true` when the event was used: either a handler ran or a pending sequence advanced or started. Otherwise it returns `false`.
- **`pushScope(name)`** returns a `pop` function. Pop functions may be called in any order.

**Sequences.** Each key must arrive within `sequenceTimeout` ms of the previous one, or the pending sequence is dropped. Handlers receive the event that completed their shortcut.

**A shortcut that is also a prefix.** Suppose both `'g'` and `'g i'` are bound. Pressing `g` must not fire `'g'` straight away. Instead:

- If the next key continues a longer sequence (`i`), that sequence proceeds and `'g'` never fires.
- If the timeout passes first, `'g'` fires, receiving the `g` event.
- If a key arrives that doesn't continue any sequence, `'g'` fires first. Then the new key is handled from scratch as if nothing was pending.

**Scopes.** The active scope is the most recently pushed one that hasn't been popped, or `'global'` when none is left. The active bindings are:

- the active scope's bindings;
- the `'global'` bindings, except any whose normalized shortcut is also bound in the active scope. The scope wins.

Bindings in other scopes are inactive.

**Ignored events.** These are ignored:

- **Text fields.** Events whose `target` is an `INPUT`, `TEXTAREA` or `SELECT` (by `tagName`, any case), or has `isContentEditable`, are ignored by bindings without `allowInInputs`.
- **Key repeats.** Events with `repeat: true` are ignored by bindings without `allowRepeat`.
- **Modifier keys on their own.** These are `Shift`, `Control`, `Alt`, `AltGraph`, `Meta`, `OS`, `CapsLock` and `Fn`. They are ignored entirely: they return `false` and don't break a pending sequence.

**Conflicts.** Binding a shortcut whose normalized form is already bound in the same scope throws. `'Cmd+K'` and `'$mod+k'` conflict on a Mac. Binding the same shortcut in different scopes is fine.

**Unbinding.** Unbinding a shortcut in the middle of a sequence removes it from the pending state. It won't fire later.
