import type { Ctx, EventObject, Event, ActionFn, AssignAction, Action, Guard, TransitionConfig, TransitionSpec, MachineConfig, MachineOptions, MachineState, Machine } from './types';

export function assign(assignment: AssignAction['assignment']): AssignAction {
  return { type: 'assign', assignment };
}

const toArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const toTransitions = (spec: TransitionSpec | undefined): TransitionConfig[] =>
  toArray(spec as any).map((t: string | TransitionConfig) => (typeof t === 'string' ? { target: t } : t));

export function createMachine(config: MachineConfig, options: MachineOptions = {}): Machine {
  const states = config.states;
  const stateConfig = (name: string) => {
    const c = states[name];
    if (!c) throw new Error(`Unknown state "${name}"`);
    return c;
  };

  const guardPasses = (guard: Guard | undefined, ctx: Ctx, ev: EventObject) => {
    if (guard === undefined) return true;
    const fn = typeof guard === 'string' ? options.guards?.[guard] : guard;
    if (!fn) throw new Error(`Unknown guard "${guard}"`);
    return fn(ctx, ev);
  };

  class Run {
    actions: (string | ActionFn)[] = [];
    entered: string[] = [];
    exited: string[] = [];
    constructor(public context: Ctx, public event: EventObject) {}
    exec(list: Action | Action[] | undefined) {
      for (const a of toArray(list)) {
        if (typeof a === 'object' && a.type === 'assign') {
          const upd = typeof a.assignment === 'function'
            ? a.assignment(this.context, this.event)
            : Object.fromEntries(Object.entries(a.assignment).map(([k, v]) => [k, typeof v === 'function' ? v(this.context, this.event) : v]));
          this.context = { ...this.context, ...upd };
        } else this.actions.push(a as string | ActionFn);
      }
    }
    enter(name: string) {
      this.entered.push(name);
      this.exec(stateConfig(name).entry);
    }
  }

  const makeState = (value: string, run: Run, changed: boolean): MachineState => ({
    value, context: run.context, actions: run.actions, event: run.event, changed,
    done: stateConfig(value).type === 'final', entered: run.entered, exited: run.exited,
  });

  const initRun = new Run({ ...(config.context ?? {}) }, { type: 'xstate.init' });
  initRun.enter(config.initial);
  const initialState = makeState(config.initial, initRun, true);

  function transition(state: MachineState, event: Event): MachineState {
    const ev: EventObject = typeof event === 'string' ? { type: event } : event;
    const unchanged = () => makeState(state.value, new Run(state.context, ev), false);
    if (state.done) return unchanged();
    for (const spec of [stateConfig(state.value).on?.[ev.type], config.on?.[ev.type]]) {
      if (spec === undefined) continue;
      const t = toTransitions(spec).find((c) => guardPasses(c.guard, state.context, ev));
      if (!t) continue;
      const run = new Run(state.context, ev);
      if (t.target === undefined) {
        run.exec(t.actions);
        return makeState(state.value, run, true);
      }
      stateConfig(t.target);
      run.exited.push(state.value);
      run.exec(stateConfig(state.value).exit);
      run.exec(t.actions);
      run.enter(t.target);
      return makeState(t.target, run, true);
    }
    return unchanged();
  }

  return { initialState, transition };
}
