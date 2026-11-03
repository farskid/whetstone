# Uncovered rules

Rules in the staged statements of A5–A8, B2–B8, C1–C8, D1–D11, E2–E8, F2–F8, G1–G9 and H2–H9 that have no `<!-- tests: … -->` marker, because no test title clearly pins them. Generated from the statements; line numbers refer to each stage's statement.md.

Rules counted: 1603 (list items and table rows; sub-list intros and "Everything from earlier stages still applies" are skipped). Annotated: 956. Uncovered: 647. Statement files scanned: 236.

Note: D2 stage 3 lines 8 and 16 (the `||` union rule and the hyphen-range table row) are pinned by the test "hyphen ranges and || unions", but that title contains `|`, which the marker syntax uses as its separator, so it cannot be named in a marker. Renaming the test (or escaping `|` in markers) would let them be linked.

## A5 a5-channels

### Stage 3

- L12: `close()` sets `closed` to `true`. Calling it again does nothing.

## A6 a6-pmap

### Stage 1

- L25: If a mapper throws or rejects, reject with that error. (Stage 3 says more about errors.)

## A7 a7-locks

### Stage 2

- L23: `runExclusive(fn, w)` acquires `w`, runs `fn`, and releases even if `fn` throws.

### Stage 3

- L21: No `timeout` (or `timeout: undefined`) waits forever, as before. An acquire granted synchronously never starts a timer.
- L22: Use `options.clock` for the timers (default: the global `setTimeout` / `clearTimeout`).

## A8 a8-task-graph

### Stage 1

- L29: When several tasks become ready together, call their `run` in input-array order.
- L31: `run` may return a plain value or a promise. The task's result is the resolved value.
- L33: For this stage you may assume the input is valid (unique ids, known deps, no cycles) and that every task succeeds. Later stages handle the rest.

### Stage 3

- L22: The promise resolves when nothing is running any more.

## B2 b2-range-set

### Stage 1

- L22: Bounds can be any number, including `±Infinity`.

### Stage 3

- L13: An empty set returns the whole window; a fully covered window returns `[]`.

## B3 b3-indexed-pq

### Stage 1

- L26: `value` is whatever was passed to `push`, or `undefined` if it was omitted.
- L27: `push` and `pop` must be O(log n): use an array-backed binary heap, not a sorted array.
- L28: For now, ids are just carried along, and the order of equal priorities doesn't matter.

### Stage 3

- L5: Hint: give each push or update an increasing sequence number and use it to break ties.

## B4 b4-rolling-metrics

### Stage 1

- L25: A `size` that isn't a positive integer throws a `RangeError`.

### Stage 2

- L13: `p` outside `0..100` throws a `RangeError`, even on an empty window.

### Stage 3

- L19: Time comes from `clock.now()` (default `Date.now`).

### Stage 4

- L12: `buckets` are ascending upper bounds. A value goes in the first bucket with `x <= bound`, and values above the last bound go in an overflow bucket whose bound is `Infinity`.
- L13: Time is cut into slices: slice `k` covers `[k * sliceMs, (k + 1) * sliceMs)`. Each slice keeps only a count per bucket.
- L15: `count()` is the number of values in the live slices.
- L17: `NaN` throws a `RangeError`, as before.

## B5 b5-sorted-set

### Stage 1

- L26: A sorted array is fine for now. The last stage adds a performance test that needs O(log n) operations.

### Stage 2

- L14: Both return fresh `{ member, score }` objects.
- L16: `{ rev: true }` indexes the order backwards (index 0 is the highest). The reverse order is exactly the ascending order backwards, as in Redis, so among equal scores the name later in the alphabet comes first.

## B6 b6-piece-table

### Stage 1

- L4: Keep the original text and an append-only "add" buffer.
- L5: Describe the document as a list of pieces, each `(which buffer, start, length)`.
- L6: An edit splits or removes pieces and never rewrites text.

### Stage 2

- L19: Track line breaks per piece as you edit, so `lineCount` doesn't rescan the text. The last stage has timed tests.

### Stage 3

- L5: `positionAt` of an offset inside a break (on the `\r` of a `\r\n`, or between `\r` and `\n`) maps to the end of that line. `offsetAt` clamps `col` to the line's length without the `\r\n`.
- L7: If `offsetAt`'s `col` lands between the two halves of a surrogate pair, it moves back to the start of the pair.

## B7 b7-memoization

### Stage 3

- L9: Key the cache through nested `Map`s, one level per argument. No `JSON.stringify` or string keys.

### Stage 4

- L16: Object and function arguments go in a `WeakMap` level, so the cache alone doesn't keep them alive. (With `max` set, the recency list may hold them until they're evicted.) Everything else from stage 3 stays the same.
- L21: `recomputations()` counts combiner calls, and `resetRecomputations()` sets it back to 0.

## B8 b8-indexed-table

### Stage 1

- L32: A row matches when every field in the query matches. `{}` matches every row.
- L35: There are no indexes yet, so `where` looks at every row. `lastScanned` is the number of rows the last `where` looked at.

### Stage 2

- L14: Results are still in insertion order, whichever index was used.

### Stage 3

- L24: Indexes are sorted. `createIndex(['team', 'age'])` builds a compound index.

## C1 c1-express-router

### Stage 1

- L27: `handle` resolves when `res.end` is first called. If nobody ever ends the response, it never resolves.

### Stage 2

- L25: `handle` sets `req.originalUrl` to the incoming url, `req.baseUrl` to `''`, and `req.params` to `{}` if it isn't set. `originalUrl` never changes after that, and the 404 message uses its path.
- L34: A route with several handlers runs them in order through `next()`. After the last one, `next()` moves on to the next layer.

## C2 c2-hook-system

### Stage 3

- L21: Both resolve to `undefined`, and resolve right away with no taps. The taps for a call are fixed when it starts, as before.

## C3 c3-http-interceptors

### Stage 1

- L25: `request` works on a copy: `{ method: 'GET', ...config, headers: { ...config.headers } }`. It never mutates the caller's object.
- L30: `get(url, config)` and `post(url, body, config)` are shortcuts for `request({ ...config, url, method })`, with `body` for `post`.

### Stage 2

- L19: A step's `onFulfilled` gets the previous value and may return a new one, sync or async. A missing `onFulfilled` passes the value on.
- L27: Interceptors are read when `request` starts, so adding or ejecting doesn't affect requests already in flight.

### Stage 3

- L18: If `refresh()` rejects, the request rejects with the refresh error.

## C4 c4-event-emitter

### Stage 1

- L27: `listenerCount(name)` counts registrations (0 for an unknown event).
- L28: A throwing listener propagates out of `emit`, and the remaining listeners don't run.
- L29: `on` and `off` return the emitter, for chaining. The signatures should make `em.emit('data', 42)` a type error for the `Events` above; the tests check behaviour at runtime.

### Stage 2

- L22: `emit` returns `true` if any listener ran, wildcard listeners included.
- L23: `listenerCount(name)` doesn't count `*` listeners; `listenerCount('*')` counts them.

## C5 c5-di-container

### Stage 2

- L16: A provider has exactly one of `useValue`, `useFactory` or `useClass`. Otherwise `register` throws.
- L18: A class can be a token too. In messages its name is the class name.

### Stage 3

- L17: `'transient'` instances are built in the resolving container, so their dependencies are looked up from there.

### Stage 4

- L20: Names in messages are the class name, the string, or the symbol's description.
- L29: Calling `dispose` again does nothing. `resolve` after `dispose` throws.

## C6 c6-loader-chain

### Stage 1

- L29: In this stage loaders are synchronous. A throw rejects `runLoaders` with that error.

### Stage 2

- L20: the value it returns;

### Stage 3

- L19: **Read**: if nobody short-circuited, `await readResource(resource)` (exactly once).
- L20: **Normal**, right to left, as in stage 2.

## C7 c7-structured-logger

### Stage 1

- L34: An unknown level throws, both in `createLogger` and when setting `log.level`.
- L37: `log.info('msg')` logs just a message.
- L38: `log.info(obj, 'msg?')` merges `obj`'s own fields into the line.
- L40: A top-level field whose value is an `Error` (including that `err`) is written as `{ type: constructor name, message, stack }`. Other values go through `JSON.stringify` as they are.
- L44: `level` (the number) and `time` (from `now()`);
- L45: `base` fields;
- L46: the call's object fields;
- L47: `msg`, only if there is one.
- L51: Every line goes to every transport's `write`, in the order logged.
- L52: `write` may return a promise. `flush()` resolves once every line logged before the call has been written, meaning `write` has been called and any promise it returned has settled.

### Stage 2

- L16: `flush()` on any logger in the family waits for every line logged by the whole family before the call.

### Stage 3

- L17: `bigint` values become strings. Functions and `undefined` are dropped (in arrays they become `null`, as with `JSON.stringify`).
- L18: Objects with `toJSON` use it.
- L23: The default `err` serializer is `serializeError`, and a custom `err` serializer replaces it.

### Stage 4

- L14: Nothing is written during the log call.

## C8 c8-mini-bundler

### Stage 1

- L23: Bare specifiers (`'lodash'`) are not resolved.
- L27: A module's code is `files[id]`. A missing id throws `Could not load "<id>"`.
- L31: `chunks` has one chunk: `{ name: 'main', entry: <entry id>, isEntry: true, modules }`.
- L33: In this stage imports are never circular, and `cycles` is always `[]`.

### Stage 3

- L12: The module walk keeps a stack of the modules it is inside.
- L26: Then add `\nrequire("<entry id>");`.
- L27: The code ends with `\n`.

### Stage 4

- L15: After resolving a module's static imports, resolve its dynamic imports the same way. Then visit the static dependencies, then the dynamic ones, in order. Duplicates count once.
- L18: Chunk 0 is the entry chunk, named `main`, built as before (static imports only).
- L20: Targets are queued in the order they appear: walk the chunk's modules in order, and within each module its dynamic imports in order.
- L21: Chunks are then built in queue order.
- L22: A queued target that already belongs to a chunk by the time its turn comes produces no chunk.
- L24: If the owner is `main`, nothing is recorded, because main is always loaded.
- L26: Cycles found in any chunk's walk go in `cycles`.
- L27: Only the main chunk's code ends with `require(...)`. Every chunk's code still ends with `\n`.
- L30: Take the entry id without a leading `\0`.
- L31: Keep the last path segment and drop its extension.
- L32: Replace characters outside `[A-Za-z0-9_-]` with `_`.
- L33: If the name is taken, append 2, 3, …

## D1 d1-cli-args

### Stage 1

- L18: `--no-key` sets `key` to `false`.
- L20: `-x` follows the same rule as `--key`.
- L22: `-abc=v` sets `a` and `b` to `true` and `c` to `v`.

### Stage 2

- L23: Results are keyed by the option's name, never its alias.
- L27: `string`, `number` and `array` options take an inline `=value` or else the next token, unless that token is missing, flag-like or `--`. In that case the error is ``Missing value for --x``. So `--n -5` is fine.
- L28: A `number` value must match the number pattern, or the error is ``Invalid number for --x: <v>``. `string` values stay strings, even `'123'`.
- L29: `array` options collect every value (as strings) in order.
- L30: For other types, the last value wins.
- L32: Unknown flags give ``Unknown option: --colr``, or ``Unknown option: -q`` for a short flag (one error per unknown letter). The `=value` part is not included.
- L33: An option whose value was invalid counts as not given.

### Stage 3

- L16: Tokens after `--` are never commands.
- L18: Flags may appear before the subcommand (`-v remote add`), as long as they are available at that point.
- L19: The defaults and required checks after the loop use the options available at the final command, in that order.

### Stage 4

- L11: In both cases pick the nearest, and the earliest in definition order on ties (names before their aliases).
- L33: Start with two spaces.
- L34: Then the aliases (`-v` or `--long`), followed by `--name`, all joined with `, `. A one-letter name is shown as `-n`.
- L35: Then ` <type>` for non-booleans, or ` <string...>` for arrays.
- L36: Then ` description` if there is one.
- L37: Then ` (default: <JSON>)` if there is a default.
- L38: Then ` (required)` if the option is required.

## D2 d2-semver

### Stage 1

- L17: Numbers have no leading zeros.
- L22: Compare major, minor and patch numerically.
- L25: numbers are compared numerically;
- L26: numbers sort below strings;
- L27: strings are compared in ASCII order;
- L28: if all shared identifiers are equal, the shorter list is lower.

### Stage 2

- L19: | `>1.2` / `<=1.2` | `>=1.3.0` / `<1.3.0` (above / within everything `1.2` covers) |
- L21: | `~1` | `>=1.0.0 <2.0.0` |
- L25: | `^0.0` / `^0.0.x` | `>=0.0.0 <0.1.0` |
- L26: | `^0` / `^0.x` | `>=0.0.0 <1.0.0` |
- L28: Build metadata in the version is ignored, so `1.2.3+build` satisfies `=1.2.3`.
- L29: `satisfies` returns `false` (doesn't throw) if the version or the range is invalid. An empty range is invalid in this stage.
- L30: In this stage, neither the versions nor the ranges have prereleases.

### Stage 3

- L8: A range is now one or more comparator sets joined by `||`. A version satisfies the range if it satisfies any set. A set is the stage 2 list of comparators, ANDed.
- L9: A comparator **without** an operator may now be partial. It means everything it covers:
- L16: | `1.2 - 2.3.4` | `>=1.2.0 <=2.3.4`. A partial right side means everything it covers: `1.2.3 - 2.3` is `>=1.2.3 <2.4.0` |
- L18: The major part may now be `x`, `X` or `*` too (the rest is then ignored). With `<` or `>` that matches nothing; with any other operator it matches everything.
- L19: A hyphen range is a whole set: two operator-free versions separated by ` - ` (spaces around the hyphen). Anything else around it, like `>=1.0.0 - 2`, makes the range invalid.
- L21: Still no prereleases in this stage.

### Stage 4

- L12: Full versions inside ranges may carry a prerelease (`>=1.2.4-alpha`, `^1.2.3-rc.1`, `1.2.3-beta.2 - 1.2.3`), and they compare as in stage 1. Build metadata on them is ignored.
- L15: Versions without a prerelease are unaffected.
- L20: When two matches are equal (they differ only in build metadata), the earlier one wins.

## D3 d3-cron

### Stage 1

- L21: | minute | 0–59 |
- L22: | hour | 0–23 |
- L23: | day of month | 1–31 |
- L24: | month | 1–12 |
- L25: | day of week | 0–6 (0 is Sunday) |
- L29: A day field is *restricted* when its text does not start with `*`. `domRestricted` is for day of month, `dowRestricted` for day of week.

### Stage 2

- L13: Also throw `Invalid cron expression` for an unknown name, `a > b`, a step below 1, or anything malformed like `1-2-3`.

### Stage 3

- L10: Fields are read in UTC.
- L11: A minute matches when its minute, hour and month are in their sets and its day matches.
- L15: An invalid expression throws, as in `parseCron`.

### Stage 4

- L14: Without `tz` (or with `'UTC'`), fields are in UTC, as before.
- L15: With an IANA time zone, fields describe local wall-clock time there. Use `Intl.DateTimeFormat` to get offsets.
- L18: The result is still a real instant (`Date`), on a whole local minute.

## D4 d4-template-engine

### Stage 1

- L18: | `{{! anything }}` | comment, renders nothing |
- L20: Whitespace just inside a tag is ignored (`{{ name }}`).
- L21: Text outside tags is copied exactly, including newlines and spaces.
- L22: In this stage, templates are well-formed and use only these tags.
- L28: `undefined` and `null` render as `''`. Everything else renders with `String(v)`, so `0` → `'0'` and `false` → `'false'`.

### Stage 2

- L11: | `{{#name}}…{{/name}}` | section |
- L12: | `{{^name}}…{{/name}}` | inverted section |
- L20: The stage 1 own-property and forbidden-key rules still apply.
- L23: A value is *empty* if it's falsy or an empty array.
- L25: an empty value renders nothing;

### Stage 3

- L30: `"quoted"` or `'quoted'` strings (a backslash escapes the next character);
- L31: numbers (`-?\d+(\.\d+)?`);
- L32: anything else as a lookup.
- L35: A tag with several words whose first word isn't a helper throws ``TemplateError(`Unknown helper "<word>"`, …)`` when it's rendered.
- L36: Templates are still well-formed in this stage.

### Stage 4

- L13: ``Unclosed tag``: a `{{` (or `{{{`) without its closing braces;
- L14: ``Unclosed section "<name>"``: points at the opening tag of the innermost unclosed section;
- L15: ``Unexpected closing tag "<name>"``: the closing tag doesn't match the innermost open section, or nothing is open. Points at the closing tag.
- L16: Partial templates are parsed when they're first rendered.

## D5 d5-markdown-lite

### Stage 1

- L18: Rendered blocks are joined with `\n`, with no trailing newline. Empty input gives `''`.
- L19: Blank lines (only whitespace) separate blocks and produce nothing.
- L21: Block markers must start at column 0.
- L30: `#` (up to `######`) alone gives an empty heading.
- L34: A paragraph keeps consecutive non-blank lines until one starts a fence or a heading.
- L35: Each line is trimmed, and lines are joined with `\n`.
- L36: Output: `<p>text</p>`.

### Stage 2

- L10: **Backslash escapes:** `\` before an ASCII punctuation character produces that character literally (escaped). Any other `\` is literal.
- L13: With no closing run, the backticks are literal.
- L15: An opener must be followed by a non-space.
- L16: A closer must be preceded by a non-space.
- L17: A single-delimiter closer must be a run of exactly one.
- L21: Everything else is escaped text.

### Stage 3

- L9: Brackets in the text nest (a backslash-escaped bracket doesn't count), and the link needs `(` right after the closing `]`.
- L10: The URL runs to the first `)`. With no `)`, or a URL containing whitespace, it isn't a link and the `[` is literal text.
- L11: Render the text as inline content, without links inside links: `[outer [inner](a)](b)` links `outer [inner](a)` to `b`.
- L12: Backslash escapes work in the URL.
- L17: Otherwise the href is the URL as written (after backslash escapes). Relative URLs are fine.

### Stage 4

- L19: Strip `>` plus one optional space from each line.
- L20: Render the result as blocks: `<blockquote>\n…\n</blockquote>`.
- L27: `<li>inline</li>`, with the text trimmed;
- L28: `<li>inline\n…children…\n</li>` when the item has nested content.

## D6 d6-route-matching

### Stage 1

- L26: A route matches when the path has the same number of segments and every segment matches.
- L30: `match` returns `{ handler, params, pattern }`, where `pattern` is the string passed to `add`, or `null` if no route matches.
- L31: The method must equal the route's method exactly (methods are upper-case strings like `'GET'`).
- L32: In this stage, patterns are well-formed, each method and pattern is added once, and at most one route matches any request.

### Stage 2

- L13: With zero remaining segments, it's `''`. So `/files/*` matches `/files` with `{ '*': '' }`.
- L14: `*` only appears as the last segment.
- L25: A route only counts if its method matches, so backtracking also skips routes for other methods.
- L26: Two routes that differ only in param names at the same position (like `/u/:id` and `/u/:name/x`) are both "param" there; either may be tried first.

### Stage 3

- L17: A param name is `[A-Za-z_$][\w$]*`.
- L18: A constrained param and a plain param both rank as "param". At the same position, they're tried in registration order (params with the same constraint count as one, tried where the first was registered).
- L20: Patterns are still well-formed in this stage.

### Stage 4

- L20: Methods are case-insensitive on input: `add` and `match` upper-case them.
- L29: Encode values with `encodeURIComponent`. The `*` value is encoded per segment, so its slashes stay. A missing or empty `*` is dropped.
- L30: An optional param that is missing (or `''`) is dropped.
- L32: The result starts with `/`, and `buildPath('/', {})` is `'/'`.

## D7 d7-object-path

### Stage 1

- L19: `''` is the empty path.
- L22: `*` (as a dot segment) and `[*]` are reserved for a later `query` function: `get` throws for them.
- L25: Follows only own properties, so inherited ones like `toString` are missing.
- L28: The empty path returns `obj`.

### Stage 2

- L13: Mutates `obj`, writes `value` at the path and returns `obj`.
- L17: Has the same semantics, but never mutates.
- L21: Throw an `Error` for the empty path, and (as in `get`) for malformed paths and wildcards.

### Stage 3

- L12: `query` starts from `[{ path: [], value: obj }]` and applies each segment to every current match, in order.
- L15: The empty path gives `[{ path: [], value: obj }]`. Malformed paths throw.

### Stage 4

- L8: `[?(expr)]` expands like `*`, but keeps only the children for which `expr` is true. Only `query` accepts it.
- L9: A filter's parentheses may nest, and quoted strings inside it may contain `)` or `]`.
- L12: `@` is the child being tested. `@.a.b`, `@[0]` and `@['x y']` read from it the way `get` does, so a missing value is `undefined`.
- L13: Literals are numbers (`-?\d+(\.\d+)?`), `"strings"` / `'strings'` (a backslash escapes the next character), `true`, `false` and `null`.
- L19: A malformed expression (`@.price >`, unknown words, unbalanced parentheses) throws an `Error`.

## D8 d8-spreadsheet

### Stage 1

- L24: `set(address, input)` stores a cell's input.
- L25: `get(address)` returns the cell's current value, or `null` for an empty cell. A formula's value always reflects the current inputs of the cells it references.
- L26: Addresses are column letters (`A`…`Z`, `AA`…) plus a row starting at 1. They're case-insensitive in the API and in formulas.
- L27: An invalid address passed to `set` or `get` throws `Invalid address: <address>`.
- L28: In this stage no formula refers to itself, directly or indirectly.
- L33: starting with `=`, it's a formula;
- L34: matching `-?\d+(\.\d+)?` (surrounding spaces allowed), it's a number;
- L35: empty or whitespace only, it clears the cell;
- L36: anything else is text.
- L39: Literals: numbers (`\d+(\.\d+)?`), `"strings"` (`""` escapes a quote), `TRUE` and `FALSE` (case-insensitive).
- L42: comparisons `= <> < > <= >=`
- L43: `&`
- L44: `+ -`
- L45: `* /`
- L46: unary `-` and `+`
- L47: All binary operators are left-associative, and parentheses group.
- L51: numbers are used as they are;
- L52: booleans become 1/0;
- L53: `null` becomes 0;
- L54: text gives `#VALUE!`.
- L56: numbers use `String(n)`;
- L57: booleans become `TRUE`/`FALSE`;
- L58: `null` becomes `""`.
- L60: `null` takes the other side's empty value (`0`, `""` or `FALSE`);
- L61: text compares case-insensitively;
- L62: values of different types order as number < text < boolean.
- L65: Errors are values: `{ error: code }`.
- L66: An operand that is an error makes the result that error, checking the left operand first. A reference to an error cell gives that error.
- L67: `x/0` gives `#DIV/0!`.
- L68: Any other name (like `NOPE`) gives `#NAME?`.
- L69: A formula that doesn't parse gives `#ERROR!`. That includes references like `A0`, and (in this stage) function calls and ranges.

### Stage 2

- L11: Calls `NAME(arg, ...)`, with zero or more arguments. Names are case-insensitive.
- L12: A range used outside a function argument gives `#VALUE!`.
- L13: An unknown function gives `#NAME?`.
- L14: A malformed call or range (`SUM(1,)`, `A1:`) gives `#ERROR!`.
- L18: Any other argument is coerced like arithmetic.
- L19: With no numbers, `MIN` and `MAX` return 0 and `AVERAGE` returns `#DIV/0!`.
- L25: numbers are true when non-zero;
- L26: `null` is false;
- L27: text gives `#VALUE!`;
- L28: an error gives that error.

### Stage 3

- L16: A formula depends on every cell its text references, **including both branches of an `IF`** and every cell of a range.
- L20: cells outside that set aren't touched.
- L21: Replacing a formula drops its old dependencies.
- L22: You may still assume there are no cycles.
- L26: Built-ins take precedence over custom functions with the same name. An unknown function still gives `#NAME?`.
- L29: A function that throws, or returns a non-finite number, gives `#VALUE!`.

### Stage 4

- L9: `ErrorCode` gains `'#CYCLE!'`.
- L11: So do cells that depend on a cycle cell, even through an `IF` branch that isn't chosen.

## D9 d9-csv-parser

### Stage 1

- L15: `''` gives `{ data: [] }`.
- L16: Every character other than delimiters and line breaks is part of a field, including quotes (quoting comes next).

### Stage 2

- L14: `""` as a whole field is an empty field, and that record isn't an empty line.
- L17: Otherwise `errors` is `[]`.

### Stage 3

- L12: Without `header`, `data` is the array of field arrays.
- L17: `''` → `null`;
- L18: `'true'`/`'false'` → booleans;
- L19: strings matching `-?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?` → numbers;
- L20: anything else stays a string.
- L21: `errors` are in the order they were found.

### Stage 4

- L14: `createParser` applies the record and field rules from stages 1 and 2, including the BOM at the very start of the input.
- L16: `end()` emits the last record if there is one, and reports `Unclosed quote` through `onError` first if the input ended inside a quoted field. Calling `end()` again does nothing.
- L18: `write` after `end()` throws an `Error`.

## D10 d10-query-string

### Stage 1

- L16: A leading `?` is ignored. Split on `&` and skip empty parts.
- L20: Brackets have no meaning yet: `a[b]=1` gives the key `'a[b]'`.
- L21: Inputs in this stage don't use the keys `__proto__`, `constructor` or `prototype`.
- L26: `undefined` and functions are skipped, and `null` gives `key=`.
- L27: Dates use `toISOString()`, and other values use `String(v)`.
- L28: Values in this stage are never arrays or plain objects.

### Stage 2

- L16: A key that starts with `[` or has an unclosed `[` is a plain key: `[x]` and `a[b` stay as they are.
- L17: An index is a non-negative integer without leading zeros (`0`, `7`, `12`).
- L18: Inputs in this stage still don't use `__proto__`, `constructor` or `prototype` as any segment.
- L26: a string becomes `[old, new]`;
- L27: an array gets `new` pushed;
- L28: an object ignores the pair.
- L29: A nested write whose path runs through a string ignores the pair: `s=1&s[x]=2` gives `{ s: '1' }`.
- L34: `'indices'` gives `a[0]=x&a[1]=y`;
- L35: `'brackets'` gives `a[]=x&a[]=y`;
- L36: `'repeat'` gives `a=x&a=y`.

## D11 d11-env-parser

### Stage 1

- L16: If the trimmed value is at least two characters long and starts and ends with the same quote (`'`, `"` or `` ` ``), those two quotes are removed. Quotes are otherwise ordinary characters in this stage, and so is `#` after the `=`.

### Stage 2

- L10: A `#` in the middle of a word is kept (`a#b`).
- L11: The value is then trimmed.

### Stage 3

- L17: `parsed` is not modified.

## E2 e2-signals

### Stage 1

- L20: Assigning a value that is `Object.is`-equal to the current one (`NaN` to `NaN`, say) changes nothing.
- L24: What happens when `fn` throws or a computed reads itself comes later; you don't need to handle it yet.
- L25: Everything lives in one file. Global state is fine, since each test gets a fresh copy of your module.

### Stage 2

- L23: In this stage an effect reads the same signals on every run, and it doesn't write to signals.

## E3 e3-immutable-produce

### Stage 1

- L19: In this stage `base` is a plain object or an array, and so is every nested value you need to draft. Objects are plain when their prototype is `Object.prototype` or `null`.
- L20: Use a `Proxy`. Reading a nested object or array through a draft gives a draft of it, so writes at any depth work. A draft of an array passes `Array.isArray`.
- L21: Reads behave like the real object: property reads, `Object.keys`, `in`, and so on.
- L26: The recipe returns nothing. Return values come in a later stage.

### Stage 3

- L17: Setting a Map key to its current value or adding a member a Set already has is not a change. A changed Map or Set in the result is a new Map or Set; the base's stays untouched.
- L20: **Non-draftable bases** (primitives, class instances) are passed to the recipe as they are.

### Stage 4

- L30: `add` on an array index inserts; `remove` on an array index splices;
- L31: on objects and Maps, `add` and `replace` set and `remove` deletes;
- L32: `path: []` replaces the root. No patches returns `base`.

## E4 e4-undo-redo

### Stage 1

- L24: `state` is the present state, starting at `initial`.
- L28: `canUndo()` / `canRedo()` report whether that's possible.
- L29: Ignore any extra arguments; options come in the next stage.

### Stage 2

- L19: `coalesceMs` defaults to `500`. `clock` defaults to `Date.now`.
- L21: it has a `groupKey`;
- L22: the previous push had the **same** `groupKey`;
- L23: at most `coalesceMs` passed since that previous push (exactly `coalesceMs` still counts).

### Stage 3

- L19: Pushes inside a transaction change `state` but don't create steps, don't coalesce and don't touch redo.
- L21: An inner `commit()` just hands its changes to the enclosing transaction.
- L23: `commit()` / `rollback()` without an open transaction throw `No transaction`.
- L24: `undo()` and `redo()` inside a transaction throw an `Error`, and `canUndo()` / `canRedo()` return `false` there.
- L26: Capacity applies to a committed step like any other.

### Stage 4

- L31: `history.selection` is the present selection, initially `undefined`.
- L33: A coalesced push replaces the selection too. `rollback()` restores the selection from its `begin()`.

## E5 e5-state-machine

### Stage 1

- L29: `config.on` holds root-level handlers. The active state's handler wins; the root's is used only when the state has none for that event.
- L30: `event` is a string or `{ type, ...payload }`. `state.event` is the event as an object; for `initialState` it's `{ type: 'xstate.init' }`.
- L34: `transition` must not mutate its input; return a new state object.
- L35: `actions` is always `[]` in this stage.
- L36: Throw an `Error` for an unknown `initial` or target.

### Stage 2

- L32: A transition **without a target** runs its actions and stays put: nothing is exited or entered, and `changed` is `true`.
- L33: `entered` / `exited` list the state names entered and exited by this transition.
- L34: `context` starts as a copy of `config.context` (default `{}`). `initialState` runs the initial state's `entry` actions and has `entered: [initial]`.
- L35: An unchanged state keeps its `context` with `actions: []`, `entered: []` and `exited: []`.

### Stage 3

- L24: `entered` / `exited` hold full dot paths.
- L34: The transition's actions.
- L35: Entry actions, outermost first, down to the new leaf, following `initial`s.
- L41: `done` is `true` only once a **top-level** final state is entered. After that every event is ignored.

### Stage 4

- L32: `afterEvent(ms, path)`
- L33: `doneInvokeEvent(path)`, sent with payload `{ data }` (the resolved value)
- L34: `errorInvokeEvent(path)`, sent with payload `{ data }` (the rejection reason)
- L39: `clock` defaults to the real timers.
- L42: `state` is the current state. `subscribe(fn)` returns an unsubscribe function.

## E6 e6-query-cache

### Stage 1

- L30: Otherwise call `fn({ queryKey: key, signal })` (`signal` is an `AbortSignal` that is never aborted here). The promise resolves with the data or rejects with the error.
- L31: A query enters the cache when its first fetch starts.
- L34: Before any data: `status: 'pending'`, `data: undefined`, `updatedAt: 0`.
- L35: `fetchStatus` is `'fetching'` while a fetch is in flight, else `'idle'`.
- L36: On success: `status: 'success'`, `data` set, `error: undefined`, `updatedAt = clock.now()` (`clock` defaults to `Date.now`).
- L37: On failure: `status: 'error'`, `error` set, any old `data` is **kept**.
- L38: `isStale` is `true` only while the query has no data.
- L39: `getQueryData(key)` returns the cached data, or `undefined`.

### Stage 3

- L18: Returns an unsubscribe function.
- L19: The query remembers the latest `fn` it was given, for refetches.
- L27: The returned promise settles once every refetch it started has settled. It never rejects.

### Stage 4

- L21: An aborted fetch stops retrying.
- L26: Calling an unsubscribe function twice does nothing the second time.
- L27: After removal, `getState` returns `undefined` and `getQueryData` returns `undefined`.

## E7 e7-form-state

### Stage 1

- L29: Paths are dot strings, and array indices are numbers: `'items.0.name'`.
- L36: Extra options (such as `clock`) may be passed. Ignore them.

### Stage 2

- L29: The field's sync `validate(value, values)`.
- L30: The field's latest async result.
- L31: The form-level `validate(values)`, which returns an `{ path: message }` object.
- L32: `isValid` means `errors` is empty.
- L35: `setValue` on a path whose field has `asyncValidate` drops that path's previous async error and starts a new check right away.
- L36: The check resolves to a message or `undefined`. A rejection counts as an error, using the rejection's `message` (or `String(reason)` if it is not an `Error`).
- L38: `setValue` that replaces an object or array drops async errors under it.
- L39: `reset` also clears async results, and results of checks started before it are ignored.

### Stage 3

- L26: Touches every path in `values` that has a field config.
- L27: Runs any debouncing checks immediately, cancelling their timers.
- L28: Starts checks for async fields that have no result and no check running.
- L29: Waits until no checks are pending.
- L32: `reset` also cancels pending timers.

### Stage 4

- L20: Out-of-range indices throw a `RangeError`.
- L24: Sync and form-level errors are always recomputed from the current values.

## E8 e8-tiny-store

### Stage 1

- L24: `initializer(set, get, api)` returns the initial state. `set` behaves like `api.setState`, and `get` like `api.getState`.
- L29: `subscribe` returns an unsubscribe function.

### Stage 2

- L21: `subscribe(listener)` with one argument still works as before.

### Stage 3

- L17: | `name` | The storage key. |
- L18: | `storage` | `{ getItem, setItem, removeItem }`, sync or async. |
- L19: | `version` | Defaults to `0`. |
- L20: | `migrate(state, storedVersion)` | Converts state saved under another version. May be async. |
- L21: | `partialize(state)` | What gets saved. Defaults to the whole state; functions disappear in JSON. |
- L23: | `onHydrated(state, error?)` | Called when hydration finishes. |
- L26: The value stored is `JSON.stringify({ state: partialize(state), version })`.
- L27: Every change made through `set` or `api.setState` after hydration writes it. Hydration itself does not write.
- L28: No storage writes happen before hydration is done. In this stage, changes made before then may be overwritten by the persisted values.
- L33: If nothing is stored, the state stays as it is.
- L41: | `hasHydrated()` | Whether hydration has finished. |
- L42: | `whenHydrated()` | A promise that resolves once hydration has finished. |
- L43: | `rehydrate()` | Runs hydration again. |

### Stage 4

- L11: Still no storage writes before hydration is done.
- L22: The bus never delivers a store's own messages back to it.

## F2 f2-deep-clone

### Stage 1

- L19: In this stage, inputs contain only primitives, plain objects and dense arrays, with no cycles or shared objects.

### Stage 2

- L19: | `ArrayBuffer` | Copied. |
- L23: Each input object is cloned exactly once.
- L25: Function and symbol values still throw, including inside Maps and Sets.
- L26: Nesting stays shallow enough for recursion in this stage.

## F3 f3-deep-diff

### Stage 1

- L16: Arrays compare length, then element by element.

### Stage 2

- L30: Shared indices are diffed recursively.

### Stage 3

- L35: Round-trip: `isEqual(applyPatch(a, diff(a, b)), b)` holds.

### Stage 4

- L14: With `objectHash`, array items (at every depth) are matched by their hash instead of by index.
- L18: Without `objectHash`, `diff` behaves as before.

## F4 f4-text-diff

### Stage 1

- L22: `splitLines(text)` returns the lines; `''` has no lines.
- L25: `value` is the joined text of the run, and `count` is its number of lines.
- L30: Only `true` is ever stored in `added` / `removed`; when a flag doesn't apply, the key is left out.
- L31: Identical texts give one unchanged change (or `[]` when both are empty).
- L32: Inputs in this stage are small (a few dozen lines).

### Stage 2

- L19: `lines` holds `' '`, `'-'` and `'+'` prefixed lines without their `\n`, in the order of the line diff.
- L27: Starts are 1-based.
- L41: Both numbers always appear, even when they are `1` or `0`.
- L42: Identical inputs produce `''` (and `structuredPatch` returns no hunks).

### Stage 3

- L16: Each hunk's context and removed lines (with their exact terminators, using the no-newline markers) must match the source.

## F5 f5-fuzzy-search

### Stage 1

- L17: NFD-normalize;
- L18: remove combining marks (U+0300–U+036F);
- L19: lowercase.
- L25: In this stage, match each query character at the **earliest** possible place after the previous one.
- L27: An empty query matches with `positions: []`.

### Stage 2

- L17: | Each matched character | +16 |
- L24: A character gets at most one boundary bonus, the first one in the table that applies.
- L25: Boundary rules look at the **original** text, so camelCase still counts after folding. Upper after upper (`AB`) is not camelCase.
- L26: Characters skipped before the first match or after the last are free.
- L28: An empty query scores `0`.
- L29: Text can be a few hundred characters long, so don't try every alignment. Dynamic programming does it in O(query × text).

### Stage 3

- L15: An empty query gives `{ score: 0, positions: [], ranges: [] }`.

### Stage 4

- L19: Without `keys`, the items are strings.
- L20: With `keys`, each key is a property name or `{ name, weight = 1 }`. Values that aren't strings are skipped.
- L27: Return only matching items. `refIndex` is the item's index in `items`.
- L34: A value that matches exactly never uses the typo path.

## F6 f6-schema-validation

### Stage 1

- L40: | `.regex(re)` | `invalid_string` | `Invalid` |
- L47: `.regex` must give the same answer every time, even for a global (`/g`) regex.

### Stage 2

- L24: Only plain objects pass. Arrays and `null` are `invalid_type` (`received array` / `received null`).
- L26: A missing key is `undefined`, so it fails unless its schema accepts `undefined`.
- L27: Unknown keys are **stripped**. They are not copied to the output.
- L31: If the array isn't an array, report only `invalid_type`.

### Stage 3

- L35: Each method returns a new schema and leaves the original unchanged.

### Stage 4

- L21: | `.refine` false | `custom` | the given message, or `Invalid input` |
- L25: `refine(pred)` adds a `custom` issue at the current path when `pred(output)` is false.
- L26: `transform(fn)` replaces the output with `fn(output)`.
- L28: Inside a union, the winning option's transformed output is returned.

## F7 f7-money

### Stage 1

- L37: `amount` is the minor units as a `bigint`, and `currency` is the currency.
- L43: `compare(m)` returns `-1`, `0` or `1`.
- L45: `isZero()` reports whether the amount is zero.

### Stage 2

- L14: Each part gets `floor(|amount| × ratio / sum)` minor units.
- L19: The parts keep the receiver's currency and work for amounts of any size.

### Stage 3

- L25: The default mode is `half-even`.
- L27: A non-finite factor (`Infinity`, `NaN`) or an unknown mode throws a `RangeError`.

### Stage 4

- L17: `rate` is how many major units of `to` one major unit of this currency is worth. It can be a number or a string, and it is used as an exact decimal, like `multiply`'s factor.
- L19: The result has currency `to`.
- L20: A rate that isn't positive throws a `RangeError`, and so does an unknown mode.

## F8 f8-date-math

### Stage 1

- L25: **`getDay(date)`** returns the weekday.

### Stage 2

- L23: An invalid instant (such as `new Date('x')`) throws a `RangeError`.

### Stage 4

- L23: **daily**: `start`, `start + interval`, `start + 2·interval` and so on.
- L27: **monthly**: start from `start`'s month and use every `interval`th month.
- L33: Candidates before `start` are dropped.
- L38: `interval` must be an integer of at least 1. Otherwise throw a `RangeError`.

## G1 g1-virtual-list

### Stage 2

- L27: `getTotalSize()` is `end(count - 1)` (no trailing gap), or `0` when the list is empty.

### Stage 3

- L20: Records the real size, as before.
- L28: Clamp `index` to `[0, count - 1]`, and clamp the result to `[0, max(0, total - viewportHeight)]`.
- L29: An empty list returns `0`.

## G2 g2-keyboard-shortcuts

### Stage 1

- L28: **Result.** Return `{ key, ctrl, alt, shift, meta }`.
- L30: `ctrl`/`control`
- L31: `alt`/`option`/`opt`
- L32: `shift`
- L33: `meta`/`cmd`/`command`/`super`/`win`
- L40: | | `esc` | `Escape` |
- L41: | | `return` | `Enter` |
- L42: | | `space` | `' '` |
- L43: | | `up`, `down`, `left`, `right` | `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` |
- L44: | | `del` | `Delete` |
- L45: | | `plus` | `+` |
- L48: **Other keys.** Any other multi-character key is kept exactly as written: `'F5'`, `'PageDown'`, `'KeyK'`.
- L49: **The `+` key.** `'Ctrl++'` and `'+'` bind the `+` key itself.
- L56: Modifiers come in the order `Ctrl`, `Alt`, `Shift`, `Meta`, joined by `+`, followed by the key.
- L57: The space key is written as `Space`.
- L58: Steps are separated by a single space.

### Stage 2

- L25: **`handle(event)`** returns `true` when the event was used: either a handler ran or a pending sequence advanced or started. Otherwise it returns `false`.

### Stage 3

- L26: the active scope's bindings;

## G3 g3-sortable-dnd

### Stage 2

- L16: Insert the block at `toIndex` of the remaining list, where `0 ≤ toIndex ≤ remaining.length`.

### Stage 3

- L24: `parentId` is the nearest item before the gap at `depth - 1`, or `null` for depth 0.
- L25: `index` is the number of that parent's children before the gap.

## G4 g4-roving-focus

### Stage 1

- L18: **`handleKey(key)`** returns `true` when the key belongs to the listbox. The caller would then call `preventDefault`.
- L19: **`setActive(index)`** moves to an enabled item and returns `true`. For a disabled item it returns `false` and does nothing. An index outside the list throws a `RangeError`.

### Stage 2

- L21: **No match.** If nothing matches, the active item doesn't change.

## G5 g5-masonry

### Stage 1

- L17: **`columnCount`** must be a positive integer. Otherwise it throws a `RangeError`.
- L20: A negative `containerWidth` or `gutter` throws a `RangeError`.
- L34: **`positions`** has one `{ x, y, width, height, column }` per item, in input order.
- L35: **`height`** is the bottom of the tallest column, without the trailing gutter. It is `0` when there are no items.

### Stage 3

- L13: **Result.** Each position gains `span` (after capping). `column` is the leftmost column the item covers.

### Stage 4

- L14: **`layout`** is the current result, in the same shape as `layout()` returns. With no items it is the empty layout for the options.
- L17: Options are validated by `createMasonry` itself, with the same errors as `layout`.

## G6 g6-toast-queue

### Stage 1

- L18: **`getVisible()`** returns copies of the toasts on screen, oldest first. Every toast is on screen in this stage.
- L24: **Duration.** A toast without an explicit `duration` gets the toaster's default. `'loading'` toasts default to `Infinity`. A toast with an `Infinity` duration never auto-dismisses.

### Stage 2

- L16: **`getQueued()`** returns copies of the waiting toasts, oldest first.
- L17: **On screen.** A new toast is shown if fewer than `maxVisible` are on screen. Its timer starts then.
- L23: **`pause()`** freezes every visible timer.
- L26: Calling either one twice in a row does nothing extra.

### Stage 3

- L21: **Custom ids.** If `id` is given and that toast exists, visible or queued, this updates it like `update(id, { message, type, duration })` and returns the same id. An `id` that doesn't exist yet becomes the new toast's id.

### Stage 4

- L14: **Rejects.** The toast is updated to type `'error'` with the `error` message.
- L15: **Message functions.** Either message can be a function of the value or the reason.

## G7 g7-history

### Stage 1

- L28: A bare `'?'` or `'#'` also becomes `''`.
- L34: **Keys.** Every entry gets a **unique** string `key`. `state` defaults to `null`.
- L35: **Read-only properties:** `location` (the current entry), `index`, `length`, and `action`. `action` is `'POP'`.
- L36: **`createHref(to)`** resolves `to` against the current location and joins the parts back into a string.

### Stage 2

- L15: **`state`** defaults to `null`.
- L17: **`back()`** is `go(-1)`, and **`forward()`** is `go(1)`.

### Stage 3

- L15: **Asking.** Each blocker is called with a transition `{ action, location, retry }`. `location` is where the navigation would go.
- L16: **Allowing.** A blocker that returns `true` lets it through.
- L23: **Already done.** Calling `retry` again after the navigation went through also does nothing.

### Stage 4

- L17: **Discarded entries.** An entry that's discarded loses its scroll data. That covers entries replaced, cut off by a `push`, or dropped by `maxLength`.
- L21: **`maxLength`** is a new option. It must be a positive integer or `Infinity` (the default). Otherwise `createMemoryHistory` throws a `RangeError`.

## G8 g8-popover-position

### Stage 1

- L20: for `top`, its bottom edge touches the reference's top edge;
- L21: for `right`, its left edge touches the reference's right edge.

### Stage 2

- L20: **`x` and `y`** replace the current coordinates. The next middleware sees them.
- L21: **`data`** is shallow-merged into `middlewareData[name]`. Every middleware that ran gets an entry, even an empty one.
- L40: **Data:** `{ x, y }`, the amount actually moved.

### Stage 3

- L18: **Record it.** Otherwise add `{ placement, overflow }` to `data.overflows`.
- L19: **Try the next one.** Reset to the next candidate.

### Stage 4

- L18: The data is `{ x }` (or `{ y }`) and `centerOffset`, which is how far the clamp moved it, as `ideal − clamped`.

## G9 g9-rich-text-marks

### Stage 1

- L18: empty spans are dropped;
- L19: a span keeps one mark per type, and the last one wins;
- L20: marks are sorted in the order `link`, `color`, `bold`, `italic`, `underline`, `code`;
- L21: neighbours with equal marks are merged. Two marks are equal when their type and attributes match.
- L23: **Editor.** `createEditor(initial = [])` starts from the normalized spans. `getSpans()` returns a normalized copy, and `getText()` returns the plain text.
- L25: **`removeMark(from, to, type)`.** Removes marks of that type, whatever their attributes.

### Stage 2

- L14: Both throw a `RangeError` for a bad range, like the other methods.

### Stage 3

- L16: While the stored marks are set, `marksAt(pos)` returns them.
- L17: Text typed at `pos` gets them.
- L18: Typing, deleting, or calling `addMark`, `removeMark` or a ranged `toggleMark` clears them, so they're used only once. Another collapsed toggle at a different position replaces them.
- L19: **Bad positions.** `insertText`, `marksAt` and a collapsed `toggleMark` throw a `RangeError` unless `pos` is a whole number with `0 ≤ pos ≤ length`. Inserting an empty string changes nothing.

### Stage 4

- L16: | | link | `<a href="…">` |
- L17: | | color | `<span style="color: …">` |
- L18: | | bold | `<strong>` |
- L19: | | italic | `<em>` |
- L20: | | underline | `<u>` |
- L21: | | code | `<code>` |
- L25: tag names in any case, plus `<b>` and `<i>` as aliases;
- L26: unknown tags like `<p>`, whose text is kept and whose tag is ignored;
- L27: the entities `&amp;`, `&lt;`, `&gt;`, `&quot;` and `&#39;`, each decoded exactly once;
- L28: a closing tag closes everything opened inside it.

## H2 h2-rate-limiter

### Stage 1

- L20: **`tokens`** is a getter that returns the current level after refilling.

### Stage 2

- L17: **`tokens(key)`** reports the key's level. For a key with no bucket it reports the starting level, without creating a bucket.
- L18: **`size`** is the number of buckets kept.

### Stage 3

- L22: **`remaining`** is `floor(limit − count)`, never below 0. When the hit is allowed, `count` includes it.
- L23: **`resetAt`** is when the current window ends.
- L27: A denied hit isn't counted.
- L28: `n > limit` throws a `RangeError`.
- L29: `limit` and `windowMs` must be positive numbers.

### Stage 4

- L18: **Right away.** If nobody is waiting and there are enough tokens, it takes them and resolves.
- L21: **Timers.** Wait with one `clock.setTimeout` for the front of the line, no polling. When nobody is waiting, no timer is left.
- L22: **Impossible requests.** An `n` above `capacity` can never succeed, so the promise rejects with a `RangeError` right away.
- L23: **Aborting.**
- L24: **Already aborted:** a `signal` that's already aborted rejects with `signal.reason` without joining the line.

## H3 h3-fetch-wrapper

### Stage 2

- L16: **What's retried.**
- L18: **Statuses:** 408, 413, 429, 500, 502, 503 and 504.
- L20: **How many times.** Up to `limit` retries after the first attempt (default 2).
- L23: **Body.** Every attempt sends the full body again.

### Stage 4

- L16: When time runs out, the `fetch` is aborted through the request's signal, and the call rejects with a **`TimeoutError`**.
- L17: Timeouts are not retried.
- L22: **`retry`** objects merge field by field.
- L23: **Everything else** is replaced.
- L24: **`clock`** (`now`, `setTimeout`, `clearTimeout`) is used for every timer and for `Retry-After` dates.

## H4 h4-cursor-pagination

### Stage 1

- L18: **Lazy.** Nothing is fetched until you start iterating, and the next page is fetched only when you ask for the item after the current page.
- L20: **`.cursor`.** The generator has a `.cursor` property, which you can pass back as `startCursor` to carry on later.
- L21: It starts as the start cursor.
- L22: It moves to a page's `endCursor` only after **every item of that page** has been yielded. If you stop part-way through a page, `.cursor` still points at that page, so resuming fetches it again.

### Stage 2

- L14: its `endCursor` is `null`, or
- L15: its `endCursor` was already used, and the start cursor counts as used.

### Stage 3

- L16: **State.** `feed.items` is the list of nodes. `hasOlder` starts as `true` and `hasNewer` as `false`.
- L17: **`loadOlder()`**
- L18: Fetches `{ first: pageSize, after }`, where `after` is the last edge's cursor, or `null` for an empty list.
- L21: **`loadNewer()`**
- L24: Does nothing when the list is empty. Otherwise it always fetches, so it can be used to poll.
- L27: `loadOlder` drops the newest items and sets `hasNewer = true`.
- L28: `loadNewer` and inserts drop the oldest items and set `hasOlder = true`.
- L36: **`{ type: 'insert', edge }`** adds the edge at the top, then applies the `maxItems` rule.
- L37: It is ignored when `hasNewer` is true, because the top of the list isn't loaded and the insert would leave a gap.
- L38: It is also ignored when that id is already in the list.
- L39: **`{ type: 'update', node }`** replaces the node with the same id. If there's no such node, nothing happens.
- L40: **`{ type: 'delete', id }`** removes that node, if it's there.

## H5 h5-circuit-breaker

### Stage 1

- L20: **`breaker.state`** is `'closed'` or `'open'`.
- L21: **Staying open.** In this stage an open breaker stays open for good, and results of calls that were already running when it opened are ignored by the breaker (their callers still get them).
- L22: **`clock`** may be passed in the options. This stage doesn't use it.

### Stage 2

- L20: **The first trial decides.**
- L23: **Results that arrive too late.** A call that was started before the breaker last changed state, and finishes after that change, doesn't affect the breaker. Its caller still gets its result or error.

### Stage 3

- L17: **With `failureThreshold`.** When a window is given, there's no default `failureThreshold`. If you also set one, either rule can open the breaker.

### Stage 4

- L13: **`breaker.fallback(fn)`** returns the breaker.
- L20: | | `success` | the result |
- L21: | | `failure` | the error |
- L22: | | `timeout` | the `TimeoutError`, emitted just before `failure` |
- L23: | | `reject` | the `OpenCircuitError` |
- L24: | | `fallback` | the fallback's value |
- L25: | | `open`, `halfOpen`, `close` | none |
- L29: The caller still gets the error.

## H6 h6-offline-queue

### Stage 1

- L27: Ids start at 1 and go up by one. `attempts` is always 0 in this stage.
- L29: A mutation leaves the queue when its `send` promise resolves.
- L30: In this stage you can assume `send` always resolves.
- L34: Sending starts on its own after `enqueue`. Each start is on a microtask, never synchronously inside the call.

### Stage 2

- L26: A send that is already in flight finishes, and its outcome is handled normally.
- L32: Restored mutations keep their stored fields, including `attempts`. You can still assume `send` always resolves.

### Stage 3

- L24: When `send` rejects and `isRetryable(error)` is true, increment `attempts`, which counts the failed sends of that mutation.
- L30: **Order.** The next mutation isn't sent until the current one has succeeded or been dropped.

## H7 h7-webhooks

### Stage 1

- L18: **Format.** Items are separated by commas, and spaces around an item are ignored.
- L19: **Other keys.** Keys other than `t` and `v1` (such as `v0`) are ignored.
- L21: an item has no key or no `=`;
- L22: `t` is missing, appears twice, or isn't made only of digits;
- L23: there is no `v1`.
- L30: **Use the raw body.** `payload` must be the body exactly as received. Re-serialized JSON has different bytes, so it won't match.
- L36: `now` is `clock.now()` in ms, or `Date.now()` if no clock is given. Round it down to whole seconds.
- L37: A timestamp ahead of your clock is accepted.
- L38: **Order of checks.** The signature is always checked first, so a bad signature is reported as `no_match` even when it's old.

### Stage 2

- L20: **New events.** The first delivery of an `id` calls `handle` and has `duplicate: false`.

### Stage 3

- L16: Only a successful `handle` records a new version.
- L17: Stale outcomes are remembered for duplicates too.
- L18: **Without `getKey`**, events don't wait for each other and are never stale.

## H8 h8-http-cache

### Stage 1

- L5: **Results.** Each result is `{ status, headers, body, cache }`, and `cache` is `'HIT'` or `'MISS'`.
- L6: **Header names.** They are case-insensitive. Lower-case them on the way in. The origin's headers are already lower-case.
- L7: **Time.** Times come from `clock.now()` in ms, or `Date.now()` if no clock is given.
- L23: otherwise 0.
- L27: `apparent = max(0, responseTime − Date)`;
- L28: `corrected = Age header + (responseTime − requestTime)`;
- L29: `age = max(apparent, corrected) + (now − responseTime)`.
- L31: **Stale entries.** In this stage a stale response is simply fetched again with the caller's headers. The new reply is returned as `MISS` and replaces the stored copy; a reply with a status that can't be stored removes it.
- L32: **One copy per URL.** Store at most one response per URL. Other `Cache-Control` directives are ignored in this stage.

### Stage 2

- L13: `If-None-Match` comes from `ETag`;
- L14: `If-Modified-Since` comes from `Last-Modified`;
- L15: keep the caller's own headers too.
- L19: **No validator.** A stale response with neither `ETag` nor `Last-Modified` is fetched again as in stage 1.

### Stage 3

- L13: **Never stored:**
- L18: **Directives.** Directive names are case-insensitive.
- L19: **Unstorable replies.** A response that can't be stored removes the variant it would have replaced.

### Stage 4

- L16: A background failure is ignored, and the next stale hit may try again.
- L18: **Past the window**, the origin's answer, or its error, goes to the caller.

## H9 h9-reconnecting-socket

### Stage 1

- L14: `state`: `'connecting'` or `'open'`;
- L15: `on(event, fn)` for `'open'`, `'message'`, `'close'` and `'reconnecting'`. It returns an unsubscribe function.
- L20: **Reconnecting.** When the socket closes, or fails to connect, schedule a new one.
- L22: Emit `reconnecting` with `{ attempt, delay }`, where `attempt` starts at 1.
- L24: **Events.** `open` fires on every successful connection. `message` fires with the raw `data` string. `close` fires only when an **open** connection is lost.

### Stage 2

- L12: **While open.** `send` sends at once and returns `true`.
- L16: close the current socket, cancel every timer and drop the buffer;
- L17: `state` becomes `'closed'`, and no events fire;
- L18: later calls to `send` or `subscribe` throw.

### Stage 3

- L14: **`close()`.** After `close()`, `subscribe` throws too.
- L19: Calling an unsubscribe function a second time does nothing.
