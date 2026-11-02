# Keyboard shortcuts: scopes and inputs

Add **scopes**, so a modal can override global shortcuts, and ignore events the user didn't mean as shortcuts.

```ts
keys.bind('Escape', closePanel);
keys.bind('Escape', closeModal, { scope: 'modal' });
const pop = keys.pushScope('modal'); // Escape now closes the modal
pop();
```

```ts
interface KeyEventLike {
  // ...as before, plus:
  repeat?: boolean;
  target?: { tagName?: string; isContentEditable?: boolean } | null;
}
interface BindOptions { scope?: string; allowInInputs?: boolean; allowRepeat?: boolean }

bind(shortcut: string, handler: Handler, options?: BindOptions): () => void; // scope defaults to 'global'
pushScope(name: string): () => void; // returns pop; pops may be called in any order, and twice
```

**Scopes.** The active scope is the most recently pushed one that hasn't been popped, or `'global'` when none is left. The active bindings are:

- the active scope's bindings;
- the `'global'` bindings, except any whose normalized shortcut is also bound in the active scope. The scope wins.

Bindings in other scopes are inactive.

**Ignored events.** These are ignored:

- **Text fields.** Events whose `target` is an `INPUT`, `TEXTAREA` or `SELECT` (by `tagName`, any case), or has `isContentEditable`, are ignored by bindings without `allowInInputs`.
- **Key repeats.** Events with `repeat: true` are ignored by bindings without `allowRepeat`.
- **Modifier keys on their own.** These are `Shift`, `Control`, `Alt`, `AltGraph`, `Meta`, `OS`, `CapsLock` and `Fn`. They are ignored entirely: they return `false` and don't break a pending sequence.

A pending sequence only continues through bindings that are active and not ignored for the new event.

Everything from earlier stages still applies.
