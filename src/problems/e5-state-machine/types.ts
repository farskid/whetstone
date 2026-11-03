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

/** The root node, plus the initial context. */
export interface MachineConfig extends StateNodeConfig { id?: string; context?: Ctx }

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
  matches(path: string): boolean;
}

/** A pure machine: `transition` never mutates its input. */
export interface Machine {
  initialState: MachineState;
  transition(state: MachineState, event: Event): MachineState;
  options: MachineOptions;
  config: MachineConfig;
}

/** Timer source. `setTimeout` returns an id for `clearTimeout`. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

/** A running machine. */
export interface Service {
  start(): Service;
  send(event: Event): void;
  readonly state: MachineState;
  subscribe(listener: (state: MachineState) => void): () => void;
  stop(): void;
}

/** Options for `interpret`: `clock` drives `after` timers. Defaults to real timers. */
export interface InterpretOptions { clock?: Clock }
