Handle the edge cases.

Listeners are **snapshotted per dispatch**: each dispatch calls exactly the listeners that were subscribed when its reducer finished.
- A listener that unsubscribes another during a dispatch doesn't stop that one from being called this time.
- A listener added during a dispatch is first called on the next dispatch.

A listener may dispatch:
- The nested dispatch runs fully, notifying its own snapshot, before the outer dispatch continues with the rest of its listeners.
- Listeners always read the latest state through `getState()`.

**Reducers must be pure**

| Situation | Error message |
| --- | --- |
| `dispatch` called while a reducer runs | `Reducers may not dispatch actions` |
| `getState`, `subscribe` or an unsubscribe called while a reducer runs | an error (any message) |

**`replaceReducer(next)`** swaps the reducer and dispatches `{ type: ActionTypes.REPLACE }`.
