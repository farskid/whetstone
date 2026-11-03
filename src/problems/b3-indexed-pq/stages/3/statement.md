Make ties predictable.

- **Stable ties.** Entries with equal priority (`compare` returns 0) come out in the order they were pushed. <!-- tests: equal priorities come out in push order -->
- An `update` counts as a fresh push for this purpose, so an updated entry goes behind existing entries of the same priority, even if its priority didn't change. <!-- tests: an updated item goes behind existing items with the same priority -->
- Hint: give each push or update an increasing sequence number and use it to break ties.
