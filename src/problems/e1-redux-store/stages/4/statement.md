Handle the edge cases.

Listeners are **snapshotted per dispatch**: each dispatch calls exactly the listeners that were subscribed when its reducer finished. <!-- tests: listeners are snapshotted per dispatch -->
- A listener that unsubscribes another during a dispatch doesn't stop that one from being called this time. <!-- tests: listeners are snapshotted per dispatch -->
- A listener added during a dispatch is first called on the next dispatch. <!-- tests: listeners are snapshotted per dispatch -->

A listener may dispatch:
- The nested dispatch runs fully, notifying its own snapshot, before the outer dispatch continues with the rest of its listeners. <!-- tests: nested dispatch from a listener: inner snapshot first, latest state everywhere -->
- Listeners always read the latest state through `getState()`. <!-- tests: nested dispatch from a listener: inner snapshot first, latest state everywhere -->

**Reducers must be pure**

| Situation | Error message |
| --- | --- |
| `dispatch` called while a reducer runs | `Reducers may not dispatch actions` <!-- tests: reducers may not dispatch, read or subscribe --> |
| `getState`, `subscribe` or an unsubscribe called while a reducer runs | an error (any message) <!-- tests: reducers may not dispatch, read or subscribe --> |

**`replaceReducer(next)`** swaps the reducer and dispatches `{ type: ActionTypes.REPLACE }`. <!-- tests: replaceReducer dispatches REPLACE and keeps listeners -->
