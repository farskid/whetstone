Reject bad graphs before running anything.

If any of these checks fail, the promise rejects with an `Error` and **no task runs**:

- Duplicate ids. The message contains `Duplicate` and the id. <!-- tests: duplicate ids and unknown deps reject before anything runs -->
- A dep that isn't a task id. The message contains `Unknown` and the missing id. <!-- tests: duplicate ids and unknown deps reject before anything runs -->
- A cycle. The message is exactly `Cycle: a -> b -> c -> a`. To find it, run a depth-first search that visits tasks in input order and each task's deps in the order they're listed. Report the first cycle the search closes, starting and ending at the task that closes it. A cycle need not include the task the search started from (`top -> m -> n -> m` reports `Cycle: m -> n -> m`). A task that depends on itself is `Cycle: a -> a`. <!-- tests: cycles are reported with their path -->

Run the checks in that order: duplicates, then unknown deps, then cycles.
