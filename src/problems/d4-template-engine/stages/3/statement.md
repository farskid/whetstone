Add partials and helpers through a new `options` argument, and an error class.

```ts
render('{{> item}}', { name: 'a' }, { partials: { item: '<li>{{name}}</li>' } });  // '<li>a</li>'
render('{{upper user.first}}', { user: { first: 'ada' } }, { helpers: { upper: (s) => String(s).toUpperCase() } }); // 'ADA'
```

```ts
type Helper = (...args: unknown[]) => unknown;
interface RenderOptions { partials?: Record<string, string>; helpers?: Record<string, Helper> }
function render(template: string, data: unknown, options?: RenderOptions): string;

export class TemplateError extends Error {
  constructor(message: string, public line: number, public column: number) {
    super(`${message} (line ${line}, column ${column})`);
    this.name = 'TemplateError';
  }
}
```

Export `TemplateError` exactly as shown. `line` and `column` are 1-based and point at the `{{` of the tag responsible.

**Partials: `{{> name}}`**
- Render the named template from `partials` with the current stack. <!-- tests: partials see the current context; missing partials render empty -->
- A missing partial renders `''`. <!-- tests: partials see the current context; missing partials render empty -->
- Partials may recurse. Rendering a partial more than 100 levels deep throws a `TemplateError` whose message contains `Partial depth limit exceeded`. <!-- tests: infinitely recursive partials hit the depth limit -->

**Helpers**
- If the first word of a variable tag names a helper (an own key of `helpers`), call it with the remaining words as arguments: <!-- tests: helpers take literal and looked-up arguments, beat data, and are escaped -->
  - `"quoted"` or `'quoted'` strings (a backslash escapes the next character);
  - numbers (`-?\d+(\.\d+)?`);
  - anything else as a lookup.
- Helpers apply even with zero arguments, and take precedence over data. <!-- tests: helpers take literal and looked-up arguments, beat data, and are escaped -->
- The result is rendered like a value (escaped unless the tag is raw). <!-- tests: helpers take literal and looked-up arguments, beat data, and are escaped -->
- A tag with several words whose first word isn't a helper throws ``TemplateError(`Unknown helper "<word>"`, …)`` when it's rendered.
- Templates are still well-formed in this stage.
