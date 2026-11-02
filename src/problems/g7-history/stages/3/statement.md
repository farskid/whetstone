# Router history: blocking

Add navigation blocking, for "You have unsaved changes" prompts.

```ts
const unblock = h.block((tx) => {
  pending = tx;   // ask the user first
});
h.push('/next');  // blocked: nothing changes
pending.retry();  // user said yes: the push goes through
```

`block(blocker)` adds a blocker and returns a function that removes it. Before any navigation (push, replace or a `go` that would move), the blockers are asked in the order they were added:

- **Asking.** Each blocker is called with a transition `{ action, location, retry }`. `location` is where the navigation would go.
- **Allowing.** A blocker that returns `true` lets it through.
- **Blocking.** Any other return value stops the navigation right there. Later blockers aren't asked, and nothing changes.

`tx.retry()` means "the blocker that stopped this transition now approves". The navigation carries on from there:

- **Who is asked.** Only the blockers that haven't approved it yet are asked. Each one is checked against the blockers that exist **now**, so removed ones are skipped.
- **Stale transitions.** If any other navigation has been attempted since, even a blocked one, the transition is **stale**. `retry` then does nothing.
- **Already done.** Calling `retry` again after the navigation went through also does nothing.

Everything from earlier stages still applies.
