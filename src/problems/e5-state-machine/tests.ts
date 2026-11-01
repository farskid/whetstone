import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Flat machine';
const G2 = 'Guards, context, actions';
const G3 = 'Hierarchy';
const G4 = 'Interpreter';

const light = (m: M) => m.createMachine({
  initial: 'green',
  on: { RESET: 'green' },
  states: {
    green: { on: { TIMER: 'yellow' } },
    yellow: { on: { TIMER: 'red' } },
    red: { on: { TIMER: 'green', POWER_OUT: 'off' } },
    off: { type: 'final' },
  },
});

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'initial state and simple transitions',
    run(m, { expect }) {
      const machine = light(m);
      const s0 = machine.initialState;
      expect([s0.value, s0.changed, s0.done]).toEqual(['green', true, false]);
      const s1 = machine.transition(s0, 'TIMER');
      const s2 = machine.transition(s1, { type: 'TIMER' });
      expect([s1.value, s2.value]).toEqual(['yellow', 'red']);
      expect(s0.value, 'transition is pure').toBe('green');
      expect(machine.transition(s2, 'TIMER').value).toBe('green');
    },
  },
  {
    group: G1,
    title: 'unknown events leave the state unchanged; final states stop everything',
    run(m, { expect }) {
      const machine = light(m);
      const s = machine.transition(machine.initialState, 'NOPE');
      expect([s.value, s.changed, s.actions]).toEqual(['green', false, []]);
      const red = machine.transition(machine.transition(machine.initialState, 'TIMER'), 'TIMER');
      const off = machine.transition(red, 'POWER_OUT');
      expect([off.value, off.done]).toEqual(['off', true]);
      expect(machine.transition(red, 'RESET').value, 'root handler').toBe('green');
      const after = machine.transition(off, 'RESET');
      expect([after.value, after.changed, after.done]).toEqual(['off', false, true]);
    },
  },
  {
    group: G2,
    title: 'guards pick the first passing candidate, by function or by name',
    run({ createMachine }, { expect }) {
      const machine = createMachine({
        initial: 'idle',
        context: { tries: 3 },
        states: {
          idle: { on: { SUBMIT: [{ target: 'big', guard: (_c, e) => e.amount > 100 }, { target: 'blocked', guard: 'noTries' }, { target: 'ok' }] } },
          big: {}, blocked: {}, ok: {},
        },
      }, { guards: { noTries: (c) => c.tries === 0 } });
      const s = machine.initialState;
      expect(machine.transition(s, { type: 'SUBMIT', amount: 500 }).value).toBe('big');
      expect(machine.transition(s, { type: 'SUBMIT', amount: 5 }).value).toBe('ok');
      expect(machine.transition({ ...s, context: { tries: 0 } }, { type: 'SUBMIT', amount: 5 }).value).toBe('blocked');
      const none = createMachine({ initial: 'a', states: { a: { on: { GO: { target: 'b', guard: () => false } } }, b: {} } });
      expect(none.transition(none.initialState, 'GO').changed).toBe(false);
    },
  },
  {
    group: G2,
    title: 'assign updates context in order without mutating; actions exclude assign',
    run({ createMachine, assign }, { expect }) {
      const machine = createMachine({
        initial: 'a',
        context: { n: 1, log: [] as string[] },
        states: {
          a: {
            on: {
              ADD: { actions: [assign((c, e) => ({ n: c.n + e.by })), 'notify', assign({ n: (c) => c.n * 10, log: (c) => [...c.log, 'x'] })] },
              GO: 'b',
            },
          },
          b: { entry: assign({ n: 0 }) },
        },
      });
      const s0 = machine.initialState;
      const s1 = machine.transition(s0, { type: 'ADD', by: 2 });
      expect([s1.value, s1.context, s1.actions, s1.changed]).toEqual(['a', { n: 30, log: ['x'] }, ['notify'], true]);
      expect(s1.exited.length + s1.entered.length, 'targetless transitions do not exit or enter').toBe(0);
      expect(s0.context).toEqual({ n: 1, log: [] });
      expect(machine.transition(s1, 'GO').context).toEqual({ n: 0, log: ['x'] });
    },
  },
  {
    group: G2,
    title: 'exit → transition → entry order, and self-transitions re-enter',
    run({ createMachine }, { expect }) {
      const machine = createMachine({
        initial: 'a',
        states: {
          a: { entry: 'enterA', exit: 'exitA', on: { GO: { target: 'b', actions: 'go' }, SELF: { target: 'a', actions: 'self' } } },
          b: { entry: ['enterB1', 'enterB2'], exit: 'exitB' },
        },
      });
      const s0 = machine.initialState;
      expect(s0.actions).toEqual(['enterA']);
      expect(machine.transition(s0, 'GO').actions).toEqual(['exitA', 'go', 'enterB1', 'enterB2']);
      const self = machine.transition(s0, 'SELF');
      expect([self.actions, self.exited, self.entered]).toEqual([['exitA', 'self', 'enterA'], ['a'], ['a']]);
    },
  },
  {
    group: G3,
    title: 'nested states: initial descent, matches, bubbling and exit order',
    run({ createMachine }, { expect }) {
      const machine = createMachine({
        initial: 'app',
        states: {
          app: {
            initial: 'editor', entry: 'enterApp', exit: 'exitApp',
            on: { LOGOUT: 'login', HELP: '#app.help' },
            states: {
              editor: { initial: 'idle', entry: 'enterEditor', exit: 'exitEditor', states: { idle: { entry: 'enterIdle', exit: 'exitIdle', on: { TYPE: 'typing' } }, typing: {} } },
              help: { entry: 'enterHelp' },
            },
          },
          login: { entry: 'enterLogin' },
        },
      });
      const s0 = machine.initialState;
      expect([s0.value, s0.actions, s0.entered]).toEqual(['app.editor.idle', ['enterApp', 'enterEditor', 'enterIdle'], ['app', 'app.editor', 'app.editor.idle']]);
      expect([s0.matches('app'), s0.matches('app.editor'), s0.matches('app.edit'), s0.matches('login')]).toEqual([true, true, false, false]);
      const out = machine.transition(s0, 'LOGOUT');
      expect([out.value, out.actions]).toEqual(['login', ['exitIdle', 'exitEditor', 'exitApp', 'enterLogin']]);
      const help = machine.transition(s0, 'HELP');
      expect([help.value, help.actions], 'the domain is a proper ancestor of the source').toEqual(['app.help', ['exitIdle', 'exitEditor', 'exitApp', 'enterApp', 'enterHelp']]);
      expect(machine.transition(s0, 'TYPE').value).toBe('app.editor.typing');
    },
  },
  {
    group: G3,
    title: 'deeper handlers shadow outer ones; dotted and absolute targets',
    run({ createMachine }, { expect }) {
      const machine = createMachine({
        initial: 'p',
        on: { ROOT: '#q.y' },
        states: {
          p: { initial: 'a', on: { X: 'q.y', E: 'q' }, states: { a: { on: { E: { target: 'b', guard: () => false } } }, b: { on: { E: 'a' } } } },
          q: { initial: 'x', states: { x: {}, y: {} } },
        },
      });
      const s0 = machine.initialState;
      expect(machine.transition(s0, 'E').value, 'a blocked guard falls through to the parent').toBe('q.x');
      expect(machine.transition(s0, 'X').value).toBe('q.y');
      expect(machine.transition(s0, 'ROOT').value, 'root-level handler').toBe('q.y');
      const atB = machine.transition(s0, { type: 'E', viaB: true } as any);
      const b = machine.transition({ ...s0, value: 'p.b' } as any, 'NOPE');
      expect([atB.value, b.value]).toEqual(['q.x', 'p.b']);
      expect(machine.transition(b, 'E').value, 'the inner handler wins').toBe('p.a');
      expect(() => createMachine({ initial: 'a', states: { a: { initial: 'missing', states: { b: {} } } } })).toThrow();
    },
  },
  {
    group: G3,
    title: 'final child states trigger onDone, possibly chained',
    run({ createMachine }, { expect }) {
      const machine = createMachine({
        initial: 'wizard',
        states: {
          wizard: {
            initial: 'step1', onDone: { target: 'summary', actions: 'wizardDone' }, exit: 'exitWizard',
            states: {
              step1: { on: { NEXT: 'step2' } },
              step2: { initial: 'form', onDone: 'finished', states: { form: { on: { OK: 'ok' } }, ok: { type: 'final', entry: 'enterOk' } } },
              finished: { type: 'final' },
            },
          },
          summary: { on: { CLOSE: 'closed' } },
          closed: { type: 'final' },
        },
      });
      let s = machine.transition(machine.initialState, 'NEXT');
      expect(s.value).toBe('wizard.step2.form');
      s = machine.transition(s, 'OK');
      expect([s.value, s.done, s.actions]).toEqual(['summary', false, ['enterOk', 'exitWizard', 'wizardDone']]);
      s = machine.transition(s, 'CLOSE');
      expect(s.done).toBe(true);
    },
  },
  {
    group: G4,
    title: 'service runs actions, notifies subscribers and ignores sends when stopped',
    run({ createMachine, interpret, assign }, { expect, clock }) {
      const calls: string[] = [];
      const machine = createMachine({
        initial: 'idle',
        context: { n: 0 },
        states: {
          idle: { entry: 'hello', on: { INC: { actions: [assign({ n: (c) => c.n + 1 }), (c, e) => calls.push(`fn:${c.n}:${e.type}`)] }, GO: 'busy' } },
          busy: {},
        },
      }, { actions: { hello: () => calls.push('hello') } });
      const service = interpret(machine, { clock: clock() });
      const seen: string[] = [];
      service.subscribe((s) => seen.push(s.value));
      service.send('INC');
      expect(calls, 'sends before start are ignored').toEqual([]);
      expect(service.start()).toBe(service);
      service.send('INC');
      service.send('NOPE');
      service.send('GO');
      expect(calls).toEqual(['hello', 'fn:1:INC']);
      expect(seen, 'unchanged transitions do not notify').toEqual(['idle', 'idle', 'busy']);
      service.stop();
      service.send('INC');
      expect(service.state.value).toBe('busy');
    },
  },
  {
    group: G4,
    title: 'after timers fire, and are cancelled by leaving, re-entering or stopping',
    async run({ createMachine, interpret }, { expect, clock }) {
      const c = clock();
      const machine = createMachine({
        initial: 'idle',
        states: {
          idle: { on: { SHOW: 'toast' } },
          toast: { after: { 1000: 'idle' }, on: { HOVER: 'toast', DISMISS: 'idle' } },
        },
      });
      const service = interpret(machine, { clock: c }).start();
      service.send('SHOW');
      await c.advance(999);
      expect(service.state.value).toBe('toast');
      await c.advance(1);
      expect(service.state.value).toBe('idle');
      service.send('SHOW');
      await c.advance(600);
      service.send('HOVER');
      await c.advance(600);
      expect(service.state.value, 're-entering restarts the timer').toBe('toast');
      await c.advance(400);
      expect(service.state.value).toBe('idle');
      service.send('SHOW');
      await c.advance(500);
      service.send('DISMISS');
      service.send('SHOW');
      await c.advance(500);
      expect(service.state.value, 'the old activation timer is a no-op').toBe('toast');
      service.stop();
      await c.advance(5000);
      expect(service.state.value).toBe('toast');
    },
  },
  {
    group: G4,
    title: 'invoked promises resolve or reject into transitions; stale ones are ignored',
    async run({ createMachine, interpret, assign }, { expect, clock, deferred, flush }) {
      const pending: { resolve(v: unknown): void; reject(e: unknown): void }[] = [];
      const machine = createMachine({
        initial: 'idle',
        context: { user: null, error: null, ids: [] as number[] },
        states: {
          idle: { on: { FETCH: 'loading' } },
          loading: {
            invoke: {
              src: (_c, e) => { const d = deferred<unknown>(); pending.push(d); return d.promise.then((v) => ({ v, id: e.id })); },
              onDone: { target: 'ok', actions: assign({ user: (_c, e) => e.data }) },
              onError: { target: 'failed', actions: assign({ error: (_c, e) => e.data }) },
            },
            on: { CANCEL: 'idle', FETCH: 'loading' },
          },
          ok: {}, failed: { on: { RETRY: 'loading' } },
        },
      });
      const service = interpret(machine, { clock: clock() }).start();
      service.send({ type: 'FETCH', id: 1 });
      service.send({ type: 'FETCH', id: 2 });
      pending[1].resolve('second');
      await flush();
      expect([service.state.value, service.state.context.user]).toEqual(['ok', { v: 'second', id: 2 }]);
      pending[0].resolve('first');
      await flush();
      expect(service.state.context.user, 'the first activation is stale').toEqual({ v: 'second', id: 2 });
      const s2 = interpret(machine, { clock: clock() }).start();
      s2.send('FETCH');
      s2.send('CANCEL');
      pending[2].resolve('late');
      await flush();
      expect(s2.state.value).toBe('idle');
      s2.send('FETCH');
      pending[3].reject(new Error('down'));
      await flush();
      expect([s2.state.value, (s2.state.context.error as Error).message]).toEqual(['failed', 'down']);
    },
  },
];
