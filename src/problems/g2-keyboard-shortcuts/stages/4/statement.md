# Keyboard shortcuts: platforms and layouts

Real keyboards vary. Add physical-key matching for non-US layouts, and reject conflicting bindings.

```ts
matches({ key: 'л', code: 'KeyK', ctrlKey: true }, parseCombo('Ctrl+K')); // true: Russian layout
keys.bind('Cmd+K', a);
keys.bind('$mod+k', b); // throws on a Mac: same shortcut
```

`KeyEventLike` gains `code?: string`, the physical key such as `'KeyK'`.

- **Key by code.** The key now also matches when `event.code` equals the combo key exactly, so `'KeyK'` matches the physical K key on any layout. `'keyk'` doesn't match `code: 'KeyK'`.
- **Non-Latin layouts.** A combo key that is a Latin letter `a`–`z` also matches `event.code === 'Key' + LETTER`, but only when `event.key` contains non-ASCII characters. On a Russian layout, `Ctrl+K` gives `key: 'л', code: 'KeyK'`, and that should match `Ctrl+K`. On Dvorak, `event.key` is ASCII, so the character typed decides.
- **Conflicts.** Binding a shortcut whose normalized form is already bound in the same scope throws. `'Cmd+K'` and `'$mod+k'` conflict on a Mac. Binding the same shortcut in different scopes is fine. The error message contains the word "conflict". A shortcut that is a prefix of another (`'g'` and `'g i'`) is not a conflict. After `unbind`, the shortcut can be bound again.

Everything from earlier stages still applies.
