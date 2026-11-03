# Keyboard shortcuts: sequences

Add `createKeybindings`, which runs handlers for key events. A shortcut can be a **sequence** like `'g i'`: press g, then i. Timeouts use an injected clock.

```ts
const keys = createKeybindings({ clock, platform: 'mac' });
keys.bind('$mod+K', openPalette);   // ⌘K on a Mac
keys.bind('g i', goToInbox);        // press g, then i, within 1 second
keys.handle({ key: 'k', metaKey: true }); // true: openPalette ran
```

```ts
interface Clock { setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void }
type Handler = (event: KeyEventLike) => void;
interface Keybindings {
  bind(shortcut: string, handler: Handler): () => void;
  handle(event: KeyEventLike): boolean;
}
createKeybindings(options: { clock: Clock; platform?: Platform; sequenceTimeout?: number }): Keybindings
```

Defaults: `platform = 'other'`, `sequenceTimeout = 1000`.

- **`bind(shortcut, handler)`** returns an `unbind` function. Calling `unbind` again does nothing. <!-- tests: bind, handle and unbind -->
- **`handle(event)`** returns `true` when the event was used: either a handler ran or a pending sequence advanced or started. Otherwise it returns `false`.

**Sequences.** Each key must arrive within `sequenceTimeout` ms of the previous one, or the pending sequence is dropped. Handlers receive the event that completed their shortcut. <!-- tests: sequence keys must arrive within the timeout -->

**A shortcut that is also a prefix.** Suppose both `'g'` and `'g i'` are bound. Pressing `g` must not fire `'g'` straight away. Instead:

- If the next key continues a longer sequence (`i`), that sequence proceeds and `'g'` never fires. <!-- tests: a shortcut that is also a sequence prefix waits -->
- If the timeout passes first, `'g'` fires, receiving the `g` event. <!-- tests: a shortcut that is also a sequence prefix waits -->
- If a key arrives that doesn't continue any sequence, `'g'` fires first. Then the new key is handled from scratch as if nothing was pending. <!-- tests: broken sequences restart cleanly; unbinding mid-sequence cancels -->

**Unbinding.** Unbinding a shortcut in the middle of a sequence removes it from the pending state. It won't fire later. <!-- tests: broken sequences restart cleanly; unbinding mid-sequence cancels -->

A key matches a step of a shortcut when `matches(event, step)` is true. You can assume each shortcut is bound at most once; conflicts come in a later stage.

Everything from earlier stages still applies.
