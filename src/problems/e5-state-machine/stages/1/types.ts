/** An event object; extra keys are its payload. */
export interface EventObject { type: string; [key: string]: any }

/** An event, as a type string or an object. */
export type Event = string | EventObject;

/** One state: transitions by event type to a state name, or a final state. */
export interface StateNodeConfig {
  type?: 'final';
  on?: Record<string, string>;
}

/** The machine: flat states and root-level handlers. */
export interface MachineConfig {
  initial: string;
  on?: Record<string, string>;
  states: Record<string, StateNodeConfig>;
}

/** An immutable machine state. `actions` is always empty in this stage. */
export interface MachineState {
  value: string;
  actions: string[];
  event: EventObject;
  changed: boolean;
  done: boolean;
}

/** A pure machine: `transition` never mutates its input. */
export interface Machine {
  initialState: MachineState;
  transition(state: MachineState, event: Event): MachineState;
}
