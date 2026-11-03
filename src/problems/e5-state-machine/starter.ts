import type { AssignAction, MachineConfig, MachineOptions, Machine, Clock, Service, InterpretOptions } from './types';

export function assign(assignment: AssignAction['assignment']): AssignAction {
  return { type: 'assign', assignment };
}

export const afterEvent = (delay: number, path: string) => `xstate.after(${delay})#${path}`;
export const doneInvokeEvent = (path: string) => `done.invoke.${path}`;
export const errorInvokeEvent = (path: string) => `error.platform.${path}`;

export function createMachine(config: MachineConfig, options: MachineOptions = {}): Machine {
  throw new Error('Not implemented');
}

export function interpret(machine: Machine, opts: InterpretOptions = {}): Service {
  throw new Error('Not implemented');
}
