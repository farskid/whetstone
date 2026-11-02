import type { EventObject, Event, MachineConfig, MachineState, Machine } from './types';

export function createMachine(config: MachineConfig): Machine {
  if (!(config.initial in config.states)) throw new Error(`Unknown initial state "${config.initial}"`);

  const makeState = (value: string, event: EventObject, changed: boolean): MachineState => ({
    value, actions: [], event, changed, done: config.states[value].type === 'final',
  });

  const initialState = makeState(config.initial, { type: 'xstate.init' }, true);

  function transition(state: MachineState, event: Event): MachineState {
    const ev: EventObject = typeof event === 'string' ? { type: event } : event;
    const unchanged = () => makeState(state.value, ev, false);
    if (state.done) return unchanged();
    const target = config.states[state.value].on?.[ev.type] ?? config.on?.[ev.type];
    if (target === undefined) return unchanged();
    if (!(target in config.states)) throw new Error(`Unknown target "${target}"`);
    return makeState(target, ev, true);
  }

  return { initialState, transition };
}
