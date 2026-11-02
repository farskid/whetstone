# Keyboard shortcuts

Build the logic behind a shortcut library like **tinykeys**. You won't touch the DOM: events are plain objects shaped like `KeyboardEvent`.

This stage parses shortcut text and matches it against a single key event.

```ts
parseCombo('Ctrl+Shift+K');        // { key: 'k', ctrl: true, alt: false, shift: true, meta: false }
normalize('cmd+shift+K', 'mac');   // 'Shift+Meta+k'
matches({ key: 'k', ctrlKey: true }, parseCombo('Ctrl+K')); // true
```

```ts
type Platform = 'mac' | 'other';
interface KeyEventLike { key: string; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean; metaKey?: boolean }
interface Combo { key: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }

parseCombo(text: string, platform?: Platform): Combo
normalize(shortcut: string, platform?: Platform): string
matches(event: KeyEventLike, combo: Combo): boolean
```

A missing modifier flag on an event means `false`.

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
- **Key.** `event.key` must equal the combo key, case-insensitively, so `'Shift+K'` matches `key: 'K'`.
