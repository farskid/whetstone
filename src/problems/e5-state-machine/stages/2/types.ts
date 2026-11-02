/** Machine context: any plain object. */
export type Ctx = Record<string, any>;

/** An event object; extra keys are its payload. */
export interface EventObject { type: string; [key: string]: any }

/** An event, as a type string or an object. */
export type Event = string | EventObject;

/** A side-effect action, run by the interpreter. */
export type ActionFn = (context: Ctx, event: EventObject) => void;

/** Made by `assign(...)`: updates context during the transition. */
export interface AssignAction { type: 'assign'; assignment: ((context: Ctx, event: EventObject) => Partial<Ctx>) | Record<string, ((context: Ctx, event: EventObject) => unknown) | string | number | boolean | null | undefined | object> }

/** An action: a name from `options.actions`, a function, or an assign action. */
export type Action = string | ActionFn | AssignAction;

/** A guard: a name from `options.guards`, or a predicate. */
export type Guard = string | ((context: Ctx, event: EventObject) => boolean);

/** One transition candidate. No `target` means a targetless transition. */
export interface TransitionConfig { target?: string; guard?: Guard; actions?: Action | Action[] }

/** A target string, a candidate, or candidates tried in order. */
export type TransitionSpec = string | TransitionConfig | (string | TransitionConfig)[];

/** One state node. */
export interface StateNodeConfig {
  type?: 'final';
  on?: Record<string, TransitionSpec>;
  entry?: Action | Action[];
  exit?: Action | Action[];
}

/** The machine: flat states, root handlers and the initial context. */
export interface MachineConfig {
  initial: string;
  context?: Ctx;
  on?: Record<string, TransitionSpec>;
  states: Record<string, StateNodeConfig>;
}

/** Named guards and actions. */
export interface MachineOptions { guards?: Record<string, (context: Ctx, event: EventObject) => boolean>; actions?: Record<string, ActionFn> }

/** An immutable machine state. */
export interface MachineState {
  value: string;
  context: Ctx;
  actions: (string | ActionFn)[];
  event: EventObject;
  changed: boolean;
  done: boolean;
  entered: string[];
  exited: string[];
}

/** A pure machine: `transition` never mutates its input. */
export interface Machine {
  initialState: MachineState;
  transition(state: MachineState, event: Event): MachineState;
}
