import type { TestCase, Deferred } from '../../runner/types';
type M = typeof import('./solution');
type Task = import('./solution').Task;

/** A task controlled by hand: records when it starts and what it got. */
function manual(deferred: <T>() => Deferred<T>) {
  const started: string[] = [];
  const gates = new Map<string, Deferred<unknown>>();
  const ctxs = new Map<string, { results: Record<string, unknown>; signal: AbortSignal }>();
  const task = (id: string, deps?: string[]): Task => ({
    id,
    deps,
    run(ctx) {
      started.push(id);
      ctxs.set(id, ctx);
      const d = deferred<unknown>();
      gates.set(id, d);
      return d.promise;
    },
  });
  return { started, gates, ctxs, task };
}

const rejectMsg = async (p: Promise<unknown>) => {
  try { await p; } catch (e) { return (e as Error).message; }
  return '(resolved)';
};

export const tests: TestCase<M>[] = [
  {
    title: 'runs tasks in dependency order and passes dep results',
    async run({ runTaskGraph }, { expect }) {
      const order: string[] = [];
      const report = await runTaskGraph([
        { id: 'test', deps: ['build'], run: ({ results }) => { order.push('test'); return `tested ${results.build}`; } },
        { id: 'build', run: async () => { order.push('build'); return 'dist'; } },
      ]);
      expect(order).toEqual(['build', 'test']);
      expect(report).toEqual({
        status: { build: 'success', test: 'success' },
        results: { build: 'dist', test: 'tested dist' },
        errors: {},
      });
    },
  },
  {
    title: 'ctx.results holds exactly the direct deps',
    async run({ runTaskGraph }, { expect }) {
      let seen: Record<string, unknown> = {};
      await runTaskGraph([
        { id: 'a', run: () => 1 },
        { id: 'b', deps: ['a'], run: () => 2 },
        { id: 'c', deps: ['b'], run: ({ results }) => { seen = results; } },
      ]);
      expect(seen).toEqual({ b: 2 });
    },
  },
  {
    title: 'independent tasks run in parallel; a task waits for ALL deps',
    input: 'a, b independent; c deps [a, b]',
    async run({ runTaskGraph }, { expect, deferred, flush }) {
      const m = manual(deferred);
      const p = runTaskGraph([m.task('a'), m.task('b'), m.task('c', ['a', 'b'])]);
      await flush();
      expect(m.started, 'a and b start together').toEqual(['a', 'b']);
      m.gates.get('a')!.resolve('A');
      await flush();
      expect(m.started, 'c must still wait for b').toEqual(['a', 'b']);
      m.gates.get('b')!.resolve('B');
      await flush();
      expect(m.started).toEqual(['a', 'b', 'c']);
      expect(m.ctxs.get('c')!.results).toEqual({ a: 'A', b: 'B' });
      m.gates.get('c')!.resolve('C');
      expect((await p).status).toEqual({ a: 'success', b: 'success', c: 'success' });
    },
  },
  {
    title: 'concurrency limit, with input order as priority',
    input: 'concurrency 2; tasks w x y z (all ready)',
    async run({ runTaskGraph }, { expect, deferred, flush }) {
      const m = manual(deferred);
      const p = runTaskGraph([m.task('w'), m.task('x'), m.task('y'), m.task('z')], { concurrency: 2 });
      await flush();
      expect(m.started).toEqual(['w', 'x']);
      m.gates.get('x')!.resolve(0);
      await flush();
      expect(m.started).toEqual(['w', 'x', 'y']);
      m.gates.get('w')!.resolve(0);
      await flush();
      expect(m.started).toEqual(['w', 'x', 'y', 'z']);
      m.gates.get('y')!.resolve(0);
      m.gates.get('z')!.resolve(0);
      await p;
    },
  },
  {
    title: 'a newly-ready task earlier in the input jumps the ready queue',
    input: "concurrency 1; tasks: late (deps first), first, other",
    async run({ runTaskGraph }, { expect, deferred, flush }) {
      const m = manual(deferred);
      const p = runTaskGraph([m.task('late', ['first']), m.task('first'), m.task('other')], { concurrency: 1 });
      await flush();
      expect(m.started).toEqual(['first']);
      m.gates.get('first')!.resolve(0);
      await flush();
      expect(m.started, '"late" is before "other" in the input').toEqual(['first', 'late']);
      m.gates.get('late')!.resolve(0);
      await flush();
      m.gates.get('other')!.resolve(0);
      await p;
      expect(m.started).toEqual(['first', 'late', 'other']);
    },
  },
  {
    title: 'duplicate ids and unknown deps reject before anything runs',
    async run({ runTaskGraph }, { expect }) {
      let ran = false;
      const run = () => { ran = true; };
      const dup = await rejectMsg(runTaskGraph([{ id: 'a', run }, { id: 'a', run }]));
      expect(dup.includes('Duplicate') && dup.includes('a'), dup).toBe(true);
      const unk = await rejectMsg(runTaskGraph([{ id: 'a', run }, { id: 'b', deps: ['nope'], run }]));
      expect(unk.includes('Unknown') && unk.includes('nope'), unk).toBe(true);
      const tgt = await rejectMsg(runTaskGraph([{ id: 'a', run }], { targets: ['ghost'] }));
      expect(tgt.includes('Unknown') && tgt.includes('ghost'), tgt).toBe(true);
      expect(ran, 'no task may run').toBe(false);
    },
  },
  {
    title: 'cycles are reported with their path',
    async run({ runTaskGraph }, { expect }) {
      let ran = false;
      const run = () => { ran = true; };
      expect(await rejectMsg(runTaskGraph([
        { id: 'ok', run },
        { id: 'a', deps: ['b'], run },
        { id: 'b', deps: ['c'], run },
        { id: 'c', deps: ['ok', 'a'], run },
      ]))).toBe('Cycle: a -> b -> c -> a');
      expect(await rejectMsg(runTaskGraph([{ id: 'x', run }, { id: 'self', deps: ['self'], run }]))).toBe('Cycle: self -> self');
      expect(await rejectMsg(runTaskGraph([
        { id: 'top', deps: ['m'], run },
        { id: 'm', deps: ['n'], run },
        { id: 'n', deps: ['m'], run },
      ])), 'cycle that does not include the start node').toBe('Cycle: m -> n -> m');
      expect(ran).toBe(false);
    },
  },
  {
    title: 'a failure skips transitive dependents but not unrelated tasks',
    async run({ runTaskGraph }, { expect }) {
      const boom = new Error('build broke');
      const ran: string[] = [];
      const report = await runTaskGraph([
        { id: 'build', run: async () => { throw boom; } },
        { id: 'test', deps: ['build'], run: () => { ran.push('test'); } },
        { id: 'ship', deps: ['test'], run: () => { ran.push('ship'); } },
        { id: 'lint', run: async () => { ran.push('lint'); return 'clean'; } },
      ]);
      expect(ran).toEqual(['lint']);
      expect(report.status).toEqual({ build: 'failed', test: 'skipped', ship: 'skipped', lint: 'success' });
      expect(report.errors.build).toBe(boom);
      expect(report.results).toEqual({ lint: 'clean' });
    },
  },
  {
    title: 'a synchronous throw counts as a failure (does not reject the run)',
    async run({ runTaskGraph }, { expect }) {
      const report = await runTaskGraph([{ id: 'a', run: () => { throw new TypeError('sync'); } }]);
      expect(report.status).toEqual({ a: 'failed' });
      expect((report.errors.a as Error).message).toBe('sync');
    },
  },
  {
    title: 'failFast: stops starting tasks, aborts the signal, waits for running ones',
    input: 'concurrency 2; a fails while b is running; c, d not started',
    async run({ runTaskGraph }, { expect, deferred, flush }) {
      const m = manual(deferred);
      let settled = false;
      const p = runTaskGraph([m.task('a'), m.task('b'), m.task('c'), m.task('d', ['b'])], { concurrency: 2, failFast: true });
      p.then(() => { settled = true; });
      await flush();
      const signal = m.ctxs.get('b')!.signal;
      expect(signal.aborted).toBe(false);
      m.gates.get('a')!.reject(new Error('a failed'));
      await flush();
      expect(signal.aborted, 'signal aborted on first failure').toBe(true);
      expect(m.started, 'c must not start').toEqual(['a', 'b']);
      expect(settled, 'must wait for b to settle').toBe(false);
      m.gates.get('b')!.resolve('late but fine');
      const report = await p;
      expect(m.started).toEqual(['a', 'b']);
      expect(report.status).toEqual({ a: 'failed', b: 'success', c: 'skipped', d: 'skipped' });
      expect(report.results).toEqual({ b: 'late but fine' });
    },
  },
  {
    title: 'without failFast the signal is never aborted',
    async run({ runTaskGraph }, { expect }) {
      let sig: AbortSignal | undefined;
      await runTaskGraph([
        { id: 'a', run: () => Promise.reject(new Error('x')) },
        { id: 'b', run: async ({ signal }) => { sig = signal; await null; await null; } },
      ]);
      expect(sig!.aborted).toBe(false);
    },
  },
  {
    title: 'targets run only what they need',
    async run({ runTaskGraph }, { expect }) {
      const ran: string[] = [];
      const t = (id: string, deps?: string[]) => ({ id, deps, run: () => { ran.push(id); return id; } });
      const report = await runTaskGraph(
        [t('docs'), t('codegen'), t('build', ['codegen']), t('test', ['build']), t('e2e', ['build', 'docs'])],
        { targets: ['test'] },
      );
      expect(ran).toEqual(['codegen', 'build', 'test']);
      expect(Object.keys(report.status).sort()).toEqual(['build', 'codegen', 'test']);
    },
  },
  {
    title: 'events: start before run, exactly one final event per task',
    async run({ runTaskGraph }, { expect }) {
      const log: string[] = [];
      await runTaskGraph(
        [
          { id: 'a', run: () => { log.push('run a'); } },
          { id: 'b', deps: ['a'], run: () => { log.push('run b'); throw new Error('no'); } },
          { id: 'c', deps: ['b'], run: () => { log.push('run c'); } },
        ],
        { onEvent: (e) => log.push(`${e.type} ${e.id}`) },
      );
      expect(log).toEqual(['start a', 'run a', 'success a', 'start b', 'run b', 'failed b', 'skipped c']);
    },
  },
  {
    title: 'empty graph resolves to an empty report',
    async run({ runTaskGraph }, { expect }) {
      expect(await runTaskGraph([])).toEqual({ status: {}, results: {}, errors: {} });
    },
  },
  {
    title: 'wide graph: 300 tasks, diamond-heavy, each runs once',
    input: 'layer k depends on all 10 tasks of layer k-1; 30 layers',
    async run({ runTaskGraph }, { expect }) {
      const counts = new Map<string, number>();
      const tasks = [];
      for (let L = 0; L < 30; L++) for (let i = 0; i < 10; i++) {
        const id = `${L}.${i}`;
        tasks.push({
          id,
          deps: L === 0 ? [] : Array.from({ length: 10 }, (_, j) => `${L - 1}.${j}`),
          run: async ({ results }: { results: Record<string, unknown> }) => {
            counts.set(id, (counts.get(id) ?? 0) + 1);
            return L === 0 ? 1 : Object.values(results).reduce((a: number, b) => a + (b as number), 0) % 1000;
          },
        });
      }
      const report = await runTaskGraph(tasks, { concurrency: 4 });
      expect(counts.size).toBe(300);
      expect([...counts.values()].every((n) => n === 1)).toBe(true);
      expect(Object.values(report.status).every((s) => s === 'success')).toBe(true);
    },
  },
];
