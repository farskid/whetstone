// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createMachine } from './solution';

/**
 * @contract createMachine, StateNodeConfig.on, MachineConfig.on
 * @change Transitions can be `{ target, guard, actions }` objects, and `createMachine` takes `options: MachineOptions`.
 * Your `createMachine` doesn't take guarded transitions or options yet. Type it `createMachine(config: MachineConfig, options: MachineOptions = {})` (from `./types`).
 */
export function guarded() {
  return createMachine(
    { initial: 'idle', on: { RESET: 'idle' }, states: { idle: { on: { GO: { target: 'busy', guard: 'ready' } } }, busy: {} } },
    { guards: { ready: () => true } },
  );
}

// @contract-skip MachineState.actions: widens an output to include action functions.
