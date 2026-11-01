import type { TestCase } from '../../runner/types';
import type { Toast } from './solution';
type M = typeof import('./solution');

const msgs = (ts: Toast[]) => ts.map((t) => t.message);

export const tests: TestCase<M>[] = [
  {
    group: 'Show and dismiss',
    title: 'toasts dismiss themselves after their duration',
    run({ createToaster }, { expect, clock }) {
      const c = clock();
      const t = createToaster({ clock: c });
      t.toast('Saved');
      t.toast('Slow', { duration: 10000 });
      t.toast('Sticky', { duration: Infinity });
      expect(msgs(t.getVisible())).toEqual(['Saved', 'Slow', 'Sticky']);
      expect(t.getVisible()[0]).toEqual({ id: t.getVisible()[0].id, message: 'Saved', type: 'default', duration: 4000, count: 1 });
      c.tick(3999);
      expect(t.getVisible()).toHaveLength(3);
      c.tick(1);
      expect(msgs(t.getVisible())).toEqual(['Slow', 'Sticky']);
      c.tick(6000);
      expect(msgs(t.getVisible())).toEqual(['Sticky']);
      c.tick(1e9);
      expect(msgs(t.getVisible())).toEqual(['Sticky']);
      const l = t.toast('Uploading…', { type: 'loading' });
      c.tick(1e9);
      expect(t.getVisible().find((x) => x.id === l)?.duration, 'loading never auto-dismisses').toBe(Infinity);
    },
  },
  {
    group: 'Show and dismiss',
    title: 'dismiss one, all, or an unknown id',
    run({ createToaster }, { expect, clock }) {
      const c = clock();
      const t = createToaster({ clock: c });
      const a = t.toast('a');
      t.toast('b');
      t.dismiss('nope');
      t.dismiss(a);
      expect(msgs(t.getVisible())).toEqual(['b']);
      t.toast('c');
      t.dismiss();
      expect(t.getVisible()).toEqual([]);
      expect(c.pendingTimers(), 'dismissed toasts leave no timers behind').toBe(0);
      const ids = new Set([t.toast('x'), t.toast('y'), t.toast('z')]);
      expect(ids.size, 'ids are unique').toBe(3);
    },
  },
  {
    group: 'Queue and pause',
    title: 'extra toasts queue and their timers wait',
    input: 'maxVisible 2, duration 1000',
    run({ createToaster }, { expect, clock }) {
      const c = clock();
      const t = createToaster({ clock: c, maxVisible: 2, duration: 1000 });
      t.toast('1');
      c.tick(500);
      t.toast('2');
      t.toast('3');
      t.toast('4');
      expect(msgs(t.getVisible())).toEqual(['1', '2']);
      expect(msgs(t.getQueued())).toEqual(['3', '4']);
      c.tick(500);
      expect(msgs(t.getVisible()), '1 expires, 3 moves up').toEqual(['2', '3']);
      expect(msgs(t.getQueued())).toEqual(['4']);
      c.tick(500);
      expect(msgs(t.getVisible())).toEqual(['3', '4']);
      c.tick(499);
      expect(msgs(t.getVisible()), '3 got a full 1000 ms from when it appeared').toEqual(['3', '4']);
      c.tick(1);
      expect(msgs(t.getVisible())).toEqual(['4']);
    },
  },
  {
    group: 'Queue and pause',
    title: 'queued toasts move up in order; dismiss() clears the queue too',
    run({ createToaster }, { expect, clock }) {
      const c = clock();
      const t = createToaster({ clock: c, maxVisible: 2 });
      const ids = ['a', 'b', 'c', 'd', 'e'].map((m) => t.toast(m));
      t.dismiss(ids[3]);
      expect(msgs(t.getQueued()), 'dismissing a queued toast').toEqual(['c', 'e']);
      t.dismiss(ids[0]);
      t.dismiss(ids[1]);
      expect(msgs(t.getVisible())).toEqual(['c', 'e']);
      expect(t.getQueued()).toEqual([]);
      t.toast('f');
      t.toast('g');
      expect(msgs(t.getQueued())).toEqual(['f', 'g']);
      t.dismiss();
      expect([t.getVisible(), t.getQueued()]).toEqual([[], []]);
      expect(c.pendingTimers()).toBe(0);
    },
  },
  {
    group: 'Queue and pause',
    title: 'pause keeps the remaining time',
    run({ createToaster }, { expect, clock }) {
      const c = clock();
      const t = createToaster({ clock: c, duration: 1000 });
      t.toast('a');
      c.tick(300);
      t.toast('b');
      c.tick(300);
      t.pause();
      c.tick(2500);
      t.pause();
      c.tick(2500);
      expect(msgs(t.getVisible())).toEqual(['a', 'b']);
      t.resume();
      t.resume();
      c.tick(399);
      expect(msgs(t.getVisible())).toEqual(['a', 'b']);
      c.tick(1);
      expect(msgs(t.getVisible()), 'a had 400 ms left').toEqual(['b']);
      c.tick(299);
      expect(msgs(t.getVisible())).toEqual(['b']);
      c.tick(1);
      expect(t.getVisible()).toEqual([]);
    },
  },
  {
    group: 'Queue and pause',
    title: 'toasts shown while paused wait for resume',
    run({ createToaster }, { expect, clock }) {
      const c = clock();
      const t = createToaster({ clock: c, duration: 1000, maxVisible: 1 });
      const a = t.toast('a');
      t.toast('b');
      t.pause();
      t.toast('c', { duration: 50 });
      t.dismiss(a);
      c.tick(5000);
      expect(msgs(t.getVisible())).toEqual(['b']);
      t.resume();
      c.tick(999);
      expect(msgs(t.getVisible())).toEqual(['b']);
      c.tick(1);
      expect(msgs(t.getVisible())).toEqual(['c']);
      c.tick(50);
      expect(t.getVisible()).toEqual([]);
    },
  },
  {
    group: 'Updates and duplicates',
    title: 'update in place; a message change keeps the timer',
    run({ createToaster }, { expect, clock }) {
      const c = clock();
      const t = createToaster({ clock: c, duration: 1000 });
      const a = t.toast('a');
      c.tick(300);
      t.toast('b');
      c.tick(300);
      expect(t.update(a, { message: 'a!' })).toBe(true);
      expect(msgs(t.getVisible()), 'same position').toEqual(['a!', 'b']);
      c.tick(400);
      expect(msgs(t.getVisible()), 'timer was not restarted').toEqual(['b']);
      expect(t.update(a, { message: 'gone' })).toBe(false);
      const id = t.toast('Syncing', { id: 'sync' });
      expect(id).toBe('sync');
      c.tick(500);
      expect(t.toast('Synced 3 files', { id: 'sync', duration: 2000 })).toBe('sync');
      expect(msgs(t.getVisible())).toEqual(['Synced 3 files']);
      c.tick(1999);
      expect(msgs(t.getVisible()), 'a new duration restarts the timer').toEqual(['Synced 3 files']);
      c.tick(1);
      expect(t.getVisible()).toEqual([]);
    },
  },
  {
    group: 'Updates and duplicates',
    title: 'changing the type resets the duration',
    run({ createToaster }, { expect, clock }) {
      const c = clock();
      const t = createToaster({ clock: c });
      const id = t.toast('Uploading', { type: 'loading' });
      c.tick(10000);
      t.update(id, { type: 'success', message: 'Uploaded' });
      expect(t.getVisible()[0]).toEqual({ id, message: 'Uploaded', type: 'success', duration: 4000, count: 1 });
      c.tick(2000);
      t.update(id, { type: 'error' });
      c.tick(3999);
      expect(t.getVisible(), 'a type change restarts the timer').toHaveLength(1);
      c.tick(1);
      expect(t.getVisible()).toEqual([]);
      const x = t.toast('x');
      t.update(x, { type: 'loading' });
      c.tick(1e9);
      expect(t.getVisible()[0].duration).toBe(Infinity);
    },
  },
  {
    group: 'Updates and duplicates',
    title: 'identical toasts bump a counter',
    run({ createToaster }, { expect, clock }) {
      const c = clock();
      const t = createToaster({ clock: c, duration: 1000, maxVisible: 1 });
      const a = t.toast('Offline', { type: 'error' });
      c.tick(800);
      expect(t.toast('Offline', { type: 'error' })).toBe(a);
      expect(t.getVisible()[0].count).toBe(2);
      c.tick(999);
      expect(t.getVisible(), 'the full duration restarted').toHaveLength(1);
      expect(t.toast('Offline'), 'a different type is a different toast').not.toBe(a);
      const q = t.toast('Retrying');
      expect(t.toast('Retrying'), 'queued toasts dedupe too').toBe(q);
      expect(t.getQueued().map((x) => [x.message, x.count])).toEqual([['Offline', 1], ['Retrying', 2]]);
      c.tick(1);
      expect(msgs(t.getVisible())).toEqual(['Offline']);
    },
  },
  {
    group: 'Promise toasts',
    title: 'loading turns into success',
    async run({ createToaster }, { expect, clock, deferred }) {
      const c = clock();
      const t = createToaster({ clock: c });
      const d = deferred<number>();
      const id = t.promise(d.promise, { loading: 'Saving…', success: (n) => `Saved ${n} rows`, error: 'Failed' });
      expect(t.getVisible()[0]).toEqual({ id, message: 'Saving…', type: 'loading', duration: Infinity, count: 1 });
      await c.advance(60000);
      expect(t.getVisible()).toHaveLength(1);
      d.resolve(3);
      await c.advance(0);
      expect(t.getVisible()[0]).toEqual({ id, message: 'Saved 3 rows', type: 'success', duration: 4000, count: 1 });
      await c.advance(4000);
      expect(t.getVisible()).toEqual([]);
    },
  },
  {
    group: 'Promise toasts',
    title: 'rejection, early dismissal and duplicate loading messages',
    async run({ createToaster }, { expect, clock, deferred }) {
      const c = clock();
      const t = createToaster({ clock: c });
      const d1 = deferred<void>();
      const d2 = deferred<void>();
      const d3 = deferred<void>();
      const m = { loading: 'Saving…', success: 'Saved', error: (e: unknown) => `Failed: ${(e as Error).message}` };
      const a = t.promise(d1.promise, m);
      const b = t.promise(d2.promise, m);
      const gone = t.promise(d3.promise, m);
      expect(new Set([a, b, gone]).size, 'promise toasts are never merged').toBe(3);
      t.dismiss(gone);
      d1.reject(new Error('disk full'));
      d2.resolve();
      d3.resolve();
      await c.advance(0);
      expect(t.getVisible().map((x) => [x.id, x.type, x.message])).toEqual([
        [a, 'error', 'Failed: disk full'],
        [b, 'success', 'Saved'],
      ]);
    },
  },
];
