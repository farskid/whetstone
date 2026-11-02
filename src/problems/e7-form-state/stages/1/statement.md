# Form state manager

Build the state layer of a form library. There is no UI, only state. This stage covers values, dirty tracking and touched tracking.

```ts
const form = createForm({ initialValues: { user: { name: 'Lin' }, tags: ['a'] } });
form.setValue('user.name', 'Ada');
form.setValue('tags.1', 'b');
form.values;          // { user: { name: 'Ada' }, tags: ['a', 'b'] }
form.isDirty('user'); // true
form.touch('user.name');
form.reset();         // back to the initial values, nothing touched
```

```ts
createForm(options: { initialValues: Values }): Form

interface Form {
  readonly values: Values;
  getValue(path: string): any;
  setValue(path: string, value: any): void;
  touch(path: string): void;
  isTouched(path: string): boolean;
  isDirty(path?: string): boolean;
  reset(values?: Values): void;
}
```

- Paths are dot strings, and array indices are numbers: `'items.0.name'`.
- `getValue(path)` returns the value at the path, or `undefined` if any part of the path is missing.
- `setValue(path, value)` writes a value, creating missing containers: an array when the next segment is a number, otherwise an object.
- `values` is replaced immutably on every change. Never mutate `initialValues` or an earlier `values`. Containers that didn't change keep their identity.
- `isDirty(path?)` deep-compares the current value with the initial value, at the path or for the whole form. Setting a value back to the original makes it clean again.
- `touch(path)` marks a path as visited. `isTouched(path)` is true only for exactly that path.
- `reset(values?)` restores the initial values and clears touched state. If `values` is given, it becomes the new initial values.
- Extra options (such as `clock`) may be passed. Ignore them.
