# Rule annotations

A stage's `statement.md` can link a rule (a list item, paragraph or table row) to the tests that pin it. After a run,
the rule turns green with ✓ when every linked test passed, and red with ✗ when any of them failed or timed out.
Otherwise it stays neutral: before a run, after switching stage, after resetting the code, or after a compile error. Hovering a rule lists its
tests.

## Syntax

Put an HTML comment at the end of the rule, naming tests by their exact title, separated by `|`:

```md
- Every call restarts the timer. <!-- tests: every call restarts the timer -->

| `get(key)` | marks as most recent | `undefined` when missing <!-- tests: set / get / has / delete basics | get() refreshes recency, peek() and has() do not --> |
```

In a table row, put the marker inside the last cell, before the closing `|`. The `|` inside the marker is safe: markers
are swapped for an anchor before the markdown is parsed.

The painted element is the nearest list item, else table row, else paragraph. A nested list item is its own rule, so
its parent's colour doesn't leak into it.

## Rules

- Only link a test that clearly pins the rule. Leave a rule unmarked when no test checks it, or when only a later
  stage's test does. Unmarked rules never get painted.
- `npm run verify` checks every marker. Each title must belong to a test of this problem that runs in that stage (its
  own stage or an earlier one). An empty marker fails too.
- `npm run verify:rules` opens F1 on stage 3 with the stage-1 code in a browser. It checks green, red and neutral
  rules, icons and tooltips in both themes, then that Reset returns them to neutral while keeping saved progress, and writes screenshots to `whetstone-rules-*.png`.

## Code

- `src/problems/ruleMarks.ts`: parsing (`parseRuleMarks`, `withRuleAnchors`) and `ruleStatus`.
- `src/ui/Markdown.tsx`: paints the anchors from the `results` prop.
- `src/ui/ProblemPage.tsx`: builds that map from the current run (it fills in live while tests run).
- `src/styles.css`: `.rule[data-rule-status]` colours, using the `--pass` and `--fail` theme tokens.

## Annotated so far

Every staged statement is annotated: A1–A8, B1–B8, C1–C8, D1–D11, E1–E8, F1–F8, G1–G9 and H1–H9. Full-problem mode
shows the root `statement.md`, which has no markers.

A rule is linked only when a test title clearly pins it, using tests from that stage or an earlier one. Rules that no
test pins stay neutral.

Unpinned rules in A1–A4, B1, E1, F1 and H1:

- A2 stage 4: aborting while `fn` is running.
- B1 stage 1: the `clear()` row. Only stage 3 tests `clear()`.
- B1 stage 3: `clear()` reporting already-expired entries as `'expire'`. The bullet is linked for its other parts.
- F1 stage 2: `leading: undefined` counting as false.
- H1 stage 2: a batch result that isn't a promise throwing `TypeError`. The bullet is linked for the rejected/throwing
  cases.
- H1 stage 3: `maxBatchSize` below 1 throwing `RangeError`. The bullet is linked for splitting.
- Most intro paragraphs.

The unpinned list items and table rows in the other problems are listed per problem and stage in
`docs/rules-uncovered.md`.
