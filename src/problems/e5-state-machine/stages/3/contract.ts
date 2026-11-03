// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createMachine } from './solution';

/**
 * @contract createMachine, StateNodeConfig.on
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

/**
 * @contract MachineConfig
 * @change `MachineConfig` is a `StateNodeConfig`: states can nest their own `initial` and `states`.
 * Your `createMachine` doesn't take nested states yet. Type the config `config: MachineConfig` (from `./types`).
 */
export function nested() {
  return createMachine({ id: 'door', initial: 'closed', states: { closed: { initial: 'locked', states: { locked: {}, unlocked: {} } }, open: {} } });
}

// @contract-skip MachineConfig.on: inherited from `StateNodeConfig` from stage 3; the checks above cover it.
