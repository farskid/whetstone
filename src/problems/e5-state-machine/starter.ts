export type Ctx = Record<string, any>;
export interface EventObject { type: string; [key: string]: any }
export type Event = string | EventObject;
export type ActionFn = (context: Ctx, event: EventObject) => void;
export interface AssignAction { type: 'assign'; assignment: ((context: Ctx, event: EventObject) => Partial<Ctx>) | Record<string, ((context: Ctx, event: EventObject) => unknown) | string | number | boolean | null | undefined | object> }
export type Action = string | ActionFn | AssignAction;
export type Guard = string | ((context: Ctx, event: EventObject) => boolean);
export interface TransitionConfig { target?: string; guard?: Guard; actions?: Action | Action[] }
export type TransitionSpec = string | TransitionConfig | (string | TransitionConfig)[];

export interface StateNodeConfig {
  initial?: string;
  type?: 'final';
  states?: Record<string, StateNodeConfig>;
  on?: Record<string, TransitionSpec>;
  entry?: Action | Action[];
  exit?: Action | Action[];
  onDone?: TransitionSpec;
  after?: Record<number, TransitionSpec>;
  invoke?: { src: (context: Ctx, event: EventObject) => Promise<unknown>; onDone?: TransitionSpec; onError?: TransitionSpec };
}
export interface MachineConfig extends StateNodeConfig { id?: string; context?: Ctx }
export interface MachineOptions { guards?: Record<string, (context: Ctx, event: EventObject) => boolean>; actions?: Record<string, ActionFn> }

export interface MachineState {
  value: string;
  context: Ctx;
  actions: (string | ActionFn)[];
  event: EventObject;
  changed: boolean;
  done: boolean;
  entered: string[];
  exited: string[];
  matches(path: string): boolean;
}

export interface Machine {
  initialState: MachineState;
  transition(state: MachineState, event: Event): MachineState;
  options: MachineOptions;
  config: MachineConfig;
}

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface Service {
  start(): Service;
  send(event: Event): void;
  readonly state: MachineState;
  subscribe(listener: (state: MachineState) => void): () => void;
  stop(): void;
}

export function assign(assignment: AssignAction['assignment']): AssignAction {
  return { type: 'assign', assignment };
}

export const afterEvent = (delay: number, path: string) => `xstate.after(${delay})#${path}`;
export const doneInvokeEvent = (path: string) => `done.invoke.${path}`;
export const errorInvokeEvent = (path: string) => `error.platform.${path}`;

export function createMachine(config: MachineConfig, options: MachineOptions = {}): Machine {
  throw new Error('Not implemented');
}

export function interpret(machine: Machine, opts: { clock?: Clock } = {}): Service {
  throw new Error('Not implemented');
}
