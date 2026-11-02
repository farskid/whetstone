# Roving focus: typeahead

Add typeahead: typing letters jumps to a matching item. The listbox now takes a `clock` for the reset timer, and `typeaheadTimeout = 500`.

```ts
const lb = createListbox({ items, clock, typeaheadTimeout: 500 });
lb.handleKey('b'); // jumps to the first enabled item starting with B, after the active one
```

```ts
interface Clock { setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void }
```

Any other key that is a single character takes part in typeahead:

1. **Build the query.** Append the character, lowercased, to the query. The query resets to empty `typeaheadTimeout` ms after the **last** character.
2. **Choose the search string.** If the query is one character repeated, as in `'a'` or `'aaa'`, the search string is that single character. Otherwise it is the whole query.
3. **Search.** Look for the first enabled item whose lowercased label starts with the search string. The search **always wraps** around the end of the list, whatever `loop` is set to.
   - For a one-character search, start at the item **after** the active one. Pressing `b` repeatedly cycles through the items that start with B.
   - For a longer search, start **at** the active item. Typing `br` after `b` stays on "Brazil" instead of skipping it.
4. **No match.** If nothing matches, the active item doesn't change.

**Space.** A space (`' '`) is part of typeahead only while a query is in progress. Typing `new y` should find "New York". On its own, a space returns `false`, so the caller can use it to select.

Typeahead keys return `true`. Keys that are neither navigation nor single characters, like `'Tab'` and `'Enter'`, return `false`.

When every item is disabled, single characters still return `true` but nothing moves.

Everything from earlier stages still applies.
