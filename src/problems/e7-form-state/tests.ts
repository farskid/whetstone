import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Values and dirty';
const G2 = 'Validation';
const G3 = 'Async validation and submit';
const G4 = 'Field arrays';

const required = (v: unknown) => (v ? undefined : 'Required');

function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'nested get/set is immutable and shares untouched branches',
    run({ createForm }, { expect, clock }) {
      const initialValues = { user: { name: 'Lin', tags: ['a'] }, meta: { v: 1 } };
      const form = createForm({ initialValues, clock: clock() });
      form.setValue('user.name', 'Ada');
      form.setValue('user.tags.1', 'b');
      form.setValue('extra.deep.0', 'x');
      expect(form.values).toEqual({ user: { name: 'Ada', tags: ['a', 'b'] }, meta: { v: 1 }, extra: { deep: ['x'] } });
      expect(form.values.meta).toBe(initialValues.meta);
      expect(initialValues.user).toEqual({ name: 'Lin', tags: ['a'] });
      expect([form.getValue('user.tags.1'), form.getValue('nope.x')]).toEqual(['b', undefined]);
    },
  },
  {
    group: G1,
    title: 'dirty compares with the initial values; touched; reset',
    run({ createForm }, { expect, clock }) {
      const form = createForm({ initialValues: { a: 1, b: { c: [1, 2] } }, clock: clock() });
      expect(form.isDirty()).toBe(false);
      form.setValue('b.c.1', 3);
      expect([form.isDirty(), form.isDirty('b'), form.isDirty('a')]).toEqual([true, true, false]);
      form.setValue('b.c.1', 2);
      expect(form.isDirty(), 'setting back to the original is clean').toBe(false);
      form.touch('a');
      expect([form.isTouched('a'), form.isTouched('b.c')]).toEqual([true, false]);
      form.setValue('a', 5);
      form.reset();
      expect([form.values, form.isTouched('a'), form.isDirty()]).toEqual([{ a: 1, b: { c: [1, 2] } }, false, false]);
      form.reset({ a: 9 });
      form.setValue('a', 10);
      form.setValue('a', 9);
      expect([form.values, form.isDirty()]).toEqual([{ a: 9 }, false]);
    },
  },
  {
    group: G2,
    title: 'field validators via patterns, keyed by index path',
    run({ createForm }, { expect, clock }) {
      const form = createForm({
        initialValues: { name: '', items: [{ title: 'x' }, { title: '' }] },
        fields: { name: { validate: required }, 'items.*.title': { validate: required } },
        clock: clock(),
      });
      expect(form.errors).toEqual({ name: 'Required', 'items.1.title': 'Required' });
      expect(form.isValid).toBe(false);
      form.setValue('name', 'Ada');
      form.setValue('items.1.title', 'y');
      expect([form.errors, form.isValid]).toEqual([{}, true]);
    },
  },
  {
    group: G2,
    title: 'precedence: field sync, then async, then form-level',
    async run({ createForm }, { expect, clock, flush }) {
      const form = createForm({
        initialValues: { pw: 'short', confirm: 'x', user: 'taken' },
        validate: (v) => ({ ...(v.pw !== v.confirm ? { confirm: 'Must match' } : {}), pw: 'Form says no', user: 'Form user error' }),
        fields: {
          pw: { validate: (v: string) => (v.length < 8 ? 'Too short' : undefined) },
          user: { validate: (v: string) => (v.length < 3 ? 'Too short' : undefined), asyncValidate: async (v: string) => (v === 'taken' || v === 'ab' ? 'Taken' : undefined) },
        },
        clock: clock(),
      });
      expect(form.errors).toEqual({ pw: 'Too short', confirm: 'Must match', user: 'Form user error' });
      form.setValue('user', 'taken');
      await flush();
      expect(form.errors.user, 'async beats form-level').toBe('Taken');
      form.setValue('user', 'ab');
      await flush();
      expect(form.errors.user, 'sync beats async').toBe('Too short');
      form.setValue('pw', 'longenough');
      expect(form.errors.pw).toBe('Form says no');
    },
  },
  {
    group: G3,
    title: 'async checks are debounced on the clock',
    async run({ createForm }, { expect, clock }) {
      const c = clock();
      const calls: string[] = [];
      const form = createForm({
        initialValues: { email: '' },
        fields: { email: { debounceMs: 300, asyncValidate: async (v: string) => { calls.push(v); return v === 'a@b.c' ? 'Taken' : undefined; } } },
        clock: c,
      });
      form.setValue('email', 'a');
      await c.advance(200);
      form.setValue('email', 'a@b.c');
      expect(form.isValidating).toBe(true);
      await c.advance(299);
      expect(calls).toEqual([]);
      await c.advance(1);
      expect(calls).toEqual(['a@b.c']);
      expect([form.isValidating, form.errors]).toEqual([false, { email: 'Taken' }]);
      form.setValue('email', 'new@b.c');
      expect(form.errors, 'a new value drops the old async error').toEqual({});
    },
  },
  {
    group: G3,
    title: 'stale async results are ignored; rejections become errors',
    async run({ createForm }, { expect, clock, deferred, flush }) {
      const pending: { resolve(v: string | undefined): void; reject(e: unknown): void }[] = [];
      const form = createForm({
        initialValues: { u: '' },
        fields: { u: { asyncValidate: () => { const d = deferred<string | undefined>(); pending.push(d); return d.promise; } } },
        clock: clock(),
      });
      form.setValue('u', 'one');
      form.setValue('u', 'two');
      pending[1].resolve(undefined);
      await flush();
      pending[0].resolve('Old error');
      await flush();
      expect([form.errors, form.isValidating]).toEqual([{}, false]);
      form.setValue('u', 'three');
      pending[2].reject(new Error('Network down'));
      await flush();
      expect(form.errors).toEqual({ u: 'Network down' });
    },
  },
  {
    group: G3,
    title: 'submit flushes debounces, waits for checks, touches fields and calls onSubmit only when valid',
    async run({ createForm }, { expect, clock }) {
      const c = clock();
      const checked: string[] = [];
      const form = createForm({
        initialValues: { email: 'x@y.z', name: '' },
        fields: {
          email: { debounceMs: 1000, asyncValidate: async (v: string) => { checked.push(v); return v.endsWith('.z') ? 'Bad domain' : undefined; } },
          name: { validate: required },
        },
        clock: c,
      });
      const submitted: unknown[] = [];
      const r1 = await form.submit((v) => { submitted.push(v); });
      expect([r1.ok, r1.errors, checked, submitted]).toEqual([false, { email: 'Bad domain', name: 'Required' }, ['x@y.z'], []]);
      expect([form.isTouched('email'), form.isTouched('name')]).toEqual([true, true]);
      form.setValue('name', 'Ada');
      form.setValue('email', 'x@y.com');
      const r2 = await form.submit(async (v) => { submitted.push(v); });
      expect([r2.ok, checked, submitted]).toEqual([true, ['x@y.z', 'x@y.com'], [{ email: 'x@y.com', name: 'Ada' }]]);
      expect(c.pendingTimers(), 'the debounce timer was cancelled').toBe(0);
    },
  },
  {
    group: G4,
    title: 'append, remove and move update values and stable ids',
    run({ createForm }, { expect, clock }) {
      const form = createForm({ initialValues: { list: ['a', 'b', 'c'] }, clock: clock() });
      const [ia, ib, ic] = form.ids('list');
      expect(new Set([ia, ib, ic]).size).toBe(3);
      form.append('list', 'd');
      const id = form.ids('list');
      expect([id.slice(0, 3), id[3] !== ia && id[3] !== ib && id[3] !== ic]).toEqual([[ia, ib, ic], true]);
      form.remove('list', 1);
      form.move('list', 2, 0);
      expect(form.values.list).toEqual(['d', 'a', 'c']);
      expect(form.ids('list')).toEqual([id[3], ia, ic]);
      expect(thrown(() => form.remove('list', 5)) instanceof RangeError).toBe(true);
      expect(thrown(() => form.move('list', 0, 3)) instanceof RangeError).toBe(true);
      form.append('newList', 1);
      expect(form.values.newList).toEqual([1]);
    },
  },
  {
    group: G4,
    title: 'touched and async errors follow their item',
    async run({ createForm }, { expect, clock, flush }) {
      const form = createForm({
        initialValues: { rows: [{ sku: 'ok' }, { sku: 'bad' }, { sku: 'ok2' }] },
        fields: { 'rows.*.sku': { validate: required, asyncValidate: async (v: string) => (v.startsWith('bad') ? `Unknown ${v}` : undefined) } },
        clock: clock(),
      });
      form.setValue('rows.1.sku', 'bad1');
      form.touch('rows.1.sku');
      await flush();
      expect(form.errors).toEqual({ 'rows.1.sku': 'Unknown bad1' });
      form.move('rows', 1, 0);
      expect([form.errors, form.isTouched('rows.0.sku'), form.isTouched('rows.1.sku')]).toEqual([{ 'rows.0.sku': 'Unknown bad1' }, true, false]);
      form.setValue('rows.2.sku', '');
      expect(form.errors, 'sync errors use current indices').toEqual({ 'rows.0.sku': 'Unknown bad1', 'rows.2.sku': 'Required' });
      form.remove('rows', 0);
      expect([form.errors, form.isTouched('rows.0.sku')]).toEqual([{ 'rows.1.sku': 'Required' }, false]);
    },
  },
  {
    group: G4,
    title: 'removing an item cancels its pending check',
    async run({ createForm }, { expect, clock, deferred, flush }) {
      const c = clock();
      const d = deferred<string | undefined>();
      const form = createForm({
        initialValues: { rows: [{ v: '' }, { v: '' }] },
        fields: { 'rows.*.v': { debounceMs: 100, asyncValidate: () => d.promise } },
        clock: c,
      });
      form.setValue('rows.0.v', 'x');
      form.setValue('rows.1.v', 'y');
      await c.advance(100);
      form.remove('rows', 0);
      expect(form.isValidating).toBe(true);
      form.remove('rows', 0);
      expect(form.isValidating).toBe(false);
      d.resolve('Late error');
      await flush();
      expect(form.errors).toEqual({});
      form.append('rows', { v: 'z' });
      expect(form.errors, 'a new item does not inherit an old error').toEqual({});
    },
  },
  {
    group: G4,
    title: 'replacing an array keeps ids only when the length matches',
    run({ createForm }, { expect, clock }) {
      const form = createForm({ initialValues: { tags: ['a', 'b'] }, clock: clock() });
      const before = form.ids('tags');
      form.setValue('tags', ['A', 'B']);
      expect(form.ids('tags')).toEqual(before);
      form.setValue('tags', ['A', 'B', 'C']);
      const after = form.ids('tags');
      expect([after.length, after.some((i) => before.includes(i))]).toEqual([3, false]);
    },
  },
];
